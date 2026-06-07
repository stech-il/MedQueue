import { buildTicketAnnounceText, getRoomAnnounceText } from './announceText.js';

const DEFAULT_KIOSK =
  'שלום,\nנרשמת בהצלחה ב{{clinic}}.\nמספר התור שלך: *{{code}}*\nקופת חולים: {{fund}}\nאנא המתן להקראת תורך.';

const DEFAULT_CALL = 'מספר *{{code}}*, נא לגשת ל{{dest}}.';

function applyTemplate(template, vars) {
  let text = template || '';
  for (const [key, val] of Object.entries(vars)) {
    text = text.split(`{{${key}}}`).join(String(val ?? ''));
  }
  return text.trim();
}

export function buildKioskWhatsAppText(ticket, settings) {
  const template = settings.whatsapp_kiosk_template?.trim() || DEFAULT_KIOSK;
  return applyTemplate(template, {
    clinic: settings.clinic_name || 'המרפאה',
    code: ticket?.display_code || '',
    fund: ticket?.health_fund || '',
  });
}

export function buildCallWhatsAppText(ticket, room, settings) {
  const template = settings.whatsapp_call_template?.trim() || DEFAULT_CALL;
  const dest = getRoomAnnounceText(room);
  return applyTemplate(template, {
    clinic: settings.clinic_name || 'המרפאה',
    code: ticket?.display_code || '',
    room: room?.name || '',
    dest,
    announce: buildTicketAnnounceText(ticket, room),
  });
}

export function toWhatsAppChatId(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('972') && d.length >= 11) return `${d}@c.us`;
  if (d.startsWith('0') && d.length >= 9) return `972${d.slice(1)}@c.us`;
  if (d.length === 9) return `972${d}@c.us`;
  return `${d}@c.us`;
}
