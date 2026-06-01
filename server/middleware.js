import { verifyToken, parseBearer } from './auth.js';
import * as db from './db.js';

export function attachUser(req, res, next) {
  const token = parseBearer(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = verifyToken(token);
    const user = db.getUser(payload.sub);
    if (!user || !user.is_active) {
      req.user = null;
      return next();
    }
    req.user = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      must_change_password: Boolean(user.must_change_password),
    };
  } catch {
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'נדרשת התחברות' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'נדרשת התחברות' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'גישה למנהלים בלבד' });
  next();
}

/** עמדות חדר ציבוריות; אין הגבלת חדר למשתמש מחובר */
export function canAccessRoom(user) {
  return Boolean(user);
}

export function requireRoomAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'נדרשת התחברות' });
  next();
}
