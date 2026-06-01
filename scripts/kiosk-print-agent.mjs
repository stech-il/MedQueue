/**
 * סוכן הדפסה מקומי (Windows) — מדפיס למדפסת ברירת מחדל כשהאפליקציה על Render/ענן.
 *
 * שימוש:
 *   set MEDQUEUE_URL=https://your-app.onrender.com
 *   npm run kiosk:agent
 */
import { io } from 'socket.io-client';
import { printKioskTicket } from '../server/kioskPrint.js';

const URL = (process.env.MEDQUEUE_URL || 'http://localhost:3001').replace(/\/$/, '');

if (process.platform !== 'win32') {
  console.error('סוכן ההדפסה נתמך ב-Windows בלבד (מדפסת מקומית).');
  process.exit(1);
}

console.log(`MedQueue — סוכן הדפסה → ${URL}`);

const socket = io(URL, { transports: ['websocket', 'polling'], reconnection: true });

socket.on('connect', () => {
  socket.emit('subscribe:kiosk-print');
  console.log('מחובר — ממתין לכרטיסי תור (מדפסת ברירת מחדל)');
});

socket.on('disconnect', () => {
  console.warn('מנותק מהשרת — מנסה להתחבר מחדש…');
});

socket.on('kiosk:print', async (payload) => {
  if (!payload?.ticket) return;
  try {
    await printKioskTicket(payload.ticket, payload.settings || {}, payload.reception_room);
    console.log(`הודפס: תור ${payload.ticket.display_code || payload.ticket.id}`);
  } catch (e) {
    console.error('שגיאת הדפסה:', e.message);
  }
});

socket.on('connect_error', (e) => {
  console.error('לא ניתן להתחבר:', e.message);
});
