# Bootstrap Files

Questa cartella contiene i file Bootstrap scaricati localmente per evitare problemi con il Tracking Prevention di Tauri.

## Come scaricare i file

Se i file non sono presenti, scaricali manualmente:

1. **bootstrap.min.css**: 
   - URL: https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css
   - Salva come: `bootstrap.min.css`

2. **bootstrap.bundle.min.js**:
   - URL: https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js
   - Salva come: `bootstrap.bundle.min.js`

Oppure usa PowerShell:
```powershell
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" -OutFile "bootstrap.min.css"
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" -OutFile "bootstrap.bundle.min.js"
```

