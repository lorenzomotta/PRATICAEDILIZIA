// Gestione schema grafico aggetto
import { parseItalianNumber, formatItalianNumber } from './calcoli.js';
import { calcolaApertura } from './calcoli.js';

/**
 * Genera lo schema grafico dell'aggetto
 */
function generaSchemaAggetto(dati) {
  const container = document.getElementById('schema-aggetto-container');
  if (!container) return;

  // Estrai i dati (tutte le misure sono in METRI)
  const edificio = dati.edificio || 'N/A';
  const piano = dati.piano || 'N/A';
  const locale = dati.locale || 'N/A';
  const nagg = dati.nagg || '';
  const larghezza = parseItalianNumber(dati.larghezza || '0') || 0; // in metri
  const altezza = parseItalianNumber(dati.altezza || '0') || 0; // in metri (es: 1.00 = 1 metro)
  const sporgenza = parseItalianNumber(dati.sporgenza || '0') || 0; // in metri
  const imposta = parseItalianNumber(dati.imposta || '0,20') || 0.20; // in metri (0.20 = 20 cm)
  const hdavanzale = parseItalianNumber(dati.hdavanzale || '0') || 0; // in metri (es: 1.00 = 1 metro)

  // Calcola i valori dell'apertura per ottenere htot
  const calcoli = calcolaApertura({
    larghezza: larghezza,
    altezza: altezza,
    hdavanzale: hdavanzale,
    imposta: imposta,
    sporgenza: sporgenza
  });
  const htot = calcoli.htot; // Altezza totale in metri
  const intero = calcoli.intero; // INTERO in metri
  const unterzo = calcoli.unterzo; // UNTERZO in metri

  // Dimensioni foglio A4 in cm
  const a4Width = 21;  // 21 cm
  const a4Height = 29.7; // 29.7 cm
  
  // Scala 1:20 (1 unità nel disegno = 20 unità reali)
  // Quindi 1 metro reale = 5 cm nel disegno (100cm / 20 = 5cm)
  // Esempio: hdavanzale = 1.00 metro → nel disegno = 1.00 * 5 = 5 cm
  const scala = 1 / 20; // Fattore di scala
  const scalaCm = 5; // 1 metro = 5 cm nel disegno (scala 1:20)
  
  // Prima riga orizzontale: dista 18 cm dal bordo superiore, centrata, lunga 12 cm
  const riga1Y = 18; // Distanza dal bordo superiore
  const riga1Length = 12; // Lunghezza della riga
  const centroFoglio = a4Width / 2; // Centro del foglio = 10.5 cm
  const riga1X1 = centroFoglio - (riga1Length / 2); // 10.5 - 6 = 4.5 cm
  const riga1X2 = centroFoglio + (riga1Length / 2); // 10.5 + 6 = 16.5 cm
  
  // Prima riga verticale: parte da x+2 (rispetto alla riga orizzontale), va verso l'alto
  // Lunghezza = altezza totale in scala 1:20
  const rigaVerticale1X = riga1X1 + 2; // 4.5 + 2 = 6.5 cm
  const rigaVerticale1YStart = riga1Y; // Parte dalla riga orizzontale (y = 18)
  const rigaVerticale1Length = htot * scalaCm; // htot in metri * 5 = lunghezza in cm (scala 1:20)
  const rigaVerticale1YEnd = riga1Y - rigaVerticale1Length; // Va verso l'alto (y diminuisce)
  
  // Seconda riga verticale: parte da x+2 + distanza proporzionale alla scala 1:20
  // Distanza aumentata proporzionalmente: da 0.40 cm (scala 1:50) a 1.0 cm (scala 1:20)
  // Rapporto scala: 50/20 = 2.5, quindi 0.40 * 2.5 = 1.0 cm
  const rigaVerticale2X = riga1X1 + 2 + 1.0; // 4.5 + 2 + 1.0 = 7.5 cm
  const rigaVerticale2YStart = riga1Y; // Parte dalla riga orizzontale (y = 18)
  const rigaVerticale2YEnd = riga1Y - rigaVerticale1Length; // Stessa altezza della prima
  
  // Prima riga orizzontale tra le due verticali: posizionata all'altezza davanzale
  // hdavanzale è in METRI, quindi: hdavanzale * scalaCm = hdavanzale * 5 = distanza in cm nel disegno
  // Esempio: hdavanzale = 1.00 metro → y = 18 - (1.00 * 5) = 18 - 5 = 13 cm (scala 1:20)
  // La parte gialla (davanzale) va dalla riga base (y=18) alla riga del davanzale
  const rigaOrizzontaleDavanzaleY = riga1Y - (hdavanzale * scalaCm); // y = 18 - (hdavanzale in metri * 5 cm)
  const rigaOrizzontaleDavanzaleX1 = rigaVerticale1X; // Inizia dalla prima verticale
  const rigaOrizzontaleDavanzaleX2 = rigaVerticale2X; // Finisce alla seconda verticale
  
  // Riga orizzontale tratteggiata condizionale: unisce le due righe verticali principali
  // Viene tracciata SOLO se hdavanzale < 0.60 metri
  // Posizione Y: +0.60 metri SOPRA la prima riga orizzontale (riga1Y)
  // Nel sistema SVG y=0 è in alto, quindi per andare SOPRA dobbiamo DIMINUIRE y
  // Esempio: y = 18 - (0.60 * 5) = 18 - 3 = 15 cm
  const rigaOrizzontaleCondizionaleY = riga1Y - (0.60 * scalaCm); // y = 18 - (0.60 * 5) = 15 cm
  const rigaOrizzontaleCondizionaleX1 = rigaVerticale1X; // Inizia dalla prima verticale
  const rigaOrizzontaleCondizionaleX2 = rigaVerticale2X; // Finisce alla seconda verticale
  const mostraRigaCondizionale = hdavanzale < 0.60; // Solo se hdavanzale < 0.60 metri
  
  // Seconda riga orizzontale tra le due verticali: posizionata all'altezza apertura
  // L'altezza apertura è in METRI e va calcolata DALLA RIGA DEL DAVANZALE verso l'alto
  // Esempio: hdavanzale = 1.00 m, altezza = 1.50 m
  //   - Riga davanzale: y = 18 - (1.00 * 5) = 13 cm (scala 1:20)
  //   - Riga apertura: y = 13 - (1.50 * 5) = 13 - 7.5 = 5.5 cm
  // La parte rossa (apertura) va dalla riga del davanzale (y=13) alla riga dell'apertura (y=5.5)
  // Quindi la parte rossa è alta 7.5 cm e la parte gialla è alta 5 cm (proporzione corretta: 1.50/1.00 = 1.5)
  const rigaOrizzontaleAltezzaY = rigaOrizzontaleDavanzaleY - (altezza * scalaCm); // y = rigaDavanzale - (altezza in metri * 5 cm)
  const rigaOrizzontaleAltezzaX1 = rigaVerticale1X; // Inizia dalla prima verticale
  const rigaOrizzontaleAltezzaX2 = rigaVerticale2X; // Finisce alla seconda verticale
  
  // Terza riga orizzontale: chiude in alto le due righe verticali
  // Collega le estremità superiori delle due righe verticali
  const rigaOrizzontaleChiusuraY = rigaVerticale1YEnd; // Stessa y delle estremità superiori delle verticali
  const rigaOrizzontaleChiusuraX1 = rigaVerticale1X; // Inizia dalla prima verticale
  const rigaOrizzontaleChiusuraX2 = rigaVerticale2X; // Finisce alla seconda verticale
  
  // Quarta riga orizzontale: parte dal punto giallo (estremità superiore) e va verso destra
  // Lunghezza = sporgenza in scala 1:20 (sporgenza in metri × 5 cm)
  // Esempio: sporgenza = 1.50 metri → lunghezza = 1.50 × 5 = 7.5 cm
  const rigaOrizzontaleSporgenzaY = rigaVerticale1YEnd; // Stessa y del punto giallo (estremità superiore)
  const rigaOrizzontaleSporgenzaX1 = rigaVerticale2X; // Parte dalla seconda verticale (punto giallo)
  const rigaOrizzontaleSporgenzaLength = sporgenza * scalaCm; // sporgenza in metri × 5 cm
  const rigaOrizzontaleSporgenzaX2 = rigaVerticale2X + rigaOrizzontaleSporgenzaLength; // Finisce a x + lunghezza sporgenza
  
  // Riga verticale tratteggiata: parte dal vertice destro della riga sporgenza, va verso il basso
  // Lunghezza = metà sporgenza in scala 1:20 ((sporgenza / 2) × 5 cm)
  // Esempio: sporgenza = 1.50 metri → lunghezza = (1.50 / 2) × 5 = 0.75 × 5 = 3.75 cm
  const rigaVerticaleSporgenzaX = rigaOrizzontaleSporgenzaX2; // Stessa x del vertice destro
  const rigaVerticaleSporgenzaYStart = rigaOrizzontaleSporgenzaY; // Parte dal vertice destro (y del punto giallo)
  const rigaVerticaleSporgenzaLength = (sporgenza / 2) * scalaCm; // (sporgenza / 2) in metri × 5 cm
  const rigaVerticaleSporgenzaYEnd = rigaOrizzontaleSporgenzaY + rigaVerticaleSporgenzaLength; // Va verso il basso (y aumenta)
  
  // Linea tratteggiata orizzontale: dalla fine della riga verticale tratteggiata verso la prima riga verticale
  const rigaOrizzontaleTratteggiataY = rigaVerticaleSporgenzaYEnd; // Stessa y della fine della riga verticale tratteggiata
  const rigaOrizzontaleTratteggiataX1 = rigaVerticaleSporgenzaX; // Parte dalla fine della riga verticale tratteggiata
  const rigaOrizzontaleTratteggiataX2 = rigaVerticale1X; // Finisce alla prima riga verticale

  // Nuova linea orizzontale: parallela alla sporgenza, posizionata 0.40 cm più in alto
  const rigaOrizzontaleNuovaY = rigaOrizzontaleSporgenzaY - 0.40; // Y - 0.40 rispetto alla sporgenza (più in alto)
  const rigaOrizzontaleNuovaX1 = rigaOrizzontaleSporgenzaX1; // Stesso punto iniziale della sporgenza
  const rigaOrizzontaleNuovaX2 = rigaOrizzontaleSporgenzaX2; // Stesso punto finale della sporgenza
  const pallinoRaggio = 0.08; // Raggio dei pallini pieni agli estremi (0.08 cm)
  
  // Posizione della scritta "L = [valore]" sopra la nuova linea
  const scrittaL_Y = rigaOrizzontaleNuovaY - 0.30; // Un po' più su della linea (0.30 cm)
  const scrittaL_X = (rigaOrizzontaleNuovaX1 + rigaOrizzontaleNuovaX2) / 2; // Centrata rispetto alla linea
  const sporgenzaFormattata = formatItalianNumber(sporgenza, 3); // Formatta la sporgenza in formato italiano
  
  // Nuova linea verticale: parallela alla linea tratteggiata L/2, posizionata a destra
  const rigaVerticaleNuovaX = rigaVerticaleSporgenzaX + 0.60; // 0.60 cm a destra della linea tratteggiata
  const rigaVerticaleNuovaYStart = rigaVerticaleSporgenzaYStart; // Stesso punto iniziale
  const rigaVerticaleNuovaYEnd = rigaVerticaleSporgenzaYEnd; // Stesso punto finale
  const l2Formattata = formatItalianNumber(sporgenza / 2, 3); // Formatta L/2 in formato italiano
  const scrittaL2_X = rigaVerticaleNuovaX + 0.55; // Posizione X della scritta (a destra della linea)
  const scrittaL2_Y = (rigaVerticaleNuovaYStart + rigaVerticaleNuovaYEnd) / 2; // Centrata verticalmente
  
  // Nuova linea verticale sinistra: parte dalla base e arriva all'altezza 0.60 metri
  // Visibile solo se hdavanzale < 0.60
  const rigaVerticaleSinistraX = rigaVerticale1X - 0.30; // 0.30 cm a sinistra della prima verticale
  const rigaVerticaleSinistraYStart = riga1Y; // Parte dalla base
  const rigaVerticaleSinistraYEnd = rigaOrizzontaleCondizionaleY; // Arriva all'altezza 0.60 metri
  const scritta060_X = rigaVerticaleSinistraX - 0.25; // Posizione X della scritta (a sinistra della linea)
  const scritta060_Y = (rigaVerticaleSinistraYStart + rigaVerticaleSinistraYEnd) / 2; // Centrata verticalmente
  
  // Nuova linea verticale intero: parte dal davanzale (o dalla linea 0.60 se hdavanzale < 0.60) e arriva alla linea tratteggiata orizzontale
  // Visibile solo se intero > 0
  const rigaVerticaleInteroX = rigaVerticale1X - 0.30; // 0.30 cm a sinistra della prima verticale (stessa posizione della linea 0.60)
  // Se hdavanzale < 0.60, parte dalla linea 0.60, altrimenti parte dal davanzale
  const rigaVerticaleInteroYStart = mostraRigaCondizionale ? rigaOrizzontaleCondizionaleY : rigaOrizzontaleDavanzaleY;
  const rigaVerticaleInteroYEnd = rigaOrizzontaleTratteggiataY; // Arriva alla linea tratteggiata orizzontale
  const interoFormattato = formatItalianNumber(intero, 3); // Formatta intero con 3 decimali
  const scrittaIntero_X = rigaVerticaleInteroX - 0.25; // Posizione X della scritta (a sinistra della linea)
  const scrittaIntero_Y = (rigaVerticaleInteroYStart + rigaVerticaleInteroYEnd) / 2; // Centrata verticalmente
  
  // Nuova linea verticale unterzo: parte dalla linea tratteggiata orizzontale e finisce alla fine dell'apertura
  // Visibile solo se unterzo > 0
  // Posizionata a destra della seconda riga verticale
  const rigaVerticaleUnterzoX = rigaVerticale2X + 0.30; // 0.30 cm a destra della seconda verticale
  const rigaVerticaleUnterzoYStart = rigaOrizzontaleTratteggiataY; // Parte dalla linea tratteggiata orizzontale
  const rigaVerticaleUnterzoYEnd = rigaOrizzontaleAltezzaY; // Finisce alla fine dell'apertura
  const unterzoFormattato = formatItalianNumber(unterzo, 3); // Formatta unterzo con 3 decimali
  const scrittaUnterzo_X = rigaVerticaleUnterzoX + 0.40; // Posizione X della scritta (a destra della linea, con più spazio)
  const scrittaUnterzo_Y = (rigaVerticaleUnterzoYStart + rigaVerticaleUnterzoYEnd) / 2; // Centrata verticalmente
  
  // Linea verticale imposta con pallini: posizionata a sinistra della scritta "Sup. conteggiata per 1/3"
  // Visibile solo se unterzo > 0
  const rigaVerticaleImpostaX = rigaVerticale1X - 1.5; // Posizionata decisamente più a destra
  const rigaVerticaleImpostaYStart = rigaOrizzontaleAltezzaY; // Parte dalla fine dell'apertura
  const rigaVerticaleImpostaYEnd = rigaOrizzontaleSporgenzaY; // Finisce all'inizio della sporgenza
  const impostaFormattata = formatItalianNumber(imposta, 3); // Formatta imposta con 3 decimali
  const scrittaImposta_X = rigaVerticaleImpostaX - 0.25; // Posizione X della scritta (a sinistra della linea)
  const scrittaImposta_Y = (rigaVerticaleImpostaYStart + rigaVerticaleImpostaYEnd) / 2; // Centrata verticalmente

  // Calcola l'altezza effettiva del disegno per eliminare lo spazio vuoto
  // Parte più alta: inizio delle righe verticali (rigaVerticale1YEnd)
  const partePiuAlta = rigaVerticale1YEnd;
  // Parte più bassa: riga base (riga1Y) + eventuale margine per le scritte
  const partePiuBassa = riga1Y;
  // Altezza effettiva del disegno
  const altezzaDisegno = partePiuBassa - partePiuAlta;
  // Aggiungiamo un piccolo margine superiore e inferiore (1 cm superiore, 3.5 cm inferiore per le scritte)
  const margineSuperiore = 1;
  const margineInferiore = 3.5; // Aumentato per dare spazio alle 4 scritte
  const altezzaTotale = altezzaDisegno + margineSuperiore + margineInferiore;
  // Y iniziale del viewBox (parte più alta - margine superiore)
  const viewBoxY = partePiuAlta - margineSuperiore;

  // Genera SVG su foglio A4 in scala (coordinate in cm)
  // Aggiungiamo spazio a sinistra nel viewBox per evitare che il testo venga tagliato
  const viewBoxX = -2; // Inizia 2 cm prima per dare spazio al testo a sinistra
  const viewBoxWidth = a4Width + 2; // Aumenta la larghezza del viewBox
  const svg = `
    <svg class="schema-aggetto-svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${altezzaTotale}" xmlns="http://www.w3.org/2000/svg" 
         width="210mm" height="${altezzaTotale * 10}mm">
      <!-- Prima riga orizzontale: 18 cm dal bordo superiore, centrata, lunga 12 cm -->
      <line x1="${riga1X1}" y1="${riga1Y}" 
            x2="${riga1X2}" y2="${riga1Y}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Nuova linea verticale sinistra con pallini: parte dalla base e arriva all'altezza 0.60 metri, solo se hdavanzale < 0.60 -->
      ${mostraRigaCondizionale ? `
      <line x1="${rigaVerticaleSinistraX}" y1="${rigaVerticaleSinistraYStart}" 
            x2="${rigaVerticaleSinistraX}" y2="${rigaVerticaleSinistraYEnd}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino inferiore -->
      <circle cx="${rigaVerticaleSinistraX}" cy="${rigaVerticaleSinistraYStart}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino superiore -->
      <circle cx="${rigaVerticaleSinistraX}" cy="${rigaVerticaleSinistraYEnd}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Scritta "0,60" a sinistra della linea -->
      <text x="${scritta060_X}" 
            y="${scritta060_Y}" 
            font-size="0.5" 
            font-weight="bold" 
            fill="#000"
            text-anchor="middle"
            transform="rotate(-90 ${scritta060_X} ${scritta060_Y})">
            0,60
      </text>
      ` : ''}
      
      <!-- Prima riga verticale: parte da x+2, va verso l'alto per l'altezza totale in scala 1:20 -->
      <line x1="${rigaVerticale1X}" y1="${rigaVerticale1YStart}" 
            x2="${rigaVerticale1X}" y2="${rigaVerticale1YEnd}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Seconda riga verticale: parte da x+3, stessa lunghezza della prima -->
      <line x1="${rigaVerticale2X}" y1="${rigaVerticale2YStart}" 
            x2="${rigaVerticale2X}" y2="${rigaVerticale2YEnd}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Prima riga orizzontale tra le due verticali: posizionata all'altezza davanzale -->
      <line x1="${rigaOrizzontaleDavanzaleX1}" y1="${rigaOrizzontaleDavanzaleY}" 
            x2="${rigaOrizzontaleDavanzaleX2}" y2="${rigaOrizzontaleDavanzaleY}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Nuova linea verticale intero con pallini: parte dal davanzale (o dalla linea 0.60 se hdavanzale < 0.60) e arriva alla linea tratteggiata orizzontale, solo se intero > 0 -->
      ${intero > 0 ? `
      <line x1="${rigaVerticaleInteroX}" y1="${rigaVerticaleInteroYStart}" 
            x2="${rigaVerticaleInteroX}" y2="${rigaVerticaleInteroYEnd}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino inferiore -->
      <circle cx="${rigaVerticaleInteroX}" cy="${rigaVerticaleInteroYStart}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino superiore -->
      <circle cx="${rigaVerticaleInteroX}" cy="${rigaVerticaleInteroYEnd}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Scritta valore intero a sinistra della linea -->
      <text x="${scrittaIntero_X}" 
            y="${scrittaIntero_Y}" 
            font-size="0.5" 
            font-weight="bold" 
            fill="#000"
            text-anchor="middle"
            dominant-baseline="middle"
            transform="rotate(-90 ${scrittaIntero_X} ${scrittaIntero_Y})">
            ${interoFormattato}
      </text>
      ` : ''}
      
      <!-- Riga orizzontale tratteggiata condizionale: tracciata solo se hdavanzale < 0.60 metri -->
      ${mostraRigaCondizionale ? `
      <line x1="${rigaOrizzontaleCondizionaleX1}" y1="${rigaOrizzontaleCondizionaleY}" 
            x2="${rigaOrizzontaleCondizionaleX2}" y2="${rigaOrizzontaleCondizionaleY}" 
            stroke="#000" stroke-width="0.15" stroke-dasharray="0.3,0.3"/>
      ` : ''}
      
      <!-- Seconda riga orizzontale tra le due verticali: posizionata all'altezza apertura -->
      <line x1="${rigaOrizzontaleAltezzaX1}" y1="${rigaOrizzontaleAltezzaY}" 
            x2="${rigaOrizzontaleAltezzaX2}" y2="${rigaOrizzontaleAltezzaY}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Terza riga orizzontale: chiude in alto le due righe verticali -->
      <line x1="${rigaOrizzontaleChiusuraX1}" y1="${rigaOrizzontaleChiusuraY}" 
            x2="${rigaOrizzontaleChiusuraX2}" y2="${rigaOrizzontaleChiusuraY}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Quarta riga orizzontale: parte dal punto giallo (estremità superiore) verso destra, lunga quanto la sporgenza -->
      <line x1="${rigaOrizzontaleSporgenzaX1}" y1="${rigaOrizzontaleSporgenzaY}" 
            x2="${rigaOrizzontaleSporgenzaX2}" y2="${rigaOrizzontaleSporgenzaY}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Scritta "L = [valore sporgenza]" sopra la nuova linea, centrata -->
      <text x="${scrittaL_X}" 
            y="${scrittaL_Y}" 
            font-size="0.4" 
            font-weight="bold" 
            fill="#000"
            text-anchor="middle">
            L = ${sporgenzaFormattata}
      </text>
      
      <!-- Nuova linea orizzontale: parallela alla sporgenza, 0.40 cm più in alto, con pallini agli estremi -->
      <line x1="${rigaOrizzontaleNuovaX1}" y1="${rigaOrizzontaleNuovaY}" 
            x2="${rigaOrizzontaleNuovaX2}" y2="${rigaOrizzontaleNuovaY}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino sinistro -->
      <circle cx="${rigaOrizzontaleNuovaX1}" cy="${rigaOrizzontaleNuovaY}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino destro -->
      <circle cx="${rigaOrizzontaleNuovaX2}" cy="${rigaOrizzontaleNuovaY}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      
      <!-- Riga verticale tratteggiata: parte dal vertice destro della riga sporgenza, va verso il basso per metà sporgenza -->
      <line x1="${rigaVerticaleSporgenzaX}" y1="${rigaVerticaleSporgenzaYStart}" 
            x2="${rigaVerticaleSporgenzaX}" y2="${rigaVerticaleSporgenzaYEnd}" 
            stroke="#000" stroke-width="0.1" stroke-dasharray="0.2,0.2"/>
      
      <!-- Nuova linea verticale: parallela alla linea tratteggiata L/2, con pallini agli estremi -->
      <line x1="${rigaVerticaleNuovaX}" y1="${rigaVerticaleNuovaYStart}" 
            x2="${rigaVerticaleNuovaX}" y2="${rigaVerticaleNuovaYEnd}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino superiore -->
      <circle cx="${rigaVerticaleNuovaX}" cy="${rigaVerticaleNuovaYStart}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino inferiore -->
      <circle cx="${rigaVerticaleNuovaX}" cy="${rigaVerticaleNuovaYEnd}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Scritta "L/2" in verticale -->
      <text x="${scrittaL2_X}" 
            y="${scrittaL2_Y}" 
            font-size="0.4" 
            font-weight="bold" 
            fill="#000"
            text-anchor="middle"
            transform="rotate(-90 ${scrittaL2_X} ${scrittaL2_Y})">
            L/2 = ${l2Formattata}
      </text>
      
      <!-- Linea tratteggiata orizzontale: dalla fine della riga verticale tratteggiata verso la prima riga verticale -->
      <line x1="${rigaOrizzontaleTratteggiataX1}" y1="${rigaOrizzontaleTratteggiataY}" 
            x2="${rigaOrizzontaleTratteggiataX2}" y2="${rigaOrizzontaleTratteggiataY}" 
            stroke="#000" stroke-width="0.1" stroke-dasharray="0.2,0.2"/>
      
      <!-- Nuova linea verticale unterzo con pallini: parte dalla linea tratteggiata orizzontale e finisce alla fine dell'apertura, solo se unterzo > 0 -->
      ${unterzo > 0 ? `
      <line x1="${rigaVerticaleUnterzoX}" y1="${rigaVerticaleUnterzoYStart}" 
            x2="${rigaVerticaleUnterzoX}" y2="${rigaVerticaleUnterzoYEnd}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino inferiore -->
      <circle cx="${rigaVerticaleUnterzoX}" cy="${rigaVerticaleUnterzoYStart}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino superiore -->
      <circle cx="${rigaVerticaleUnterzoX}" cy="${rigaVerticaleUnterzoYEnd}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Scritta valore unterzo a destra della linea -->
      <text x="${scrittaUnterzo_X}" 
            y="${scrittaUnterzo_Y}" 
            font-size="0.5" 
            font-weight="bold" 
            fill="#000"
            text-anchor="middle"
            dominant-baseline="middle"
            transform="rotate(-90 ${scrittaUnterzo_X} ${scrittaUnterzo_Y})">
            ${unterzoFormattato}
      </text>
      ` : ''}
      
      <!-- Scritta "Sup. non conteggiabile" - solo se hdavanzale < 0.60 -->
      ${mostraRigaCondizionale ? `
      <text x="${rigaVerticale2X + (0.10 * scalaCm)}" 
            y="${riga1Y - (0.30 * scalaCm)}" 
            font-size="0.6" font-weight="bold" fill="#000"
            textLength="${7.0}">
            Sup. non conteggiabile
      </text>
      <!-- Linea sottile sotto la scritta che va dalla fine della scritta allo spazio centrale tra le due righe verticali -->
      <line x1="${rigaVerticale2X + (0.10 * scalaCm) + 7.0}" 
            y1="${riga1Y - (0.30 * scalaCm) + 0.2}" 
            x2="${rigaVerticale1X + (rigaVerticale2X - rigaVerticale1X) / 2}" 
            y2="${riga1Y - (0.30 * scalaCm) + 0.2}" 
            stroke="#000" stroke-width="0.08"/>
      ` : ''}
      
      <!-- Scritta "Sup. conteggiata per intero" - posizionata sotto la linea orizzontale tratteggiata, solo se intero > 0 -->
      ${intero > 0 ? `
      <!-- Calcola il centro della scritta "Sup. conteggiata" (lunghezza approssimativa 4.5 cm) -->
      <text x="${rigaVerticale2X + (0.10 * scalaCm) + 0.5}" 
            y="${rigaOrizzontaleTratteggiataY + (0.30 * scalaCm)}" 
            font-size="0.6" font-weight="bold" fill="#000"
            text-anchor="start">
            <tspan x="${rigaVerticale2X + (0.10 * scalaCm) + 0.5}" dy="0">Sup. conteggiata</tspan>
            <tspan x="${rigaVerticale2X + (0.10 * scalaCm) + 0.5 + 2.25}" dy="0.7" text-anchor="middle">al 100 %</tspan>
      </text>
      <!-- Linea sottile sotto la scritta che va dalla fine della scritta allo spazio centrale tra le due righe verticali -->
      <!-- Lunghezza approssimativa di "Sup. conteggiata per" è circa 5.5 cm -->
      <line x1="${rigaVerticale2X + (0.10 * scalaCm) + 5.5}" 
            y1="${rigaOrizzontaleTratteggiataY + (0.30 * scalaCm) + 0.2}" 
            x2="${rigaVerticale1X + (rigaVerticale2X - rigaVerticale1X) / 2}" 
            y2="${rigaOrizzontaleTratteggiataY + (0.30 * scalaCm) + 0.2}" 
            stroke="#000" stroke-width="0.08"/>
      ` : ''}
      
      <!-- Scritta "Sup. conteggiata per 1/3" - posizionata appena sopra la riga tratteggiata, solo se unterzo > 0 -->
      ${unterzo > 0 ? `
      <!-- Riga orizzontale appena sopra la riga tratteggiata -->
      <line x1="${rigaVerticale1X - 6.0}" 
            y1="${rigaOrizzontaleTratteggiataY - 0.3}" 
            x2="${rigaVerticale1X + (rigaVerticale2X - rigaVerticale1X) / 2}" 
            y2="${rigaOrizzontaleTratteggiataY - 0.3}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Scritta più a sinistra -->
      <text x="${rigaVerticale1X - 3.0}" 
            y="${rigaOrizzontaleTratteggiataY - 0.5}" 
            font-size="0.6" font-weight="bold" fill="#000"
            text-anchor="middle">
            <tspan x="${rigaVerticale1X - 3.0}" dy="0">Sup. conteggiata</tspan>
            <tspan x="${rigaVerticale1X - 3.0}" dy="0.7">per 1/3</tspan>
      </text>
      ` : ''}
      
      <!-- Linea verticale imposta con pallini: posizionata a sinistra della scritta "Sup. conteggiata per 1/3" -->
      ${unterzo > 0 ? `
      <line x1="${rigaVerticaleImpostaX}" y1="${rigaVerticaleImpostaYStart}" 
            x2="${rigaVerticaleImpostaX}" y2="${rigaVerticaleImpostaYEnd}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino inferiore -->
      <circle cx="${rigaVerticaleImpostaX}" cy="${rigaVerticaleImpostaYStart}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino superiore -->
      <circle cx="${rigaVerticaleImpostaX}" cy="${rigaVerticaleImpostaYEnd}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Scritta "Imp = [valore]" a sinistra della linea -->
      <text x="${scrittaImposta_X}" 
            y="${scrittaImposta_Y}" 
            font-size="0.4" 
            font-weight="bold" 
            fill="#000"
            text-anchor="middle"
            transform="rotate(-90 ${scrittaImposta_X} ${scrittaImposta_Y})">
            Imp = ${impostaFormattata}
      </text>
      ` : ''}
      
      <!-- Scritte dimensioni sotto il disegno -->
      <text x="${centroFoglio}" 
            y="${riga1Y + 1.0}" 
            font-size="0.6" 
            font-weight="bold" 
            fill="#000" 
            text-anchor="middle">
            DIMENSIONI APERTURA : ${formatItalianNumber(larghezza, 2)} x ${formatItalianNumber(altezza, 2)}
      </text>
      
      <text x="${centroFoglio}" 
            y="${riga1Y + 1.7}" 
            font-size="0.6" 
            font-weight="bold" 
            fill="#000" 
            text-anchor="middle">
            ALTEZZA DAVANZALE : ${formatItalianNumber(hdavanzale, 2)}
      </text>
      
      <text x="${centroFoglio}" 
            y="${riga1Y + 2.4}" 
            font-size="0.6" 
            font-weight="bold" 
            fill="#000" 
            text-anchor="middle">
            SPORGENZA : ${formatItalianNumber(sporgenza, 2)}
      </text>
      
      <text x="${centroFoglio}" 
            y="${riga1Y + 3.1}" 
            font-size="0.6" 
            font-weight="bold" 
            fill="#000" 
            text-anchor="middle">
            IMPOSTA : ${formatItalianNumber(imposta, 2)}
      </text>

    </svg>
  `;

  container.innerHTML = svg;

  // Aggiorna i dati testuali
  const numeroInput = document.getElementById('schema-aggetto-numero');
  const edificioSpan = document.getElementById('schema-edificio');
  const pianoSpan = document.getElementById('schema-piano');
  const localeSpan = document.getElementById('schema-locale');
  
  if (numeroInput) numeroInput.value = nagg || '';
  if (edificioSpan) edificioSpan.textContent = edificio;
  if (pianoSpan) pianoSpan.textContent = piano;
  if (localeSpan) localeSpan.textContent = locale;
}

