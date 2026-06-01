const COOKIE_NAME = 'medqueue_last_room';
const MAX_AGE_SEC = 365 * 24 * 60 * 60;

export function setLastRoomId(roomId) {
  const id = Number(roomId);
  if (!Number.isFinite(id) || id <= 0) return;
  document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax`;
}

export function getLastRoomId() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  const id = Number(decodeURIComponent(match[1]));
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function clearLastRoomId() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/** מחזיר מזהה חדר תקף מתוך רשימת חדרים פעילים */
export function resolveLastRoomId(rooms) {
  const last = getLastRoomId();
  if (last && rooms.some((r) => r.id === last)) return last;
  return rooms[0]?.id ?? null;
}
