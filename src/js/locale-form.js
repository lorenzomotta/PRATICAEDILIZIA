// Gestione form locale con calcoli aperture
import {
  parseItalianNumber,
  formatItalianNumber,
  calcolaSuperficieUtile,
  calcolaApertura,
  calcolaTotaleAreaFinestrata,
  calcolaRapporto,
  verificaRapporto
} from './calcoli.js';

const TIPI_TIPOLOGIA_SUPERFICIE = [
  'ABITAZIONE',
  'ACCESSORIO ABITAZIONE',
  'BOX SINGOLO',
  'BOX COLLETTIVO',
  'ANDRONE',
  'PORTICATO',
  'LOGGIA',
  'BALCONE',
  'COMMERCIALE',
  'DIREZIONALE',
  'TURISTICO',
  'ACCESSORIO TERZIARIO'
];

// Istanza di DataModel condivisa con app.js
let sharedDataModel = window.dataModel || null;
export function registerLocaleFormDataModel(model) {
  sharedDataModel = model;
}

function getDataModel() {
  if (!sharedDataModel && window.dataModel) {
    sharedDataModel = window.dataModel;
  }
  return sharedDataModel;
}

let aperturaCounter = 1;
let aperturaSelezionata = null;

/**
 * Carica il form locale nella modale
 */
