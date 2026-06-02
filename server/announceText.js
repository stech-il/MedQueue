/** טקסט הקראה — תואם ל־web/src/lib/roomDisplay.js */

function isReceptionRoom(room) {
  return room?.type === 'reception' || room?.slug === 'reception';
}

export function getRoomAnnounceText(room) {
  if (isReceptionRoom(room)) return 'עמדת קבלה';
  const n = room?.room_number?.trim();
  if (n) return `חדר מספר ${n}`;
  return room?.name || 'החדר';
}

export function buildTicketAnnounceText(ticket, room) {
  const dest = getRoomAnnounceText(room);
  const code = ticket?.display_code || '';
  return `מספר ${code}, נא לגשת ל${dest}`;
}

export function buildDoctorSummonText(room) {
  const dest = getRoomAnnounceText(room);
  return `רופא, נא לגשת ל${dest}`;
}
