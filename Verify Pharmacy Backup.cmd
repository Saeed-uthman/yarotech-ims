@echo off
setlocal
title Verify Al-Amaan Pharmacy Backup
set "PROJECT_DIR=%~dp0"
set "PYTHON_EXE=%PROJECT_DIR%alamaan_backend\env\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    echo ERROR: Python virtual environment was not found.
    pause
    exit /b 1
)
if "%~1"=="" (
    echo Drag a pharmacy backup ZIP file onto this command file to verify it.
    echo No live database or media files will be changed.
    pause
    exit /b 1
)

"%PYTHON_EXE%" "%PROJECT_DIR%scripts\verify_backup.py" "%~1"
set "VERIFY_RESULT=%ERRORLEVEL%"
echo.
if not "%VERIFY_RESULT%"=="0" echo Verification failed. Do not rely on this archive.
pause
exit /b %VERIFY_RESULT%
