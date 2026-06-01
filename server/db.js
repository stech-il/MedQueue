import { DatabaseSync } from 'node:sqlite';
import { ensureDataDirs, DB_PATH } from './paths.js';

ensureDataDirs();

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'waiting',
    sort_order INTEGER NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#2563eb',
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL DEFAULT 'A',
    room_id INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number INTEGER NOT NULL,
    display_code TEXT NOT NULL,
    patient_name TEXT,
    service_id INTEGER NOT NULL,
    current_room_id INTEGER,
    status TEXT NOT NULL DEFAULT 'waiting',
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    called_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (current_room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS ticket_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    from_room_id INTEGER,
    to_room_id INTEGER,
    action TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    room_ids TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

(function migrateTicketColumns() {
  let cols = db.prepare('PRAGMA table_info(tickets)').all();
  if (!cols.some((c) => c.name === 'phone')) db.exec('ALTER TABLE tickets ADD COLUMN phone TEXT');
  cols = db.prepare('PRAGMA table_info(tickets)').all();
  if (!cols.some((c) => c.name === 'health_fund')) db.exec('ALTER TABLE tickets ADD COLUMN health_fund TEXT');
  cols = db.prepare('PRAGMA table_info(tickets)').all();
  if (!cols.some((c) => c.name === 'id_number')) db.exec('ALTER TABLE tickets ADD COLUMN id_number TEXT');
})();

(function migrateUsersActivity() {
  let cols = db.prepare('PRAGMA table_info(users)').all();
  if (!cols.some((c) => c.name === 'must_change_password')) {
    db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0');
    db.prepare("UPDATE users SET must_change_password = 1 WHERE username = 'admin'").run();
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      ticket_id INTEGER,
      display_code TEXT,
      room_id INTEGER,
      room_name TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);
})();

(function migrateRoomNumber() {
  let cols = db.prepare('PRAGMA table_info(rooms)').all();
  if (!cols.some((c) => c.name === 'room_number')) {
    db.exec('ALTER TABLE rooms ADD COLUMN room_number TEXT');
  }
})();

(function migrateRoomSharedGroup() {
  let cols = db.prepare('PRAGMA table_info(rooms)').all();
  if (!cols.some((c) => c.name === 'shared_group')) {
    db.exec('ALTER TABLE rooms ADD COLUMN shared_group TEXT');
  }
  db.prepare(
    `UPDATE rooms SET shared_group = 'doctors'
     WHERE slug IN ('doctor-1', 'doctor-2') AND (shared_group IS NULL OR shared_group = '')`
  ).run();
})();

const roomCount = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
if (roomCount === 0) {
  const insertRoom = db.prepare(
    'INSERT INTO rooms (name, slug, type, sort_order, color) VALUES (?, ?, ?, ?, ?)'
  );
  const rooms = [
    ['קבלה', 'reception', 'reception', 1, '#059669'],
    ['המתנה', 'waiting', 'waiting', 2, '#2563eb'],
    ['רופא 1', 'doctor-1', 'doctor', 3, '#7c3aed'],
    ['רופא 2', 'doctor-2', 'doctor', 4, '#db2777'],
    ['מעבדה', 'lab', 'lab', 5, '#ea580c'],
  ];
  for (const r of rooms) insertRoom.run(...r);

  const insertService = db.prepare(
    'INSERT INTO services (name, prefix, room_id) VALUES (?, ?, ?)'
  );
  insertService.run('רופא כללי', 'A', 3);
  insertService.run('רופא מומחה', 'B', 4);
  insertService.run('בדיקות מעבדה', 'L', 5);
  insertService.run('קבלה / מידע', 'R', 1);

  db.prepare("INSERT INTO settings (key, value) VALUES ('clinic_name', 'בית הרופאים')").run();
  db.prepare("INSERT INTO settings (key, value) VALUES ('daily_reset', '1')").run();
  db.prepare("INSERT INTO settings (key, value) VALUES ('clinic_logo', '')").run();
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('ticker_messages', 'ברוכים הבאים למוקד הרפואי|אנא המתינו בסדר התור|נא לשמור על שקט באזור ההמתנה')"
  ).run();
}

