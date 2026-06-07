/**
 * תהליך ילד — Chrome/Puppeteer רצים כאן כדי שקריסה לא תפיל את שרת MedQueue.
 */
import { join } from 'path';
import { mkdirSync } from 'fs';
import QRCode from 'qrcode';
import './puppeteerEnv.js';
import wweb from 'whatsapp-web.js';
import { getPuppeteerLaunchOptions } from './resolveChromium.js';
import * as db from './db.js';
import { DATA_DIR } from './paths.js';
import { sendWhatsAppDisconnectAlert } from './emailAlert.js';
import { toWhatsAppChatId } from './whatsappMessages.js';

const { Client, LocalAuth } = wweb;

const AUTH_PATH = join(DATA_DIR, 'whatsapp-auth');
mkdirSync(AUTH_PATH, { recursive: true });

const WA_WEB_CACHE =
  'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html';

let client = null;
let initPromise = null;
let status = 'idle';
let lastQr = null;
let lastQrDataUrl = null;
let lastError = '';
let readyAt = null;

const OK_STATUSES = new Set(['ready', 'authenticated', 'qr', 'initializing', 'loading', 'reconnecting']);

function isPageOpen(c) {
  try {
    return Boolean(c?.pupPage && typeof c.pupPage.isClosed === 'function' && !c.pupPage.isClosed());
  } catch {
    return false;
  }
}

function snapshot() {
  return {
    status: effectiveStatus(),
    qr: lastQr,
    qrDataUrl: lastQrDataUrl,
    lastError,
    readyAt,
    clientAlive: Boolean(client),
    enabled: db.getSettings().whatsapp_enabled === '1',
  };
}

function pushState() {
  if (!process.send) return;
  process.send({ type: 'state', data: snapshot() });
}

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
  pushState();
}

function effectiveStatus() {
  if (initPromise && status !== 'qr' && status !== 'ready') return 'reconnecting';
  if (status === 'ready' && !client) return 'reconnecting';
  return status;
}

async function handleDisconnect(reason) {
  const msg = String(reason || 'התנתק').slice(0, 500);
  setStatus('disconnected', msg);
  try {
    await sendWhatsAppDisconnectAlert(db.getSettings(), msg);
  } catch (e) {
    console.warn('WhatsApp disconnect email:', e.message);
  }
}

function handleBrowserCrash(reason) {
  console.error('WhatsApp browser crash:', reason);
  client = null;
  initPromise = null;
  setStatus('disconnected', 'דפדפן וואטסאפ נסגר — לחץ «התחבר» שוב');
}

function attachBrowserGuards(c) {
  try {
    c.pupBrowser?.on('disconnected', () => handleBrowserCrash('browser disconnected'));
  } catch {
    /* ignore */
  }
}

function isPuppeteerCrash(msg) {
  return /Target closed|TargetCloseError|Protocol error|Execution context was destroyed|Session closed/i.test(msg);
}

function installCrashGuard() {
  const swallow = (reason) => {
    const msg = String(reason?.message || reason || '');
    if (!isPuppeteerCrash(msg)) return false;
    handleBrowserCrash(msg);
    return true;
  };

  process.on('unhandledRejection', (reason) => {
    swallow(reason);
  });

  process.on('uncaughtException', (err) => {
    if (swallow(err)) return;
    console.error('WhatsApp worker uncaught:', err);
  });
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
    attachBrowserGuards(c);
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

async function startWhatsApp() {
  const settings = db.getSettings();
  if (settings.whatsapp_enabled !== '1') {
    setStatus('disabled');
    return snapshot();
  }

  if (
    isPageOpen(client) &&
    (status === 'ready' || status === 'qr' || status === 'authenticated' || status === 'loading')
  ) {
    return snapshot();
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    await destroyClient();
    setStatus('initializing');

    const puppeteerOpts = await getPuppeteerLaunchOptions();

    const c = new Client({
      authStrategy: new LocalAuth({ dataPath: AUTH_PATH }),
      webVersionCache: { type: 'remote', remotePath: WA_WEB_CACHE },
      puppeteer: puppeteerOpts,
    });

    attachClientEvents(c);
    client = c;

    try {
      await c.initialize();
      attachBrowserGuards(c);
    } catch (e) {
      const msg = String(e?.message || e).slice(0, 500);
      setStatus('error', msg);
      await destroyClient();
      throw new Error(msg);
    }

    return snapshot();
  })().catch((e) => {
    initPromise = null;
    throw e;
  });

  try {
    return await initPromise;
  } finally {
    if (status === 'error') initPromise = null;
  }
}

