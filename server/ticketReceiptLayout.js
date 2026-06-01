/** עיצוב כרטיס תור להדפסת PDF (80mm) — תואם ל-web */

export function formatReceiptPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return phone || '';
}

export function formatReceiptId(id) {
  const d = String(id || '').replace(/\D/g, '');
  if (d.length === 9) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  return id || '';
}

export function buildTicketReceiptData(ticket, settings, receptionRoom) {
  const now = new Date();
  const roomName = receptionRoom?.name || ticket?.room_name || 'קבלה';
  return {
    clinic: settings?.clinic_name?.trim() || 'מוקד רפואי',
    displayCode: ticket?.display_code || '—',
    serviceName: ticket?.service_name || '',
    phone: formatReceiptPhone(ticket?.phone),
    idNumber: formatReceiptId(ticket?.id_number),
    healthFund: ticket?.health_fund || '',
    roomName,
    dateTime: now.toLocaleString('he-IL'),
    dateLabel: now.toLocaleDateString('he-IL'),
    timeLabel: now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    ticketNumber: ticket?.ticket_number != null ? String(ticket.ticket_number) : '',
  };
}

/** מצייר שורת פרטים ב-PDF */
export function pdfReceiptRow(doc, label, value, fontPath) {
  if (!value) return;
  doc.font(fontPath).fontSize(11).fillColor('#000000').text(`${label}:  ${value}`, {
    align: 'right',
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
  });
  doc.moveDown(0.12);
}

export function pdfDashedLine(doc) {
  const x0 = doc.page.margins.left;
  const x1 = doc.page.width - doc.page.margins.right;
  doc
    .strokeColor('#999999')
    .dash(3, { space: 2 })
    .moveTo(x0, doc.y)
    .lineTo(x1, doc.y)
    .stroke()
    .undash();
  doc.moveDown(0.35);
}
