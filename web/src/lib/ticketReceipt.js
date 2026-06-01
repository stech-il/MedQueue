/** עיצוב נתונים לכרטיס תור (הדפסה 80mm) */

export function formatReceiptPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9 && d.startsWith('5')) return `0${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return phone || '';
}

export function formatReceiptId(id) {
  const d = String(id || '').replace(/\D/g, '');
  if (d.length === 9) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  if (d.length === 8) return `0${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return id || '';
}

export function buildTicketReceiptData(ticket, settings, receptionRoom) {
  const now = new Date();
  const roomName = receptionRoom?.name || ticket?.room_name || 'קבלה';

  return {
    clinic: settings?.clinic_name?.trim() || 'מוקד רפואי',
    logo: settings?.clinic_logo?.trim() || '',
    displayCode: ticket?.display_code || '—',
    serviceName: ticket?.service_name || '',
    phone: formatReceiptPhone(ticket?.phone),
    idNumber: formatReceiptId(ticket?.id_number),
    healthFund: ticket?.health_fund || '',
    roomName,
    dateTime: now.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    dateLabel: now.toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    timeLabel: now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    ticketNumber: ticket?.ticket_number != null ? String(ticket.ticket_number) : '',
  };
}
