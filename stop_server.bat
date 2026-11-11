@echo off
title Stop PayPal Server
echo Stopping all running instances of the server...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Stopping PID %%a on port 3000...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Port 3000 is now free!
echo You can now double-click start_server.bat to start fresh.
pause