/**
 * Apre la modale con lo schema aggetto
 */
function apriSchemaAggetto(dati) {
  try {
    generaSchemaAggetto(dati);
    const modalElement = document.getElementById('modal-schema-aggetto');
    if (modalElement) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.show();
      
      // Salva il rowId se presente nei dati (quando viene aperto da una riga)
      const rowId = dati.rowId;
      
      // Aggiungi listener per quando si chiude il modale per aggiornare il campo nagg nella riga
      if (rowId !== undefined) {
        const aggiornaNaggOnClose = () => {
          const numeroInput = document.getElementById('schema-aggetto-numero');
          if (numeroInput) {
            const nuovoNagg = numeroInput.value || '';
            // Aggiorna il campo nagg nella riga corrispondente
            const row = document.getElementById(`apertura-row-${rowId}`);
            if (row) {
              const naggCell = row.querySelector('.nagg');
              if (naggCell) {
                naggCell.value = nuovoNagg;
                // Aggiorna anche l'attributo data-nagg-original per preservare il valore
                naggCell.setAttribute('data-nagg-original', nuovoNagg);
              }
            }
          }
        };
        modalElement.addEventListener('hidden.bs.modal', aggiornaNaggOnClose, { once: true });
      }
      
      // Aggiungi event listener per il pulsante stampa
      const btnStampa = document.getElementById('btn-stampa-schema-aggetto');
      if (btnStampa) {
        // Rimuovi eventuali listener precedenti
        const nuovoBtn = btnStampa.cloneNode(true);
        btnStampa.parentNode.replaceChild(nuovoBtn, btnStampa);
        
        nuovoBtn.addEventListener('click', () => {
          // Aggiorna i dati con il nuovo nagg prima di stampare
          const numeroInput = document.getElementById('schema-aggetto-numero');
          if (numeroInput) {
            dati.nagg = numeroInput.value || '';
          }
          stampaSchemaAggetto(dati);
        });
      }
      
      // Aggiungi event listener per il pulsante esporta DXF
      const btnEsportaDXF = document.getElementById('btn-esporta-dxf-schema-aggetto');
      if (btnEsportaDXF) {
        // Rimuovi eventuali listener precedenti
        const nuovoBtnDXF = btnEsportaDXF.cloneNode(true);
        btnEsportaDXF.parentNode.replaceChild(nuovoBtnDXF, btnEsportaDXF);
        
        nuovoBtnDXF.addEventListener('click', () => {
          // Aggiorna i dati con il nuovo nagg prima di esportare
          const numeroInput = document.getElementById('schema-aggetto-numero');
          if (numeroInput) {
            dati.nagg = numeroInput.value || '';
          }
          esportaDXF(dati);
        });
      }
    }
  } catch (error) {
    console.error('Errore nell\'apertura dello schema aggetto:', error);
    alert('Errore nell\'apertura dello schema aggetto: ' + error.message);
  }
}

