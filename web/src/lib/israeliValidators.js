/** אימות טלפון ות.ז. ישראליים (כמו בשרת) */

export function normalizePhoneDigits(input) {
  let digits = String(input).replace(/\D/g, '');
  if (digits.startsWith('972')) digits = '0' + digits.slice(3);
  if (digits.length === 9 && digits.startsWith('5')) digits = '0' + digits;
  return digits;
}

export function validatePhoneDigits(digits) {
  const n = normalizePhoneDigits(digits);
  if (!n) return { ok: false, error: 'יש להזין מספר טלפון' };
  if (!/^0[2-9]\d{7,8}$/.test(n)) {
    return { ok: false, error: 'מספר טלפון לא תקין (מספר ישראלי מלא)' };
  }
  return { ok: true, normalized: n };
}

/** קיוסק — טלפון נייד בלבד (05XXXXXXXX) */
export function validateMobilePhoneDigits(digits) {
  const n = normalizePhoneDigits(digits);
  if (!n) return { ok: false, error: 'יש להזין מספר טלפון נייד' };
  if (n.length < 10) {
    return { ok: false, error: 'מספר לא מלא', incomplete: true };
  }
  if (!/^05\d{8}$/.test(n)) {
    return { ok: false, error: 'מספר נייד לא תקין' };
  }
  return { ok: true, normalized: n };
}

export function normalizeIdDigits(input) {
  let s = String(input).replace(/\D/g, '');
  if (s.length === 8) s = '0' + s;
  return s;
}

function idChecksumValid(s) {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let inc = Number(s[i]) * ((i % 2) + 1);
    if (inc > 9) inc -= 9;
    sum += inc;
  }
  return sum % 10 === 0;
}

export function validateIdDigits(digits) {
  let s = normalizeIdDigits(digits);
  if (!s) return { ok: false, error: 'יש להזין תעודת זהות' };
  if (s.length < 9) {
    return { ok: false, error: 'מספר לא מלא', incomplete: true };
  }
  if (!/^\d{9}$/.test(s)) {
    return { ok: false, error: 'תעודת זהות לא תקינה' };
  }
  if (!idChecksumValid(s)) {
    return { ok: false, error: 'תעודת זהות לא תקינה' };
  }
  return { ok: true, normalized: s };
}
