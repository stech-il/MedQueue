/** זמן המתנה מתאריך SQLite מקומי (YYYY-MM-DD HH:MM:SS) */
export function waitMinutesSince(createdAt) {
  if (!createdAt) return null;
  const start = new Date(String(createdAt).replace(' ', 'T'));
  if (Number.isNaN(start.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000));
}

export function formatWaitMinutes(createdAt) {
  const m = waitMinutesSince(createdAt);
  if (m == null) return '—';
  if (m < 1) return 'פחות מדקה';
  if (m < 60) return `${m} דק׳`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} ש׳ ${r} דק׳` : `${h} ש׳`;
}
