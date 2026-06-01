@echo off
cd /d "%~dp0.."
title MedQueue Local Print
npm run kiosk:print-server
