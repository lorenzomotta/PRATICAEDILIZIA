@echo off
REM Script che esegue cargo tauri build direttamente (senza npm)
REM Questo dovrebbe permettere l'input interattivo per la password

echo ========================================
echo Compilazione Pratica Edilizia
echo ========================================
echo.
echo IMPORTANTE: Quando viene richiesta la password, inseriscila MANUALMENTE
echo nel terminale e premi Invio.
echo.
echo Premi un tasto per continuare...
pause >nul

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
echo Avvio compilazione...
echo.

REM Vai nella cartella src-tauri e esegui cargo tauri build direttamente
cd /d "%CD%\src-tauri"
cargo tauri build

REM Torna alla root
cd /d "%CD%\.."

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

