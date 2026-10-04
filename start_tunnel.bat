@echo off
title HealthPulse - Cloudflare Tunnel
color 0A
echo.
echo =====================================================
echo   HEALTHCARE MONITORING SYSTEM - CLOUDFLARE TUNNEL
echo   Free Public HTTPS Tunnel for Backend API
echo =====================================================
echo.

:: Check if cloudflared.exe exists, download if not
if not exist cloudflared.exe (
    echo [DOWNLOADING] cloudflared.exe from GitHub...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    echo [DOWNLOADED] cloudflared.exe ready.
    echo.
)

echo [STARTING] Cloudflare Tunnel on http://localhost:8000
echo [INFO] No Cloudflare account or login required.
echo [INFO] Public HTTPS URL will appear below once connected.
echo.
echo =====================================================

python start_tunnel.py
pause
