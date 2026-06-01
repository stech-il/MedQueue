/** הגדרות אזור מרכזי במסך תצוגה */

export function parseDisplaySlides(raw) {
  if (!raw?.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((u) => typeof u === 'string' && u.trim()) : [];
  } catch {
    return [];
  }
}

export function getDisplayCenterMode(settings) {
  const m = settings?.display_center_mode || 'default';
  if (['default', 'slideshow', 'image', 'video'].includes(m)) return m;
  return 'default';
}

export function getSlideIntervalSeconds(settings) {
  const n = Number(settings?.display_center_slide_seconds);
  if (!Number.isFinite(n) || n < 3) return 8;
  return Math.min(120, Math.max(3, n));
}

export function isVideoUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim());
}
