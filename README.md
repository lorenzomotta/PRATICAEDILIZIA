# Pratica Edilizia - App Tauri

Applicazione desktop per la gestione di edifici, piani e locali con calcolo dei rapporti di superficie.

## Struttura del Progetto

```
pratica-edilizia/
├── src/                    # Frontend (HTML, CSS, JS)
│   ├── index.html         # Pagina principale
│   ├── styles/
│   │   └── main.css       # Stili principali
│   └── js/
│       ├── app.js         # Applicazione principale
│       ├── models.js      # Modello dati
│       ├── calcoli.js     # Funzioni di calcolo
│       └── locale-form.js # Form gestione locali
├── src-tauri/             # Backend Rust
│   ├── Cargo.toml
│   ├── build.rs
│   └── src/
│       └── main.rs
├── package.json
└── tauri.conf.json
```

## Funzionalità

### 1. Gestione Edifici
- Creazione, modifica ed eliminazione di edifici
- Ogni edificio può avere più piani

### 2. Gestione Piani
- Creazione, modifica ed eliminazione di piani
- Ogni piano appartiene a un edificio

### 3. Gestione Locali
- Creazione, modifica ed eliminazione di locali
- Ogni locale appartiene a un piano
- Ogni locale ha:
  - Nome
  - Tipologia di superficie (Residenziale, Commerciale, Ufficio, Magazzino, Altro)
  - Superficie utile (calcolata da formula matematica)
  - Rapporto richiesto
  - Aperture (multiple)

### 4. Calcolo Aperture
Ogni apertura ha:
- Larghezza
- Altezza
- HDAVANZALE
- IMPOSTA (default 0,20)
- SPORGENZA

Calcoli automatici:
- H TOT = ALTEZZA + HDAVANZALE + IMPOSTA
- L/2 = SPORGENZA / 2
- UNTERZO (calcolato secondo logica specifica)
- INTERO (calcolato secondo logica specifica)
- AREA FINESTRATA = LARGHEZZA * (INTERO + (UNTERZO / 3))

### 5. Report Riepilogativi
- Visualizzazione di tutti i locali per edificio
- Suddivisione per piano
- Calcolo rapporti e verifica conformità

## Installazione

1. Installa le dipendenze:
```bash
npm install
```

2. Installa Rust e Tauri CLI (se non già installato):
```bash
# Segui le istruzioni su https://tauri.app/v1/guides/getting-started/prerequisites
```

3. Avvia l'app in modalità sviluppo:
```bash
npm run dev
```

4. Compila l'app per la produzione:
```bash
npm run build
```

## Note Tecniche

- I dati vengono salvati nel localStorage del browser
- Formato numeri italiano (virgola come separatore decimale)
- Calcoli in tempo reale durante la digitazione
- Validazione automatica dei rapporti superficie/area finestrata

## Prossimi Sviluppi

- Esportazione report in PDF/Excel
- Backup e ripristino dati
- Gestione progetti multipli
- Affinamento tipologie superficie con valori predefiniti

