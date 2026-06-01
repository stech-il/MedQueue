import * as db from './db.js';

export function logStaffActivity({
  user,
  action,
  ticket = null,
  room = null,
  details = null,
}) {
  db.insertActivityLog({
    user_id: user?.id ?? null,
    username: user?.username ?? 'מערכת',
    action,
    ticket_id: ticket?.id ?? null,
    display_code: ticket?.display_code ?? null,
    room_id: room?.id ?? ticket?.current_room_id ?? null,
    room_name: room?.name ?? ticket?.room_name ?? null,
    details,
  });
}
