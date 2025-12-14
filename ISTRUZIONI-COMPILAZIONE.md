# Istruzioni per la Compilazione

## Problema con l'Input della Password

Quando compili l'app, Tauri richiede la password della chiave privata per firmare gli aggiornamenti. **L'input interattivo non funziona tramite script**, quindi devi eseguire i comandi direttamente nel terminale.

## Soluzione: Eseguire i Comandi Direttamente

### Metodo 1: Terminale PowerShell (CONSIGLIATO)

1. Apri PowerShell nella cartella del progetto
2. Esegui questi comandi:

```powershell
# Imposta la variabile d'ambiente per la chiave privata
$env:TAURI_PRIVATE_KEY = (Resolve-Path "src-tauri\keys\keypair.key").Path

# Compila l'app
npm run build
```

3. Quando viene richiesta la password, **inseriscila manualmente** e premi Invio
4. La compilazione continuerà automaticamente

### Metodo 2: Script Semplice

1. Esegui `build-semplice.bat` (doppio click)
2. Lo script ti avviserà quando inserire la password
3. **Inserisci la password manualmente** quando richiesta nel terminale

## Perché Non Funziona Tramite Script?

Tauri usa un input sicuro per la password che richiede input interattivo diretto dal terminale. Quando viene eseguito tramite script, questo input viene bloccato per motivi di sicurezza.

## File Generati

Dopo la compilazione, troverai i file in:
- `src-tauri\target\release\bundle\msi\Pratica Edilizia_1.0.0_x64_en-US.msi` - Installer principale
- `src-tauri\target\release\bundle\nsis\Pratica Edilizia_1.0.0_x64-setup.exe` - Setup alternativo
- `src-tauri\target\release\bundle\msi\Pratica Edilizia_1.0.0_x64_en-US.msi.zip` - File per aggiornamenti (firmato)
- `src-tauri\target\release\bundle\nsis\Pratica Edilizia_1.0.0_x64-setup.nsis.zip` - File per aggiornamenti NSIS (firmato)

## Note

- La password è salvata in `src-tauri\password.txt` (non committare questo file!)
- Se dimentichi la password, dovrai rigenerare le chiavi con `genera-chiavi.bat`
- Gli aggiornamenti automatici funzioneranno solo se i file `.zip` sono firmati correttamente

