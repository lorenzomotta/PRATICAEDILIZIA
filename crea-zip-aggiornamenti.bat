@echo off
REM Script per creare manualmente i file ZIP dagli installer
REM Crea i file ZIP necessari per gli aggiornamenti Tauri

echo ========================================
echo Creazione file ZIP per aggiornamenti
echo ========================================
echo.

REM Leggi la versione da tauri.conf.json
set "CONF_FILE=src-tauri\tauri.conf.json"
if not exist "%CONF_FILE%" (
    echo ERRORE: File di configurazione non trovato: %CONF_FILE%
    pause
    exit /b 1
)

REM Estrai la versione usando PowerShell
for /f "delims=" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$json = Get-Content '%CONF_FILE%' -Raw | ConvertFrom-Json; Write-Output $json.package.version"') do set VERSIONE=%%i

if "%VERSIONE%"=="" (
    echo ERRORE: Impossibile leggere la versione dal file di configurazione
    pause
    exit /b 1
)

echo Versione rilevata: %VERSIONE%
echo.

REM Percorsi delle cartelle bundle
set "MSI_DIR=src-tauri\target\release\bundle\msi"
set "NSIS_DIR=src-tauri\target\release\bundle\nsis"

REM Nomi file
set "MSI_FILE=Pratica Edilizia_%VERSIONE%_x64_en-US.msi"
set "NSIS_FILE=Pratica Edilizia_%VERSIONE%_x64-setup.exe"

set "MSI_PATH=%MSI_DIR%\%MSI_FILE%"
set "NSIS_PATH=%NSIS_DIR%\%NSIS_FILE%"

set "MSI_ZIP=%MSI_DIR%\%MSI_FILE%.zip"
set "NSIS_ZIP=%NSIS_DIR%\%NSIS_FILE%.zip"

echo Cerca file installer...
echo.

REM Verifica e crea ZIP per MSI
if exist "%MSI_PATH%" (
    echo Trovato: %MSI_FILE%
    if exist "%MSI_ZIP%" (
        echo File ZIP MSI esiste già. Elimino quello vecchio...
        del "%MSI_ZIP%" >nul 2>&1
    )
    echo Creazione ZIP per MSI...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '%MSI_PATH%' -DestinationPath '%MSI_ZIP%' -Force"
    if %ERRORLEVEL% EQU 0 (
        echo ✓ ZIP MSI creato: %MSI_FILE%.zip
    ) else (
        echo ✗ ERRORE durante la creazione del ZIP MSI
    )
) else (
    echo ⚠ File MSI non trovato: %MSI_PATH%
)

echo.

REM Verifica e crea ZIP per NSIS
if exist "%NSIS_PATH%" (
    echo Trovato: %NSIS_FILE%
    if exist "%NSIS_ZIP%" (
        echo File ZIP NSIS esiste già. Elimino quello vecchio...
        del "%NSIS_ZIP%" >nul 2>&1
    )
    echo Creazione ZIP per NSIS...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '%NSIS_PATH%' -DestinationPath '%NSIS_ZIP%' -Force"
    if %ERRORLEVEL% EQU 0 (
        echo ✓ ZIP NSIS creato: %NSIS_FILE%.zip
    ) else (
        echo ✗ ERRORE durante la creazione del ZIP NSIS
    )
) else (
    echo ⚠ File NSIS non trovato: %NSIS_PATH%
)

echo.
echo ========================================
echo Operazione completata!
echo ========================================
echo.
echo I file ZIP sono stati creati nelle cartelle:
echo - %MSI_DIR%
echo - %NSIS_DIR%
echo.
echo Ora puoi eseguire: firma-aggiornamenti.bat
echo.
pause
