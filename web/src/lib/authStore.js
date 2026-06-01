const KEY = 'medqueue_token';
const USER_KEY = 'medqueue_user';

export function getToken() {
  return localStorage.getItem(KEY);
}

export function setSession(token, user) {
  localStorage.setItem(KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
}

/** עמדות חדר פתוחות לכולם — אין הגבלת חדר למשתמש מחובר */
export function canAccessRoom(user) {
  return Boolean(user);
}
