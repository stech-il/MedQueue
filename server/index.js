import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import * as db from './db.js';
import * as ttsService from './tts.js';
import { hashPassword, verifyPassword, signToken } from './auth.js';
import { attachUser, requireAuth, requireAdmin } from './middleware.js';
import { saveClinicLogoFromDataUrl, removeUploadedLogo } from './logo.js';
import { ensureDataDirs, UPLOAD_DIR } from './paths.js';
import {
  doctorSummonPayload,
  playServerDoctorSummon,
  playServerTicketCall,
  ticketCalledPayload,
} from './broadcastAnnounce.js';
import { logStaffActivity } from './activityLog.js';
import * as backupService from './backup.js';
import { getSystemStatus } from './systemStatus.js';
import { testExternalPatientConnection } from './rapidOnePatientUpdate.js';
import { dispatchKioskPrint } from './kioskPrintDispatch.js';
import { maskSettings, shouldSkipSecretUpdate } from './settingsMask.js';
import * as emailAlert from './emailAlert.js';
import * as whatsappService from './whatsappService.js';
import {
  saveDisplaySlide,
  saveDisplayImage,
  saveDisplayVideo,
  deleteDisplayMediaFile,
  parseSlidesJson,
  isExternalVideoUrl,
} from './displayMedia.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IS_PROD = process.env.NODE_ENV === 'production';
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use(attachUser);

ensureDataDirs();
db.ensureDefaultAdmin(hashPassword);

const PORT = process.env.PORT || 3001;

function broadcast(event, data) {
  io.emit(event, data);
  io.emit('state:refresh', { timestamp: Date.now() });
}

function stationActor(req, room) {
  return req.user || { id: null, username: room ? `עמדה: ${room.name}` : 'עמדה' };
}

function emitTicketCalled(ticket, room, actor = null) {
  const settings = db.getSettings();
  const payload = ticketCalledPayload(ticket, room, settings);
  io.emit('ticket:called', payload);
  io.emit('state:refresh', { timestamp: Date.now() });
  playServerTicketCall(ticket, room, settings);
  void whatsappService.sendCallWhatsApp(ticket, room, settings);
  logStaffActivity({
    user: actor || { username: 'מערכת' },
    action: 'call',
    ticket,
    room,
  });
}

function emitDoctorSummon(room, actor = null) {
  const settings = db.getSettings();
  const payload = doctorSummonPayload(room, settings);
  io.emit('doctor:summon', payload);
  playServerDoctorSummon(room, settings);
  logStaffActivity({
    user: actor || { username: 'מערכת' },
    action: 'summon_doctor',
    room,
    details: room?.name,
  });
}

function userPayload(user) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    must_change_password: Boolean(user.must_change_password),
  };
}

// ——— ציבורי ———
app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'medqueue', time: Date.now() });
});

app.get('/api/settings', (_, res) => res.json(maskSettings(db.getSettings())));

