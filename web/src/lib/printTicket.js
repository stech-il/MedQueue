const LOCAL_PRINT_URL = 'http://127.0.0.1:39123';

export async function isLocalPrintServerUp() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(`${LOCAL_PRINT_URL}/health`, {
      signal: ctrl.signal,
      mode: 'cors',
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/** הדפסה שקטה דרך שרת מקומי (מומלץ עם Render) */
export async function printTicketViaLocal(ticket, settings, receptionRoom) {
  const res = await fetch(`${LOCAL_PRINT_URL}/print`, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticket,
      settings: settings || {},
      reception_room: receptionRoom || null,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'הדפסה מקומית נכשלה');
  }
  return data;
}

/**
 * הדפסת כרטיס — קודם שרת מקומי (ללא דיאלוג).
 * לא קורא ל-window.print (גורם לחלון הדפסה ב-Chrome).
 */
export async function printTicketReceipt(ticket, settings, receptionRoom) {
  if (!ticket) {
    throw new Error('אין נתוני תור להדפסה');
  }
  await printTicketViaLocal(ticket, settings, receptionRoom);
}
