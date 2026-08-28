@echo off
setlocal
title Al-Amaan Pharmacy Launcher
set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%PROJECT_DIR%alamaan_backend"
set "PYTHON_EXE=%BACKEND_DIR%\env\Scripts\python.exe"

echo ================================================
echo          Al-Amaan Pharmacy IMS Launcher
echo ================================================
echo.

if not exist "%PYTHON_EXE%" (
    echo ERROR: The Django virtual environment was not found:
    echo %PYTHON_EXE%
    echo Complete the backend setup before using this launcher.
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm.cmd was not found. Install Node.js and restart Windows.
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%node_modules\.bin\vite.cmd" (
    echo ERROR: Frontend packages are not installed.
    echo Open CMD in this folder and run: npm install
    pause
    exit /b 1
)

echo Checking the local data backup...
"%PYTHON_EXE%" "%PROJECT_DIR%scripts\backup_sqlite.py"
set "BACKUP_RESULT=%ERRORLEVEL%"
if "%BACKUP_RESULT%"=="2" (
    echo WARNING: PostgreSQL is selected, so the SQLite startup backup was skipped.
    echo Confirm that the separate pg_dump backup job is operating.
) else if not "%BACKUP_RESULT%"=="0" (
    echo.
    echo Startup cancelled because the safety backup failed.
    pause
    exit /b 1
)

curl.exe --fail --silent --max-time 2 http://127.0.0.1:8000/health/ >nul 2>&1
if errorlevel 1 (
    echo Starting the API in a minimized window...
    start "Al-Amaan API" /min "%PROJECT_DIR%scripts\run_local_api.cmd"
) else (
    echo The API is already running.
)

curl.exe --fail --silent --max-time 2 http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo Starting the frontend in a minimized window...
    start "Al-Amaan Frontend" /min "%PROJECT_DIR%scripts\run_local_frontend.cmd"
) else (
    echo The frontend is already running.
)

echo Waiting for both services, then the browser will open...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\open_system_when_ready.ps1"
if errorlevel 1 (
    echo.
    echo Startup did not complete. Check the two minimized server windows.
    pause
    exit /b 1
)

echo The system is ready. This launcher window can now be closed.
timeout /t 3 >nul
exit /b 0
