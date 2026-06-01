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
  --kiosk-printing ^
  --disable-print-preview ^
  --no-first-run ^
  --no-default-browser-check ^
  --user-data-dir="%PROFILE%" ^
  "%KIOSK_URL%"
