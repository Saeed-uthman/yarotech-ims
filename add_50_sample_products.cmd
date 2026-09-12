@echo off
setlocal
cd /d "%~dp0alamaan_backend"
if not exist "venv\Scripts\python.exe" (
  echo Backend Python environment not found: alamaan_backend\venv
  exit /b 1
)
if "%~1"=="" (
  echo Usage: add_50_sample_products.cmd "your-login-email" [--dry-run]
  exit /b 1
)
"venv\Scripts\python.exe" manage.py seed_sample_products --actor-email "%~1" %2
exit /b %errorlevel%
