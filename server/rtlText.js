import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

/** טקסט עברי ל-PDFKit — סדר מילים נכון (BiDi) */
export function visualRtl(text) {
  if (text == null || text === '') return '';
  const s = String(text);
  const hasHebrew = /[\u0590-\u05FF]/.test(s);
  if (!hasHebrew) return s;
  const levels = bidi.getEmbeddingLevels(s, 1);
  return bidi.getReorderedString(s, levels);
}

/** מספרים / קוד תור — כיוון LTR בתוך קבלה עברית */
export function visualLtr(text) {
  if (text == null || text === '') return '';
  return `\u200E${String(text)}\u200E`;
}