export function caricaFormLocale(edificioId, pianoId, localeId) {
  const modalElement = document.getElementById('modal-locale');
  const container = document.getElementById('form-locale-container');
  const title = document.getElementById('modal-locale-title');
  const dataModel = getDataModel();
  
  if (!dataModel) {
    alert('Errore interno: modello dati non inizializzato');
    console.error('DataModel non disponibile in caricaFormLocale');
    return;
  }
  
  // Se non ci sono edificio e piano, chiedi di selezionarli
  if (!edificioId || !pianoId) {
    if (!edificioId) {
      alert('Seleziona prima un edificio dalla vista Locali');
      return;
    }
    if (!pianoId) {
      alert('Seleziona prima un piano dalla vista Locali');
      return;
    }
  }
  
  let locale = null;
  if (localeId) {
    locale = dataModel.getLocale(edificioId, pianoId, localeId);
    title.textContent = 'Modifica Locale';
  } else {
    title.textContent = 'Nuovo Locale';
  }
  
  // Genera HTML del form
  const edificio = dataModel.getEdificio(edificioId);
  const piano = dataModel.getPiano(edificioId, pianoId);
  
  // Verifica che edificio e piano esistano
  if (!edificio) {
    alert(`Errore: Edificio con ID ${edificioId} non trovato`);
    return;
  }
  
  if (!piano) {
    alert(`Errore: Piano con ID ${pianoId} non trovato nell'edificio ${edificio.nome}`);
    return;
  }
  
  container.innerHTML = `
    <form id="form-locale">
      <input type="hidden" id="locale-edificio-id" value="${edificioId}">
      <input type="hidden" id="locale-piano-id" value="${pianoId}">
      <input type="hidden" id="locale-id" value="${localeId || ''}">
      
      <div class="row mb-3 g-3 align-items-end form-riga-top">
        <div class="col-lg-3 col-md-6">
          <label class="form-label">Edificio</label>
          <input type="text" value="${edificio.nome || ''}" readonly class="form-control bg-light">
        </div>
        <div class="col-lg-3 col-md-6">
          <label class="form-label">Piano</label>
          <input type="text" value="${piano.nome || ''}" readonly class="form-control bg-light">
        </div>
        <div class="col-lg-3 col-md-6">
          <label for="locale-nome" class="form-label">Nome Locale</label>
          <input type="text" id="locale-nome" class="form-control" value="${locale ? locale.nome : ''}" required>
        </div>
        <div class="col-lg-3 col-md-6">
          <label for="locale-tipologia" class="form-label">Tipologia Superficie</label>
          <select id="locale-tipologia" class="form-select"></select>
        </div>
      </div>
      
      <div class="border border-primary rounded p-3 mb-3">
        <h5 class="text-primary mb-3">Superficie Locale</h5>
        
        <div class="row mb-3 g-3 align-items-end form-riga-superficie">
          <div class="col-xl-2 col-lg-2 col-md-3 col-sm-4 col-6">
            <label for="locale-rapporto-richiesto" class="form-label">Rapporto Richiesto</label>
            <select id="locale-rapporto-richiesto" class="form-select input-yellow text-center">
              <option value="8,00" ${!locale || locale.rapportoRichiesto === '8,00' ? 'selected' : ''}>8.00</option>
              <option value="12,00" ${locale && locale.rapportoRichiesto === '12,00' ? 'selected' : ''}>12.00</option>
              <option value="30,00" ${locale && locale.rapportoRichiesto === '30,00' ? 'selected' : ''}>30.00</option>
              <option value="NON RICHIESTO" ${locale && locale.rapportoRichiesto === 'NON RICHIESTO' ? 'selected' : ''}>NON RICHIESTO</option>
              <option value="AERAZIONE FORZATA" ${locale && locale.rapportoRichiesto === 'AERAZIONE FORZATA' ? 'selected' : ''}>AERAZIONE FORZATA</option>
            </select>
          </div>
          <div class="col-xl-7 col-lg-7 col-md-5 col-sm-8 col-12">
            <label for="locale-specifica" class="form-label">Determinazione Superficie (formula)</label>
            <input type="text" id="locale-specifica" class="form-control input-yellow" value="${locale ? locale.specificaSuperficie : ''}" placeholder="es: 5.5 * 3.2" oninput="aggiornaSupUtileLocale()">
          </div>
          <div class="col-xl-3 col-lg-3 col-md-4 col-sm-12 col-12">
            <label class="form-label text-end w-100">Sup. Utile</label>
            <div class="d-flex justify-content-end align-items-center gap-2">
              <span id="locale-sup-utile" class="sup-utile-display">0,00</span>
              <span>m²</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="border border-primary rounded p-3 mb-3 aperture-section position-relative">
        <div class="d-flex align-items-center gap-2 mb-3">
          <h5 class="text-primary mb-0">Aperture</h5>
          <button type="button" onclick="aggiungiAperturaLocale()" class="btn btn-icon-green btn-circle btn-circle-md" title="Aggiungi apertura">
            <span class="text-white fw-bold">+</span>
          </button>
        </div>
 
        <div class="table-responsive">
          <table class="table table-bordered table-sm aperture-table">
            <thead>
              <tr>
                <th style="width: 50px;">ID</th>
                <th style="width: 80px;">LARGHEZZA</th>
                <th style="width: 80px;">ALTEZZA</th>
                <th style="width: 80px;">HDAVANZALE</th>
                <th style="width: 80px;">IMPOSTA</th>
                <th style="width: 80px;">SPORGENZA</th>
                <th style="width: 80px;">H TOT</th>
                <th style="width: 80px;">L/2</th>
                <th style="width: 80px;">UNTERZO</th>
                <th style="width: 80px;">INTERO</th>
                <th style="width: 100px;">AREA FINESTRATA</th>
                <th style="width: 80px;">Azioni</th>
              </tr>
            </thead>
            <tbody id="locale-aperture-tbody">
              <!-- Le righe verranno aggiunte dinamicamente -->
            </tbody>
          </table>
        </div>
        
        <div class="d-flex align-items-center gap-3 mt-3 flex-wrap">
          <div class="d-flex align-items-center gap-2">
            <span class="fw-bold">Superficie Locale:</span>
            <span id="locale-superficie-display" class="badge bg-success">0,00</span> m²
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="fw-bold">AREA FINESTRATA TOTALE:</span>
            <span id="locale-area-finestrata-totale" class="badge bg-success">0,00</span> m²
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="fw-bold">RAPPORTO:</span>
            <span id="locale-rapporto" class="badge bg-success">0,00</span>
            <span id="locale-verifica-rapporto" class="fw-bold text-danger"></span>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" id="btn-annulla-locale" class="btn btn-secondary">Annulla</button>
        <button type="submit" class="btn btn-primary">Salva Locale</button>
      </div>
    </form>
  `;
  
  const tipologiaSelect = document.getElementById('locale-tipologia');
  if (tipologiaSelect) {
    popolaTipologiaSelect(tipologiaSelect, locale ? locale.tipologiaSuperficie : null);
    setupRicercaSelect(tipologiaSelect, TIPI_TIPOLOGIA_SUPERFICIE);
  }
  
  // Carica le aperture se esiste il locale
  if (locale && locale.aperture) {
    aperturaCounter = locale.aperture.length;
    locale.aperture.forEach((apertura, index) => {
      aggiungiRigaAperturaLocale(apertura, index + 1);
    });
  } else {
    // Aggiungi una riga vuota iniziale
    aggiungiRigaAperturaLocale(null, 1);
  }
  
  // Setup event listeners
  setupFormLocaleListeners();
  
  // Calcola valori iniziali
  aggiornaSupUtileLocale();
  calcolaTotaleAreaFinestrataLocale();
  
  // Mostra modale usando Bootstrap
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  modal.show();
}

