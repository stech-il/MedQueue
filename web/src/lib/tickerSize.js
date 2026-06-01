/** גדלי פס הודעות רצות — מוגדרים בניהול */

export const TICKER_SIZE_OPTIONS = [
  { value: 'sm', label: 'קטן', fontPx: 14, barPx: 40, bulletPx: 10 },
  { value: 'md', label: 'בינוני', fontPx: 18, barPx: 52, bulletPx: 12 },
  { value: 'lg', label: 'גדול', fontPx: 22, barPx: 64, bulletPx: 14 },
  { value: 'xl', label: 'גדול מאוד', fontPx: 28, barPx: 80, bulletPx: 16 },
];

const PRESET_MAP = Object.fromEntries(TICKER_SIZE_OPTIONS.map((o) => [o.value, o]));

export function resolveTickerSize(sizeKey) {
  return PRESET_MAP[sizeKey] || PRESET_MAP.md;
}

export function getTickerBarStyle(sizeKey) {
  const { fontPx, barPx, bulletPx } = resolveTickerSize(sizeKey);
  return {
    '--ticker-font-size': `${fontPx}px`,
    '--ticker-bar-height': `${barPx}px`,
    '--ticker-bullet-size': `${bulletPx}px`,
  };
}
