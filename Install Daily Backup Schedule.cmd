@echo off
setlocal
title Install Al-Amaan Daily Backup Schedule
set "TASK_NAME=Al-Amaan Pharmacy Verified Backup"
set "BACKUP_RUNNER=%~dp0scripts\run_scheduled_backup.cmd"

echo This installs a daily verified backup task for the current Windows user.
echo Scheduled time: 8:00 PM. The backup interval setting still prevents duplicates.
echo.
choice /c YN /n /m "Install or replace this scheduled task? [Y/N]: "
if errorlevel 2 exit /b 0

schtasks.exe /Create /F /SC DAILY /ST 20:00 /TN "%TASK_NAME%" /TR "\"%BACKUP_RUNNER%\"" /RL LIMITED
if errorlevel 1 (
    echo.
    echo ERROR: The scheduled task could not be installed.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$task = Get-ScheduledTask -TaskName '%TASK_NAME%'; $task.Settings.DisallowStartIfOnBatteries = $false; $task.Settings.StopIfGoingOnBatteries = $false; Set-ScheduledTask -InputObject $task | Out-Null"
if errorlevel 1 (
    echo WARNING: The task was installed, but its battery settings could not be updated.
    echo Open Task Scheduler and allow the task to start while on battery power.
)

echo.
echo Daily backup task installed successfully.
echo You can inspect or run it from Windows Task Scheduler.
pause
exit /b 0
