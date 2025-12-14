# 📋 Istruzioni Passo-Passo per Aggiornare la Versione e Pubblicare su GitHub

Questa guida ti spiega come aggiornare la versione dell'applicazione e pubblicarla su GitHub.

---

## 🎯 Panoramica del Processo

Il processo completo prevede questi passaggi:

1. ✅ **Aggiornare la versione** in tutti i file di configurazione
2. ✅ **Compilare l'applicazione** con la nuova versione
3. ✅ **Firmare gli aggiornamenti** (se necessario)
4. ✅ **Pubblicare la release** su GitHub

---

## 📝 PASSO 1: Aggiornare la Versione

Prima di compilare, devi aggiornare il numero di versione in **5 file**:

### File da Modificare:

#### 1. `src-tauri/tauri.conf.json`
```json
{
  "package": {
    "version": "1.0.1"  ← Cambia qui
  },
  "windows": [{
    "title": "Pratica Edilizia 1.0.1"  ← Cambia anche qui
  }]
}
```

#### 2. `src-tauri/Cargo.toml`
```toml
[package]
version = "1.0.1"  ← Cambia qui
```

#### 3. `package.json`
```json
{
  "version": "1.0.1"  ← Cambia qui
}
```

#### 4. `src/js/app.js`
Cerca queste righe (circa riga 193-197):
```javascript
let titleText = 'Pratica Edilizia 1.0.1';  ← Cambia qui

if (filePath) {
  titleText = `Pratica Edilizia 1.0.1 - ${filePath}`;  ← Cambia anche qui
}
```

#### 5. `src/index.html`
Cerca questa riga (circa riga 21):
```html
<span id="app-version" class="small">1.0.1</span>  ← Cambia qui
```

### ⚠️ IMPORTANTE
- Sostituisci **tutte** le occorrenze della vecchia versione con la nuova
- Usa lo stesso formato: `X.Y.Z` (es: 1.0.1, 1.1.0, 2.0.0)
- La versione deve essere identica in tutti i file

---

## 🔨 PASSO 2: Compilare l'Applicazione

Dopo aver aggiornato la versione, compila l'applicazione.

### Opzione A: Usa lo Script di Compilazione (CONSIGLIATO)

1. Esegui il tuo script di compilazione (es: `build-finale.bat` o `build-semplice.bat`)
2. Quando viene richiesta la password per firmare gli aggiornamenti, **inseriscila manualmente** nel terminale
3. Attendi che la compilazione finisca (può richiedere diversi minuti)

### Opzione B: Compilazione Manuale

Apri PowerShell nella cartella del progetto e esegui:

```powershell
# Imposta la variabile per la chiave privata
$env:TAURI_PRIVATE_KEY = (Resolve-Path "src-tauri\keys\keypair.key").Path

# Compila l'app
npm run build
```

### ✅ Verifica della Compilazione

Dopo la compilazione, verifica che il file MSI sia stato creato:

```
src-tauri\target\release\bundle\msi\Pratica Edilizia_1.0.1_x64_en-US.msi
```

**⚠️ IMPORTANTE:** Il nome del file deve corrispondere esattamente alla versione che hai impostato!

---

## 🔐 PASSO 3: Firmare gli Aggiornamenti (Se Necessario)

Se hai già configurato le chiavi per firmare gli aggiornamenti:

1. Lo script di compilazione dovrebbe farlo automaticamente
2. Verifica che siano stati creati i file `.zip.sig`:
   - `Pratica Edilizia_1.0.1_x64_en-US.msi.zip.sig`

Se devi firmare manualmente, usa:
```bash
cargo tauri signer sign -f "src-tauri\keys\keypair.key" "src-tauri\target\release\bundle\msi\Pratica Edilizia_1.0.1_x64_en-US.msi.zip"
```

---

## 🚀 PASSO 4: Pubblicare la Release su GitHub

### Metodo A: Usa lo Script Automatico (CONSIGLIATO)

1. Esegui `pubblica-release-github.bat` dalla root del progetto
2. Inserisci le informazioni richieste:
   - **Versione:** `1.0.1` (deve corrispondere alla versione compilata!)
   - **Titolo release:** `Release 1.0.1` (o quello che preferisci)
   - **Descrizione:** Una breve descrizione delle modifiche
   - **Repository GitHub:** `lorenzomotta/PRATICAEDILIZIA`
