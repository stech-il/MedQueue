import './puppeteerEnv.js';
import { existsSync } from 'fs';
import { findChromiumExecutable } from './findChromium.js';

/** Render / Linux — Chrome עם זיכרון מצומצם (ללא single-process — גורם ל-Target closed) */
const RENDER_CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync',
  '--no-first-run',
  '--hide-scrollbars',
  '--mute-audio',
];

const DESKTOP_CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
];

function isRenderLinux() {
  return (
    process.platform === 'linux' &&
    (process.env.RENDER === 'true' || process.env.NODE_ENV === 'production')
  );
}

function buildOpts(executablePath, { forRender = false } = {}) {
  return {
    headless: true,
    executablePath,
    args: forRender ? RENDER_CHROME_ARGS : DESKTOP_CHROME_ARGS,
    defaultViewport: forRender ? { width: 800, height: 600 } : { width: 1024, height: 768 },
    ignoreHTTPSErrors: true,
  };
}

/** אפשרויות Puppeteer ל־whatsapp-web.js */
export async function getPuppeteerLaunchOptions() {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (envPath && existsSync(envPath)) {
    return buildOpts(envPath, { forRender: isRenderLinux() });
  }

  // Render: קודם Chromium קל (פחות זיכרון), אחר כך Chrome מלא מ-puppeteer
  if (isRenderLinux()) {
    try {
      const chromium = (await import('@sparticuz/chromium')).default;
      chromium.setGraphicsMode = false;
      const executablePath = await chromium.executablePath();
      if (executablePath && existsSync(executablePath)) {
        console.log('WhatsApp Chrome (sparticuz):', executablePath);
        return {
          headless: chromium.headless ?? true,
          executablePath,
          args: [...(chromium.args || []), ...RENDER_CHROME_ARGS],
          defaultViewport: { width: 800, height: 600 },
          ignoreHTTPSErrors: true,
        };
      }
    } catch (e) {
      console.warn('@sparticuz/chromium:', e.message);
    }
  }

  const puppeteer = await import('puppeteer');
  try {
    const executablePath = await puppeteer.default.executablePath();
    if (executablePath && existsSync(executablePath)) {
      console.log('WhatsApp Chrome:', executablePath);
      return buildOpts(executablePath, { forRender: isRenderLinux() });
    }
  } catch (e) {
    console.warn('puppeteer.executablePath:', e.message);
  }

  const local = findChromiumExecutable();
  if (local && existsSync(local)) {
    return buildOpts(local);
  }

  throw new Error(
    'Chrome לא נמצא בשרת. הרץ deploy מחדש (install:chrome). או הגדר PUPPETEER_EXECUTABLE_PATH'
  );
}

/** @deprecated — use getPuppeteerLaunchOptions */
export async function resolveChromiumExecutable() {
  const opts = await getPuppeteerLaunchOptions();
  return opts.executablePath;
}
