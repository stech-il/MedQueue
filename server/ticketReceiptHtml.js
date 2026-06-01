import { buildTicketReceiptData } from './ticketReceiptLayout.js';

const RECEIPT_CSS = `
@page { size: 80mm auto; margin: 0; }
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  font-family: 'Segoe UI', 'David', Arial, sans-serif;
  color: #111;
}
.receipt {
  width: 80mm;
  max-width: 80mm;
  margin: 0 auto;
  overflow: hidden;
  background: #fff;
}
.receipt__top {
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%);
  color: #fff;
  padding: 5mm 4mm 4mm;
  text-align: center;
}
.receipt__logo-wrap {
  text-align: center;
  padding: 3mm 4mm 0;
  background: #fff;
}
.receipt__logo {
  display: block;
  max-height: 14mm;
  max-width: 50mm;
  margin: 0 auto;
  object-fit: contain;
}
.receipt__clinic {
  margin: 0;
  font-size: 16pt;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
}
.receipt__badge {
  display: inline-block;
  margin-top: 2mm;
  padding: 1mm 4mm;
  font-size: 8.5pt;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: rgba(255,255,255,0.22);
  border-radius: 999px;
}
.receipt__body {
  padding: 4mm 4mm 5mm;
}
.receipt__ticket-box {
  margin: 0 0 4mm;
  padding: 4mm 3mm;
  text-align: center;
  background: #f0fdfa;
  border: 2.5px solid #0d9488;
  border-radius: 3mm;
  box-shadow: 0 1px 0 rgba(0,0,0,0.06);
}
.receipt__ticket-label {
  margin: 0;
  font-size: 11pt;
  font-weight: 700;
  color: #0f766e;
}
.receipt__ticket-code {
  margin: 2mm 0 0;
  font-size: 48pt;
  font-weight: 900;
  line-height: 0.95;
  color: #000;
  letter-spacing: 0.06em;
}
.receipt__divider {
  height: 0;
  border: none;
  border-top: 2px dashed #cbd5e1;
  margin: 3.5mm 0;
}
.receipt__fields {
  display: flex;
  flex-direction: column;
  gap: 2mm;
}
.receipt__field {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 3mm;
  padding: 2.5mm 3mm;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 2mm;
}
.receipt__field-label {
  flex: 0 0 auto;
  font-size: 9.5pt;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}
.receipt__field-value {
  flex: 1 1 auto;
  font-size: 12.5pt;
  font-weight: 800;
  color: #0f172a;
  text-align: left;
  word-break: break-word;
}
.receipt__dest {
  margin: 4mm 0 3mm;
  padding: 3.5mm 3mm;
  text-align: center;
  background: #fffbeb;
  border: 2px solid #f59e0b;
  border-radius: 3mm;
}
.receipt__dest-label {
  margin: 0;
  font-size: 11pt;
  font-weight: 700;
  color: #92400e;
}
.receipt__dest-room {
  margin: 1.5mm 0 0;
  font-size: 22pt;
  font-weight: 900;
  color: #000;
  line-height: 1.1;
}
.receipt__footer {
  margin-top: 3mm;
  padding-top: 3mm;
  border-top: 2px solid #0d9488;
  text-align: center;
}
.receipt__date {
  margin: 0;
  font-size: 9.5pt;
  font-weight: 600;
  color: #475569;
  line-height: 1.4;
}
.receipt__time {
  display: block;
  margin-top: 1mm;
  font-size: 14pt;
  font-weight: 800;
  color: #000;
}
.receipt__notice {
  margin: 3mm 0 0;
  padding: 2.5mm;
  font-size: 9.5pt;
  font-weight: 700;
  line-height: 1.35;
  color: #0f172a;
  background: #f1f5f9;
  border-radius: 2mm;
}
.receipt__notice--sm {
  margin-top: 2mm;
  font-size: 8pt;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  padding: 0;
}
.receipt__brand {
  margin-top: 3mm;
  font-size: 7pt;
  color: #94a3b8;
  letter-spacing: 0.05em;
}
`;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absLogoUrl(logo) {
  const raw = String(logo || '').trim();
  if (!raw || raw === '/logo.svg') return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const base = (process.env.MEDQUEUE_URL || 'https://medqueue-6ivj.onrender.com').replace(/\/$/, '');
  return `${base}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

function fieldHtml(label, value) {
  if (!value) return '';
  return `<div class="receipt__field">
    <span class="receipt__field-label">${esc(label)}</span>
    <span class="receipt__field-value">${esc(value)}</span>
  </div>`;
}

export function buildTicketReceiptHtml(ticket, settings, receptionRoom) {
  const r = buildTicketReceiptData(ticket, settings, receptionRoom);
  const logoUrl = absLogoUrl(settings?.clinic_logo);
  const hasLogo = logoUrl && !logoUrl.endsWith('/logo.svg');

  const headerBlock = hasLogo
    ? `<div class="receipt__logo-wrap"><img class="receipt__logo" src="${esc(logoUrl)}" alt="" /></div>`
    : `<header class="receipt__top receipt__top--fallback">
        <h1 class="receipt__clinic">${esc(r.clinic)}</h1>
        <span class="receipt__badge">כרטיס תור</span>
      </header>`;

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>כרטיס תור ${esc(r.displayCode)}</title>
  <style>${RECEIPT_CSS}</style>
</head>
<body>
  <div class="receipt">
    ${headerBlock}
    <div class="receipt__body">
      <section class="receipt__ticket-box">
        <p class="receipt__ticket-label">מספר התור שלך</p>
        <p class="receipt__ticket-code">${esc(r.displayCode)}</p>
      </section>
      <div class="receipt__fields">
        ${fieldHtml('קופת חולים', r.healthFund)}
        ${fieldHtml('טלפון נייד', r.phone)}
        ${fieldHtml('תעודת זהות', r.idNumber)}
      </div>
      <footer class="receipt__footer">
        <p class="receipt__date">
          ${esc(r.dateLabel)}
          <span class="receipt__time">${esc(r.timeLabel)}</span>
        </p>
        <p class="receipt__notice">המתן להקריאת מספר התור על המסך</p>
        <p class="receipt__notice receipt__notice--sm">שמור על כרטיס זה עד סיום הטיפול</p>
        <p class="receipt__brand">MedQueue</p>
      </footer>
    </div>
  </div>
</body>
</html>`;
}
