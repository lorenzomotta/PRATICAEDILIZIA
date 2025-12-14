// Gestione vista Aggetti - Aperture con sporgenza > 1,20
import { parseItalianNumber, formatItalianNumber, calcolaApertura } from './calcoli.js';

// Funzione helper per escape HTML
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Aggiorna la vista Aggetti con le aperture che hanno sporgenza > 1,20
 */
function aggiornaVistaAggetti() {
  const container = document.getElementById('aggetti-content');
  if (!container) return;

  // Ottieni il dataModel globale
  const dataModel = window.dataModel;
  if (!dataModel) {
    container.innerHTML = '<div class="card-body text-center text-muted p-5">Errore: modello dati non disponibile.</div>';
    return;
  }

  // Raccogli tutte le aperture con sporgenza > 1,20
  const apertureAggetti = [];
  const edifici = dataModel.getAllEdifici();

  edifici.forEach(edificio => {
    edificio.piani.forEach(piano => {
      piano.locali.forEach(locale => {
        if (locale.aperture && Array.isArray(locale.aperture)) {
          locale.aperture.forEach(apertura => {
            // Converti la sporgenza in numero
            const sporgenza = parseItalianNumber(apertura.sporgenza || '0') || 0;
            
            // Filtra solo le aperture con sporgenza > 1,20
            if (sporgenza > 1.20) {
              // Calcola intero e unterzo
              const calcoli = calcolaApertura({
                larghezza: parseItalianNumber(apertura.larghezza || '0') || 0,
                altezza: parseItalianNumber(apertura.altezza || '0') || 0,
                hdavanzale: parseItalianNumber(apertura.hdavanzale || '0') || 0,
                imposta: parseItalianNumber(apertura.imposta || '0,20') || 0.20,
                sporgenza: sporgenza
              });

              apertureAggetti.push({
                edificio: edificio.nome || 'N/A',
                locale: locale.nome || 'N/A',
                piano: piano.nome || 'N/A',
                larghezza: apertura.larghezza || '0,00',
                altezza: apertura.altezza || '0,00',
                sporgenza: apertura.sporgenza || '0,00',
                nagg: apertura.nagg || '',
                hdavanzale: apertura.hdavanzale || '',
                imposta: apertura.imposta || '0,20',
                intero: formatItalianNumber(calcoli.intero, 3),
                unterzo: formatItalianNumber(calcoli.unterzo, 3),
                edificioId: edificio.id,
                pianoId: piano.id,
                localeId: locale.id
              });
            }
          });
        }
      });
    });
  });

  // Genera la tabella
  if (apertureAggetti.length === 0) {
    container.innerHTML = '<div class="card-body aggetti-empty">Nessuna apertura con sporgenza > 1,20 trovata.</div>';
    return;
  }

  // Raggruppa le aperture per combinazione di (altezza, hdavanzale, sporgenza, imposta)
  // e assegna un colore a ciascun gruppo
  const gruppiColori = new Map();
  const coloriDisponibili = [
    'rgba(255, 150, 150, 0.4)',  // Rosso più intenso
    'rgba(150, 255, 150, 0.4)',  // Verde più intenso
    'rgba(150, 150, 255, 0.4)',  // Blu più intenso
    'rgba(255, 255, 150, 0.4)',  // Giallo più intenso
    'rgba(255, 150, 255, 0.4)',  // Magenta più intenso
    'rgba(150, 255, 255, 0.4)',  // Cyan più intenso
    'rgba(255, 200, 100, 0.4)',  // Arancione più intenso
    'rgba(200, 150, 255, 0.4)',  // Viola più intenso
    'rgba(255, 180, 180, 0.4)',  // Rosa
    'rgba(180, 255, 180, 0.4)',  // Verde chiaro
    'rgba(180, 180, 255, 0.4)',  // Blu chiaro
    'rgba(255, 255, 180, 0.4)',  // Giallo chiaro
    'rgba(200, 255, 200, 0.4)',  // Verde menta
    'rgba(255, 200, 150, 0.4)',  // Pesca
    'rgba(200, 200, 255, 0.4)',  // Lavanda
    'rgba(255, 220, 180, 0.4)',  // Albicocca
  ];
  let indiceColore = 0;

  // Funzione helper per normalizzare una stringa numerica italiana in modo rigoroso
  // Converte in numero, arrotonda a 2 decimali, e riconverte in stringa con formato uniforme
  // IMPORTANTE: valori che appaiono diversi nella tabella devono rimanere diversi
  function normalizzaValoreStringa(valoreStr) {
    if (!valoreStr || valoreStr.trim() === '') {
      return '0.00';
    }
    const valoreNum = parseItalianNumber(valoreStr.toString().trim()) || 0;
    // Arrotonda a 2 decimali e riconverti in stringa con punto come separatore
    // Usa sempre 2 decimali per garantire formato uniforme
    const normalizzato = Number(valoreNum.toFixed(2));
    return normalizzato.toString();
  }
  
  // Aggiungi il colore a ciascuna apertura
  apertureAggetti.forEach((apertura, index) => {
    // Prendi i valori originali così come appaiono nella tabella
    const altezzaStr = (apertura.altezza || '0').toString().trim();
    const hdavanzaleStr = (apertura.hdavanzale || '0').toString().trim();
    const sporgenzaStr = (apertura.sporgenza || '0').toString().trim();
    const impostaStr = (apertura.imposta || '0,20').toString().trim();
    
    // Normalizza ogni valore in modo rigoroso
    // Questo garantisce che valori numericamente uguali ma con formattazione diversa
    // (es. "1.8" vs "1.80") vengano normalizzati allo stesso modo
    const altezzaNorm = normalizzaValoreStringa(altezzaStr);
    const hdavanzaleNorm = normalizzaValoreStringa(hdavanzaleStr);
    const sporgenzaNorm = normalizzaValoreStringa(sporgenzaStr);
    const impostaNorm = normalizzaValoreStringa(impostaStr);
    
    // Crea la chiave usando i valori normalizzati con formato uniforme
    // IMPORTANTE: tutti e 4 i valori devono essere identici (dopo normalizzazione) per avere lo stesso colore
    const chiaveGruppo = `${altezzaNorm}_${hdavanzaleNorm}_${sporgenzaNorm}_${impostaNorm}`;
    
    // Salva i valori per debug
    apertura._valoriNormalizzati = {
      originali: {
        altezza: altezzaStr,
        hdavanzale: hdavanzaleStr,
        sporgenza: sporgenzaStr,
        imposta: impostaStr
      },
      normalizzati: {
        altezza: altezzaNorm,
        hdavanzale: hdavanzaleNorm,
        sporgenza: sporgenzaNorm,
        imposta: impostaNorm
      },
      chiave: chiaveGruppo
    };
    
    // Se il gruppo non esiste ancora, assegna un nuovo colore
    if (!gruppiColori.has(chiaveGruppo)) {
      gruppiColori.set(chiaveGruppo, coloriDisponibili[indiceColore % coloriDisponibili.length]);
      indiceColore++;
    }
    
    // Assegna il colore all'apertura
    apertura.coloreSfondo = gruppiColori.get(chiaveGruppo);
  });
  
  // Assegna numerazione progressiva N°AGG. alle aperture con lo stesso colore
  // Raggruppa per colore e assegna un numero progressivo basato sull'ordine di apparizione
  const gruppiPerColoreNumerazione = new Map();
  let numeroProgressivo = 1;
  
  // Ordina le aperture per indice (ordine di apparizione) e raggruppa per colore
  apertureAggetti.forEach((apertura, index) => {
    const colore = apertura.coloreSfondo;
    if (!colore) return;
    
    // Se è il primo elemento di questo colore, assegna un nuovo numero
    if (!gruppiPerColoreNumerazione.has(colore)) {
      gruppiPerColoreNumerazione.set(colore, numeroProgressivo);
      numeroProgressivo++;
    }
    
    // Assegna il numero progressivo all'apertura
    apertura.naggNumerato = gruppiPerColoreNumerazione.get(colore);
  });
  
  // Debug: mostra i gruppi creati con dettagli
  console.log('Gruppi colori creati:', Array.from(gruppiColori.entries()));
  
  // Debug: verifica che aperture con lo stesso colore abbiano valori identici
  const gruppiPerColore = new Map();
  apertureAggetti.forEach(apertura => {
    const colore = apertura.coloreSfondo;
    if (!gruppiPerColore.has(colore)) {
      gruppiPerColore.set(colore, []);
    }
    gruppiPerColore.get(colore).push({
      index: apertureAggetti.indexOf(apertura),
      valori: apertura._valoriNormalizzati,
      originali: {
        altezza: apertura.altezza,
        hdavanzale: apertura.hdavanzale,
        sporgenza: apertura.sporgenza,
        imposta: apertura.imposta
      }
    });
  });
  
  // Verifica che ogni gruppo abbia valori identici
  gruppiPerColore.forEach((aperture, colore) => {
    if (aperture.length > 1) {
      const primaApertura = aperture[0];
      // Confronta i valori normalizzati (stringhe)
      const tutteUguali = aperture.every(a => 
        a.valori.normalizzati.altezza === primaApertura.valori.normalizzati.altezza &&
        a.valori.normalizzati.hdavanzale === primaApertura.valori.normalizzati.hdavanzale &&
        a.valori.normalizzati.sporgenza === primaApertura.valori.normalizzati.sporgenza &&
        a.valori.normalizzati.imposta === primaApertura.valori.normalizzati.imposta
      );
      
      if (!tutteUguali) {
        console.error(`❌ ERRORE: Aperture con colore ${colore} hanno valori DIVERSI!`);
        aperture.forEach((a, idx) => {
          console.error(`  Apertura ${a.index}:`, {
            originali: a.originali,
            normalizzati: a.valori.normalizzati,
            chiave: a.valori.chiave
          });
        });
      } else {
        // Mostra sempre i dettagli per verificare visivamente
        console.log(`✓ Colore ${colore}: ${aperture.length} aperture con valori identici (normalizzati)`);
        console.log(`  Valori normalizzati:`, primaApertura.valori.normalizzati);
        console.log(`  Valori originali delle aperture (come appaiono nella tabella):`);
        aperture.forEach((a, idx) => {
          console.log(`    Riga ${a.index}: Altezza="${a.originali.altezza}", H.davanzale="${a.originali.hdavanzale}", Sporgenza="${a.originali.sporgenza}", Imposta="${a.originali.imposta}"`);
        });
        
        // Verifica se i valori originali sono visivamente identici
        const valoriOriginaliUguali = aperture.every(a => 
          a.originali.altezza === primaApertura.originali.altezza &&
          a.originali.hdavanzale === primaApertura.originali.hdavanzale &&
          a.originali.sporgenza === primaApertura.originali.sporgenza &&
          a.originali.imposta === primaApertura.originali.imposta
        );
        
        if (!valoriOriginaliUguali) {
          console.warn(`⚠️ ATTENZIONE: Queste aperture hanno valori ORIGINALI diversi ma normalizzati identici!`);
          console.warn(`   Questo significa che valori come "1.8" e "1.80" vengono considerati uguali.`);
        }
      }
    }
  });

  // Crea la tabella HTML
  const tableHtml = `
    <div class="card-body">
      <div class="table-responsive">
        <table class="table table-bordered aggetti-table">
          <thead>
            <tr>
              <th>Edificio</th>
              <th>Piano</th>
              <th>Locale</th>
              <th>Larghezza</th>
              <th>Altezza</th>
              <th>Imposta</th>
              <th>Sporgenza</th>
              <th>Altezza davanzale</th>
              <th>Intero</th>
              <th>1/3</th>
              <th>N°AGG.</th>
              <th style="width: 80px;">Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${apertureAggetti.map((apertura, index) => `
              <tr class="aggetti-row-clickable" 
                  data-edificio-id="${apertura.edificioId}" 
                  data-piano-id="${apertura.pianoId}" 
                  data-locale-id="${apertura.localeId}"
                  data-colore-sfondo="${apertura.coloreSfondo || ''}"
                  style="cursor: pointer;"
                  title="Doppio click per aprire il locale">
                <td>${apertura.edificio}</td>
                <td>${apertura.piano}</td>
                <td>${apertura.locale}</td>
                <td>${apertura.larghezza}</td>
                <td>${apertura.altezza}</td>
                <td>${apertura.imposta || '0,20'}</td>
                <td><strong>${apertura.sporgenza}</strong></td>
                <td>${apertura.hdavanzale || ''}</td>
                <td>${apertura.intero}</td>
                <td>${apertura.unterzo}</td>
                <td>${apertura.naggNumerato || apertura.nagg || ''}</td>
                <td class="text-center">
                  <button type="button" class="btn btn-icon-blue btn-circle btn-circle-sm btn-schema-aggetto" 
                          data-edificio="${escapeHtml(apertura.edificio)}"
                          data-piano="${escapeHtml(apertura.piano)}"
                          data-locale="${escapeHtml(apertura.locale)}"
                          data-larghezza="${apertura.larghezza}"
                          data-altezza="${apertura.altezza}"
                          data-sporgenza="${apertura.sporgenza}"
                          data-nagg="${apertura.naggNumerato || apertura.nagg || ''}"
                          data-hdavanzale="${apertura.hdavanzale || ''}"
                          data-imposta="${apertura.imposta || '0,20'}"
                          title="Mostra schema aggetto">
                    S
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="mt-3">
        <p class="text-muted">Totale aperture con sporgenza > 1,20: <strong>${apertureAggetti.length}</strong></p>
      </div>
    </div>
  `;

  container.innerHTML = tableHtml;
  
  // Applica i colori di sfondo dopo che il DOM è stato creato
  // Usa requestAnimationFrame per assicurarsi che il rendering sia completato
  requestAnimationFrame(() => {
    const righe = container.querySelectorAll('.aggetti-row-clickable');
    righe.forEach((riga, index) => {
      const coloreSfondo = riga.dataset.coloreSfondo;
      if (coloreSfondo && coloreSfondo !== '') {
        // Usa sia lo stile inline che una classe per massima compatibilità
        riga.style.setProperty('background-color', coloreSfondo, 'important');
        riga.classList.add('aggetti-row-colored');
        riga.style.setProperty('--row-bg-color', coloreSfondo);
        
        // Salva anche nel dataset per l'hover
        riga.dataset.coloreOriginale = coloreSfondo;
        
        // Forza anche le celle td ad ereditare il colore
        const celle = riga.querySelectorAll('td');
        celle.forEach(cella => {
          cella.style.setProperty('background-color', 'inherit', 'important');
        });
        
        // Debug: verifica che il colore sia stato applicato
        const coloreApplicato = window.getComputedStyle(riga).backgroundColor;
        console.log(`Riga ${index}: colore applicato = ${coloreApplicato}, colore atteso = ${coloreSfondo}`);
      }
    });
    
    // Aggiungi event listener per il pulsante schema
    const btnSchema = container.querySelectorAll('.btn-schema-aggetto');
    btnSchema.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const dati = {
          edificio: btn.dataset.edificio,
          piano: btn.dataset.piano,
          locale: btn.dataset.locale,
          larghezza: btn.dataset.larghezza,
          altezza: btn.dataset.altezza,
          sporgenza: btn.dataset.sporgenza,
          nagg: btn.dataset.nagg,
          hdavanzale: btn.dataset.hdavanzale,
          imposta: btn.dataset.imposta
        };
        
        // Usa la funzione da window (può essere caricata dopo)
        if (typeof window.apriSchemaAggetto === 'function') {
          window.apriSchemaAggetto(dati);
        } else {
          console.error('Funzione apriSchemaAggetto non disponibile. Attendo il caricamento...');
          // Prova dopo un breve delay
          setTimeout(() => {
            if (typeof window.apriSchemaAggetto === 'function') {
              window.apriSchemaAggetto(dati);
            } else {
              alert('Errore: impossibile aprire lo schema aggetto. La funzione non è disponibile.');
            }
          }, 100);
        }
      });
    });
    
    // Aggiungi event listener per doppio click sulle righe
    righe.forEach(riga => {
      // Usa il colore dal dataset che abbiamo salvato
      const coloreOriginale = riga.dataset.coloreOriginale || riga.dataset.coloreSfondo || '';
      
      riga.addEventListener('dblclick', (e) => {
        // Non aprire se il click è su un pulsante o altro elemento interattivo
        if (e.target.closest('button') || e.target.closest('a')) {
          return;
        }
        
        const edificioId = riga.dataset.edificioId;
        const pianoId = riga.dataset.pianoId;
        const localeId = riga.dataset.localeId;
        
        if (edificioId && pianoId && localeId && window.apriModalLocale) {
          // Salva che siamo venuti da AGGETTI per tornare qui dopo il salvataggio
          if (window.statoApp) {
            window.statoApp.vistaPrimaDelModal = 'aggetti';
          }
          window.apriModalLocale(edificioId, pianoId, localeId);
        }
      });
      
      // Aggiungi effetto hover preservando il colore originale
      riga.addEventListener('mouseenter', () => {
        // Mantieni il colore originale ma aggiungi un effetto hover più scuro
        if (coloreOriginale && coloreOriginale !== 'transparent' && coloreOriginale !== '') {
          // Estrai il colore RGB e aumenta l'opacità
          const coloreHover = coloreOriginale.replace('0.3', '0.5');
          riga.style.setProperty('background-color', coloreHover, 'important');
        } else {
          riga.style.setProperty('background-color', 'rgba(0, 123, 255, 0.1)', 'important');
        }
      });
      riga.addEventListener('mouseleave', () => {
        if (coloreOriginale && coloreOriginale !== 'transparent' && coloreOriginale !== '') {
          riga.style.setProperty('background-color', coloreOriginale, 'important');
        } else {
          riga.style.removeProperty('background-color');
        }
      });
    });
  });
}

/**
 * Mostra la vista Aggetti
 */
function mostraVistaAggetti() {
  // Usa la funzione mostraVista globale se disponibile
  if (window.mostraVista) {
    window.mostraVista('aggetti');
  } else {
    // Fallback: gestisci manualmente
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });
    const vistaAggetti = document.getElementById('view-aggetti');
    if (vistaAggetti) {
      vistaAggetti.classList.add('active');
      aggiornaVistaAggetti();
    }
  }
}

// Esponi le funzioni globalmente
window.aggiornaVistaAggetti = aggiornaVistaAggetti;
window.mostraVistaAggetti = mostraVistaAggetti;

// Setup event listener quando il DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const btnAggetti = document.getElementById('btn-aggetti');
    if (btnAggetti) {
      btnAggetti.addEventListener('click', mostraVistaAggetti);
    }
  });
} else {
  const btnAggetti = document.getElementById('btn-aggetti');
  if (btnAggetti) {
    btnAggetti.addEventListener('click', mostraVistaAggetti);
  }
}

