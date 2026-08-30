@echo off
setlocal
set "PROJECT_DIR=%~dp0..\"
set "PYTHON_EXE=%PROJECT_DIR%alamaan_backend\env\Scripts\python.exe"
if not exist "%PYTHON_EXE%" exit /b 1

for /f "tokens=1,* delims==" %%A in ('findstr /b /i "DB_ENGINE=" "%PROJECT_DIR%.env" 2^>nul') do set "DB_ENGINE=%%B"
if not defined DB_ENGINE for /f "tokens=1,* delims==" %%A in ('findstr /b /i "DB_ENGINE=" "%PROJECT_DIR%alamaan_backend\.env" 2^>nul') do set "DB_ENGINE=%%~B"
set "DB_ENGINE=%DB_ENGINE:"=%"
if /i "%DB_ENGINE%"=="postgresql" (
    "%PYTHON_EXE%" "%PROJECT_DIR%scripts\backup_postgres.py"
) else if /i "%DB_ENGINE%"=="postgres" (
    "%PYTHON_EXE%" "%PROJECT_DIR%scripts\backup_postgres.py"
) else (
    "%PYTHON_EXE%" "%PROJECT_DIR%scripts\backup_sqlite.py"
)
exit /b %ERRORLEVEL%
