const DEFAULT_TIMEOUT_MS = 8000;

function requireNonEmpty(value, name) {
  if (!String(value || '').trim()) throw new Error(`${name} לא מוגדר`);
  return String(value).trim();
}

function buildUrl(baseUrl, queryParams) {
  const u = new URL(baseUrl);
  for (const [k, v] of Object.entries(queryParams)) {
    if (v === undefined || v === null) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
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
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = data?.error || data?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data ?? { raw: text };
  } finally {
    clearTimeout(t);
  }
}

export async function testExternalPatientApi({ baseUrl, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const url = requireNonEmpty(baseUrl, 'external_patient_update_url');
  const testUrl = buildUrl(url, { action: 'test' });
  const data = await fetchJsonWithTimeout(testUrl, { timeoutMs });

  if (data?.success === false) {
    throw new Error(data?.error || data?.message || 'בדיקת חיבור נכשלה');
  }

  return {
    ok: true,
    message: data?.message || 'חיבור הצליח',
    raw: data,
  };
}

export async function updateExternalPatientApi({
  baseUrl,
  apiKey,
  idNumber,
  phone,
  healthOrg,
  timeoutMs = 10000,
}) {
  const url = requireNonEmpty(baseUrl, 'external_patient_update_url');
  const key = requireNonEmpty(apiKey, 'external_patient_update_api_key');

  if (!idNumber) throw new Error('idNumber חסר');
  if (!phone) throw new Error('phone חסר');
  if (!healthOrg) throw new Error('healthOrg חסר');

  const updateUrl = buildUrl(url, {
    action: 'update',
    api_key: key,
    id_number: idNumber,
    phone,
    health_org: healthOrg,
  });

  const data = await fetchJsonWithTimeout(updateUrl, { timeoutMs });

  if (!data?.success) {
    throw new Error(data?.error || data?.message || 'שגיאה בעדכון');
  }

  return {
    ok: true,
    message: data?.message || 'עודכן בהצלחה',
    patient_name: data?.patient_name || data?.patientName || null,
    patient_id: data?.patient_id || data?.patientId || null,
    changes: Array.isArray(data?.changes) ? data.changes : [],
    raw: data,
  };
}

