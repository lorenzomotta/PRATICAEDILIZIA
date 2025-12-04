# Sistema di Aggiornamenti Automatici

Questa guida ti spiega come configurare il sistema di aggiornamenti automatici per l'applicazione Pratica Edilizia usando GitHub Releases.

## 📋 Prerequisiti

1. Un repository GitHub (pubblico o privato con GitHub Enterprise)
2. Git configurato sul tuo computer
3. Cargo e Rust installati

## 🔑 Passo 1: Generare le Chiavi per Firmare gli Aggiornamenti

Le chiavi servono per garantire la sicurezza degli aggiornamenti. Solo gli aggiornamenti firmati con la tua chiave privata verranno accettati dall'app.

### Genera le chiavi:

1. Apri un terminale nella directory `src-tauri`
2. Esegui lo script `genera-chiavi.bat`
3. Inserisci una password sicura quando richiesto (la userai per firmare gli aggiornamenti)
4. Lo script creerà il file `keys/keypair.key` con la tua chiave privata

### Estrai la chiave pubblica:

1. Esegui lo script `estrai-chiave-pubblica.bat`
2. Inserisci la password che hai usato per generare le chiavi
3. Copia la chiave pubblica mostrata (è una stringa molto lunga)

## ⚙️ Passo 2: Configurare tauri.conf.json

1. Apri il file `src-tauri/tauri.conf.json`
2. Trova la sezione `"updater"`
3. Sostituisci `"TUO_USERNAME/TUO_REPO"` con il tuo repository GitHub (es: `mionome/pratica-edilizia`)
4. Sostituisci `"LA_TUA_CHIAVE_PUBBLICA_QUI"` con la chiave pubblica che hai estratto

Esempio:
```json
"updater": {
  "active": true,
  "endpoints": [
    "https://github.com/mionome/pratica-edilizia/releases/latest/download/latest.json"
  ],
  "dialog": true,
  "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSB2ZXJpZmljYXRpb24ga2V5Cj..."
}
```

## 🚀 Passo 3: Compilare l'Applicazione con le Chiavi

Quando compili l'applicazione per la distribuzione, devi firmare gli aggiornamenti:

```bash
cd src-tauri
cargo tauri build -- --signer keys/keypair.key
```

Quando richiesto, inserisci la password della chiave privata.

## 📦 Passo 4: Pubblicare una Release su GitHub

### Metodo Automatico (Script):

1. Compila l'applicazione (vedi passo 3)
2. Esegui lo script `pubblica-release-github.bat` dalla root del progetto
3. Segui le istruzioni per inserire versione, titolo e repository
4. Lo script creerà un tag Git e lo invierà a GitHub
5. Vai su GitHub e completa la pubblicazione della release caricando il file MSI

### Metodo Manuale:

1. Compila l'applicazione
2. Crea un tag Git:
   ```bash
   git tag -a v1.0.7 -m "Release 1.0.7"
   git push origin v1.0.7
   ```
3. Vai su GitHub → Releases → Draft a new release
4. Seleziona il tag appena creato
5. Inserisci titolo e descrizione
6. Carica il file MSI da: `src-tauri/target/release/bundle/msi/Pratica Edilizia_X.X.X_x64_en-US.msi`
7. Pubblica la release

## 🔄 Come Funzionano gli Aggiornamenti

1. **All'avvio dell'app**: Dopo 3 secondi, l'app controlla automaticamente se ci sono aggiornamenti disponibili
2. **Se trova un aggiornamento**: Mostra una notifica all'utente con i dettagli della nuova versione
3. **Se l'utente accetta**: L'app scarica e installa l'aggiornamento automaticamente
4. **Dopo l'installazione**: L'app si riavvia automaticamente con la nuova versione

## 📝 Note Importanti

- **Conserva la chiave privata**: Se perdi `keys/keypair.key`, non potrai più pubblicare aggiornamenti firmati
- **Password sicura**: Usa una password forte per proteggere la chiave privata
- **Repository pubblico**: Se il repository è privato, devi usare GitHub Enterprise o un server personalizzato
- **File latest.json**: Tauri genera automaticamente questo file quando pubblichi una release su GitHub

## 🛠️ Risoluzione Problemi

### L'app non trova aggiornamenti:
- Verifica che l'endpoint in `tauri.conf.json` sia corretto
- Verifica che la release su GitHub sia pubblica
- Controlla che il file `latest.json` sia stato generato nella release

### Errore di verifica firma:
- Verifica che la chiave pubblica in `tauri.conf.json` sia corretta
- Assicurati di aver firmato l'aggiornamento con la chiave privata corretta

### L'app non si aggiorna:
- Verifica che la versione nella nuova release sia maggiore della versione attuale
- Controlla i log della console per eventuali errori

