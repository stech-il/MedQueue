import { printKioskTicketHtml } from './kioskPrintHtml.js';
import { printKioskTicketPdf } from './kioskPrintPdf.js';
import { printKioskTicketText } from './kioskPrintText.js';

/**
 * הדפסת כרטיס תור למדפסת ברירת מחדל (Windows).
 * html — כרטיס מעוצב (ברירת מחדל), text — פשוט, pdf — גיבוי
 */
export async function printKioskTicket(ticket, settings, receptionRoom) {
  if (process.platform !== 'win32') {
    throw new Error('הדפסה מהשרת נתמכת כרגע ב-Windows בלבד');
  }

  const mode =
    settings?.kiosk_print_format?.trim() ||
    process.env.KIOSK_PRINT_FORMAT?.trim() ||
    'html';

  if (mode === 'pdf') {
    return printKioskTicketPdf(ticket, settings, receptionRoom);
  }
  if (mode === 'text') {
    return printKioskTicketText(ticket, settings, receptionRoom);
  }

  try {
    return await printKioskTicketHtml(ticket, settings, receptionRoom);
  } catch (e) {
    console.warn('Styled print failed:', e.message);
    if (mode === 'html') {
      throw new Error(
        `${e.message} — ודא ש-Chrome מותקן והרץ: npm install --prefix server`
      );
    }
    return printKioskTicketPdf(ticket, settings, receptionRoom);
  }
}
