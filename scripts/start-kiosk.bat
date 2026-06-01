@echo off
REM MedQueue — קיוסק עם הדפסה שקטה (ללא חלון הדפסה) ב-Chrome
set URL=http://localhost:5173/kiosk
set CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe
if not exist "%CHROME%" set CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe
if not exist "%CHROME%" (
  echo Chrome not found. Install Chrome or open %URL% manually.
  pause
  exit /b 1
)
start "" "%CHROME%" --kiosk --kiosk-printing --disable-print-preview %URL%
