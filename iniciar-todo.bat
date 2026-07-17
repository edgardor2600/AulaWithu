@echo off
title Lanzador AppAula
echo ==================================================
echo           Iniciando Servicios de AppAula          
echo ==================================================
echo.

:: 1. Iniciar Cliente (React - Vite) en puerto 5173
echo [1/3] Iniciando Cliente React...
start "Cliente - React (Puerto 5173)" cmd /k "cd client && npm run dev"

:: 2. Iniciar Servidor (Express - Node) en puerto 3002
echo [2/3] Iniciando Servidor Express...
start "Servidor - Backend (Puerto 3002)" cmd /k "cd server && npm run dev"

:: 3. Iniciar AI Tutor (Python) en puerto 8080
echo [3/3] Iniciando Servidor AI Tutor (Python)...
start "AI Tutor - Python (Puerto 8080)" cmd /k "cd tablero && python ai_tutor_server.py"

echo.
echo ==================================================
echo   Procesos iniciados en ventanas independientes.
echo   Puedes cerrarlos con la 'X' de cada ventana.
echo ==================================================
timeout /t 5
