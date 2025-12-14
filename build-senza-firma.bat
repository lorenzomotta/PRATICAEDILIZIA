@echo off
REM Script per compilare SENZA firmare gli aggiornamenti
REM Gli aggiornamenti verranno firmati separatamente dopo

echo ========================================
echo Compilazione Pratica Edilizia (SENZA firma aggiornamenti)
echo ========================================
echo.

set "CONF_FILE=src-tauri\tauri.conf.json"
set "CONF_BACKUP=src-tauri\tauri.conf.json.backup"

REM Crea un backup del file di configurazione
if exist "%CONF_FILE%" (
    copy "%CONF_FILE%" "%CONF_BACKUP%" >nul
    echo Backup configurazione creato
)

REM Disabilita temporaneamente gli aggiornamenti usando PowerShell
echo Disabilitazione temporanea degli aggiornamenti...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$content = Get-Content '%CONF_FILE%' -Raw; $content = $content -replace '\"active\":\s*true', '\"active\": false'; Set-Content '%CONF_FILE%' -Value $content -NoNewline"

if %ERRORLEVEL% NEQ 0 (
    echo ERRORE: Impossibile modificare la configurazione
    if exist "%CONF_BACKUP%" (
        copy "%CONF_BACKUP%" "%CONF_FILE%" >nul
        del "%CONF_BACKUP%" >nul
    )
    pause
    exit /b 1
)

echo Aggiornamenti disabilitati temporaneamente
echo.

REM Compila senza firmare
echo Avvio compilazione...
cd /d "%CD%"
call npm run build
set BUILD_EXIT=%ERRORLEVEL%

REM Ripristina la configurazione originale
echo.
echo Ripristino configurazione originale...
if exist "%CONF_BACKUP%" (
    copy "%CONF_BACKUP%" "%CONF_FILE%" >nul
    del "%CONF_BACKUP%" >nul
    echo Configurazione ripristinata
) else (
    REM Se non c'è backup, riabilita manualmente
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$content = Get-Content '%CONF_FILE%' -Raw; $content = $content -replace '\"active\":\s*false', '\"active\": true'; Set-Content '%CONF_FILE%' -Value $content -NoNewline"
    echo Configurazione ripristinata
)

echo.
if %BUILD_EXIT% EQU 0 (
    echo ========================================
    echo Compilazione completata con successo!
    echo ========================================
    echo.
    echo NOTA: I file .zip per gli aggiornamenti NON sono firmati.
    echo Per firmarli, esegui: firma-aggiornamenti.bat
) else (
    echo ========================================
    echo ERRORE durante la compilazione (codice: %BUILD_EXIT%)
    echo ========================================
)

echo.
pause
