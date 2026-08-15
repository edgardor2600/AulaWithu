@echo off
title Apagador y Liberador de Puertos AppAula
echo ==================================================
echo         Apagando Servicios de AppAula...          
echo ==================================================
echo.

:: Lista de todos los puertos de AppAula
set PUERTOS=3000 3001 3002 3003 5173 5174 1234

for %%p in (%PUERTOS%) do (
    echo [*] Verificando y liberando puerto %%p...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p ^| findstr LISTENING') do (
        taskkill /F /T /PID %%a 2>nul
    )
)

echo.
echo ==================================================
echo   Todos los servicios y puertos han sido liberados.
echo ==================================================
timeout /t 3