3. Lo script creerà automaticamente il tag Git e lo invierà a GitHub
4. Segui le istruzioni che appaiono per completare la release su GitHub

### Metodo B: Processo Manuale

#### 4.1: Crea e Invia il Tag Git

```bash
# Crea il tag
git tag -a "v1.0.1" -m "Release 1.0.1"

# Invia il tag a GitHub
git push origin v1.0.1
```

#### 4.2: Crea la Release su GitHub

1. Vai su GitHub: https://github.com/lorenzomotta/PRATICAEDILIZIA/releases/new
2. Seleziona il tag appena creato: `v1.0.1`
3. Inserisci il titolo: `Release 1.0.1`
4. Inserisci la descrizione delle modifiche
5. **Carica il file MSI:** `Pratica Edilizia_1.0.1_x64_en-US.msi`
6. Clicca su **"Publish release"**

### ✅ Verifica Finale

Dopo aver pubblicato la release:

1. Verifica che la release sia visibile su GitHub
2. Verifica che il file MSI sia scaricabile
3. Tauri genererà automaticamente il file `latest.json` necessario per gli aggiornamenti automatici

---

## 🔍 Checklist Completa

Prima di pubblicare, verifica:

- [ ] Versione aggiornata in `src-tauri/tauri.conf.json`
- [ ] Versione aggiornata in `src-tauri/Cargo.toml`
- [ ] Versione aggiornata in `package.json`
- [ ] Versione aggiornata in `src/js/app.js`
- [ ] Versione aggiornata in `src/index.html`
- [ ] Applicazione compilata con successo
- [ ] File MSI creato con il nome corretto
- [ ] File di aggiornamento firmato (se necessario)
- [ ] Tag Git creato e inviato
- [ ] Release pubblicata su GitHub
- [ ] File MSI caricato nella release

---

## ⚠️ Problemi Comuni e Soluzioni

### Problema: "File MSI non trovato"

**Causa:** La versione nel file di configurazione non corrisponde alla versione richiesta nello script.

**Soluzione:**
1. Verifica che la versione sia identica in tutti i file di configurazione
2. Ricompila l'applicazione
3. Verifica che il file MSI abbia il nome corretto

### Problema: "Errore durante la firma"

**Causa:** Password errata o chiavi non configurate.

**Soluzione:**
1. Verifica che la password sia corretta
2. Controlla che il file `src-tauri\keys\keypair.key` esista
3. Se necessario, rigenera le chiavi con `genera-chiavi.bat`

### Problema: "Tag già esistente"

**Causa:** Hai già creato un tag con quella versione.

**Soluzione:**
1. Elimina il tag locale: `git tag -d v1.0.1`
2. Elimina il tag remoto: `git push origin --delete v1.0.1`
3. Ricrea il tag seguendo il processo normale

---

## 📚 Convenzioni per le Versioni

Usa il formato **Semantic Versioning** (X.Y.Z):

- **X** (Major): Cambiamenti incompatibili con versioni precedenti
- **Y** (Minor): Nuove funzionalità compatibili
- **Z** (Patch): Correzioni di bug compatibili

**Esempi:**
- `1.0.0` → `1.0.1` = Patch (piccola correzione)
- `1.0.1` → `1.1.0` = Minor (nuova funzionalità)
- `1.1.0` → `2.0.0` = Major (grande cambiamento)

---

## 💡 Suggerimenti

1. **Sempre committare le modifiche** prima di compilare:
   ```bash
   git add .
   git commit -m "Aggiornata versione a 1.0.1"
   git push origin main
   ```

2. **Testare l'applicazione** dopo la compilazione prima di pubblicare

3. **Scrivere una descrizione chiara** nella release su GitHub per aiutare gli utenti a capire cosa è cambiato

4. **Mantenere un changelog** (file CHANGELOG.md) per tracciare tutte le modifiche

---

## 📞 Supporto

Se hai problemi durante il processo:

1. Verifica che tutti i file di configurazione abbiano la stessa versione
2. Controlla che il file MSI sia stato creato correttamente
3. Verifica i log di compilazione per eventuali errori
4. Assicurati di avere le ultime versioni di Node.js, Rust e Tauri CLI

---

**Ultimo aggiornamento:** Gennaio 2025

