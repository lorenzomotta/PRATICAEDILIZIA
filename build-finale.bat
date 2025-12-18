@echo off
REM Script finale per compilare SENZA firmare gli aggiornamenti
REM Versione semplificata e robusta

echo ========================================
echo Compilazione Pratica Edilizia
echo ========================================
echo.
echo Questo script compila l'app SENZA firmare gli aggiornamenti.
echo Dopo la compilazione, esegui firma-aggiornamenti.bat per firmare i file .zip
echo.
pause

set "CONF_FILE=src-tauri\tauri.conf.json"

REM Verifica che il file esista
if not exist "%CONF_FILE%" (
    echo ERRORE: File di configurazione non trovato: %CONF_FILE%
    pause
    exit /b 1
)

REM Crea un backup
copy "%CONF_FILE%" "%CONF_FILE%.backup" >nul 2>&1

REM Disabilita aggiornamenti usando un approccio più semplice
echo Disabilitazione aggiornamenti...
findstr /V /C:"\"active\": true" "%CONF_FILE%" > "%CONF_FILE%.tmp" 2>nul
if exist "%CONF_FILE%.tmp" (
    echo "      \"active\": false," > "%CONF_FILE%.new"
    findstr /C:"\"updater\":" "%CONF_FILE%" >> "%CONF_FILE%.new" 2>nul
    findstr /C:"\"endpoints\":" "%CONF_FILE%" >> "%CONF_FILE%.new" 2>nul
    findstr /C:"\"dialog\":" "%CONF_FILE%" >> "%CONF_FILE%.new" 2>nul
    findstr /C:"\"pubkey\":" "%CONF_FILE%" >> "%CONF_FILE%.new" 2>nul
)

REM Usa PowerShell per modificare il JSON in modo più sicuro
powershell -NoProfile -ExecutionPolicy Bypass -Command "$json = Get-Content '%CONF_FILE%' -Raw | ConvertFrom-Json; $json.tauri.updater.active = $false; $json | ConvertTo-Json -Depth 10 | Set-Content '%CONF_FILE%'"

if %ERRORLEVEL% NEQ 0 (
    echo ERRORE durante la modifica della configurazione
    copy "%CONF_FILE%.backup" "%CONF_FILE%" >nul 2>&1
    del "%CONF_FILE%.backup" >nul 2>&1
    pause
    exit /b 1
)

echo Compilazione in corso (senza firma aggiornamenti)...
echo.

REM Compila
cd /d "%CD%"
call npm run build
set BUILD_RESULT=%ERRORLEVEL%

REM Ripristina configurazione
echo.
echo Ripristino configurazione...
copy "%CONF_FILE%.backup" "%CONF_FILE%" >nul 2>&1
del "%CONF_FILE%.backup" >nul 2>&1

echo.
if %BUILD_RESULT% EQU 0 (
    echo ========================================
    echo Compilazione completata!
    echo ========================================
    echo.
    echo Creazione file ZIP per aggiornamenti...
    call crea-zip-aggiornamenti.bat
    echo.
    echo IMPORTANTE: I file .zip NON sono firmati.
    echo Esegui ora: firma-aggiornamenti.bat
) else (
    echo ========================================
    echo ERRORE durante la compilazione
    echo ========================================
)

pause

