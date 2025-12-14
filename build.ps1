# Script PowerShell per compilare l'app con supporto per la firma degli aggiornamenti

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Compilazione Pratica Edilizia" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Imposta il percorso della chiave privata
$keyPath = Join-Path $PSScriptRoot "src-tauri\keys\keypair.key"
$env:TAURI_PRIVATE_KEY = (Resolve-Path $keyPath -ErrorAction SilentlyContinue).Path

# Verifica che la chiave esista
if (-not $env:TAURI_PRIVATE_KEY -or -not (Test-Path $env:TAURI_PRIVATE_KEY)) {
    Write-Host "ERRORE: Chiave privata non trovata in $keyPath" -ForegroundColor Red
    Write-Host "Esegui prima genera-chiavi.bat per generare le chiavi." -ForegroundColor Yellow
    Read-Host "Premi Invio per uscire"
    exit 1
}

Write-Host "Chiave privata trovata: $env:TAURI_PRIVATE_KEY" -ForegroundColor Green
Write-Host ""

# Leggi la password dal file (se esiste)
$passwordFile = Join-Path $PSScriptRoot "src-tauri\password.txt"
$password = $null

if (Test-Path $passwordFile) {
    try {
        $password = Get-Content $passwordFile -Raw -ErrorAction SilentlyContinue
        if ($password) {
            $password = $password.Trim()
            Write-Host "Password trovata nel file password.txt" -ForegroundColor Green
            Write-Host ""
        }
    } catch {
        Write-Host "Impossibile leggere la password dal file." -ForegroundColor Yellow
    }
}

# Esegui la compilazione
Write-Host "Avvio compilazione..." -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTA: Se viene richiesta la password, inseriscila manualmente." -ForegroundColor Yellow
Write-Host ""

try {
    # Esegui npm run build direttamente (senza redirect) per permettere input interattivo
    # Questo permette all'utente di inserire la password quando richiesta
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Compilazione completata con successo!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "ERRORE durante la compilazione" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
    }
} catch {
    Write-Host "Errore durante la compilazione: $_" -ForegroundColor Red
}

Write-Host ""
Read-Host "Premi Invio per uscire"