function setupFormLocaleListeners() {
  const form = document.getElementById('form-locale');
  if (!form) return;
  const annullaBtn = document.getElementById('btn-annulla-locale');
  if (annullaBtn) {
    annullaBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const conferma = await chiediConfermaChiusuraLocale();
      if (conferma) {
        const modalElement = document.getElementById('modal-locale');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement) || bootstrap.Modal.getOrCreateInstance(modalElement);
          
          // Ripristina la vista originale quando il modal viene chiuso
          const ripristinaVista = () => {
            if (window.statoApp && window.statoApp.vistaPrimaDelModal) {
              if (window.mostraVista) {
                window.mostraVista(window.statoApp.vistaPrimaDelModal);
              }
              window.statoApp.vistaPrimaDelModal = null;
            }
          };
          
          modalElement.addEventListener('hidden.bs.modal', ripristinaVista, { once: true });
          modal.hide();
        }
      }
    });
  }
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    salvaLocale();
  });
  
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const target = e.target;
      if (target && target.tagName === 'INPUT' && target.type === 'text') {
        e.preventDefault();
        const inputs = Array.from(form.querySelectorAll('input[type="text"], select'));
        const index = inputs.indexOf(target);
        if (index >= 0 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      }
    }
  });
  
  // Event listener per rapporto richiesto
  const rapportoRichiestoSelect = document.getElementById('locale-rapporto-richiesto');
  if (rapportoRichiestoSelect) {
    rapportoRichiestoSelect.addEventListener('change', calcolaRapportoLocale);
  }

  const tipologiaInput = document.getElementById('locale-tipologia');
  if (tipologiaInput) {
    tipologiaInput.addEventListener('input', calcolaRapportoLocale);
    tipologiaInput.addEventListener('change', calcolaRapportoLocale);
    tipologiaInput.addEventListener('blur', () => {
       if (!tipologiaInput.value) {
        tipologiaInput.value = 'ABITAZIONE';
       }
     });
   }
}

function popolaTipologiaSelect(selectElement, valoreSelezionato) {
  if (!selectElement) return;
  selectElement.innerHTML = TIPI_TIPOLOGIA_SUPERFICIE
    .map((tipo) => `<option value="${tipo}">${tipo}</option>`)
    .join('');

  const valoreValido = valoreSelezionato && TIPI_TIPOLOGIA_SUPERFICIE.includes(valoreSelezionato)
    ? valoreSelezionato
    : 'ABITAZIONE';
  selectElement.value = valoreValido;
}

function setupRicercaSelect(selectElement, valori) {
  if (!selectElement) return;
  let buffer = '';
  let resetTimer = null;

  const resetBuffer = () => {
    buffer = '';
    resetTimer = null;
  };

  selectElement.addEventListener('keydown', (event) => {
    const { key } = event;
    const isCharacterKey = key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

    if (isCharacterKey) {
      buffer += key.toLowerCase();
      const match = valori.find((valore) => valore.toLowerCase().includes(buffer));
      if (match) {
        selectElement.value = match;
        selectElement.dispatchEvent(new Event('change'));
      }
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(resetBuffer, 600);
      event.preventDefault();
    } else if (key === 'Backspace') {
      buffer = buffer.slice(0, -1);
      if (buffer.length === 0 && resetTimer) {
        clearTimeout(resetTimer);
        resetTimer = null;
      }
      event.preventDefault();
    }
  });

  selectElement.addEventListener('blur', () => {
    resetBuffer();
    if (!selectElement.value) {
      selectElement.value = 'ABITAZIONE';
      selectElement.dispatchEvent(new Event('change'));
    }
  });
}

