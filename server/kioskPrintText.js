import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { buildTicketReceiptData } from './ticketReceiptLayout.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WIDTH = 42;

function lineWidth(s) {
  return [...String(s)].length;
}

function centerLine(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  const pad = Math.max(0, Math.floor((WIDTH - lineWidth(s)) / 2));
  return ' '.repeat(pad) + s;
}

function sep() {
  return '-'.repeat(WIDTH);
}

/** כרטיס תור כטקסט — סדר עברי רגיל (בלי PDF, בלי היפוך BiDi) */
export function buildTextReceipt(r) {
  const blocks = [
    '',
    centerLine(r.clinic),
    centerLine('כרטיס תור'),
    '',
    sep(),
    centerLine('מספר תור'),
    centerLine(r.displayCode),
    '',
    sep(),
  ];

  const addField = (label, value) => {
    if (!value) return;
    blocks.push(label, String(value), '');
  };

  addField('קופת חולים', r.healthFund);
  addField('טלפון נייד', r.phone);
  addField('תעודת זהות', r.idNumber);
  addField('שירות', r.serviceName);
  addField('מספר פנימי', r.ticketNumber);

  blocks.push(
    sep(),
    centerLine('נא לגשת ל'),
    centerLine(r.roomName),
    '',
    sep(),
    centerLine(r.dateLabel),
    centerLine(r.timeLabel),
    '',
    centerLine('המתן להקריאת מספר התור על המסך'),
    centerLine('שמור על כרטיס זה עד סיום הטיפול'),
    '',
    ''
  );

  return blocks.join('\r\n');
}

export async function printKioskTicketText(ticket, settings, receptionRoom) {
  if (process.platform !== 'win32') {
    throw new Error('הדפסת טקסט נתמכת ב-Windows בלבד');
  }

  const r = buildTicketReceiptData(ticket, settings, receptionRoom);
  const body = buildTextReceipt(r);
  const tmp = path.join(os.tmpdir(), `medqueue-ticket-${ticket.id}-${Date.now()}.txt`);
  await fs.promises.writeFile(tmp, `\uFEFF${body}`, 'utf8');

  const ps1 = path.join(__dirname, '..', 'scripts', 'print-text-receipt.ps1');
  const printer = settings?.kiosk_printer_name?.trim();
  const args = [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    ps1,
    '-FilePath',
    tmp,
  ];
  if (printer) args.push('-PrinterName', printer);

  try {
    await execFileAsync('powershell.exe', args, { timeout: 45000 });
  } finally {
    fs.unlink(tmp, () => {});
  }
}
