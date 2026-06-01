@echo off
chcp 65001 >nul
title MedQueue Kiosk
set "BASE=%~1"
if "%BASE%"=="" (
  if exist "%~dp0medqueue-kiosk.url.txt" set /p BASE=<"%~dp0medqueue-kiosk.url.txt"
)
if "%BASE%"=="" set "BASE=https://medqueue-6ivj.onrender.com"

:trim_base
if "%BASE:~-1%"=="/" set "BASE=%BASE:~0,-1%" & goto trim_base
if /i "%BASE:~-5%"=="/kiosk" set "BASE=%BASE:~0,-5%" & goto trim_base

set "ROOT=%~dp0.."
cd /d "%ROOT%"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js required: https://nodejs.org
  pause
  exit /b 1
)

if not exist "%ROOT%\server\node_modules\pdf-to-printer" (
  echo Installing print dependencies...
  call npm install --prefix server
)

set "KIOSK_URL=%BASE%/kiosk?kiosk=1"
echo.
echo  Kiosk URL: %KIOSK_URL%
echo.

echo  Starting LOCAL print server (styled receipt, no dialog)...
start "MedQueue Local Print" cmd /k "%~dp0start-print-server.bat"

echo  Waiting for print server...
timeout /t 3 /nobreak >nul

echo  Opening Chrome...
call "%~dp0launch-kiosk-chrome.bat" "%KIOSK_URL%"

echo.
echo  Keep the black window open: "MedQueue local print"
echo.