function aggiungiRigaAperturaLocale(apertura, numero) {
  const tbody = document.getElementById('locale-aperture-tbody');
  if (!tbody) return;
  
  const rowId = `apertura-row-${aperturaCounter}`;
  const row = document.createElement('tr');
  row.id = rowId;
  row.setAttribute('data-apertura-id', numero);
  
  const hdavanzaleDataset = apertura && apertura.hdavanzale !== undefined && apertura.hdavanzale !== null && apertura.hdavanzale !== ''
    ? { auto: 'false', manual: 'true' }
    : { auto: 'true', manual: 'false' };

  row.innerHTML = `
    <td><input type="text" class="idapertura-cell" value="${numero}" readonly style="text-align: center;"></td>
    <td><input type="text" class="yellow-cell larghezza" value="${apertura ? apertura.larghezza || '' : ''}" data-row="${aperturaCounter}" oninput="calcolaAperturaLocale(${aperturaCounter})"></td>
    <td><input type="text" class="yellow-cell altezza" value="${apertura ? apertura.altezza || '' : ''}" data-row="${aperturaCounter}" oninput="calcolaAperturaLocale(${aperturaCounter})"></td>
    <td><input type="text" class="yellow-cell hdavanzale" value="${apertura ? apertura.hdavanzale || '' : ''}" data-row="${aperturaCounter}" data-auto="${hdavanzaleDataset.auto}" data-manual-edited="${hdavanzaleDataset.manual}" oninput="calcolaAperturaLocale(${aperturaCounter}, true)"></td>
    <td><input type="text" class="yellow-cell imposta" value="${apertura ? apertura.imposta || '0,20' : '0,20'}" data-row="${aperturaCounter}" oninput="calcolaAperturaLocale(${aperturaCounter})"></td>
    <td><input type="text" class="yellow-cell sporgenza" value="${apertura ? apertura.sporgenza || '' : ''}" data-row="${aperturaCounter}" oninput="calcolaAperturaLocale(${aperturaCounter})"></td>
    <td><input type="text" class="yellow-cell htot" value="0,00" readonly data-row="${aperturaCounter}" style="text-align: center;"></td>
    <td><input type="text" class="yellow-cell l2" value="0,000" readonly data-row="${aperturaCounter}" style="text-align: center;"></td>
    <td><input type="text" class="yellow-cell terzo" value="0,000" readonly data-row="${aperturaCounter}" style="text-align: center;"></td>
    <td><input type="text" class="yellow-cell intero" value="0,00" readonly data-row="${aperturaCounter}" style="text-align: center;"></td>
    <td><input type="text" class="red-cell area-finestrata" value="0,00" readonly data-row="${aperturaCounter}" style="text-align: center; font-weight: bold;"></td>
    <td class="text-center">
      <button type="button" class="btn btn-icon-blue btn-circle btn-circle-sm me-1" title="Duplica" onclick="duplicaAperturaDiretta(${aperturaCounter})">D</button>
      <button type="button" class="btn btn-icon-dark btn-circle btn-circle-sm" title="Elimina" onclick="eliminaAperturaDiretta(${aperturaCounter})">X</button>
    </td>
  `;
  
  tbody.appendChild(row);
  
  // Calcola i valori se ci sono dati
  if (apertura) {
    calcolaAperturaLocale(aperturaCounter);
  }
}

window.aggiungiAperturaLocale = function() {
  aperturaCounter++;
  const tbody = document.getElementById('locale-aperture-tbody');
  const numero = tbody.querySelectorAll('tr').length + 1;
  aggiungiRigaAperturaLocale(null, numero);
  setTimeout(() => {
    const nuovoCampo = document.querySelector('#locale-aperture-tbody tr:last-child .larghezza');
    if (nuovoCampo) nuovoCampo.focus();
  }, 30);
};

