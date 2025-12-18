# Script per incrementare la versione dell'applicazione
# Uso: .\incrementa-versione.ps1 -Tipo [patch|minor|major]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("patch", "minor", "major")]
    [string]$Tipo
)

# Funzione per incrementare la versione
function IncrementaVersione {
    param([string]$Versione, [string]$Tipo)
    
    $parti = $Versione -split '\.'
    $major = [int]$parti[0]
    $minor = [int]$parti[1]
    $patch = [int]$parti[2]
    
    switch ($Tipo) {
        "patch" {
            $patch++
        }
        "minor" {
            $minor++
            $patch = 0
        }
        "major" {
            $major++
            $minor = 0
            $patch = 0
        }
    }
    
    return "$major.$minor.$patch"
}

# Percorsi dei file
$tauriConf = "src-tauri\tauri.conf.json"
$cargoToml = "src-tauri\Cargo.toml"
$packageJson = "package.json"

# Verifica che i file esistano
if (-not (Test-Path $tauriConf)) {
    Write-Host "ERRORE: File $tauriConf non trovato!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $cargoToml)) {
    Write-Host "ERRORE: File $cargoToml non trovato!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $packageJson)) {
    Write-Host "ERRORE: File $packageJson non trovato!" -ForegroundColor Red
    exit 1
}

try {
    # Leggi la versione attuale da tauri.conf.json
    $jsonContent = Get-Content $tauriConf -Raw | ConvertFrom-Json
    $versioneAttuale = $jsonContent.package.version

    Write-Host "Versione attuale: $versioneAttuale" -ForegroundColor Cyan
    Write-Host ""

    # Incrementa la versione
    $nuovaVersione = IncrementaVersione -Versione $versioneAttuale -Tipo $Tipo

    Write-Host "Nuova versione: $nuovaVersione ($Tipo)" -ForegroundColor Green
    Write-Host ""

    # Aggiorna tauri.conf.json
    $jsonContent.package.version = $nuovaVersione
    # Aggiorna anche il titolo della finestra
    if ($jsonContent.tauri.windows.Count -gt 0) {
        $jsonContent.tauri.windows[0].title = "Pratica Edilizia $nuovaVersione"
    }
    $jsonContent | ConvertTo-Json -Depth 10 | Set-Content $tauriConf -Encoding UTF8
    Write-Host "[OK] Aggiornato tauri.conf.json (versione e titolo finestra)" -ForegroundColor Green

    # Aggiorna Cargo.toml
    $cargoContent = Get-Content $cargoToml -Raw
    $cargoContent = $cargoContent -replace "version = `"$versioneAttuale`"", "version = `"$nuovaVersione`""
    
    # Verifica e aggiungi la feature "updater" se manca (solo per tauri)
    if ($cargoContent -match 'tauri = \{ version = "1", features = \[([^\]]+)\]') {
        $featuresMatch = $matches[1]
        # Aggiungi "updater" se non è già presente
        if ($featuresMatch -notmatch '"updater"') {
            # Rimuovi spazi extra e aggiungi "updater"
            $featuresClean = $featuresMatch.Trim()
            if ($featuresClean.EndsWith(',')) {
                $newFeatures = $featuresClean + ' "updater"'
            } else {
                $newFeatures = $featuresClean + ', "updater"'
            }
            # Sostituisce solo la riga di tauri, non altre righe con features
            $cargoContent = $cargoContent -replace '(tauri = \{ version = "1", features = \[)([^\]]+)(\])', "`$1$newFeatures`$3"
            Write-Host "[OK] Aggiunta feature 'updater' a Cargo.toml" -ForegroundColor Yellow
        }
    }
    
    $cargoContent | Set-Content $cargoToml -Encoding UTF8
    Write-Host "[OK] Aggiornato Cargo.toml" -ForegroundColor Green

    # Aggiorna package.json
    $packageContent = Get-Content $packageJson -Raw | ConvertFrom-Json
    $packageContent.version = $nuovaVersione
    $packageContent | ConvertTo-Json -Depth 10 | Set-Content $packageJson -Encoding UTF8
    Write-Host "[OK] Aggiornato package.json" -ForegroundColor Green

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Versione incrementata con successo!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ora puoi compilare con: npm run build" -ForegroundColor Yellow
    Write-Host ""
    
    exit 0
}
catch {
    Write-Host ""
    Write-Host "ERRORE: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}
