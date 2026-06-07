/** הגדרות ציבוריות — מסתיר סיסמאות ומפתחות */

const SECRET_KEYS = new Set([
  'gmail_smtp_app_password',
  'external_patient_update_api_key',
]);

export const MASKED_SECRET = '********';

export function maskSettings(settings) {
  const out = { ...settings };
  for (const key of SECRET_KEYS) {
    if (out[key]) out[key] = MASKED_SECRET;
  }
  return out;
}

/** בעת שמירה — לא לדרוס סודות אם נשלח ריק או מסכה */
export function shouldSkipSecretUpdate(key, value) {
  if (!SECRET_KEYS.has(key)) return false;
  const v = String(value ?? '').trim();
  return !v || v === MASKED_SECRET;
}
