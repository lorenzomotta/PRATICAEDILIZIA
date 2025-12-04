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

# Verifica che i file esistano
if (-not (Test-Path $tauriConf)) {
    Write-Host "ERRORE: File $tauriConf non trovato!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $cargoToml)) {
    Write-Host "ERRORE: File $cargoToml non trovato!" -ForegroundColor Red
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
    $jsonContent | ConvertTo-Json -Depth 10 | Set-Content $tauriConf -Encoding UTF8
    Write-Host "[OK] Aggiornato tauri.conf.json" -ForegroundColor Green

    # Aggiorna Cargo.toml
    $cargoContent = Get-Content $cargoToml -Raw
    $cargoContent = $cargoContent -replace "version = `"$versioneAttuale`"", "version = `"$nuovaVersione`""
    $cargoContent | Set-Content $cargoToml -Encoding UTF8
    Write-Host "[OK] Aggiornato Cargo.toml" -ForegroundColor Green

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
