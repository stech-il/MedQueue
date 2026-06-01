import { mkdirSync, unlinkSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { UPLOAD_DIR } from './paths.js';

export const DISPLAY_MEDIA_DIR = join(UPLOAD_DIR, 'display');

const IMAGE_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

const VIDEO_MIME = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 40 * 1024 * 1024;

mkdirSync(DISPLAY_MEDIA_DIR, { recursive: true });

function parseDataUrl(dataUrl) {
  const raw = String(dataUrl || '').trim();
  const match = raw.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error('פורמט קובץ לא תקין');
  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  return { mime, buffer };
}

function publicUrl(filename) {
  return `/uploads/display/${filename}?v=${Date.now()}`;
}

export function saveDisplayImage(dataUrl) {
  const { mime, buffer } = parseDataUrl(dataUrl);
  const ext = IMAGE_MIME[mime];
  if (!ext) throw new Error('תמונה: PNG, JPG או WebP בלבד');
  if (buffer.length > MAX_IMAGE) throw new Error('תמונה גדולה מדי (מקסימום 5MB)');

  const filename = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  writeFileSync(join(DISPLAY_MEDIA_DIR, filename), buffer);
  return publicUrl(filename);
}

export function saveDisplaySlide(dataUrl) {
  return saveDisplayImage(dataUrl);
}

export function saveDisplayVideo(dataUrl) {
  const { mime, buffer } = parseDataUrl(dataUrl);
  const ext = VIDEO_MIME[mime];
  if (!ext) throw new Error('סרטון: MP4 או WebM בלבד');
  if (buffer.length > MAX_VIDEO) throw new Error('סרטון גדול מדי (מקסימום 40MB)');

  const filename = `video-${Date.now()}.${ext}`;
  writeFileSync(join(DISPLAY_MEDIA_DIR, filename), buffer);
  return publicUrl(filename);
}

export function deleteDisplayMediaFile(publicPath) {
  const name = basename(String(publicPath || '').split('?')[0]);
  if (!name || name.includes('..')) return;
  const file = join(DISPLAY_MEDIA_DIR, name);
  if (existsSync(file)) unlinkSync(file);
}

export function parseSlidesJson(raw) {
  if (!raw?.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((u) => typeof u === 'string' && u.trim()) : [];
  } catch {
    return [];
  }
}

export function isExternalVideoUrl(url) {
  const u = String(url || '').trim();
  return /^https?:\/\//i.test(u);
}
