import { useEffect, useRef } from 'react';
import { printTicketReceipt } from '../lib/printTicket';
import { isKioskSilentPrintUrl } from '../lib/kioskPrintMode';
import { buildTicketReceiptData } from '../lib/ticketReceipt';

function ReceiptRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="print-ticket__row">
      <span className="print-ticket__row-label">{label}</span>
      <span className="print-ticket__row-value">{value}</span>
    </div>
  );
}

export default function TicketPrint({ ticket, settings, receptionRoom, onPrintBlocked }) {
  const printedFor = useRef(null);

  useEffect(() => {
    if (!ticket) {
      printedFor.current = null;
      return;
    }
    if (ticket.printed && ticket.needs_browser_print === false) return;
    if (printedFor.current === ticket.id) return;
    printedFor.current = ticket.id;

    const timer = setTimeout(() => {
      if (!isKioskSilentPrintUrl()) {
        onPrintBlocked?.();
        return;
      }
      printTicketReceipt().catch(() => {
        window.print();
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [ticket, onPrintBlocked]);

  if (!ticket) return null;

  const r = buildTicketReceiptData(ticket, settings, receptionRoom);
  const logoOk = r.logo && r.logo !== '/logo.svg';

  return (
    <div className="print-area">
      <article className="print-ticket" dir="rtl">
        <header className="print-ticket__header">
          {logoOk && <img src={r.logo} alt="" className="print-ticket__logo" />}
          <h1 className="print-ticket__clinic">{r.clinic}</h1>
          <p className="print-ticket__subtitle">כרטיס תור</p>
        </header>

        <section className="print-ticket__hero" aria-label="מספר תור">
          <p className="print-ticket__hero-label">מספר תור</p>
          <p className="print-ticket__hero-code">{r.displayCode}</p>
        </section>

        <div className="print-ticket__rule" role="presentation" />

        <section className="print-ticket__details">
          <ReceiptRow label="קופת חולים" value={r.healthFund} />
          <ReceiptRow label="טלפון נייד" value={r.phone} />
          <ReceiptRow label="תעודת זהות" value={r.idNumber} />
          <ReceiptRow label="שירות" value={r.serviceName} />
          {r.ticketNumber && <ReceiptRow label="מספר פנימי" value={r.ticketNumber} />}
        </section>

        <div className="print-ticket__rule" role="presentation" />

        <section className="print-ticket__dest">
          <p className="print-ticket__dest-label">נא לגשת ל</p>
          <p className="print-ticket__dest-room">{r.roomName}</p>
        </section>

        <div className="print-ticket__rule print-ticket__rule--thin" role="presentation" />

        <footer className="print-ticket__footer">
          <p className="print-ticket__datetime">
            <span>{r.dateLabel}</span>
            <span className="print-ticket__time">{r.timeLabel}</span>
          </p>
          <p className="print-ticket__notice">המתן להקריאת מספר התור על המסך</p>
          <p className="print-ticket__notice print-ticket__notice--sm">שמור על כרטיס זה עד סיום הטיפול</p>
        </footer>
      </article>
    </div>
  );
}