app.get('/api/tts/voices', async (_, res) => {
  try {
    res.json({ edge: await ttsService.listHebrewEdgeVoices() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tts/speak', async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'אין טקסט' });
  const settings = db.getSettings();
  if ((settings.tts_provider || 'edge') !== 'edge') {
    return res.status(400).json({ error: 'מנוע TTS מקצועי לא מופעל בהגדרות' });
  }
  try {
    const audio = await ttsService.synthesizeEdge(text, settings);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-store');
    res.send(audio);
  } catch (e) {
    console.error('TTS error:', e);
    res.status(500).json({ error: e.message || 'שגיאה בהקראה' });
  }
});

app.get('/api/rooms', (_, res) => res.json(db.getRooms(true)));

app.get('/api/display/lobby', (_, res) => res.json(db.getLobbyDisplay()));

app.get('/api/rooms/:id/display', (req, res) => {
  res.json(db.getDisplayState(Number(req.params.id)));
});

app.get('/api/kiosk/config', (_, res) => {
  try {
    const reception = db.getReceptionRoom();
    const service = db.getKioskService();
    res.json({
      health_funds: db.HEALTH_FUNDS,
      reception_room: reception,
      service,
      settings: db.getSettings(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/kiosk/ticket', async (req, res) => {
  try {
    const ticket = db.createKioskTicket(req.body);
    broadcast('ticket:created', ticket);
    const settings = db.getSettings();
    const reception = db.getReceptionRoom();
    const printResult = await dispatchKioskPrint(io, ticket, settings, reception);
    void whatsappService.sendKioskWhatsApp(ticket, settings);
    res.status(201).json({ ...ticket, ...printResult });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ——— עמדות חדר (ללא התחברות) ———
app.get('/api/rooms/:id/station', (req, res) => {
  res.json(db.getRoomStation(Number(req.params.id)));
});

app.get('/api/rooms/:id/queue', (req, res) => {
  res.json(db.getQueueForRoom(Number(req.params.id)));
});

app.post('/api/rooms/:id/call-next', (req, res) => {
  try {
    const roomId = Number(req.params.id);
    const ticket = db.callNext(roomId);
    if (!ticket) return res.status(404).json({ error: 'אין ממתינים בתור' });
    const room = db.getRoom(roomId);
    emitTicketCalled(ticket, room, stationActor(req, room));
    res.json(ticketCalledPayload(ticket, room, db.getSettings()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/rooms/:roomId/call-ticket/:ticketId', (req, res) => {
  try {
    const stationRoomId = Number(req.params.roomId);
    const ticketId = Number(req.params.ticketId);
    const ticket = db.callTicketAtStation(ticketId, stationRoomId);
    const room = db.getRoom(stationRoomId);
    emitTicketCalled(ticket, room, stationActor(req, room));
    res.json(ticketCalledPayload(ticket, room, db.getSettings()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/rooms/:id/summon-doctor', (req, res) => {
  try {
    const targetRoomId = Number(req.body?.target_room_id);
    if (!targetRoomId) return res.status(400).json({ error: 'יש לבחור חדר יעד' });
    const room = db.getRoom(targetRoomId);
    if (!room?.is_active) return res.status(404).json({ error: 'חדר לא נמצא' });
    const settings = db.getSettings();
    const station = db.getRoom(Number(req.params.id));
    emitDoctorSummon(room, stationActor(req, station));
    res.json({ ...doctorSummonPayload(room, settings), summon: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/tickets/:id/bump-priority', (req, res) => {
  try {
    const ticket = db.bumpTicketPriority(Number(req.params.id));
    broadcast('ticket:updated', ticket);
    res.json(ticket);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/tickets/:id/clear-priority', (req, res) => {
  try {
    const ticket = db.clearTicketPriority(Number(req.params.id));
    broadcast('ticket:updated', ticket);
    res.json(ticket);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/tickets/:id/forward', (req, res) => {
  try {
    const toRoomId = Number(req.body?.room_id);
    if (!toRoomId) return res.status(400).json({ error: 'יש לבחור חדר יעד' });
    const ticket = db.forwardTicketToRoom(Number(req.params.id), toRoomId);
    broadcast('ticket:moved', ticket);
    res.json(ticket);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

function requireTicket(req, res, ticket) {
  if (!ticket) {
    res.status(404).json({ error: 'תור לא נמצא' });
    return false;
  }
  return true;
}

app.post('/api/tickets/:id/call', (req, res) => {
  const roomId = Number(req.body.room_id);
  const ticket = db.callTicket(Number(req.params.id), roomId);
  const room = db.getRoom(roomId);
  emitTicketCalled(ticket, room, req.user);
  res.json(ticket);
});

app.post('/api/tickets/:id/serve', (req, res) => {
  const t = db.getTicket(Number(req.params.id));
  if (!requireTicket(req, res, t)) return;
  const ticket = db.startServing(t.id);
  broadcast('ticket:updated', ticket);
  res.json(ticket);
});

app.post('/api/tickets/:id/move', (req, res) => {
  const t = db.getTicket(Number(req.params.id));
  if (!requireTicket(req, res, t)) return;
  const ticket = db.moveTicket(t.id, Number(req.body.room_id));
  broadcast('ticket:moved', ticket);
  res.json(ticket);
});

app.post('/api/tickets/:id/complete', (req, res) => {
  const t = db.getTicket(Number(req.params.id));
  if (!requireTicket(req, res, t)) return;
  const ticket = db.completeTicket(t.id);
  const room = db.getRoom(ticket.current_room_id);
  logStaffActivity({
    user: req.user || stationActor(req, room),
    action: 'complete',
    ticket,
    room,
  });
  broadcast('ticket:completed', ticket);
  res.json(ticket);
});

app.post('/api/tickets/:id/skip', (req, res) => {
  const t = db.getTicket(Number(req.params.id));
  if (!requireTicket(req, res, t)) return;
  const ticket = db.skipTicket(t.id);
  broadcast('ticket:updated', ticket);
  res.json(ticket);
});

app.post('/api/tickets/:id/recall', (req, res) => {
  const roomId = Number(req.body.room_id);
  const ticket = db.recallTicket(Number(req.params.id), roomId);
  const room = db.getRoom(roomId);
  emitTicketCalled(ticket, room, req.user);
  res.json(ticket);
});

app.post('/api/tickets/:id/receive', (req, res) => {
  const t = db.getTicket(Number(req.params.id));
  if (!requireTicket(req, res, t)) return;
  const ticket = db.receivePatient(t.id);
  const room = db.getRoom(ticket.current_room_id);
  emitTicketCalled(ticket, room, req.user);
  res.json({ ...ticketCalledPayload(ticket, room, db.getSettings()) });
});

app.post('/api/tickets/:id/announce', (req, res) => {
  const ticket = db.getTicket(Number(req.params.id));
  if (!requireTicket(req, res, ticket)) return;
  const room = db.getRoom(ticket.current_room_id);
  emitTicketCalled(ticket, room, req.user);
  res.json({ ...ticketCalledPayload(ticket, room, db.getSettings()) });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'שם משתמש וסיסמה נדרשים' });
  }
  const row = db.getUserByUsername(String(username).trim());
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
  }
  const user = db.getUser(row.id);
  const token = signToken(user);
  res.json({ token, user: userPayload(user) });
});

// ——— מחובר ———
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.getUser(req.user.id);
  res.json({ user: userPayload(user) });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'סיסמה נוכחית וחדשה נדרשות' });
  }
  if (String(new_password).length < 6) {
    return res.status(400).json({ error: 'סיסמה חדשה — לפחות 6 תווים' });
  }
  const row = db.getUserByUsername(req.user.username);
  if (!row || !verifyPassword(current_password, row.password_hash)) {
    return res.status(400).json({ error: 'סיסמה נוכחית שגויה' });
  }
  const user = db.changeUserPassword(req.user.id, hashPassword(new_password));
  res.json({ user: userPayload(user) });
});

// ——— מנהל (התחברות חובה) ———
app.get('/api/admin/dashboard', requireAuth, requireAdmin, (_, res) => {
  res.json(db.getDashboard());
});

app.get('/api/admin/reports', requireAuth, requireAdmin, (req, res) => {
  try {
    res.json(
      db.getAdminReport({
        from: req.query.from,
        to: req.query.to,
        room_id: req.query.room_id,
        service_id: req.query.service_id,
        status: req.query.status,
      })
    );
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/admin/activity', requireAuth, requireAdmin, (req, res) => {
  res.json(
    db.getActivityLogs({
      from: req.query.from,
      to: req.query.to,
      limit: Math.min(Number(req.query.limit) || 150, 500),
    })
  );
});

app.get('/api/admin/system-status', requireAuth, requireAdmin, async (_, res) => {
  try {
    res.json(await getSystemStatus(db));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// בדיקת חיבור ל-API החיצוני (best-effort / לא תלוי בקיוסק)
app.get('/api/admin/whatsapp/status', requireAuth, requireAdmin, (_, res) => {
  res.json(whatsappService.getWhatsAppStatus());
});

app.post('/api/admin/whatsapp/connect', requireAuth, requireAdmin, async (_, res) => {
  try {
    db.setSetting('whatsapp_enabled', '1');
    const status = await whatsappService.startWhatsApp();
    res.json(status);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/admin/whatsapp/disconnect', requireAuth, requireAdmin, async (_, res) => {
  try {
    const status = await whatsappService.logoutWhatsApp();
    res.json(status);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/admin/whatsapp/test-send', requireAuth, requireAdmin, async (req, res) => {
  try {
    const phone = String(req.body?.phone || '').trim();
    if (!phone) return res.status(400).json({ error: 'חסר מספר טלפון' });

    const normalized = db.validateMobilePhone(phone);
    const settings = db.getSettings();
    const clinic = settings.clinic_name || 'המרפאה';
    const text = `בדיקת ${clinic} — אם קיבלת הודעה זו, שליחת וואטסאפ תקינה.`;

    const result = await whatsappService.sendWhatsAppText(normalized, text);
    if (result.ok) return res.json({ success: true, ...result });
    if (result.skipped) {
      return res.status(400).json({ success: false, error: `דולג (${result.reason})` });
    }
    return res.status(400).json({ success: false, error: result.error || 'שגיאת שליחה' });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.post('/api/admin/email/test', requireAuth, requireAdmin, async (_, res) => {
  try {
    const result = await emailAlert.sendTestEmail(db.getSettings());
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.post('/api/admin/external-patient/test', requireAuth, requireAdmin, async (_, res) => {
  try {
    const result = await testExternalPatientConnection();

    db.setSetting('external_patient_update_last_test_ok', '1');
    db.setSetting('external_patient_update_last_test_at', new Date().toISOString());
    db.setSetting('external_patient_update_last_test_error', '');

    res.json({ success: true, result });
  } catch (e) {
    db.setSetting('external_patient_update_last_test_ok', '0');
    db.setSetting('external_patient_update_last_test_at', new Date().toISOString());
    db.setSetting('external_patient_update_last_test_error', String(e?.message || e).slice(0, 700));
    res.status(400).json({ success: false, error: e?.message || 'שגיאה בבדיקת חיבור' });
  }
});

app.get('/api/admin/backups', requireAuth, requireAdmin, async (_, res) => {
  try {
    res.json({ backups: await backupService.listBackups() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/backup', requireAuth, requireAdmin, async (_, res) => {
  try {
    const result = await backupService.createBackup();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings', requireAuth, requireAdmin, async (req, res) => {
  const wasWhatsAppEnabled = db.getSettings().whatsapp_enabled === '1';
  for (const [key, value] of Object.entries(req.body)) {
    if (shouldSkipSecretUpdate(key, value)) continue;
    db.setSetting(key, String(value));
  }
  const settings = db.getSettings();
  const nowEnabled = settings.whatsapp_enabled === '1';
  if (nowEnabled && !wasWhatsAppEnabled) {
    try {
      await whatsappService.startWhatsApp();
    } catch (e) {
      console.warn('WhatsApp start after settings:', e.message);
    }
  } else if (!nowEnabled && wasWhatsAppEnabled) {
    await whatsappService.stopWhatsApp();
  }
  broadcast('settings:updated', maskSettings(settings));
  res.json(maskSettings(settings));
});

app.post('/api/settings/logo', requireAuth, requireAdmin, (req, res) => {
  try {
    const url = saveClinicLogoFromDataUrl(req.body?.image);
    db.setSetting('clinic_logo', url);
    const settings = db.getSettings();
    broadcast('settings:updated', maskSettings(settings));
    res.json({ clinic_logo: url, settings: maskSettings(settings) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/settings/logo', requireAuth, requireAdmin, (req, res) => {
  removeUploadedLogo();
  db.setSetting('clinic_logo', '/logo.svg');
  const settings = db.getSettings();
  broadcast('settings:updated', maskSettings(settings));
  res.json({ clinic_logo: '/logo.svg', settings: maskSettings(settings) });
});

app.post('/api/settings/display-slide', requireAuth, requireAdmin, (req, res) => {
  try {
    const url = saveDisplaySlide(req.body?.image);
    const settings = db.getSettings();
    const slides = parseSlidesJson(settings.display_center_slides);
    slides.push(url);
    db.setSetting('display_center_slides', JSON.stringify(slides));
    const updated = db.getSettings();
    broadcast('settings:updated', maskSettings(updated));
    res.json({ url, slides, settings: maskSettings(updated) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/settings/display-slide', requireAuth, requireAdmin, (req, res) => {
  try {
    const { url } = req.body || {};
    const settings = db.getSettings();
    const slides = parseSlidesJson(settings.display_center_slides).filter((u) => u !== url);
    deleteDisplayMediaFile(url);
    db.setSetting('display_center_slides', JSON.stringify(slides));
    const updated = db.getSettings();
    broadcast('settings:updated', maskSettings(updated));
    res.json({ slides, settings: maskSettings(updated) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/settings/display-image', requireAuth, requireAdmin, (req, res) => {
  try {
    const url = saveDisplayImage(req.body?.image);
    const settings = db.getSettings();
    const prev = settings.display_center_image;
    if (prev && !isExternalVideoUrl(prev)) deleteDisplayMediaFile(prev);
    db.setSetting('display_center_image', url);
    const updated = db.getSettings();
    broadcast('settings:updated', maskSettings(updated));
    res.json({ url, settings: maskSettings(updated) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/settings/display-video', requireAuth, requireAdmin, (req, res) => {
  try {
    const { image, external_url } = req.body || {};
    const settings = db.getSettings();
    const prev = settings.display_center_video;
    if (prev && !isExternalVideoUrl(prev)) deleteDisplayMediaFile(prev);

    let url;
    if (external_url?.trim()) {
      const ext = external_url.trim();
      if (!/^https?:\/\//i.test(ext)) throw new Error('כתובת סרטון חייבת להתחיל ב-http');
      url = ext;
    } else if (image) {
      url = saveDisplayVideo(image);
    } else {
      throw new Error('העלה קובץ או הזן כתובת URL');
    }

    db.setSetting('display_center_video', url);
    const updated = db.getSettings();
    broadcast('settings:updated', maskSettings(updated));
    res.json({ url, settings: maskSettings(updated) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/settings/display-media', requireAuth, requireAdmin, (req, res) => {
  try {
    const { field } = req.body || {};
    const settings = db.getSettings();
    if (field === 'image') {
      const prev = settings.display_center_image;
      if (prev && !isExternalVideoUrl(prev)) deleteDisplayMediaFile(prev);
      db.setSetting('display_center_image', '');
    } else if (field === 'video') {
      const prev = settings.display_center_video;
      if (prev && !isExternalVideoUrl(prev)) deleteDisplayMediaFile(prev);
      db.setSetting('display_center_video', '');
    }
    const updated = db.getSettings();
    broadcast('settings:updated', maskSettings(updated));
    res.json({ settings: maskSettings(updated) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/rooms/all', requireAuth, requireAdmin, (_, res) => {
  res.json(db.getRooms(false));
});

app.post('/api/rooms', requireAuth, requireAdmin, (req, res) => {
  const room = db.createRoom(req.body);
  broadcast('rooms:updated', db.getRooms());
  res.status(201).json(room);
});

app.patch('/api/rooms/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { linked_room_ids, shared_group, ...rest } = req.body;

    const patch = { ...rest };
    if (shared_group !== undefined) {
      patch.shared_group = shared_group?.trim() || null;
    }
    if (Object.keys(patch).length > 0) {
      db.updateRoom(id, patch);
    }

    if (linked_room_ids !== undefined) {
      const current = db.getRoom(id);
      db.setRoomSharedLinks(
        id,
        shared_group !== undefined ? shared_group : current?.shared_group ?? '',
        linked_room_ids
      );
    }

    const room = db.getRoom(id);
    broadcast('rooms:updated', db.getRooms());
    res.json(room);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/rooms/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    db.deleteRoom(Number(req.params.id));
    broadcast('rooms:updated', db.getRooms());
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/rooms/shared-groups', requireAuth, requireAdmin, (_, res) => {
  res.json(db.getDistinctSharedGroups());
});

app.get('/api/services', requireAuth, requireAdmin, (_, res) => {
  res.json(db.getServices(false));
});

app.post('/api/services', requireAuth, requireAdmin, (req, res) => {
  const service = db.createService(req.body);
  broadcast('services:updated', db.getServices());
  res.status(201).json(service);
});

app.patch('/api/services/:id', requireAuth, requireAdmin, (req, res) => {
  const service = db.updateService(Number(req.params.id), req.body);
  broadcast('services:updated', db.getServices());
  res.json(service);
});

app.get('/api/tickets', requireAuth, requireAdmin, (_, res) => {
  res.json(db.getActiveTickets());
});

app.get('/api/stats', requireAuth, requireAdmin, (_, res) => {
  res.json(db.getStats());
});

app.get('/api/users', requireAuth, requireAdmin, (_, res) => {
  res.json(db.getUsers());
});

app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const { username, password, display_name, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'שם משתמש וסיסמה נדרשים' });
    if (db.getUserByUsername(username)) return res.status(400).json({ error: 'שם משתמש כבר קיים' });
    const user = db.createUser({
      username: String(username).trim(),
      password_hash: hashPassword(password),
      display_name,
      role: role || 'staff',
      room_ids: null,
    });
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const data = { ...req.body };
  delete data.room_ids;
  if (data.password) {
    data.password_hash = hashPassword(data.password);
    delete data.password;
  }
  const user = db.updateUser(id, data);
  res.json(user);
});

// ——— סטטי ———
app.use('/uploads', express.static(UPLOAD_DIR));

const webDist = join(__dirname, '..', 'web', 'dist');
const webIndex = join(webDist, 'index.html');
const hasWebBuild = existsSync(webIndex);
const VITE_DEV = process.env.VITE_DEV_URL || 'http://localhost:5173';

if (hasWebBuild) {
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(webIndex, (err) => {
      if (err) next();
    });
  });
} else {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.redirect(302, `${VITE_DEV}${req.path}`);
  });
}

io.on('connection', (socket) => {
  socket.on('subscribe:room', (roomId) => {
    socket.join(`room:${roomId}`);
    socket.emit('display:state', db.getDisplayState(roomId));
  });
  socket.on('subscribe:lobby', () => {
    socket.join('lobby');
    socket.emit('lobby:state', db.getLobbyDisplay());
  });
  socket.on('subscribe:kiosk-print', () => {
    socket.join('kiosk-print');
  });
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ פורט ${PORT} תפוס — הרץ: npm run kill-ports\n`);
    process.exit(1);
  }
  throw err;
});

httpServer.listen(PORT, async () => {
  const base = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  console.log(`🏥 MedQueue → ${base}`);
  if (!IS_PROD) console.log(`   API: ${base}/api`);
  if (hasWebBuild) {
    console.log(`   ניהול:   ${base}/manage`);
  } else {
    console.log(`   ניהול:   ${VITE_DEV}/manage`);
    console.log(`   קיוסק:   ${VITE_DEV}/kiosk`);
    console.log(`   מסך:     ${VITE_DEV}/display`);
  }
  try {
    const backup = await backupService.maybeAutoBackup(db.getSettings());
    if (backup) console.log(`   גיבוי יומי: ${backup.filename}`);
  } catch (e) {
    console.warn('גיבוי אוטומטי:', e.message);
  }
  whatsappService.installWhatsAppCrashGuard();
  whatsappService.bootstrapWhatsApp().catch((e) => console.warn('WhatsApp:', e.message));
});
