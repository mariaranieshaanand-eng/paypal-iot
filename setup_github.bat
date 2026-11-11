@echo off
title PayPal IoT - GitHub Setup Assistant
cd /d "%~dp0"

echo =================================================================
echo   GitHub Repository Setup Assistant for Your Team
echo =================================================================
echo.

where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Git is not currently installed or not in your system PATH.
    echo.
    echo To upload to GitHub, you have two quick options:
    echo   Option 1 (Recommended): Download "GitHub Desktop"
    echo            https://desktop.github.com/
    echo            Then click "Add Existing Repository from your Hard Drive"
    echo            and select this folder:
    echo            %~dp0
    echo.
    echo   Option 2: Download & install Git for Windows:
    echo            https://git-scm.com/download/win
    echo            Once installed, run this script again!
    echo.
    echo =================================================================
    pause
    exit /b 1
)

echo [✓] Git was found on your system!
echo.
echo Step 1: Create a new empty repository on https://github.com/new
echo         (Do NOT check "Add a README" or ".gitignore", as we already created them)
echo.
set /p REPO_URL="Step 2: Paste your GitHub repository URL here and press Enter: "

if "%REPO_URL%"=="" (
    echo [!] No URL was provided. Exiting.
    pause
    exit /b 1
)

echo.
echo Initializing Git repository...
if not exist ".git" (
    git init
)

git branch -M main
git add .
git commit -m "Initial commit: PayPal IoT Autonomous Retail & Auto-Billing System"

git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo Pushing code to GitHub...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =================================================================
    echo   [SUCCESS] Code published to GitHub!
    echo =================================================================
    echo.
    echo Next Steps to add your teammates:
    echo   1. Go to your repository on github.com
    echo   2. Click "Settings" (top tab) -> "Collaborators"
    echo   3. Click "Add people" and enter their GitHub usernames or emails!
    echo =================================================================
) else (
    echo.
    echo [!] Push failed. Please check your GitHub repository URL or sign in credentials.
)

pause
