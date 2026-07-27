@echo off
setlocal
cd /d "%~dp0"
title TEX2PDF - arresto

rem Si chiudono solo le finestre avviate da questa cartella: chi ha installato
rem l'applicazione e la sta usando non deve vedersela sparire per un comando
rem dato dentro il repository.
echo Chiusura delle finestre avviate da questa cartella...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$qui = (Get-Location).Path;" ^
  "Get-CimInstance Win32_Process -Filter \"Name='electron.exe' or Name='TEX2PDF.exe'\" |" ^
  "  Where-Object { $_.CommandLine -and $_.CommandLine -like ('*' + $qui + '*') } |" ^
  "  ForEach-Object { Write-Host ('   chiudo il processo ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force }" 2>nul

echo Chiusura dei processi in ascolto su 4180 e 5173...
for %%P in (4180 5173) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr ":%%P " ^| findstr LISTENING') do (
    taskkill /pid %%I /f >nul 2>nul
  )
)
taskkill /fi "WINDOWTITLE eq TEX2PDF*" /f >nul 2>nul
echo Fatto.
