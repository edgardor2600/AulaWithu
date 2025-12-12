@echo off
REM Script para arrancar server y client en paralelo (Windows)

echo 🚀 Starting Aula Colaborativa...

REM Start server in new window
echo 📡 Starting server...
start "Aula Server" cmd /k "cd server && npm run dev"

REM Wait a bit
timeout /t 3 /nobreak > nul

REM Start client in new window
echo 🎨 Starting client...
start "Aula Client" cmd /k "cd client && npm run dev"

echo.
echo ✅ Both services started in separate windows!
echo.
echo 📍 URLs:
echo    API: http://localhost:3002
echo    Client: http://localhost:5173
echo.
echo Close the terminal windows to stop services
pause
