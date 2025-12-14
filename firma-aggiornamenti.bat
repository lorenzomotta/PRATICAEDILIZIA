@echo off
REM Script per firmare i file .zip degli aggiornamenti DOPO la compilazione
REM IMPORTANTE: Esegui questo script in un terminale CMD (non PowerShell) per permettere input interattivo

REM Forza la visualizzazione degli errori
setlocal enabledelayedexpansion

REM Salva la directory corrente
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Verifica che siamo in CMD, non PowerShell
if "%PSModulePath%" NEQ "" (
    echo ERRORE: Questo script deve essere eseguito in CMD, non PowerShell!
    echo.
    echo Per eseguirlo correttamente:
    echo 1. Apri un nuovo terminale CMD (Win+R, digita "cmd", premi Invio)
    echo 2. Naviga nella cartella del progetto
    echo 3. Esegui: firma-aggiornamenti.bat
    echo.
    pause
    exit /b 1
)

echo ========================================
echo Firma file aggiornamenti
echo ========================================
echo.
echo Directory corrente: %CD%
echo.
echo IMPORTANTE: Questo script deve essere eseguito in un terminale CMD
echo (non PowerShell) per permettere l'inserimento della password.
echo.
echo Se stai usando PowerShell, apri un nuovo terminale CMD e esegui questo script.
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
set "NSIS_ZIP=%CD%\src-tauri\target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.nsis.zip"

echo Percorsi verificati:
echo - Chiave: %KEY_PATH%
echo - MSI zip: %MSI_ZIP%
echo - NSIS zip: %NSIS_ZIP%
echo.

REM Verifica che i file esistano
echo Controllo esistenza file...
echo.

if not exist "%MSI_ZIP%" (
    echo ERRORE: File MSI zip non trovato!
    echo Percorso atteso: %MSI_ZIP%
    echo.
    
    REM Verifica se esiste il file .msi senza .zip
    set "MSI_FILE=%CD%\src-tauri\target\release\bundle\msi\Pratica Edilizia_%VERSIONE%_x64_en-US.msi"
    if exist "%MSI_FILE%" (
        echo TROVATO: File .msi esiste ma manca il .zip
        echo File .msi: %MSI_FILE%
        echo.
        echo Devi creare il file .zip manualmente:
        echo 1. Vai nella cartella: src-tauri\target\release\bundle\msi
        echo 2. Clicca destro sul file .msi -^> "Invia a" -^> "Cartella compressa"
        echo 3. Rinomina il file .zip creato con il nome: Pratica Edilizia_%VERSIONE%_x64_en-US.msi.zip
    ) else (
        echo ERRORE: Anche il file .msi non esiste!
        echo Percorso atteso: %MSI_FILE%
        echo.
        echo Verifica che:
        echo 1. La versione inserita (%VERSIONE%) corrisponda alla versione compilata
        echo 2. L'applicazione sia stata compilata correttamente
        echo 3. La cartella src-tauri\target\release\bundle\msi esista
    )
    echo.
    pause
    exit /b 1
) else (
    echo OK: File MSI zip trovato
)

if not exist "%NSIS_ZIP%" (
    echo AVVISO: File NSIS zip non trovato (opzionale)
    echo Percorso atteso: %NSIS_ZIP%
    echo Continuo solo con il file MSI...
    echo.
) else (
    echo OK: File NSIS zip trovato
)

if not exist "%KEY_PATH%" (
    echo ERRORE: Chiave privata non trovata!
    echo Percorso atteso: %KEY_PATH%
    echo.
    echo Verifica che la chiave esista nella cartella src-tauri\keys\
    echo.
    pause
    exit /b 1
) else (
    echo OK: Chiave privata trovata
)

echo.
echo ========================================
echo Tutti i file necessari sono presenti!
echo ========================================
echo.
echo File che verranno firmati:
echo - Chiave: %KEY_PATH%
echo - MSI zip: %MSI_ZIP%
if exist "%NSIS_ZIP%" echo - NSIS zip: %NSIS_ZIP%
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
set "TAURI_DIR=%CD%\src-tauri"

if not exist "%TAURI_DIR%" (
    echo ERRORE: Cartella src-tauri non trovata!
    echo Percorso atteso: %TAURI_DIR%
    echo Directory corrente: %CD%
    pause
    exit /b 1
)

cd /d "%TAURI_DIR%"
set "CD_ERROR=%ERRORLEVEL%"
if !CD_ERROR! NEQ 0 (
    echo ERRORE: Impossibile accedere alla cartella src-tauri
    echo Percorso tentato: %TAURI_DIR%
    echo Codice errore: !CD_ERROR!
    pause
    exit /b 1
)

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

REM Firma NSIS solo se esiste
if exist "%NSIS_ZIP%" (
    echo.
    echo Firma file NSIS...
    echo.
    if defined PASSWORD (
        echo Eseguo: cargo tauri signer sign -f "keys\keypair.key" -p "***" "target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.nsis.zip"
        cargo tauri signer sign -f "keys\keypair.key" -p "%PASSWORD%" "target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.nsis.zip"
    ) else (
        echo Password non trovata nel file. Ti verra' chiesta manualmente.
        echo Eseguo: cargo tauri signer sign -f "keys\keypair.key" "target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.nsis.zip"
        cargo tauri signer sign -f "keys\keypair.key" "target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.nsis.zip"
    )

    set "NSIS_SIGN_ERROR=%ERRORLEVEL%"
    if !NSIS_SIGN_ERROR! NEQ 0 (
        echo.
        echo ERRORE durante la firma del file NSIS!
        echo Codice errore: !NSIS_SIGN_ERROR!
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
