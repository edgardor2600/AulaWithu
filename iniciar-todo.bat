@echo off
title Lanzador AppAula
echo ==================================================
echo           Iniciando Servicios de AppAula          
echo ==================================================
echo.

:: 1. Limpieza preventiva de puertos para evitar colisiones
echo [*] Verificando y liberando puertos previos...
for %%p in (3000 3001 3002 3003 5173 5174 1234) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p ^| findstr LISTENING') do (
        taskkill /F /T /PID %%a 2>nul
    )
)

:: 2. Iniciar Servidor Backend (Express + Yjs en 3002 y 1234)
echo [1/2] Iniciando Servidor Backend (Node/Express)...
start "AppAula - Backend (Puerto 3002)" cmd /k "cd server && npm run dev"

:: 3. Iniciar Cliente Frontend (React en 5173)
echo [2/2] Iniciando Cliente Frontend (React/Vite)...
start "AppAula - Frontend (Puerto 5173)" cmd /k "cd client && npm run dev"

echo.
echo ==================================================
echo   Servicios de AppAula iniciados con exito.
echo ==================================================
timeout /t 3
