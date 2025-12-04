@echo off
REM Script per incrementare la versione dell'applicazione
REM Mostra un menu interattivo per scegliere il tipo di incremento

setlocal enabledelayedexpansion

REM Se è stato passato un parametro dalla riga di comando, usalo
set "TIPO=%~1"

REM Se non è stato passato un parametro, mostra un menu interattivo
if "%TIPO%"=="" (
    echo.
    echo ========================================
    echo   Aggiornamento Versione Applicazione
    echo ========================================
    echo.
    echo Quale tipo di aggiornamento vuoi fare?
    echo.
    echo   1. PATCH - Piccole correzioni (es: 1.0.0 -^> 1.0.1)
    echo   2. MINOR - Nuove funzionalita (es: 1.0.0 -^> 1.1.0)
    echo   3. MAJOR - Modifiche importanti (es: 1.0.0 -^> 2.0.0)
    echo.
    set /p "scelta=Scegli (1/2/3): "
    
    if "!scelta!"=="1" set "TIPO=patch"
    if "!scelta!"=="2" set "TIPO=minor"
    if "!scelta!"=="3" set "TIPO=major"
    
    REM Valida la scelta
    if not "!TIPO!"=="patch" if not "!TIPO!"=="minor" if not "!TIPO!"=="major" (
        echo.
        echo Scelta non valida! Uso PATCH come default.
        set "TIPO=patch"
    )
    echo.
    echo DEBUG: Tipo selezionato = "!TIPO!"
    echo.
)

