/** פירוק הודעת טיקר: שורות (\n) ומודגש (**טקסט**) */

export function parseTickerBoldParts(line) {
  const text = String(line ?? '');
  const parts = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match = re.exec(text);
  while (match) {
    if (match.index > last) {
      parts.push({ bold: false, text: text.slice(last, match.index) });
    }
    parts.push({ bold: true, text: match[1] });
    last = match.index + match[0].length;
    match = re.exec(text);
  }
  if (last < text.length) {
    parts.push({ bold: false, text: text.slice(last) });
  }
  if (!parts.length && text) {
    parts.push({ bold: false, text });
  }
  return parts;
}

export function parseTickerMessageLines(message) {
  return String(message ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** שורה אחת לפס גלילה — שורות מרובות מחוברות במפריד */
export function flattenTickerMessage(message, separator = ' · ') {
  return parseTickerMessageLines(message).join(separator);
}

/** מפריד הודעות בהגדרות (|) */
export function splitTickerMessages(raw) {
  if (!raw?.trim()) return [];
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}
