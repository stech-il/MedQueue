import fs from 'fs';
import os from 'os';
import path from 'path';
import pdfPrinter from 'pdf-to-printer';
import { buildTicketReceiptHtml } from './ticketReceiptHtml.js';
import { htmlFileToPdf } from './htmlToPdf.js';

const { print } = pdfPrinter;

/**
 * כרטיס מעוצב: HTML → PDF (Chrome) → הדפסה שקטה למדפסת ברירת מחדל.
 */
export async function printKioskTicketHtml(ticket, settings, receptionRoom) {
  if (process.platform !== 'win32') {
    throw new Error('הדפסה מעוצבת נתמכת ב-Windows בלבד');
  }

  const stamp = `${ticket.id}-${Date.now()}`;
  const htmlPath = path.join(os.tmpdir(), `medqueue-${stamp}.html`);
  const pdfPath = path.join(os.tmpdir(), `medqueue-${stamp}.pdf`);

  const html = buildTicketReceiptHtml(ticket, settings, receptionRoom);
  await fs.promises.writeFile(htmlPath, html, 'utf8');

  try {
    await htmlFileToPdf(htmlPath, pdfPath);
    const printer = settings?.kiosk_printer_name?.trim();
    await print(pdfPath, printer ? { printer } : undefined);
  } finally {
    fs.unlink(htmlPath, () => {});
    fs.unlink(pdfPath, () => {});
  }
}
