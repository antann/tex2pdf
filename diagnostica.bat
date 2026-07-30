@echo off
setlocal enabledelayedexpansion
title TEX2PDF - diagnostica
cd /d "%~dp0"

rem ===========================================================
rem  TEX2PDF - diagnostica
rem  Controlla ambiente, file di progetto, motore, template,
rem  dipendenze e porte, e dice che cosa manca. Non modifica nulla.
rem ===========================================================

echo.
echo   TEX2PDF - diagnostica
echo   =====================
echo   Cartella: %CD%
echo.

set "PROBLEMI=0"

echo   [1] Ambiente
echo   ------------
where node >nul 2>nul
if errorlevel 1 (
  echo       Node.js         NON TROVATO
  echo                       Installalo da https://nodejs.org ^(versione 18 o successiva^)
  set /a PROBLEMI+=1
) else (
  for /f "delims=" %%V in ('node -v') do echo       Node.js         %%V
)

where npm >nul 2>nul
if errorlevel 1 (
  echo       npm             NON TROVATO
  set /a PROBLEMI+=1
) else (
  for /f "delims=" %%V in ('npm -v') do echo       npm             %%V
)

echo.
echo   [2] File del progetto
echo   ---------------------
call :CONTROLLA "package.json"
call :CONTROLLA "index.html"
call :CONTROLLA "vite.config.js"
call :CONTROLLA "server\server.js"
call :CONTROLLA "server\percorsi.js"
call :CONTROLLA "server\catalogo.js"
call :CONTROLLA "server\composizione.js"
call :CONTROLLA "server\compilatore.js"
call :CONTROLLA "server\registro.js"
call :CONTROLLA "electron\main.cjs"
call :CONTROLLA "electron\preload.cjs"
call :CONTROLLA "electron\avvia-desktop.cjs"
call :CONTROLLA "electron\controlla-pacchetto.cjs"
call :CONTROLLA "src\main.jsx"
call :CONTROLLA "src\App.jsx"
call :CONTROLLA "src\styles.css"
call :CONTROLLA "src\components\Editor.jsx"
call :CONTROLLA "src\components\Anteprima.jsx"
call :CONTROLLA "src\components\Pannelli.jsx"
call :CONTROLLA "src\components\Registro.jsx"
call :CONTROLLA "src\lib\rilevamento.js"
call :CONTROLLA "src\lib\api.js"
call :CONTROLLA "src\lib\esempio.js"
call :CONTROLLA "public\logo.svg"
call :CONTROLLA "risorse\icona.ico"

echo.
echo   [3] Motore
echo   ----------
if not exist "motore\tectonic.exe" (
  echo       tectonic.exe    MANCANTE
  echo                       Senza motore l'interfaccia si apre ma non
  echo                       produce alcun PDF. Lancia: installa-motore.bat
  set /a PROBLEMI+=1
) else (
  rem tectonic -V scrive due volte sulla stessa riga e senza andare a capo:
  rem "tectonic 0.15.0Tectonic 0.15.0". Si taglia alla T maiuscola, che nella
  rem prima meta' non compare; se un giorno stampasse una volta sola, il
  rem taglio non trova nulla e resta la riga intera.
  set "VERSIONEMOTORE="
  for /f "delims=T" %%V in ('motore\tectonic.exe -V 2^>nul') do if not defined VERSIONEMOTORE set "VERSIONEMOTORE=%%V"
  if defined VERSIONEMOTORE (
    echo       tectonic.exe    !VERSIONEMOTORE!
  ) else (
    echo       tectonic.exe    PRESENTE MA NON RISPONDE
    echo                       Il file c'e' ma non si esegue: scaricalo di
    echo                       nuovo con installa-motore.bat
    set /a PROBLEMI+=1
  )
  rem La cache si riempie alla prima compilazione: vuota non e' un guasto,
  rem ma spiega perche' il primo PDF ci mette molto piu' degli altri.
  if exist "motore\cache" (
    echo       cache           presente
  ) else (
    echo       cache           assente - la prima compilazione scarica i
    echo                       pacchetti e sara' lenta
  )
)

echo.
echo   [4] Template
echo   ------------
rem Gli stessi quattro file che pretende catalogo.js: una cartella a cui ne
rem manca uno compare nella galleria marcata come non valida.
set "TEMPLATE=0"
for /d %%T in ("template\*") do (
  set /a TEMPLATE+=1
  call :TEMPLATE "%%~nxT"
)
if "!TEMPLATE!"=="0" (
  echo       nessun template  la galleria resterebbe vuota
  set /a PROBLEMI+=1
)

echo.
echo   [5] Dipendenze
echo   --------------
if not exist "node_modules" (
  echo       node_modules    ASSENTE
  echo                       Lancia: npm install    ^(oppure avvia.bat^)
  set /a PROBLEMI+=1
) else (
  echo       node_modules    presente
  if exist "node_modules\electron\dist\electron.exe" (
    echo       electron        presente
  ) else (
    echo       electron        INCOMPLETO
    echo                       Il download di Electron non e' andato a buon fine.
    echo                       Lancia: npm install
    set /a PROBLEMI+=1
  )
  call :MODULO "vite"
  call :MODULO "codemirror"
  call :MODULO "pdfjs-dist"
)

echo.
echo   [6] Porte
echo   ---------
call :PORTA 5173 "interfaccia in sviluppo"
call :PORTA 4180 "compilatore nel browser"

echo.
echo   =====================
if "!PROBLEMI!"=="0" (
  echo   Tutto a posto. Per avviare l'applicazione:
  echo.
  echo       avvia.bat              apre la finestra dell'applicazione
  echo       avvia.bat --build      compila e apre la versione compilata
  echo       avvia.bat --browser    apre nel browser
  echo       arresta.bat            chiude tutto
  echo.
  echo   Non serve mai lanciare "node" a mano: gli script passano da npm.
) else if "!PROBLEMI!"=="1" (
  echo   Trovato 1 problema: sopra c'e' scritto come risolverlo.
) else (
  echo   Trovati !PROBLEMI! problemi: sopra c'e' scritto come risolverli.
)
echo.
pause
endlocal
exit /b 0

:CONTROLLA
if exist "%~1" (
  echo       %~1
) else (
  echo       %~1   MANCANTE
  set /a PROBLEMI+=1
)
exit /b 0

:MODULO
rem I nomi hanno lunghezze diverse: si allineano alla colonna delle altre voci.
set "NOME=%~1                "
set "NOME=!NOME:~0,16!"
if exist "node_modules\%~1" (
  echo       !NOME!presente
) else (
  echo       !NOME!ASSENTE - lancia: npm install
  set /a PROBLEMI+=1
)
exit /b 0

:TEMPLATE
set "MANCA="
for %%F in (template.json preambolo.tex apertura.tex chiusura.tex) do (
  if not exist "template\%~1\%%F" set "MANCA=!MANCA! %%F"
)
if defined MANCA (
  echo       %~1   NON VALIDO - manca:!MANCA!
  set /a PROBLEMI+=1
) else (
  echo       %~1
)
exit /b 0

:PORTA
set "OCCUPATA="
for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:"LISTENING" ^| findstr ":%~1 "') do set "OCCUPATA=%%A"
if defined OCCUPATA (
  echo       %~1            occupata dal processo !OCCUPATA! ^(%~2^)
  echo                       Se non serve piu': arresta.bat
) else (
  echo       %~1            libera ^(%~2^)
)
exit /b 0
