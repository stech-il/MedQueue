import { DATA_DIR } from './paths.js';
import fs from 'node:fs';
import { join } from 'node:path';

// PHP code disabled SSL verification. In Node we mirror it with a process-level toggle.
// Note: this reduces TLS security. Keep it only for the trusted Rapid One endpoint.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const API_BASE = process.env.RAPID_ONE_BASE || 'https://yzm.rapid-image.net';
const API_USERNAME = process.env.RAPID_ONE_USERNAME || 'admin';
const API_PASSWORD = process.env.RAPID_ONE_PASSWORD || 'Boss2020';
const STATIC_TOKEN = process.env.RAPID_ONE_ACCESS_TOKEN || '';
const EXTERNAL_UPDATE_BASE =
  process.env.EXTERNAL_PATIENT_UPDATE_BASE || 'https://m.mokedelad.co.il/server1/api.php';
const EXTERNAL_UPDATE_API_KEY =
  process.env.EXTERNAL_PATIENT_UPDATE_API_KEY || 'EXTERNAL_COMPANY_SECURE';

const TOKEN_CACHE_PATH = join(DATA_DIR, 'rapidOne-token.json');
const RAPID_CONFIG_PATH = process.env.RAPID_ONE_CONFIG_FILE || join(process.cwd(), 'RapidPDFImporter.Service.exe.Config');

const DEFAULT_TIMEOUT_MS = 10000;

function requireNonEmpty(value, name) {
  if (!String(value || '').trim()) throw new Error(`${name} לא מוגדר`);
  return String(value).trim();
}

function fetchJsonWithTimeout(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  return (async () => {
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: ctrl.signal,
        headers: { Accept: 'application/json' },
      });
      const text = await res.text();

      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg = data?.error || data?.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return data ?? {};
    } finally {
      clearTimeout(t);
    }
  })();
}

function parseRapidConfigToken(configPath) {
  try {
    if (!fs.existsSync(configPath)) return null;
    const xml = fs.readFileSync(configPath, 'utf-8');

    const tokenMatch = xml.match(/<add[^>]*key="Token"[^>]*value="([^"]*)"/i);
    const expiryMatch = xml.match(/<add[^>]*key="stExpirDate"[^>]*value="([^"]*)"/i);

    const token = tokenMatch?.[1];
    const expiryStr = expiryMatch?.[1];
    if (!token) return null;

    if (!expiryStr) return { token, expiresAt: null };
    const expiresAt = Date.parse(expiryStr);
    if (Number.isNaN(expiresAt)) return { token, expiresAt: null };

    return { token, expiresAt };
  } catch {
    return null;
  }
}

function readTokenCache() {
  try {
    if (!fs.existsSync(TOKEN_CACHE_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf-8'));
    if (!data?.token) return null;
    return data;
  } catch {
    return null;
  }
}

function writeTokenCache({ token, expiresAt }) {
  try {
    fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify({ token, expiresAt }), 'utf-8');
  } catch {
    /* ignore */
  }
}

async function createNewToken() {
  const tokenUrl = `${API_BASE}/api/token`;

  const body = new URLSearchParams({
    grant_type: 'password',
    username: API_USERNAME,
    password: API_PASSWORD,
  });

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = data?.error || data?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    const token = data?.access_token;
    if (!token) throw new Error('access_token לא נמצא בתשובת token');

    // PHP uses $data['.expires']
    const expiresRaw = data?.['.expires'] || data?.expires;
    let expiresAt = null;
    if (expiresRaw) {
      const parsed = Date.parse(String(expiresRaw));
      expiresAt = Number.isNaN(parsed) ? null : parsed;
    }

    return { token, expiresAt };
  } finally {
    clearTimeout(t);
  }
}

async function getApiToken() {
  // 0) Manual static token override (for locked account cases)
  if (String(STATIC_TOKEN || '').trim()) {
    return String(STATIC_TOKEN).trim();
  }

  // 1) Try local Rapid config file (same as PHP)
  const cfg = parseRapidConfigToken(RAPID_CONFIG_PATH);
  const staleFallback = cfg?.token || readTokenCache()?.token || null;
  if (cfg?.token && cfg.expiresAt && cfg.expiresAt > Date.now()) return cfg.token;
  if (cfg?.token && !cfg.expiresAt) return cfg.token;

  // 2) Try token cache file
  const cached = readTokenCache();
  if (cached?.token && cached?.expiresAt && cached.expiresAt > Date.now()) return cached.token;
  if (cached?.token && !cached?.expiresAt) return cached.token;

  // 3) Fetch new
  try {
    const fresh = await createNewToken();
    writeTokenCache(fresh);
    return fresh.token;
  } catch (e) {
    // Same spirit as your PHP fallback: if account/token endpoint fails, try cached token
    if (staleFallback) return staleFallback;
    throw e;
  }
}

