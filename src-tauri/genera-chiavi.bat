@echo off
cd /d "%~dp0"

REM Esegui lo script PowerShell
powershell.exe -ExecutionPolicy Bypass -File "%~dp0genera-chiavi.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERRORE: Esecuzione script PowerShell fallita!
    echo.
    pause
)

