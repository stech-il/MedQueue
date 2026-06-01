/**
 * הדפסה למדפסת ברירת מחדל (דפדפן).
 * ללא חלון: Chrome עם --kiosk-printing, או הגדרה «הדפסה מהשרת» בניהול.
 */
export function printTicketReceipt() {
  const area = document.querySelector('.print-area');
  if (!area) {
    window.print();
    return;
  }

  document.body.classList.add('is-printing-ticket');
  const cleanup = () => {
    document.body.classList.remove('is-printing-ticket');
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(() => {
    window.focus();
    window.print();
    setTimeout(cleanup, 5000);
  }, 120);
}
