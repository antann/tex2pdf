@echo off
setlocal
cd /d "%~dp0"
title TEX2PDF - installazione del motore

set VERSIONE=0.15.0
set ASSET=tectonic-%VERSIONE%-x86_64-pc-windows-msvc.zip
set URL=https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%%40%VERSIONE%/%ASSET%

if not exist motore mkdir motore

if exist motore\tectonic.exe (
  echo Il motore c'e' gia'. Per reinstallarlo, cancella motore\tectonic.exe.
) else (
  echo Scaricamento di Tectonic %VERSIONE%...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri '%URL%' -OutFile 'motore\%ASSET%'"
  if errorlevel 1 (
    echo Scaricamento non riuscito. Controlla la connessione, oppure scarica a mano
    echo   %URL%
    echo e metti tectonic.exe nella cartella motore\.
    pause
    exit /b 1
  )
  echo Estrazione...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Expand-Archive -Force -Path 'motore\%ASSET%' -DestinationPath 'motore'"
  del /q "motore\%ASSET%" >nul 2>nul
)

if not exist motore\tectonic.exe (
  echo L'archivio non conteneva tectonic.exe. Installazione interrotta.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installazione delle dipendenze...
  call npm install || exit /b 1
)

echo.
echo Prima compilazione di tutti i template.
echo Il motore scarica ora i pacchetti LaTeX che gli servono: servono qualche
echo minuto e una connessione attiva. Succede una volta sola.
echo.
call npm run scalda
pause
