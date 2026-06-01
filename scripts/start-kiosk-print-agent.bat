@echo off
REM סוכן הדפסה — מדפסת ברירת מחדל כשהאתר על Render
REM שימוש: start-kiosk-print-agent.bat https://your-app.onrender.com
set MEDQUEUE_URL=%~1
if "%MEDQUEUE_URL%"=="" (
  echo.
  echo  MedQueue - סוכן הדפסה
  echo  שימוש: start-kiosk-print-agent.bat https://YOUR-APP.onrender.com
  echo.
  pause
  exit /b 1
)
cd /d "%~dp0.."
call npm run kiosk:agent