window.calcolaAperturaLocale = function(rowId, userInputHdavanzale = false) {
  const row = document.getElementById(`apertura-row-${rowId}`);
  if (!row) return;
  
  const larghezza = parseItalianNumber(row.querySelector('.larghezza').value) || 0;
  const altezzaInput = row.querySelector('.altezza');
  const hdavanzaleInput = row.querySelector('.hdavanzale');
  const sporgenzaInput = row.querySelector('.sporgenza');

  if (userInputHdavanzale && hdavanzaleInput) {
    hdavanzaleInput.dataset.auto = 'false';
  }

  if (hdavanzaleInput && !hdavanzaleInput.dataset.listenerAttached) {
    hdavanzaleInput.addEventListener('input', () => {
      hdavanzaleInput.dataset.auto = 'false';
      hdavanzaleInput.dataset.manualEdited = 'true';
    });
    hdavanzaleInput.dataset.listenerAttached = 'true';
  }

  if (altezzaInput && !altezzaInput.dataset.listenerAttached) {
    altezzaInput.addEventListener('input', () => {
      const hdInput = row.querySelector('.hdavanzale');
      if (hdInput && hdInput.dataset.manualEdited !== 'true') {
        hdInput.dataset.auto = 'true';
      }
    });
    altezzaInput.addEventListener('blur', () => {
      applicaAutomatismoHdavanzale(rowId, row);
    });
    altezzaInput.dataset.listenerAttached = 'true';
  }

  if (altezzaInput && !altezzaInput.dataset.enterListener) {
    altezzaInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const next = row.querySelector('.hdavanzale');
        if (next) next.focus();
      }
    });
    altezzaInput.dataset.enterListener = 'true';
  }

  if (hdavanzaleInput && !hdavanzaleInput.dataset.enterListener) {
    hdavanzaleInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const next = row.querySelector('.imposta');
        if (next) next.focus();
      }
    });
    hdavanzaleInput.dataset.enterListener = 'true';
  }

  if (sporgenzaInput && !sporgenzaInput.dataset.enterListener) {
    sporgenzaInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const nextImposta = row.querySelector('.imposta');
        if (nextImposta) {
          nextImposta.focus();
          return;
        }
        const rows = Array.from(document.querySelectorAll('#locale-aperture-tbody tr'));
        const currentIndex = rows.findIndex((tr) => tr.id === row.id);
        const nextRow = rows[currentIndex + 1];
        if (nextRow) {
          const nextField = nextRow.querySelector('.larghezza');
          if (nextField) nextField.focus();
        }
      }
    });
    sporgenzaInput.dataset.enterListener = 'true';
  }

  const altezza = parseItalianNumber(altezzaInput.value) || 0;
  let hdavanzale = parseItalianNumber(hdavanzaleInput.value) || 0;
  const imposta = parseItalianNumber(row.querySelector('.imposta').value) || 0.20;
  const sporgenza = parseItalianNumber(row.querySelector('.sporgenza').value) || 0;

  if (altezzaInput.dataset.auto !== 'false') {
    if (altezza === 1.5) {
      hdavanzale = 1.0;
      hdavanzaleInput.value = formatItalianNumber(1.0);
    } else if (altezza === 2.5) {
      hdavanzale = 0.0;
      hdavanzaleInput.value = formatItalianNumber(0.0);
    }
  }

  const calcoli = calcolaApertura({
    larghezza: larghezza,
    altezza: altezza,
    hdavanzale: hdavanzale,
    imposta: imposta,
    sporgenza: sporgenza
  });
  
  row.querySelector('.htot').value = formatItalianNumber(calcoli.htot);
  row.querySelector('.l2').value = formatItalianNumber(calcoli.l2, 3);
  row.querySelector('.terzo').value = formatItalianNumber(calcoli.unterzo, 3);
  row.querySelector('.intero').value = formatItalianNumber(calcoli.intero);
  row.querySelector('.area-finestrata').value = formatItalianNumber(calcoli.areaFinestrata);
  
  calcolaTotaleAreaFinestrataLocale();
};

window.selezionaAperturaLocale = function(rowId) {
  aperturaSelezionata = rowId;
};

