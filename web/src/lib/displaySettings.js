/** משך הצגת הודעות במסך תצוגה (שניות) */
export function parseDisplaySeconds(value, fallback = 12) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(120, Math.max(3, Math.round(n)));
}
