import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { UPLOAD_DIR } from './paths.js';

export { UPLOAD_DIR };

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']);
const EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};
const MAX_BYTES = 2 * 1024 * 1024;

function clearOldLogos() {
  mkdirSync(UPLOAD_DIR, { recursive: true });
  for (const name of readdirSync(UPLOAD_DIR)) {
    if (name.startsWith('clinic-logo.')) {
      unlinkSync(join(UPLOAD_DIR, name));
    }
  }
}

/** שומר לוגו מ-data URL (מ-FileReader) ומחזיר נתיב ציבורי */
export function saveClinicLogoFromDataUrl(dataUrl) {
  const raw = String(dataUrl || '').trim();
  const match = raw.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error('פורמט תמונה לא תקין');

  const mime = match[1].toLowerCase();
  if (!ALLOWED.has(mime)) {
    throw new Error('סוג קובץ לא נתמך. השתמש ב-PNG, JPG, WebP או SVG');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_BYTES) {
    throw new Error('הקובץ גדול מדי (מקסימום 2MB)');
  }

  clearOldLogos();
  const filename = `clinic-logo.${EXT[mime]}`;
  writeFileSync(join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}?v=${Date.now()}`;
}

export function removeUploadedLogo() {
  try {
    clearOldLogos();
  } catch {
    /* תיקייה ריקה */
  }
}
