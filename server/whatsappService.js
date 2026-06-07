import { join } from 'path';
import { mkdirSync } from 'fs';
import QRCode from 'qrcode';
import './puppeteerEnv.js';
import wweb from 'whatsapp-web.js';
import { getPuppeteerLaunchOptions } from './resolveChromium.js';
import * as db from './db.js';
import { DATA_DIR } from './paths.js';
import { sendWhatsAppDisconnectAlert } from './emailAlert.js';
import {
  buildCallWhatsAppText,
  buildKioskWhatsAppText,
  toWhatsAppChatId,
} from './whatsappMessages.js';

const { Client, LocalAuth } = wweb;

const AUTH_PATH = join(DATA_DIR, 'whatsapp-auth');
mkdirSync(AUTH_PATH, { recursive: true });

let client = null;
let initPromise = null;
let status = 'idle';
let lastQr = null;
let lastQrDataUrl = null;
let lastError = '';
let readyAt = null;

const HEALTH_MS = 5 * 60 * 1000;
let healthTimer = null;

const OK_STATUSES = new Set(['ready', 'authenticated', 'qr', 'initializing', 'loading']);

function setStatus(next, err = '') {
  status = next;
  lastError = err || '';
  db.setSetting('whatsapp_status', next);
  if (err) {
    db.setSetting('whatsapp_last_error', err.slice(0, 500));
  } else if (OK_STATUSES.has(next)) {
    db.setSetting('whatsapp_last_error', '');
  }
  if (next === 'ready') {
    readyAt = new Date().toISOString();
    db.setSetting('whatsapp_last_connected_at', readyAt);
  }
}

export function getWhatsAppStatus() {
  return {
    status,
    qr: lastQr,
    qrDataUrl: lastQrDataUrl,
    lastError,
    readyAt,
    enabled: db.getSettings().whatsapp_enabled === '1',
  };
}

async function handleDisconnect(reason) {
  const msg = String(reason || 'התנתק').slice(0, 500);
  setStatus('disconnected', msg);
  try {
    const settings = db.getSettings();
    await sendWhatsAppDisconnectAlert(settings, msg);
  } catch (e) {
    console.warn('WhatsApp disconnect email:', e.message);
  }
}

function attachClientEvents(c) {
  c.on('qr', async (qr) => {
    lastQr = qr;
    try {
      lastQrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 280 });
    } catch {
      lastQrDataUrl = null;
    }
    setStatus('qr');
  });

  c.on('authenticated', () => {
    lastQr = null;
    lastQrDataUrl = null;
    setStatus('authenticated');
    console.log('WhatsApp: מאומת — טוען…');
  });

  c.on('loading_screen', (pct, message) => {
    setStatus('loading');
    if (message) console.log('WhatsApp loading:', pct, message);
  });

  c.on('ready', () => {
    lastQr = null;
    lastQrDataUrl = null;
    setStatus('ready');
    console.log('WhatsApp: מחובר');
  });

  c.on('auth_failure', (msg) => {
    handleDisconnect(`שגיאת אימות: ${msg || ''}`);
  });

  c.on('disconnected', (reason) => {
    client = null;
    initPromise = null;
    handleDisconnect(reason);
  });
}

async function destroyClient() {
  if (!client) return;
  try {
    await client.destroy();
  } catch {
    /* ignore */
  }
  client = null;
  initPromise = null;
}

export async function startWhatsApp() {
  const settings = db.getSettings();
  if (settings.whatsapp_enabled !== '1') {
    setStatus('disabled');
    return getWhatsAppStatus();
  }

  if (client && (status === 'ready' || status === 'qr' || status === 'authenticated')) {
    return getWhatsAppStatus();
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    await destroyClient();
    setStatus('initializing');

    const puppeteerOpts = await getPuppeteerLaunchOptions();

    const c = new Client({
      authStrategy: new LocalAuth({ dataPath: AUTH_PATH }),
      puppeteer: puppeteerOpts,
    });

    attachClientEvents(c);
    client = c;

    try {
      await c.initialize();
    } catch (e) {
      setStatus('error', e.message);
      client = null;
      initPromise = null;
      throw e;
    }

    return getWhatsAppStatus();
  })();

  try {
    return await initPromise;
  } finally {
    if (status === 'error') initPromise = null;
  }
}

export async function stopWhatsApp() {
  await destroyClient();
  setStatus('idle');
  lastQr = null;
  lastQrDataUrl = null;
  return getWhatsAppStatus();
}

