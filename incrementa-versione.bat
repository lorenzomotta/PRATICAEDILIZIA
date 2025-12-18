@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   INCREMENTA VERSIONE APPLICAZIONE
echo ========================================
echo.
echo Scegli il tipo di incremento:
echo.
echo   1. PATCH (es: 1.1.0 -^> 1.1.1)
echo   2. MINOR (es: 1.1.0 -^> 1.2.0)
echo   3. MAJOR (es: 1.1.0 -^> 2.0.0)
echo.
set /p scelta="Inserisci il numero (1-3): "

if "%scelta%"=="1" (
    set TIPO=patch
) else if "%scelta%"=="2" (
    set TIPO=minor
) else if "%scelta%"=="3" (
    set TIPO=major
) else (
    echo.
    echo ERRORE: Scelta non valida!
    echo.
    pause
    exit /b 1
)

echo.
echo Esecuzione incremento versione: %TIPO%
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0incrementa-versione.ps1" -Tipo %TIPO%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   OPERAZIONE COMPLETATA
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo   ERRORE DURANTE L'OPERAZIONE
    echo ========================================
    echo.
)

pause
