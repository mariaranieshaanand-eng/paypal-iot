@echo off
title Open Port 3000 in Windows Firewall (For Phone & ESP32)
echo ====================================================================
echo   Adding Windows Firewall Rule for Port 3000 (Private & Public)...
echo ====================================================================
netsh advfirewall firewall delete rule name="PayPalPort3000" >nul 2>&1
netsh advfirewall firewall add rule name="PayPalPort3000" dir=in action=allow protocol=TCP localport=3000 profile=any
echo.
echo If it says "Ok.", Port 3000 is open! Your phone and ESP32 can connect.
echo ====================================================================
pause
