@echo off
REM Script wrapper per generare latest.json
REM Esegue lo script PowerShell genera-latest-json.ps1

echo ========================================
echo Generazione file latest.json
echo ========================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0genera-latest-json.ps1" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERRORE durante la generazione di latest.json
    pause
    exit /b 1
)

pause
