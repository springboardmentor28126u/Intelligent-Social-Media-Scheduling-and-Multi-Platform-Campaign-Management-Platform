@echo off
title Stop SocialPilot
cd /d "%~dp0"

echo ========================================================
echo         Stopping SocialPilot Background Services
echo ========================================================
echo.

echo Terminating Backend & Frontend processes...

:: Stop process listening on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Stop process listening on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo SocialPilot servers stopped successfully!
timeout /t 2 >nul
exit