async function stopWhatsApp() {
  await destroyClient();
  setStatus('idle');
  lastQr = null;
  lastQrDataUrl = null;
  return snapshot();
}

async function logoutWhatsApp() {
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
  return snapshot();
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

function waitForReady(timeoutMs = 120000) {
  if (status === 'ready' && client) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (status === 'ready' && client) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (status === 'error' || status === 'disconnected') {
        clearInterval(timer);
        reject(new Error(lastError || `וואטסאפ ${status}`));
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error('פג זמן המתנה לחיבור וואטסאפ — נסה «התחבר» שוב'));
      }
    }, 400);
  });
}

async function ensureReadyForSend() {
  const settings = db.getSettings();
  if (settings.whatsapp_enabled !== '1') return false;

  if (isPageOpen(client) && status === 'ready') return true;

  if (status === 'ready' && !client) {
    console.log('WhatsApp: סשן שמור בלי client — מתחבר מחדש…');
    setStatus('reconnecting');
  }

  try {
    if (initPromise) {
      await initPromise;
    } else {
      await startWhatsApp();
    }
    if (status !== 'ready') {
      await waitForReady(120000);
    }
    return Boolean(client) && status === 'ready';
  } catch (e) {
    console.warn('ensureReadyForSend:', e.message);
    return false;
  }
}

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

async function sendWhatsAppText(phone, text) {
  const settings = db.getSettings();
  if (settings.whatsapp_enabled !== '1') {
    const r = { skipped: true, reason: 'disabled' };
    recordSendResult(r);
    return r;
  }
  if (!(await ensureReadyForSend())) {
    const r = {
      skipped: true,
      reason: status === 'qr' ? 'needs_qr' : 'not_ready',
    };
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
    if (isPuppeteerCrash(msg)) handleBrowserCrash(msg);
    const r = { ok: false, error: msg };
    recordSendResult(r, msg);
    return r;
  }
}

async function handleHealthCheck() {
  const settings = db.getSettings();
  if (settings.whatsapp_enabled !== '1') return;

  if (status === 'ready' && !isPageOpen(client)) {
    console.log('WhatsApp health: מחדש חיבור…');
    try {
      client = null;
      initPromise = null;
      await startWhatsApp();
      await waitForReady(90000);
    } catch (e) {
      console.warn('WhatsApp reconnect:', e.message);
      setStatus('disconnected', e.message);
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
}

async function handleCommand(msg) {
  const { type, id } = msg;
  try {
    let result;
    switch (type) {
      case 'start':
        result = await startWhatsApp();
        break;
      case 'stop':
        result = await stopWhatsApp();
        break;
      case 'logout':
        result = await logoutWhatsApp();
        break;
      case 'send':
        result = await sendWhatsAppText(msg.phone, msg.text);
        break;
      case 'health':
        await handleHealthCheck();
        result = snapshot();
        break;
      case 'restore-status': {
        const saved = db.getSettings().whatsapp_status;
        if (saved && saved !== 'disabled' && saved !== 'ready') {
          status = saved;
        }
        result = snapshot();
        break;
      }
      default:
        throw new Error(`Unknown worker command: ${type}`);
    }
    if (id && process.send) {
      process.send({ type: 'reply', id, ok: true, result });
    }
  } catch (e) {
    const err = String(e?.message || e).slice(0, 500);
    if (id && process.send) {
      process.send({ type: 'reply', id, ok: false, error: err });
    }
  }
}

if (process.send) {
  installCrashGuard();

  const saved = db.getSettings().whatsapp_status;
  if (saved && saved !== 'disabled' && saved !== 'ready') {
    status = saved;
  }
  pushState();

  process.on('message', (msg) => {
    void handleCommand(msg);
  });

  process.send({ type: 'ready-worker' });
}