REM Esci se TIPO non è ancora impostato
if "!TIPO!"=="" (
    echo ERRORE: Tipo di aggiornamento non valido!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Aggiornamento Versione Applicazione
echo ========================================
echo Tipo selezionato: !TIPO!
echo.

REM Verifica che i file esistano
if not exist "src-tauri\tauri.conf.json" (
    echo ERRORE: File src-tauri\tauri.conf.json non trovato!
    pause
    exit /b 1
)

if not exist "src-tauri\Cargo.toml" (
    echo ERRORE: File src-tauri\Cargo.toml non trovato!
    pause
    exit /b 1
)

REM Crea uno script PowerShell temporaneo
set "TEMP_SCRIPT=%TEMP%\aggiorna_versione_%RANDOM%.ps1"

echo Creazione script temporaneo...
(
echo $Tipo = '!TIPO!';
echo $tauriConf = 'src-tauri\tauri.conf.json';
echo $cargoToml = 'src-tauri\Cargo.toml';
echo.
echo function IncrementaVersione {
echo     param([string]$Versione, [string]$Tipo^)
echo     $parti = $Versione -split '\.'
echo     $major = [int]$parti[0]
echo     $minor = [int]$parti[1]
echo     $patch = [int]$parti[2]
echo     switch ($Tipo^) {
echo         'patch' { $patch++ }
echo         'minor' { $minor++; $patch = 0 }
echo         'major' { $major++; $minor = 0; $patch = 0 }
echo     }
echo     return "$major.$minor.$patch"
echo }
echo.
echo try {
echo     $ErrorActionPreference = 'Stop'
echo     $jsonContent = Get-Content $tauriConf -Raw ^| ConvertFrom-Json
echo     $versioneAttuale = $jsonContent.package.version
echo     Write-Host "Versione attuale: $versioneAttuale" -ForegroundColor Cyan
echo     Write-Host ""
echo     $nuovaVersione = IncrementaVersione -Versione $versioneAttuale -Tipo $Tipo
echo     Write-Host "Nuova versione: $nuovaVersione ($Tipo^)" -ForegroundColor Green
echo     Write-Host ""
echo     $jsonFileContent = Get-Content $tauriConf -Raw -Encoding UTF8
echo     $patternVersione = '"version":\s*"' + [regex]::Escape($versioneAttuale) + '"'
echo     $sostituzioneVersione = '"version": "' + $nuovaVersione + '"'
echo     $jsonFileContent = $jsonFileContent -replace $patternVersione, $sostituzioneVersione
echo     $patternTitolo = '"title":\s*"Pratica Edilizia[^"]*"'
echo     $sostituzioneTitolo = '"title": "Pratica Edilizia ' + $nuovaVersione + '"'
echo     $jsonFileContent = $jsonFileContent -replace $patternTitolo, $sostituzioneTitolo
echo     $utf8NoBom = New-Object System.Text.UTF8Encoding $false
echo     [System.IO.File]::WriteAllText((Resolve-Path $tauriConf^).Path, $jsonFileContent, $utf8NoBom^)
echo     Write-Host "[OK] Aggiornato tauri.conf.json (versione e titolo)" -ForegroundColor Green
echo     $cargoContent = Get-Content $cargoToml -Raw
echo     $cargoContent = $cargoContent -replace "version = `"$versioneAttuale`"", "version = `"$nuovaVersione`""
echo     $cargoContent ^| Set-Content $cargoToml -Encoding UTF8
echo     Write-Host "[OK] Aggiornato Cargo.toml" -ForegroundColor Green
echo     Write-Host ""
echo     Write-Host "========================================" -ForegroundColor Green
echo     Write-Host "Versione incrementata con successo!" -ForegroundColor Green
echo     Write-Host "========================================" -ForegroundColor Green
echo     Write-Host ""
echo     Write-Host "File aggiornati:" -ForegroundColor Cyan
echo     Write-Host "  - tauri.conf.json: $versioneAttuale -^> $nuovaVersione" -ForegroundColor White
echo     Write-Host "  - Cargo.toml: $versioneAttuale -^> $nuovaVersione" -ForegroundColor White
echo     Write-Host ""
echo     exit 0
echo } catch {
echo     Write-Host ""
echo     Write-Host "ERRORE: $_" -ForegroundColor Red
echo     Write-Host ""
echo     exit 1
echo }
) > "%TEMP_SCRIPT%"

REM Esegue lo script PowerShell
echo.
echo Esecuzione aggiornamento versione...
echo Script temporaneo: %TEMP_SCRIPT%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP_SCRIPT%"

set "ERRORE=%ERRORLEVEL%"

echo.
echo PowerShell ha terminato. Codice di uscita: %ERRORE%
echo.

REM Elimina lo script temporaneo
if exist "%TEMP_SCRIPT%" del "%TEMP_SCRIPT%" >nul 2>&1

if %ERRORE% NEQ 0 (
    echo.
    echo ========================================
    echo ERRORE durante l'aggiornamento della versione!
    echo ========================================
    echo.
    echo Premere un tasto per chiudere...
    pause >nul
    exit /b 1
)

REM Se l'aggiornamento è andato a buon fine, chiedi se vuole compilare
echo.
echo ========================================
echo AGGIORNAMENTO VERSIONE COMPLETATO!
echo ========================================
echo.
echo I file sono stati aggiornati correttamente.
echo.

REM Chiedi se vuole compilare
set /p "compila=Vuoi compilare l'applicazione ora? (S/N): "

if /i "!compila!"=="S" (
    echo.
    echo ========================================
    echo Avvio compilazione applicazione...
    echo ========================================
    echo.
    echo Questo processo potrebbe richiedere alcuni minuti...
    echo.
    
    REM Esegue la compilazione
    call npm run build
    
    if errorlevel 1 (
        echo.
        echo ========================================
        echo ERRORE durante la compilazione!
        echo ========================================
        echo.
        echo La versione e' stata aggiornata, ma la compilazione e' fallita.
        echo Controlla gli errori sopra per maggiori dettagli.
    ) else (
        echo.
        echo ========================================
        echo COMPILAZIONE COMPLETATA CON SUCCESSO!
        echo ========================================
        echo.
        echo L'applicazione e' stata compilata correttamente.
        echo I file di installazione si trovano in:
        echo   src-tauri\target\release\bundle\
        echo.
    )
) else (
    echo.
    echo Compilazione saltata. Puoi compilare in seguito con:
    echo   npm run build
)

echo.
echo ========================================
echo Premere un tasto per chiudere questa finestra...
pause >nul
