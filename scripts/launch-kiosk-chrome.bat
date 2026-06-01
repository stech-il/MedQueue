@echo off
REM פתיחת Chrome לקיוסק — הדפסה שקטה למדפסת ברירת מחדל (ללא חלון)
set "KIOSK_URL=%~1"
if "%KIOSK_URL%"=="" (
  echo שימוש: launch-kiosk-chrome.bat "https://....onrender.com/kiosk?kiosk=1"
  exit /b 1
)

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (
  echo התקן Google Chrome מ- https://www.google.com/chrome/
  pause
  exit /b 1
)

set "PROFILE=%LOCALAPPDATA%\MedQueueKioskChrome"
if not exist "%PROFILE%" mkdir "%PROFILE%"

REM סוגר Chrome רגיל — אחרת הדגלים לא נכנסים לפעולה
taskkill /IM chrome.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

start "" "%CHROME%" ^
  --kiosk ^
  --disable-print-preview ^
  --no-first-run ^
  --no-default-browser-check ^
  --unsafely-treat-insecure-origin-as-secure=http://127.0.0.1:39123 ^
  --user-data-dir="%PROFILE%" ^
  "%KIOSK_URL%"
