@echo off
title SocialPilot Launcher
cd /d "%~dp0"

echo ========================================================
echo         Launching SocialPilot Desktop App
echo ========================================================
echo.

:: 1. Check if backend is already running on port 8000
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [1/3] Starting SocialPilot Backend Engine...
    start /min "SocialPilot_Backend" cmd /c "cd /d "%~dp0backend" && .\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
) else (
    echo [1/3] Backend is already running on port 8000.
)

:: 2. Check if frontend is already running on port 3000
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [2/3] Starting SocialPilot Frontend Application...
    start /min "SocialPilot_Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"
    echo Waiting for application server to initialize...
    timeout /t 5 /nobreak >nul
) else (
    echo [2/3] Frontend is already running on port 3000.
)

:: 3. Launch in Native Standalone App Mode (No browser address bar or tabs)
echo [3/3] Launching SocialPilot in App Mode...

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000/dashboard" --window-size=1366,860
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000/dashboard" --window-size=1366,860
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://localhost:3000/dashboard" --window-size=1366,860
) else (
    start "" "http://localhost:3000/dashboard"
)

echo.
echo ========================================================
echo   SocialPilot is now running in App Window mode!
echo   To stop the application, run Stop_SocialPilot.bat
echo ========================================================
timeout /t 3 >nul
exit
