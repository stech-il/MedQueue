import { buildTicketReceiptData } from './ticketReceiptLayout.js';

const RECEIPT_CSS = `
@page { size: 80mm auto; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
.print-ticket {
  box-sizing: border-box;
  width: 80mm;
  max-width: 80mm;
  margin: 0 auto;
  padding: 5mm 4mm 6mm;
  font-family: 'Segoe UI', Arial, sans-serif;
  color: #000;
  background: #fff;
  text-align: center;
}
.print-ticket__header { margin-bottom: 3mm; }
.print-ticket__logo {
  display: block;
  max-height: 14mm;
  max-width: 45mm;
  margin: 0 auto 2mm;
  object-fit: contain;
}
.print-ticket__clinic {
  margin: 0;
  font-size: 15pt;
  font-weight: 800;
  line-height: 1.2;
}
.print-ticket__subtitle {
  margin: 1mm 0 0;
  font-size: 9pt;
  font-weight: 600;
  color: #555;
  letter-spacing: 0.08em;
}
.print-ticket__hero {
  margin: 3mm 0;
  padding: 3mm 2mm;
  background: #f5f5f5;
  border: 2px solid #000;
  border-radius: 2mm;
}
.print-ticket__hero-label {
  margin: 0;
  font-size: 11pt;
  font-weight: 700;
  color: #333;
}
.print-ticket__hero-code {
  margin: 2mm 0 0;
  font-size: 42pt;
  font-weight: 900;
  line-height: 1;
}
.print-ticket__rule {
  border: none;
  border-top: 2px dashed #000;
  margin: 3.5mm 0;
  height: 0;
}
.print-ticket__rule--thin { border-top-width: 1px; margin: 2.5mm 0; }
.print-ticket__details { text-align: right; padding: 0 1mm; }
.print-ticket__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 3mm;
  margin-bottom: 2.5mm;
  padding-bottom: 2mm;
  border-bottom: 1px dotted #ccc;
}
.print-ticket__row:last-child { border-bottom: none; margin-bottom: 0; }
.print-ticket__row-label { font-size: 10pt; font-weight: 600; color: #555; }
.print-ticket__row-value {
  font-size: 13pt;
  font-weight: 800;
  text-align: left;
  word-break: break-word;
}
.print-ticket__dest { margin: 2mm 0; padding: 2.5mm; }
.print-ticket__dest-label { margin: 0; font-size: 12pt; font-weight: 700; color: #333; }
.print-ticket__dest-room { margin: 2mm 0 0; font-size: 20pt; font-weight: 900; }
.print-ticket__footer { margin-top: 1mm; }
.print-ticket__datetime { margin: 0; font-size: 10pt; font-weight: 600; color: #333; }
.print-ticket__time { display: block; margin-top: 0.5mm; font-size: 13pt; font-weight: 800; }
.print-ticket__notice { margin: 2.5mm 0 0; font-size: 10pt; font-weight: 700; line-height: 1.35; }
.print-ticket__notice--sm { font-size: 8.5pt; font-weight: 600; color: #555; }
`;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absLogoUrl(logo, baseUrl) {
  const raw = String(logo || '').trim();
  if (!raw || raw === '/logo.svg') return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const base = (baseUrl || process.env.MEDQUEUE_URL || 'https://medqueue-6ivj.onrender.com').replace(/\/$/, '');
  return `${base}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

function rowHtml(label, value) {
  if (!value) return '';
  return `<div class="print-ticket__row">
    <span class="print-ticket__row-label">${esc(label)}</span>
    <span class="print-ticket__row-value">${esc(value)}</span>
  </div>`;
}

export function buildTicketReceiptHtml(ticket, settings, receptionRoom) {
  const r = buildTicketReceiptData(ticket, settings, receptionRoom);
  const logoUrl = absLogoUrl(settings?.clinic_logo, process.env.MEDQUEUE_URL);
  const logoBlock =
    logoUrl && !logoUrl.endsWith('/logo.svg')
      ? `<img class="print-ticket__logo" src="${esc(logoUrl)}" alt="" />`
      : '';

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>כרטיס תור</title>
  <style>${RECEIPT_CSS}</style>
</head>
<body>
  <article class="print-ticket">
    <header class="print-ticket__header">
      ${logoBlock}
      <h1 class="print-ticket__clinic">${esc(r.clinic)}</h1>
      <p class="print-ticket__subtitle">כרטיס תור</p>
    </header>
    <section class="print-ticket__hero">
      <p class="print-ticket__hero-label">מספר תור</p>
      <p class="print-ticket__hero-code">${esc(r.displayCode)}</p>
    </section>
    <div class="print-ticket__rule"></div>
    <section class="print-ticket__details">
      ${rowHtml('קופת חולים', r.healthFund)}
      ${rowHtml('טלפון נייד', r.phone)}
      ${rowHtml('תעודת זהות', r.idNumber)}
      ${rowHtml('שירות', r.serviceName)}
      ${rowHtml('מספר פנימי', r.ticketNumber)}
    </section>
    <div class="print-ticket__rule"></div>
    <section class="print-ticket__dest">
      <p class="print-ticket__dest-label">נא לגשת ל</p>
      <p class="print-ticket__dest-room">${esc(r.roomName)}</p>
    </section>
    <div class="print-ticket__rule print-ticket__rule--thin"></div>
    <footer class="print-ticket__footer">
      <p class="print-ticket__datetime">
        <span>${esc(r.dateLabel)}</span>
        <span class="print-ticket__time">${esc(r.timeLabel)}</span>
      </p>
      <p class="print-ticket__notice">המתן להקריאת מספר התור על המסך</p>
      <p class="print-ticket__notice print-ticket__notice--sm">שמור על כרטיס זה עד סיום הטיפול</p>
    </footer>
  </article>
</body>
</html>`;
}