async function findPatientWorking(idNumber) {
  const token = await getApiToken();
  const url = `${API_BASE}/api/customers?idNumber=${encodeURIComponent(idNumber)}&departmentsIds=1`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
    }
    if (!data || typeof data.total === 'undefined' || !Array.isArray(data.data)) {
      throw new Error('תשובת API לא תקינה בחיפוש מטופל');
    }

    if (data.total === 0) throw new Error(`מטופל לא נמצא עם ת.ז: ${idNumber}`);
    return data.data[0];
  } finally {
    clearTimeout(t);
  }
}

async function getFullPatientDataWorking(cardCode) {
  const token = await getApiToken();
  const url = `${API_BASE}/api/customers/${encodeURIComponent(cardCode)}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    let text = await res.text();
    if (text?.startsWith('\uFEFF')) text = text.slice(1); // remove BOM

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
    }
    if (!data) throw new Error('שגיאה בפרסור JSON לנתוני מטופל');

    return data;
  } finally {
    clearTimeout(t);
  }
}

function buildHealthOrgMapping(healthFund) {
  const HEALTH_ORG_MAPPING = {
    מכבי: { name: 'מכבי', id: 1, priceListId: 2 },
    כללית: { name: 'כללית', id: 2, priceListId: 3 },
    מאוחדת: { name: 'מאוחדת', id: 3, priceListId: 4 },
    לאומית: { name: 'לאומית', id: 4, priceListId: 5 },
  };
  return HEALTH_ORG_MAPPING[healthFund];
}

async function updatePatientWorking(patientData) {
  const token = await getApiToken();
  const url = `${API_BASE}/api/customers`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: 'PUT',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(patientData),
    });

    const text = await res.text();
    if (res.status >= 200 && res.status <= 299) return true;
    if (res.status === 500) return 'maybe';

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    throw new Error(`שגיאה בעדכון מטופל: ${res.status} - ${data?.message || text || ''}`.trim());
  } finally {
    clearTimeout(t);
  }
}

export async function testRapidOneConnection() {
  // Best-effort: just validate token endpoint works.
  await getApiToken();
  return { ok: true, message: 'חיבור Rapid One תקין (token)' };
}

export async function updateRapidOnePatientFromKiosk({ idNumber, phone, healthFund }) {
  requireNonEmpty(idNumber, 'idNumber');
  requireNonEmpty(phone, 'phone');
  requireNonEmpty(healthFund, 'healthFund');

  return updateRapidOnePatientFromInput({
    idNumber,
    phone,
    healthFund,
  });
}

/**
 * Alternative integration endpoint (as provided by user):
 * https://m.mokedelad.co.il/server1/api.php?api_key=...&action=update&id_number=...&phone=...&health_org=...
 */
export async function updatePatientViaExternalApiPhp({ idNumber, phone, healthFund }) {
  requireNonEmpty(idNumber, 'idNumber');
  requireNonEmpty(phone, 'phone');
  requireNonEmpty(healthFund, 'healthFund');

  const url = new URL(EXTERNAL_UPDATE_BASE);
  url.searchParams.set('api_key', EXTERNAL_UPDATE_API_KEY);
  url.searchParams.set('action', 'update');
  url.searchParams.set('id_number', idNumber);
  url.searchParams.set('phone', phone);
  url.searchParams.set('health_org', healthFund);

  const data = await fetchJsonWithTimeout(url.toString(), { timeoutMs: 15000 });
  if (data?.success === false) {
    throw new Error(data?.error || data?.message || 'שגיאה בעדכון דרך API חיצוני');
  }

  return {
    success: true,
    message: data?.message || 'עודכן דרך API חיצוני',
    raw: data,
  };
}

/**
 * Replica of the provided PHP logic:
 * - find patient by idNumber (departmentsIds=1)
 * - fetch full patient by cardCode
 * - apply changes for any provided fields (firstName/lastName/phone/email/healthFund)
 * - PUT updated patient
 * - on 500: verify by re-fetch (phone + healthFund only, like the PHP)
 */
export async function updateRapidOnePatientFromInput({ idNumber, firstName, lastName, phone, email, healthFund }) {
  requireNonEmpty(idNumber, 'idNumber');

  // At least one updatable field must be present
  const hasAny =
    String(firstName || '').trim() ||
    String(lastName || '').trim() ||
    String(phone || '').trim() ||
    String(email || '').trim() ||
    String(healthFund || '').trim();
  if (!hasAny) throw new Error('לא נמצאו נתונים לעדכון');

  const patientInfo = await findPatientWorking(idNumber);
  const fullPatientData = await getFullPatientDataWorking(patientInfo.cardCode);

  const changes = [];
  let hasChanges = false;

  // Names (optional)
  const inputFirst = firstName !== undefined ? String(firstName).trim() : '';
  const inputLast = lastName !== undefined ? String(lastName).trim() : '';

  if (inputFirst && inputFirst !== fullPatientData.firstName) {
    changes.push(`שם פרטי: '${fullPatientData.firstName}' → '${inputFirst}'`);
    fullPatientData.firstName = inputFirst;
    fullPatientData.fullName = `${fullPatientData.firstName || ''} ${fullPatientData.lastName || ''}`.trim();
    hasChanges = true;
  }

  if (inputLast && inputLast !== fullPatientData.lastName) {
    changes.push(`שם משפחה: '${fullPatientData.lastName}' → '${inputLast}'`);
    fullPatientData.lastName = inputLast;
    fullPatientData.fullName = `${fullPatientData.firstName || ''} ${fullPatientData.lastName || ''}`.trim();
    hasChanges = true;
  }

  // Phone (optional)
  if (phone !== undefined && phone !== null && String(phone).trim()) {
    const inputPhone = String(phone).trim();
    const oldPhone = fullPatientData.cellPhone ?? '';
    if (inputPhone !== oldPhone) {
      changes.push(`טלפון נייד: '${oldPhone || 'ללא'}' → '${inputPhone}'`);
      fullPatientData.cellPhone = inputPhone;
      hasChanges = true;
    }
  }

  // Email (optional)
  if (email !== undefined && email !== null && String(email).trim()) {
    const inputEmail = String(email).trim();
    const oldEmail = fullPatientData.email ?? '';
    if (inputEmail !== oldEmail) {
      changes.push(`אימייל: '${oldEmail || 'ללא'}' → '${inputEmail}'`);
      fullPatientData.email = inputEmail;
      hasChanges = true;
    }
  }

  // Health fund (optional)
  const inputFund = healthFund !== undefined ? String(healthFund).trim() : '';
  const mapping = inputFund ? buildHealthOrgMapping(inputFund) : null;
  if (inputFund) {
    if (!mapping) {
      throw new Error(`קופת חולים לא מוכרת: ${inputFund}. אפשרויות: מכבי, כללית, מאוחדת, לאומית`);
    }

    const oldHealthService = fullPatientData.healthService ?? '';
    if (inputFund !== oldHealthService) {
      changes.push(`קופת חולים: '${oldHealthService || 'ללא'}' → '${mapping.name}'`);
      changes.push(`מחירון: ${fullPatientData.priceListId ?? 'ללא'} → ${mapping.priceListId}`);
      fullPatientData.healthService = mapping.name;
      fullPatientData.healthOrgId = mapping.id;
      fullPatientData.priceListId = mapping.priceListId;
      hasChanges = true;
    }
  }

  if (!hasChanges) throw new Error('לא נמצאו שינויים לעדכון');

  const updateResult = await updatePatientWorking(fullPatientData);

  if (updateResult === true) {
    return {
      success: true,
      message: 'מטופל עודכן בהצלחה',
      patient_name: fullPatientData.fullName || 'N/A',
      patient_id: fullPatientData.idNumber || idNumber,
      changes,
    };
  }

  if (updateResult === 'maybe') {
    // PHP verifies phone + health_org only
    const verifyPatient = await findPatientWorking(idNumber);

    if (phone) {
      const actualPhone = verifyPatient.cellPhone ?? '';
      const expectedPhone = String(phone).trim();
      if (actualPhone !== expectedPhone) {
        throw new Error(
          `העדכון נכשל - הטלפון לא השתנה (צפוי: ${expectedPhone}, בפועל: ${actualPhone})`
        );
      }
    }

    if (healthFund) {
      const expectedOrg = mapping?.name || healthFund;
      const actualOrg = verifyPatient.healthService ?? '';
      if (actualOrg !== expectedOrg) {
        throw new Error(
          `העדכון נכשל - קופת החולים לא השתנתה (צפוי: ${expectedOrg}, בפועל: ${actualOrg})`
        );
      }
    }

    return {
      success: true,
      message: 'מטופל עודכן בהצלחה (אימות אחרי 500)',
      patient_name: fullPatientData.fullName || 'N/A',
      patient_id: fullPatientData.idNumber || idNumber,
      changes,
    };
  }

  throw new Error('שגיאה בעדכון מטופל (unknown result)');
}

