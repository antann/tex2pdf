@echo off
setlocal
title TEX2PDF - arresto

echo Chiusura dei processi in ascolto su 4180 e 5173...
for %%P in (4180 5173) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr ":%%P " ^| findstr LISTENING') do (
    taskkill /pid %%I /f >nul 2>nul
  )
)
taskkill /fi "WINDOWTITLE eq TEX2PDF*" /f >nul 2>nul
echo Fatto.
