@echo off
REM Cloudflare Tunnel Script (Windows)
REM Exposes local server to internet for testing

echo 🌐 Starting Cloudflare Tunnel...
echo.
echo ⚠️  Make sure cloudflared is installed:
echo    Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
echo.

REM Check if cloudflared is installed
where cloudflared >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ cloudflared not found. Please install it first.
    pause
    exit /b 1
)

REM Start tunnel
echo 🚀 Starting tunnel to http://localhost:3002...
echo.
cloudflared tunnel --url http://localhost:3002

REM Note: The URL will be printed by cloudflared
REM Share that URL with students/testers
