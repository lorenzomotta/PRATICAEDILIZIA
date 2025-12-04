# Script PowerShell per generare le chiavi Tauri
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Generazione chiavi per aggiornamenti Tauri" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica che la cartella keys esista
if (-not (Test-Path "keys")) {
    New-Item -ItemType Directory -Path "keys" | Out-Null
    Write-Host "Cartella 'keys' creata." -ForegroundColor Green
}

# Verifica se esiste già una chiave
$useForce = $false
if (Test-Path "keys\keypair.key") {
    Write-Host "ATTENZIONE: Il file keys\keypair.key esiste già!" -ForegroundColor Yellow
    $risposta = Read-Host "Vuoi sovrascriverlo? (S/N)"
    if ($risposta -ne "S" -and $risposta -ne "s") {
        Write-Host "Operazione annullata." -ForegroundColor Red
        exit
    }
    $useForce = $true
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
    Write-Host "Apri il file password.txt e inserisci la password che vuoi usare." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Premi INVIO per uscire"
    exit 1
}

Write-Host ""
Write-Host "IMPORTANTE: Conserva la chiave privata in un luogo sicuro!" -ForegroundColor Yellow
Write-Host ""

# Copia la password negli appunti di Windows
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Clipboard]::SetText($password)

Write-Host "========================================" -ForegroundColor Green
Write-Host "Password copiata negli appunti!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "La password è stata copiata negli appunti di Windows." -ForegroundColor Cyan
Write-Host ""
Write-Host "Ora verrà eseguito il comando per generare le chiavi." -ForegroundColor White
Write-Host "Quando ti verrà chiesta la password:" -ForegroundColor Yellow
Write-Host "1. Premi CTRL+V per incollare la password" -ForegroundColor White
Write-Host "2. Premi INVIO" -ForegroundColor White
Write-Host "3. Ripeti per la conferma password" -ForegroundColor White
Write-Host ""
Write-Host "Premi INVIO per avviare il comando..." -ForegroundColor Cyan
Read-Host

Write-Host ""
Write-Host "Generazione chiavi in corso..." -ForegroundColor Cyan
Write-Host ""

try {
    # Prepara gli argomenti del comando
    $cargoArgs = @("tauri", "signer", "generate", "-w", "keys\keypair.key")
    if ($useForce) {
        $cargoArgs += "--force"
    }
    
    # Esegui il comando cargo e cattura l'output
    $output = & cargo $cargoArgs 2>&1 | Out-String
    
    $exitCode = $LASTEXITCODE
    
    # La chiave pubblica viene salvata automaticamente in keypair.key.pub
    $pubkeyFile = "keys\keypair.key.pub"
    if (Test-Path $pubkeyFile) {
        $pubkey = Get-Content $pubkeyFile -Raw
        $pubkey = $pubkey.Trim()
        
        # Salva anche una copia con nome più chiaro
        $pubkeyFileCopy = "keys\public-key.txt"
        $pubkey | Out-File -FilePath $pubkeyFileCopy -Encoding utf8 -NoNewline
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "CHIAVE PUBBLICA TROVATA!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Chiave pubblica:" -ForegroundColor Cyan
        Write-Host $pubkey -ForegroundColor Yellow
        Write-Host ""
        Write-Host "La chiave pubblica è stata salvata in:" -ForegroundColor Cyan
        Write-Host "- $pubkeyFile" -ForegroundColor White
        Write-Host "- $pubkeyFileCopy" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ATTENZIONE: File chiave pubblica non trovato in $pubkeyFile" -ForegroundColor Yellow
        Write-Host "Controlla manualmente l'output sopra per trovare la chiave pubblica." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Output completo:" -ForegroundColor Gray
        Write-Host $output -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Chiavi generate con successo!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "La chiave privata è stata salvata in: keys\keypair.key" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Prossimi passi:" -ForegroundColor Yellow
        Write-Host "1. Esegui: .\estrai-chiave-pubblica.bat" -ForegroundColor White
        Write-Host "2. Copia la chiave pubblica mostrata" -ForegroundColor White
        Write-Host "3. Inseriscila nel file tauri.conf.json nel campo 'pubkey'" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ERRORE: Generazione chiavi fallita!" -ForegroundColor Red
        Write-Host "Codice di errore: $exitCode" -ForegroundColor Red
        Write-Host ""
        Write-Host "Prova a eseguire manualmente:" -ForegroundColor Yellow
        if ($useForce) {
            Write-Host "cargo tauri signer generate -w keys\keypair.key --force" -ForegroundColor White
        } else {
            Write-Host "cargo tauri signer generate -w keys\keypair.key" -ForegroundColor White
        }
    }
} catch {
    Write-Host ""
    Write-Host "ERRORE durante l'esecuzione: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Prova a eseguire manualmente:" -ForegroundColor Yellow
    if ($useForce) {
        Write-Host "cargo tauri signer generate -w keys\keypair.key --force" -ForegroundColor White
    } else {
        Write-Host "cargo tauri signer generate -w keys\keypair.key" -ForegroundColor White
    }
}

Write-Host ""
Read-Host "Premi INVIO per uscire"

