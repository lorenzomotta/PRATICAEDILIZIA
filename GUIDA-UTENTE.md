# 📘 Guida Utente - Pratica Edilizia

## Indice
1. [Introduzione](#introduzione)
2. [Primi Passi](#primi-passi)
3. [Gestione Edifici](#gestione-edifici)
4. [Gestione Piani](#gestione-piani)
5. [Gestione Locali](#gestione-locali)
6. [Calcolo Aperture](#calcolo-aperture)
7. [Schema Aggetto](#schema-aggetto)
8. [Report e Riepiloghi](#report-e-riepiloghi)
9. [Gestione File](#gestione-file)
10. [FunzionalitÃ  Avanzate](#funzionalitÃ -avanzate)

---

## 🎯 Introduzione

**Pratica Edilizia** è un'applicazione desktop professionale per la gestione completa di progetti edilizi. Ti permette di:

- Organizzare edifici, piani e locali in modo strutturato
- Calcolare automaticamente i rapporti di superficie e area finestrata
- Generare report dettagliati per la conformitÃ  normativa
- Esportare i dati in vari formati

L'applicazione è progettata per tecnici, architetti e professionisti del settore edilizio che devono gestire pratiche edilizie e verificare la conformitÃ  dei progetti.

---

## 🚀 Primi Passi

### Interfaccia Principale

Quando apri l'applicazione, vedrai:

- **Barra di navigazione superiore** con i pulsanti principali:
  - **Edifici** - Gestione degli edifici
  - **Locali** - Gestione dei locali
  - **Rapporti** - Visualizzazione report
  - **Superfici Residenziali** - Riepilogo superfici residenziali
  - **Superfici Non Residenziali** - Riepilogo superfici non residenziali
  - **Costo di Costruzione** - Calcolo costi

- **Menu File** (pulsante "File" nella barra):
  - Nuovo progetto
  - Salva/Salva con nome
  - Importa/Esporta dati

### Struttura Dati

L'applicazione organizza i dati in una gerarchia:

```
Edificio
  └── Piano
      └── Locale
          └── Aperture (finestre/porte)
```

**Esempio pratico:**
- **Edificio:** "Palazzo Via Roma 10"
  - **Piano:** "Piano Terra"
    - **Locale:** "Soggiorno"
      - **Apertura:** "Finestra principale"

---

## 🏢 Gestione Edifici

### Creare un Nuovo Edificio

1. Clicca sul pulsante **"Edifici"** nella barra di navigazione (se non è giÃ  selezionato)
2. Clicca sul pulsante verde **"+"** accanto al titolo "Gestione Edifici"
3. Compila il form che appare:
   - **Nome Edificio** (obbligatorio)
   - Altri campi opzionali
4. Clicca **"Salva"**

### Modificare un Edificio

1. Nella vista **Edifici**, trova l'edificio che vuoi modificare
2. Clicca sul pulsante **matita** (✏️) accanto al nome dell'edificio
3. Modifica i campi desiderati
4. Clicca **"Salva"**

### Eliminare un Edificio

1. Trova l'edificio nella lista
2. Clicca sul pulsante **cestino** (—‘) accanto al nome
3. Conferma l'eliminazione

⚠️  **Attenzione:** Eliminare un edificio eliminerÃ  anche tutti i piani e locali associati!

### Visualizzazione Edifici

- **Sidebar sinistra:** Elenco di tutti gli edifici con contatore
- **Area principale:** Dettagli dell'edificio selezionato con i suoi piani

---

## — Gestione Piani

### Creare un Nuovo Piano

1. Seleziona un edificio dalla sidebar o dalla lista principale
2. Clicca sul pulsante **"+"** nella sezione "Piani" dell'edificio
3. Compila il form:
   - **Nome Piano** (es: "Piano Terra", "Primo Piano")
   - Altri campi opzionali
4. Clicca **"Salva"**

### Modificare un Piano

1. Trova il piano nell'elenco dei piani dell'edificio
2. Clicca sul pulsante **matita** (✏️) accanto al nome
3. Modifica i campi
4. Clicca **"Salva"**

### Eliminare un Piano

1. Trova il piano nell'elenco
2. Clicca sul pulsante **cestino** (—‘)
3. Conferma l'eliminazione

⚠️  **Attenzione:** Eliminare un piano eliminerÃ  anche tutti i locali associati!

---

## 🚪 Gestione Locali

### Creare un Nuovo Locale

**Metodo 1 - Dalla vista Edifici:**
1. Seleziona un edificio
2. Seleziona un piano
3. Clicca sul pulsante **"+"** nella sezione "Locali" del piano
4. Compila il form (vedi sezione seguente)
5. Clicca **"Salva"**

**Metodo 2 - Dalla vista Locali:**
1. Clicca sul pulsante **"Locali"** nella barra di navigazione
2. Seleziona un edificio dal menu a tendina
3. Seleziona un piano dal menu a tendina
4. Clicca sul pulsante verde **"+"** accanto al titolo
5. Compila il form
6. Clicca **"Salva"**

### Form Modifica Locale

Il form per creare/modificare un locale contiene diverse sezioni:

#### Informazioni Base
- **Nome Locale** (obbligatorio)
- **Tipologia Superficie:**
  - Residenziale
  - Commerciale
  - Ufficio
  - Magazzino
  - Altro

#### Superficie
- **Rapporto Richiesto:** Il rapporto minimo richiesto dalla normativa (es: "1/8" per residenziale)
- **Determinazione Superficie:** Campo per inserire la superficie lorda o altri valori
- **Superficie Utile:** Calcolata automaticamente in base alla formula

#### Aperture
- Tabella per gestire tutte le aperture del locale
- Ogni apertura ha:
  - Numero aggetto
  - Larghezza
  - Altezza
  - HDAVANZALE
  - IMPOSTA (default: 0,20)
  - SPORGENZA
  - Calcoli automatici (H TOT, L/2, UNTERZO, INTERO, AREA FINESTRATA)

#### Pulsanti Azione
- **"+"** (verde): Aggiungi nuova apertura
- **✏️** (matita): Modifica apertura
- **—‘** (cestino): Elimina apertura
- **📐** (squadra): Visualizza Schema Aggetto

### Modificare un Locale

1. Dalla vista **Locali**, trova il locale nella lista
2. Clicca sul pulsante **matita** (✏️) accanto al nome del locale
3. Modifica i campi desiderati
4. Clicca **"Salva"**

### Eliminare un Locale

1. Trova il locale nella lista
2. Clicca sul pulsante **cestino** (—‘)
3. Conferma l'eliminazione

---

## 🪟 Calcolo Aperture

### Aggiungere un'Apertura

1. Apri il form di modifica di un locale
2. Nella sezione "Aperture", clicca sul pulsante **"+"** verde
3. Compila i campi dell'apertura:
   - **Numero Aggetto:** Numero identificativo dell'aggetto
   - **Larghezza:** Larghezza dell'apertura in metri
   - **Altezza:** Altezza dell'apertura in metri
   - **HDAVANZALE:** Altezza davanzale
   - **IMPOSTA:** Default 0,20 metri
   - **SPORGENZA:** Sporgenza dell'aggetto

### Calcoli Automatici

L'applicazione calcola automaticamente:

- **H TOT** = ALTEZZA + HDAVANZALE + IMPOSTA
- **L/2** = SPORGENZA / 2
- **UNTERZO:** Calcolato secondo la logica normativa
- **INTERO:** Calcolato secondo la logica normativa
- **AREA FINESTRATA** = LARGHEZZA × (INTERO + (UNTERZO / 3))

### Modificare un'Apertura

1. Nel form del locale, trova l'apertura nella tabella
2. Clicca sul pulsante **matita** (✏️) nella riga dell'apertura
3. Modifica i valori
4. I calcoli si aggiornano automaticamente

### Eliminare un'Apertura

1. Trova l'apertura nella tabella
2. Clicca sul pulsante **cestino** (—‘) nella riga
3. Conferma l'eliminazione

---

## 📐 Schema Aggetto

Lo Schema Aggetto è una visualizzazione grafica dell'aggetto che ti permette di vedere e modificare le caratteristiche dell'apertura.

### Visualizzare lo Schema Aggetto

1. Nel form di modifica locale, trova l'apertura desiderata
2. Clicca sul pulsante **squadra** (📐) nella riga dell'apertura
3. Si aprirÃ  una finestra modale con lo schema grafico

### Modificare lo Schema

Nello schema aggetto puoi:
- Visualizzare graficamente le dimensioni
- Modificare il **Numero Aggetto** direttamente nello schema
- Esportare lo schema in formato DXF
- Stampare lo schema

### Esportare Schema DXF

1. Apri lo Schema Aggetto
2. Clicca sul pulsante **"Esporta DXF"**
3. Scegli la posizione dove salvare il file
4. Il file viene salvato con tutte le informazioni dell'aggetto

---

## 📊 Report e Riepiloghi

### Vista Rapporti

1. Clicca sul pulsante **"Rapporti"** nella barra di navigazione
2. Seleziona un edificio dal menu a tendina
3. Visualizzerai un report completo con:
   - Tutti i piani dell'edificio
   - Tutti i locali per piano
   - Superficie utile di ogni locale
   - Area finestrata totale
   - Rapporto calcolato
   - Indicazione di conformitÃ  (✓ o ✗Œ)

### Superfici Residenziali

1. Clicca sul pulsante **"Superfici Residenziali"**
2. Visualizzerai un riepilogo di:
   - Totale superficie residenziale per edificio
   - Suddivisione per piano
   - ConformitÃ  ai requisiti

### Superfici Non Residenziali

1. Clicca sul pulsante **"Superfici Non Residenziali"**
2. Visualizzerai un riepilogo simile per le superfici non residenziali

### Costo di Costruzione

1. Clicca sul pulsante **"Costo di Costruzione"**
2. Visualizzerai un calcolo del costo totale di costruzione basato sulle superfici

---

## ’¾ Gestione File

### Salvare un Progetto

**Salva:**
- Clicca su **File ✗†’ Salva**
- Se è la prima volta, ti verrÃ  chiesto dove salvare
- Le volte successive salverÃ  automaticamente nello stesso file

**Salva con Nome:**
- Clicca su **File ✗†’ Salva con Nome**
- Scegli la posizione e il nome del file
- Il file viene salvato con estensione `.lor`

### Creare un Nuovo Progetto

1. Clicca su **File ✗†’ Nuovo**
2. Conferma se vuoi salvare le modifiche al progetto corrente
3. Si aprirÃ  un progetto vuoto

### Importare Dati

**Importa Pratica (.lor):**
1. Clicca su **File ✗†’ Importa Pratica**
2. Seleziona il file `.lor` da importare
3. I dati vengono caricati nell'applicazione

**Importa JSON:**
1. Clicca su **File ✗†’ Importa JSON**
2. Seleziona il file JSON da importare
3. I dati vengono caricati e convertiti nel formato dell'applicazione

### Esportare Dati

**Esporta JSON:**
1. Clicca su **File ✗†’ Esporta JSON**
2. Scegli dove salvare il file
3. Tutti i dati vengono esportati in formato JSON

**Esporta Excel:**
1. Clicca su **File ✗†’ Esporta Excel**
2. Scegli dove salvare il file
3. I dati vengono esportati in formato Excel (.xlsx)

---

## ⚙️ FunzionalitÃ  Avanzate

### Calcoli Automatici

L'applicazione esegue calcoli automatici in tempo reale:

- **Superficie Utile:** Calcolata automaticamente quando inserisci la "Determinazione Superficie"
- **Area Finestrata:** Calcolata per ogni apertura
- **Rapporto:** Calcolato automaticamente come rapporto tra Area Finestrata e Superficie Utile
- **ConformitÃ :** Verificata automaticamente confrontando il rapporto calcolato con quello richiesto

### Formato Numeri

L'applicazione usa il formato italiano:
- **Separatore decimale:** Virgola (`,`)
- **Esempio:** 12,50 metri (non 12.50)

### Validazione Dati

L'applicazione valida automaticamente:
- Campi obbligatori non vuoti
- Formato numerico corretto
- Rapporti di conformitÃ 

### Indicatori Visivi

- **✓ Verde:** ConformitÃ  verificata
- **✗Œ Rosso:** Non conformitÃ 
- **Celle gialle:** Campi calcolati automaticamente
- **Celle grigie:** Campi in sola lettura

---

## ’¡ Suggerimenti e Best Practices

### Organizzazione Progetto

1. **Inizia sempre dall'edificio:** Crea prima l'edificio, poi i piani, poi i locali
2. **Usa nomi descrittivi:** Nomi chiari facilitano la navigazione
3. **Salva frequentemente:** Usa Ctrl+S o File ✗†’ Salva regolarmente
4. **Backup regolari:** Esporta periodicamente i dati in JSON come backup

### Inserimento Dati

1. **Inserisci i dati in ordine:** Edificio ✗†’ Piano ✗†’ Locale ✗†’ Aperture
2. **Verifica i calcoli:** Controlla sempre che i calcoli automatici siano corretti
3. **Usa lo Schema Aggetto:** Visualizza sempre lo schema per verificare le aperture
4. **Controlla i rapporti:** Verifica sempre la conformitÃ  nei report

### Risoluzione Problemi

**I calcoli non si aggiornano:**
- Controlla che tutti i campi obbligatori siano compilati
- Verifica il formato dei numeri (usa la virgola, non il punto)

**Non riesco a salvare:**
- Verifica di avere i permessi di scrittura nella cartella
- Controlla che il file non sia aperto in un'altra applicazione

**I dati non si vedono:**
- Verifica di aver selezionato l'edificio corretto
- Controlla che il piano e il locale esistano

---

## 📞 Supporto

Per assistenza o segnalazione di problemi:
- Consulta la documentazione tecnica nel file `README.md`
- Verifica la versione dell'applicazione nella barra di navigazione

---

**Versione:** 1.1.2  
**Ultimo aggiornamento:** Dicembre 2024
