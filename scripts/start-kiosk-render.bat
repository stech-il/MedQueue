@echo off
REM קיוסק מלא ל-Render: סוכן הדפסה + Chrome קיוסק (הדפסה שקטה)
REM שימוש: start-kiosk-render.bat https://your-app.onrender.com
set BASE=%~1
if "%BASE%"=="" (
  echo שימוש: start-kiosk-render.bat https://YOUR-APP.onrender.com
  pause
  exit /b 1
)
set MEDQUEUE_URL=%BASE%
set KIOSK_URL=%BASE%/kiosk
cd /d "%~dp0.."
start "MedQueue Print" cmd /c "npm run kiosk:agent"
timeout /t 2 /nobreak >nul
set CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe
if not exist "%CHROME%" set CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe
if not exist "%CHROME%" (
  echo Chrome not found.
  pause
  exit /b 1
)
start "" "%CHROME%" --kiosk --kiosk-printing --disable-print-preview "%KIOSK_URL%"
