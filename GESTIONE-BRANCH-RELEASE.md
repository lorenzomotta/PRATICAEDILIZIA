# Guida Completa: Gestione Branch e Release

Questa guida ti spiega passo-passo come creare branch, pubblicare modifiche e aggiornare le release dell'applicazione Pratica Edilizia.

---

## 📚 Indice

1. [Creare un Branch](#1-creare-un-branch)
2. [Lavorare su un Branch](#2-lavorare-su-un-branch)
3. [Pubblicare un Branch su GitHub](#3-pubblicare-un-branch-su-github)
4. [Unire un Branch al Main](#4-unire-un-branch-al-main)
5. [Aggiornare la Versione](#5-aggiornare-la-versione)
6. [Creare una Nuova Release](#6-creare-una-nuova-release)
7. [Workflow Completo Esempio](#7-workflow-completo-esempio)

---

## 1. Creare un Branch

Un branch è una "copia" del codice su cui puoi lavorare senza modificare la versione principale (main).

### Passo 1: Verifica lo stato attuale

Apri il terminale nella cartella del progetto e verifica su quale branch sei:

```bash
git status
```

Dovresti vedere qualcosa come:
```
On branch main
Your branch is up to date with 'origin/main'.
```

### Passo 2: Assicurati di essere aggiornato

Prima di creare un nuovo branch, assicurati di avere l'ultima versione del codice:

```bash
git pull origin main
```

### Passo 3: Crea un nuovo branch

Crea un nuovo branch con un nome descrittivo. Esempi:
- `feature/nuova-funzionalita` - per nuove funzionalità
- `fix/correzione-bug` - per correzioni di bug
- `test/test-modifiche` - per testare modifiche

**Esempio:**
```bash
git checkout -b feature/stampa-pdf
```

Questo comando:
- Crea un nuovo branch chiamato `feature/stampa-pdf`
- Ti sposta automaticamente su quel branch

### Passo 4: Verifica di essere sul nuovo branch

```bash
git branch
```

Vedrai un asterisco (*) accanto al branch corrente:
```
  main
* feature/stampa-pdf
```

---

## 2. Lavorare su un Branch

Ora puoi fare tutte le modifiche che vuoi senza toccare il codice principale.

### Passo 1: Fai le tue modifiche

Modifica i file come preferisci usando il tuo editor (Cursor, VS Code, ecc.)

### Passo 2: Verifica le modifiche

Controlla quali file hai modificato:

```bash
git status
```

Vedrai qualcosa come:
```
On branch feature/stampa-pdf
Changes not staged for commit:
  modified:   src/js/app.js
  modified:   src/styles/main.css
```

### Passo 3: Aggiungi le modifiche

Aggiungi i file modificati all'area di staging (preparazione per il commit):

**Per aggiungere tutti i file modificati:**
```bash
git add .
```

**Per aggiungere file specifici:**
```bash
git add src/js/app.js
git add src/styles/main.css
```

### Passo 4: Crea un commit

Un commit è un "salvataggio" delle tue modifiche con una descrizione:

```bash
git commit -m "Aggiunta funzionalità stampa PDF"
```

**Suggerimenti per i messaggi di commit:**
- Sii descrittivo: "Aggiunta funzionalità stampa PDF" è meglio di "modifiche"
- Usa l'imperativo: "Aggiungi" invece di "Aggiunto"
- Se risolvi un bug: "Corretto errore calcolo superfici"

### Passo 5: Continua a lavorare

Puoi fare più commit sullo stesso branch:

```bash
# Fai altre modifiche...
git add .
git commit -m "Migliorato layout stampa PDF"
```

---

## 3. Pubblicare un Branch su GitHub

Quando hai finito di lavorare sul branch (o vuoi salvare il lavoro), pubblicalo su GitHub.

### Passo 1: Pubblica il branch

```bash
git push origin feature/stampa-pdf
```

**Nota:** La prima volta che pubblichi un branch, Git ti darà un suggerimento. Puoi copiare e incollare il comando suggerito, oppure usare:

```bash
git push -u origin feature/stampa-pdf
```

Il flag `-u` (o `--set-upstream`) collega il tuo branch locale a quello remoto.

### Passo 2: Verifica su GitHub

1. Vai su GitHub: https://github.com/lorenzomotta/PRATICAEDILIZIA
2. Clicca sul menu a tendina "Branch" (in alto, accanto a "Code")
3. Dovresti vedere il tuo nuovo branch nella lista

---

## 4. Unire un Branch al Main

Quando hai finito di testare le modifiche sul branch e sei soddisfatto, puoi unirlo al branch principale (main).

### Opzione A: Unire tramite GitHub (Consigliato per principianti)

1. Vai su GitHub: https://github.com/lorenzomotta/PRATICAEDILIZIA
2. Clicca su "Pull requests" nella barra superiore
3. Clicca su "New pull request"
4. Seleziona:
   - **Base:** `main` (dove vuoi unire)
   - **Compare:** `feature/stampa-pdf` (il tuo branch)
5. Clicca "Create pull request"
6. Aggiungi una descrizione delle modifiche
7. Clicca "Create pull request"
8. Se tutto è ok, clicca "Merge pull request"
9. Clicca "Confirm merge"

### Opzione B: Unire tramite terminale

**Attenzione:** Assicurati di aver pubblicato tutte le modifiche del branch prima!

```bash
# 1. Torna sul branch main
git checkout main

# 2. Aggiorna main con le ultime modifiche da GitHub
git pull origin main

# 3. Unisci il tuo branch a main
git merge feature/stampa-pdf

# 4. Pubblica le modifiche su GitHub
git push origin main
```

### Dopo l'unione

Dopo aver unito il branch, puoi eliminarlo (opzionale):

**Su GitHub:**
- Dopo aver fatto merge di una Pull Request, GitHub ti chiederà se vuoi eliminare il branch

**Dal terminale:**
```bash
# Elimina il branch locale
git branch -d feature/stampa-pdf

# Elimina il branch remoto (su GitHub)
git push origin --delete feature/stampa-pdf
```

---

## 5. Aggiornare la Versione

Prima di creare una nuova release, devi aggiornare il numero di versione.

### Metodo Automatico (Consigliato)

Usa lo script `aggiorna.bat` che abbiamo creato:

1. Esegui `aggiorna.bat` dalla root del progetto
2. Scegli il tipo di aggiornamento:
   - **1** = Patch (1.0.0 → 1.0.1) - per piccole correzioni
   - **2** = Minor (1.0.0 → 1.1.0) - per nuove funzionalità
   - **3** = Major (1.0.0 → 2.0.0) - per grandi cambiamenti
3. Lo script aggiornerà automaticamente:
   - `src-tauri/tauri.conf.json` (version e title)
   - `src-tauri/Cargo.toml` (version)

### Metodo Manuale

Se preferisci farlo manualmente:

**1. Aggiorna `src-tauri/tauri.conf.json`:**
```json
{
  "package": {
    "version": "1.0.1"  // Cambia qui
  },
  "windows": [{
    "title": "Pratica Edilizia 1.0.1"  // Cambia anche qui
  }]
}
```

**2. Aggiorna `src-tauri/Cargo.toml`:**
```toml
[package]
version = "1.0.1"  // Cambia qui
```

### Dopo aver aggiornato la versione

Fai un commit delle modifiche:

```bash
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "Aggiornata versione a 1.0.1"
git push origin main
```

---

## 6. Creare una Nuova Release

Una release è una versione "ufficiale" dell'app che gli utenti possono scaricare.

### Passo 1: Compila l'Applicazione

Prima di creare la release, devi compilare l'app con la nuova versione:

```bash
cd src-tauri
cargo tauri build
```

**Nota:** Se hai configurato le chiavi per firmare gli aggiornamenti:
```bash
cargo tauri build -- --signer keys/keypair.key
```

La compilazione può richiedere diversi minuti. Alla fine troverai il file MSI in:
```
src-tauri/target/release/bundle/msi/Pratica Edilizia_X.X.X_x64_en-US.msi
```

### Passo 2: Crea un Tag Git

Un tag è un "marchio" che indica una versione specifica del codice.

```bash
# Torna alla root del progetto
cd ..

# Crea il tag (sostituisci X.X.X con la tua versione)
git tag -a v1.0.1 -m "Release 1.0.1 - Descrizione delle modifiche"

# Pubblica il tag su GitHub
git push origin v1.0.1
```

**Esempio:**
```bash
git tag -a v1.0.1 -m "Release 1.0.1 - Aggiunta funzionalità stampa PDF"
git push origin v1.0.1
```

### Passo 3: Crea la Release su GitHub

1. Vai su GitHub: https://github.com/lorenzomotta/PRATICAEDILIZIA
2. Clicca su "Releases" nella sidebar destra (o vai a: https://github.com/lorenzomotta/PRATICAEDILIZIA/releases)
3. Clicca su "Create a new release" (o "Draft a new release")
4. Compila il form:
   - **Choose a tag:** Seleziona il tag che hai appena creato (es: `v1.0.1`)
   - **Release title:** Inserisci un titolo (es: "Release 1.0.1")
   - **Description:** Descrivi le modifiche e le nuove funzionalità
   - **Attach binaries:** Clicca su "selecting them" o trascina il file MSI
     - File da caricare: `src-tauri/target/release/bundle/msi/Pratica Edilizia_1.0.1_x64_en-US.msi`
5. **IMPORTANTE:** Assicurati che il file `.msi` sia caricato direttamente (non zippato)
6. **IMPORTANTE:** Rimuovi il flag "Pre-release" se vuoi renderla una release ufficiale
7. Clicca "Publish release"

### Passo 4: Verifica la Release

1. Vai alla pagina delle releases: https://github.com/lorenzomotta/PRATICAEDILIZIA/releases
2. Verifica che:
   - La release sia pubblicata (non "Pre-release")
   - Il file `.msi` sia presente nella sezione "Assets"
   - Il file `latest.json` sia stato generato automaticamente (dovrebbe apparire dopo qualche secondo)

---

## 7. Workflow Completo Esempio

Ecco un esempio completo di workflow dalla creazione del branch alla release:

### Scenario: Aggiungere una nuova funzionalità "Stampa PDF"

```bash
# 1. Assicurati di essere aggiornato
git checkout main
git pull origin main

# 2. Crea un nuovo branch
git checkout -b feature/stampa-pdf

# 3. Fai le tue modifiche (usa il tuo editor)
# ... modifica i file ...

# 4. Salva le modifiche
git add .
git commit -m "Aggiunta funzionalità stampa PDF"

# 5. Continua a lavorare e fai altri commit se necessario
git add .
git commit -m "Migliorato layout stampa PDF"

# 6. Pubblica il branch su GitHub
git push -u origin feature/stampa-pdf

# 7. (Opzionale) Crea una Pull Request su GitHub per revisione

# 8. Unisci il branch a main (tramite GitHub o terminale)
git checkout main
git pull origin main
git merge feature/stampa-pdf
git push origin main

# 9. Aggiorna la versione
# Esegui aggiorna.bat e scegli l'opzione appropriata (es: 2 per Minor)

# 10. Compila l'app
cd src-tauri
cargo tauri build
cd ..

# 11. Crea il tag
git tag -a v1.1.0 -m "Release 1.1.0 - Aggiunta funzionalità stampa PDF"
git push origin v1.1.0

# 12. Crea la release su GitHub (vedi sezione 6, passo 3)

# 13. (Opzionale) Elimina il branch dopo l'unione
git branch -d feature/stampa-pdf
git push origin --delete feature/stampa-pdf
```

---

## 🔍 Comandi Utili

### Vedere tutti i branch
```bash
git branch          # Branch locali
git branch -a       # Tutti i branch (locali e remoti)
```

### Cambiare branch
```bash
git checkout nome-branch
```

### Vedere lo storico dei commit
```bash
git log --oneline
```

### Annullare modifiche non salvate
```bash
git checkout -- nome-file    # Annulla modifiche a un file specifico
git checkout -- .            # Annulla tutte le modifiche
```

### Vedere le differenze
```bash
git diff                    # Differenze non salvate
git diff main..feature/stampa-pdf  # Differenze tra due branch
```

---

## ⚠️ Note Importanti

1. **Sempre aggiornare main prima di creare un branch:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Fai commit frequenti:** È meglio fare molti piccoli commit che uno grande

3. **Testa le modifiche prima di unire a main:** Assicurati che tutto funzioni sul branch prima di unirlo

4. **Aggiorna sempre la versione prima di creare una release:** Usa `aggiorna.bat` per evitare errori

5. **Carica sempre il file .msi direttamente (non zippato):** Serve per gli aggiornamenti automatici

6. **Rimuovi il flag "Pre-release"** quando pubblichi una release ufficiale

---

## 🆘 Risoluzione Problemi

### "Branch already exists"
Se il branch esiste già:
```bash
git checkout nome-branch    # Passa al branch esistente
```

### "Your branch is behind"
Aggiorna il branch:
```bash
git pull origin main
```

### "Merge conflict"
Se ci sono conflitti durante l'unione:
1. Git ti mostrerà i file in conflitto
2. Apri i file e risolvi i conflitti manualmente
3. Salva i file
4. Esegui: `git add .` e `git commit`

### "Tag already exists"
Se il tag esiste già:
```bash
git tag -d v1.0.1              # Elimina tag locale
git push origin --delete v1.0.1 # Elimina tag remoto
# Poi ricrea il tag
```

---

## 📚 Risorse Aggiuntive

- [Documentazione Git](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Tauri Updater Documentation](https://tauri.app/v1/guides/distribution/updater)

---

**Buon lavoro! 🚀**

