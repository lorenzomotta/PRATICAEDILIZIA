@echo off
REM Script per firmare i file .zip degli aggiornamenti DOPO la compilazione
REM IMPORTANTE: Esegui questo script in un terminale CMD (non PowerShell) per permettere input interattivo

REM Forza la visualizzazione degli errori
setlocal enabledelayedexpansion

REM Salva la directory corrente
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Nota: Questo script funziona sia in CMD che in PowerShell
REM L'importante è che quando viene richiesta la password, la inserisci manualmente

echo ========================================
echo Firma file aggiornamenti
echo ========================================
echo.
echo Directory corrente: %CD%
echo.
echo IMPORTANTE: Quando viene richiesta la password, inseriscila MANUALMENTE
echo e premi Invio. Non copiare/incollare la password.
echo.
pause

REM Chiedi la versione all'utente
set /p VERSIONE="Inserisci la versione (es: 1.1.0): "
if "%VERSIONE%"=="" (
    echo ERRORE: Versione non specificata!
    pause
    exit /b 1
)

echo.
echo Verifica percorsi per versione %VERSIONE%...
echo.

set "KEY_PATH=%CD%\src-tauri\keys\keypair.key"
set "MSI_ZIP=%CD%\src-tauri\target\release\bundle\msi\Pratica Edilizia_%VERSIONE%_x64_en-US.msi.zip"
set "NSIS_ZIP=%CD%\src-tauri\target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.exe.zip"

echo Percorsi che verranno usati:
echo - Chiave: %KEY_PATH%
echo - MSI zip: %MSI_ZIP%
echo - NSIS zip: %NSIS_ZIP%
echo.
echo Avvio firma...
echo.
echo IMPORTANTE: Ti verra' chiesta la password. Inseriscila MANUALMENTE e premi Invio.
echo.
pause

REM Leggi la password dal file
set "PASSWORD_FILE=%CD%\src-tauri\password.txt"
set "PASSWORD="

if exist "%PASSWORD_FILE%" (
    for /f "usebackq delims=" %%a in ("%PASSWORD_FILE%") do set "PASSWORD=%%a"
)

REM Vai nella cartella src-tauri
set "ORIGINAL_DIR=%CD%"
cd /d "%CD%\src-tauri"

REM Firma i file usando la sintassi corretta
echo Firma file MSI...
echo.

if defined PASSWORD (
    echo Eseguo: cargo tauri signer sign -f "keys\keypair.key" -p "***" "target\release\bundle\msi\Pratica Edilizia_%VERSIONE%_x64_en-US.msi.zip"
    cargo tauri signer sign -f "keys\keypair.key" -p "%PASSWORD%" "target\release\bundle\msi\Pratica Edilizia_%VERSIONE%_x64_en-US.msi.zip"
) else (
    echo Password non trovata nel file. Ti verra' chiesta manualmente.
    echo Eseguo: cargo tauri signer sign -f "keys\keypair.key" "target\release\bundle\msi\Pratica Edilizia_%VERSIONE%_x64_en-US.msi.zip"
    cargo tauri signer sign -f "keys\keypair.key" "target\release\bundle\msi\Pratica Edilizia_%VERSIONE%_x64_en-US.msi.zip"
)

set "SIGN_ERROR=%ERRORLEVEL%"
if !SIGN_ERROR! NEQ 0 (
    echo.
    echo ERRORE durante la firma del file MSI!
    echo Codice errore: !SIGN_ERROR!
    echo.
    echo Controlla:
    echo 1. Che la password sia corretta
    echo 2. Che la chiave privata sia valida
    echo 3. Che il file .zip non sia corrotto
    echo 4. Che cargo tauri signer sia installato correttamente
    echo.
    cd /d "%ORIGINAL_DIR%"
    pause
    exit /b 1
)

REM Firma NSIS (se esiste)
echo.
echo Firma file NSIS (se presente)...
    echo.

REM Verifica se il file ZIP NSIS esiste
if not exist "target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.exe.zip" (
    echo ⚠ File ZIP NSIS non trovato: Pratica Edilizia_%VERSIONE%_x64-setup.exe.zip
    echo    Esegui crea-zip-aggiornamenti.bat per crearlo.
    echo.
) else (
    if defined PASSWORD (
        echo Eseguo: cargo tauri signer sign -f "keys\keypair.key" -p "***" "target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.exe.zip"
        cargo tauri signer sign -f "keys\keypair.key" -p "%PASSWORD%" "target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.exe.zip"
    ) else (
        echo Password non trovata nel file. Ti verra' chiesta manualmente.
        echo Eseguo: cargo tauri signer sign -f "keys\keypair.key" "target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.exe.zip"
        cargo tauri signer sign -f "keys\keypair.key" "target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.exe.zip"
    )

    set "NSIS_SIGN_ERROR=%ERRORLEVEL%"
    if !NSIS_SIGN_ERROR! NEQ 0 (
        echo.
        echo ERRORE durante la firma del file NSIS!
        echo Codice errore: !NSIS_SIGN_ERROR!
        echo.
    )
)

cd /d "%ORIGINAL_DIR%"

echo.
echo ========================================
echo Firma completata con successo!
echo ========================================
echo.
echo I file .zip sono ora firmati e pronti per gli aggiornamenti automatici.
echo.
pause

endlocal