/**
 * Stampa lo schema aggetto su foglio A4
 */
function stampaSchemaAggetto(dati) {
  // Estrai i dati per il titolo e le informazioni
  const edificio = dati.edificio || 'N/A';
  const piano = dati.piano || 'N/A';
  const locale = dati.locale || 'N/A';
  const nagg = dati.nagg || '?';
  
  // Genera l'HTML per la stampa
  const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Schema Aggetto N. ${nagg}</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          width: 210mm;
          height: 297mm;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }
        .print-container {
          width: 210mm;
          height: 297mm;
          position: relative;
          background: white;
          display: flex;
          flex-direction: column;
          padding: 5mm 0;
          box-sizing: border-box;
        }
        .print-header {
          flex-shrink: 0;
          text-align: center;
          margin-bottom: 3mm;
          padding: 0 5mm;
        }
        .print-header h1 {
          font-size: 20pt;
          margin: 0 0 2mm 0;
          font-weight: bold;
        }
        .print-info {
          flex-shrink: 0;
          display: flex;
          justify-content: space-around;
          margin-bottom: 3mm;
          font-size: 10pt;
          padding: 0 5mm;
        }
        .print-info-item {
          flex: 1;
          text-align: center;
        }
        .print-info-item strong {
          font-weight: bold;
        }
        .print-svg-container {
          flex: 1;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: visible;
          padding: 0;
          margin: 0;
        }
        .print-svg-container svg {
          width: 210mm !important;
          height: auto !important;
          max-width: none !important;
          max-height: none !important;
          flex-shrink: 0;
          margin: 0;
          padding: 0;
        }
        @media print {
          body {
            margin: 0;
            padding: 5mm;
          }
          .print-container {
            page-break-after: avoid;
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        <div class="print-header">
          <h1>Schema Aggetto N. ${nagg}</h1>
        </div>
        <div class="print-svg-container">
          ${generaSchemaAggettoPerStampa(dati)}
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Crea un iframe nascosto per la stampa
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'absolute';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = 'none';
  printFrame.style.left = '-9999px';
  document.body.appendChild(printFrame);
  
  let printExecuted = false;
  
  const executePrint = () => {
    if (printExecuted) return;
    printExecuted = true;
    
    try {
      if (printFrame.contentWindow) {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        
        // Rimuovi l'iframe dopo la stampa
        setTimeout(() => {
          if (printFrame.parentNode) {
            document.body.removeChild(printFrame);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Errore durante la stampa:', error);
      if (printFrame.parentNode) {
        document.body.removeChild(printFrame);
      }
    }
  };
  
  const printDoc = printFrame.contentWindow.document;
  printDoc.open();
  printDoc.write(printHTML);
  printDoc.close();
  
  printFrame.onload = executePrint;
  
  // Fallback se onload non viene chiamato
  setTimeout(() => {
    if (!printExecuted && printFrame.parentNode) {
      executePrint();
    }
  }, 500);
}

/**
 * Genera lo schema aggetto per la stampa (restituisce solo l'SVG come stringa)
 */
function generaSchemaAggettoPerStampa(dati) {
  // Estrai i dati (stessa logica di generaSchemaAggetto)
  const edificio = dati.edificio || 'N/A';
  const piano = dati.piano || 'N/A';
  const locale = dati.locale || 'N/A';
  const nagg = dati.nagg || '';
  const larghezza = parseItalianNumber(dati.larghezza || '0') || 0;
  const altezza = parseItalianNumber(dati.altezza || '0') || 0;
  const sporgenza = parseItalianNumber(dati.sporgenza || '0') || 0;
  const imposta = parseItalianNumber(dati.imposta || '0,20') || 0.20;
  const hdavanzale = parseItalianNumber(dati.hdavanzale || '0') || 0;

  // Calcola i valori dell'apertura
  const calcoli = calcolaApertura({
    larghezza: larghezza,
    altezza: altezza,
    hdavanzale: hdavanzale,
    imposta: imposta,
    sporgenza: sporgenza
  });
  const htot = calcoli.htot;
  const intero = calcoli.intero;
  const unterzo = calcoli.unterzo;
  const l2 = calcoli.l2;

  // Dimensioni foglio A4 in cm
  const a4Width = 21;
  const a4Height = 29.7;
  const scalaCm = 5; // Scala 1:20 (1 metro = 5 cm)
  
  // Calcola tutte le posizioni (stessa logica di generaSchemaAggetto)
  // Spostato più in basso per riempire meglio la pagina verticalmente
  const riga1Y = 25;
  const riga1Length = 12;
  const centroFoglio = a4Width / 2;
  const riga1X1 = centroFoglio - (riga1Length / 2);
  const riga1X2 = centroFoglio + (riga1Length / 2);
  
  const rigaVerticale1X = riga1X1 + 2;
  const rigaVerticale1YStart = riga1Y;
  const rigaVerticale1Length = htot * scalaCm;
  const rigaVerticale1YEnd = riga1Y - rigaVerticale1Length;
  
  const rigaVerticale2X = riga1X1 + 2 + 1.0; // Scala 1:20
  const rigaVerticale2YStart = riga1Y;
  const rigaVerticale2YEnd = riga1Y - rigaVerticale1Length;
  
  const rigaOrizzontaleDavanzaleY = riga1Y - (hdavanzale * scalaCm);
  const rigaOrizzontaleDavanzaleX1 = rigaVerticale1X;
  const rigaOrizzontaleDavanzaleX2 = rigaVerticale2X;
  
  const rigaOrizzontaleCondizionaleY = riga1Y - (0.60 * scalaCm);
  const rigaOrizzontaleCondizionaleX1 = rigaVerticale1X;
  const rigaOrizzontaleCondizionaleX2 = rigaVerticale2X;
  const mostraRigaCondizionale = hdavanzale < 0.60;
  
  const rigaOrizzontaleAltezzaY = rigaOrizzontaleDavanzaleY - (altezza * scalaCm);
  const rigaOrizzontaleAltezzaX1 = rigaVerticale1X;
  const rigaOrizzontaleAltezzaX2 = rigaVerticale2X;
  
  const rigaOrizzontaleChiusuraY = rigaVerticale1YEnd;
  const rigaOrizzontaleChiusuraX1 = rigaVerticale1X;
  const rigaOrizzontaleChiusuraX2 = rigaVerticale2X;
  
  const rigaOrizzontaleSporgenzaY = rigaVerticale1YEnd;
  const rigaOrizzontaleSporgenzaX1 = rigaVerticale2X;
  const rigaOrizzontaleSporgenzaLength = sporgenza * scalaCm;
  const rigaOrizzontaleSporgenzaX2 = rigaVerticale2X + rigaOrizzontaleSporgenzaLength;
  
  const rigaVerticaleSporgenzaX = rigaOrizzontaleSporgenzaX2;
  const rigaVerticaleSporgenzaYStart = rigaOrizzontaleSporgenzaY;
  const rigaVerticaleSporgenzaLength = (sporgenza / 2) * scalaCm;
  const rigaVerticaleSporgenzaYEnd = rigaOrizzontaleSporgenzaY + rigaVerticaleSporgenzaLength;
  
  const rigaOrizzontaleTratteggiataY = rigaVerticaleSporgenzaYEnd;
  const rigaOrizzontaleTratteggiataX1 = rigaVerticaleSporgenzaX;
  const rigaOrizzontaleTratteggiataX2 = rigaVerticale1X;

  // Nuova linea orizzontale: parallela alla sporgenza, posizionata 0.40 cm più in alto
  const rigaOrizzontaleNuovaY = rigaOrizzontaleSporgenzaY - 0.40; // Y - 0.40 rispetto alla sporgenza (più in alto)
  const rigaOrizzontaleNuovaX1 = rigaOrizzontaleSporgenzaX1; // Stesso punto iniziale della sporgenza
  const rigaOrizzontaleNuovaX2 = rigaOrizzontaleSporgenzaX2; // Stesso punto finale della sporgenza
  const pallinoRaggio = 0.08; // Raggio dei pallini pieni agli estremi (0.08 cm)
  
  // Posizione della scritta "L = [valore]" sopra la nuova linea
  const scrittaL_Y = rigaOrizzontaleNuovaY - 0.30; // Un po' più su della linea (0.30 cm)
  const scrittaL_X = (rigaOrizzontaleNuovaX1 + rigaOrizzontaleNuovaX2) / 2; // Centrata rispetto alla linea
  const sporgenzaFormattata = formatItalianNumber(sporgenza, 3); // Formatta la sporgenza in formato italiano
  
  // Nuova linea verticale: parallela alla linea tratteggiata L/2, posizionata a destra
  const rigaVerticaleNuovaX = rigaVerticaleSporgenzaX + 0.60; // 0.60 cm a destra della linea tratteggiata
  const rigaVerticaleNuovaYStart = rigaVerticaleSporgenzaYStart; // Stesso punto iniziale
  const rigaVerticaleNuovaYEnd = rigaVerticaleSporgenzaYEnd; // Stesso punto finale
  const l2Formattata = formatItalianNumber(sporgenza / 2, 3); // Formatta L/2 in formato italiano
  const scrittaL2_X = rigaVerticaleNuovaX + 0.55; // Posizione X della scritta (a destra della linea)
  const scrittaL2_Y = (rigaVerticaleNuovaYStart + rigaVerticaleNuovaYEnd) / 2; // Centrata verticalmente
  
  // Nuova linea verticale sinistra: parte dalla base e arriva all'altezza 0.60 metri
  // Visibile solo se hdavanzale < 0.60
  const rigaVerticaleSinistraX = rigaVerticale1X - 0.30; // 0.30 cm a sinistra della prima verticale
  const rigaVerticaleSinistraYStart = riga1Y; // Parte dalla base
  const rigaVerticaleSinistraYEnd = rigaOrizzontaleCondizionaleY; // Arriva all'altezza 0.60 metri
  const scritta060_X = rigaVerticaleSinistraX - 0.25; // Posizione X della scritta (a sinistra della linea)
  const scritta060_Y = (rigaVerticaleSinistraYStart + rigaVerticaleSinistraYEnd) / 2; // Centrata verticalmente
  
  // Nuova linea verticale intero: parte dal davanzale (o dalla linea 0.60 se hdavanzale < 0.60) e arriva alla linea tratteggiata orizzontale
  // Visibile solo se intero > 0
  const rigaVerticaleInteroX = rigaVerticale1X - 0.30; // 0.30 cm a sinistra della prima verticale (stessa posizione della linea 0.60)
  // Se hdavanzale < 0.60, parte dalla linea 0.60, altrimenti parte dal davanzale
  const rigaVerticaleInteroYStart = mostraRigaCondizionale ? rigaOrizzontaleCondizionaleY : rigaOrizzontaleDavanzaleY;
  const rigaVerticaleInteroYEnd = rigaOrizzontaleTratteggiataY; // Arriva alla linea tratteggiata orizzontale
  const interoFormattato = formatItalianNumber(intero, 3); // Formatta intero con 3 decimali
  const scrittaIntero_X = rigaVerticaleInteroX - 0.25; // Posizione X della scritta (a sinistra della linea)
  const scrittaIntero_Y = (rigaVerticaleInteroYStart + rigaVerticaleInteroYEnd) / 2; // Centrata verticalmente
  
  // Nuova linea verticale unterzo: parte dalla linea tratteggiata orizzontale e finisce alla fine dell'apertura
  // Visibile solo se unterzo > 0
  // Posizionata a destra della seconda riga verticale
  const rigaVerticaleUnterzoX = rigaVerticale2X + 0.30; // 0.30 cm a destra della seconda verticale
  const rigaVerticaleUnterzoYStart = rigaOrizzontaleTratteggiataY; // Parte dalla linea tratteggiata orizzontale
  const rigaVerticaleUnterzoYEnd = rigaOrizzontaleAltezzaY; // Finisce alla fine dell'apertura
  const unterzoFormattato = formatItalianNumber(unterzo, 3); // Formatta unterzo con 3 decimali
  const scrittaUnterzo_X = rigaVerticaleUnterzoX + 0.40; // Posizione X della scritta (a destra della linea, con più spazio)
  const scrittaUnterzo_Y = (rigaVerticaleUnterzoYStart + rigaVerticaleUnterzoYEnd) / 2; // Centrata verticalmente
  
  // Linea verticale imposta con pallini: posizionata a sinistra della scritta "Sup. conteggiata per 1/3"
  // Visibile solo se unterzo > 0
  const rigaVerticaleImpostaX = rigaVerticale1X - 1.5; // Posizionata decisamente più a destra (stessa posizione del modale)
  const rigaVerticaleImpostaYStart = rigaOrizzontaleAltezzaY; // Parte dalla fine dell'apertura
  const rigaVerticaleImpostaYEnd = rigaOrizzontaleSporgenzaY; // Finisce all'inizio della sporgenza
  const impostaFormattata = formatItalianNumber(imposta, 3); // Formatta imposta con 3 decimali
  const scrittaImposta_X = rigaVerticaleImpostaX - 0.25; // Posizione X della scritta (a sinistra della linea)
  const scrittaImposta_Y = (rigaVerticaleImpostaYStart + rigaVerticaleImpostaYEnd) / 2; // Centrata verticalmente

  // Calcola l'altezza effettiva del disegno per eliminare lo spazio vuoto
  // Parte più alta: inizio delle righe verticali (rigaVerticale1YEnd)
  const partePiuAlta = rigaVerticale1YEnd;
  // Parte più bassa: riga base (riga1Y) + eventuale margine per le scritte
  const partePiuBassa = riga1Y;
  // Altezza effettiva del disegno
  const altezzaDisegno = partePiuBassa - partePiuAlta;
  // Aggiungiamo un piccolo margine superiore e inferiore (1 cm superiore, 3.5 cm inferiore per le scritte)
  const margineSuperiore = 1;
  const margineInferiore = 3.5; // Aumentato per dare spazio alle 4 scritte
  const altezzaTotale = altezzaDisegno + margineSuperiore + margineInferiore;
  // Y iniziale del viewBox (parte più alta - margine superiore)
  const viewBoxY = partePiuAlta - margineSuperiore;

  // Genera l'SVG (stessa logica di generaSchemaAggetto)
  // Per la stampa, dobbiamo mantenere la scala 1:20 corretta
  // Le coordinate SVG sono in cm e già in scala 1:20 (1 metro = 5 cm)
  // IMPORTANTE: Per mantenere la scala corretta nella stampa:
  // - Il viewBox definisce le coordinate in cm (già in scala 1:20)
  // - Le dimensioni SVG devono essere in mm e proporzionate al viewBox
  // - Il viewBox è 21cm, quindi l'SVG deve essere 210mm per mantenere il rapporto 1:1
  // - Questo garantisce che 1cm nel viewBox = 10mm stampati, mantenendo la scala 1:20
  const viewBoxX = 0; // Inizia da 0 per mantenere la scala corretta
  const viewBoxWidth = a4Width; // Larghezza esatta del foglio A4 (21 cm)
  // Calcola le dimensioni SVG: viewBox 21cm = SVG 210mm (rapporto 1:1)
  // Questo mantiene la scala corretta: le coordinate sono già in scala 1:20
  const svgWidthMm = viewBoxWidth * 10; // 21 cm * 10 = 210mm
  const svgHeightMm = altezzaTotale * 10; // altezzaTotale in cm * 10 = mm
  const svg = `
    <svg class="schema-aggetto-svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${altezzaTotale}" xmlns="http://www.w3.org/2000/svg" 
         width="${svgWidthMm}mm" height="${svgHeightMm}mm" preserveAspectRatio="xMidYMin meet">
      <!-- Prima riga orizzontale: 18 cm dal bordo superiore, centrata, lunga 12 cm -->
      <line x1="${riga1X1}" y1="${riga1Y}" 
            x2="${riga1X2}" y2="${riga1Y}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Nuova linea verticale sinistra con pallini: parte dalla base e arriva all'altezza 0.60 metri, solo se hdavanzale < 0.60 -->
      ${mostraRigaCondizionale ? `
      <line x1="${rigaVerticaleSinistraX}" y1="${rigaVerticaleSinistraYStart}" 
            x2="${rigaVerticaleSinistraX}" y2="${rigaVerticaleSinistraYEnd}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino inferiore -->
      <circle cx="${rigaVerticaleSinistraX}" cy="${rigaVerticaleSinistraYStart}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino superiore -->
      <circle cx="${rigaVerticaleSinistraX}" cy="${rigaVerticaleSinistraYEnd}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Scritta "0,60" a sinistra della linea -->
      <text x="${scritta060_X}" 
            y="${scritta060_Y}" 
            font-size="0.3" 
            font-weight="bold" 
            fill="#000"
            text-anchor="middle"
            transform="rotate(-90 ${scritta060_X} ${scritta060_Y})">
            0,60
      </text>
      ` : ''}
      
      <!-- Prima riga verticale: parte da x+2, va verso l'alto per l'altezza totale in scala 1:50 -->
      <line x1="${rigaVerticale1X}" y1="${rigaVerticale1YStart}" 
            x2="${rigaVerticale1X}" y2="${rigaVerticale1YEnd}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Seconda riga verticale: parte da x+3, stessa lunghezza della prima -->
      <line x1="${rigaVerticale2X}" y1="${rigaVerticale2YStart}" 
            x2="${rigaVerticale2X}" y2="${rigaVerticale2YEnd}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Prima riga orizzontale tra le due verticali: posizionata all'altezza davanzale -->
      <line x1="${rigaOrizzontaleDavanzaleX1}" y1="${rigaOrizzontaleDavanzaleY}" 
            x2="${rigaOrizzontaleDavanzaleX2}" y2="${rigaOrizzontaleDavanzaleY}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Nuova linea verticale intero con pallini: parte dal davanzale (o dalla linea 0.60 se hdavanzale < 0.60) e arriva alla linea tratteggiata orizzontale, solo se intero > 0 -->
      ${intero > 0 ? `
      <line x1="${rigaVerticaleInteroX}" y1="${rigaVerticaleInteroYStart}" 
            x2="${rigaVerticaleInteroX}" y2="${rigaVerticaleInteroYEnd}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino inferiore -->
      <circle cx="${rigaVerticaleInteroX}" cy="${rigaVerticaleInteroYStart}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino superiore -->
      <circle cx="${rigaVerticaleInteroX}" cy="${rigaVerticaleInteroYEnd}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Scritta valore intero a sinistra della linea -->
      <text x="${scrittaIntero_X}" 
            y="${scrittaIntero_Y}" 
            font-size="0.4" 
            font-weight="bold" 
            fill="#000"
            text-anchor="middle"
            dominant-baseline="middle"
            transform="rotate(-90 ${scrittaIntero_X} ${scrittaIntero_Y})">
            ${interoFormattato}
      </text>
      ` : ''}
      
      <!-- Riga orizzontale tratteggiata condizionale: tracciata solo se hdavanzale < 0.60 metri -->
      ${mostraRigaCondizionale ? `
      <line x1="${rigaOrizzontaleCondizionaleX1}" y1="${rigaOrizzontaleCondizionaleY}" 
            x2="${rigaOrizzontaleCondizionaleX2}" y2="${rigaOrizzontaleCondizionaleY}" 
            stroke="#000" stroke-width="0.15" stroke-dasharray="0.3,0.3"/>
      ` : ''}
      
      <!-- Seconda riga orizzontale tra le due verticali: posizionata all'altezza apertura -->
      <line x1="${rigaOrizzontaleAltezzaX1}" y1="${rigaOrizzontaleAltezzaY}" 
            x2="${rigaOrizzontaleAltezzaX2}" y2="${rigaOrizzontaleAltezzaY}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Terza riga orizzontale: chiude in alto le due righe verticali -->
      <line x1="${rigaOrizzontaleChiusuraX1}" y1="${rigaOrizzontaleChiusuraY}" 
            x2="${rigaOrizzontaleChiusuraX2}" y2="${rigaOrizzontaleChiusuraY}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Quarta riga orizzontale: parte dal punto giallo (estremità superiore) verso destra, lunga quanto la sporgenza -->
      <line x1="${rigaOrizzontaleSporgenzaX1}" y1="${rigaOrizzontaleSporgenzaY}" 
            x2="${rigaOrizzontaleSporgenzaX2}" y2="${rigaOrizzontaleSporgenzaY}" 
            stroke="#000" stroke-width="0.1"/>
      
      <!-- Scritta "L = [valore sporgenza]" sopra la nuova linea, centrata -->
      <text x="${scrittaL_X}" 
            y="${scrittaL_Y}" 
            font-size="0.4" 
            font-weight="bold" 
            fill="#000" 
            text-anchor="middle">
            L = ${sporgenzaFormattata}
      </text>
      
      <!-- Nuova linea orizzontale: parallela alla sporgenza, 0.40 cm più in alto, con pallini agli estremi -->
      <line x1="${rigaOrizzontaleNuovaX1}" y1="${rigaOrizzontaleNuovaY}" 
            x2="${rigaOrizzontaleNuovaX2}" y2="${rigaOrizzontaleNuovaY}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino sinistro -->
      <circle cx="${rigaOrizzontaleNuovaX1}" cy="${rigaOrizzontaleNuovaY}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino destro -->
      <circle cx="${rigaOrizzontaleNuovaX2}" cy="${rigaOrizzontaleNuovaY}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      
      <!-- Riga verticale tratteggiata: parte dal vertice destro della riga sporgenza, va verso il basso per metà sporgenza -->
      <line x1="${rigaVerticaleSporgenzaX}" y1="${rigaVerticaleSporgenzaYStart}" 
            x2="${rigaVerticaleSporgenzaX}" y2="${rigaVerticaleSporgenzaYEnd}" 
            stroke="#000" stroke-width="0.1" stroke-dasharray="0.2,0.2"/>
      
      <!-- Nuova linea verticale: parallela alla linea tratteggiata L/2, con pallini agli estremi -->
      <line x1="${rigaVerticaleNuovaX}" y1="${rigaVerticaleNuovaYStart}" 
            x2="${rigaVerticaleNuovaX}" y2="${rigaVerticaleNuovaYEnd}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino superiore -->
      <circle cx="${rigaVerticaleNuovaX}" cy="${rigaVerticaleNuovaYStart}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino inferiore -->
      <circle cx="${rigaVerticaleNuovaX}" cy="${rigaVerticaleNuovaYEnd}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Scritta "L/2" in verticale -->
      <text x="${scrittaL2_X}" 
            y="${scrittaL2_Y}" 
            font-size="0.4" 
            font-weight="bold" 
            fill="#000" 
            text-anchor="middle" 
            transform="rotate(-90 ${scrittaL2_X} ${scrittaL2_Y})">
            L/2 = ${l2Formattata}
      </text>
      
      <!-- Linea tratteggiata orizzontale: dalla fine della riga verticale tratteggiata verso la prima riga verticale -->
      <line x1="${rigaOrizzontaleTratteggiataX1}" y1="${rigaOrizzontaleTratteggiataY}" 
            x2="${rigaOrizzontaleTratteggiataX2}" y2="${rigaOrizzontaleTratteggiataY}" 
            stroke="#000" stroke-width="0.1" stroke-dasharray="0.2,0.2"/>
      
      <!-- Nuova linea verticale unterzo con pallini: parte dalla linea tratteggiata orizzontale e finisce alla fine dell'apertura, solo se unterzo > 0 -->
      ${unterzo > 0 ? `
      <line x1="${rigaVerticaleUnterzoX}" y1="${rigaVerticaleUnterzoYStart}" 
            x2="${rigaVerticaleUnterzoX}" y2="${rigaVerticaleUnterzoYEnd}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino inferiore -->
      <circle cx="${rigaVerticaleUnterzoX}" cy="${rigaVerticaleUnterzoYStart}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino superiore -->
      <circle cx="${rigaVerticaleUnterzoX}" cy="${rigaVerticaleUnterzoYEnd}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Scritta valore unterzo a destra della linea -->
      <text x="${scrittaUnterzo_X}" 
            y="${scrittaUnterzo_Y}" 
            font-size="0.4" 
            font-weight="bold" 
            fill="#000" 
            text-anchor="middle" 
            dominant-baseline="middle" 
            transform="rotate(-90 ${scrittaUnterzo_X} ${scrittaUnterzo_Y})">
            ${unterzoFormattato}
      </text>
      ` : ''}
      
      <!-- Scritta "Sup. non conteggiabile" - solo se hdavanzale < 0.60 -->
      ${mostraRigaCondizionale ? `
      <text x="${rigaVerticale2X + (0.10 * scalaCm)}" 
            y="${riga1Y - (0.30 * scalaCm)}" 
            font-size="0.4" font-weight="bold" fill="#000" 
            textLength="${7.0}">
            Sup. non conteggiabile
      </text>
      <!-- Linea sottile sotto la scritta che va dalla fine della scritta allo spazio centrale tra le due righe verticali -->
      <line x1="${rigaVerticale2X + (0.10 * scalaCm) + 7.0}" 
            y1="${riga1Y - (0.30 * scalaCm) + 0.2}" 
            x2="${rigaVerticale1X + (rigaVerticale2X - rigaVerticale1X) / 2}" 
            y2="${riga1Y - (0.30 * scalaCm) + 0.2}" 
            stroke="#000" stroke-width="0.08"/>
      ` : ''}
      
      <!-- Scritta "Sup. conteggiata al 100%" - posizionata sotto la linea orizzontale tratteggiata, solo se intero > 0 -->
      ${intero > 0 ? `
      <!-- Calcola il centro della scritta "Sup. conteggiata" (lunghezza approssimativa 4.5 cm) per centrare "al 100%" -->
      <text x="${rigaVerticale2X + (0.10 * scalaCm) + 0.5 + 2.25}" 
            y="${rigaOrizzontaleTratteggiataY + (0.30 * scalaCm)}" 
            font-size="0.4" font-weight="bold" fill="#000" 
            text-anchor="middle">
            <tspan x="${rigaVerticale2X + (0.10 * scalaCm) + 0.5 + 2.25}" dy="0">Sup. conteggiata</tspan>
            <tspan x="${rigaVerticale2X + (0.10 * scalaCm) + 0.5 + 2.25}" dy="0.5" font-size="0.4">al 100%</tspan>
      </text>
      <!-- Linea sottile sotto la scritta che va dalla fine della scritta allo spazio centrale tra le due righe verticali -->
      <!-- Lunghezza approssimativa di "Sup. conteggiata per" è circa 5.5 cm -->
      <line x1="${rigaVerticale2X + (0.10 * scalaCm) + 5.5}" 
            y1="${rigaOrizzontaleTratteggiataY + (0.30 * scalaCm) + 0.2}" 
            x2="${rigaVerticale1X + (rigaVerticale2X - rigaVerticale1X) / 2}" 
            y2="${rigaOrizzontaleTratteggiataY + (0.30 * scalaCm) + 0.2}" 
            stroke="#000" stroke-width="0.08"/>
      ` : ''}
      
      <!-- Scritta "Sup. conteggiata per 1/3" - posizionata appena sopra la riga tratteggiata, solo se unterzo > 0 -->
      ${unterzo > 0 ? `
      <!-- Riga orizzontale appena sopra la riga tratteggiata (accorciata) -->
      <line x1="${rigaVerticale1X - 4.0}" 
            y1="${rigaOrizzontaleTratteggiataY - 0.3}" 
            x2="${rigaVerticale1X + (rigaVerticale2X - rigaVerticale1X) / 2}" 
            y2="${rigaOrizzontaleTratteggiataY - 0.3}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Scritta più a destra -->
      <text x="${rigaVerticale1X - 2.0}" 
            y="${rigaOrizzontaleTratteggiataY - 0.5}" 
            font-size="0.4" font-weight="bold" fill="#000" 
            text-anchor="middle">
            <tspan x="${rigaVerticale1X - 2.0}" dy="0">Sup. conteggiata</tspan>
            <tspan x="${rigaVerticale1X - 2.0}" dy="0.5">per 1/3</tspan>
      </text>
      ` : ''}
      
      <!-- Linea verticale imposta con pallini: posizionata a sinistra della scritta "Sup. conteggiata per 1/3" -->
      ${unterzo > 0 ? `
      <line x1="${rigaVerticaleImpostaX}" y1="${rigaVerticaleImpostaYStart}" 
            x2="${rigaVerticaleImpostaX}" y2="${rigaVerticaleImpostaYEnd}" 
            stroke="#000" stroke-width="0.08"/>
      <!-- Pallino inferiore -->
      <circle cx="${rigaVerticaleImpostaX}" cy="${rigaVerticaleImpostaYStart}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Pallino superiore -->
      <circle cx="${rigaVerticaleImpostaX}" cy="${rigaVerticaleImpostaYEnd}" 
              r="${pallinoRaggio}" 
              fill="#000"/>
      <!-- Scritta "Imp = [valore]" a sinistra della linea -->
      <text x="${scrittaImposta_X}" 
            y="${scrittaImposta_Y}" 
            font-size="0.4" 
            font-weight="bold" 
            fill="#000"
            text-anchor="middle"
            transform="rotate(-90 ${scrittaImposta_X} ${scrittaImposta_Y})">
            Imp = ${impostaFormattata}
      </text>
      ` : ''}
      
      <!-- Scritte dimensioni sotto il disegno -->
      <text x="${centroFoglio}" 
            y="${riga1Y + 1.0}" 
            font-size="0.6" 
            font-weight="bold" 
            fill="#000" 
            text-anchor="middle">
            ALTEZZA APERTURA : ${formatItalianNumber(altezza, 2)}
      </text>
      
      <text x="${centroFoglio}" 
            y="${riga1Y + 1.7}" 
            font-size="0.6" 
            font-weight="bold" 
            fill="#000" 
            text-anchor="middle">
            ALTEZZA DAVANZALE : ${formatItalianNumber(hdavanzale, 2)}
      </text>
      
      <text x="${centroFoglio}" 
            y="${riga1Y + 2.4}" 
            font-size="0.6" 
            font-weight="bold" 
            fill="#000" 
            text-anchor="middle">
            SPORGENZA : ${formatItalianNumber(sporgenza, 2)}
      </text>
      
      <text x="${centroFoglio}" 
            y="${riga1Y + 3.1}" 
            font-size="0.6" 
            font-weight="bold" 
            fill="#000" 
            text-anchor="middle">
            IMPOSTA : ${formatItalianNumber(imposta, 2)}
      </text>
    </svg>
  `;
  
  return svg;
}

/**
 * Genera il contenuto DXF dallo schema aggetto
 * Converte le coordinate SVG (in cm) in coordinate DXF (in mm)
 */
function generaDXF(dati) {
  // Estrai i dati (stessa logica di generaSchemaAggetto)
  const edificio = dati.edificio || 'N/A';
  const piano = dati.piano || 'N/A';
  const locale = dati.locale || 'N/A';
  const nagg = dati.nagg || '';
  const larghezza = parseItalianNumber(dati.larghezza || '0') || 0;
  const altezza = parseItalianNumber(dati.altezza || '0') || 0;
  const sporgenza = parseItalianNumber(dati.sporgenza || '0') || 0;
  const imposta = parseItalianNumber(dati.imposta || '0,20') || 0.20;
  const hdavanzale = parseItalianNumber(dati.hdavanzale || '0') || 0;

  // Calcola i valori dell'apertura
  const calcoli = calcolaApertura({
    larghezza: larghezza,
    altezza: altezza,
    hdavanzale: hdavanzale,
    imposta: imposta,
    sporgenza: sporgenza
  });
  const htot = calcoli.htot;
  const intero = calcoli.intero;
  const unterzo = calcoli.unterzo;

  // Dimensioni foglio A4 in cm
  const a4Width = 21;
  const scalaCm = 5; // Scala 1:20 (1 metro = 5 cm)
  
  // Calcola tutte le posizioni (stessa logica di generaSchemaAggetto)
  const riga1Y = 18;
  const riga1Length = 12;
  const centroFoglio = a4Width / 2;
  const riga1X1 = centroFoglio - (riga1Length / 2);
  const riga1X2 = centroFoglio + (riga1Length / 2);
  
  const rigaVerticale1X = riga1X1 + 2;
  const rigaVerticale1YStart = riga1Y;
  const rigaVerticale1Length = htot * scalaCm;
  const rigaVerticale1YEnd = riga1Y - rigaVerticale1Length;
  
  const rigaVerticale2X = riga1X1 + 2 + 1.0;
  const rigaVerticale2YStart = riga1Y;
  const rigaVerticale2YEnd = riga1Y - rigaVerticale1Length;
  
  const rigaOrizzontaleDavanzaleY = riga1Y - (hdavanzale * scalaCm);
  const rigaOrizzontaleDavanzaleX1 = rigaVerticale1X;
  const rigaOrizzontaleDavanzaleX2 = rigaVerticale2X;
  
  const rigaOrizzontaleCondizionaleY = riga1Y - (0.60 * scalaCm);
  const mostraRigaCondizionale = hdavanzale < 0.60;
  
  const rigaOrizzontaleAltezzaY = rigaOrizzontaleDavanzaleY - (altezza * scalaCm);
  const rigaOrizzontaleAltezzaX1 = rigaVerticale1X;
  const rigaOrizzontaleAltezzaX2 = rigaVerticale2X;
  
  const rigaOrizzontaleChiusuraY = rigaVerticale1YEnd;
  const rigaOrizzontaleChiusuraX1 = rigaVerticale1X;
  const rigaOrizzontaleChiusuraX2 = rigaVerticale2X;
  
  const rigaOrizzontaleSporgenzaY = rigaVerticale1YEnd;
  const rigaOrizzontaleSporgenzaX1 = rigaVerticale2X;
  const rigaOrizzontaleSporgenzaLength = sporgenza * scalaCm;
  const rigaOrizzontaleSporgenzaX2 = rigaVerticale2X + rigaOrizzontaleSporgenzaLength;
  
  const rigaVerticaleSporgenzaX = rigaOrizzontaleSporgenzaX2;
  const rigaVerticaleSporgenzaYStart = rigaOrizzontaleSporgenzaY;
  const rigaVerticaleSporgenzaLength = (sporgenza / 2) * scalaCm;
  const rigaVerticaleSporgenzaYEnd = rigaOrizzontaleSporgenzaY + rigaVerticaleSporgenzaLength;
  
  const rigaOrizzontaleTratteggiataY = rigaVerticaleSporgenzaYEnd;
  const rigaOrizzontaleTratteggiataX1 = rigaVerticaleSporgenzaX;
  const rigaOrizzontaleTratteggiataX2 = rigaVerticale1X;
  
  const rigaOrizzontaleNuovaY = rigaOrizzontaleSporgenzaY - 0.40;
  const rigaOrizzontaleNuovaX1 = rigaOrizzontaleSporgenzaX1;
  const rigaOrizzontaleNuovaX2 = rigaOrizzontaleSporgenzaX2;
  const pallinoRaggio = 0.08;
  
  const rigaVerticaleNuovaX = rigaVerticaleSporgenzaX + 0.60;
  const rigaVerticaleNuovaYStart = rigaVerticaleSporgenzaYStart;
  const rigaVerticaleNuovaYEnd = rigaVerticaleSporgenzaYEnd;
  
  const rigaVerticaleSinistraX = rigaVerticale1X - 0.30;
  const rigaVerticaleSinistraYStart = riga1Y;
  const rigaVerticaleSinistraYEnd = rigaOrizzontaleCondizionaleY;
  
  const rigaVerticaleInteroX = rigaVerticale1X - 0.30;
  const rigaVerticaleInteroYStart = mostraRigaCondizionale ? rigaOrizzontaleCondizionaleY : rigaOrizzontaleDavanzaleY;
  const rigaVerticaleInteroYEnd = rigaOrizzontaleTratteggiataY;
  
  const rigaVerticaleUnterzoX = rigaVerticale2X + 0.30;
  const rigaVerticaleUnterzoYStart = rigaOrizzontaleTratteggiataY;
  const rigaVerticaleUnterzoYEnd = rigaOrizzontaleAltezzaY;
  
  const rigaVerticaleImpostaX = rigaVerticale1X - 1.5;
  const rigaVerticaleImpostaYStart = rigaOrizzontaleAltezzaY;
  const rigaVerticaleImpostaYEnd = rigaOrizzontaleSporgenzaY;

  // Funzione helper per convertire cm in mm (DXF usa mm)
  const cmToMm = (cm) => cm * 10;
  
  // Funzione helper per convertire coordinate Y (SVG ha Y verso il basso, DXF ha Y verso l'alto)
  // Invertiamo l'asse Y rispetto a un punto di riferimento
  const refY = 30; // Punto di riferimento in cm
  const svgYToDxfY = (svgY) => cmToMm(refY - svgY);

  // Inizia a costruire il DXF
  let dxf = '';
  
  // HEADER section
  dxf += '0\n';
  dxf += 'SECTION\n';
  dxf += '2\n';
  dxf += 'HEADER\n';
  dxf += '9\n';
  dxf += '$ACADVER\n';
  dxf += '1\n';
  dxf += 'AC1015\n'; // AutoCAD 2000
  dxf += '0\n';
  dxf += 'ENDSEC\n';
  
  // TABLES section (minimale)
  dxf += '0\n';
  dxf += 'SECTION\n';
  dxf += '2\n';
  dxf += 'TABLES\n';
  dxf += '0\n';
  dxf += 'TABLE\n';
  dxf += '2\n';
  dxf += 'LAYER\n';
  dxf += '5\n';
  dxf += '2\n';
  dxf += '100\n';
  dxf += 'AcDbSymbolTable\n';
  dxf += '70\n';
  dxf += '1\n';
  dxf += '0\n';
  dxf += 'LAYER\n';
  dxf += '5\n';
  dxf += '10\n';
  dxf += '100\n';
  dxf += 'AcDbSymbolTableRecord\n';
  dxf += '100\n';
  dxf += 'AcDbLayerTableRecord\n';
  dxf += '2\n';
  dxf += '0\n';
  dxf += '70\n';
  dxf += '0\n';
  dxf += '62\n';
  dxf += '7\n';
  dxf += '6\n';
  dxf += 'CONTINUOUS\n';
  dxf += '0\n';
  dxf += 'ENDTAB\n';
  dxf += '0\n';
  dxf += 'ENDSEC\n';
  
  // ENTITIES section
  dxf += '0\n';
  dxf += 'SECTION\n';
  dxf += '2\n';
  dxf += 'ENTITIES\n';
  
  // Funzione helper per aggiungere una LINEA
  const addLine = (x1, y1, x2, y2, layer = '0') => {
    const handle = Math.random().toString(36).substr(2, 9);
    dxf += '0\n';
    dxf += 'LINE\n';
    dxf += '5\n';
    dxf += `${handle}\n`;
    dxf += '100\n';
    dxf += 'AcDbEntity\n';
    dxf += '8\n';
    dxf += `${layer}\n`;
    dxf += '100\n';
    dxf += 'AcDbLine\n';
    dxf += '10\n';
    dxf += `${cmToMm(x1)}\n`; // X1
    dxf += '20\n';
    dxf += `${svgYToDxfY(y1)}\n`; // Y1
    dxf += '30\n';
    dxf += '0.0\n'; // Z1
    dxf += '11\n';
    dxf += `${cmToMm(x2)}\n`; // X2
    dxf += '21\n';
    dxf += `${svgYToDxfY(y2)}\n`; // Y2
    dxf += '31\n';
    dxf += '0.0\n'; // Z2
  };
  
  // Funzione helper per aggiungere un CERCHIO
  const addCircle = (cx, cy, r, layer = '0') => {
    const handle = Math.random().toString(36).substr(2, 9);
    dxf += '0\n';
    dxf += 'CIRCLE\n';
    dxf += '5\n';
    dxf += `${handle}\n`;
    dxf += '100\n';
    dxf += 'AcDbEntity\n';
    dxf += '8\n';
    dxf += `${layer}\n`;
    dxf += '100\n';
    dxf += 'AcDbCircle\n';
    dxf += '10\n';
    dxf += `${cmToMm(cx)}\n`; // Centro X
    dxf += '20\n';
    dxf += `${svgYToDxfY(cy)}\n`; // Centro Y
    dxf += '30\n';
    dxf += '0.0\n'; // Centro Z
    dxf += '40\n';
    dxf += `${cmToMm(r)}\n`; // Raggio
  };
  
  // Funzione helper per aggiungere TESTO
  const addText = (x, y, text, height = 2.0, rotation = 0, layer = '0') => {
    const handle = Math.random().toString(36).substr(2, 9);
    dxf += '0\n';
    dxf += 'TEXT\n';
    dxf += '5\n';
    dxf += `${handle}\n`;
    dxf += '100\n';
    dxf += 'AcDbEntity\n';
    dxf += '8\n';
    dxf += `${layer}\n`;
    dxf += '100\n';
    dxf += 'AcDbText\n';
    dxf += '10\n';
    dxf += `${cmToMm(x)}\n`; // X
    dxf += '20\n';
    dxf += `${svgYToDxfY(y)}\n`; // Y
    dxf += '30\n';
    dxf += '0.0\n'; // Z
    dxf += '40\n';
    dxf += `${cmToMm(height)}\n`; // Altezza testo
    dxf += '1\n';
    dxf += `${text}\n`; // Testo
    dxf += '50\n';
    dxf += `${rotation}\n`; // Rotazione in gradi
  };
  
  // Aggiungi tutte le linee
  // Prima riga orizzontale base
  addLine(riga1X1, riga1Y, riga1X2, riga1Y);
  
  // Linea verticale sinistra (se hdavanzale < 0.60)
  if (mostraRigaCondizionale) {
    addLine(rigaVerticaleSinistraX, rigaVerticaleSinistraYStart, rigaVerticaleSinistraX, rigaVerticaleSinistraYEnd);
    addCircle(rigaVerticaleSinistraX, rigaVerticaleSinistraYStart, pallinoRaggio);
    addCircle(rigaVerticaleSinistraX, rigaVerticaleSinistraYEnd, pallinoRaggio);
    addText(rigaVerticaleSinistraX - 0.25, (rigaVerticaleSinistraYStart + rigaVerticaleSinistraYEnd) / 2, '0,60', 0.5, -90);
  }
  
  // Prima riga verticale
  addLine(rigaVerticale1X, rigaVerticale1YStart, rigaVerticale1X, rigaVerticale1YEnd);
  
  // Seconda riga verticale
  addLine(rigaVerticale2X, rigaVerticale2YStart, rigaVerticale2X, rigaVerticale2YEnd);
  
  // Riga orizzontale davanzale
  addLine(rigaOrizzontaleDavanzaleX1, rigaOrizzontaleDavanzaleY, rigaOrizzontaleDavanzaleX2, rigaOrizzontaleDavanzaleY);
  
  // Linea verticale intero (se intero > 0)
  if (intero > 0) {
    addLine(rigaVerticaleInteroX, rigaVerticaleInteroYStart, rigaVerticaleInteroX, rigaVerticaleInteroYEnd);
    addCircle(rigaVerticaleInteroX, rigaVerticaleInteroYStart, pallinoRaggio);
    addCircle(rigaVerticaleInteroX, rigaVerticaleInteroYEnd, pallinoRaggio);
    const interoFormattato = formatItalianNumber(intero, 3);
    addText(rigaVerticaleInteroX - 0.25, (rigaVerticaleInteroYStart + rigaVerticaleInteroYEnd) / 2, interoFormattato, 0.5, -90);
  }
  
  // Riga orizzontale condizionale (se hdavanzale < 0.60)
  if (mostraRigaCondizionale) {
    addLine(rigaOrizzontaleCondizionaleX1, rigaOrizzontaleCondizionaleY, rigaOrizzontaleCondizionaleX2, rigaOrizzontaleCondizionaleY);
  }
  
  // Riga orizzontale altezza
  addLine(rigaOrizzontaleAltezzaX1, rigaOrizzontaleAltezzaY, rigaOrizzontaleAltezzaX2, rigaOrizzontaleAltezzaY);
  
  // Riga orizzontale chiusura
  addLine(rigaOrizzontaleChiusuraX1, rigaOrizzontaleChiusuraY, rigaOrizzontaleChiusuraX2, rigaOrizzontaleChiusuraY);
  
  // Riga orizzontale sporgenza
  addLine(rigaOrizzontaleSporgenzaX1, rigaOrizzontaleSporgenzaY, rigaOrizzontaleSporgenzaX2, rigaOrizzontaleSporgenzaY);
  
  // Riga orizzontale nuova (con pallini)
  addLine(rigaOrizzontaleNuovaX1, rigaOrizzontaleNuovaY, rigaOrizzontaleNuovaX2, rigaOrizzontaleNuovaY);
  addCircle(rigaOrizzontaleNuovaX1, rigaOrizzontaleNuovaY, pallinoRaggio);
  addCircle(rigaOrizzontaleNuovaX2, rigaOrizzontaleNuovaY, pallinoRaggio);
  
  // Scritta L sopra la sporgenza
  const sporgenzaFormattata = formatItalianNumber(sporgenza, 3);
  addText((rigaOrizzontaleNuovaX1 + rigaOrizzontaleNuovaX2) / 2, rigaOrizzontaleNuovaY - 0.30, `L = ${sporgenzaFormattata}`, 0.4);
  
  // Riga verticale tratteggiata sporgenza (simulata come linea continua)
  addLine(rigaVerticaleSporgenzaX, rigaVerticaleSporgenzaYStart, rigaVerticaleSporgenzaX, rigaVerticaleSporgenzaYEnd);
  
  // Riga verticale nuova (L/2)
  addLine(rigaVerticaleNuovaX, rigaVerticaleNuovaYStart, rigaVerticaleNuovaX, rigaVerticaleNuovaYEnd);
  addCircle(rigaVerticaleNuovaX, rigaVerticaleNuovaYStart, pallinoRaggio);
  addCircle(rigaVerticaleNuovaX, rigaVerticaleNuovaYEnd, pallinoRaggio);
  const l2Formattata = formatItalianNumber(sporgenza / 2, 3);
  addText(rigaVerticaleNuovaX + 0.55, (rigaVerticaleNuovaYStart + rigaVerticaleNuovaYEnd) / 2, `L/2 = ${l2Formattata}`, 0.4, -90);
  
  // Riga orizzontale tratteggiata (simulata come linea continua)
  addLine(rigaOrizzontaleTratteggiataX1, rigaOrizzontaleTratteggiataY, rigaOrizzontaleTratteggiataX2, rigaOrizzontaleTratteggiataY);
  
  // Linea verticale unterzo (se unterzo > 0)
  if (unterzo > 0) {
    addLine(rigaVerticaleUnterzoX, rigaVerticaleUnterzoYStart, rigaVerticaleUnterzoX, rigaVerticaleUnterzoYEnd);
    addCircle(rigaVerticaleUnterzoX, rigaVerticaleUnterzoYStart, pallinoRaggio);
    addCircle(rigaVerticaleUnterzoX, rigaVerticaleUnterzoYEnd, pallinoRaggio);
    const unterzoFormattato = formatItalianNumber(unterzo, 3);
    addText(rigaVerticaleUnterzoX + 0.40, (rigaVerticaleUnterzoYStart + rigaVerticaleUnterzoYEnd) / 2, unterzoFormattato, 0.5, -90);
  }
  
  // Linea verticale imposta (se unterzo > 0)
  if (unterzo > 0) {
    addLine(rigaVerticaleImpostaX, rigaVerticaleImpostaYStart, rigaVerticaleImpostaX, rigaVerticaleImpostaYEnd);
    addCircle(rigaVerticaleImpostaX, rigaVerticaleImpostaYStart, pallinoRaggio);
    addCircle(rigaVerticaleImpostaX, rigaVerticaleImpostaYEnd, pallinoRaggio);
    const impostaFormattata = formatItalianNumber(imposta, 3);
    addText(rigaVerticaleImpostaX - 0.25, (rigaVerticaleImpostaYStart + rigaVerticaleImpostaYEnd) / 2, `Imp = ${impostaFormattata}`, 0.4, -90);
  }
  
  // Testi informativi sotto il disegno
  addText(centroFoglio, riga1Y + 1.0, `DIMENSIONI APERTURA : ${formatItalianNumber(larghezza, 2)} x ${formatItalianNumber(altezza, 2)}`, 0.6);
  addText(centroFoglio, riga1Y + 1.7, `ALTEZZA DAVANZALE : ${formatItalianNumber(hdavanzale, 2)}`, 0.6);
  addText(centroFoglio, riga1Y + 2.4, `SPORGENZA : ${formatItalianNumber(sporgenza, 2)}`, 0.6);
  addText(centroFoglio, riga1Y + 3.1, `IMPOSTA : ${formatItalianNumber(imposta, 2)}`, 0.6);
  
  // Chiudi ENTITIES section
  dxf += '0\n';
  dxf += 'ENDSEC\n';
  
  // EOF
  dxf += '0\n';
  dxf += 'EOF\n';
  
  return dxf;
}

/**
 * Esporta lo schema aggetto in formato DXF
 */
async function esportaDXF(dati) {
  try {
    // Genera il contenuto DXF
    const dxfContent = generaDXF(dati);
    
    // Usa Tauri per salvare il file
    if (window.__TAURI__ && window.__TAURI__.dialog && window.__TAURI__.fs) {
      const tauriDialog = window.__TAURI__.dialog;
      const tauriFs = window.__TAURI__.fs;
      
      const edificio = dati.edificio || 'N/A';
      const nagg = dati.nagg || '?';
      const fileName = `Schema_Aggetto_${nagg}_${edificio.replace(/[^a-zA-Z0-9]/g, '_')}.dxf`;
      
      const filePath = await tauriDialog.save({
        defaultPath: fileName,
        filters: [{ name: 'File DXF', extensions: ['dxf'] }]
      });
      
      if (filePath) {
        await tauriFs.writeTextFile(filePath, dxfContent);
        alert(`File DXF salvato con successo!\n${filePath}`);
      }
    } else {
      // Fallback: download del file
      const blob = new Blob([dxfContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Schema_Aggetto_${dati.nagg || '?'}.dxf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('File DXF scaricato con successo!');
    }
  } catch (error) {
    console.error('Errore durante l\'esportazione DXF:', error);
    alert('Errore durante l\'esportazione DXF: ' + error.message);
  }
}

// Esponi le funzioni globalmente
window.generaSchemaAggetto = generaSchemaAggetto;
window.apriSchemaAggetto = apriSchemaAggetto;

// Esporta anche come modulo ES6
export { apriSchemaAggetto };

