# Script per generare il file latest.json necessario per gli aggiornamenti automatici
# Questo file deve essere caricato nella release GitHub

param(
    [string]$Versione = "",
    [string]$Repo = "lorenzomotta/PRATICAEDILIZIA"
)

$ErrorActionPreference = "Stop"

# Directory dello script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Leggi la versione da tauri.conf.json se non specificata
if ([string]::IsNullOrEmpty($Versione)) {
    $ConfFile = Join-Path $ScriptDir "src-tauri\tauri.conf.json"
    if (-not (Test-Path $ConfFile)) {
        Write-Host "ERRORE: File di configurazione non trovato: $ConfFile" -ForegroundColor Red
        exit 1
    }
    
    $json = Get-Content $ConfFile -Raw | ConvertFrom-Json
    $Versione = $json.package.version
}

if ([string]::IsNullOrEmpty($Versione)) {
    Write-Host "ERRORE: Impossibile leggere la versione" -ForegroundColor Red
    exit 1
}

Write-Host "Versione: $Versione" -ForegroundColor Green
Write-Host "Repository: $Repo" -ForegroundColor Green
Write-Host ""

# Percorsi dei file
$MsiDir = Join-Path $ScriptDir "src-tauri\target\release\bundle\msi"
$NsisDir = Join-Path $ScriptDir "src-tauri\target\release\bundle\nsis"

$MsiZip = "Pratica Edilizia_${Versione}_x64_en-US.msi.zip"
$NsisZip = "Pratica Edilizia_${Versione}_x64-setup.exe.zip"

$MsiZipPath = Join-Path $MsiDir $MsiZip
$NsisZipPath = Join-Path $NsisDir $NsisZip

$MsiSigPath = "$MsiZipPath.sig"
$NsisSigPath = "$NsisZipPath.sig"

# Verifica che i file esistano
$filesFound = @()

if (Test-Path $MsiZipPath) {
    Write-Host "✓ Trovato MSI ZIP: $MsiZip" -ForegroundColor Green
    $filesFound += "msi"
} else {
    Write-Host "⚠ MSI ZIP non trovato: $MsiZipPath" -ForegroundColor Yellow
}

if (Test-Path $NsisZipPath) {
    Write-Host "✓ Trovato NSIS ZIP: $NsisZip" -ForegroundColor Green
    $filesFound += "nsis"
} else {
    Write-Host "⚠ NSIS ZIP non trovato: $NsisZipPath" -ForegroundColor Yellow
}

if ($filesFound.Count -eq 0) {
    Write-Host "ERRORE: Nessun file ZIP trovato!" -ForegroundColor Red
    Write-Host "Esegui prima: crea-zip-aggiornamenti.bat" -ForegroundColor Yellow
    exit 1
}

# Leggi le signature
$msiSignature = ""
$nsisSignature = ""

if (Test-Path $MsiSigPath) {
    $msiSignature = Get-Content $MsiSigPath -Raw
    $msiSignature = $msiSignature.Trim()
    Write-Host "✓ Signature MSI letta" -ForegroundColor Green
} else {
    Write-Host "⚠ Signature MSI non trovata: $MsiSigPath" -ForegroundColor Yellow
    Write-Host "Esegui prima: firma-aggiornamenti.bat" -ForegroundColor Yellow
}

if (Test-Path $NsisSigPath) {
    $nsisSignature = Get-Content $NsisSigPath -Raw
    $nsisSignature = $nsisSignature.Trim()
    Write-Host "✓ Signature NSIS letta" -ForegroundColor Green
} else {
    Write-Host "⚠ Signature NSIS non trovata: $NsisSigPath" -ForegroundColor Yellow
    Write-Host "Esegui prima: firma-aggiornamenti.bat" -ForegroundColor Yellow
}

# Crea l'oggetto latest.json
$latestJson = @{
    version = "v$Versione"
    notes = "Aggiornamento versione $Versione"
    pub_date = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    platforms = @{}
}

# URL base per GitHub Releases
$baseUrl = "https://github.com/$Repo/releases/download/v$Versione"

# Aggiungi MSI se disponibile
if ($filesFound -contains "msi" -and -not [string]::IsNullOrEmpty($msiSignature)) {
    $latestJson.platforms["windows-x86_64"] = @{
        signature = $msiSignature
        url = "$baseUrl/$MsiZip"
    }
    Write-Host "✓ Aggiunto MSI a latest.json" -ForegroundColor Green
}

# Aggiungi NSIS se disponibile (preferito per Windows)
if ($filesFound -contains "nsis" -and -not [string]::IsNullOrEmpty($nsisSignature)) {
    $latestJson.platforms["windows-x86_64"] = @{
        signature = $nsisSignature
        url = "$baseUrl/$NsisZip"
    }
    Write-Host "✓ Aggiunto NSIS a latest.json (sovrascrive MSI)" -ForegroundColor Green
}

# Converti in JSON
$jsonContent = $latestJson | ConvertTo-Json -Depth 10

# Salva il file
$outputFile = Join-Path $ScriptDir "latest.json"
$jsonContent | Out-File -FilePath $outputFile -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "File latest.json creato con successo!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "File salvato in: $outputFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE: Carica questo file nella release GitHub!" -ForegroundColor Yellow
Write-Host "1. Vai alla release v$Versione su GitHub" -ForegroundColor Yellow
Write-Host "2. Clicca 'Edit release'" -ForegroundColor Yellow
Write-Host "3. Trascina il file latest.json nella sezione 'Attachments'" -ForegroundColor Yellow
Write-Host "4. Salva la release" -ForegroundColor Yellow
Write-Host ""
Write-Host "L'URL del file deve essere:" -ForegroundColor Cyan
Write-Host "https://github.com/$Repo/releases/latest/download/latest.json" -ForegroundColor Cyan
Write-Host ""
