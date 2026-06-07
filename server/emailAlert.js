import nodemailer from 'nodemailer';
import * as db from './db.js';

const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

function buildTransport(settings) {
  const user = settings.gmail_smtp_user?.trim();
  const pass = settings.gmail_smtp_app_password?.trim();
  if (!user || !pass) throw new Error('חסר Gmail או סיסמת אפליקציה בהגדרות');

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });
}

export async function sendTestEmail(settings) {
  const to = settings.gmail_alert_to?.trim() || settings.gmail_smtp_user?.trim();
  if (!to) throw new Error('חסר מייל לקבלת התראות');

  const clinic = settings.clinic_name || 'MedQueue';
  const transport = buildTransport(settings);
  await transport.sendMail({
    from: `"${clinic}" <${settings.gmail_smtp_user.trim()}>`,
    to,
    subject: `${clinic} — בדיקת מייל MedQueue`,
    text: `שלום,\nזוהי הודעת בדיקה ממערכת התורים ${clinic}.\nאם קיבלת מייל זה — ההגדרות תקינות.\n\n${new Date().toLocaleString('he-IL')}`,
  });
  return { ok: true, to };
}

export async function sendWhatsAppDisconnectAlert(settings, reason = '') {
  if (settings.whatsapp_alert_email_enabled !== '1') return null;

  const lastAt = settings.whatsapp_last_alert_at;
  if (lastAt) {
    const elapsed = Date.now() - new Date(lastAt).getTime();
    if (!Number.isNaN(elapsed) && elapsed < ALERT_COOLDOWN_MS) return null;
  }

  const to = settings.gmail_alert_to?.trim() || settings.gmail_smtp_user?.trim();
  if (!to) return null;

  const clinic = settings.clinic_name || 'MedQueue';
  const base = (process.env.RENDER_EXTERNAL_URL || process.env.MEDQUEUE_URL || '').replace(/\/$/, '');
  const manageUrl = base ? `${base}/manage/settings` : '/manage/settings';

  const transport = buildTransport(settings);
  await transport.sendMail({
    from: `"${clinic}" <${settings.gmail_smtp_user.trim()}>`,
    to,
    subject: `${clinic} — וואטסאפ מנותק (MedQueue)`,
    text: [
      'שלום,',
      '',
      'שירות הוואטסאפ במערכת התורים מנותק.',
      'מטופלים לא מקבלים הודעות בקיוסק / בקריאה לחדר.',
      '',
      reason ? `סיבה: ${reason}` : '',
      '',
      `התחבר מחדש (סרוק QR): ${manageUrl}`,
      '',
      `זמן: ${new Date().toLocaleString('he-IL')}`,
    ]
      .filter(Boolean)
      .join('\n'),
  });

  const now = new Date().toISOString();
  db.setSetting('whatsapp_last_alert_at', now);
  return { ok: true, to, at: now };
}
