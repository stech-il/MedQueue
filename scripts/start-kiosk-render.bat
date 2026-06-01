@echo off
chcp 65001 >nul
title MedQueue קיוסק
set "BASE=%~1"
if "%BASE%"=="" (
  echo.
  echo  שימוש:
  echo    start-kiosk-render.bat https://medqueue-6ivj.onrender.com
  echo.
  echo  או הרץ פעם אחת: install-kiosk-windows.bat
  pause
  exit /b 1
)

set "ROOT=%~dp0.."
cd /d "%ROOT%"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js לא מותקן — הרץ install-kiosk-windows.bat
  pause
  exit /b 1
)

if not exist "%ROOT%\server\node_modules\pdf-to-printer" (
  echo מתקין סוכן הדפסה...
  call npm install --prefix server
)

set "MEDQUEUE_URL=%BASE%"
set "KIOSK_URL=%BASE%/kiosk?kiosk=1"

echo.
echo  מפעיל סוכן הדפסה ^(חלון שחור — אל תסגור^)...
start "MedQueue הדפסה" cmd /k "cd /d \"%ROOT%\" && set MEDQUEUE_URL=%MEDQUEUE_URL% && npm run kiosk:agent"

echo  ממתין לחיבור סוכן...
timeout /t 4 /nobreak >nul

echo  פותח Chrome לקיוסק...
call "%~dp0launch-kiosk-chrome.bat" "%KIOSK_URL%"

echo.
echo  אם עדיין מופיע חלון הדפסה:
echo    1. סגר את כל Chrome ופתח רק מהקיצור MedQueue קיוסק
echo    2. ודא שבחלון ההדפסה כתוב: מחובר
echo    3. הגדר מדפסת ברירת מחדל ב-Windows
echo.
