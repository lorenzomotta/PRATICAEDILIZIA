# Script per scaricare Bootstrap localmente
# Esegui questo script dalla directory root del progetto

$bootstrapDir = ".\src\vendor\bootstrap"

# Crea la directory se non esiste
if (-not (Test-Path $bootstrapDir)) {
    New-Item -ItemType Directory -Path $bootstrapDir -Force | Out-Null
}

Write-Host "Scaricamento Bootstrap CSS..."
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
(New-Object System.Net.WebClient).DownloadFile(
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css",
    "$bootstrapDir\bootstrap.min.css"
)

Write-Host "Scaricamento Bootstrap JS..."
(New-Object System.Net.WebClient).DownloadFile(
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js",
    "$bootstrapDir\bootstrap.bundle.min.js"
)

Write-Host "Completato! I file Bootstrap sono stati scaricati in $bootstrapDir"

