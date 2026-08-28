@echo off
setlocal
title Al-Amaan Pharmacy API
set "PROJECT_DIR=%~dp0.."
set "BACKEND_DIR=%PROJECT_DIR%\alamaan_backend"
set "PYTHON_EXE=%BACKEND_DIR%\env\Scripts\python.exe"

cd /d "%BACKEND_DIR%"
echo Starting Al-Amaan Django API at http://127.0.0.1:8000 ...
"%PYTHON_EXE%" manage.py runserver 127.0.0.1:8000

echo.
echo The API stopped or could not start. Review the message above.
pause
