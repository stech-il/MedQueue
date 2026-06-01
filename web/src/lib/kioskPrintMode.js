/** נפתח מהקיצור / start-kiosk-render.bat עם ?kiosk=1 — מאפשר הדפסה שקטה ב-Chrome */
export function isKioskSilentPrintUrl() {
  try {
    return new URLSearchParams(window.location.search).get('kiosk') === '1';
  } catch {
    return false;
  }
}
