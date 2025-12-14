@echo off
REM Script semplice per compilare l'app
REM La password va inserita MANUALMENTE quando richiesta nel terminale

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

REM Esegui la compilazione - l'utente inserirà la password manualmente quando richiesta
cd /d "%CD%"
npm run build

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