const defaultSettings = {
  clinic_logo: '/logo.svg',
  ticker_messages: 'ברוכים הבאים|אנא המתינו בסדר התור',
  tts_provider: 'edge',
  tts_edge_voice: 'he-IL-HilaNeural',
  tts_edge_rate: '-5%',
  tts_voice_uri: '',
  tts_rate: '0.68',
  display_flash_seconds: '12',
  display_summon_seconds: '10',
  display_tagline: 'ברוכים הבאים למוקד הרפואי',
  display_template: 'board',
  display_center_mode: 'default',
  display_center_slides: '[]',
  display_center_image: '',
  display_center_video: '',
  display_center_slide_seconds: '8',
  ticker_size: 'md',
  kiosk_print_via: 'auto',
  kiosk_print_format: 'html',
  kiosk_printer_name: '',
  tts_playback: 'both',
  backup_auto_daily: '1',
};
for (const [key, value] of Object.entries(defaultSettings)) {
  const exists = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(key);
  if (!exists) db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

db.prepare("UPDATE users SET room_ids = NULL WHERE room_ids IS NOT NULL AND room_ids != ''").run();
db.prepare("UPDATE settings SET value = 'both' WHERE key = 'tts_playback' AND value = 'server'").run();

ensureKioskService();

function ensureKioskService() {
  const reception = db.prepare("SELECT id FROM rooms WHERE type = 'reception' LIMIT 1").get();
  if (!reception) return;
  const existing = db
    .prepare("SELECT id FROM services WHERE prefix = 'K' AND is_active = 1 LIMIT 1")
    .get();
  if (!existing) {
    db.prepare('INSERT INTO services (name, prefix, room_id) VALUES (?, ?, ?)').run(
      'קבלה כללית',
      'K',
      reception.id
    );
  }
}

export const HEALTH_FUNDS = ['כללית', 'מכבי', 'מאוחדת', 'לאומית', 'אחר'];

export function getKioskService() {
  ensureKioskService();
  const svc =
    db.prepare("SELECT * FROM services WHERE prefix = 'K' AND is_active = 1 LIMIT 1").get() ||
    db.prepare("SELECT * FROM services WHERE name LIKE '%קבלה%' AND is_active = 1 LIMIT 1").get();
  if (!svc) throw new Error('שירות קבלה לא הוגדר במערכת');
  return svc;
}

export function getReceptionRoom() {
  const room =
    db.prepare("SELECT * FROM rooms WHERE type = 'reception' AND is_active = 1 ORDER BY sort_order LIMIT 1").get() ||
    db.prepare("SELECT * FROM rooms WHERE slug = 'reception' LIMIT 1").get();
  if (!room) throw new Error('חדר קבלה לא הוגדר במערכת');
  return room;
}

export function normalizePhone(phone) {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('972')) digits = '0' + digits.slice(3);
  if (digits.length === 9 && digits.startsWith('5')) digits = '0' + digits;
  return digits;
}

export function validatePhone(phone) {
  const n = normalizePhone(phone);
  if (!/^0[2-9]\d{7,8}$/.test(n)) {
    throw new Error('מספר טלפון לא תקין (הזן מספר ישראלי)');
  }
  return n;
}

export function validateIsraeliId(id) {
  let s = String(id).replace(/\D/g, '');
  if (s.length === 8) s = '0' + s;
  if (!/^\d{9}$/.test(s)) throw new Error('תעודת זהות חייבת להכיל 9 ספרות');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let inc = Number(s[i]) * ((i % 2) + 1);
    if (inc > 9) inc -= 9;
    sum += inc;
  }
  if (sum % 10 !== 0) throw new Error('תעודת זהות לא תקינה');
  return s;
}

function todayStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 00:00:00`;
}

function todayDateStr() {
  return todayStart().slice(0, 10);
}

function toDayBounds(from, to) {
  const f = (from || todayDateStr()).slice(0, 10);
  const t = (to || f).slice(0, 10);
  return {
    from: `${f} 00:00:00`,
    to: `${t} 23:59:59`,
    fromDate: f,
    toDate: t,
  };
}

function minutesBetween(start, end) {
  if (!start || !end) return null;
  const a = new Date(String(start).replace(' ', 'T'));
  const b = new Date(String(end).replace(' ', 'T'));
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(0, Math.round((b - a) / 60000));
}

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

export function getRooms(activeOnly = false) {
  const sql = activeOnly
    ? 'SELECT * FROM rooms WHERE is_active = 1 ORDER BY sort_order'
    : 'SELECT * FROM rooms ORDER BY sort_order';
  return db.prepare(sql).all();
}

export function getRoom(id) {
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
}

function isReceptionRoom(room) {
  return room?.type === 'reception' || room?.slug === 'reception';
}

function assertTicketInReceptionQueue(ticket) {
  const room = getRoom(ticket.current_room_id);
  if (!isReceptionRoom(room)) {
    throw new Error('קידום אפשרי רק בתור קבלה');
  }
}

export function getRoomBySlug(slug) {
  return db.prepare('SELECT * FROM rooms WHERE slug = ?').get(slug);
}

export function createRoom({ name, slug, type, color, sort_order, room_number }) {
  const row = db
    .prepare(
      'INSERT INTO rooms (name, slug, type, sort_order, color, room_number) VALUES (?, ?, ?, ?, ?, ?) RETURNING id'
    )
    .get(
      name,
      slug,
      type,
      sort_order ?? 99,
      color ?? '#2563eb',
      room_number?.trim() || null
    );
  return getRoom(row.id);
}

/** מזהי חדרים לתור ממתינים — קבוצה משותפת או חדר בודד */
export function getQueueScopeRoomIds(roomId) {
  const room = getRoom(roomId);
  if (!room) return [roomId];
  if (!room.shared_group) return [roomId];
  return db
    .prepare('SELECT id FROM rooms WHERE shared_group = ? AND is_active = 1')
    .all(room.shared_group)
    .map((r) => r.id);
}

export function getSharedPartnerRooms(roomId) {
  const room = getRoom(roomId);
  if (!room?.shared_group) return [];
  return db
    .prepare(
      'SELECT * FROM rooms WHERE shared_group = ? AND is_active = 1 AND id != ? ORDER BY sort_order'
    )
    .all(room.shared_group, roomId);
}

export function updateRoom(id, data) {
  const fields = [];
  const values = [];
  for (const key of ['name', 'slug', 'type', 'color', 'sort_order', 'is_active', 'shared_group', 'room_number']) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      const val =
        key === 'shared_group' || key === 'room_number'
          ? data[key]?.trim() || null
          : data[key];
      values.push(val);
    }
  }
  if (fields.length) {
    values.push(id);
    db.prepare(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return getRoom(id);
}

/** מקשר חדרים לקבוצת תור משותפת (מעדכן את כל החדרים ברשימה) */
export function setRoomSharedLinks(roomId, sharedGroup, linkedRoomIds = []) {
  const room = getRoom(roomId);
  if (!room) throw new Error('חדר לא נמצא');

  const group = sharedGroup?.trim() || null;
  updateRoom(roomId, { shared_group: group });

  if (!group) {
    return getRoom(roomId);
  }

  const ids = new Set([roomId, ...linkedRoomIds.map(Number)]);
  for (const id of ids) {
    if (id === roomId) continue;
    updateRoom(id, { shared_group: group });
  }
  return getRoom(roomId);
}

export function deleteRoom(id) {
  const room = getRoom(id);
  if (!room) throw new Error('חדר לא נמצא');

  const activeTickets = db
    .prepare(
      `SELECT COUNT(*) as c FROM tickets
       WHERE current_room_id = ? AND status != 'completed'`
    )
    .get(id).c;

  if (activeTickets > 0) {
    throw new Error(
      'לא ניתן למחוק — יש תורים פעילים בחדר (ממתינים, נקראו או בטיפול). סיים אותם או העבר לחדר אחר.'
    );
  }

  // שחרור הפניות ישנות (תורים שהושלמו, שירותים, משתמשים) — אחרת SQLite חוסם מחיקה
  db.prepare('UPDATE tickets SET current_room_id = NULL WHERE current_room_id = ?').run(id);
  db.prepare('UPDATE services SET room_id = NULL WHERE room_id = ?').run(id);

  const usersWithRooms = db
    .prepare("SELECT id, room_ids FROM users WHERE room_ids IS NOT NULL AND room_ids != ''")
    .all();
  for (const u of usersWithRooms) {
    let ids;
    try {
      ids = JSON.parse(u.room_ids);
    } catch {
      continue;
    }
    if (!Array.isArray(ids) || !ids.includes(id)) continue;
    const next = ids.filter((rid) => Number(rid) !== Number(id));
    db.prepare('UPDATE users SET room_ids = ? WHERE id = ?').run(
      next.length ? JSON.stringify(next) : null,
      u.id
    );
  }

  try {
    db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
  } catch (e) {
    if (String(e.message || e).includes('FOREIGN KEY')) {
      throw new Error('לא ניתן למחוק את החדר — עדיין יש נתונים המקושרים אליו. נסה שוב אחרי סיום כל התורים.');
    }
    throw e;
  }
  return { ok: true };
}

export function getDistinctSharedGroups() {
  return db
    .prepare(
      `SELECT DISTINCT shared_group as name FROM rooms
       WHERE shared_group IS NOT NULL AND shared_group != '' AND is_active = 1
       ORDER BY shared_group`
    )
    .all()
    .map((r) => r.name);
}

export function getServices(activeOnly = true) {
  const sql = activeOnly
    ? `SELECT s.*, r.name as room_name FROM services s
       LEFT JOIN rooms r ON s.room_id = r.id WHERE s.is_active = 1`
    : `SELECT s.*, r.name as room_name FROM services s LEFT JOIN rooms r ON s.room_id = r.id`;
  return db.prepare(sql).all();
}

export function createService({ name, prefix, room_id }) {
  const row = db
    .prepare('INSERT INTO services (name, prefix, room_id) VALUES (?, ?, ?) RETURNING id')
    .get(name, prefix, room_id ?? null);
  return db.prepare('SELECT * FROM services WHERE id = ?').get(row.id);
}

export function nextTicketNumber(serviceId) {
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
  if (!service) throw new Error('שירות לא נמצא');

  const start = todayStart();
  const row = db
    .prepare(
      `SELECT MAX(ticket_number) as max_num FROM tickets
       WHERE service_id = ? AND created_at >= ?`
    )
    .get(serviceId, start);

  const next = (row.max_num ?? 0) + 1;
  const displayCode = `${service.prefix}${next}`;
  return { ticket_number: next, display_code: displayCode, service };
}

export function createTicket({
  service_id,
  patient_name,
  phone = null,
  id_number = null,
  health_fund = null,
  priority = 0,
  force_reception = false,
}) {
  const { ticket_number, display_code, service } = nextTicketNumber(service_id);
  const receptionRoom = getReceptionRoom();
  const waitingRoom = db.prepare("SELECT id FROM rooms WHERE type = 'waiting' LIMIT 1").get();
  const startRoom = force_reception
    ? receptionRoom.id
    : (service.room_id ?? receptionRoom.id ?? waitingRoom?.id ?? null);

  const row = db
    .prepare(
      `INSERT INTO tickets (ticket_number, display_code, patient_name, phone, id_number, health_fund, service_id, current_room_id, status, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?) RETURNING id`
    )
    .get(
      ticket_number,
      display_code,
      patient_name || null,
      phone,
      id_number,
      health_fund,
      service_id,
      startRoom,
      priority
    );

  const ticketId = row.id;
  logHistory(ticketId, null, startRoom, 'created');
  return getTicket(ticketId);
}

export function createKioskTicket({ phone, id_number, health_fund }) {
  const normalizedPhone = validatePhone(phone);
  const normalizedId = validateIsraeliId(id_number);
  const fund = String(health_fund || '').trim();
  if (!fund) throw new Error('יש לבחור קופת חולים');
  if (!HEALTH_FUNDS.includes(fund)) throw new Error('קופת חולים לא תקינה');

  const service = getKioskService();
  return createTicket({
    service_id: service.id,
    patient_name: null,
    phone: normalizedPhone,
    id_number: normalizedId,
    health_fund: fund,
    force_reception: true,
  });
}

export function getTicket(id) {
  return db
    .prepare(
      `SELECT t.*, s.name as service_name, s.prefix, r.name as room_name, r.slug as room_slug, r.color as room_color
       FROM tickets t
       JOIN services s ON t.service_id = s.id
       LEFT JOIN rooms r ON t.current_room_id = r.id
       WHERE t.id = ?`
    )
    .get(id);
}

export function getWaitingQueueForScope(roomId) {
  const roomIds = getQueueScopeRoomIds(roomId);
  const placeholders = roomIds.map(() => '?').join(',');
  return db
    .prepare(
      `SELECT t.*, s.name as service_name, s.prefix, r.name as queue_room_name
       FROM tickets t
       JOIN services s ON t.service_id = s.id
       LEFT JOIN rooms r ON t.current_room_id = r.id
       WHERE t.current_room_id IN (${placeholders}) AND t.status = 'waiting'
         AND t.created_at >= ? AND t.completed_at IS NULL
       ORDER BY t.priority DESC, t.created_at ASC`
    )
    .all(...roomIds, todayStart());
}

export function getQueueForRoom(roomId, includeServing = true) {
  if (!includeServing) return getWaitingQueueForScope(roomId);

  const statuses = "('waiting', 'called', 'serving')";
  const roomIds = getQueueScopeRoomIds(roomId);
  const placeholders = roomIds.map(() => '?').join(',');
  return db
    .prepare(
      `SELECT t.*, s.name as service_name, s.prefix
       FROM tickets t
       JOIN services s ON t.service_id = s.id
       WHERE t.current_room_id IN (${placeholders}) AND t.status IN ${statuses}
         AND t.created_at >= ? AND t.completed_at IS NULL
       ORDER BY t.priority DESC, t.created_at ASC`
    )
    .all(...roomIds, todayStart());
}

export function getActiveTickets() {
  return db
    .prepare(
      `SELECT t.*, s.name as service_name, r.name as room_name, r.slug as room_slug
       FROM tickets t
       JOIN services s ON t.service_id = s.id
       LEFT JOIN rooms r ON t.current_room_id = r.id
       WHERE t.status != 'completed' AND t.created_at >= ?
       ORDER BY t.created_at DESC`
    )
    .all(todayStart());
}

export function getCurrentlyServing(roomId) {
  return getCurrentInRoom(roomId);
}

/** מטופל פעיל בחדר — בטיפול קודם, אחרת נקרא */
export function getCurrentInRoom(roomId) {
  const serving = db
    .prepare(
      `SELECT t.*, s.name as service_name
       FROM tickets t JOIN services s ON t.service_id = s.id
       WHERE t.current_room_id = ? AND t.status = 'serving'
         AND t.created_at >= ? AND t.completed_at IS NULL
       ORDER BY t.called_at DESC LIMIT 1`
    )
    .get(roomId, todayStart());
  if (serving) return serving;

  return db
    .prepare(
      `SELECT t.*, s.name as service_name
       FROM tickets t JOIN services s ON t.service_id = s.id
       WHERE t.current_room_id = ? AND t.status = 'called'
         AND t.created_at >= ? AND t.completed_at IS NULL
       ORDER BY t.called_at DESC LIMIT 1`
    )
    .get(roomId, todayStart());
}

export function getAllWaiting() {
  return db
    .prepare(
      `SELECT t.*, s.name as service_name, r.name as room_name, r.color as room_color
       FROM tickets t
       JOIN services s ON t.service_id = s.id
       LEFT JOIN rooms r ON t.current_room_id = r.id
       WHERE t.status = 'waiting' AND t.created_at >= ? AND t.completed_at IS NULL
       ORDER BY t.priority DESC, t.created_at ASC`
    )
    .all(todayStart());
}

export function getRoomStation(roomId) {
  const room = getRoom(roomId);
  const queue = getWaitingQueueForScope(roomId);
  const current = getCurrentInRoom(roomId);
  const next = queue[0] || null;
  const sharedPartners = getSharedPartnerRooms(roomId);
  const otherRooms = getRooms(true).filter(
    (r) => r.id !== roomId && r.shared_group !== room.shared_group
  );
  return {
    room,
    current,
    next,
    waitingCount: queue.length,
    queue,
    sharedPartners,
    isSharedQueue: Boolean(room.shared_group),
    otherRooms,
    allRooms: getRooms(true),
    settings: getSettings(),
    health_funds: HEALTH_FUNDS,
    timestamp: Date.now(),
  };
}

export function receivePatient(ticketId) {
  const ticket = getTicket(ticketId);
  if (!ticket) throw new Error('תור לא נמצא');
  if (ticket.status === 'completed') throw new Error('התור כבר הושלם');
  if (ticket.status === 'serving') return ticket;
  db.prepare(`UPDATE tickets SET status = 'serving' WHERE id = ?`).run(ticketId);
  logHistory(ticketId, ticket.current_room_id, ticket.current_room_id, 'received');
  return getTicket(ticketId);
}

/** קריאה + כניסה לטיפול בפעולה אחת */
function callTicketToServing(ticketId, roomId, fromRoomId, historyAction = 'called') {
  db.prepare(
    `UPDATE tickets SET status = 'serving', current_room_id = ?,
     called_at = datetime('now', 'localtime') WHERE id = ?`
  ).run(roomId, ticketId);
  logHistory(ticketId, fromRoomId ?? null, roomId, historyAction);
  return getTicket(ticketId);
}

export function callNext(roomId) {
  const active = getCurrentInRoom(roomId);
  if (active) throw new Error('יש מטופל בחדר — סיים טיפול לפני קריאה הבאה');

  const scopeIds = getQueueScopeRoomIds(roomId);
  const placeholders = scopeIds.map(() => '?').join(',');
  const next = db
    .prepare(
      `SELECT t.id, t.current_room_id FROM tickets t
       WHERE t.current_room_id IN (${placeholders}) AND t.status = 'waiting' AND t.created_at >= ?
       ORDER BY t.priority DESC, t.created_at ASC LIMIT 1`
    )
    .get(...scopeIds, todayStart());

  if (!next) return null;

  return callTicketToServing(next.id, roomId, next.current_room_id, 'called');
}

export function callTicket(ticketId, roomId) {
  const ticket = getTicket(ticketId);
  return callTicketToServing(ticketId, roomId, ticket?.current_room_id, 'called');
}

/** העלאת עדיפות — מקדם לפני כולם בתור (אותו scope) */
export function bumpTicketPriority(ticketId) {
  const ticket = getTicket(ticketId);
  if (!ticket) throw new Error('תור לא נמצא');
  if (ticket.status !== 'waiting') throw new Error('ניתן לקדם רק ממתינים בתור');
  assertTicketInReceptionQueue(ticket);

  const row = db
    .prepare(
      `SELECT COALESCE(MAX(priority), 0) as m FROM tickets
       WHERE current_room_id = ? AND status = 'waiting' AND created_at >= ?`
    )
    .get(ticket.current_room_id, todayStart());
  const nextPriority = (row?.m || 0) + 1;
  db.prepare('UPDATE tickets SET priority = ? WHERE id = ?').run(nextPriority, ticketId);
  logHistory(ticketId, ticket.current_room_id, ticket.current_room_id, 'priority');
  return getTicket(ticketId);
}

/** ביטול קידום — חזרה לעדיפות רגילה */
export function clearTicketPriority(ticketId) {
  const ticket = getTicket(ticketId);
  if (!ticket) throw new Error('תור לא נמצא');
  if (ticket.status !== 'waiting') throw new Error('ניתן לבטל קידום רק לממתינים');
  if (!ticket.priority) throw new Error('אין קידום פעיל לתור זה');
  assertTicketInReceptionQueue(ticket);

  db.prepare('UPDATE tickets SET priority = 0 WHERE id = ?').run(ticketId);
  logHistory(ticketId, ticket.current_room_id, ticket.current_room_id, 'priority_clear');
  return getTicket(ticketId);
}

/** קריאה למטופל ספציפי מעמדת חדר */
export function callTicketAtStation(ticketId, stationRoomId) {
  const active = getCurrentInRoom(stationRoomId);
  if (active) throw new Error('יש מטופל בחדר — סיים טיפול לפני קריאה');

  const ticket = getTicket(ticketId);
  if (!ticket) throw new Error('תור לא נמצא');
  if (ticket.status !== 'waiting') throw new Error('המטופל אינו ממתין בתור');

  const scopeIds = getQueueScopeRoomIds(stationRoomId);
  if (!scopeIds.includes(ticket.current_room_id)) {
    throw new Error('המטופל לא בתור של חדר זה');
  }

  return callTicketToServing(ticketId, stationRoomId, ticket.current_room_id, 'called');
}

/** קבלה: העברה לחדר רופא (ללא קידום — קידום רק בתור קבלה) */
export function forwardTicketToRoom(ticketId, toRoomId) {
  const ticket = getTicket(ticketId);
  if (!ticket) throw new Error('תור לא נמצא');
  if (ticket.status !== 'waiting') throw new Error('ניתן להעביר רק ממתינים');
  assertTicketInReceptionQueue(ticket);

  const target = getRoom(toRoomId);
  if (!target?.is_active) throw new Error('חדר היעד לא פעיל');

  moveTicket(ticketId, toRoomId);
  return getTicket(ticketId);
}

export function startServing(ticketId) {
  db.prepare(`UPDATE tickets SET status = 'serving' WHERE id = ?`).run(ticketId);
  logHistory(ticketId, null, null, 'serving');
  return getTicket(ticketId);
}

export function moveTicket(ticketId, toRoomId) {
  const ticket = getTicket(ticketId);
  const fromRoomId = ticket.current_room_id;
  db.prepare(`UPDATE tickets SET current_room_id = ?, status = 'waiting' WHERE id = ?`).run(
    toRoomId,
    ticketId
  );
  logHistory(ticketId, fromRoomId, toRoomId, 'moved');
  return getTicket(ticketId);
}

export function completeTicket(ticketId) {
  db.prepare(
    `UPDATE tickets SET status = 'completed', completed_at = datetime('now', 'localtime') WHERE id = ?`
  ).run(ticketId);
  logHistory(ticketId, null, null, 'completed');
  return getTicket(ticketId);
}

export function skipTicket(ticketId) {
  db.prepare(`UPDATE tickets SET status = 'waiting', called_at = NULL WHERE id = ?`).run(ticketId);
  logHistory(ticketId, null, null, 'skipped');
  return getTicket(ticketId);
}

export function recallTicket(ticketId, roomId) {
  const ticket = getTicket(ticketId);
  if (ticket?.status === 'serving' && ticket.current_room_id === roomId) {
    return ticket;
  }
  return callTicketToServing(ticketId, roomId, ticket?.current_room_id, 'recalled');
}

export function getDisplayState(roomId) {
  const room = getRoom(roomId);
  const current = getCurrentlyServing(roomId);
  const queue = getQueueForRoom(roomId, false);
  const settings = getSettings();
  return { room, current, queue, settings, timestamp: Date.now() };
}

export function getLobbyDisplay() {
  const rooms = getRooms(true);
  const serving = rooms.map((r) => ({
    room: r,
    current: getCurrentInRoom(r.id),
    /** כל הממתינים בתור המשותף (או בחדר בודד) — מוצג בכל כרטיסי הקבוצה */
    waiting: getWaitingQueueForScope(r.id),
  }));
  const waiting = getAllWaiting();
  const settings = getSettings();
  const ticker = (settings.ticker_messages || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  return { serving, waiting, ticker, settings, timestamp: Date.now() };
}

function logHistory(ticketId, fromRoomId, toRoomId, action) {
  db.prepare(
    'INSERT INTO ticket_history (ticket_id, from_room_id, to_room_id, action) VALUES (?, ?, ?, ?)'
  ).run(ticketId, fromRoomId, toRoomId, action);
}

export function getStats() {
  const start = todayStart();
  const total = db.prepare('SELECT COUNT(*) as c FROM tickets WHERE created_at >= ?').get(start).c;
  const waiting = db
    .prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'waiting' AND created_at >= ?")
    .get(start).c;
  const completed = db
    .prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'completed' AND created_at >= ?")
    .get(start).c;
  const serving = db
    .prepare("SELECT COUNT(*) as c FROM tickets WHERE status IN ('called','serving') AND created_at >= ?")
    .get(start).c;
  return { total, waiting, completed, serving };
}

export function getDashboard() {
  const rooms = getRooms(true);
  const stats = getStats();
  const waiting = getAllWaiting();
  const roomStats = rooms.map((r) => {
    const q = getWaitingQueueForScope(r.id);
    const cur = getCurrentInRoom(r.id);
    return {
      room: r,
      waiting: q.length,
      current: cur ? cur.display_code : null,
      partners: r.shared_group ? getSharedPartnerRooms(r.id).map((p) => p.name) : [],
    };
  });
  return { stats, roomStats, waiting, settings: getSettings() };
}

/** דוח ניהול — כניסות, המתנה, טיפול, פילוחים */
export function getAdminReport(filters = {}) {
  const { from, to, fromDate, toDate } = toDayBounds(filters.from, filters.to);
  const roomId = filters.room_id ? Number(filters.room_id) : null;
  const serviceId = filters.service_id ? Number(filters.service_id) : null;
  const status = filters.status?.trim() || null;

  let where = 't.created_at >= ? AND t.created_at <= ?';
  const params = [from, to];
  if (roomId) {
    where += ' AND t.current_room_id = ?';
    params.push(roomId);
  }
  if (serviceId) {
    where += ' AND t.service_id = ?';
    params.push(serviceId);
  }
  if (status) {
    where += ' AND t.status = ?';
    params.push(status);
  }

  const summaryRow = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN t.status = 'waiting' THEN 1 ELSE 0 END) as waiting,
         SUM(CASE WHEN t.status IN ('called','serving') THEN 1 ELSE 0 END) as in_progress,
         SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN t.called_at IS NOT NULL THEN 1 ELSE 0 END) as called_count,
         AVG(CASE WHEN t.called_at IS NOT NULL
           THEN (julianday(t.called_at) - julianday(t.created_at)) * 1440 END) as avg_wait_min,
         MAX(CASE WHEN t.called_at IS NOT NULL
           THEN (julianday(t.called_at) - julianday(t.created_at)) * 1440 END) as max_wait_min,
         MIN(CASE WHEN t.called_at IS NOT NULL
           THEN (julianday(t.called_at) - julianday(t.created_at)) * 1440 END) as min_wait_min,
         AVG(CASE WHEN t.completed_at IS NOT NULL AND t.called_at IS NOT NULL
           THEN (julianday(t.completed_at) - julianday(t.called_at)) * 1440 END) as avg_service_min,
         AVG(CASE WHEN t.completed_at IS NOT NULL
           THEN (julianday(t.completed_at) - julianday(t.created_at)) * 1440 END) as avg_total_min
       FROM tickets t
       WHERE ${where}`
    )
    .get(...params);

  const summary = {
    total: summaryRow.total || 0,
    waiting: summaryRow.waiting || 0,
    in_progress: summaryRow.in_progress || 0,
    completed: summaryRow.completed || 0,
    called_count: summaryRow.called_count || 0,
    avg_wait_min: summaryRow.avg_wait_min != null ? Math.round(summaryRow.avg_wait_min) : null,
    max_wait_min: summaryRow.max_wait_min != null ? Math.round(summaryRow.max_wait_min) : null,
    min_wait_min: summaryRow.min_wait_min != null ? Math.round(summaryRow.min_wait_min) : null,
    avg_service_min: summaryRow.avg_service_min != null ? Math.round(summaryRow.avg_service_min) : null,
    avg_total_min: summaryRow.avg_total_min != null ? Math.round(summaryRow.avg_total_min) : null,
  };

  const byRoom = db
    .prepare(
      `SELECT r.id as room_id, r.name as room_name, r.color as room_color,
         COUNT(*) as total,
         SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN t.status = 'waiting' THEN 1 ELSE 0 END) as waiting,
         AVG(CASE WHEN t.called_at IS NOT NULL
           THEN (julianday(t.called_at) - julianday(t.created_at)) * 1440 END) as avg_wait_min
       FROM tickets t
       LEFT JOIN rooms r ON t.current_room_id = r.id
       WHERE ${where}
       GROUP BY t.current_room_id
       ORDER BY total DESC`
    )
    .all(...params)
    .map((row) => ({
      ...row,
      room_name: row.room_name || 'ללא חדר',
      avg_wait_min: row.avg_wait_min != null ? Math.round(row.avg_wait_min) : null,
    }));

  const byService = db
    .prepare(
      `SELECT s.id as service_id, s.name as service_name, s.prefix,
         COUNT(*) as total,
         SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
         AVG(CASE WHEN t.called_at IS NOT NULL
           THEN (julianday(t.called_at) - julianday(t.created_at)) * 1440 END) as avg_wait_min
       FROM tickets t
       JOIN services s ON t.service_id = s.id
       WHERE ${where}
       GROUP BY t.service_id
       ORDER BY total DESC`
    )
    .all(...params)
    .map((row) => ({
      ...row,
      avg_wait_min: row.avg_wait_min != null ? Math.round(row.avg_wait_min) : null,
    }));

  const byHour = db
    .prepare(
      `SELECT strftime('%H', t.created_at) as hour, COUNT(*) as count
       FROM tickets t
       WHERE ${where}
       GROUP BY hour
       ORDER BY hour`
    )
    .all(...params);

  const byHealthFund = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(t.health_fund), ''), 'לא צוין') as health_fund,
         COUNT(*) as total,
         SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN t.status = 'waiting' THEN 1 ELSE 0 END) as waiting,
         AVG(CASE WHEN t.called_at IS NOT NULL
           THEN (julianday(t.called_at) - julianday(t.created_at)) * 1440 END) as avg_wait_min
       FROM tickets t
       WHERE ${where}
       GROUP BY health_fund
       ORDER BY total DESC`
    )
    .all(...params)
    .map((row) => ({
      ...row,
      avg_wait_min: row.avg_wait_min != null ? Math.round(row.avg_wait_min) : null,
    }));

  const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const tickets = db
    .prepare(
      `SELECT t.id, t.display_code, t.status, t.phone, t.id_number, t.health_fund,
         t.created_at, t.called_at, t.completed_at, t.priority,
         s.name as service_name, s.prefix,
         r.name as room_name, r.color as room_color
       FROM tickets t
       JOIN services s ON t.service_id = s.id
       LEFT JOIN rooms r ON t.current_room_id = r.id
       WHERE ${where}
       ORDER BY t.created_at DESC
       LIMIT 1000`
    )
    .all(...params)
    .map((t) => {
      const waitEnd = t.called_at || (t.status === 'waiting' ? nowIso : null);
      const wait_min = minutesBetween(t.created_at, waitEnd);
      const service_min = minutesBetween(t.called_at, t.completed_at);
      const total_min = minutesBetween(t.created_at, t.completed_at);
      return {
        ...t,
        wait_min,
        service_min,
        total_min,
        wait_min_live: t.status === 'waiting' && !t.called_at,
      };
    });

  const settings = getSettings();
  return {
    period: { from: fromDate, to: toDate },
    filters: { room_id: roomId, service_id: serviceId, status },
    summary,
    byRoom,
    byService,
    byHealthFund,
    byHour,
    health_funds: HEALTH_FUNDS,
    tickets,
    rooms: getRooms(false),
    services: getServices(false),
    clinic_name: settings.clinic_name || 'MedQueue',
  };
}

// ——— משתמשים ———

export function ensureDefaultAdmin(createHash) {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) return;
  db.prepare(
    `INSERT INTO users (username, password_hash, display_name, role, room_ids, must_change_password)
     VALUES (?, ?, ?, 'admin', NULL, 1)`
  ).run('admin', createHash('admin123'), 'מנהל מערכת');
}

export function getUser(id) {
  const u = db
    .prepare(
      'SELECT id, username, display_name, role, room_ids, is_active, created_at, must_change_password FROM users WHERE id = ?'
    )
    .get(id);
  if (!u) return null;
  return {
    ...u,
    room_ids: u.room_ids ? JSON.parse(u.room_ids) : null,
    must_change_password: Boolean(u.must_change_password),
  };
}

export function changeUserPassword(userId, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(
    passwordHash,
    userId
  );
  return getUser(userId);
}

export function insertActivityLog(row) {
  db.prepare(
    `INSERT INTO activity_log (user_id, username, action, ticket_id, display_code, room_id, room_name, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.user_id,
    row.username,
    row.action,
    row.ticket_id,
    row.display_code,
    row.room_id,
    row.room_name,
    row.details
  );
}

