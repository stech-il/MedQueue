import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { findChromiumExecutable } from './findChromium.js';

/**
 * HTML → PDF דרך מנוע Chrome (עברית + עיצוב נשמרים).
 */
export async function htmlFileToPdf(htmlPath, pdfPath) {
  const executablePath = findChromiumExecutable();
  if (!executablePath) {
    throw new Error('לא נמצא Chrome או Edge — התקן Chrome להדפסה מעוצבת');
  }

  const fileUrl = `file:///${path.resolve(htmlPath).replace(/\\/g, '/')}`;
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--disable-gpu', '--no-sandbox', '--font-render-hinting=none'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 302, height: 800, deviceScaleFactor: 2 });
    try {
      await page.goto(fileUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    } catch {
      await page.goto(fileUrl, { waitUntil: 'load', timeout: 15000 });
    }
    await page.emulateMediaType('print');
    await page.pdf({
      path: pdfPath,
      width: '80mm',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    if (!fs.existsSync(pdfPath)) {
      throw new Error('יצירת PDF נכשלה');
    }
  } finally {
    await browser.close();
  }
}
