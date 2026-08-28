@echo off
setlocal
title Al-Amaan Pharmacy Frontend
set "PROJECT_DIR=%~dp0.."

cd /d "%PROJECT_DIR%"
echo Starting Al-Amaan frontend at http://localhost:3000 ...
npm.cmd run dev

echo.
echo The frontend stopped or could not start. Review the message above.
pause