export function getActivityLogs({ limit = 100, from, to } = {}) {
  let where = '1=1';
  const params = [];
  if (from) {
    where += ' AND created_at >= ?';
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    where += ' AND created_at <= ?';
    params.push(`${to} 23:59:59`);
  }
  params.push(limit);
  return db
    .prepare(
      `SELECT * FROM activity_log WHERE ${where} ORDER BY created_at DESC LIMIT ?`
    )
    .all(...params);
}

export function getLastCalledAtToday() {
  const row = db
    .prepare(
      `SELECT MAX(called_at) as last_called FROM tickets
       WHERE called_at IS NOT NULL AND created_at >= ?`
    )
    .get(todayStart());
  return row?.last_called || null;
}

export function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
}

export function getUsers() {
  return db
    .prepare('SELECT id, username, display_name, role, room_ids, is_active, created_at FROM users ORDER BY id')
    .all()
    .map((u) => ({ ...u, room_ids: u.room_ids ? JSON.parse(u.room_ids) : null }));
}

export function createUser({ username, password_hash, display_name, role, room_ids }) {
  const row = db
    .prepare(
      `INSERT INTO users (username, password_hash, display_name, role, room_ids)
       VALUES (?, ?, ?, ?, ?) RETURNING id`
    )
    .get(
      username,
      password_hash,
      display_name || username,
      role || 'staff',
      room_ids?.length ? JSON.stringify(room_ids) : null
    );
  return getUser(row.id);
}

export function updateUser(id, data) {
  const fields = [];
  const values = [];
  if (data.display_name !== undefined) {
    fields.push('display_name = ?');
    values.push(data.display_name);
  }
  if (data.role !== undefined) {
    fields.push('role = ?');
    values.push(data.role);
  }
  if (data.room_ids !== undefined) {
    fields.push('room_ids = ?');
    values.push(data.room_ids?.length ? JSON.stringify(data.room_ids) : null);
  }
  if (data.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(data.is_active ? 1 : 0);
  }
  if (data.password_hash !== undefined) {
    fields.push('password_hash = ?');
    values.push(data.password_hash);
  }
  if (data.must_change_password !== undefined) {
    fields.push('must_change_password = ?');
    values.push(data.must_change_password ? 1 : 0);
  }
  if (fields.length) {
    values.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return getUser(id);
}

export function updateService(id, data) {
  const fields = [];
  const values = [];
  for (const key of ['name', 'prefix', 'room_id', 'is_active']) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }
  if (fields.length) {
    values.push(id);
    db.prepare(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return db.prepare('SELECT * FROM services WHERE id = ?').get(id);
}

export default db;
