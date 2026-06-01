@echo off
chcp 65001 >nul
title MedQueue — התקנת קיוסק
set "BASE=https://medqueue-6ivj.onrender.com"
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo.
echo  ========================================
echo   MedQueue — התקנה חד-פעמית למחשב קיוסק
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [X] Node.js לא מותקן.
  echo     הורד והתקן מ- https://nodejs.org  ^(LTS^)
  echo     אחרי ההתקנה הרץ שוב קובץ זה.
  pause
  exit /b 1
)

echo [1/3] מתקין סוכן הדפסה...
call npm install --prefix server
if errorlevel 1 (
  echo [X] התקנה נכשלה
  pause
  exit /b 1
)

echo [2/3] יוצר קיצור דרך על שולחן העבודה...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-kiosk-desktop-shortcut.ps1" -ProjectRoot "%ROOT%"

echo [3/3] סיום.
echo.
echo  מעכשיו: לחץ כפול על "MedQueue Kiosk" בשולחן העבודה.
echo  אל תפתח את הקיוסק מסמל Chrome הרגיל.
echo.
pause
