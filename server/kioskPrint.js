import { printKioskTicketPdf } from './kioskPrintPdf.js';
import { printKioskTicketText } from './kioskPrintText.js';

/**
 * הדפסת כרטיס תור למדפסת ברירת מחדל (Windows).
 * ברירת מחדל: טקסט UTF-8 (בלי PDF, עברית בסדר נכון).
 * הגדרה: kiosk_print_format = text | pdf
 */
export async function printKioskTicket(ticket, settings, receptionRoom) {
  if (process.platform !== 'win32') {
    throw new Error('הדפסה מהשרת נתמכת כרגע ב-Windows בלבד');
  }

  const mode =
    settings?.kiosk_print_format?.trim() ||
    process.env.KIOSK_PRINT_FORMAT?.trim() ||
    'text';

  if (mode === 'pdf') {
    return printKioskTicketPdf(ticket, settings, receptionRoom);
  }

  try {
    return await printKioskTicketText(ticket, settings, receptionRoom);
  } catch (e) {
    if (mode === 'text') throw e;
    console.warn('Text print failed, PDF fallback:', e.message);
    return printKioskTicketPdf(ticket, settings, receptionRoom);
  }
}
