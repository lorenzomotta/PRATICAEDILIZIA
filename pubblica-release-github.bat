@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Pubblicazione Release su GitHub
echo ========================================
echo.

cd /d "%~dp0"

REM Verifica che ci sia un repository Git
git status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERRORE: Questa directory non è un repository Git!
    echo Inizializza prima un repository Git o naviga nella directory corretta.
    pause
    exit /b 1
)

REM Leggi la versione da tauri.conf.json usando PowerShell
echo Lettura versione da tauri.conf.json...
for /f "delims=" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$json = Get-Content 'src-tauri\tauri.conf.json' -Raw | ConvertFrom-Json; Write-Output $json.package.version"') do set VERSIONE=%%i

if "%VERSIONE%"=="" (
    echo ERRORE: Impossibile leggere la versione da tauri.conf.json!
    echo Inserisci manualmente la versione:
    set /p VERSIONE="Versione (es: 1.1.2): "
if "%VERSIONE%"=="" (
    echo ERRORE: Versione non specificata!
    pause
    exit /b 1
    )
)

echo Versione rilevata: %VERSIONE%
echo.

REM Chiedi informazioni all'utente
set /p TITOLO="Titolo release (predefinito: Release %VERSIONE%): "
if "%TITOLO%"=="" set TITOLO=Release %VERSIONE%

set /p DESCRIZIONE="Descrizione (opzionale): "

REM Prova a leggere il repository remoto
echo.
echo Lettura repository GitHub...
for /f "tokens=2" %%i in ('git remote get-url origin 2^>nul') do (
    set REMOTE_URL=%%i
    goto :parse_repo
)
:parse_repo
if defined REMOTE_URL (
    REM Rimuovi .git se presente
    set REPO=!REMOTE_URL:.git=!
    REM Estrai username/repo
    for /f "tokens=2 delims=:" %%a in ("!REPO!") do set REPO=%%a
    echo Repository rilevato: !REPO!
) else (
    set /p REPO="Repository GitHub (es: lorenzomotta/PRATICAEDILIZIA): "
)

if "%REPO%"=="" (
    echo ERRORE: Repository GitHub non specificato!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Preparazione release...
echo ========================================
echo Versione: %VERSIONE%
echo Titolo: %TITOLO%
echo Repository: %REPO%
echo.

REM Verifica che i file esistano
set MSI_ZIP=src-tauri\target\release\bundle\msi\Pratica Edilizia_%VERSIONE%_x64_en-US.msi.zip
set MSI_SIG=src-tauri\target\release\bundle\msi\Pratica Edilizia_%VERSIONE%_x64_en-US.msi.zip.sig
set NSIS_ZIP=src-tauri\target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.exe.zip
set NSIS_SIG=src-tauri\target\release\bundle\nsis\Pratica Edilizia_%VERSIONE%_x64-setup.exe.zip.sig

echo Verifica file...
set FILE_MANCANTI=0

if not exist "%MSI_ZIP%" (
    echo [X] File MSI ZIP non trovato: %MSI_ZIP%
    set FILE_MANCANTI=1
) else (
    echo [OK] File MSI ZIP trovato: %MSI_ZIP%
)

if not exist "%MSI_SIG%" (
    echo [X] File MSI SIG non trovato: %MSI_SIG%
    set FILE_MANCANTI=1
) else (
    echo [OK] File MSI SIG trovato: %MSI_SIG%
)

if not exist "%NSIS_ZIP%" (
    echo [X] File NSIS ZIP non trovato: %NSIS_ZIP%
    set FILE_MANCANTI=1
) else (
    echo [OK] File NSIS ZIP trovato: %NSIS_ZIP%
)

if not exist "%NSIS_SIG%" (
    echo [X] File NSIS SIG non trovato: %NSIS_SIG%
    set FILE_MANCANTI=1
) else (
    echo [OK] File NSIS SIG trovato: %NSIS_SIG%
)

echo.

if %FILE_MANCANTI% EQU 1 (
    echo ATTENZIONE: Alcuni file non sono stati trovati!
    echo Assicurati di aver:
    echo 1. Compilato l'applicazione con build-finale.bat (che crea automaticamente i ZIP)
    echo 2. Firmato i file .zip con firma-aggiornamenti.bat
    echo 3. Oppure eseguito crea-zip-aggiornamenti.bat manualmente se i ZIP non esistono
    echo.
    set /p CONTINUA="Vuoi continuare comunque? (S/N): "
    if /i not "!CONTINUA!"=="S" (
        echo Operazione annullata.
    pause
    exit /b 1
)
)
)

REM Verifica se il tag esiste già
git tag -l "v%VERSIONE%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ATTENZIONE: Il tag v%VERSIONE% esiste già!
    set /p SOVRASCRIVI="Vuoi eliminarlo e ricrearlo? (S/N): "
    if /i "!SOVRASCRIVI!"=="S" (
        echo Eliminazione tag locale...
        git tag -d "v%VERSIONE%" >nul 2>&1
        echo Eliminazione tag remoto...
        git push origin --delete "v%VERSIONE%" >nul 2>&1
    ) else (
        echo Operazione annullata.
        pause
        exit /b 1
    )
)

REM Crea un tag Git
echo.
echo Creazione tag Git...
git tag -a "v%VERSIONE%" -m "%TITOLO%"
if %ERRORLEVEL% NEQ 0 (
    echo ERRORE: Creazione tag fallita!
    pause
    exit /b 1
)

REM Push del tag
echo Invio tag a GitHub...
git push origin "v%VERSIONE%"
if %ERRORLEVEL% NEQ 0 (
    echo ERRORE: Invio tag fallito!
    echo Verifica di avere i permessi e che il repository remoto sia configurato correttamente.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Tag creato e inviato con successo!
echo ========================================
echo.

REM Apri il browser con la pagina di creazione release
echo Apertura browser per creare la release...
start https://github.com/%REPO%/releases/new?tag=v%VERSIONE%^&title=%TITOLO%

echo.
echo ========================================
echo ISTRUZIONI PER COMPLETARE LA RELEASE
echo ========================================
echo.
echo 1. Nel browser che si è aperto:
echo    - Il tag "v%VERSIONE%" è già selezionato
echo    - Il titolo "%TITOLO%" è già inserito
echo.
echo 2. Inserisci la descrizione delle modifiche (se non l'hai già fatto)
echo.
echo 3. Nella sezione "Attach binaries", carica questi 4 file:
echo    [1] %MSI_ZIP%
echo    [2] %MSI_SIG%
echo    [3] %NSIS_ZIP%
echo    [4] %NSIS_SIG%
echo.
echo 4. IMPORTANTE: Rimuovi il flag "Pre-release" se vuoi renderla ufficiale
echo.
echo 5. Clicca "Publish release"
echo.
echo 6. IMPORTANTE: Dopo la pubblicazione, genera e carica il file latest.json:
echo    - Esegui: genera-latest-json.bat
echo    - Vai alla release pubblicata su GitHub
echo    - Clicca "Edit release"
echo    - Trascina il file latest.json nella sezione "Attachments"
echo    - Salva la release
echo.
echo 7. Verifica che il file latest.json sia disponibile all'URL:
echo    https://github.com/%REPO%/releases/latest/download/latest.json
echo.
echo ========================================
echo.

pause
