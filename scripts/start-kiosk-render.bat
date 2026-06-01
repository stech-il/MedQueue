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

set "KIOSK_URL=%BASE%/kiosk?kiosk=1"
echo.
echo  MedQueue Kiosk
echo  URL: %KIOSK_URL%
echo.

echo  Opening Chrome (screen only, no print)...
call "%~dp0launch-kiosk-chrome.bat" "%KIOSK_URL%"

echo.
echo  To enable printing: Management - Settings - Kiosk - enable print mode
echo.
