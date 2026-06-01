import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { buildTicketReceiptHtml } from './ticketReceiptHtml.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** הדפסת כרטיס HTML מעוצב (כמו במסך) — בלי PDF */
export async function printKioskTicketHtml(ticket, settings, receptionRoom) {
  if (process.platform !== 'win32') {
    throw new Error('הדפסת HTML נתמכת ב-Windows בלבד');
  }

  const html = buildTicketReceiptHtml(ticket, settings, receptionRoom);
  const tmp = path.join(os.tmpdir(), `medqueue-ticket-${ticket.id}-${Date.now()}.html`);
  await fs.promises.writeFile(tmp, html, 'utf8');

  const ps1 = path.join(__dirname, '..', 'scripts', 'print-html-receipt.ps1');
  const printer = settings?.kiosk_printer_name?.trim();
  const args = [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Sta',
    '-File',
    ps1,
    '-HtmlPath',
    tmp,
  ];
  if (printer) args.push('-PrinterName', printer);

  try {
    await execFileAsync('powershell.exe', args, { timeout: 60000 });
  } finally {
    fs.unlink(tmp, () => {});
  }
}
