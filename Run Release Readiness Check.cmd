@echo off
setlocal
title Al-Amaan Pharmacy Release Readiness
set "PROJECT_DIR=%~dp0"
set "PYTHON_EXE=%PROJECT_DIR%alamaan_backend\env\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    echo ERROR: Backend virtual-environment Python was not found:
    echo %PYTHON_EXE%
    pause
    exit /b 1
)

"%PYTHON_EXE%" "%PROJECT_DIR%scripts\release_readiness.py"
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="0" (
    echo Automated release-readiness checks passed.
) else (
    echo Release-readiness checks failed. Review the failed step above.
)
pause
exit /b %RESULT%
