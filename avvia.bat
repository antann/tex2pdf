@echo off
setlocal
cd /d "%~dp0"
title TEX2PDF

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non trovato. Installalo da https://nodejs.org e riprova.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Prima esecuzione: installazione delle dipendenze...
  call npm install || exit /b 1
)

if not exist motore\tectonic.exe (
  echo.
  echo   AVVISO: il motore di compilazione non c'e'.
  echo   L'interfaccia si apre lo stesso, ma non produrra' alcun PDF.
  echo   Esegui installa-motore.bat.
  echo.
)

if "%~1"=="--build" goto produzione

echo Avvio in sviluppo: interfaccia su 5173, compilatore su 4180.
start "TEX2PDF compilatore" cmd /c "node server\server.js"
start "TEX2PDF interfaccia" cmd /c "npm run dev"
timeout /t 5 /nobreak >nul
start "" http://localhost:5173
goto fine

:produzione
echo Compilazione dell'interfaccia...
call npm run build || exit /b 1
echo Avvio: tutto su 4180.
start "TEX2PDF compilatore" cmd /c "node server\server.js"
timeout /t 3 /nobreak >nul
start "" http://localhost:4180

:fine
echo.
echo Per fermare tutto: arresta.bat
