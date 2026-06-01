import { printKioskTicket } from './kioskPrint.js';

function kioskPrintAgentCount(io) {
  const room = io.sockets.adapter.rooms.get('kiosk-print');
  return room?.size ?? 0;
}

/**
 * הדפסת כרטיס קיוסק — אוטומטית למדפסת ברירת מחדל:
 * 1) שרת Windows (פריסה מקומית)
 * 2) סוכן הדפסה מקומי (מחובר ל-Render / ענן)
 * 3) דפדפן הקיוסק (גיבוי — Chrome עם --kiosk-printing)
 */
export async function dispatchKioskPrint(io, ticket, settings, receptionRoom) {
  const via = settings.kiosk_print_via || 'none';

  if (via === 'none') {
    return {
      printed: false,
      needs_browser_print: false,
      print_error: null,
      print_channel: 'none',
    };
  }

  if (via === 'browser') {
    return { printed: false, needs_browser_print: true, print_error: null, print_channel: 'browser' };
  }

  let printed = false;
  let print_error = null;
  let print_channel = null;

  const tryServer = via === 'server' || via === 'auto';
  const tryAgent = via === 'agent' || via === 'auto' || via === 'server';

  if (tryServer && process.platform === 'win32') {
    try {
      await printKioskTicket(ticket, settings, receptionRoom);
      printed = true;
      print_channel = 'server';
    } catch (e) {
      print_error = e.message;
      console.warn('Kiosk server print:', e.message);
    }
  }

  if (!printed && tryAgent && kioskPrintAgentCount(io) > 0) {
    io.to('kiosk-print').emit('kiosk:print', {
      ticket,
      settings,
      reception_room: receptionRoom,
    });
    printed = true;
    print_channel = 'agent';
  }

  const needs_browser_print = !printed;

  return { printed, print_error, needs_browser_print, print_channel };
}
