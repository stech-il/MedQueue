import './puppeteerEnv.js';
import { existsSync } from 'fs';
import { findChromiumExecutable } from './findChromium.js';

const LINUX_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

function useLinuxBundle() {
  if (process.platform !== 'linux') return false;
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    process.env.USE_SPARTICUZ_CHROMIUM === '1'
  );
}

/** אפשרויות Puppeteer ל־whatsapp-web.js */
export async function getPuppeteerLaunchOptions() {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (envPath && existsSync(envPath)) {
    return { headless: true, executablePath: envPath, args: LINUX_ARGS };
  }

  if (useLinuxBundle()) {
    try {
      const chromium = (await import('@sparticuz/chromium')).default;
      chromium.setGraphicsMode = false;
      const executablePath = await chromium.executablePath();
      if (executablePath && existsSync(executablePath)) {
        return {
          headless: chromium.headless ?? true,
          executablePath,
          args: [...(chromium.args || []), ...LINUX_ARGS],
        };
      }
    } catch (e) {
      console.warn('@sparticuz/chromium:', e.message);
    }
  }

  const puppeteer = await import('puppeteer');
  const executablePath = await puppeteer.default.executablePath();
  if (executablePath && existsSync(executablePath)) {
    return { headless: true, executablePath, args: LINUX_ARGS };
  }

  const local = findChromiumExecutable();
  if (local && existsSync(local)) {
    return { headless: true, executablePath: local, args: LINUX_ARGS };
  }

  throw new Error(
    'Chrome לא נמצא בשרת. ב-Render: deploy מחדש אחרי עדכון. מקומית: npm run install:chrome --prefix server'
  );
}

/** @deprecated — use getPuppeteerLaunchOptions */
export async function resolveChromiumExecutable() {
  const opts = await getPuppeteerLaunchOptions();
  return opts.executablePath;
}
