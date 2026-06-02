/** תצוגה: שם החדר + תג מספר. הקראה: מספר חדר; בקבלה — «עמדת קבלה» */

export function isReceptionRoom(room) {
  return room?.type === 'reception' || room?.slug === 'reception';
}

export function isDoctorRoom(room) {
  return room?.type === 'doctor' || room?.type === 'lab';
}

export function roomSummonLabel(room) {
  if (isReceptionRoom(room)) return room.name;
  const n = room?.room_number?.trim();
  if (n) return `חדר מספר ${n}`;
  return room?.name || 'חדר';
}

export function formatRoomNumberBadge(room) {
  if (isReceptionRoom(room)) return null;
  const n = room?.room_number?.trim();
  if (!n) return null;
  return `חדר מספר ${n}`;
}

/** טקסט להקראה בלבד */
export function getRoomAnnounceText(room) {
  if (isReceptionRoom(room)) return 'עמדת קבלה';
  const n = room?.room_number?.trim();
  if (n) return `חדר מספר ${n}`;
  return room?.name || 'החדר';
}
