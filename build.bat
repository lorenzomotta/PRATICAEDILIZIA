@echo off
REM Script per compilare l'app con supporto per la firma degli aggiornamenti

echo ========================================
echo Compilazione Pratica Edilizia
echo ========================================
echo.

REM Imposta il percorso della chiave privata
set "TAURI_PRIVATE_KEY=%CD%\src-tauri\keys\keypair.key"

REM Verifica che la chiave esista
if not exist "%TAURI_PRIVATE_KEY%" (
    echo ERRORE: Chiave privata non trovata in %TAURI_PRIVATE_KEY%
    echo Esegui prima genera-chiavi.bat per generare le chiavi.
    pause
    exit /b 1
)

echo Chiave privata trovata: %TAURI_PRIVATE_KEY%
echo.
echo NOTA: Ti verra' chiesta la password della chiave privata durante la compilazione.
echo.
echo Avvio compilazione...
echo.

REM Esegui la compilazione direttamente nel terminale corrente
REM Questo permette l'input interattivo per la password
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Compilazione completata con successo!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ERRORE durante la compilazione
    echo ========================================
)

pause

