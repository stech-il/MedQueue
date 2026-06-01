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

function pdfText(doc, text, opts = {}) {
  doc.text(String(text), opts);
}

/** גיבוי — הדפסה דרך PDF */
export async function printKioskTicketPdf(ticket, settings, receptionRoom) {
  const fontPath = findHebrewFont();
  if (!fontPath) {
    throw new Error('לא נמצא גופן עברית (Arial/David) בתיקיית Windows/Fonts');
  }

  const r = buildTicketReceiptData(ticket, settings, receptionRoom);
  const tmp = path.join(os.tmpdir(), `medqueue-ticket-${ticket.id}-${Date.now()}.pdf`);
  const w = 226.77 - 20;

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [226.77, 520], margin: 10 });
    const stream = fs.createWriteStream(tmp);
    doc.pipe(stream);
    doc.font(fontPath);

    doc.fontSize(10).fillColor('#444');
    pdfText(doc, 'מספר תור', { align: 'center', width: w });
    doc.moveDown(0.1);
    doc.fontSize(44).fillColor('#000');
    pdfText(doc, r.displayCode, { align: 'center', width: w });
    doc.moveDown(0.4);
    pdfDashedLine(doc);

    pdfReceiptRow(doc, 'קופת חולים', r.healthFund, fontPath);
    pdfReceiptRow(doc, 'טלפון נייד', r.phone, fontPath);
    pdfReceiptRow(doc, 'תעודת זהות', r.idNumber, fontPath);

    pdfDashedLine(doc);

    doc.fontSize(9).fillColor('#555');
    pdfText(doc, r.dateLabel, { align: 'center', width: w });
    doc.fontSize(11).fillColor('#000');
    pdfText(doc, r.timeLabel, { align: 'center', width: w });
    doc.moveDown(0.25);
    doc.fontSize(9).fillColor('#666');
    pdfText(doc, 'המתן להקריאת מספר התור על המסך', { align: 'center', width: w });
    doc.fontSize(8);
    pdfText(doc, 'שמור על כרטיס זה עד סיום הטיפול', { align: 'center', width: w });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const printer = settings?.kiosk_printer_name?.trim();
  await print(tmp, printer ? { printer } : undefined);
  fs.unlink(tmp, () => {});
}
