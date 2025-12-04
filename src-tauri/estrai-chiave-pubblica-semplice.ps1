# Script semplice per mostrare la chiave pubblica se salvata
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Estrazione chiave pubblica" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Controlla se esiste il file con la chiave pubblica (prima prova .pub, poi public-key.txt)
$pubkeyFile = $null
$pubkey = $null

if (Test-Path "keys\keypair.key.pub") {
    $pubkeyFile = "keys\keypair.key.pub"
    $pubkey = Get-Content $pubkeyFile -Raw
    $pubkey = $pubkey.Trim()
} elseif (Test-Path "keys\public-key.txt") {
    $pubkeyFile = "keys\public-key.txt"
    $pubkey = Get-Content $pubkeyFile -Raw
    $pubkey = $pubkey.Trim()
}

if ($pubkey) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "CHIAVE PUBBLICA:" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host $pubkey -ForegroundColor Yellow
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "File: $pubkeyFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Copia la chiave pubblica sopra" -ForegroundColor Cyan
    Write-Host "e inseriscila nel file tauri.conf.json nel campo 'pubkey'" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "ERRORE: File chiave pubblica non trovato!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Cerca il file keys\keypair.key.pub" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opzioni:" -ForegroundColor Yellow
    Write-Host "1. Se hai generato le chiavi, il file dovrebbe essere in keys\keypair.key.pub" -ForegroundColor White
    Write-Host "2. Rigenera le chiavi eseguendo genera-chiavi.bat" -ForegroundColor White
    Write-Host ""
}

Read-Host "Premi INVIO per uscire"