window.eliminaAperturaSelezionataLocale = async function() {
  if (!aperturaSelezionata) {
    alert('Seleziona prima un\'apertura cliccando sui pulsanti azione');
    return;
  }
  await eseguiEliminazioneApertura(aperturaSelezionata);
};

window.duplicaAperturaSelezionataLocale = function() {
  if (!aperturaSelezionata) {
    alert('Seleziona prima un\'apertura cliccando sui pulsanti azione');
    return;
  }
  duplicaAperturaDaRow(aperturaSelezionata);
};

window.duplicaAperturaDiretta = function(rowId) {
  selezionaAperturaLocale(rowId);
  duplicaAperturaDaRow(rowId);
};

window.eliminaAperturaDiretta = async function(rowId) {
  selezionaAperturaLocale(rowId);
  await eseguiEliminazioneApertura(rowId);
};

async function eseguiEliminazioneApertura(rowId) {
  const row = document.getElementById(`apertura-row-${rowId}`);
  if (!row) return;
  const conferma = await chiediConfermaEliminazione();
  if (!conferma) {
    return;
  }
  removeAperturaByRow(row);
  aperturaSelezionata = null;
}

function removeAperturaByRow(row) {
  if (!row) return;
  const prevRow = row.previousElementSibling;
  row.remove();
  const rows = Array.from(document.querySelectorAll('#locale-aperture-tbody tr'));
  rows.forEach((tr, index) => {
    const idCell = tr.querySelector('.idapertura-cell');
    if (idCell) idCell.value = index + 1;
    tr.setAttribute('data-apertura-id', index + 1);
  });
  if (prevRow) {
    const hd = prevRow.querySelector('.hdavanzale');
    if (hd && hd.dataset.manualEdited !== 'true') {
      hd.dataset.auto = 'true';
    }
  }
  calcolaTotaleAreaFinestrataLocale();
}

function duplicaAperturaDaRow(rowId) {
  const rowOriginale = document.getElementById(`apertura-row-${rowId}`);
  if (!rowOriginale) return;
  const larghezza = rowOriginale.querySelector('.larghezza').value;
  const altezza = rowOriginale.querySelector('.altezza').value;
  const hdavanzale = rowOriginale.querySelector('.hdavanzale').value;
  const imposta = rowOriginale.querySelector('.imposta').value;
  const sporgenza = rowOriginale.querySelector('.sporgenza').value;

  aperturaCounter++;
  const tbody = document.getElementById('locale-aperture-tbody');
  const numero = tbody.querySelectorAll('tr').length + 1;

  aggiungiRigaAperturaLocale({
    larghezza: larghezza,
    altezza: altezza,
    hdavanzale: hdavanzale,
    imposta: imposta,
    sporgenza: sporgenza
  }, numero);

  selezionaAperturaLocale(aperturaCounter);
}

function rinumeraApertureLocale() {
  const rows = document.querySelectorAll('#locale-aperture-tbody tr');
  rows.forEach((row, index) => {
    const idaperturaCell = row.querySelector('.idapertura-cell');
    if (idaperturaCell) {
      idaperturaCell.value = index + 1;
      row.setAttribute('data-apertura-id', index + 1);
    }
  });
}

window.aggiornaSupUtileLocale = function() {
  const specifica = document.getElementById('locale-specifica');
  if (!specifica) return;
  
  const superficie = calcolaSuperficieUtile(specifica.value);
  const supUtileDisplay = document.getElementById('locale-sup-utile');
  const superficieDisplay = document.getElementById('locale-superficie-display');
  
  if (supUtileDisplay) {
    supUtileDisplay.textContent = formatItalianNumber(superficie);
  }
  if (superficieDisplay) {
    superficieDisplay.textContent = formatItalianNumber(superficie);
  }
  
  calcolaRapportoLocale();
};

function calcolaTotaleAreaFinestrataLocale() {
  const aree = document.querySelectorAll('#locale-aperture-tbody .area-finestrata');
  let totale = 0;
  aree.forEach(area => {
    totale += parseItalianNumber(area.value);
  });
  
  const display = document.getElementById('locale-area-finestrata-totale');
  if (display) {
    display.textContent = formatItalianNumber(totale);
  }
  
  calcolaRapportoLocale();
}

