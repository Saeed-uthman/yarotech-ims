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

for /f "tokens=1,* delims==" %%A in ('findstr /b /i "DB_ENGINE=" "%PROJECT_DIR%.env" 2^>nul') do set "DB_ENGINE=%%B"
if not defined DB_ENGINE for /f "tokens=1,* delims==" %%A in ('findstr /b /i "DB_ENGINE=" "%PROJECT_DIR%alamaan_backend\.env" 2^>nul') do set "DB_ENGINE=%%~B"
set "DB_ENGINE=%DB_ENGINE:"=%"
if /i "%DB_ENGINE%"=="postgresql" (
    "%PYTHON_EXE%" "%PROJECT_DIR%scripts\backup_postgres.py" --force
) else if /i "%DB_ENGINE%"=="postgres" (
    "%PYTHON_EXE%" "%PROJECT_DIR%scripts\backup_postgres.py" --force
) else (
    "%PYTHON_EXE%" "%PROJECT_DIR%scripts\backup_sqlite.py" --force
)
set "BACKUP_RESULT=%ERRORLEVEL%"
if not "%BACKUP_RESULT%"=="0" (
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
