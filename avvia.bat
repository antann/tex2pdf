@echo off
setlocal
cd /d "%~dp0"
title TEX2PDF

rem ===========================================================
rem  TEX2PDF - avvio
rem
rem    avvia.bat              apre l'applicazione (ricarica automatica)
rem    avvia.bat --build      compila e poi apre la versione compilata
rem    avvia.bat --browser    apre nel browser invece che in finestra
rem
rem  Per fermare tutto: arresta.bat
rem ===========================================================

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non trovato. Installalo da https://nodejs.org e riprova.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Prima esecuzione: installazione delle dipendenze...
  echo Viene scaricato anche Electron, quindi puo' richiedere qualche minuto.
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
if "%~1"=="--browser" goto browser

echo Apertura della finestra. Le modifiche al codice si ricaricano da sole.
echo La finestra puo' metterci qualche secondo: prima parte il server, poi si
echo apre la finestra. Il browser non viene usato.
start "TEX2PDF" cmd /c "npm run desktop || pause"
goto fine

:produzione
echo Compilazione dell'interfaccia...
call npm run build || exit /b 1
echo Apertura della finestra sulla versione compilata.
start "TEX2PDF" cmd /c "node electron\avvia-desktop.cjs --produzione || pause"
goto fine

:browser
echo Avvio nel browser: interfaccia su 5173, compilatore su 4180.
start "TEX2PDF compilatore" cmd /c "node server\server.js"
start "TEX2PDF interfaccia" cmd /c "npm run dev"
timeout /t 5 /nobreak >nul
start "" http://localhost:5173

:fine
echo.
echo Per fermare tutto: arresta.bat
timeout /t 4 >nul
