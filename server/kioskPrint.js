import fs from 'fs';
import os from 'os';
import path from 'path';
import PDFDocument from 'pdfkit';
import pdfPrinter from 'pdf-to-printer';
import {
  buildTicketReceiptData,
  pdfDashedLine,
  pdfReceiptRow,
} from './ticketReceiptLayout.js';

const { print } = pdfPrinter;

function findHebrewFont() {
  const roots = [process.env.WINDIR, process.env.SystemRoot, 'C:\\Windows'].filter(Boolean);
  const names = ['arial.ttf', 'david.ttf', 'segoeui.ttf', 'tahoma.ttf'];
  for (const root of roots) {
    for (const name of names) {
      const p = path.join(root, 'Fonts', name);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * הדפסת כרטיס תור ישירות למדפסת (ללא חלון דפדפן). Windows + מדפסת ברירת מחדל.
 */
export async function printKioskTicket(ticket, settings, receptionRoom) {
  if (process.platform !== 'win32') {
    throw new Error('הדפסה מהשרת נתמכת כרגע ב-Windows בלבד');
  }

  const fontPath = findHebrewFont();
  if (!fontPath) {
    throw new Error('לא נמצא גופן עברית (Arial/David) בתיקיית Windows/Fonts');
  }

  const r = buildTicketReceiptData(ticket, settings, receptionRoom);
  const tmp = path.join(os.tmpdir(), `medqueue-ticket-${ticket.id}-${Date.now()}.pdf`);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [226.77, 520], margin: 10 });
    const stream = fs.createWriteStream(tmp);
    doc.pipe(stream);
    doc.font(fontPath);

    doc.fontSize(15).fillColor('#000').text(r.clinic, { align: 'center' });
    doc.fontSize(9).fillColor('#666').text('כרטיס תור', { align: 'center' });
    doc.moveDown(0.35);

    pdfDashedLine(doc);

    doc.fontSize(10).fillColor('#444').text('מספר תור', { align: 'center' });
    doc.moveDown(0.1);
    doc.fontSize(44).fillColor('#000').text(r.displayCode, { align: 'center' });
    doc.moveDown(0.4);

    pdfDashedLine(doc);

    pdfReceiptRow(doc, 'קופת חולים', r.healthFund, fontPath);
    pdfReceiptRow(doc, 'טלפון נייד', r.phone, fontPath);
    pdfReceiptRow(doc, 'תעודת זהות', r.idNumber, fontPath);
    pdfReceiptRow(doc, 'שירות', r.serviceName, fontPath);
    if (r.ticketNumber) pdfReceiptRow(doc, 'מספר פנימי', r.ticketNumber, fontPath);

    pdfDashedLine(doc);

    doc.fontSize(11).fillColor('#333').text('נא לגשת ל', { align: 'center' });
    doc.fontSize(18).fillColor('#000').text(r.roomName, { align: 'center' });
    doc.moveDown(0.35);

    pdfDashedLine(doc);

    doc.fontSize(9).fillColor('#555').text(r.dateLabel, { align: 'center' });
    doc.fontSize(11).fillColor('#000').text(r.timeLabel, { align: 'center' });
    doc.moveDown(0.25);
    doc.fontSize(9).fillColor('#666').text('המתן להקריאת מספר התור על המסך', { align: 'center' });
    doc.fontSize(8).text('שמור על כרטיס זה עד סיום הטיפול', { align: 'center' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const printer = settings?.kiosk_printer_name?.trim();
  await print(tmp, printer ? { printer } : undefined);
  fs.unlink(tmp, () => {});
}
