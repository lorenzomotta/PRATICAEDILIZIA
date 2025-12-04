# Script PowerShell per estrarre la chiave pubblica
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Estrazione chiave pubblica" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "keys\keypair.key")) {
    Write-Host "ERRORE: File keys\keypair.key non trovato!" -ForegroundColor Red
    Write-Host "Esegui prima genera-chiavi.bat" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Premi INVIO per uscire"
    exit 1
}

# Leggi la password dal file
$passwordFile = "password.txt"
if (-not (Test-Path $passwordFile)) {
    Write-Host "ERRORE: File password.txt non trovato!" -ForegroundColor Red
    Write-Host "Crea il file password.txt e inserisci la password al suo interno." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Premi INVIO per uscire"
    exit 1
}

$password = Get-Content $passwordFile -Raw
$password = $password.Trim()

if ([string]::IsNullOrWhiteSpace($password) -or $password -eq "INSERISCI_QUI_LA_TUA_PASSWORD") {
    Write-Host "ERRORE: Password non valida nel file password.txt!" -ForegroundColor Red
    Write-Host "Apri il file password.txt e inserisci la password che hai usato per generare le chiavi." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Premi INVIO per uscire"
    exit 1
}

# Copia la password negli appunti di Windows
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Clipboard]::SetText($password)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Password copiata negli appunti!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "La password è stata copiata negli appunti di Windows." -ForegroundColor Cyan
Write-Host ""
Write-Host "Ora verrà eseguito il comando per estrarre la chiave pubblica." -ForegroundColor White
Write-Host "Quando ti verrà chiesta la password:" -ForegroundColor Yellow
Write-Host "1. Premi CTRL+V per incollare la password" -ForegroundColor White
Write-Host "2. Premi INVIO" -ForegroundColor White
Write-Host ""
Write-Host "Premi INVIO per avviare il comando..." -ForegroundColor Cyan
Read-Host

Write-Host ""
Write-Host "Estrazione chiave pubblica in corso..." -ForegroundColor Cyan
Write-Host ""

try {
    # Esegui il comando cargo (richiederà la password interattivamente)
    & cargo tauri signer keypair --keypair keys\keypair.key
    
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Chiave pubblica estratta!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Copia la chiave pubblica mostrata sopra" -ForegroundColor Cyan
        Write-Host "e inseriscila nel file tauri.conf.json nel campo 'pubkey'" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ERRORE: Estrazione chiave pubblica fallita!" -ForegroundColor Red
        Write-Host "Codice di errore: $exitCode" -ForegroundColor Red
        Write-Host "Verifica che la password nel file password.txt sia corretta." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Prova a eseguire manualmente:" -ForegroundColor Yellow
        Write-Host "cargo tauri signer keypair --keypair keys\keypair.key" -ForegroundColor White
    }
} catch {
    Write-Host ""
    Write-Host "ERRORE durante l'estrazione: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica che:" -ForegroundColor Yellow
    Write-Host "1. La password nel file password.txt sia corretta" -ForegroundColor White
    Write-Host "2. Il file keys\keypair.key esista" -ForegroundColor White
    Write-Host ""
    Write-Host "Prova a eseguire manualmente:" -ForegroundColor Yellow
    Write-Host "cargo tauri signer keypair --keypair keys\keypair.key" -ForegroundColor White
}

Write-Host ""
Read-Host "Premi INVIO per uscire"

