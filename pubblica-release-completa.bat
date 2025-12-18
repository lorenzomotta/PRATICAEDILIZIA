@echo off
REM Script completo per pubblicare una release
REM Esegue: compilazione, creazione ZIP, firma, commit, push, pubblicazione release

setlocal enabledelayedexpansion

echo ========================================
echo Pubblicazione Release Completa
echo ========================================
echo.
echo Questo script esegue automaticamente:
echo 1. Compilazione applicazione
echo 2. Creazione file ZIP
echo 3. Firma file ZIP
echo 4. Commit e push codice
echo 5. Pubblicazione release su GitHub
echo.
pause

cd /d "%~dp0"

REM Leggi la versione da tauri.conf.json
echo Lettura versione...
for /f "delims=" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$json = Get-Content 'src-tauri\tauri.conf.json' -Raw | ConvertFrom-Json; Write-Output $json.package.version"') do set VERSIONE=%%i

if "%VERSIONE%"=="" (
    echo ERRORE: Impossibile leggere la versione!
    pause
    exit /b 1
)

echo Versione rilevata: %VERSIONE%
echo.

REM Chiedi conferma
set /p CONFERMA="Vuoi procedere con la pubblicazione della versione %VERSIONE%? (S/N): "
if /i not "!CONFERMA!"=="S" (
    echo Operazione annullata.
    pause
    exit /b 0
)

echo.
echo ========================================
echo STEP 1: Compilazione
echo ========================================
echo.
call build-finale.bat
if %ERRORLEVEL% NEQ 0 (
    echo ERRORE durante la compilazione!
    pause
    exit /b 1
)

echo.
echo ========================================
echo STEP 2: Firma file ZIP
echo ========================================
echo.
echo IMPORTANTE: Inserisci la versione quando richiesta: %VERSIONE%
echo.
pause
call firma-aggiornamenti.bat
if %ERRORLEVEL% NEQ 0 (
    echo ERRORE durante la firma!
    pause
    exit /b 1
)

echo.
echo ========================================
echo STEP 3: Commit e Push codice
echo ========================================
echo.

REM Verifica se ci sono modifiche da committare
git status --porcelain >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    REM Controlla se ci sono file modificati
    git status --porcelain | findstr /R "." >nul
    if %ERRORLEVEL% EQU 0 (
        echo Ci sono modifiche da committare.
        echo.
        set /p MESSAGGIO="Messaggio commit (predefinito: Versione %VERSIONE%): "
        if "!MESSAGGIO!"=="" set MESSAGGIO=Versione %VERSIONE%
        
        echo.
        echo Aggiunta file...
        git add .
        
        echo Commit...
        git commit -m "!MESSAGGIO!"
        if %ERRORLEVEL% NEQ 0 (
            echo ERRORE durante il commit!
            pause
            exit /b 1
        )
        
        echo Push su GitHub...
        git push origin main
        if %ERRORLEVEL% NEQ 0 (
            echo ERRORE durante il push!
            pause
            exit /b 1
        )
        
        echo ✓ Codice committato e pushato con successo!
    ) else (
        echo Nessuna modifica da committare.
    )
) else (
    echo Nessuna modifica da committare.
)

echo.
echo ========================================
echo STEP 4: Pubblicazione Release
echo ========================================
echo.
echo IMPORTANTE: Inserisci la versione quando richiesta: %VERSIONE%
echo.
pause
call pubblica-release-github.bat

echo.
echo ========================================
echo Pubblicazione completata!
echo ========================================
echo.
pause
