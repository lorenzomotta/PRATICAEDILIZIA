@echo off
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

REM Chiedi informazioni all'utente
echo Inserisci le informazioni per la release:
echo.
set /p VERSIONE="Versione (es: 1.0.7): "
set /p TITOLO="Titolo release (es: Release 1.0.7): "
set /p DESCRIZIONE="Descrizione (opzionale): "
set /p REPO="Repository GitHub (es: username/repo): "

if "%VERSIONE%"=="" (
    echo ERRORE: Versione non specificata!
    pause
    exit /b 1
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

REM Verifica che il file MSI esista
set MSI_FILE=src-tauri\target\release\bundle\msi\Pratica Edilizia_%VERSIONE%_x64_en-US.msi
if not exist "%MSI_FILE%" (
    echo ERRORE: File MSI non trovato: %MSI_FILE%
    echo Assicurati di aver compilato l'applicazione prima di pubblicare la release.
    pause
    exit /b 1
)

echo File MSI trovato: %MSI_FILE%
echo.

REM Crea un tag Git
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
    pause
    exit /b 1
)

echo.
echo ========================================
echo Tag creato e inviato con successo!
echo ========================================
echo.
echo Ora devi:
echo 1. Andare su GitHub: https://github.com/%REPO%/releases/new
echo 2. Selezionare il tag "v%VERSIONE%"
echo 3. Inserire il titolo: %TITOLO%
echo 4. Inserire la descrizione: %DESCRIZIONE%
echo 5. Caricare il file MSI: %MSI_FILE%
echo 6. Pubblicare la release
echo.
echo Dopo aver pubblicato la release, Tauri genererà automaticamente
echo il file latest.json necessario per gli aggiornamenti automatici.
echo.

pause