function calcolaRapportoLocale() {
  const superficieDisplay = document.getElementById('locale-superficie-display');
  const areaFinestrataDisplay = document.getElementById('locale-area-finestrata-totale');
  const rapportoRichiestoInput = document.getElementById('locale-rapporto-richiesto');
  const rapportoDisplay = document.getElementById('locale-rapporto');
  const verificaDisplay = document.getElementById('locale-verifica-rapporto');
  
  if (!superficieDisplay || !areaFinestrataDisplay || !rapportoDisplay) return;
  
  const superficie = parseItalianNumber(superficieDisplay.textContent);
  const areaFinestrata = parseItalianNumber(areaFinestrataDisplay.textContent);
  const rapportoRichiestoRaw = rapportoRichiestoInput ? rapportoRichiestoInput.value : '8,00';
  const isSpecialRichiesta = rapportoRichiestoRaw === 'NON RICHIESTO' || rapportoRichiestoRaw === 'AERAZIONE FORZATA';
  const rapportoRichiesto = isSpecialRichiesta ? 0 : parseItalianNumber(rapportoRichiestoRaw);
  
  const rapporto = calcolaRapporto(superficie, areaFinestrata);
  rapportoDisplay.textContent = formatItalianNumber(rapporto);
  
  if (isSpecialRichiesta) {
    rapportoDisplay.className = 'badge bg-info';
    if (verificaDisplay) {
      verificaDisplay.textContent = rapportoRichiestoRaw;
      verificaDisplay.className = 'fw-bold text-primary';
    }
    return;
  }
  
  // Verifica rapporto
  const verificato = verificaRapporto(rapporto, rapportoRichiesto);
  if (verificato) {
    rapportoDisplay.className = 'badge bg-success';
    if (verificaDisplay) verificaDisplay.textContent = '';
  } else {
    rapportoDisplay.className = 'badge bg-danger';
    if (verificaDisplay) {
      verificaDisplay.textContent = 'NON VERIFICATO';
      verificaDisplay.className = 'fw-bold text-danger';
    }
  }
}

function salvaLocale() {
  const dataModel = getDataModel();
  if (!dataModel) {
    alert('Errore interno: modello dati non inizializzato');
    console.error('DataModel non disponibile in salvaLocale');
    return;
  }

  const edificioId = document.getElementById('locale-edificio-id').value;
  const pianoId = document.getElementById('locale-piano-id').value;
  const localeId = document.getElementById('locale-id').value;
  
  const nome = document.getElementById('locale-nome').value;
  const tipologia = document.getElementById('locale-tipologia').value;
  const rapportoRichiesto = document.getElementById('locale-rapporto-richiesto').value;
  const specifica = document.getElementById('locale-specifica').value;
  const superficieUtile = parseItalianNumber(document.getElementById('locale-sup-utile').textContent);
  
  // Raccogli tutte le aperture
  const aperture = [];
  document.querySelectorAll('#locale-aperture-tbody tr').forEach(row => {
    const larghezza = row.querySelector('.larghezza').value;
    const altezza = row.querySelector('.altezza').value;
    const hdavanzale = row.querySelector('.hdavanzale').value;
    const imposta = row.querySelector('.imposta').value;
    const sporgenza = row.querySelector('.sporgenza').value;
    
    if (larghezza || altezza) {
      aperture.push({
        larghezza: larghezza,
        altezza: altezza,
        hdavanzale: hdavanzale,
        imposta: imposta,
        sporgenza: sporgenza
      });
    }
  });
  
  const datiLocale = {
    nome: nome,
    tipologiaSuperficie: tipologia,
    rapportoRichiesto: rapportoRichiesto,
    specificaSuperficie: specifica,
    superficieUtile: superficieUtile,
    aperture: aperture
  };
  
  if (localeId) {
    dataModel.modificaLocale(edificioId, pianoId, localeId, datiLocale);
  } else {
    dataModel.aggiungiLocale(edificioId, pianoId, datiLocale);
  }
  
  // Chiudi modale usando Bootstrap
  const modalElement = document.getElementById('modal-locale');
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  
  // Aggiorna le viste quando la modale è completamente chiusa
  if (modal) {
    const aggiornaVisteDopoChiusura = () => {
      if (window.aggiornaListaLocali) window.aggiornaListaLocali();
      if (window.aggiornaVistaLocali) window.aggiornaVistaLocali();
      if (window.aggiornaVistaEdifici) window.aggiornaVistaEdifici();
      
      // Ripristina la vista originale se era stata salvata
      if (window.statoApp && window.statoApp.vistaPrimaDelModal) {
        if (window.mostraVista) {
          window.mostraVista(window.statoApp.vistaPrimaDelModal);
        }
        window.statoApp.vistaPrimaDelModal = null;
      }
      
      // Rimozione di sicurezza del backdrop
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    };
    
    modalElement.addEventListener('hidden.bs.modal', aggiornaVisteDopoChiusura, { once: true });
    modal.hide();
  } else {
    // Fallback: aggiorna immediatamente se la modale non esiste
    if (window.aggiornaListaLocali) window.aggiornaListaLocali();
    if (window.aggiornaVistaLocali) window.aggiornaVistaLocali();
    if (window.aggiornaVistaEdifici) window.aggiornaVistaEdifici();
    
    // Ripristina la vista originale se era stata salvata
    if (window.statoApp && window.statoApp.vistaPrimaDelModal) {
      if (window.mostraVista) {
        window.mostraVista(window.statoApp.vistaPrimaDelModal);
      }
      window.statoApp.vistaPrimaDelModal = null;
    }
    
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
  }
}

