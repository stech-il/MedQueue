/**
 * מתאם וואטסאפ — מפעיל תהליך ילד (Chrome) כדי שקריסת Puppeteer לא תפיל את השרת.
 */
import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import * as db from './db.js';
import { sendWhatsAppDisconnectAlert } from './emailAlert.js';
import {
  buildCallWhatsAppText,
  buildKioskWhatsAppText,
} from './whatsappMessages.js';

const WORKER_PATH = join(dirname(fileURLToPath(import.meta.url)), 'whatsappWorker.js');

let worker = null;
let workerBoot = null;
const pending = new Map();

const state = {
  status: 'idle',
  qr: null,
  qrDataUrl: null,
  lastError: '',
  readyAt: null,
  clientAlive: false,
  enabled: false,
};

const HEALTH_MS = 5 * 60 * 1000;
let healthTimer = null;

function isPuppeteerCrash(msg) {
  return /Target closed|TargetCloseError|Protocol error|Execution context was destroyed|Session closed/i.test(msg);
}

function rejectAllPending(reason) {
  for (const [, p] of pending) {
    p.reject(reason);
  }
  pending.clear();
}

function handleWorkerMessage(msg) {
  if (msg.type === 'state' && msg.data) {
    Object.assign(state, msg.data);
    return;
  }

  if (msg.type === 'reply' && msg.id) {
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    clearTimeout(p.timer);
    if (msg.ok) p.resolve(msg.result);
    else p.reject(new Error(msg.error || 'שגיאת וואטסאפ'));
  }
}

function handleWorkerExit(code, signal) {
  console.warn(`WhatsApp worker exited (${signal || code})`);
  worker = null;
  workerBoot = null;
  state.status = 'disconnected';
  state.clientAlive = false;
  state.lastError = 'תהליך וואטסאפ נסגר — לחץ «התחבר» שוב';
  db.setSetting('whatsapp_status', 'disconnected');
  db.setSetting('whatsapp_last_error', state.lastError);
  rejectAllPending(new Error(state.lastError));
}

function ensureWorker() {
  if (worker && !worker.killed) return workerBoot;

  worker = fork(WORKER_PATH, [], {
    env: { ...process.env },
    execArgv: process.execArgv.filter((a) => !a.includes('--watch')),
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  });

  workerBoot = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WhatsApp worker boot timeout')), 30000);
    const onMsg = (msg) => {
      if (msg?.type !== 'ready-worker') return;
      clearTimeout(timeout);
      worker.off('message', onMsg);
      resolve();
    };
    worker.on('message', onMsg);
    worker.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  worker.on('message', handleWorkerMessage);
  worker.on('exit', handleWorkerExit);

  return workerBoot;
}

function rpc(type, payload = {}, timeoutMs = 180000) {
  return ensureWorker().then(
    () =>
      new Promise((resolve, reject) => {
        const id = randomUUID();
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('פג זמן המתנה לוואטסאפ'));
        }, timeoutMs);

        pending.set(id, { resolve, reject, timer });
        worker.send({ type, id, ...payload });
      })
  );
}

export function getWhatsAppStatus() {
  state.enabled = db.getSettings().whatsapp_enabled === '1';
  return { ...state };
}

/** מגן נוסף בתהליך הראשי — לא אמור להיקרא אם Chrome רץ ב-worker */
export function installWhatsAppCrashGuard() {
  const swallow = (reason) => {
    const msg = String(reason?.message || reason || '');
    if (!isPuppeteerCrash(msg)) return;
    console.error('WhatsApp crash (main):', msg);
    if (worker && !worker.killed) {
      worker.kill('SIGTERM');
    } else {
      handleWorkerExit(1, 'crash');
    }
  };

  process.on('unhandledRejection', (reason) => {
    swallow(reason);
  });

  process.on('uncaughtException', (err) => {
    if (swallow(err)) return;
    throw err;
  });
}

export async function startWhatsApp() {
  const settings = db.getSettings();
  if (settings.whatsapp_enabled !== '1') {
    state.status = 'disabled';
    return getWhatsAppStatus();
  }
  const result = await rpc('start');
  Object.assign(state, result);
  return getWhatsAppStatus();
}

export async function stopWhatsApp() {
  if (!worker || worker.killed) {
    state.status = 'idle';
    return getWhatsAppStatus();
  }
  const result = await rpc('stop', {}, 60000);
  Object.assign(state, result);
  return getWhatsAppStatus();
}

export async function logoutWhatsApp() {
  if (!worker || worker.killed) {
    state.status = 'idle';
    return getWhatsAppStatus();
  }
  const result = await rpc('logout', {}, 90000);
  Object.assign(state, result);
  return getWhatsAppStatus();
}

export async function sendWhatsAppText(phone, text) {
  if (!worker || worker.killed) {
    await ensureWorker().catch(() => {});
  }
  if (!worker || worker.killed) {
    return { skipped: true, reason: 'not_ready' };
  }
  return rpc('send', { phone, text }, 120000);
}

export async function sendKioskWhatsApp(ticket, settings = db.getSettings()) {
  if (settings.whatsapp_enabled !== '1' || settings.whatsapp_send_kiosk !== '1') {
    return { skipped: true, reason: 'kiosk_disabled' };
  }
  if (!ticket?.phone) {
    return { skipped: true, reason: 'no_phone' };
  }
  const text = buildKioskWhatsAppText(ticket, settings);
  return sendWhatsAppText(ticket.phone, text);
}

export async function sendCallWhatsApp(ticket, room, settings = db.getSettings()) {
  if (settings.whatsapp_enabled !== '1' || settings.whatsapp_send_call !== '1') {
    return { skipped: true, reason: 'call_disabled' };
  }
  if (!ticket?.phone) {
    return { skipped: true, reason: 'no_phone' };
  }
  const text = buildCallWhatsAppText(ticket, room, settings);
  return sendWhatsAppText(ticket.phone, text);
}

export function startWhatsAppHealthCheck() {
  if (healthTimer) return;
  healthTimer = setInterval(() => {
    const settings = db.getSettings();
    if (settings.whatsapp_enabled !== '1') return;
    if (!worker || worker.killed) return;
    worker.send({ type: 'health', id: randomUUID() });
  }, HEALTH_MS);
}

export async function bootstrapWhatsApp() {
  const settings = db.getSettings();
  state.enabled = settings.whatsapp_enabled === '1';

  const saved = settings.whatsapp_status;
  if (saved && saved !== 'disabled' && saved !== 'ready') {
    state.status = saved;
  }

  if (settings.whatsapp_enabled === '1') {
    setTimeout(() => {
      ensureWorker()
        .then(() => rpc('restore-status', {}, 10000))
        .then(() => startWhatsApp())
        .catch((e) => {
          console.warn('WhatsApp bootstrap:', e.message);
          sendWhatsAppDisconnectAlert(db.getSettings(), e.message).catch(() => {});
        });
    }, 12000);
  }
  startWhatsAppHealthCheck();
}