export async function logoutWhatsApp() {
  if (client) {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
  await destroyClient();
  setStatus('idle');
  lastQr = null;
  lastQrDataUrl = null;
  return getWhatsAppStatus();
}

function recordSendResult(result, errMsg = '') {
  const now = new Date().toISOString();
  db.setSetting('whatsapp_last_send_at', now);
  if (result?.ok) {
    db.setSetting('whatsapp_last_send_ok', '1');
    db.setSetting('whatsapp_last_send_error', '');
    return;
  }
  const msg =
    errMsg ||
    result?.error ||
    (result?.reason ? `דולג (${result.reason})` : 'שגיאת שליחה');
  db.setSetting('whatsapp_last_send_ok', '0');
  db.setSetting('whatsapp_last_send_error', String(msg).slice(0, 500));
}

async function isClientReady() {
  if (!client || status !== 'ready') return false;
  try {
    const st = await client.getState();
    if (st && !['CONNECTED', 'OPENING'].includes(st)) {
      console.warn('WhatsApp getState:', st);
      return false;
    }
  } catch {
    /* מאירוע ready — ממשיכים לנסות שליחה */
  }
  return true;
}

/** מזהה צ'אט — getNumberId לפני שליחה למספרים חדשים */
async function resolveChatId(phone) {
  const fallback = toWhatsAppChatId(phone);
  if (!client || !fallback) return null;

  const digits = fallback.replace('@c.us', '');
  try {
    const wid = await client.getNumberId(digits);
    if (wid?._serialized) return wid._serialized;
  } catch (e) {
    console.warn('WhatsApp getNumberId:', e.message);
  }
  return fallback;
}

export async function sendWhatsAppText(phone, text) {
  const settings = db.getSettings();
  if (settings.whatsapp_enabled !== '1') {
    const r = { skipped: true, reason: 'disabled' };
    recordSendResult(r);
    return r;
  }
  if (!(await isClientReady())) {
    const r = { skipped: true, reason: 'not_ready' };
    recordSendResult(r);
    return r;
  }

  const body = String(text || '').trim();
  if (!body) {
    const r = { skipped: true, reason: 'empty' };
    recordSendResult(r);
    return r;
  }

  const chatId = await resolveChatId(phone);
  if (!chatId) {
    const r = { skipped: true, reason: 'invalid_phone' };
    recordSendResult(r);
    return r;
  }

  try {
    const registered = await client.isRegisteredUser(chatId);
    if (!registered) {
      const r = { ok: false, error: 'המספר לא רשום בוואטסאפ' };
      recordSendResult(r);
      return r;
    }

    try {
      await client.sendPresenceAvailable();
    } catch {
      /* ignore */
    }

    await client.sendMessage(chatId, body, { waitUntilMsgSent: true });
    const r = { ok: true, chatId };
    recordSendResult(r);
    console.log('WhatsApp sent to', chatId);
    return r;
  } catch (e) {
    const msg = String(e?.message || e).slice(0, 500);
    console.warn('WhatsApp send:', msg);
    const r = { ok: false, error: msg };
    recordSendResult(r, msg);
    return r;
  }
}

export async function sendKioskWhatsApp(ticket, settings = db.getSettings()) {
  if (settings.whatsapp_enabled !== '1' || settings.whatsapp_send_kiosk !== '1') {
    return { skipped: true, reason: 'kiosk_disabled' };
  }
  if (!ticket?.phone) {
    const r = { skipped: true, reason: 'no_phone' };
    recordSendResult(r);
    return r;
  }

  const text = buildKioskWhatsAppText(ticket, settings);
  return sendWhatsAppText(ticket.phone, text);
}

export async function sendCallWhatsApp(ticket, room, settings = db.getSettings()) {
  if (settings.whatsapp_enabled !== '1' || settings.whatsapp_send_call !== '1') {
    return { skipped: true, reason: 'call_disabled' };
  }
  if (!ticket?.phone) {
    const r = { skipped: true, reason: 'no_phone' };
    recordSendResult(r);
    return r;
  }

  const text = buildCallWhatsAppText(ticket, room, settings);
  return sendWhatsAppText(ticket.phone, text);
}

export function startWhatsAppHealthCheck() {
  if (healthTimer) return;
  healthTimer = setInterval(async () => {
    const settings = db.getSettings();
    if (settings.whatsapp_enabled !== '1') return;

    if (status === 'ready' && !(await isClientReady())) {
      await handleDisconnect('חיבור אבד (בדיקת תקינות)');
      try {
        await startWhatsApp();
      } catch (e) {
        console.warn('WhatsApp reconnect:', e.message);
      }
      return;
    }

    if (status === 'disconnected' || status === 'error' || status === 'idle') {
      try {
        await sendWhatsAppDisconnectAlert(settings, lastError || status);
      } catch {
        /* ignore */
      }
    }
  }, HEALTH_MS);
}

export async function bootstrapWhatsApp() {
  const settings = db.getSettings();
  const saved = settings.whatsapp_status;
  if (saved && saved !== 'disabled') status = saved;

  if (settings.whatsapp_enabled === '1') {
    try {
      await startWhatsApp();
    } catch (e) {
      console.warn('WhatsApp bootstrap:', e.message);
      try {
        await sendWhatsAppDisconnectAlert(db.getSettings(), e.message);
      } catch {
        /* ignore */
      }
    }
  }
  startWhatsAppHealthCheck();
}
