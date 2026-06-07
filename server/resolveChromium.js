import { existsSync } from 'fs';
import puppeteer from 'puppeteer';
import { findChromiumExecutable } from './findChromium.js';

/** נתיב Chrome ל־whatsapp-web.js (Puppeteer 25+: executablePath אסינכרוני) */
export async function resolveChromiumExecutable() {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (envPath && existsSync(envPath)) return envPath;

  const bundled = await puppeteer.executablePath();
  if (bundled && existsSync(bundled)) return bundled;

  const local = findChromiumExecutable();
  if (local && existsSync(local)) return local;

  throw new Error(
    'Chrome לא נמצא בשרת. ודא ש־puppeteer מותקן (npm install) או הגדר PUPPETEER_EXECUTABLE_PATH'
  );
}
