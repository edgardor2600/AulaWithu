@echo off
title Liberador de Puertos AppAula
echo ==================================================
echo         Apagando Servicios de AppAula...          
echo ==================================================
echo.

:: Buscar y matar procesos en puerto 3002 (Express Backend)
echo Liberando puerto 3002 (Server)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

:: Buscar y matar procesos en puerto 5173 (Vite Client)
echo Liberando puerto 5173 (Client)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

:: Buscar y matar procesos en puerto 8080 (Python AI Tutor)
echo Liberando puerto 8080 (Python)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

:: Buscar y matar procesos en puerto 1234 (Yjs sync server)
echo Liberando puerto 1234 (Yjs)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :1234 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo ==================================================
echo   Todos los puertos han sido liberados con exito.
echo ==================================================
timeout /t 3
