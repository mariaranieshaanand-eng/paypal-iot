@echo off
title PayPal IoT Auto-Billing Server
cd /d "%~dp0"

echo =================================================================
echo   Starting PayPal IoT Auto-Billing Server...
echo =================================================================

:: 1. Automatically free port 3000 if an orphaned process is holding it
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Auto-launch default browser after brief pause so server binds first
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: 3. Try Antigravity's Console Node wrapper first (stable console CLI)
if exist "%APPDATA%\Antigravity\bin\agy-node.cmd" (
    call "%APPDATA%\Antigravity\bin\agy-node.cmd" "%~dp0server.js"
    goto end
)

:: 4. Fallback to global node if installed
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    node "%~dp0server.js"
    goto end
)

:: 5. Fallback to Antigravity Electron engine with RUN_AS_NODE flag
set ELECTRON_RUN_AS_NODE=1
if exist "%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe" (
    "%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe" "%~dp0server.js"
    goto end
)

echo [ERROR] No suitable Node.js runtime was found.
echo Please ensure Antigravity or Node.js is installed.

:end
echo.
echo =================================================================
echo Server has stopped. Press any key to close this window.
echo =================================================================
pause