// Esponi la funzione per essere chiamata da app.js
window.caricaFormLocale = caricaFormLocale;

window.impostaHdavanzaleManual = function(rowId) {
  const row = document.getElementById(`apertura-row-${rowId}`);
  if (!row) return;
  const hdavanzaleInput = row.querySelector('.hdavanzale');
  if (hdavanzaleInput) {
    hdavanzaleInput.dataset.manual = 'true';
  }
};

async function chiediConfermaEliminazione() {
  try {
    if (window.__TAURI__?.dialog?.confirm) {
      return await window.__TAURI__.dialog.confirm('Vuoi eliminare questa apertura?', { title: 'Conferma' });
    }
  } catch (error) {
    console.error('Errore durante la conferma eliminazione', error);
  }
  return window.confirm('Vuoi eliminare questa apertura?');
}

async function chiediConfermaChiusuraLocale() {
  try {
    if (window.__TAURI__?.dialog?.confirm) {
      return await window.__TAURI__.dialog.confirm('Vuoi chiudere senza salvare?', { title: 'Conferma' });
    }
  } catch (error) {
    console.error('Errore durante la conferma chiusura', error);
  }
  return window.confirm('Vuoi chiudere senza salvare?');
}

function applicaAutomatismoHdavanzale(rowId, rowElement) {
  const row = rowElement || document.getElementById(`apertura-row-${rowId}`);
  if (!row) return;
  const altezzaInput = row.querySelector('.altezza');
  const hdavanzaleInput = row.querySelector('.hdavanzale');
  const sporgenzaInput = row.querySelector('.sporgenza');
  if (!altezzaInput || !hdavanzaleInput) return;

  hdavanzaleInput.dataset.manualEdited = 'false';
  hdavanzaleInput.dataset.auto = 'true';

  const altezza = parseItalianNumber(altezzaInput.value) || 0;
  if (altezza === 1.5) {
    hdavanzaleInput.value = formatItalianNumber(1.0);
    hdavanzaleInput.dataset.manualEdited = 'false';
    hdavanzaleInput.dataset.auto = 'true';
    if (sporgenzaInput) sporgenzaInput.focus();
    calcolaAperturaLocale(rowId);
  } else if (altezza === 2.5) {
    hdavanzaleInput.value = formatItalianNumber(0.0);
    hdavanzaleInput.dataset.manualEdited = 'false';
    hdavanzaleInput.dataset.auto = 'true';
    if (sporgenzaInput) sporgenzaInput.focus();
    calcolaAperturaLocale(rowId);
  }
}

