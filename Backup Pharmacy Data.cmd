@echo off
setlocal
title Al-Amaan Pharmacy Backup
set "PROJECT_DIR=%~dp0"
set "PYTHON_EXE=%PROJECT_DIR%alamaan_backend\env\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    echo ERROR: Python virtual environment not found at:
    echo %PYTHON_EXE%
    pause
    exit /b 1
)

"%PYTHON_EXE%" "%PROJECT_DIR%scripts\backup_sqlite.py" --force
set "BACKUP_RESULT=%ERRORLEVEL%"
if "%BACKUP_RESULT%"=="2" (
    echo.
    echo PostgreSQL is selected. Use the PostgreSQL pg_dump backup job instead.
    pause
    exit /b 2
) else if not "%BACKUP_RESULT%"=="0" (
    echo.
    echo Backup failed. Do not assume the current data is protected.
    pause
    exit /b 1
) else (
    echo.
    echo Backup completed successfully.
)
pause
exit /b 0
