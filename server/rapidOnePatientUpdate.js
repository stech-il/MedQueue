const EXTERNAL_UPDATE_BASE =
  process.env.EXTERNAL_PATIENT_UPDATE_BASE || 'https://m.mokedelad.co.il/server1/api.php';
const EXTERNAL_UPDATE_API_KEY =
  process.env.EXTERNAL_PATIENT_UPDATE_API_KEY || 'EXTERNAL_COMPANY_SECURE';
const DEFAULT_TIMEOUT_MS = 15000;

function requireNonEmpty(value, name) {
  if (!String(value || '').trim()) throw new Error(`${name} לא מוגדר`);
  return String(value).trim();
}

async function fetchJsonWithTimeout(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
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
}

function buildExternalUpdateUrl({ idNumber, phone, healthFund }) {
  const url = new URL(EXTERNAL_UPDATE_BASE);
  url.searchParams.set('api_key', EXTERNAL_UPDATE_API_KEY);
  url.searchParams.set('action', 'update');
  url.searchParams.set('id_number', idNumber);
  url.searchParams.set('phone', phone);
  url.searchParams.set('health_org', healthFund);
  return url.toString();
}

export async function testExternalPatientConnection() {
  const url = new URL(EXTERNAL_UPDATE_BASE);
  url.searchParams.set('action', 'test');
  const data = await fetchJsonWithTimeout(url.toString(), { timeoutMs: 10000 });
  if (data?.success === false) {
    throw new Error(data?.error || data?.message || 'בדיקת חיבור נכשלה');
  }
  return { ok: true, message: data?.message || 'חיבור API תקין' };
}

export async function updatePatientViaExternalApiPhp({ idNumber, phone, healthFund }) {
  requireNonEmpty(idNumber, 'idNumber');
  requireNonEmpty(phone, 'phone');
  requireNonEmpty(healthFund, 'healthFund');

  const data = await fetchJsonWithTimeout(
    buildExternalUpdateUrl({ idNumber, phone, healthFund }),
    { timeoutMs: DEFAULT_TIMEOUT_MS }
  );
  if (data?.success === false) {
    throw new Error(data?.error || data?.message || 'שגיאה בעדכון דרך API חיצוני');
  }
  return {
    success: true,
    message: data?.message || 'עודכן דרך API חיצוני',
    raw: data,
  };
}

