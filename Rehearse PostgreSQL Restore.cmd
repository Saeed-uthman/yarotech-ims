@echo off
setlocal
title Al-Amaan PostgreSQL Restore Rehearsal
set "PROJECT_DIR=%~dp0"
set "PYTHON_EXE=%PROJECT_DIR%alamaan_backend\env\Scripts\python.exe"

echo This restores into a SEPARATE existing test database and cleans its objects.
echo It refuses to use the live DB_NAME. Live media is never overwritten.
echo.
set /p "ARCHIVE_PATH=Full path to PostgreSQL backup ZIP: "
set /p "TARGET_DB=Existing rehearsal database name: "
set /p "CONFIRM_DB=Type the rehearsal database name again: "

"%PYTHON_EXE%" "%PROJECT_DIR%scripts\rehearse_postgres_restore.py" "%ARCHIVE_PATH%" "%TARGET_DB%" --confirm "%CONFIRM_DB%"
set "RESTORE_RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESTORE_RESULT%
