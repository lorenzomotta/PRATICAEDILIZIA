@echo off
cd /d "%~dp0"

REM Esegui lo script PowerShell semplice
powershell.exe -ExecutionPolicy Bypass -File "%~dp0estrai-chiave-pubblica-semplice.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERRORE: Esecuzione script PowerShell fallita!
    echo.
    pause
)

