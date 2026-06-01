function waitForImages(root, ms = 2500) {
  const imgs = [...root.querySelectorAll('img')].filter((img) => !img.complete);
  if (!imgs.length) return Promise.resolve();
  return Promise.race([
    Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          })
      )
    ),
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);
}

/**
 * הדפסה למדפסת ברירת מחדל (דפדפן).
 * ללא חלון: Chrome עם --kiosk-printing.
 */
export async function printTicketReceipt() {
  const area = document.querySelector('.print-area');
  if (!area) {
    window.print();
    return;
  }

  await waitForImages(area);

  document.body.classList.add('is-printing-ticket');
  const cleanup = () => {
    document.body.classList.remove('is-printing-ticket');
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  await new Promise((resolve) => setTimeout(resolve, 80));
  window.focus();
  window.print();
  setTimeout(cleanup, 8000);
}
