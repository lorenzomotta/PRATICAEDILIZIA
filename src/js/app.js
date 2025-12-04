// Applicazione principale Pratica Edilizia
import { DataModel } from './models.js';
import { 
  parseItalianNumber, 
  formatItalianNumber, 
  calcolaSuperficieUtile,
  calcolaApertura,
  calcolaTotaleAreaFinestrata,
  calcolaRapporto,
  verificaRapporto
} from './calcoli.js';
import { caricaFormLocale, registerLocaleFormDataModel } from './locale-form.js';

let tauriDialog = null;
let tauriFs = null;
let tauriWindow = null;
let tauriUpdater = null;

async function waitForTauri(tries = 20, delay = 50) {
  for (let i = 0; i < tries; i++) {
    if (window.__TAURI__?.dialog && window.__TAURI__?.fs) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return !!window.__TAURI__;
}

async function ensureTauriApis() {
  if (tauriDialog && tauriFs) return;

  const available = await waitForTauri();
  if (!available) {
    tauriDialog = window.__TAURI__?.dialog || null;
    tauriFs = window.__TAURI__?.fs || null;
    tauriWindow = window.__TAURI__?.window?.appWindow || null;
    tauriUpdater = window.__TAURI__?.updater || null;
    return;
  }

  tauriDialog = window.__TAURI__.dialog;
  tauriFs = window.__TAURI__.fs;
  tauriWindow = window.__TAURI__?.window?.appWindow || tauriWindow;
  tauriUpdater = window.__TAURI__?.updater || null;
}

// Inizializza il modello dati (istanza globale condivisa)
const dataModel = new DataModel();
window.dataModel = dataModel; // Esponi per essere usato da altri moduli
registerLocaleFormDataModel(dataModel);

// Percorsi per salvataggio automatico
const AUTO_SAVE_DIR = 'PraticaEdilizia';
const AUTO_SAVE_FILE = `${AUTO_SAVE_DIR}/data.json`;
let isLoadingFromFile = false;
let autoSaveTimeout = null;
let toastInfo = null;
let toastSuccess = null;
let toastError = null;
let toastInfoBody = null;
let toastSuccessBody = null;
let toastErrorBody = null;
let modalDuplicaEdificioElement = null;
let modalDuplicaEdificioInstance = null;
let formDuplicaEdificio = null;
let inputDuplicaEdificio = null;
let duplicaModalResolver = null;
let duplicaModalSubmittedValue = null;

function initToasts() {
  const toastInfoElement = document.getElementById('toast-info');
  const toastSuccessElement = document.getElementById('toast-success');
  const toastErrorElement = document.getElementById('toast-error');

  if (toastInfoElement) {
    toastInfo = bootstrap.Toast.getOrCreateInstance(toastInfoElement);
    toastInfoBody = document.getElementById('toast-info-body');
  }
  if (toastSuccessElement) {
    toastSuccess = bootstrap.Toast.getOrCreateInstance(toastSuccessElement);
    toastSuccessBody = document.getElementById('toast-success-body');
  }
  if (toastErrorElement) {
    toastError = bootstrap.Toast.getOrCreateInstance(toastErrorElement);
    toastErrorBody = document.getElementById('toast-error-body');
  }
}

// Stato dell'applicazione
let statoApp = {
  vistaCorrente: 'edifici',
  edificioSelezionato: null,
  pianoSelezionato: null,
  localeSelezionato: null,
  collapsedEdifici: {},
  vistaPrimaDelModal: null
};
let edificioDaEvidenziare = null;

// Esponi le funzioni globali immediatamente (prima del DOMContentLoaded)
// per essere disponibili quando vengono chiamate da HTML generato dinamicamente
window.apriModalLocale = function(edificioId, pianoId, localeId) {
  // Questa sarà sovrascritta dalla definizione completa più avanti
  // Per ora, mostra un messaggio e aspetta che il DOM sia caricato
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.apriModalLocale && typeof window.apriModalLocale === 'function') {
        window.apriModalLocale(edificioId, pianoId, localeId);
      }
    });
  } else {
    console.warn('apriModalLocale chiamata prima del caricamento completo');
  }
};

window.chiudiModal = function(modalId) {
  // Questa sarà sovrascritta dalla definizione completa più avanti
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.chiudiModal && typeof window.chiudiModal === 'function') {
        window.chiudiModal(modalId);
      }
    });
  } else {
    console.warn('chiudiModal chiamata prima del caricamento completo');
  }
};

function initModalCleanup() {
  document.querySelectorAll('.modal').forEach((modalElement) => {
    modalElement.addEventListener('hidden.bs.modal', () => {
      document.body.classList.remove('modal-open');
      document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
      if (toastInfo) {
        toastInfo.hide();
      }
    });
  });
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', async () => {
  initToasts();
  initModalCleanup();
  setupModalDuplicaEdificio();
  await initializePersistence();
  inizializzaApp();
});

function showInfoToast(message) {
  if (!toastInfo) return;
  toastInfoBody.textContent = message;
  toastInfo.show();
}

function showSuccessToast(message) {
  if (!toastSuccess) return;
  toastSuccessBody.textContent = message;
  toastSuccess.show();
}

function showErrorToast(message) {
  if (!toastError) return;
  toastErrorBody.textContent = message;
  toastError.show();
}

async function initializePersistence() {
  try {
    // Setup salvataggio automatico (non richiede Tauri per localStorage)
    const originalSaveToStorage = dataModel.saveToStorage.bind(dataModel);
    dataModel.saveToStorage = function () {
      originalSaveToStorage();
      scheduleAutoSave();
    };

    // Verifica bozze (prima controlla localStorage velocemente, poi file se necessario)
    const ripristinato = await offerRestorePreviousSession();
    if (!ripristinato) {
      dataModel.resetData();
      // AutoSave verrà fatto in background quando Tauri sarà disponibile
      ensureTauriApis().then(() => autoSaveDataModel()).catch(() => {
        // Fallback a localStorage se Tauri non disponibile
        console.warn('Tauri non disponibile, utilizzo localStorage');
      });
    }

    setupPersistenceButtons();
    scheduleAutoSave();
    
    // Inizializza Tauri in background (non blocca l'avvio)
    ensureTauriApis().catch(() => {
      console.warn('Tauri APIs non disponibili, utilizzo localStorage come fallback');
    });
  } catch (error) {
    console.error('Errore durante l\'inizializzazione della persistenza', error);
  }
}

function scheduleAutoSave() {
  if (isLoadingFromFile) return;
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  autoSaveTimeout = setTimeout(() => {
    autoSaveDataModel().catch((error) => {
      console.error('Errore durante il salvataggio automatico', error);
      showErrorToast('Errore durante il salvataggio automatico.');
    });
  }, 400);
}

async function autoSaveDataModel(showFeedback = false) {
  try {
    if (showFeedback) showInfoToast('Salvataggio in corso...');
    await ensureTauriApis();
    const { createDir, writeTextFile, BaseDirectory } = tauriFs || {};
    const dataToSave = {
      edifici: dataModel.edifici || [],
      costoCostruzione: dataModel.costoCostruzione || {
        costoMq: '0,00',
        oneriPrimari: '0,00',
        oneriSecondari: '0,00',
        smaltimentoRifiuti: '0,00',
        volume: '0,00',
        inc3: '0',
        percentualeContributo: null
      }
    };
    const contents = JSON.stringify(dataToSave, null, 2);

    if (createDir && writeTextFile && BaseDirectory) {
      await createDir(AUTO_SAVE_DIR, { dir: BaseDirectory.AppData, recursive: true });
      await writeTextFile({ path: AUTO_SAVE_FILE, contents, dir: BaseDirectory.AppData });
      if (showFeedback) showSuccessToast('Salvataggio completato.');
    } else {
      localStorage.setItem('pratica_edilizia_backup', contents);
      if (showFeedback) showSuccessToast('Salvataggio locale completato.');
    }
  } catch (error) {
    console.error('Errore durante il salvataggio automatico su file', error);
    if (showFeedback) showErrorToast('Errore durante il salvataggio.');
  }
}

async function offerRestorePreviousSession() {
  try {
    // Prima controlla localStorage (veloce, non richiede Tauri)
    const localBackup = getLocalBackupData();
    let backupData = localBackup && localBackup.length > 0 ? localBackup : null;

    // Solo se non trova nulla in localStorage, controlla i file (lento, richiede Tauri)
    if (!backupData) {
      const autosaveData = await loadDataFromFile();
      backupData = Array.isArray(autosaveData) && autosaveData.length > 0 ? autosaveData : null;
    }

    if (!backupData || backupData.length === 0) {
      const currentData = dataModel.getAllEdifici();
      if (currentData && currentData.length > 0) {
        backupData = JSON.parse(JSON.stringify(currentData));
      }
    }

    if (!backupData || backupData.length === 0) {
      return false;
    }

    const conferma = await showConfirm('Ho trovato un salvataggio automatico precedente. Vuoi ripristinarlo?');
    if (!conferma) {
      return false;
    }

    isLoadingFromFile = true;
    dataModel.edifici = backupData;
    dataModel.saveToStorage();
    await autoSaveDataModel();
    // Aggiorna UI esplicitamente
    aggiornaVistaEdifici();
    if (typeof aggiornaVistaReport === 'function') aggiornaVistaReport();
    if (window.aggiornaListaLocali) window.aggiornaListaLocali();
    
    // Aggiorna i riepiloghi superfici se sono la vista corrente
    if (statoApp.vistaCorrente === 'riepilogo-superfici') {
      generaRiepilogoSuperfici();
    }
    if (statoApp.vistaCorrente === 'riepilogo-superfici-non-residenziali') {
      generaRiepilogoSuperficiNonResidenziali();
    }
    
    return true;
  } catch (error) {
    console.error('Errore durante il ripristino del salvataggio precedente', error);
    return false;
  } finally {
    isLoadingFromFile = false;
  }
}

function getLocalBackupData() {
  try {
    const backup = localStorage.getItem('pratica_edilizia_backup') || localStorage.getItem('praticaEdilizia');
    if (!backup) return null;
    const parsed = JSON.parse(backup);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn('Backup locale non valido', error);
    return null;
  }
}

async function loadDataFromFile() {
  try {
    await ensureTauriApis();
    const { exists, readTextFile, BaseDirectory } = tauriFs || {};
    if (!exists || !readTextFile || !BaseDirectory) return null;

    const fileExists = await exists(AUTO_SAVE_FILE, { dir: BaseDirectory.AppData });
    if (!fileExists) {
      return null;
    }
    const contents = await readTextFile({ path: AUTO_SAVE_FILE, dir: BaseDirectory.AppData });
    if (!contents) return null;
    const parsed = JSON.parse(contents);
    // Accetta sia array puro sia oggetto { edifici: [...] }
    if (Array.isArray(parsed)) {
    return parsed;
    }
    if (parsed && Array.isArray(parsed.edifici)) {
      return parsed.edifici;
    }
    console.warn('Il file di salvataggio automatico non contiene un formato valido');
    return null;
  } catch (error) {
    console.error('Errore durante il caricamento dei dati dal file', error);
    return null;
  }
}

function setupPersistenceButtons() {
  const exportBtn = document.getElementById('btn-export-json');
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportJson);
  }
  const exportExcelBtn = document.getElementById('btn-export-excel');
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', handleExportExcel);
  }
  const importBtn = document.getElementById('btn-import-json');
  const fileInput = document.getElementById('input-import-json');
  if (importBtn) {
    importBtn.addEventListener('click', () => handleImportJson(fileInput));
  }
  if (fileInput) {
    fileInput.addEventListener('change', (event) => handleFileInputImport(event, fileInput));
  }
}

async function handleExportJson() {
  showInfoToast('Esportazione in corso...');
  try {
    await ensureTauriApis();
    if (tauriDialog && typeof tauriDialog.save === 'function' && tauriFs && typeof tauriFs.writeTextFile === 'function') {
      const filePath = await tauriDialog.save({
        defaultPath: 'pratica-edilizia.json',
        filters: [{ name: 'File JSON', extensions: ['json'] }]
      });
      if (!filePath) {
        toastInfo?.hide();
        return;
      }
      const dataToExport = {
        edifici: dataModel.edifici || [],
        costoCostruzione: dataModel.costoCostruzione || {
          costoMq: '0,00',
          oneriPrimari: '0,00',
          oneriSecondari: '0,00',
          smaltimentoRifiuti: '0,00',
          volume: '0,00',
          inc3: '0',
          percentualeContributo: null
        }
      };
      const contents = JSON.stringify(dataToExport, null, 2);
      await tauriFs.writeTextFile(filePath, contents);
      showSuccessToast('Esportazione completata.');
      return;
    }
  } catch (error) {
    console.error('Errore durante l\'esportazione dei dati', error);
    showErrorToast('Errore durante l\'esportazione.');
    return;
  }

  fallbackExportJson();
  showSuccessToast('Esportazione completata.');
}

function fallbackExportJson() {
  try {
    const dataToExport = {
      edifici: dataModel.edifici || [],
      costoCostruzione: dataModel.costoCostruzione || {
        costoMq: '0,00',
        oneriPrimari: '0,00',
        oneriSecondari: '0,00',
        smaltimentoRifiuti: '0,00',
        volume: '0,00',
        inc3: '0',
        percentualeContributo: null
      }
    };
    const contents = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    link.download = `pratica-edilizia-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Errore durante la creazione del file di esportazione', error);
    showErrorToast('Errore durante l\'esportazione.');
  }
}

async function handleImportJson(fileInput) {
  showInfoToast('Importazione in corso...');
  try {
    await ensureTauriApis();
    if (tauriDialog && typeof tauriDialog.open === 'function' && tauriFs && typeof tauriFs.readTextFile === 'function') {
      const selection = await tauriDialog.open({
        multiple: false,
        filters: [{ name: 'File JSON', extensions: ['json'] }]
      });
      const filePath = Array.isArray(selection) ? selection[0] : selection;
      if (!filePath) {
        toastInfo?.hide();
        return;
      }

      const conferma = await showConfirm('Questa operazione sostituirà tutti i dati attuali. Vuoi continuare?');
      if (!conferma) {
        toastInfo?.hide();
        return;
      }

      const contents = await tauriFs.readTextFile(filePath);
      await applyImportedData(contents);
      showSuccessToast('Importazione completata.');
      return;
    }
  } catch (error) {
    console.error('Errore durante l\'importazione del file JSON', error);
    showErrorToast('Errore durante l\'importazione.');
    return;
  }

  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  } else {
    showErrorToast('Funzionalità di importazione non disponibile.');
  }
}

async function handleFileInputImport(event, fileInput) {
  const file = event?.target?.files?.[0];
  if (!file) {
    toastInfo?.hide();
    return;
  }

  try {
    showInfoToast('Importazione in corso...');
    const contents = await file.text();
    const conferma = await showConfirm('Questa operazione sostituirà tutti i dati attuali. Vuoi continuare?');
    if (!conferma) {
      toastInfo?.hide();
      return;
    }
    await applyImportedData(contents);
    showSuccessToast('Importazione completata.');
  } catch (error) {
    console.error('Errore durante l\'importazione del file JSON (input)', error);
    showErrorToast('Errore durante l\'importazione.');
  } finally {
    if (fileInput) fileInput.value = '';
  }
}

async function applyImportedData(contents) {
  let parsed = null;
  try {
    parsed = JSON.parse(contents);
  } catch (e) {
    showErrorToast('Il file selezionato non contiene JSON valido.');
    return;
  }
  // Supporta sia array che oggetto con proprietà edifici
  let edificiImportati = null;
  let costoCostruzioneImportato = null;
  
  if (Array.isArray(parsed)) {
    edificiImportati = parsed;
  } else if (parsed && Array.isArray(parsed.edifici)) {
    edificiImportati = parsed.edifici;
    costoCostruzioneImportato = parsed.costoCostruzione;
  }
  if (!Array.isArray(edificiImportati)) {
    showErrorToast('Il file selezionato non contiene dati edifici validi.');
    return;
  }

  isLoadingFromFile = true;
  dataModel.edifici = edificiImportati;
  // Se ci sono dati di costoCostruzione importati, sovrascrivi sempre
  if (costoCostruzioneImportato !== null && costoCostruzioneImportato !== undefined) {
    dataModel.costoCostruzione = costoCostruzioneImportato;
  }
  dataModel.saveToStorage();
  scheduleAutoSave();
  isLoadingFromFile = false;

  // Resetta lo stato dell'applicazione dopo l'importazione
  // per evitare riferimenti a edifici/piani che non esistono più
  statoApp.edificioSelezionato = null;
  statoApp.pianoSelezionato = null;
  statoApp.localeSelezionato = null;

  aggiornaVistaEdifici();
  
  // Se ci sono edifici importati, seleziona automaticamente il primo
  // per visualizzare i locali nella vista "Gestione Locali"
  if (edificiImportati && edificiImportati.length > 0) {
    statoApp.edificioSelezionato = edificiImportati[0].id;
  }
  
  aggiornaVistaLocali();
  if (typeof aggiornaVistaReport === 'function') aggiornaVistaReport();
  
  // Aggiorna anche la vista "Costo di Costruzione" se è quella corrente
  // o se ci sono dati di costoCostruzione importati
  if (statoApp.vistaCorrente === 'costo-costruzione' || costoCostruzioneImportato) {
    generaCostoCostruzione();
  }
  
  // Aggiorna i riepiloghi superfici se sono la vista corrente
  if (statoApp.vistaCorrente === 'riepilogo-superfici') {
    generaRiepilogoSuperfici();
  }
  if (statoApp.vistaCorrente === 'riepilogo-superfici-non-residenziali') {
    generaRiepilogoSuperficiNonResidenziali();
  }
}

function inizializzaApp() {
  // Setup navigazione
  setupNavigazione();
  
  // Setup modali
  setupModali();
  
  // Setup form
  setupForm();
  
  // Setup event delegation per i bottoni dinamici
  setupEventDelegation();
  
  // Carica vista iniziale
  mostraVista('edifici');
  
  // Controlla aggiornamenti all'avvio (dopo un breve delay per non bloccare l'avvio)
  setTimeout(() => {
    controllaAggiornamenti();
  }, 3000);
}

// Funzione per controllare se ci sono aggiornamenti disponibili
async function controllaAggiornamenti() {
  try {
    await ensureTauriApis();
    
    if (!tauriUpdater) {
      console.log('Sistema di aggiornamenti non disponibile');
      return;
    }
    
    // Controlla se ci sono aggiornamenti disponibili
    const update = await tauriUpdater.checkUpdate();
    
    if (update.available) {
      // Mostra una notifica all'utente
      const conferma = await showConfirm(
        `È disponibile una nuova versione (${update.version})!\n\n` +
        `Versione attuale: ${update.currentVersion}\n` +
        `Nuova versione: ${update.version}\n\n` +
        `Vuoi aggiornare ora?`
      );
      
      if (conferma) {
        // Avvia il download e l'installazione dell'aggiornamento
        await update.downloadAndInstall();
        
        // Dopo l'installazione, riavvia l'applicazione
        showInfoToast('Aggiornamento completato. L\'applicazione verrà riavviata...');
        await tauriUpdater.restartApp();
      }
    } else {
      console.log('Nessun aggiornamento disponibile');
    }
  } catch (error) {
    console.error('Errore durante il controllo degli aggiornamenti:', error);
    // Non mostrare errori all'utente se il controllo fallisce
  }
}

async function showConfirm(message) {
  try {
    await ensureTauriApis();
    if (tauriDialog && typeof tauriDialog.confirm === 'function') {
      const result = await tauriDialog.confirm(message, { title: 'Conferma' });
      return !!result;
    }
  } catch (error) {
    console.error('Errore durante la conferma', error);
  }
  return window.confirm(message);
}

async function chiediNomeNuovoEdificio(nomeBase) {
  const suggerimento = generaNomeDuplicatoSuggerito(nomeBase);
  const nuovoNome = await mostraModalDuplicaEdificio(suggerimento);

  if (nuovoNome === null) {
    return null;
  }

  const nomePulito = nuovoNome.trim();
  if (!nomePulito) {
    showErrorToast('Nome edificio non valido. Duplica annullata.');
    return null;
  }

  if (nomeEsistente(nomePulito)) {
    const conferma = await showConfirm('Esiste già un edificio con questo nome. Vuoi usarlo comunque?');
    if (!conferma) {
      return null;
    }
  }

  return nomePulito;
}

function generaNomeDuplicatoSuggerito(nomeBase) {
  const base = `${nomeBase} copia`;
  let candidato = base;
  let indice = 2;
  while (nomeEsistente(candidato)) {
    candidato = `${base} ${indice}`;
    indice += 1;
  }
  return candidato;
}

function nomeEsistente(nome) {
  return dataModel.getAllEdifici().some(edificio => (edificio.nome || '').trim().toLowerCase() === nome.trim().toLowerCase());
}

function mostraModalDuplicaEdificio(valorePredefinito = '') {
  if (!modalDuplicaEdificioInstance || !inputDuplicaEdificio) {
    return Promise.resolve(window.prompt('Inserisci il nome del nuovo edificio duplicato:', valorePredefinito) ?? null);
  }

  return new Promise((resolve) => {
    duplicaModalResolver = resolve;
    duplicaModalSubmittedValue = null;
    if (inputDuplicaEdificio) {
      inputDuplicaEdificio.value = valorePredefinito || '';
      inputDuplicaEdificio.classList.remove('is-invalid');
    }
    modalDuplicaEdificioInstance.show();
  });
}

// Event delegation per gestire i click sui bottoni dinamici
function setupEventDelegation() {
  // Container per la vista edifici
  const containerEdifici = document.getElementById('lista-edifici');
  if (containerEdifici) {
    containerEdifici.addEventListener('click', async (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      
      // Gestione bottoni edifici
      if (target.classList.contains('btn-toggle-edificio')) {
        e.preventDefault();
        e.stopPropagation();
        const id = target.dataset.edificioId;
        statoApp.collapsedEdifici[id] = !statoApp.collapsedEdifici[id];
        aggiornaVistaEdifici();
        return;
      }
      if (target.classList.contains('btn-modifica-edificio')) {
        e.preventDefault();
        e.stopPropagation();
        const id = target.dataset.edificioId;
        apriModalEdificio(id);
        return;
      }
      
      if (target.classList.contains('btn-vai-locali')) {
        e.preventDefault();
        e.stopPropagation();
        const edificioId = target.dataset.edificioId;
        mostraVista('locali');
        if (edificioId) {
          statoApp.edificioSelezionato = edificioId;
          statoApp.pianoSelezionato = null;
          aggiornaVistaLocali();
        }
        return;
      }

      if (target.classList.contains('btn-duplica-edificio')) {
        e.preventDefault();
        e.stopPropagation();
        const edificioId = target.dataset.edificioId;
        const edificio = dataModel.getEdificio(edificioId);
        if (!edificio) {
          showErrorToast('Edificio non trovato.');
          return;
        }

        try {
          const nuovoNome = await chiediNomeNuovoEdificio(edificio.nome);
          if (!nuovoNome) return;

          const duplicato = dataModel.duplicaEdificio(edificioId, nuovoNome);
          if (!duplicato) {
            showErrorToast('Impossibile duplicare l\'edificio.');
            return;
          }

          showSuccessToast('Edificio duplicato con successo.');
          statoApp.edificioSelezionato = duplicato.id;
          edificioDaEvidenziare = duplicato.id;
          aggiornaVistaEdifici();
          if (statoApp.vistaCorrente === 'locali') {
            aggiornaVistaLocali();
          }
        } catch (error) {
          console.error('Errore durante la duplicazione dell\'edificio', error);
          showErrorToast('Errore durante la duplicazione.');
        }
        return;
      }
      
      if (target.classList.contains('btn-elimina-edificio')) {
        e.preventDefault();
        e.stopPropagation();
        const id = target.dataset.edificioId;
        const conferma = await showConfirm('Sei sicuro di voler eliminare questo edificio? Verranno eliminati anche tutti i piani e locali associati.');
        if (conferma) {
          dataModel.eliminaEdificio(id);
          aggiornaVistaEdifici();
        }
        return;
      }
      
      if (target.classList.contains('btn-aggiungi-piano')) {
        e.preventDefault();
        e.stopPropagation();
        const edificioId = target.dataset.edificioId;
        apriModalPiano(edificioId);
        return;
      }
      
      // Gestione bottoni piani
      if (target.classList.contains('btn-modifica-piano')) {
        e.preventDefault();
        e.stopPropagation();
        const edificioId = target.dataset.edificioId;
        const pianoId = target.dataset.pianoId;
        apriModalPiano(edificioId, pianoId);
        return;
      }
      
      if (target.classList.contains('btn-elimina-piano')) {
        e.preventDefault();
        e.stopPropagation();
        const edificioId = target.dataset.edificioId;
        const pianoId = target.dataset.pianoId;
        const conferma = await showConfirm('Sei sicuro di voler eliminare questo piano? Verranno eliminati anche tutti i locali associati.');
        if (conferma) {
          dataModel.eliminaPiano(edificioId, pianoId);
          aggiornaVistaEdifici();
        }
        return;
      }
      
      if (target.classList.contains('btn-aggiungi-locale')) {
        e.preventDefault();
        e.stopPropagation();
        const edificioId = target.dataset.edificioId;
        const pianoId = target.dataset.pianoId;
        apriModalLocale(edificioId, pianoId);
        return;
      }
      
      // Gestione bottoni locali nella vista edifici
      if (target.classList.contains('btn-modifica-locale-edifici')) {
        e.preventDefault();
        e.stopPropagation();
        const edificioId = target.dataset.edificioId;
        const pianoId = target.dataset.pianoId;
        const localeId = target.dataset.localeId;
        apriModalLocale(edificioId, pianoId, localeId);
        return;
      }
      
      if (target.classList.contains('btn-elimina-locale-edifici')) {
        e.preventDefault();
        e.stopPropagation();
        const edificioId = target.dataset.edificioId;
        const pianoId = target.dataset.pianoId;
        const localeId = target.dataset.localeId;
        const locale = dataModel.getLocale(edificioId, pianoId, localeId);
        const nomeLocale = locale ? locale.nome || 'questo locale' : 'questo locale';
        const conferma = await showConfirm(`Sei sicuro di voler eliminare il locale "${nomeLocale}"?`);
        if (conferma) {
          dataModel.eliminaLocale(edificioId, pianoId, localeId);
          aggiornaVistaEdifici();
        }
        return;
      }
    });
  }
  
  // Container per la vista locali
  const containerLocali = document.getElementById('lista-locali');
  if (containerLocali) {
    containerLocali.addEventListener('click', async (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      
      if (target.classList.contains('btn-modifica-locale')) {
        e.preventDefault();
        e.stopPropagation();
        const edificioId = target.dataset.edificioId;
        const pianoId = target.dataset.pianoId;
        const localeId = target.dataset.localeId;
        apriModalLocale(edificioId, pianoId, localeId);
        return;
      }
      
      if (target.classList.contains('btn-duplica-locale')) {
        e.preventDefault();
        e.stopPropagation();
        const edificioId = target.dataset.edificioId;
        const pianoId = target.dataset.pianoId;
        const localeId = target.dataset.localeId;
        
        if (!edificioId || !pianoId || !localeId) {
          showErrorToast('Dati mancanti per duplicare il locale.');
          return;
        }

        try {
          const localeDuplicato = dataModel.duplicaLocale(edificioId, pianoId, localeId);
          if (!localeDuplicato) {
            showErrorToast('Impossibile duplicare il locale.');
            return;
          }
          
          showSuccessToast('Locale duplicato con successo.');
          aggiornaListaLocali();
          aggiornaVistaEdifici();
        } catch (error) {
          console.error('Errore durante la duplicazione del locale', error);
          showErrorToast('Errore durante la duplicazione.');
        }
        return;
      }

      if (target.classList.contains('btn-elimina-locale')) {
        e.preventDefault();
        e.stopPropagation();
        const edificioId = target.dataset.edificioId;
        const pianoId = target.dataset.pianoId;
        const localeId = target.dataset.localeId;
        const locale = dataModel.getLocale(edificioId, pianoId, localeId);
        const nomeLocale = locale ? locale.nome || 'questo locale' : 'questo locale';
        const conferma = await showConfirm(`Sei sicuro di voler eliminare il locale "${nomeLocale}"?`);
        if (conferma) {
          dataModel.eliminaLocale(edificioId, pianoId, localeId);
          aggiornaListaLocali();
          aggiornaVistaEdifici();
        }
        return;
      }
    });
  }

  const sidebarEdifici = document.getElementById('sidebar-edifici');
  if (sidebarEdifici) {
    sidebarEdifici.addEventListener('click', (e) => {
      const button = e.target.closest('.sidebar-edificio-item');
      if (!button) return;

      const edificioId = button.dataset.edificioId;
      if (!edificioId) return;

      statoApp.edificioSelezionato = edificioId;
      statoApp.pianoSelezionato = null;

      if (statoApp.vistaCorrente !== 'edifici') {
        mostraVista('edifici');
        return;
      }

      edificioDaEvidenziare = edificioId;
      aggiornaVistaEdifici();
    });
  }
}

// Gestione navigazione
function setupNavigazione() {
  const btnEdifici = document.getElementById('btn-edifici');
  const btnLocali = document.getElementById('btn-locali');
  const btnReport = document.getElementById('btn-report');
  const btnRiepilogoSuperfici = document.getElementById('btn-riepilogo-superfici');
  const btnNuovoEdificio = document.getElementById('btn-nuovo-edificio');
  const btnNuovoLocale = document.getElementById('btn-nuovo-locale');
  const btnGeneraReport = document.getElementById('btn-genera-report');
  const btnNuovoCalcolo = document.getElementById('btn-nuovo-calcolo');
  const btnChiudiApp = document.getElementById('btn-chiudi-app');
  const btnBackEdifici = document.getElementById('btn-back-edifici');

  if (btnEdifici) {
    btnEdifici.addEventListener('click', () => mostraVista('edifici'));
  }
  if (btnLocali) {
    btnLocali.addEventListener('click', () => mostraVista('locali'));
  }
  if (btnReport) {
    btnReport.addEventListener('click', () => mostraVista('report'));
  }
  if (btnRiepilogoSuperfici) {
    btnRiepilogoSuperfici.addEventListener('click', () => mostraVista('riepilogo-superfici'));
  }
  const btnRiepilogoSuperficiNonResidenziali = document.getElementById('btn-riepilogo-superfici-non-residenziali');
  if (btnRiepilogoSuperficiNonResidenziali) {
    btnRiepilogoSuperficiNonResidenziali.addEventListener('click', () => mostraVista('riepilogo-superfici-non-residenziali'));
  }
  const btnCostoCostruzione = document.getElementById('btn-costo-costruzione');
  if (btnCostoCostruzione) {
    btnCostoCostruzione.addEventListener('click', () => mostraVista('costo-costruzione'));
  }
  if (btnNuovoEdificio) {
    btnNuovoEdificio.addEventListener('click', () => apriModalEdificio());
  }
  if (btnNuovoLocale) {
    btnNuovoLocale.addEventListener('click', () => {
      if (!statoApp.edificioSelezionato || !statoApp.pianoSelezionato) {
        alert('Seleziona prima un edificio e un piano');
        return;
      }
      apriModalLocale(statoApp.edificioSelezionato, statoApp.pianoSelezionato);
    });
  }
  if (btnGeneraReport) {
    btnGeneraReport.addEventListener('click', () => generaReport());
  }
  if (btnNuovoCalcolo) {
    btnNuovoCalcolo.addEventListener('click', handleNuovoCalcolo);
  }
  if (btnChiudiApp) {
    btnChiudiApp.addEventListener('click', handleChiudiApp);
  }
  if (btnBackEdifici) {
    btnBackEdifici.addEventListener('click', () => {
      mostraVista('edifici');
    });
  }
}

function mostraVista(nomeVista) {
  // Nascondi tutte le viste
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.navbar .btn').forEach(b => {
    b.classList.remove('active');
    if (b.classList.contains('btn-light')) {
      b.classList.remove('btn-light');
      b.classList.add('btn-outline-light');
    }
  });
  
  // Mostra la vista selezionata
  document.getElementById(`view-${nomeVista}`).classList.add('active');
  const btn = document.getElementById(`btn-${nomeVista}`);
  btn.classList.add('active');
  if (btn.classList.contains('btn-outline-light')) {
    btn.classList.remove('btn-outline-light');
    btn.classList.add('btn-light');
  }
  
  statoApp.vistaCorrente = nomeVista;
  
  // mostra/nasconde pulsante fisso stampa
  const fixedBtn = document.getElementById('btn-report-print-fixed');
  if (fixedBtn) fixedBtn.style.display = (nomeVista === 'report') ? 'inline-block' : 'none';
  
  // Aggiorna il contenuto della vista
  switch(nomeVista) {
    case 'edifici':
      aggiornaVistaEdifici();
      break;
    case 'locali':
      // Aggiorna sempre la vista locali quando viene mostrata
      // per assicurarsi che i dropdown siano popolati correttamente
      aggiornaVistaLocali();
      break;
    case 'report':
      aggiornaVistaReport();
      // Genera automaticamente il report di tutti gli edifici
      // azzera l'eventuale selezione specifica
      const sel = document.getElementById('select-edificio-report');
      if (sel) sel.value = '';
      generaReport();
      break;
    case 'riepilogo-superfici':
      generaRiepilogoSuperfici();
      break;
    case 'riepilogo-superfici-non-residenziali':
      generaRiepilogoSuperficiNonResidenziali();
      break;
    case 'costo-costruzione':
      generaCostoCostruzione();
      break;
  }
}

function evidenziaEdificio(edificioId) {
  if (!edificioId) return;
  const card = document.querySelector(`[data-edificio-card="${edificioId}"]`);
  if (!card) return;

  card.classList.add('highlight-edificio');
  card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

  setTimeout(() => {
    card.classList.remove('highlight-edificio');
  }, 1600);
}

// Vista Edifici
function aggiornaVistaEdifici() {
  const container = document.getElementById('lista-edifici');
  const edifici = dataModel.getAllEdifici();
  
  // Collassa per default gli edifici che hanno locali, se non già impostati
  edifici.forEach((edificio) => {
    const numLocali = edificio.piani.reduce((tot, p) => tot + p.locali.length, 0);
    if (numLocali > 0 && typeof statoApp.collapsedEdifici[edificio.id] === 'undefined') {
      statoApp.collapsedEdifici[edificio.id] = true;
    }
  });
  
  if (edifici.length === 0) {
    container.innerHTML = '<div class="card-body text-center text-muted p-5">Nessun edificio presente. Clicca su "Nuovo Edificio" per iniziare.</div>';
    aggiornaSidebarEdifici(edifici);
    return;
  }
  
  const edificiHtml = edifici.map(edificio => {
    const numPiani = edificio.piani.length;
    const numLocali = edificio.piani.reduce((tot, piano) => tot + piano.locali.length, 0);
    const labelLocaliEdificio = numLocali === 1 ? 'locale' : 'locali';
    // Calcola il numero totale di aperture per tutti i locali dell'edificio
    const numAperture = edificio.piani.reduce((tot, piano) => {
      return tot + piano.locali.reduce((totLocale, locale) => {
        return totLocale + (locale.aperture ? locale.aperture.length : 0);
      }, 0);
    }, 0);
    const labelAperture = numAperture === 1 ? 'apertura' : 'aperture';
    const isCollapsed = !!statoApp.collapsedEdifici[edificio.id];
    
    const pianiHtml = edificio.piani.length > 0 
      ? edificio.piani.map(piano => {
          const numLocaliPiano = piano.locali.length;
          const labelLocaliPiano = numLocaliPiano === 1 ? 'locale' : 'locali';
          const localiHtml = piano.locali.length > 0
            ? piano.locali.map(locale => {
                const superficie = formatItalianNumber(locale.superficieUtile || 0);
                const numApertureLocale = locale.aperture ? locale.aperture.length : 0;
                const labelAperture = numApertureLocale === 1 ? 'apertura' : 'aperture';
                return `
                  <div class="locale-nested locale-row-clickable-edifici ms-4 mt-2 mb-2 p-2 border-start border-2 border-secondary" 
                       data-edificio-id="${edificio.id}" 
                       data-piano-id="${piano.id}" 
                       data-locale-id="${locale.id}"
                       title="Doppio click per modificare">
                    <div class="locale-header">
                      <div class="locale-actions">
                        <button class="btn btn-icon-orange btn-circle btn-circle-sm btn-modifica-locale-edifici" 
                                data-edificio-id="${edificio.id}" 
                                data-piano-id="${piano.id}" 
                                data-locale-id="${locale.id}"
                                aria-label="Modifica locale" title="Modifica locale">
                          M
                        </button>
                        <button class="btn btn-icon-dark btn-circle btn-circle-sm btn-elimina-locale-edifici" 
                                data-edificio-id="${edificio.id}" 
                                data-piano-id="${piano.id}" 
                                data-locale-id="${locale.id}"
                                aria-label="Elimina locale" title="Elimina locale">
                          X
                        </button>
                      </div>
                      <div>
                        <strong>${locale.nome || 'Locale senza nome'}</strong>
                        <span class="text-muted ms-2">
                          ${locale.tipologiaSuperficie || 'N/A'} | 
                          ${superficie} m² | 
                          ${numApertureLocale} ${labelAperture}
                        </span>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')
            : '<div class="ms-4 text-muted fst-italic">Nessun locale presente</div>';
          
          return `
            <div class="piano-nested">
              <div class="piano-header">
                <div class="piano-actions">
                  <button class="btn btn-icon-green btn-circle btn-circle-sm btn-aggiungi-locale" data-edificio-id="${edificio.id}" data-piano-id="${piano.id}" aria-label="Aggiungi locale" title="Aggiungi locale">+</button>
                  <button class="btn btn-icon-orange btn-circle btn-circle-sm btn-modifica-piano" data-edificio-id="${edificio.id}" data-piano-id="${piano.id}" aria-label="Modifica piano" title="Modifica piano">M</button>
                  <button class="btn btn-icon-dark btn-circle btn-circle-sm btn-elimina-piano" data-edificio-id="${edificio.id}" data-piano-id="${piano.id}" aria-label="Elimina piano" title="Elimina piano">X</button>
                </div>
                <div>
                  <strong>${piano.nome}</strong>
                  <span class="text-muted ms-2">${numLocaliPiano} ${labelLocaliPiano}</span>
                </div>
              </div>
              ${localiHtml}
            </div>
          `;
        }).join('')
      : '<div class="piano-nested text-muted fst-italic">Nessun piano presente</div>';
    const pianiHtmlContent = isCollapsed ? '' : pianiHtml;
    
    return `
      <div class="lista-item lista-edificio edificio-row-clickable" data-edificio-card="${edificio.id}" data-edificio-id="${edificio.id}" title="Doppio click per aprire la vista Locali">
        <div class="lista-item-header">
          <div class="edificio-actions">
            <button class="btn btn-outline-secondary btn-sm btn-toggle-edificio" data-edificio-id="${edificio.id}" title="${isCollapsed ? 'Apri' : 'Chiudi'} edificio">${isCollapsed ? '▸' : '▾'}</button>
            <button class="btn btn-icon-green btn-circle btn-circle-sm btn-aggiungi-piano" data-edificio-id="${edificio.id}" aria-label="Aggiungi piano" title="Aggiungi piano">+</button>
            <button class="btn btn-icon-blue btn-circle btn-circle-sm btn-duplica-edificio" data-edificio-id="${edificio.id}" aria-label="Duplica edificio" title="Duplica edificio">D</button>
            <button class="btn btn-icon-orange btn-circle btn-circle-sm btn-modifica-edificio" data-edificio-id="${edificio.id}" aria-label="Modifica edificio" title="Modifica edificio">M</button>
            <button class="btn btn-icon-dark btn-circle btn-circle-sm btn-elimina-edificio" data-edificio-id="${edificio.id}" aria-label="Elimina edificio" title="Elimina edificio">X</button>
          </div>
          <div class="edificio-info">
            <div class="lista-item-title mb-1">${edificio.nome}</div>
          <div class="lista-item-subtitle" style="font-size: 16px;">
            ${edificio.indirizzo || 'Nessun indirizzo'} | 
            ${numPiani} piano${numPiani !== 1 ? 'i' : ''} | 
              ${numLocali} ${labelLocaliEdificio} | 
              ${numAperture} ${labelAperture}
          </div>
        </div>
          <div>
            <button class="btn btn-icon-arrow btn-circle btn-circle-md btn-vai-locali" data-edificio-id="${edificio.id}" aria-label="Vai alla scheda Locali" title="Vai alla scheda Locali">➜</button>
        </div>
        </div>
        ${pianiHtmlContent}
      </div>
    `;
  }).join('');
  
  container.innerHTML = edificiHtml;
  
  // Aggiungi event listener per doppio click sugli edifici
  const edificioRows = container.querySelectorAll('.edificio-row-clickable');
  edificioRows.forEach((riga) => {
    riga.addEventListener('dblclick', (e) => {
      // Non aprire se il click è su un bottone
      if (e.target.closest('button')) {
        return;
      }
      const edificioId = riga.dataset.edificioId;
      if (edificioId) {
        mostraVista('locali');
        statoApp.edificioSelezionato = edificioId;
        statoApp.pianoSelezionato = null;
        aggiornaVistaLocali();
      }
    });
    
    // Aggiungi effetto hover
    riga.addEventListener('mouseenter', () => {
      riga.style.cursor = 'pointer';
      riga.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
    });
    riga.addEventListener('mouseleave', () => {
      riga.style.cursor = 'default';
      riga.style.backgroundColor = '';
    });
  });
  
  // Aggiungi event listener per doppio click sui locali nella vista edifici
  const localeRowsEdifici = container.querySelectorAll('.locale-row-clickable-edifici');
  localeRowsEdifici.forEach((riga) => {
    riga.addEventListener('dblclick', (e) => {
      // Non aprire se il click è su un bottone
      if (e.target.closest('button')) {
        return;
      }
      const edificioId = riga.dataset.edificioId;
      const pianoId = riga.dataset.pianoId;
      const localeId = riga.dataset.localeId;
      if (edificioId && pianoId && localeId) {
        apriModalLocale(edificioId, pianoId, localeId);
      }
    });
    
    // Aggiungi effetto hover
    riga.addEventListener('mouseenter', () => {
      riga.style.cursor = 'pointer';
      riga.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
    });
    riga.addEventListener('mouseleave', () => {
      riga.style.cursor = 'default';
      riga.style.backgroundColor = '';
    });
  });

  // Non serve più setupEventListenersEdifici() - usiamo event delegation

  if (edificioDaEvidenziare) {
    const targetId = edificioDaEvidenziare;
    edificioDaEvidenziare = null;
    requestAnimationFrame(() => evidenziaEdificio(targetId));
  }

  aggiornaSidebarEdifici(edifici);
}

// Vista Locali
function aggiornaVistaLocali() {
  const selectEdificio = document.getElementById('select-edificio-locali');
  if (!selectEdificio) return;

  const edifici = dataModel.getAllEdifici();
  const previousValue = statoApp.edificioSelezionato;

  selectEdificio.innerHTML = '<option value="">Seleziona Edificio</option>' +
    edifici.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');

  // Se c'è un valore precedente valido, mantienilo
  if (previousValue && edifici.some(e => e.id === previousValue)) {
    selectEdificio.value = previousValue;
  } else if (edifici.length > 0 && !previousValue) {
    // Se non c'è una selezione ma ci sono edifici, seleziona automaticamente il primo
    statoApp.edificioSelezionato = edifici[0].id;
    selectEdificio.value = edifici[0].id;
  } else {
    selectEdificio.value = '';
    statoApp.edificioSelezionato = null;
  }

  selectEdificio.onchange = (e) => {
    statoApp.edificioSelezionato = e.target.value || null;
    statoApp.pianoSelezionato = null;
    aggiornaSelectPiani();
    aggiornaListaLocali();
  };

  aggiornaSelectPiani();
  aggiornaListaLocali();
}

function aggiornaSelectPiani() {
  const selectPiano = document.getElementById('select-piano-locali');
  const nuovoPianoBtn = document.getElementById('btn-nuovo-piano-locali');
  if (!selectPiano) return;

  if (!statoApp.edificioSelezionato) {
    selectPiano.innerHTML = '<option value="">Tutti i piani</option>';
    selectPiano.value = '';
    selectPiano.disabled = true;
    if (nuovoPianoBtn) nuovoPianoBtn.disabled = true;
    return;
  }

  const piani = dataModel.getPianiByEdificio(statoApp.edificioSelezionato);
  const previousValue = statoApp.pianoSelezionato;

  selectPiano.disabled = false;
  selectPiano.innerHTML = '<option value="">Tutti i piani</option>' +
    piani.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');

  if (previousValue && piani.some(p => p.id === previousValue)) {
    selectPiano.value = previousValue;
  } else {
    selectPiano.value = '';
    statoApp.pianoSelezionato = null;
  }

  selectPiano.onchange = (e) => {
    statoApp.pianoSelezionato = e.target.value || null;
    aggiornaListaLocali();
  };

  if (nuovoPianoBtn) nuovoPianoBtn.disabled = false;
}

function aggiornaListaLocali() {
  const container = document.getElementById('lista-locali');
  
  if (!statoApp.edificioSelezionato) {
    container.innerHTML = '<div class="card-body text-center text-muted p-5">Seleziona un edificio per visualizzare i locali.</div>';
    return;
  }
  
  const edificio = dataModel.getEdificio(statoApp.edificioSelezionato);
  if (!edificio) {
    container.innerHTML = '<div class="card-body text-center text-muted p-5">Edificio non trovato.</div>';
    return;
  }

  const piani = Array.isArray(edificio.piani) ? edificio.piani : [];
  const pianiDaMostrare = statoApp.pianoSelezionato
    ? piani.filter((piano) => piano.id === statoApp.pianoSelezionato)
    : piani;

  const gruppiHtml = pianiDaMostrare.map((piano) => {
    const localiPiano = Array.isArray(piano.locali) ? piano.locali : [];
    if (localiPiano.length === 0) {
      return '';
    }

    const localeItems = localiPiano.map((locale) => {
    const superficie = formatItalianNumber(locale.superficieUtile || 0);
    const numAperture = locale.aperture ? locale.aperture.length : 0;
      const edificioId = locale.edificioId || edificio.id;
      const pianoId = locale.pianoId || piano.id;
      
      // Prepara l'esplicazione del calcolo della superficie (in parentesi graffe)
      const specificaSuperficie = locale.specificaSuperficie || '';
      const esplicazioneSuperficie = specificaSuperficie ? ` {${specificaSuperficie.replace(/\*/g, '×')}}` : '';
      
      // Prepara le informazioni sulle aperture (larghezza x altezza in parentesi rotonde)
      let infoAperture = '';
      if (locale.aperture && Array.isArray(locale.aperture) && locale.aperture.length > 0) {
        // Filtra le aperture che hanno almeno larghezza o altezza valorizzate
        const apertureValide = locale.aperture.filter(apertura => {
          if (!apertura) return false;
          // Gestisci sia stringhe che numeri
          const larghezzaStr = apertura.larghezza ? apertura.larghezza.toString().trim() : '';
          const altezzaStr = apertura.altezza ? apertura.altezza.toString().trim() : '';
          if (!larghezzaStr && !altezzaStr) return false;
          
          const larghezza = parseItalianNumber(larghezzaStr || '0') || 0;
          const altezza = parseItalianNumber(altezzaStr || '0') || 0;
          return larghezza > 0 || altezza > 0;
        });
        
        if (apertureValide.length > 0) {
          const apertureInfo = apertureValide.map(apertura => {
            // Leggi i valori come stringhe e convertili
            const larghezzaStr = apertura.larghezza ? apertura.larghezza.toString().trim() : '';
            const altezzaStr = apertura.altezza ? apertura.altezza.toString().trim() : '';
            const larghezzaVal = larghezzaStr ? parseItalianNumber(larghezzaStr) : 0;
            const altezzaVal = altezzaStr ? parseItalianNumber(altezzaStr) : 0;
            const larghezza = formatItalianNumber(larghezzaVal);
            const altezza = formatItalianNumber(altezzaVal);
            return `(${larghezza} × ${altezza})`;
          }).join(', ');
          infoAperture = ` | Aperture: ${apertureInfo}`;
        }
      }
    
    return `
        <div class="locali-item locale-row-clickable" data-edificio-id="${edificioId}" data-piano-id="${pianoId}" data-locale-id="${locale.id}" title="Doppio click per modificare">
          <div class="locali-item-info">
            <div class="locali-item-title">${locale.nome || 'Locale senza nome'}</div>
            <div class="locali-item-subtitle" style="font-size: 16px;">
            Tipologia: ${locale.tipologiaSuperficie || 'Non specificata'} | 
            Superficie: ${superficie} m²${esplicazioneSuperficie}${infoAperture}
          </div>
        </div>
          <div class="locali-item-actions">
            <button class="btn btn-icon-blue btn-circle btn-circle-sm btn-duplica-locale" data-edificio-id="${edificioId}" data-piano-id="${pianoId}" data-locale-id="${locale.id}" aria-label="Duplica locale" title="Duplica locale">D</button>
            <button class="btn btn-icon-orange btn-circle btn-circle-sm btn-modifica-locale" data-edificio-id="${edificioId}" data-piano-id="${pianoId}" data-locale-id="${locale.id}" aria-label="Modifica locale" title="Modifica locale">M</button>
            <button class="btn btn-icon-dark btn-circle btn-circle-sm btn-elimina-locale" data-edificio-id="${edificioId}" data-piano-id="${pianoId}" data-locale-id="${locale.id}" aria-label="Elimina locale" title="Elimina locale">X</button>
        </div>
      </div>
    `;
  }).join('');
  
    return `
      <div class="locali-piano-group">
        <div class="locali-piano-header">
          <span class="locali-piano-title">${piano.nome}</span>
          <span class="locali-piano-count">${localiPiano.length} locale${localiPiano.length !== 1 ? 'i' : ''}</span>
        </div>
        <div class="locali-piano-body">
          ${localeItems}
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  if (!gruppiHtml) {
    container.innerHTML = '<div class="card-body text-center text-muted p-5">Nessun locale presente.</div>';
    return;
  }

  container.innerHTML = `<div class="locali-piano-list">${gruppiHtml}</div>`;
  
  // Aggiungi event listener per doppio click sulle righe dei locali
  const localeRows = container.querySelectorAll('.locale-row-clickable');
  localeRows.forEach((riga) => {
    riga.addEventListener('dblclick', (e) => {
      // Non aprire se il click è su un bottone
      if (e.target.closest('button')) {
        return;
      }
      const edificioId = riga.dataset.edificioId;
      const pianoId = riga.dataset.pianoId;
      const localeId = riga.dataset.localeId;
      if (edificioId && pianoId && localeId) {
        apriModalLocale(edificioId, pianoId, localeId);
      }
    });
    
    // Aggiungi effetto hover
    riga.addEventListener('mouseenter', () => {
      riga.style.cursor = 'pointer';
      riga.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
    });
    riga.addEventListener('mouseleave', () => {
      riga.style.cursor = 'default';
      riga.style.backgroundColor = '';
    });
  });
}

// Vista Report
function aggiornaVistaReport() {
  const selectEdificio = document.getElementById('select-edificio-report');
  const edifici = dataModel.getAllEdifici();
  
  selectEdificio.innerHTML = '<option value="">Tutti gli edifici</option>' +
    edifici.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');

  ensureReportPrintUI();
}

function ensureReportPrintUI() {
  const container = document.getElementById('report-content');
  if (!container || !container.parentElement) return;
  ensureReportScreenStyles();
  // Pulsante fisso in alto a destra
  if (!document.getElementById('btn-report-print-fixed')) {
    const fixedBtn = document.createElement('button');
    fixedBtn.id = 'btn-report-print-fixed';
    fixedBtn.type = 'button';
    fixedBtn.textContent = 'STAMPA PDF';
    fixedBtn.className = 'btn btn-success btn-sm';
    fixedBtn.style.position = 'fixed';
    fixedBtn.style.top = '64px';
    fixedBtn.style.right = '16px';
    fixedBtn.style.zIndex = '1080';
    fixedBtn.style.display = 'none';
    fixedBtn.addEventListener('click', openPrintModalReport);
    document.body.appendChild(fixedBtn);
  }
}

function ensureReportScreenStyles() {
  if (document.getElementById('report-screen-style')) return;
  const style = document.createElement('style');
  style.id = 'report-screen-style';
  style.textContent = `
    /* Larghezze colonne per uniformare tutti i piani (schermo) */
    #report-content .report-table col.w-locale { width: 8%; }
    #report-content .report-table col.w-tipologia { width: 9%; }
    #report-content .report-table col.w-specifica { width: 30%; }
    #report-content .report-table col.w-suplocale { width: 6%; }
    #report-content .report-table col.w-l { width: 4%; }
    #report-content .report-table col.w-l2 { width: 5%; }
    #report-content .report-table col.w-imp { width: 4%; }
    #report-content .report-table col.w-dim { width: 9%; }
    #report-content .report-table col.w-formula { width: 13%; }
    #report-content .report-table col.w-supfin { width: 4%; }
    #report-content .report-table col.w-tot { width: 4%; }
    #report-content .report-table col.w-rapporto { width: 4%; }
    #report-content .report-table .cell-formula { white-space: nowrap; }
    #report-content thead .col-specifica { text-align: center; }
    #report-content tbody .col-specifica { text-align: left; }
    #report-content tr.row-danger > td { background-color: #fde2e1 !important; }
    /* Header fisso durante lo scroll */
    #report-content .table-responsive {
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }
    #report-content .report-table thead th {
      position: sticky;
      top: 0;
      z-index: 10;
      background-color: #0d6efd !important;
      color: #ffffff !important;
      box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.1);
    }
  `;
  document.head.appendChild(style);
}

function openPrintModalReport() {
  // Assicurati che il modal esista
  ensureReportPrintUI();
  if (!document.getElementById('modal-report-print')) {
    // come fallback estremo, ricrea il markup minimale del modal
    const fallback = `
    <div class="modal fade" id="modal-report-print" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Seleziona le unità da stampare</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="form-check mb-2">
              <input class="form-check-input" type="checkbox" id="chk-report-all" checked>
              <label class="form-check-label" for="chk-report-all">Tutte le unità</label>
            </div>
            <div id="report-edifici-checks" class="ps-2"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
            <button type="button" class="btn btn-primary" id="btn-confirm-print">Stampa</button>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', fallback);
  }
  // Popola lista edifici
  const container = document.getElementById('report-edifici-checks');
  if (!container) return; // sicurezza
  const edifici = dataModel.getAllEdifici();
  container.innerHTML = edifici.map(e => `
    <div class="form-check">
      <input class="form-check-input chk-report-edificio" type="checkbox" value="${e.id}" id="chk-ed-${e.id}" checked>
      <label class="form-check-label" for="chk-ed-${e.id}">${escapeHtml(e.nome)}</label>
    </div>
  `).join('');
  const chkAll = document.getElementById('chk-report-all');
  chkAll.checked = true;
  chkAll.onchange = () => {
    document.querySelectorAll('.chk-report-edificio').forEach((el) => { el.checked = chkAll.checked; });
  };
  document.querySelectorAll('.chk-report-edificio').forEach((el) => {
    el.onchange = () => {
      const allChecked = Array.from(document.querySelectorAll('.chk-report-edificio')).every(i => i.checked);
      chkAll.checked = allChecked;
    };
  });
  const modalEl = document.getElementById('modal-report-print');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const btnConfirm = document.getElementById('btn-confirm-print');
  btnConfirm.onclick = () => {
    const ids = Array.from(document.querySelectorAll('.chk-report-edificio'))
      .filter(i => i.checked)
      .map(i => i.value);
    modal.hide();
    printReportForIds(ids);
  };
  modal.show();
}

function injectPrintStyles() {
  let style = document.getElementById('report-print-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'report-print-style';
    style.textContent = `
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body * { visibility: hidden; }
        #report-content, #report-content * { visibility: visible; }
        #report-content { position: absolute; left: 0; top: 0; right: 0; }
        #report-content { font-size: 9pt; }
        #report-content table { width: 100%; border-collapse: collapse; }
        #report-content th, #report-content td { border: 1px solid #dee2e6; padding: 3px; font-size: 9pt; line-height: 1.1; text-align: center; vertical-align: middle; }
        #report-content .th-formula, #report-content .cell-formula { white-space: nowrap; letter-spacing: -0.1pt; }
        #report-content .th-formula, #report-content .cell-formula { width: 16%; }
        #report-content thead .col-specifica { text-align: center !important; }
        #report-content tbody .col-specifica { text-align: left; }
        #report-content .col-specifica { width: 32%; }
        /* Larghezze fisse per uniformare tutti i piani (in stampa) */
        #report-content .w-locale { width: 8%; }
        #report-content .w-tipologia { width: 9%; }
        #report-content .w-specifica { width: 30%; }
        #report-content .w-suplocale { width: 6%; }
        #report-content .w-l { width: 4%; }
        #report-content .w-l2 { width: 5%; }
        #report-content .w-imp { width: 4%; }
        #report-content .w-dim { width: 9%; }
        #report-content .w-formula { width: 13%; }
        #report-content .w-supfin { width: 4%; }
        #report-content .w-tot { width: 4%; }
        #report-content .w-rapporto { width: 4%; }
        #report-content tr.row-danger > td { background-color: #fde2e1 !important; }
        #report-content .col-unita, #report-content .col-piano { display: none !important; }
        #report-content .table-primary th { background: #cfe2ff !important; }
        #report-content .table-light td { background: #f8f9fa !important; }
        #report-content h3 { font-size: 11pt; margin: 6px 0; }
        #report-content h4 { font-size: 10pt; margin: 4px 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

function buildPrintHtml(inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Report</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 9pt; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #dee2e6; padding: 3px; font-size: 9pt; line-height: 1.1; text-align: center; vertical-align: middle; }
    .th-formula, .cell-formula { white-space: nowrap; letter-spacing: -0.1pt; }
    .th-formula, .cell-formula { width: 16%; }
    thead .col-specifica { text-align: center !important; }
    tbody .col-specifica { text-align: left; }
    .col-specifica { width: 32%; }
    /* Larghezze fisse per uniformare tutti i piani (in anteprima PDF) */
    .w-locale { width: 8%; }
    .w-tipologia { width: 9%; }
    .w-specifica { width: 30%; }
    .w-suplocale { width: 6%; }
    .w-l { width: 4%; }
    .w-l2 { width: 5%; }
    .w-imp { width: 4%; }
    .w-dim { width: 9%; }
    .w-formula { width: 13%; }
    .w-supfin { width: 4%; }
    .w-tot { width: 4%; }
    .w-rapporto { width: 4%; }
    .col-unita, .col-piano { display: none !important; }
    .table-primary th { background: #cfe2ff; }
    .table-light td { background: #f8f9fa; }
    h3 { font-size: 11pt; margin: 6px 0; }
    h4 { font-size: 10pt; margin: 4px 0; }
  </style></head><body>${inner}</body></html>`;
}

function printReportForIds(ids) {
  // Stampa diretta sulla pagina corrente, senza anteprima
  const selectedIds = Array.isArray(ids) && ids.length ? ids : null;
  generaReport(selectedIds);
  injectPrintStyles();
  setTimeout(() => window.print(), 50);
}

function aggiornaSidebarEdifici(edifici) {
  const sidebar = document.getElementById('sidebar-edifici');
  const countBadge = document.getElementById('sidebar-edifici-count');
  if (!sidebar) return;

  if (countBadge) {
    countBadge.textContent = edifici.length;
  }

  if (!edifici.length) {
    sidebar.innerHTML = '<div class="text-muted small text-center py-3">Nessun edificio presente</div>';
    return;
  }

  sidebar.innerHTML = edifici.map((edificio) => {
    const numPiani = edificio.piani?.length || 0;
    const numLocali = edificio.piani?.reduce((tot, piano) => tot + (piano.locali?.length || 0), 0) || 0;
    const numAperture = edificio.piani?.reduce((tot, piano) => tot + piano.locali?.reduce((sum, locale) => sum + (locale.aperture?.length || 0), 0), 0) || 0;
    const activeClass = edificio.id === statoApp.edificioSelezionato ? ' active' : '';
    return `
      <button type="button" class="list-group-item list-group-item-action sidebar-edificio-item${activeClass}" data-edificio-id="${edificio.id}">
        <span>${edificio.nome}</span>
        <span class="badge rounded-pill">${numLocali} locali - ${numAperture} aperture</span>
      </button>
    `;
  }).join('');
}

function generaReport(idsOverride = null) {
  const edificioId = document.getElementById('select-edificio-report')?.value;
  const container = document.getElementById('report-content');
  
  let edificiDaReportare = [];
  
  if (Array.isArray(idsOverride)) {
    edificiDaReportare = dataModel.getAllEdifici().filter(e => idsOverride.includes(e.id));
  } else if (edificioId) {
    const edificio = dataModel.getEdificio(edificioId);
    if (edificio) edificiDaReportare = [edificio];
  } else {
    edificiDaReportare = dataModel.getAllEdifici();
  }
  
  if (edificiDaReportare.length === 0) {
    container.innerHTML = '<div class="card-body text-center text-muted p-5">Nessun edificio presente.</div>';
    return;
  }
  
  let html = '<div class="card-body">';
  
  edificiDaReportare.forEach(edificio => {
    html += `<div class="mb-4">`;
    html += `<h3 class="text-primary border-bottom pb-2 mb-3">Edificio: ${escapeHtml(edificio.nome)}</h3>`;
    
    const piani = Array.isArray(edificio.piani) ? edificio.piani : [];
    if (piani.length === 0) {
      html += '<p class="text-muted">Nessun piano presente.</p>';
    } else {
      piani.forEach(piano => {
        html += `<h4 class="mt-4 mb-3" style="color: #0052a3;">Piano: ${escapeHtml(piano?.nome || '')}</h4>`;
        
          html += `<div class="table-responsive">`;
        html += `<table class="table table-hover report-table text-center">
          <colgroup>\n            <col class=\"w-unita col-unita\">\n            <col class=\"w-piano col-piano\">\n            <col class=\"w-locale\">\n            <col class=\"w-tipologia\">\n            <col class=\"w-specifica col-specifica\">\n            <col class=\"w-suplocale\">\n            <col class=\"w-l\">\n            <col class=\"w-l2\">\n            <col class=\"w-imp\">\n            <col class=\"w-dim\">\n            <col class=\"w-formula th-formula\">\n            <col class=\"w-supfin\">\n            <col class=\"w-tot\">\n            <col class=\"w-rapporto\">\n          </colgroup>\n          <thead class=\"table-primary\">\n            <tr>\n              <th class=\"col-unita\">UNITÀ</th>\n              <th class=\"col-piano\">PIANO</th>\n              <th>LOCALE</th>\n              <th>TIPOLOGIA</th>\n              <th class=\"col-specifica\">Specifica superficie</th>\n              <th>Sup. Locale (m²)</th>\n              <th>L</th>\n              <th>L/2</th>\n              <th>Imp.</th>\n              <th>Dimensioni apertura</th>\n              <th class=\"th-formula\">Calcolo superficie<br>finestrata utile</th>\n              <th>Sup. Fin. (m²)</th>\n              <th>Tot. (m²)</th>\n              <th>Rapporto (S<sub>u</sub>/A<sub>f</sub>)</th>\n            </tr>\n          </thead>\n          <tbody>`;

        const locali = Array.isArray(piano?.locali) ? piano.locali : [];
        if (locali.length === 0) {
          const rapportoTot = 0;
            html += `<tr>
              <td class="col-unita">${escapeHtml(edificio.nome)}</td>
              <td class="col-piano">${escapeHtml(piano?.nome || '')}</td>
              <td>-</td>
              <td>-</td>
              <td class="col-specifica"></td>
              <td>0,00</td>
              <td>0,00</td>
              <td>0,000</td>
              <td>0,20</td>
              <td>0,00 × 0,00</td>
              <td class="cell-formula">0,00×(0,00+(0,000:3))</td>
              <td>0,00</td>
              <td>0,00</td>
              <td>${formatItalianNumber(rapportoTot)}</td>
            </tr>`;
        } else {
          let gruppoIndex = 0;
          locali.forEach(locale => {
            const groupClass = (gruppoIndex % 2 === 0) ? '' : 'table-light';
            const superficie = parseItalianNumber(locale.superficieUtile || '0');
            const tipologia = locale.tipologiaSuperficie || '';
            const spec = (locale.specificaSuperficie || '').replace(/\*/g, '×');
            // garantisci che le aperture siano un array (supporta anche oggetti con indici)
            let aperture = [];
            if (Array.isArray(locale.aperture)) {
              aperture = locale.aperture;
            } else if (locale.aperture && typeof locale.aperture === 'object') {
              try { aperture = Object.values(locale.aperture); } catch(e) { aperture = []; }
            }

            // se non ci sono aperture, comunque stampa una riga vuota coerente
            if (aperture.length === 0) {
              const rapportoTot = 0;
              html += `<tr class="riepilogo-locale-row ${groupClass}" style="cursor: pointer;" data-edificio-id="${edificio.id}" data-piano-id="${piano.id}" data-locale-id="${locale.id}" title="Doppio click per aprire il locale">\n                <td class=\"align-middle col-unita\">${escapeHtml(edificio.nome)}</td>\n                <td class=\"align-middle col-piano\">${escapeHtml(piano?.nome || '')}</td>\n                <td class=\"align-middle\">${escapeHtml(locale.nome || '')}</td>\n                <td class=\"align-middle\">${escapeHtml(tipologia)}</td>\n                <td class=\"align-middle col-specifica\">${escapeHtml(spec)}</td>\n                <td class=\"align-middle\">${formatItalianNumber(superficie)}</td>
                 <td>0,00</td>
                 <td>0,000</td>
                 <td>0,20</td>
                 <td>0,00 × 0,00</td>
                 <td class="cell-formula">0,00×(0,00+(0,000:3))</td>
                 <td>0,00</td>
                 <td class=\"align-middle\">0,00</td>
                 <td class=\"align-middle\">${formatItalianNumber(rapportoTot)}</td>
               </tr>`;
              gruppoIndex++; return;
            }

            // calcola totali per il locale e il confronto richiesto
            const totaleArea = calcolaTotaleAreaFinestrata(aperture);
            const rapportoRichiesto = parseItalianNumber(locale.rapportoRichiesto || '8,00');
            const rapportoTot = calcolaRapporto(superficie, totaleArea);

            const rowspan = aperture.length;
            aperture.forEach((apertura, index) => {
              const calcoli = calcolaApertura(apertura);
              const L = parseItalianNumber(apertura.sporgenza || '0');
              const larghezza = parseItalianNumber(apertura.larghezza || '0');
              const H = parseItalianNumber(apertura.altezza || '0');
              const imp = parseItalianNumber(apertura.imposta || '0,20');

              const rowDanger = rapportoTot > rapportoRichiesto ? ' row-danger' : '';
              const rowClass = `riepilogo-locale-row ${groupClass}${rowDanger}`;
              const rowStyle = index === 0 ? 'cursor: pointer;' : '';
              const rowTitle = index === 0 ? 'title="Doppio click per aprire il locale"' : '';
              const rowDataAttrs = index === 0 ? `data-edificio-id="${edificio.id}" data-piano-id="${piano.id}" data-locale-id="${locale.id}"` : '';
              html += `<tr class=\"${rowClass}\" style=\"${rowStyle}\" ${rowTitle} ${rowDataAttrs}>`;

              if (index === 0) {
                // celle comuni al locale con rowspan
                html += `<td class=\"align-middle col-unita\" rowspan=\"${rowspan}\">${escapeHtml(edificio.nome)}</td>`;
                html += `<td class=\"align-middle col-piano\" rowspan=\"${rowspan}\">${escapeHtml(piano?.nome || '')}</td>`;
                html += `<td class=\"align-middle\" rowspan=\"${rowspan}\">${escapeHtml(locale.nome || '')}</td>`;
                html += `<td class=\"align-middle\" rowspan=\"${rowspan}\">${escapeHtml(tipologia)}</td>`;
                html += `<td class=\"align-middle col-specifica\" rowspan=\"${rowspan}\">${escapeHtml(spec)}</td>`;
                html += `<td class=\"align-middle\" rowspan=\"${rowspan}\">${formatItalianNumber(superficie)}</td>`;
              }

              // dettagli apertura
              html += `
                <td>${formatItalianNumber(L)}</td>
                <td>${formatItalianNumber(calcoli.l2, 3)}</td>
                <td>${formatItalianNumber(imp)}</td>
                <td>${formatItalianNumber(larghezza)} × ${formatItalianNumber(H)}</td>
                <td class="cell-formula">${formatItalianNumber(larghezza)}×(${formatItalianNumber(calcoli.intero)}+(${formatItalianNumber(calcoli.unterzo,3)}:3))</td>
                <td>${formatItalianNumber(calcoli.areaFinestrata)}</td>
              `;

              if (index === 0) {
                // Totale e Rapporto una sola volta per il gruppo
                html += `<td class=\"align-middle\" rowspan=\"${rowspan}\">${formatItalianNumber(totaleArea)}</td>`;
                const nonVerificato = rapportoTot > rapportoRichiesto;
                const rapportoCell = `${formatItalianNumber(rapportoTot)} &lt; ${formatItalianNumber(rapportoRichiesto)}`;
                html += `<td class=\"align-middle${nonVerificato ? ' text-danger fw-bold' : ''}\" rowspan=\"${rowspan}\">${rapportoCell}</td>`;
              }

              html += '</tr>';
            });
            gruppoIndex++;
          });
        }
          
          html += `</tbody></table></div>`;
      });
    }
    
    html += `</div>`;
  });
  
  html += '</div>';
  container.innerHTML = html;
  
  
  // Aggiungi event listener per il doppio click sulle righe dei locali
  const righeLocali = container.querySelectorAll('.riepilogo-locale-row');
  righeLocali.forEach(riga => {
    riga.addEventListener('dblclick', (e) => {
      const edificioId = riga.dataset.edificioId;
      const pianoId = riga.dataset.pianoId;
      const localeId = riga.dataset.localeId;
      
      if (edificioId && pianoId && localeId) {
        apriModalLocale(edificioId, pianoId, localeId);
      }
    });
    
    // Aggiungi stile hover per indicare che è cliccabile (solo per la prima riga del gruppo)
    if (riga.dataset.edificioId) {
      riga.addEventListener('mouseenter', () => {
        // Evidenzia tutte le righe del gruppo (stesso locale)
        const edificioId = riga.dataset.edificioId;
        const pianoId = riga.dataset.pianoId;
        const localeId = riga.dataset.localeId;
        const righeGruppo = container.querySelectorAll(`.riepilogo-locale-row[data-edificio-id="${edificioId}"][data-piano-id="${pianoId}"][data-locale-id="${localeId}"]`);
        righeGruppo.forEach(r => {
          r.style.backgroundColor = '#e7f3ff';
        });
      });
      riga.addEventListener('mouseleave', () => {
        // Rimuovi evidenziazione da tutte le righe del gruppo
        const edificioId = riga.dataset.edificioId;
        const pianoId = riga.dataset.pianoId;
        const localeId = riga.dataset.localeId;
        const righeGruppo = container.querySelectorAll(`.riepilogo-locale-row[data-edificio-id="${edificioId}"][data-piano-id="${pianoId}"][data-locale-id="${localeId}"]`);
        righeGruppo.forEach(r => {
          r.style.backgroundColor = '';
        });
      });
    }
  });
}

// Tipologie residenziali
const TIPOLOGIE_RESIDENZIALI = [
  'ABITAZIONE',
  'ACCESSORIO ABITAZIONE',
  'BOX SINGOLO',
  'BOX COLLETTIVO',
  'ANDRONE',
  'PORTICATO',
  'LOGGIA',
  'BALCONE'
];

// Tipologie non residenziali
const TIPOLOGIE_NON_RESIDENZIALI = [
  'COMMERCIALE',
  'DIREZIONALE',
  'TURISTICO',
  'ACCESSORIO TERZIARIO'
];

// Vista Riepilogo Superfici (Residenziali)
function generaRiepilogoSuperfici() {
  const container = document.getElementById('riepilogo-superfici-content');
  if (!container) return;

  const edifici = dataModel.getAllEdifici();
  
  // Raccogli tutti i locali con le loro informazioni, raggruppati per unità (edificio) e tipologia
  const localiPerUnitaETipologia = {};
  
  edifici.forEach(edificio => {
    if (!edificio.piani || !Array.isArray(edificio.piani)) return;
    const nomeEdificio = edificio.nome || 'Edificio senza nome';
    
    if (!localiPerUnitaETipologia[nomeEdificio]) {
      localiPerUnitaETipologia[nomeEdificio] = {};
    }
    
    edificio.piani.forEach(piano => {
      if (!piano.locali || !Array.isArray(piano.locali)) return;
      
      piano.locali.forEach(locale => {
        const tipologia = locale.tipologiaSuperficie || 'Non specificata';
        
        // Filtra solo le tipologie residenziali
        if (!TIPOLOGIE_RESIDENZIALI.includes(tipologia)) {
          return;
        }
        
        // Gestisci sia stringa che numero per superficieUtile
        let superficie = 0;
        if (typeof locale.superficieUtile === 'number') {
          superficie = locale.superficieUtile;
        } else if (typeof locale.superficieUtile === 'string') {
          superficie = parseItalianNumber(locale.superficieUtile || '0');
        }
        
        // Salta i locali con superficie zero o negativa
        if (superficie <= 0) {
          return;
        }
        
        if (!localiPerUnitaETipologia[nomeEdificio][tipologia]) {
          localiPerUnitaETipologia[nomeEdificio][tipologia] = {
            locali: [],
            somma: 0
          };
        }
        
        localiPerUnitaETipologia[nomeEdificio][tipologia].locali.push({
          nome: locale.nome || 'Locale senza nome',
          superficie: superficie,
          specificaSuperficie: locale.specificaSuperficie || '',
          edificioId: edificio.id,
          pianoId: piano.id,
          localeId: locale.id
        });
        
        localiPerUnitaETipologia[nomeEdificio][tipologia].somma += superficie;
      });
    });
  });
  
  // Se non ci sono locali, mostra messaggio
  if (Object.keys(localiPerUnitaETipologia).length === 0) {
    container.innerHTML = '<div class="card-body text-center text-muted p-5">Nessun locale presente.</div>';
    return;
  }

  // Genera HTML della tabella
  let html = `
    <style>
      #riepilogo-superfici-content table th, #riepilogo-superfici-content table td { 
        padding: 2px 4px !important; 
        line-height: 1.1 !important; 
      }
      #riepilogo-superfici-content table { 
        margin-bottom: 0 !important; 
      }
      #riepilogo-superfici-content .card-body { 
        padding: 8px !important; 
      }
      #riepilogo-superfici-content .mb-3 { 
        margin-bottom: 4px !important; 
      }
      #riepilogo-superfici-content .mt-4 { 
        margin-top: 8px !important; 
      }
    </style>
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0">RIEPILOGO SUPERFICI PER TIPOLOGIA RESIDENZIALE</h3>
        <div class="d-flex gap-2">
          <button id="btn-riepilogo-stampa-pdf" class="btn btn-success btn-sm">STAMPA PDF</button>
          <button id="btn-riepilogo-export-excel" class="btn btn-success btn-sm">ESPORTA EXCEL</button>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-bordered table-hover" style="margin-bottom: 0;">
          <thead class="table-primary">
            <tr>
              <th style="width: 10%;">UNITA</th>
              <th style="width: 20%;">TIPOLOGIA</th>
              <th style="width: 25%;">LOCALE</th>
              <th style="width: 25%;">SPECIFICA SUPERFICIE</th>
              <th style="width: 20%;">SUP.</th>
            </tr>
          </thead>
          <tbody>
  `;

  // Itera per ogni unità (edificio)
  Object.keys(localiPerUnitaETipologia).forEach(nomeEdificio => {
    const tipologieUnita = localiPerUnitaETipologia[nomeEdificio];
    
    // Separa ABITAZIONE, ACCESSORIO ABITAZIONE e altre tipologie
    const tipologieAbitazione = [];
    const altreTipologie = [];
    
    Object.keys(tipologieUnita).forEach(tipologia => {
      if (tipologia === 'ABITAZIONE' || tipologia === 'ACCESSORIO ABITAZIONE') {
        tipologieAbitazione.push(tipologia);
      } else {
        altreTipologie.push(tipologia);
      }
    });
    
    // Ordina ABITAZIONE prima di ACCESSORIO ABITAZIONE
    tipologieAbitazione.sort((a, b) => {
      if (a === 'ABITAZIONE') return -1;
      if (b === 'ABITAZIONE') return 1;
      return 0;
    });
    
    // Ordina le altre tipologie alfabeticamente
    altreTipologie.sort((a, b) => a.localeCompare(b));
    
    // Calcola il numero totale di righe per questa unità (solo per tipologie con superficie > 0)
    let totaleRighe = 0;
    tipologieAbitazione.forEach(tipologia => {
      const dati = tipologieUnita[tipologia];
      if (dati.locali.length > 0 && dati.somma > 0) {
        totaleRighe += dati.locali.length + 1; // +1 per la riga di somma
      }
    });
    altreTipologie.forEach(tipologia => {
      const dati = tipologieUnita[tipologia];
      if (dati.locali.length > 0 && dati.somma > 0) {
        totaleRighe += dati.locali.length + 1; // +1 per la riga di somma
      }
    });
    
    // Se non ci sono righe da mostrare, salta questa unità
    if (totaleRighe === 0) {
      return;
    }
    
    let primaRiga = true;
    
    // Prima mostra ABITAZIONE (se presente e con locali con superficie > 0)
    if (tipologieAbitazione.includes('ABITAZIONE')) {
      const dati = tipologieUnita['ABITAZIONE'];
      
      // Mostra solo se ci sono locali con superficie > 0
      if (dati.locali.length > 0 && dati.somma > 0) {
        dati.locali.forEach((locale, index) => {
          if (primaRiga) {
            html += `
              <tr class="riepilogo-locale-row" style="cursor: pointer;" data-edificio-id="${locale.edificioId}" data-piano-id="${locale.pianoId}" data-locale-id="${locale.localeId}" title="Doppio click per aprire il locale">
                <td rowspan="${totaleRighe}" class="align-middle">${escapeHtml(nomeEdificio)}</td>
                <td>ABITAZIONE</td>
                <td>${escapeHtml(locale.nome)}</td>
                <td>${escapeHtml(locale.specificaSuperficie)}</td>
                <td>${formatItalianNumber(locale.superficie)}</td>
              </tr>
            `;
            primaRiga = false;
          } else {
            html += `
              <tr class="riepilogo-locale-row" style="cursor: pointer;" data-edificio-id="${locale.edificioId}" data-piano-id="${locale.pianoId}" data-locale-id="${locale.localeId}" title="Doppio click per aprire il locale">
                <td>ABITAZIONE</td>
                <td>${escapeHtml(locale.nome)}</td>
                <td>${escapeHtml(locale.specificaSuperficie)}</td>
                <td>${formatItalianNumber(locale.superficie)}</td>
              </tr>
            `;
          }
        });
        
        // Riga di somma per ABITAZIONE
        html += `
          <tr class="table-secondary">
            <td><strong>SOMMA ABITAZIONE</strong></td>
            <td></td>
            <td></td>
            <td><strong>${formatItalianNumber(dati.somma)}</strong></td>
          </tr>
        `;
      }
    }
    
    // Poi mostra ACCESSORIO ABITAZIONE (se presente e con locali con superficie > 0)
    if (tipologieAbitazione.includes('ACCESSORIO ABITAZIONE')) {
      const dati = tipologieUnita['ACCESSORIO ABITAZIONE'];
      
      // Mostra solo se ci sono locali con superficie > 0
      if (dati.locali.length > 0 && dati.somma > 0) {
        // Se non c'è ABITAZIONE, la prima riga di ACCESSORIO ABITAZIONE deve avere il rowspan per UNITA'
        if (!tipologieAbitazione.includes('ABITAZIONE') || !tipologieUnita['ABITAZIONE'] || tipologieUnita['ABITAZIONE'].somma === 0) {
          // Calcola il numero di righe per ACCESSORIO ABITAZIONE (locali + riga somma)
          const righeAccessorio = dati.locali.length + 1;
          dati.locali.forEach((locale, index) => {
            if (index === 0) {
              html += `
                <tr class="riepilogo-locale-row" style="cursor: pointer;" data-edificio-id="${locale.edificioId}" data-piano-id="${locale.pianoId}" data-locale-id="${locale.localeId}" title="Doppio click per aprire il locale">
                  <td rowspan="${righeAccessorio}" class="align-middle">${escapeHtml(nomeEdificio)}</td>
                  <td>ACCESSORIO ABITAZIONE</td>
                  <td>${escapeHtml(locale.nome)}</td>
                  <td>${escapeHtml(locale.specificaSuperficie)}</td>
                  <td>${formatItalianNumber(locale.superficie)}</td>
                </tr>
              `;
            } else {
              html += `
                <tr class="riepilogo-locale-row" style="cursor: pointer;" data-edificio-id="${locale.edificioId}" data-piano-id="${locale.pianoId}" data-locale-id="${locale.localeId}" title="Doppio click per aprire il locale">
                  <td>ACCESSORIO ABITAZIONE</td>
                  <td>${escapeHtml(locale.nome)}</td>
                  <td>${escapeHtml(locale.specificaSuperficie)}</td>
                  <td>${formatItalianNumber(locale.superficie)}</td>
                </tr>
              `;
            }
          });
        } else {
          // Se c'è già ABITAZIONE, le righe di ACCESSORIO ABITAZIONE non hanno il rowspan
          dati.locali.forEach(locale => {
            html += `
              <tr class="riepilogo-locale-row" style="cursor: pointer;" data-edificio-id="${locale.edificioId}" data-piano-id="${locale.pianoId}" data-locale-id="${locale.localeId}" title="Doppio click per aprire il locale">
                <td>ACCESSORIO ABITAZIONE</td>
                <td>${escapeHtml(locale.nome)}</td>
                <td>${escapeHtml(locale.specificaSuperficie)}</td>
                <td>${formatItalianNumber(locale.superficie)}</td>
              </tr>
            `;
          });
        }
        
        // Riga di somma per ACCESSORIO ABITAZIONE
        html += `
          <tr class="table-secondary">
            <td><strong>SOMMA ACCESSORIO ABITAZIONE</strong></td>
            <td></td>
            <td></td>
            <td><strong>${formatItalianNumber(dati.somma)}</strong></td>
          </tr>
        `;
      }
    }
    
    // Poi mostra le altre tipologie (solo se hanno locali con superficie > 0)
    altreTipologie.forEach(tipologia => {
      const dati = tipologieUnita[tipologia];
      
      // Mostra solo se ci sono locali con superficie > 0
      if (dati.locali.length > 0 && dati.somma > 0) {
        dati.locali.forEach(locale => {
          html += `
            <tr class="riepilogo-locale-row" style="cursor: pointer;" data-edificio-id="${locale.edificioId}" data-piano-id="${locale.pianoId}" data-locale-id="${locale.localeId}" title="Doppio click per aprire il locale">
              <td>${escapeHtml(tipologia)}</td>
              <td>${escapeHtml(locale.nome)}</td>
              <td>${escapeHtml(locale.specificaSuperficie)}</td>
              <td>${formatItalianNumber(locale.superficie)}</td>
            </tr>
          `;
        });
        
        // Riga di somma per questa tipologia
        html += `
          <tr class="table-secondary">
            <td><strong>SOMMA ${escapeHtml(tipologia.toUpperCase())}</strong></td>
            <td></td>
            <td></td>
            <td><strong>${formatItalianNumber(dati.somma)}</strong></td>
          </tr>
        `;
      }
    });
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Genera la seconda tabella: RIEPILOGO PER CLASSI DI SUPERFICIE RESIDENZIALE
  html += `
    <div class="card-body mt-4">
      <h3 class="mb-3">RIEPILOGO PER CLASSI DI SUPERFICIE RESIDENZIALE</h3>
      <div class="table-responsive">
        <table class="table table-bordered table-hover" style="margin-bottom: 0;">
          <thead class="table-primary">
            <tr>
              <th style="width: 8%;">UNITA</th>
              <th style="width: 7%;">&lt; 95</th>
              <th style="width: 8%;">&gt; 95 &lt; 110</th>
              <th style="width: 8%;">&gt; 110 &lt; 130</th>
              <th style="width: 8%;">&gt; 130 &lt; 160</th>
              <th style="width: 7%;">&gt; 160</th>
              <th style="width: 8%;">Accessori</th>
              <th style="width: 8%;">Androni</th>
              <th style="width: 8%;">Porticati</th>
              <th style="width: 7%;">Logge</th>
              <th style="width: 8%;">Balconi</th>
              <th style="width: 7%;">Box Sing.</th>
              <th style="width: 8%;">Box Col.</th>
            </tr>
          </thead>
          <tbody>
  `;

  // Raccogli i dati per la seconda tabella
  const datiClassiSuperficie = {};
  const totaliColonne = {
    '<95': 0,
    '95-110': 0,
    '110-130': 0,
    '130-160': 0,
    '>160': 0,
    'Accessori': 0,
    'Androni': 0,
    'Porticati': 0,
    'Logge': 0,
    'Balconi': 0,
    'Box Sing.': 0,
    'Box Col.': 0
  };
  const conteggiColonne = {
    '<95': 0,
    '95-110': 0,
    '110-130': 0,
    '130-160': 0,
    '>160': 0,
    'Accessori': 0,
    'Androni': 0,
    'Porticati': 0,
    'Logge': 0,
    'Balconi': 0,
    'Box Sing.': 0,
    'Box Col.': 0
  };

  Object.keys(localiPerUnitaETipologia).forEach(nomeEdificio => {
    const tipologieUnita = localiPerUnitaETipologia[nomeEdificio];
    
    // Calcola la superficie totale di SOLO ABITAZIONE (senza ACCESSORIO ABITAZIONE)
    let superficieAbitazione = 0;
    
    if (tipologieUnita['ABITAZIONE']) {
      superficieAbitazione = tipologieUnita['ABITAZIONE'].somma;
    }
    
    // Classifica in base alla classe di superficie (SOLO ABITAZIONE, non ACCESSORIO)
    let classeSuperficie = '';
    if (superficieAbitazione > 0 && superficieAbitazione < 95) {
      classeSuperficie = '<95';
      totaliColonne['<95'] += superficieAbitazione;
      conteggiColonne['<95']++;
    } else if (superficieAbitazione >= 95 && superficieAbitazione < 110) {
      classeSuperficie = '95-110';
      totaliColonne['95-110'] += superficieAbitazione;
      conteggiColonne['95-110']++;
    } else if (superficieAbitazione >= 110 && superficieAbitazione < 130) {
      classeSuperficie = '110-130';
      totaliColonne['110-130'] += superficieAbitazione;
      conteggiColonne['110-130']++;
    } else if (superficieAbitazione >= 130 && superficieAbitazione < 160) {
      classeSuperficie = '130-160';
      totaliColonne['130-160'] += superficieAbitazione;
      conteggiColonne['130-160']++;
    } else if (superficieAbitazione >= 160) {
      classeSuperficie = '>160';
      totaliColonne['>160'] += superficieAbitazione;
      conteggiColonne['>160']++;
    }
    
    // Raccogli i totali per le altre tipologie
    const totaliTipologie = {
      'Accessori': tipologieUnita['ACCESSORIO ABITAZIONE'] ? tipologieUnita['ACCESSORIO ABITAZIONE'].somma : 0,
      'Androni': tipologieUnita['ANDRONE'] ? tipologieUnita['ANDRONE'].somma : 0,
      'Porticati': tipologieUnita['PORTICATO'] ? tipologieUnita['PORTICATO'].somma : 0,
      'Logge': tipologieUnita['LOGGIA'] ? tipologieUnita['LOGGIA'].somma : 0,
      'Balconi': tipologieUnita['BALCONE'] ? tipologieUnita['BALCONE'].somma : 0,
      'Box Sing.': tipologieUnita['BOX SINGOLO'] ? tipologieUnita['BOX SINGOLO'].somma : 0,
      'Box Col.': tipologieUnita['BOX COLLETTIVO'] ? tipologieUnita['BOX COLLETTIVO'].somma : 0
    };
    
    // Aggiorna i totali delle colonne
    totaliColonne['Accessori'] += totaliTipologie['Accessori'];
    totaliColonne['Androni'] += totaliTipologie['Androni'];
    totaliColonne['Porticati'] += totaliTipologie['Porticati'];
    totaliColonne['Logge'] += totaliTipologie['Logge'];
    totaliColonne['Balconi'] += totaliTipologie['Balconi'];
    totaliColonne['Box Sing.'] += totaliTipologie['Box Sing.'];
    totaliColonne['Box Col.'] += totaliTipologie['Box Col.'];
    
    // Aggiorna i conteggi delle colonne (conta le unità con valore > 0)
    if (totaliTipologie['Accessori'] > 0) conteggiColonne['Accessori']++;
    if (totaliTipologie['Androni'] > 0) conteggiColonne['Androni']++;
    if (totaliTipologie['Porticati'] > 0) conteggiColonne['Porticati']++;
    if (totaliTipologie['Logge'] > 0) conteggiColonne['Logge']++;
    if (totaliTipologie['Balconi'] > 0) conteggiColonne['Balconi']++;
    if (totaliTipologie['Box Sing.'] > 0) conteggiColonne['Box Sing.']++;
    if (totaliTipologie['Box Col.'] > 0) conteggiColonne['Box Col.']++;
    
    datiClassiSuperficie[nomeEdificio] = {
      classeSuperficie: classeSuperficie,
      superficieTotale: superficieAbitazione, // Solo ABITAZIONE, non ACCESSORIO
      totaliTipologie: totaliTipologie
    };
  });

  // Genera le righe della tabella
  Object.keys(datiClassiSuperficie).forEach(nomeEdificio => {
    const dati = datiClassiSuperficie[nomeEdificio];
    
    html += `<tr>`;
    html += `<td>${escapeHtml(nomeEdificio)}</td>`;
    
    // Colonne classi di superficie
    html += `<td>${dati.classeSuperficie === '<95' ? formatItalianNumber(dati.superficieTotale) : ''}</td>`;
    html += `<td>${dati.classeSuperficie === '95-110' ? formatItalianNumber(dati.superficieTotale) : ''}</td>`;
    html += `<td>${dati.classeSuperficie === '110-130' ? formatItalianNumber(dati.superficieTotale) : ''}</td>`;
    html += `<td>${dati.classeSuperficie === '130-160' ? formatItalianNumber(dati.superficieTotale) : ''}</td>`;
    html += `<td>${dati.classeSuperficie === '>160' ? formatItalianNumber(dati.superficieTotale) : ''}</td>`;
    
    // Colonne altre tipologie
    html += `<td>${dati.totaliTipologie['Accessori'] > 0 ? formatItalianNumber(dati.totaliTipologie['Accessori']) : ''}</td>`;
    html += `<td>${dati.totaliTipologie['Androni'] > 0 ? formatItalianNumber(dati.totaliTipologie['Androni']) : ''}</td>`;
    html += `<td>${dati.totaliTipologie['Porticati'] > 0 ? formatItalianNumber(dati.totaliTipologie['Porticati']) : ''}</td>`;
    html += `<td>${dati.totaliTipologie['Logge'] > 0 ? formatItalianNumber(dati.totaliTipologie['Logge']) : ''}</td>`;
    html += `<td>${dati.totaliTipologie['Balconi'] > 0 ? formatItalianNumber(dati.totaliTipologie['Balconi']) : ''}</td>`;
    html += `<td>${dati.totaliTipologie['Box Sing.'] > 0 ? formatItalianNumber(dati.totaliTipologie['Box Sing.']) : ''}</td>`;
    html += `<td>${dati.totaliTipologie['Box Col.'] > 0 ? formatItalianNumber(dati.totaliTipologie['Box Col.']) : ''}</td>`;
    
    html += `</tr>`;
  });

  // Riga dei totali
  html += `<tr class="table-secondary">`;
  html += `<td><strong>TOTALE</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['<95'])}</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['95-110'])}</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['110-130'])}</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['130-160'])}</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['>160'])}</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['Accessori'])}</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['Androni'])}</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['Porticati'])}</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['Logge'])}</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['Balconi'])}</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['Box Sing.'])}</strong></td>`;
  html += `<td><strong>${formatItalianNumber(totaliColonne['Box Col.'])}</strong></td>`;
  html += `</tr>`;

  // Riga dei conteggi (numero di unità)
  html += `<tr class="table-info">`;
  html += `<td><strong>N. UNITA</strong></td>`;
  html += `<td><strong>${conteggiColonne['<95'] > 0 ? conteggiColonne['<95'] : ''}</strong></td>`;
  html += `<td><strong>${conteggiColonne['95-110'] > 0 ? conteggiColonne['95-110'] : ''}</strong></td>`;
  html += `<td><strong>${conteggiColonne['110-130'] > 0 ? conteggiColonne['110-130'] : ''}</strong></td>`;
  html += `<td><strong>${conteggiColonne['130-160'] > 0 ? conteggiColonne['130-160'] : ''}</strong></td>`;
  html += `<td><strong>${conteggiColonne['>160'] > 0 ? conteggiColonne['>160'] : ''}</strong></td>`;
  html += `<td><strong>${conteggiColonne['Accessori'] > 0 ? conteggiColonne['Accessori'] : ''}</strong></td>`;
  html += `<td><strong>${conteggiColonne['Androni'] > 0 ? conteggiColonne['Androni'] : ''}</strong></td>`;
  html += `<td><strong>${conteggiColonne['Porticati'] > 0 ? conteggiColonne['Porticati'] : ''}</strong></td>`;
  html += `<td><strong>${conteggiColonne['Logge'] > 0 ? conteggiColonne['Logge'] : ''}</strong></td>`;
  html += `<td><strong>${conteggiColonne['Balconi'] > 0 ? conteggiColonne['Balconi'] : ''}</strong></td>`;
  html += `<td><strong>${conteggiColonne['Box Sing.'] > 0 ? conteggiColonne['Box Sing.'] : ''}</strong></td>`;
  html += `<td><strong>${conteggiColonne['Box Col.'] > 0 ? conteggiColonne['Box Col.'] : ''}</strong></td>`;
  html += `</tr>`;

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
  
  // Aggiungi event listener per il doppio click sulle righe dei locali
  const righeLocali = container.querySelectorAll('.riepilogo-locale-row');
  righeLocali.forEach(riga => {
    riga.addEventListener('dblclick', (e) => {
      const edificioId = riga.dataset.edificioId;
      const pianoId = riga.dataset.pianoId;
      const localeId = riga.dataset.localeId;
      
      if (edificioId && pianoId && localeId) {
        apriModalLocale(edificioId, pianoId, localeId);
      }
    });
    
    // Aggiungi stile hover per indicare che è cliccabile
    riga.addEventListener('mouseenter', () => {
      riga.style.backgroundColor = '#e7f3ff';
    });
    riga.addEventListener('mouseleave', () => {
      riga.style.backgroundColor = '';
    });
  });
  
  // Aggiungi event listener ai pulsanti
  const btnStampa = document.getElementById('btn-riepilogo-stampa-pdf');
  if (btnStampa) {
    btnStampa.addEventListener('click', printRiepilogoSuperfici);
  }
  const btnExportExcel = document.getElementById('btn-riepilogo-export-excel');
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', exportRiepilogoSuperficiExcel);
  }
}

// Vista Riepilogo Superfici Non Residenziali
function generaRiepilogoSuperficiNonResidenziali() {
  const container = document.getElementById('riepilogo-superfici-non-residenziali-content');
  if (!container) return;

  const edifici = dataModel.getAllEdifici();
  
  // Raccogli tutti i locali con le loro informazioni, raggruppati per unità (edificio) e tipologia
  const localiPerUnitaETipologia = {};
  
  edifici.forEach(edificio => {
    if (!edificio.piani || !Array.isArray(edificio.piani)) return;
    const nomeEdificio = edificio.nome || 'Edificio senza nome';
    
    if (!localiPerUnitaETipologia[nomeEdificio]) {
      localiPerUnitaETipologia[nomeEdificio] = {};
    }
    
    edificio.piani.forEach(piano => {
      if (!piano.locali || !Array.isArray(piano.locali)) return;
      
      piano.locali.forEach(locale => {
        const tipologia = locale.tipologiaSuperficie || 'Non specificata';
        
        // Filtra solo le tipologie non residenziali
        if (!TIPOLOGIE_NON_RESIDENZIALI.includes(tipologia)) {
          return;
        }
        
        // Gestisci sia stringa che numero per superficieUtile
        let superficie = 0;
        if (typeof locale.superficieUtile === 'number') {
          superficie = locale.superficieUtile;
        } else if (typeof locale.superficieUtile === 'string') {
          superficie = parseItalianNumber(locale.superficieUtile || '0');
        }
        
        // Salta i locali con superficie zero o negativa
        if (superficie <= 0) {
          return;
        }
        
        if (!localiPerUnitaETipologia[nomeEdificio][tipologia]) {
          localiPerUnitaETipologia[nomeEdificio][tipologia] = {
            locali: [],
            somma: 0
          };
        }
        
        localiPerUnitaETipologia[nomeEdificio][tipologia].locali.push({
          nome: locale.nome || 'Locale senza nome',
          superficie: superficie,
          specificaSuperficie: locale.specificaSuperficie || '',
          edificioId: edificio.id,
          pianoId: piano.id,
          localeId: locale.id
        });
        
        localiPerUnitaETipologia[nomeEdificio][tipologia].somma += superficie;
      });
    });
  });
  
  // Se non ci sono locali, mostra messaggio
  if (Object.keys(localiPerUnitaETipologia).length === 0) {
    container.innerHTML = '<div class="card-body text-center text-muted p-5">Nessun locale presente.</div>';
    return;
  }

  // Genera HTML della tabella
  let html = `
    <style>
      #riepilogo-superfici-non-residenziali-content table th, #riepilogo-superfici-non-residenziali-content table td { 
        padding: 2px 4px !important; 
        line-height: 1.1 !important; 
      }
      #riepilogo-superfici-non-residenziali-content table { 
        margin-bottom: 0 !important; 
      }
      #riepilogo-superfici-non-residenziali-content .card-body { 
        padding: 8px !important; 
      }
      #riepilogo-superfici-non-residenziali-content .mb-3 { 
        margin-bottom: 4px !important; 
      }
    </style>
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0">RIEPILOGO SUPERFICI NON RESIDENZIALI</h3>
        <div class="d-flex gap-2">
          <button id="btn-riepilogo-non-residenziali-stampa-pdf" class="btn btn-success btn-sm">STAMPA PDF</button>
          <button id="btn-riepilogo-non-residenziali-export-excel" class="btn btn-success btn-sm">ESPORTA EXCEL</button>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-bordered table-hover" style="margin-bottom: 0;">
          <thead class="table-primary">
            <tr>
              <th style="width: 10%;">UNITA</th>
              <th style="width: 20%;">TIPOLOGIA</th>
              <th style="width: 25%;">LOCALE</th>
              <th style="width: 25%;">SPECIFICA SUPERFICIE</th>
              <th style="width: 20%;">SUP.</th>
            </tr>
          </thead>
          <tbody>
  `;

  // Itera per ogni unità (edificio)
  Object.keys(localiPerUnitaETipologia).forEach(nomeEdificio => {
    const tipologieUnita = localiPerUnitaETipologia[nomeEdificio];
    
    // Ordina le tipologie alfabeticamente
    const tipologieOrdinate = Object.keys(tipologieUnita).sort((a, b) => a.localeCompare(b));
    
    // Calcola il numero totale di righe per questa unità (solo per tipologie con superficie > 0)
    let totaleRighe = 0;
    tipologieOrdinate.forEach(tipologia => {
      const dati = tipologieUnita[tipologia];
      if (dati.locali.length > 0 && dati.somma > 0) {
        totaleRighe += dati.locali.length + 1; // +1 per la riga di somma
      }
    });
    
    // Se non ci sono righe da mostrare, salta questa unità
    if (totaleRighe === 0) {
      return;
    }
    
    let primaRiga = true;
    
    // Mostra le tipologie
    tipologieOrdinate.forEach(tipologia => {
      const dati = tipologieUnita[tipologia];
      
      // Mostra solo se ci sono locali con superficie > 0
      if (dati.locali.length > 0 && dati.somma > 0) {
        dati.locali.forEach((locale, index) => {
          if (primaRiga) {
            html += `
              <tr class="riepilogo-locale-row" style="cursor: pointer;" data-edificio-id="${locale.edificioId}" data-piano-id="${locale.pianoId}" data-locale-id="${locale.localeId}" title="Doppio click per aprire il locale">
                <td rowspan="${totaleRighe}" class="align-middle">${escapeHtml(nomeEdificio)}</td>
                <td>${escapeHtml(tipologia)}</td>
                <td>${escapeHtml(locale.nome)}</td>
                <td>${escapeHtml(locale.specificaSuperficie)}</td>
                <td>${formatItalianNumber(locale.superficie)}</td>
              </tr>
            `;
            primaRiga = false;
          } else {
            html += `
              <tr class="riepilogo-locale-row" style="cursor: pointer;" data-edificio-id="${locale.edificioId}" data-piano-id="${locale.pianoId}" data-locale-id="${locale.localeId}" title="Doppio click per aprire il locale">
                <td>${escapeHtml(tipologia)}</td>
                <td>${escapeHtml(locale.nome)}</td>
                <td>${escapeHtml(locale.specificaSuperficie)}</td>
                <td>${formatItalianNumber(locale.superficie)}</td>
              </tr>
            `;
          }
        });
        
        // Riga di somma per questa tipologia
        html += `
          <tr class="table-secondary">
            <td><strong>SOMMA ${escapeHtml(tipologia.toUpperCase())}</strong></td>
            <td></td>
            <td></td>
            <td><strong>${formatItalianNumber(dati.somma)}</strong></td>
          </tr>
        `;
      }
    });
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
  
  // Aggiungi event listener per il doppio click sulle righe dei locali
  const righeLocali = container.querySelectorAll('.riepilogo-locale-row');
  righeLocali.forEach(riga => {
    riga.addEventListener('dblclick', (e) => {
      const edificioId = riga.dataset.edificioId;
      const pianoId = riga.dataset.pianoId;
      const localeId = riga.dataset.localeId;
      
      if (edificioId && pianoId && localeId) {
        apriModalLocale(edificioId, pianoId, localeId);
      }
    });
    
    // Aggiungi stile hover per indicare che è cliccabile
    riga.addEventListener('mouseenter', () => {
      riga.style.backgroundColor = '#e7f3ff';
    });
    riga.addEventListener('mouseleave', () => {
      riga.style.backgroundColor = '';
    });
  });
  
  // Aggiungi event listener ai pulsanti
  const btnStampa = document.getElementById('btn-riepilogo-non-residenziali-stampa-pdf');
  if (btnStampa) {
    btnStampa.addEventListener('click', printRiepilogoSuperficiNonResidenziali);
  }
  const btnExportExcel = document.getElementById('btn-riepilogo-non-residenziali-export-excel');
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', exportRiepilogoSuperficiNonResidenzialiExcel);
  }
}

// Vista Costo di Costruzione
function generaCostoCostruzione() {
  const container = document.getElementById('costo-costruzione-content');
  if (!container) return;

  const edifici = dataModel.getAllEdifici();
  
  // Raccogli tutti i locali con le loro informazioni, raggruppati per unità (edificio) e tipologia
  const localiPerUnitaETipologia = {};
  
  edifici.forEach(edificio => {
    if (!edificio.piani || !Array.isArray(edificio.piani)) return;
    const nomeEdificio = edificio.nome || 'Edificio senza nome';
    
    if (!localiPerUnitaETipologia[nomeEdificio]) {
      localiPerUnitaETipologia[nomeEdificio] = {};
    }
    
    edificio.piani.forEach(piano => {
      if (!piano.locali || !Array.isArray(piano.locali)) return;
      
      piano.locali.forEach(locale => {
        const tipologia = locale.tipologiaSuperficie || 'Non specificata';
        
        // Filtra solo le tipologie residenziali
        if (!TIPOLOGIE_RESIDENZIALI.includes(tipologia)) {
          return;
        }
        
        // Gestisci sia stringa che numero per superficieUtile
        let superficie = 0;
        if (typeof locale.superficieUtile === 'number') {
          superficie = locale.superficieUtile;
        } else if (typeof locale.superficieUtile === 'string') {
          superficie = parseItalianNumber(locale.superficieUtile || '0');
        }
        
        // Salta i locali con superficie zero o negativa
        if (superficie <= 0) {
          return;
        }
        
        if (!localiPerUnitaETipologia[nomeEdificio][tipologia]) {
          localiPerUnitaETipologia[nomeEdificio][tipologia] = {
            locali: [],
            somma: 0
          };
        }
        
        localiPerUnitaETipologia[nomeEdificio][tipologia].locali.push({
          nome: locale.nome || 'Locale senza nome',
          superficie: superficie,
          specificaSuperficie: locale.specificaSuperficie || ''
        });
        
        localiPerUnitaETipologia[nomeEdificio][tipologia].somma += superficie;
      });
    });
  });

  // Calcola i dati per le tabelle
  const totaliColonne = {
    '<95': 0,
    '95-110': 0,
    '110-130': 0,
    '130-160': 0,
    '>160': 0,
    'Accessori': 0,
    'Androni': 0,
    'Porticati': 0,
    'Logge': 0,
    'Balconi': 0,
    'Box Sing.': 0,
    'Box Col.': 0
  };
  const conteggiColonne = {
    '<95': 0,
    '95-110': 0,
    '110-130': 0,
    '130-160': 0,
    '>160': 0,
    'Accessori': 0,
    'Androni': 0,
    'Porticati': 0,
    'Logge': 0,
    'Balconi': 0,
    'Box Sing.': 0,
    'Box Col.': 0
  };

  Object.keys(localiPerUnitaETipologia).forEach(nomeEdificio => {
    const tipologieUnita = localiPerUnitaETipologia[nomeEdificio];
    
    // Calcola la superficie totale di ABITAZIONE + ACCESSORIO ABITAZIONE
    let superficieAbitazione = 0;
    let superficieAccessorio = 0;
    
    if (tipologieUnita['ABITAZIONE']) {
      superficieAbitazione = tipologieUnita['ABITAZIONE'].somma;
    }
    if (tipologieUnita['ACCESSORIO ABITAZIONE']) {
      superficieAccessorio = tipologieUnita['ACCESSORIO ABITAZIONE'].somma;
    }
    
    const superficieTotaleAbitazione = superficieAbitazione + superficieAccessorio;
    
    // Classifica in base alla classe di superficie
    if (superficieTotaleAbitazione > 0 && superficieTotaleAbitazione < 95) {
      totaliColonne['<95'] += superficieTotaleAbitazione;
      conteggiColonne['<95']++;
    } else if (superficieTotaleAbitazione >= 95 && superficieTotaleAbitazione < 110) {
      totaliColonne['95-110'] += superficieTotaleAbitazione;
      conteggiColonne['95-110']++;
    } else if (superficieTotaleAbitazione >= 110 && superficieTotaleAbitazione < 130) {
      totaliColonne['110-130'] += superficieTotaleAbitazione;
      conteggiColonne['110-130']++;
    } else if (superficieTotaleAbitazione >= 130 && superficieTotaleAbitazione < 160) {
      totaliColonne['130-160'] += superficieTotaleAbitazione;
      conteggiColonne['130-160']++;
    } else if (superficieTotaleAbitazione >= 160) {
      totaliColonne['>160'] += superficieTotaleAbitazione;
      conteggiColonne['>160']++;
    }
    
    // Raccogli i totali per le altre tipologie
    const totaliTipologie = {
      'Accessori': tipologieUnita['ACCESSORIO ABITAZIONE'] ? tipologieUnita['ACCESSORIO ABITAZIONE'].somma : 0,
      'Androni': tipologieUnita['ANDRONE'] ? tipologieUnita['ANDRONE'].somma : 0,
      'Porticati': tipologieUnita['PORTICATO'] ? tipologieUnita['PORTICATO'].somma : 0,
      'Logge': tipologieUnita['LOGGIA'] ? tipologieUnita['LOGGIA'].somma : 0,
      'Balconi': tipologieUnita['BALCONE'] ? tipologieUnita['BALCONE'].somma : 0,
      'Box Sing.': tipologieUnita['BOX SINGOLO'] ? tipologieUnita['BOX SINGOLO'].somma : 0,
      'Box Col.': tipologieUnita['BOX COLLETTIVO'] ? tipologieUnita['BOX COLLETTIVO'].somma : 0
    };
    
    // Aggiorna i totali delle colonne
    totaliColonne['Accessori'] += totaliTipologie['Accessori'];
    totaliColonne['Androni'] += totaliTipologie['Androni'];
    totaliColonne['Porticati'] += totaliTipologie['Porticati'];
    totaliColonne['Logge'] += totaliTipologie['Logge'];
    totaliColonne['Balconi'] += totaliTipologie['Balconi'];
    totaliColonne['Box Sing.'] += totaliTipologie['Box Sing.'];
    totaliColonne['Box Col.'] += totaliTipologie['Box Col.'];
    
    // Aggiorna i conteggi delle colonne (conta le unità con valore > 0)
    if (totaliTipologie['Accessori'] > 0) conteggiColonne['Accessori']++;
    if (totaliTipologie['Androni'] > 0) conteggiColonne['Androni']++;
    if (totaliTipologie['Porticati'] > 0) conteggiColonne['Porticati']++;
    if (totaliTipologie['Logge'] > 0) conteggiColonne['Logge']++;
    if (totaliTipologie['Balconi'] > 0) conteggiColonne['Balconi']++;
    if (totaliTipologie['Box Sing.'] > 0) conteggiColonne['Box Sing.']++;
    if (totaliTipologie['Box Col.'] > 0) conteggiColonne['Box Col.']++;
  });

  // Calcola SU (Superficie Utile totale)
  const su = totaliColonne['<95'] + totaliColonne['95-110'] + totaliColonne['110-130'] + totaliColonne['130-160'] + totaliColonne['>160'];
  
  // Calcola SNR (Superficie Netta di servizi e accessori)
  const snr = totaliColonne['Accessori'] + totaliColonne['Androni'] + totaliColonne['Porticati'] + totaliColonne['Logge'] + totaliColonne['Balconi'] + totaliColonne['Box Sing.'] + totaliColonne['Box Col.'];
  
  // Calcola il rapporto (Snr : Su) x 100
  const rapportoSnrSu = su > 0 ? (snr / su) * 100 : 0;

  // Calcola le superfici non residenziali
  const localiNonResidenziali = {};
  let suNonResidenziale = 0; // Su (art.9) - Superficie netta non residenziale (COMMERCIALE + DIREZIONALE + TURISTICO)
  let saNonResidenziale = 0; // Sa (art 9) - Superficie accessori (ACCESSORIO TERZIARIO)
  
  edifici.forEach(edificio => {
    if (!edificio.piani || !Array.isArray(edificio.piani)) return;
    
    edificio.piani.forEach(piano => {
      if (!piano.locali || !Array.isArray(piano.locali)) return;
      
      piano.locali.forEach(locale => {
        const tipologia = locale.tipologiaSuperficie || 'Non specificata';
        
        // Filtra solo le tipologie non residenziali
        if (!TIPOLOGIE_NON_RESIDENZIALI.includes(tipologia)) {
          return;
        }
        
        // Gestisci sia stringa che numero per superficieUtile
        let superficie = 0;
        if (typeof locale.superficieUtile === 'number') {
          superficie = locale.superficieUtile;
        } else if (typeof locale.superficieUtile === 'string') {
          superficie = parseItalianNumber(locale.superficieUtile || '0');
        }
        
        // Salta i locali con superficie zero o negativa
        if (superficie <= 0) {
          return;
        }
        
        // Su (art.9) = COMMERCIALE + DIREZIONALE + TURISTICO
        if (tipologia === 'COMMERCIALE' || tipologia === 'DIREZIONALE' || tipologia === 'TURISTICO') {
          suNonResidenziale += superficie;
        }
        
        // Sa (art 9) = ACCESSORIO TERZIARIO
        if (tipologia === 'ACCESSORIO TERZIARIO') {
          saNonResidenziale += superficie;
        }
      });
    });
  });
  
  // Calcola 60% Sa e St (art 9)
  const saRagguiagliata = saNonResidenziale * 0.6;
  const stNonResidenziale = suNonResidenziale + saRagguiagliata;

  // Calcola gli incrementi per la TABELLA 1
  const incrementiPerClasse = {
    '<95': 0,
    '95-110': 5,
    '110-130': 15,
    '130-160': 30,
    '>160': 50
  };
  
  const rapportiPerClasse = {};
  const incrementiCalcolati = {};
  let inc1 = 0; // Incremento totale per la tabella 1
  
  // Calcola i rapporti: (superficie per classe / SU totale)
  // Il rapporto deve essere calcolato come: (colonna 3 per classe) / (S.U. Totale)
  ['<95', '95-110', '110-130', '130-160', '>160'].forEach(classe => {
    if (su > 0 && su !== 0) {
      // Calcola il rapporto: superficie della classe diviso SU totale
      rapportiPerClasse[classe] = totaliColonne[classe] / su;
    } else {
      rapportiPerClasse[classe] = 0;
    }
    // Colonna 6 = Colonna 4 × Colonna 5 (dove colonna 5 è un numero puro, non percentuale)
    incrementiCalcolati[classe] = rapportiPerClasse[classe] * incrementiPerClasse[classe];
    inc1 += incrementiCalcolati[classe];
  });

  // Determina l'intervallo per la TABELLA 3
  let intervalloSnrSu = '';
  let incrementoArt6 = 0;
  if (rapportoSnrSu < 50) {
    intervalloSnrSu = '< 50';
    incrementoArt6 = 0;
  } else if (rapportoSnrSu >= 50 && rapportoSnrSu < 75) {
    intervalloSnrSu = '>50 <75';
    incrementoArt6 = 10;
  } else if (rapportoSnrSu >= 75 && rapportoSnrSu < 100) {
    intervalloSnrSu = '>75 <100';
    incrementoArt6 = 20;
  } else if (rapportoSnrSu >= 100) {
    intervalloSnrSu = '>100';
    incrementoArt6 = 30;
  }

  // Genera HTML
  let html = `
    <style>
      #costo-costruzione-content table { 
        margin-bottom: 20px; 
        width: 100%;
      }
      #costo-costruzione-content table th, #costo-costruzione-content table td { 
        border: 1px solid #000; 
        padding: 8px; 
        text-align: center;
        vertical-align: middle;
      }
      #costo-costruzione-content table thead th { 
        background-color: #e0e0e0; 
        font-weight: bold;
      }
      #costo-costruzione-content .table-totale td { 
        background-color: #00FFFF; 
        font-weight: bold;
      }
      #costo-costruzione-content input[type="radio"] { 
        margin: 0 auto;
        display: block;
        cursor: pointer;
      }
    </style>
    
    <!-- Pulsante Stampa -->
    <div class="d-flex justify-content-end mb-3">
      <button id="btn-stampa-costo-costruzione" class="btn btn-success btn-sm">STAMPA</button>
    </div>
    
    <!-- TABELLA 1 - Incremento per superficie utile abitabile (art. 5) -->
    <h3>TABELLA 1 - Incremento per superficie utile abitabile (art. 5)</h3>
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>(1)<br>Classi di Superficie (mq)</th>
          <th>(2)<br>Alloggi (n)</th>
          <th>(3)<br>Sup. Utile abitabile (mq)</th>
          <th>(4)<br>Rapporto rispetto al totale</th>
          <th>(5)<br>% Incremento (art. 5)</th>
          <th>(6)<br>% Incremento per classi di superficie</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>&lt;95</td>
          <td>${conteggiColonne['<95']}</td>
          <td>${formatItalianNumber(totaliColonne['<95'])}</td>
          <td>${formatItalianNumber(rapportiPerClasse['<95'])}</td>
          <td>0</td>
          <td>${formatItalianNumber(incrementiCalcolati['<95'])}</td>
        </tr>
        <tr>
          <td>&gt;95 &lt;110</td>
          <td>${conteggiColonne['95-110']}</td>
          <td>${formatItalianNumber(totaliColonne['95-110'])}</td>
          <td>${formatItalianNumber(rapportiPerClasse['95-110'])}</td>
          <td>5</td>
          <td>${formatItalianNumber(incrementiCalcolati['95-110'])}</td>
        </tr>
        <tr>
          <td>&gt;110 &lt;130</td>
          <td>${conteggiColonne['110-130']}</td>
          <td>${formatItalianNumber(totaliColonne['110-130'])}</td>
          <td>${formatItalianNumber(rapportiPerClasse['110-130'])}</td>
          <td>15</td>
          <td>${formatItalianNumber(incrementiCalcolati['110-130'])}</td>
        </tr>
        <tr>
          <td>&gt;130 &lt;160</td>
          <td>${conteggiColonne['130-160']}</td>
          <td>${formatItalianNumber(totaliColonne['130-160'])}</td>
          <td>${formatItalianNumber(rapportiPerClasse['130-160'])}</td>
          <td>30</td>
          <td>${formatItalianNumber(incrementiCalcolati['130-160'])}</td>
        </tr>
        <tr>
          <td>&gt;160</td>
          <td>${conteggiColonne['>160']}</td>
          <td>${formatItalianNumber(totaliColonne['>160'])}</td>
          <td>${formatItalianNumber(rapportiPerClasse['>160'])}</td>
          <td>50</td>
          <td>${formatItalianNumber(incrementiCalcolati['>160'])}</td>
        </tr>
        <tr class="table-totale">
          <td></td>
          <td></td>
          <td><strong>SU</strong><br>${formatItalianNumber(su)}</td>
          <td></td>
          <td></td>
          <td><strong>Inc. 1</strong><br>${formatItalianNumber(inc1)}</td>
        </tr>
      </tbody>
    </table>

    <!-- TABELLA 2 - Superfici per servizi e accessori relativi alla parte residenziale (art. 2) -->
    <h3>TABELLA 2 - Superfici per servizi e accessori relativi alla parte residenziale (art. 2)</h3>
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>(7)<br>DESTINAZIONI</th>
          <th>(8)<br>Sup. Netta di servizi e accessori (mq)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>a) Cantinole, soffitte, locali motore ascensore, cabine idriche, lavatoi comuni, centrali termiche ed altri locali a stretto servizio delle residenze</td>
          <td>${formatItalianNumber(totaliColonne['Accessori'])}</td>
        </tr>
        <tr>
          <td>b) Autorimesse singole</td>
          <td>${formatItalianNumber(totaliColonne['Box Sing.'])}</td>
        </tr>
        <tr>
          <td>b) Autorimesse collettive</td>
          <td>${formatItalianNumber(totaliColonne['Box Col.'])}</td>
        </tr>
        <tr>
          <td>c) Androni d'ingresso</td>
          <td>${formatItalianNumber(totaliColonne['Androni'])}</td>
        </tr>
        <tr>
          <td>c) Porticati liberi</td>
          <td>${formatItalianNumber(totaliColonne['Porticati'])}</td>
        </tr>
        <tr>
          <td>c) Logge</td>
          <td>${formatItalianNumber(totaliColonne['Logge'])}</td>
        </tr>
        <tr>
          <td>c) Balconi</td>
          <td>${formatItalianNumber(totaliColonne['Balconi'])}</td>
        </tr>
        <tr class="table-totale">
          <td><strong>SNR</strong></td>
          <td><strong>${formatItalianNumber(snr)}</strong></td>
        </tr>
      </tbody>
    </table>
    <p><strong>(Snr : Su) x 100 = ${formatItalianNumber(rapportoSnrSu)}</strong></p>

    <!-- TABELLA 3 - Incremento per servizi ed accessori relativi alla parte residenziale (art.6) -->
    <h3>TABELLA 3 - Incremento per servizi ed accessori relativi alla parte residenziale (art.6)</h3>
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>(9)<br>Intervalli di variabilità del rapporto percentuale (Snr : Su) x 100</th>
          <th>(10)<br>Ipotesi che ricorre</th>
          <th>(11)<br>% Incremento</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>&lt; 50</td>
          <td>${intervalloSnrSu === '< 50' ? 'X' : ''}</td>
          <td>0</td>
        </tr>
        <tr>
          <td>&gt;50 &lt;75</td>
          <td>${intervalloSnrSu === '>50 <75' ? 'X' : ''}</td>
          <td>10</td>
        </tr>
        <tr>
          <td>&gt;75 &lt;100</td>
          <td>${intervalloSnrSu === '>75 <100' ? 'X' : ''}</td>
          <td>20</td>
        </tr>
        <tr>
          <td>&gt;100</td>
          <td>${intervalloSnrSu === '>100' ? 'X' : ''}</td>
          <td>30</td>
        </tr>
        <tr class="table-totale">
          <td></td>
          <td></td>
          <td><strong>Inc. 2</strong><br>${formatItalianNumber(incrementoArt6)}</td>
        </tr>
      </tbody>
    </table>

    <!-- TABELLA 4 - Superfici residenziali e relativi servizi ed accessori -->
    <h3>SUPERFICI RESIDENZIALI E RELATIVI SERVIZI ED ACCESSORI</h3>
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>(17)<br>SIGLA</th>
          <th>(18)<br>Denominazione</th>
          <th>(19)<br>Superficie mq</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Su (art.3)</td>
          <td>${formatItalianNumber(su)}</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Snr (art 2)</td>
          <td>${formatItalianNumber(snr)}</td>
        </tr>
        <tr>
          <td>3</td>
          <td>60% Snr</td>
          <td>${formatItalianNumber(snr * 0.6)}</td>
        </tr>
        <tr class="table-totale">
          <td>4=1+3</td>
          <td><strong>Sc (art 2)</strong></td>
          <td><strong>${formatItalianNumber(su + (snr * 0.6))}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- TABELLA 5 - Incremento per particolari caratteristiche (art. 7) -->
    <h3>TABELLA 4 - Incremento per particolari caratteristiche (art. 7)</h3>
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>Numero di caratteristiche</th>
          <th>Ipotesi che ricorre</th>
          <th>% Incremento</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>0</td>
          <td><input type="radio" name="caratteristiche-art7" value="0" class="form-check-input" checked></td>
          <td>0</td>
        </tr>
        <tr>
          <td>1</td>
          <td><input type="radio" name="caratteristiche-art7" value="10" class="form-check-input"></td>
          <td>10</td>
        </tr>
        <tr>
          <td>2</td>
          <td><input type="radio" name="caratteristiche-art7" value="20" class="form-check-input"></td>
          <td>20</td>
        </tr>
        <tr>
          <td>3</td>
          <td><input type="radio" name="caratteristiche-art7" value="30" class="form-check-input"></td>
          <td>30</td>
        </tr>
        <tr>
          <td>4</td>
          <td><input type="radio" name="caratteristiche-art7" value="40" class="form-check-input"></td>
          <td>40</td>
        </tr>
        <tr>
          <td>5</td>
          <td><input type="radio" name="caratteristiche-art7" value="50" class="form-check-input"></td>
          <td>50</td>
        </tr>
        <tr class="table-totale">
          <td></td>
          <td></td>
          <td><strong>Inc. 3</strong><br><span id="inc3-value">0</span></td>
        </tr>
      </tbody>
    </table>

    <!-- TABELLA 5 - Superfici per attività turistiche commerciali, direzionali e relativi accessori -->
    <h3>SUPERFICI PER ATTIVITA' TURISTICHE COMMERCIALI, DIREZIONALI E RELATIVI ACCESSORI</h3>
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>(20)<br>SIGLA</th>
          <th>(21)<br>Denominazione</th>
          <th>(22)<br>Superficie mq</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Su (art.9)</td>
          <td>${formatItalianNumber(suNonResidenziale)}</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Sa (art 9)</td>
          <td>${formatItalianNumber(saNonResidenziale)}</td>
        </tr>
        <tr>
          <td>3</td>
          <td>60% Sa</td>
          <td>${formatItalianNumber(saRagguiagliata)}</td>
        </tr>
        <tr class="table-totale">
          <td>4=1+3</td>
          <td><strong>St (art 9)</strong></td>
          <td><strong>${formatItalianNumber(stNonResidenziale)}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- TABELLA 6 - ART. 8 DECRETO MINISTERIALE (nascosta di default) -->
    <div class="mb-3">
      <button id="btn-toggle-art8" class="btn btn-outline-primary btn-sm" type="button">
        <span id="btn-toggle-art8-text">Mostra</span> ART. 8 DECRETO MINISTERIALE
      </button>
    </div>
    <div id="tabella-art8" style="display: none;">
      <h3>ART. 8 DECRETO MINISTERIALE 10 MAGGIO 1977</h3>
      <p class="mb-3">Le classi di edifici e le relative maggiorazioni di costo di cui al secondo comma dell'art. 6 della legge 28 gennaio 1977 n° 10, sono così individuate:</p>
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>Classe</th>
            <th>Percentuale di Incremento</th>
            <th>Maggiorazione</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>I</td>
            <td>fino a 5 inclusa</td>
            <td>nessuna maggiorazione</td>
          </tr>
          <tr>
            <td>II</td>
            <td>da 5 a 10 inclusa</td>
            <td>maggiorazione del 5%</td>
          </tr>
          <tr>
            <td>III</td>
            <td>da 10 a 15 inclusa</td>
            <td>maggiorazione del 10%</td>
          </tr>
          <tr>
            <td>IV</td>
            <td>da 15 a 20 inclusa</td>
            <td>maggiorazione del 15%</td>
          </tr>
          <tr>
            <td>V</td>
            <td>da 20 a 25 inclusa</td>
            <td>maggiorazione del 20%</td>
          </tr>
          <tr>
            <td>VI</td>
            <td>da 25 a 30 inclusa</td>
            <td>maggiorazione del 25%</td>
          </tr>
          <tr>
            <td>VII</td>
            <td>da 30 a 35 inclusa</td>
            <td>maggiorazione del 30%</td>
          </tr>
          <tr>
            <td>VIII</td>
            <td>da 35 a 40 inclusa</td>
            <td>maggiorazione del 35%</td>
          </tr>
          <tr>
            <td>IX</td>
            <td>da 40 a 45 inclusa</td>
            <td>maggiorazione del 40%</td>
          </tr>
          <tr>
            <td>X</td>
            <td>da 45 a 50 inclusa</td>
            <td>maggiorazione del 45%</td>
          </tr>
          <tr>
            <td>XI</td>
            <td>oltre il 50% inclusa</td>
            <td>maggiorazione del 50%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- TABELLA 7 - Totale Incrementi e Maggiorazione -->
    <div class="d-flex align-items-center gap-3 mb-3">
      <h3 class="mb-0">TOTALE INCREMENTI</h3>
      <span class="text-muted small">(*) la classe dell'edificio e relativa maggiorazione si individuano in base a quanto prescritto dall'art. 8 del D.M. 10 maggio 1977 riportato nell'ultima pagina del presente prospetto</span>
    </div>
    <table class="table table-bordered">
      <thead>
        <tr>
          <th rowspan="2">TOTALE INCREMENTI</th>
          <th rowspan="2">Classe edificio (15)</th>
          <th rowspan="2">Maggiorazione (16)</th>
        </tr>
        <tr></tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>i = i1+i2+i3</strong><br><span id="totale-incrementi-value">0</span></td>
          <td><span id="classe-edificio-value">-</span></td>
          <td><span id="maggiorazione-value">-</span></td>
        </tr>
      </tbody>
    </table>

    <!-- Sezione Calcolo Costo di Costruzione -->
    <h3 class="mt-4">CALCOLO COSTO DI COSTRUZIONE</h3>
    <div class="table-responsive">
      <table class="table table-bordered">
        <tbody>
          <tr>
            <td style="width: 60%;">A - Costo a mq. di costruzione (Delib. Giunta Regionale n. 5/53844 del 31-5-1994) =</td>
            <td style="width: 20%;">
              <input type="text" id="costo-mq-input" class="form-control text-end" value="0,00" style="background-color: #ffff00; font-weight: bold;">
            </td>
            <td style="width: 20%;">€/mq.</td>
          </tr>
          <tr>
            <td>B - Costo a mq. di costruzione maggiorato A x ((1+(M: 100))) =</td>
            <td class="text-end"><strong><span id="costo-mq-maggiorato-value">0,00</span></strong></td>
            <td>€/mq.</td>
          </tr>
          <tr>
            <td>C - Costo di costruzione dell'edificio (Sc +St) x B = <span id="formula-costo-costruzione" style="background-color: #ffff00; padding: 2px 5px; border-radius: 3px;">(0,00 + 0,00) x 0,00</span></td>
            <td class="text-end"><strong><span id="costo-costruzione-totale-value">0,00</span></strong></td>
            <td>€</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tabella Percentuali del Costo di Costruzione -->
    <h3 class="mt-4">PERCENTUALI DEL COSTO DI COSTRUZIONE PER LA DETERMINAZIONE DEL CONTRIBUTO AFFERENTE ALLA CONCESSIONE EDILIZIA</h3>
    <p class="small mb-3">(Art. 3 e 6 della Legge 28 gennaio 1977, n. 10; Delib. Giunta Regionale n.5/53844 del 31-5-1994)</p>
    <div class="table-responsive">
      <table class="table table-bordered">
        <thead>
          <tr>
            <th rowspan="2">Classi tipologiche<br>(ex art. 8 D.M. 10 maggio 1977)</th>
            <th colspan="2">Comuni con più di 50.000 abitanti</th>
            <th colspan="2">Comuni con meno di 50.000 abitanti</th>
          </tr>
          <tr>
            <th>nuove costruzioni</th>
            <th>edifici esistenti (1)</th>
            <th>nuove costruzioni</th>
            <th>edifici esistenti (1)</th>
          </tr>
        </thead>
        <tbody>
          <tr data-classe-range="I,II,III">
            <td>classi I, II, III</td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="7" class="form-check-input percentuale-radio" data-tipo="nuove" data-comune=">50k" data-classe="I,II,III">
              <span class="ms-2">7</span>
            </td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="5" class="form-check-input percentuale-radio" data-tipo="esistenti" data-comune=">50k" data-classe="I,II,III">
              <span class="ms-2">5</span>
            </td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="6" class="form-check-input percentuale-radio" data-tipo="nuove" data-comune="<50k" data-classe="I,II,III">
              <span class="ms-2">6</span>
            </td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="5" class="form-check-input percentuale-radio" data-tipo="esistenti" data-comune="<50k" data-classe="I,II,III">
              <span class="ms-2">5</span>
            </td>
          </tr>
          <tr data-classe-range="IV,V,VI,VII,VIII">
            <td>classi IV, V, VI, VII, VIII</td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="10" class="form-check-input percentuale-radio" data-tipo="nuove" data-comune=">50k" data-classe="IV,V,VI,VII,VIII">
              <span class="ms-2">10</span>
            </td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="6" class="form-check-input percentuale-radio" data-tipo="esistenti" data-comune=">50k" data-classe="IV,V,VI,VII,VIII">
              <span class="ms-2">6</span>
            </td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="8" class="form-check-input percentuale-radio" data-tipo="nuove" data-comune="<50k" data-classe="IV,V,VI,VII,VIII">
              <span class="ms-2">8</span>
            </td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="6" class="form-check-input percentuale-radio" data-tipo="esistenti" data-comune="<50k" data-classe="IV,V,VI,VII,VIII">
              <span class="ms-2">6</span>
            </td>
          </tr>
          <tr data-classe-range="IX,X,XI">
            <td>classi IX, X, XI</td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="20" class="form-check-input percentuale-radio" data-tipo="nuove" data-comune=">50k" data-classe="IX,X,XI">
              <span class="ms-2">20</span>
            </td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="15" class="form-check-input percentuale-radio" data-tipo="esistenti" data-comune=">50k" data-classe="IX,X,XI">
              <span class="ms-2">15</span>
            </td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="18" class="form-check-input percentuale-radio" data-tipo="nuove" data-comune="<50k" data-classe="IX,X,XI">
              <span class="ms-2">18</span>
            </td>
            <td class="text-center" style="background-color: #ffff00;">
              <input type="radio" name="percentuale-contributo" value="10" class="form-check-input percentuale-radio" data-tipo="esistenti" data-comune="<50k" data-classe="IX,X,XI">
              <span class="ms-2">10</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="small mt-2 mb-0">(1) Interventi di restauro; risanamento conservativo ristrutturazione e ampliamento al di fuori dei casi di cui all'art. 9 della Legge 10, nonché quelli di cui all'art. 7 Legge 94/82.</p>

    <!-- Calcolo Contributo Costo di Costruzione -->
    <div class="mt-4" style="font-size: 1.5rem; font-weight: bold;">
      <div class="d-flex align-items-center gap-3">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center gap-2">
            <span><strong>Contributo Costo di Costruzione =</strong></span>
            <span>(</span>
            <span><strong><span id="contributo-costo-costruzione-display">0,00</span></strong></span>
            <span>x</span>
            <span><strong><span id="contributo-percentuale-display">0</span></strong></span>
            <span>) : 100 =</span>
            <div class="text-end" style="min-width: 150px;">
              <strong><span id="contributo-costo-costruzione-value">0,00</span></strong>
            </div>
            <span><strong>€</strong></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Calcolo degli Oneri di Urbanizzazione -->
    <div class="mt-5" style="font-size: 1.5rem; font-weight: bold;">
      <h4 class="mb-3" style="font-size: 1.5rem; font-weight: bold;"><strong>CALCOLO DEGLI ONERI DI URBANIZZAZIONE</strong></h4>
      <div class="d-flex align-items-center gap-2 flex-wrap" style="font-size: 1.5rem; font-weight: bold;">
        <div class="d-flex flex-column align-items-center">
          <label class="mb-1"><strong>ONERI PRIMARI</strong></label>
          <input type="text" id="oneri-primari-input" class="form-control text-center" value="0,00" style="background-color: #ffff00; font-weight: bold; width: 120px; font-size: 1.5rem;">
        </div>
        <span class="mt-4" style="font-size: 1.5rem; font-weight: bold;">+</span>
        <div class="d-flex flex-column align-items-center">
          <label class="mb-1"><strong>ONERI SECONDARI</strong></label>
          <input type="text" id="oneri-secondari-input" class="form-control text-center" value="0,00" style="background-color: #ffff00; font-weight: bold; width: 120px; font-size: 1.5rem;">
        </div>
        <span class="mt-4" style="font-size: 1.5rem; font-weight: bold;">+</span>
        <div class="d-flex flex-column align-items-center">
          <label class="mb-1"><strong>SMALTIMENTO RIFIUTI</strong></label>
          <input type="text" id="smaltimento-rifiuti-input" class="form-control text-center" value="0,00" style="background-color: #ffff00; font-weight: bold; width: 120px; font-size: 1.5rem;">
        </div>
        <span class="mt-4" style="font-size: 1.5rem; font-weight: bold;">=</span>
        <div class="d-flex flex-column align-items-center">
          <label class="mb-1"><strong>TOTALE</strong></label>
          <div class="text-center" style="background-color: #90ee90; font-weight: bold; width: 120px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 1.5rem;">
            <span id="oneri-totale-value">0,00</span>
          </div>
        </div>
        <span class="mt-4" style="font-size: 1.5rem; font-weight: bold;">X</span>
        <div class="d-flex flex-column align-items-center">
          <label class="mb-1"><strong>VOLUME</strong></label>
          <input type="text" id="volume-oneri-input" class="form-control text-center" value="0,00" style="background-color: #ffff00; font-weight: bold; width: 180px; font-size: 1.5rem;">
        </div>
        <span class="mt-4" style="font-size: 1.5rem; font-weight: bold;">=</span>
        <div class="d-flex flex-column align-items-center">
          <label class="mb-1"><strong>TOTALE ONERI</strong></label>
          <div class="text-center" style="background-color: #ffffff; font-weight: bold; width: 200px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 1.5rem;">
            <span id="totale-oneri-value">0,00</span> <strong>€</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- RIEPILOGO DEI COSTI -->
    <div class="mt-5">
      <h3 class="mb-3" style="font-size: 1.5rem; font-weight: bold; text-align: center;"><strong>RIEPILOGO DEI COSTI</strong></h3>
      <div class="table-responsive">
        <table class="table table-bordered" style="margin: 0 auto; max-width: 800px;">
          <thead>
            <tr>
              <th style="text-align: left; width: 60%;">Voce</th>
              <th style="text-align: right; width: 40%;">Importo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>CONTRIBUTO COSTO DI COSTRUZIONE</strong><br><span id="riepilogo-formula-contributo" style="font-size: 0.9em; color: #666; font-weight: normal;">(Costo di costruzione x Percentuale) : 100</span></td>
              <td class="text-end"><strong><span id="riepilogo-contributo-costo">0,00</span> €</strong></td>
            </tr>
            <tr>
              <td><strong>ONERI PRIMARIA</strong><br><span id="riepilogo-formula-oneri-primari" style="font-size: 0.9em; color: #666; font-weight: normal;">ONERI PRIMARI x VOLUME</span></td>
              <td class="text-end"><strong><span id="riepilogo-oneri-primari">0,00</span> €</strong></td>
            </tr>
            <tr>
              <td><strong>ONERI SECONDARIA</strong><br><span id="riepilogo-formula-oneri-secondari" style="font-size: 0.9em; color: #666; font-weight: normal;">ONERI SECONDARI x VOLUME</span></td>
              <td class="text-end"><strong><span id="riepilogo-oneri-secondari">0,00</span> €</strong></td>
            </tr>
            <tr>
              <td><strong>SMALTIMENTO RIFIUTI</strong><br><span id="riepilogo-formula-smaltimento" style="font-size: 0.9em; color: #666; font-weight: normal;">SMALTIMENTO RIFIUTI x VOLUME</span></td>
              <td class="text-end"><strong><span id="riepilogo-smaltimento-rifiuti">0,00</span> €</strong></td>
            </tr>
            <tr style="border-top: 2px solid #000;">
              <td><strong>TOTALE</strong><br><span id="riepilogo-formula-totale" style="font-size: 0.9em; color: #666; font-weight: normal;">CONTRIBUTO + ONERI PRIMARIA + ONERI SECONDARIA + SMALTIMENTO RIFIUTI</span></td>
              <td class="text-end"><strong><span id="riepilogo-totale-costi">0,00</span> €</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
  
  // Funzione per formattare numeri con separatore migliaia (formato italiano: 1.234,56)
  const formatItalianNumberWithThousands = (num, decimals = 2) => {
    const fixed = num.toFixed(decimals);
    const parts = fixed.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    
    // Aggiungi il separatore delle migliaia (punto) ogni 3 cifre
    const integerWithThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // Unisci con la virgola per i decimali
    return decimalPart ? `${integerWithThousands},${decimalPart}` : integerWithThousands;
  };
  
  // Funzione per calcolare il costo di costruzione (definita prima per essere usata in calcolaTotaleIncrementi)
  const calcolaCostoCostruzione = () => {
    const costoMqInput = container.querySelector('#costo-mq-input');
    const costoMqMaggioratoElement = container.querySelector('#costo-mq-maggiorato-value');
    const costoCostruzioneTotaleElement = container.querySelector('#costo-costruzione-totale-value');
    
    if (!costoMqInput || !costoMqMaggioratoElement || !costoCostruzioneTotaleElement) return;
    
    // Leggi il costo a mq dall'input
    const costoMq = parseItalianNumber(costoMqInput.value) || 0;
    
    // Leggi la maggiorazione percentuale (M) dalla tabella TOTALE INCREMENTI
    const maggiorazioneElement = container.querySelector('#maggiorazione-value');
    let maggiorazionePercentuale = 0;
    
    if (maggiorazioneElement) {
      const maggiorazioneText = maggiorazioneElement.textContent;
      // Estrai la percentuale dal testo (es. "maggiorazione del 5%" -> 5)
      const match = maggiorazioneText.match(/(\d+)/);
      if (match) {
        maggiorazionePercentuale = parseFloat(match[1]) || 0;
      }
    }
    
    // Calcola B: A x (1 + (M / 100))
    const costoMqMaggiorato = costoMq * (1 + (maggiorazionePercentuale / 100));
    
    // Calcola C: (Sc + St) x B
    // Sc è già calcolato: su + (snr * 0.6)
    // St è già calcolato: stNonResidenziale
    const sc = su + (snr * 0.6);
    const st = stNonResidenziale;
    const costoCostruzioneTotale = (sc + st) * costoMqMaggiorato;
    
    // Aggiorna i valori
    costoMqMaggioratoElement.textContent = formatItalianNumber(costoMqMaggiorato);
    // Formatta il costo totale con separatore migliaia
    costoCostruzioneTotaleElement.textContent = formatItalianNumberWithThousands(costoCostruzioneTotale);
    
    // Aggiorna la formula con i valori reali
    const formulaElement = container.querySelector('#formula-costo-costruzione');
    if (formulaElement) {
      const scFormatted = formatItalianNumber(sc);
      const stFormatted = formatItalianNumber(st);
      const bFormatted = formatItalianNumber(costoMqMaggiorato);
      formulaElement.textContent = `(${scFormatted} + ${stFormatted}) x ${bFormatted}`;
    }
    
    // Ricalcola il contributo costo di costruzione passando il valore calcolato
    calcolaContributoCostoCostruzione(costoCostruzioneTotale);
  };
  
  // Funzione per calcolare il contributo costo di costruzione
  const calcolaContributoCostoCostruzione = (costoCostruzioneTotaleParam = null) => {
    const contributoElement = container.querySelector('#contributo-costo-costruzione-value');
    const contributoCostoDisplay = container.querySelector('#contributo-costo-costruzione-display');
    const contributoPercentualeDisplay = container.querySelector('#contributo-percentuale-display');
    
    if (!contributoElement || !contributoCostoDisplay || !contributoPercentualeDisplay) return;
    
    // Usa il valore passato come parametro, altrimenti leggi dal DOM (rimuovendo i separatori migliaia)
    let costoCostruzioneTotale;
    if (costoCostruzioneTotaleParam !== null) {
      costoCostruzioneTotale = costoCostruzioneTotaleParam;
    } else {
      const costoCostruzioneTotaleElement = container.querySelector('#costo-costruzione-totale-value');
      if (costoCostruzioneTotaleElement) {
        // Rimuovi i separatori migliaia (punti) prima di parsare
        const valoreTesto = costoCostruzioneTotaleElement.textContent.replace(/\./g, '');
        costoCostruzioneTotale = parseItalianNumber(valoreTesto) || 0;
      } else {
        costoCostruzioneTotale = 0;
      }
    }
    
    // Leggi la percentuale regionale selezionata
    const percentualeRadioSelezionato = container.querySelector('input[name="percentuale-contributo"]:checked');
    const percentualeRegionale = percentualeRadioSelezionato ? parseFloat(percentualeRadioSelezionato.value) || 0 : 0;
    
    // Aggiorna i valori nella formula
    // Il costo nella formula deve essere uguale al valore verde (costo totale completo)
    contributoCostoDisplay.textContent = formatItalianNumberWithThousands(costoCostruzioneTotale);
    // La percentuale deve essere mostrata senza decimali (es. 6 invece di 6,00)
    contributoPercentualeDisplay.textContent = Math.round(percentualeRegionale).toString();
    
    // Calcola: (Costo di costruzione x percentuale regionale) / 100
    const contributo = (costoCostruzioneTotale * percentualeRegionale) / 100;
    
    // Aggiorna il risultato formattato con separatore migliaia
    contributoElement.textContent = formatItalianNumberWithThousands(contributo);
    
    // Aggiorna il riepilogo dei costi
    aggiornaRiepilogoCosti();
  };
  
  // Funzione per aggiornare il riepilogo dei costi
  const aggiornaRiepilogoCosti = () => {
    // Leggi il contributo costo di costruzione
    const contributoElement = container.querySelector('#contributo-costo-costruzione-value');
    const contributoCostoDisplay = container.querySelector('#contributo-costo-costruzione-display');
    const contributoPercentualeDisplay = container.querySelector('#contributo-percentuale-display');
    const contributoText = contributoElement ? contributoElement.textContent.replace(/\./g, '').replace(',', '.') : '0';
    const contributo = parseFloat(contributoText) || 0;
    
    // Leggi gli oneri (valori base, non moltiplicati per volume)
    const oneriPrimariInput = container.querySelector('#oneri-primari-input');
    const oneriSecondariInput = container.querySelector('#oneri-secondari-input');
    const smaltimentoRifiutiInput = container.querySelector('#smaltimento-rifiuti-input');
    const volumeOneriInput = container.querySelector('#volume-oneri-input');
    
    const oneriPrimariBase = parseItalianNumber(oneriPrimariInput?.value.replace(/\./g, '') || '0') || 0;
    const oneriSecondariBase = parseItalianNumber(oneriSecondariInput?.value.replace(/\./g, '') || '0') || 0;
    const smaltimentoRifiutiBase = parseItalianNumber(smaltimentoRifiutiInput?.value.replace(/\./g, '') || '0') || 0;
    const volume = parseItalianNumber(volumeOneriInput?.value.replace(/\./g, '') || '0') || 0;
    
    // Calcola gli oneri moltiplicati per volume
    const oneriPrimari = oneriPrimariBase * volume;
    const oneriSecondari = oneriSecondariBase * volume;
    const smaltimentoRifiuti = smaltimentoRifiutiBase * volume;
    
    // Calcola il totale
    const totale = contributo + oneriPrimari + oneriSecondari + smaltimentoRifiuti;
    
    // Aggiorna le formule nella colonna VOCE
    const formulaContributo = container.querySelector('#riepilogo-formula-contributo');
    const formulaOneriPrimari = container.querySelector('#riepilogo-formula-oneri-primari');
    const formulaOneriSecondari = container.querySelector('#riepilogo-formula-oneri-secondari');
    const formulaSmaltimento = container.querySelector('#riepilogo-formula-smaltimento');
    const formulaTotale = container.querySelector('#riepilogo-formula-totale');
    
    // Aggiorna formula contributo con valori reali
    if (formulaContributo && contributoCostoDisplay && contributoPercentualeDisplay) {
      const costoCostruzione = contributoCostoDisplay.textContent.replace(/\./g, '').replace(',', '.');
      const percentuale = contributoPercentualeDisplay.textContent;
      formulaContributo.textContent = `(${formatItalianNumberWithThousands(parseFloat(costoCostruzione) || 0)} x ${percentuale}) : 100`;
    }
    
    // Aggiorna formule oneri con valori reali
    if (formulaOneriPrimari) {
      formulaOneriPrimari.textContent = `${formatItalianNumber(oneriPrimariBase)} x ${formatItalianNumber(volume)}`;
    }
    if (formulaOneriSecondari) {
      formulaOneriSecondari.textContent = `${formatItalianNumber(oneriSecondariBase)} x ${formatItalianNumber(volume)}`;
    }
    if (formulaSmaltimento) {
      formulaSmaltimento.textContent = `${formatItalianNumber(smaltimentoRifiutiBase)} x ${formatItalianNumber(volume)}`;
    }
    
    // Aggiorna formula totale con valori reali
    if (formulaTotale) {
      formulaTotale.textContent = `${formatItalianNumberWithThousands(contributo)} + ${formatItalianNumberWithThousands(oneriPrimari)} + ${formatItalianNumberWithThousands(oneriSecondari)} + ${formatItalianNumberWithThousands(smaltimentoRifiuti)}`;
    }
    
    // Aggiorna la tabella riepilogo
    const riepilogoContributo = container.querySelector('#riepilogo-contributo-costo');
    const riepilogoOneriPrimari = container.querySelector('#riepilogo-oneri-primari');
    const riepilogoOneriSecondari = container.querySelector('#riepilogo-oneri-secondari');
    const riepilogoSmaltimento = container.querySelector('#riepilogo-smaltimento-rifiuti');
    const riepilogoTotale = container.querySelector('#riepilogo-totale-costi');
    
    if (riepilogoContributo) {
      riepilogoContributo.textContent = formatItalianNumberWithThousands(contributo);
    }
    if (riepilogoOneriPrimari) {
      riepilogoOneriPrimari.textContent = formatItalianNumberWithThousands(oneriPrimari);
    }
    if (riepilogoOneriSecondari) {
      riepilogoOneriSecondari.textContent = formatItalianNumberWithThousands(oneriSecondari);
    }
    if (riepilogoSmaltimento) {
      riepilogoSmaltimento.textContent = formatItalianNumberWithThousands(smaltimentoRifiuti);
    }
    if (riepilogoTotale) {
      riepilogoTotale.textContent = formatItalianNumberWithThousands(totale);
    }
  };
  
  // Calcola il totale incrementi e determina classe e maggiorazione
  const calcolaTotaleIncrementi = () => {
    // Leggi i valori di Inc. 1, Inc. 2, Inc. 3
    // inc1 è già calcolato sopra nella funzione
    const inc1Value = inc1 || 0; // Dalla TABELLA 1
    const inc2Value = incrementoArt6 || 0; // Dalla TABELLA 3
    const inc3Element = container.querySelector('#inc3-value');
    const inc3Value = inc3Element ? parseItalianNumber(inc3Element.textContent) || 0 : 0;
    
    // Calcola il totale incrementi
    const totaleIncrementi = inc1Value + inc2Value + inc3Value;
    
    // Determina la classe edificio e la maggiorazione in base all'ART. 8
    let classeEdificio = '';
    let maggiorazione = '';
    let maggiorazionePercentuale = 0;
    
    if (totaleIncrementi <= 5) {
      classeEdificio = 'I';
      maggiorazione = 'nessuna maggiorazione';
      maggiorazionePercentuale = 0;
    } else if (totaleIncrementi > 5 && totaleIncrementi <= 10) {
      classeEdificio = 'II';
      maggiorazione = 'maggiorazione del 5%';
      maggiorazionePercentuale = 5;
    } else if (totaleIncrementi > 10 && totaleIncrementi <= 15) {
      classeEdificio = 'III';
      maggiorazione = 'maggiorazione del 10%';
      maggiorazionePercentuale = 10;
    } else if (totaleIncrementi > 15 && totaleIncrementi <= 20) {
      classeEdificio = 'IV';
      maggiorazione = 'maggiorazione del 15%';
      maggiorazionePercentuale = 15;
    } else if (totaleIncrementi > 20 && totaleIncrementi <= 25) {
      classeEdificio = 'V';
      maggiorazione = 'maggiorazione del 20%';
      maggiorazionePercentuale = 20;
    } else if (totaleIncrementi > 25 && totaleIncrementi <= 30) {
      classeEdificio = 'VI';
      maggiorazione = 'maggiorazione del 25%';
      maggiorazionePercentuale = 25;
    } else if (totaleIncrementi > 30 && totaleIncrementi <= 35) {
      classeEdificio = 'VII';
      maggiorazione = 'maggiorazione del 30%';
      maggiorazionePercentuale = 30;
    } else if (totaleIncrementi > 35 && totaleIncrementi <= 40) {
      classeEdificio = 'VIII';
      maggiorazione = 'maggiorazione del 35%';
      maggiorazionePercentuale = 35;
    } else if (totaleIncrementi > 40 && totaleIncrementi <= 45) {
      classeEdificio = 'IX';
      maggiorazione = 'maggiorazione del 40%';
      maggiorazionePercentuale = 40;
    } else if (totaleIncrementi > 45 && totaleIncrementi <= 50) {
      classeEdificio = 'X';
      maggiorazione = 'maggiorazione del 45%';
      maggiorazionePercentuale = 45;
    } else if (totaleIncrementi > 50) {
      classeEdificio = 'XI';
      maggiorazione = 'maggiorazione del 50%';
      maggiorazionePercentuale = 50;
    }
    
    // Aggiorna i valori nella tabella
    const totaleIncrementiElement = container.querySelector('#totale-incrementi-value');
    const classeEdificioElement = container.querySelector('#classe-edificio-value');
    const maggiorazioneElement = container.querySelector('#maggiorazione-value');
    
    if (totaleIncrementiElement) {
      totaleIncrementiElement.textContent = formatItalianNumber(totaleIncrementi);
    }
    if (classeEdificioElement) {
      classeEdificioElement.textContent = classeEdificio;
    }
    if (maggiorazioneElement) {
      maggiorazioneElement.textContent = maggiorazione;
    }
    
    // Abilita/disabilita le righe della tabella percentuali in base alla classe edificio
    aggiornaTabellaPercentuali(classeEdificio);
    
    // Ricalcola il costo di costruzione quando cambia la maggiorazione
    calcolaCostoCostruzione();
  };
  
  // Funzione per aggiornare la tabella percentuali in base alla classe edificio
  const aggiornaTabellaPercentuali = (classeEdificio) => {
    const righeTabella = container.querySelectorAll('tr[data-classe-range]');
    
    righeTabella.forEach(riga => {
      const classiRange = riga.getAttribute('data-classe-range');
      const radioButtons = riga.querySelectorAll('.percentuale-radio');
      
      // Determina se questa riga corrisponde alla classe edificio
      let corrisponde = false;
      if (classiRange === 'I,II,III' && (classeEdificio === 'I' || classeEdificio === 'II' || classeEdificio === 'III')) {
        corrisponde = true;
      } else if (classiRange === 'IV,V,VI,VII,VIII' && (classeEdificio === 'IV' || classeEdificio === 'V' || classeEdificio === 'VI' || classeEdificio === 'VII' || classeEdificio === 'VIII')) {
        corrisponde = true;
      } else if (classiRange === 'IX,X,XI' && (classeEdificio === 'IX' || classeEdificio === 'X' || classeEdificio === 'XI')) {
        corrisponde = true;
      }
      
      // Abilita/disabilita i radio button in base alla corrispondenza
      radioButtons.forEach(radio => {
        if (corrisponde) {
          radio.disabled = false;
          radio.style.cursor = 'pointer';
        } else {
          radio.disabled = true;
          radio.style.cursor = 'not-allowed';
          radio.checked = false;
          // Resetta lo sfondo delle celle disabilitate al giallo
          const cella = radio.closest('td');
          if (cella) {
            cella.style.backgroundColor = '#ffff00';
          }
        }
      });
      
      // Applica stile visivo alla riga
      if (corrisponde) {
        riga.style.opacity = '1';
      } else {
        riga.style.opacity = '0.5';
      }
    });
  };
  
  // Funzione per salvare i dati del costo di costruzione
  const salvaDatiCostoCostruzione = () => {
    const costoMqInput = container.querySelector('#costo-mq-input');
    const oneriPrimariInput = container.querySelector('#oneri-primari-input');
    const oneriSecondariInput = container.querySelector('#oneri-secondari-input');
    const smaltimentoRifiutiInput = container.querySelector('#smaltimento-rifiuti-input');
    const volumeOneriInput = container.querySelector('#volume-oneri-input');
    const inc3Value = container.querySelector('#inc3-value');
    const percentualeRadioSelezionato = container.querySelector('input[name="percentuale-contributo"]:checked');
    
    if (dataModel.costoCostruzione) {
      if (costoMqInput) dataModel.costoCostruzione.costoMq = costoMqInput.value || '0,00';
      if (oneriPrimariInput) dataModel.costoCostruzione.oneriPrimari = oneriPrimariInput.value || '0,00';
      if (oneriSecondariInput) dataModel.costoCostruzione.oneriSecondari = oneriSecondariInput.value || '0,00';
      if (smaltimentoRifiutiInput) dataModel.costoCostruzione.smaltimentoRifiuti = smaltimentoRifiutiInput.value || '0,00';
      if (volumeOneriInput) dataModel.costoCostruzione.volume = volumeOneriInput.value || '0,00';
      if (inc3Value) dataModel.costoCostruzione.inc3 = inc3Value.textContent || '0';
      if (percentualeRadioSelezionato) {
        dataModel.costoCostruzione.percentualeContributo = percentualeRadioSelezionato.value;
      } else {
        dataModel.costoCostruzione.percentualeContributo = null;
      }
      dataModel.saveToStorage();
      scheduleAutoSave();
    }
  };
  
  // Aggiungi event listeners per i radio button della TABELLA 4
  const radioButtons = container.querySelectorAll('input[name="caratteristiche-art7"]');
  const inc3Value = container.querySelector('#inc3-value');
  
  radioButtons.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.checked) {
        const incremento = parseFloat(this.value) || 0;
        if (inc3Value) {
          inc3Value.textContent = formatItalianNumber(incremento);
        }
        // Ricalcola il totale incrementi quando cambia Inc. 3
        calcolaTotaleIncrementi();
        // Salva i dati
        salvaDatiCostoCostruzione();
      }
    });
  });
  
  // Aggiungi event listeners per i radio button delle percentuali
  const percentualiRadios = container.querySelectorAll('.percentuale-radio');
  percentualiRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.checked) {
        // Trova tutte le celle gialle della stessa riga e resettale
        const riga = this.closest('tr');
        const tutteLeCelle = riga.querySelectorAll('td');
        tutteLeCelle.forEach(cella => {
          // Controlla se la cella contiene un radio button (celle gialle)
          if (cella.querySelector('.percentuale-radio')) {
            cella.style.backgroundColor = '#ffff00'; // Reset al giallo
          }
        });
        
        // Imposta lo sfondo verde sulla cella selezionata
        const cella = this.closest('td');
        if (cella) {
          cella.style.backgroundColor = '#90ee90'; // Verde chiaro
        }
        
        // Ricalcola il contributo costo di costruzione
        calcolaContributoCostoCostruzione();
        // Salva i dati
        salvaDatiCostoCostruzione();
      }
    });
  });
  
  // Carica i dati salvati del costo di costruzione
  const caricaDatiCostoCostruzione = () => {
    if (!dataModel.costoCostruzione) return;
    
    const costoMqInput = container.querySelector('#costo-mq-input');
    const oneriPrimariInput = container.querySelector('#oneri-primari-input');
    const oneriSecondariInput = container.querySelector('#oneri-secondari-input');
    const smaltimentoRifiutiInput = container.querySelector('#smaltimento-rifiuti-input');
    const volumeOneriInput = container.querySelector('#volume-oneri-input');
    
    // Carica i valori anche se sono '0,00' o stringhe vuote (devono essere sovrascritti)
    if (costoMqInput && dataModel.costoCostruzione.costoMq !== null && dataModel.costoCostruzione.costoMq !== undefined) {
      costoMqInput.value = dataModel.costoCostruzione.costoMq;
    }
    if (oneriPrimariInput && dataModel.costoCostruzione.oneriPrimari !== null && dataModel.costoCostruzione.oneriPrimari !== undefined) {
      oneriPrimariInput.value = dataModel.costoCostruzione.oneriPrimari;
    }
    if (oneriSecondariInput && dataModel.costoCostruzione.oneriSecondari !== null && dataModel.costoCostruzione.oneriSecondari !== undefined) {
      oneriSecondariInput.value = dataModel.costoCostruzione.oneriSecondari;
    }
    if (smaltimentoRifiutiInput && dataModel.costoCostruzione.smaltimentoRifiuti !== null && dataModel.costoCostruzione.smaltimentoRifiuti !== undefined) {
      smaltimentoRifiutiInput.value = dataModel.costoCostruzione.smaltimentoRifiuti;
    }
    if (volumeOneriInput && dataModel.costoCostruzione.volume !== null && dataModel.costoCostruzione.volume !== undefined) {
      volumeOneriInput.value = dataModel.costoCostruzione.volume;
    }
    if (inc3Value && dataModel.costoCostruzione.inc3 !== null && dataModel.costoCostruzione.inc3 !== undefined) {
      inc3Value.textContent = dataModel.costoCostruzione.inc3;
      // Seleziona il radio button corrispondente
      const inc3Num = parseFloat(dataModel.costoCostruzione.inc3.replace(',', '.')) || 0;
      radioButtons.forEach(radio => {
        if (parseFloat(radio.value) === inc3Num) {
          radio.checked = true;
        }
      });
    }
    
    // Ripristina la percentuale contributo selezionata (anche se è null, per resettare la selezione)
    const percentualeRadio = container.querySelector(`input[name="percentuale-contributo"][value="${dataModel.costoCostruzione.percentualeContributo}"]`);
    if (percentualeRadio && dataModel.costoCostruzione.percentualeContributo) {
      percentualeRadio.checked = true;
      // Aggiorna lo sfondo verde
      const row = percentualeRadio.closest('tr');
      if (row) {
        const celle = row.querySelectorAll('td');
        celle.forEach(cella => {
          const radioInCella = cella.querySelector('input[type="radio"]');
          if (radioInCella && radioInCella.checked) {
            cella.style.backgroundColor = '#90ee90';
          }
        });
      }
    } else if (dataModel.costoCostruzione.percentualeContributo === null) {
      // Se la percentuale è null, deseleziona tutti i radio
      const allPercentualiRadios = container.querySelectorAll('input[name="percentuale-contributo"]');
      allPercentualiRadios.forEach(radio => {
        radio.checked = false;
        const row = radio.closest('tr');
        if (row) {
          const celle = row.querySelectorAll('td');
          celle.forEach(cella => {
            cella.style.backgroundColor = '';
          });
        }
      });
    }
  };
  
  // Aggiungi event listener per l'input del costo a mq
  const costoMqInput = container.querySelector('#costo-mq-input');
  if (costoMqInput) {
    costoMqInput.addEventListener('input', () => {
      calcolaCostoCostruzione();
      salvaDatiCostoCostruzione();
    });
    costoMqInput.addEventListener('blur', function() {
      // Formatta il valore quando perde il focus
      const valore = parseItalianNumber(this.value) || 0;
      this.value = formatItalianNumber(valore);
      calcolaCostoCostruzione();
      salvaDatiCostoCostruzione();
    });
  }
  
  // Carica i dati salvati (dopo aver impostato gli event listener)
  caricaDatiCostoCostruzione();
  
  // Imposta il valore iniziale (default 0) solo se non c'è un valore salvato
  if (inc3Value && (!dataModel.costoCostruzione || !dataModel.costoCostruzione.inc3)) {
    inc3Value.textContent = '0';
  }
  
  // Calcola il totale incrementi iniziale (questo chiamerà anche calcolaCostoCostruzione)
  calcolaTotaleIncrementi();
  
  // Calcola il contributo costo di costruzione iniziale
  calcolaContributoCostoCostruzione();
  
  // Forza il ricalcolo dopo il caricamento dei dati per assicurarsi che tutti i valori siano aggiornati
  // Usa setTimeout per assicurarsi che il DOM sia completamente aggiornato
  setTimeout(() => {
    calcolaCostoCostruzione();
    calcolaContributoCostoCostruzione();
    calcolaOneriUrbanizzazione();
    aggiornaRiepilogoCosti();
  }, 100);
  
  // Funzione per calcolare gli oneri di urbanizzazione
  const calcolaOneriUrbanizzazione = () => {
    const oneriPrimariInput = container.querySelector('#oneri-primari-input');
    const oneriSecondariInput = container.querySelector('#oneri-secondari-input');
    const smaltimentoRifiutiInput = container.querySelector('#smaltimento-rifiuti-input');
    const volumeOneriInput = container.querySelector('#volume-oneri-input');
    const oneriTotaleElement = container.querySelector('#oneri-totale-value');
    const totaleOneriElement = container.querySelector('#totale-oneri-value');
    
    if (!oneriPrimariInput || !oneriSecondariInput || !smaltimentoRifiutiInput || 
        !volumeOneriInput || !oneriTotaleElement || !totaleOneriElement) return;
    
    // Leggi i valori degli input (rimuovi separatori migliaia se presenti)
    const oneriPrimari = parseItalianNumber(oneriPrimariInput.value.replace(/\./g, '')) || 0;
    const oneriSecondari = parseItalianNumber(oneriSecondariInput.value.replace(/\./g, '')) || 0;
    const smaltimentoRifiuti = parseItalianNumber(smaltimentoRifiutiInput.value.replace(/\./g, '')) || 0;
    const volume = parseItalianNumber(volumeOneriInput.value.replace(/\./g, '')) || 0;
    
    // Calcola il totale degli oneri (somma dei 3 input)
    const totaleOneri = oneriPrimari + oneriSecondari + smaltimentoRifiuti;
    
    // Calcola il totale oneri (totale x volume)
    const totaleOneriFinale = totaleOneri * volume;
    
    // Aggiorna i valori
    oneriTotaleElement.textContent = formatItalianNumber(totaleOneri);
    totaleOneriElement.textContent = formatItalianNumberWithThousands(totaleOneriFinale);
    
    // Aggiorna il riepilogo dei costi
    aggiornaRiepilogoCosti();
  };
  
  // Aggiungi event listeners per gli input degli oneri
  const oneriPrimariInput = container.querySelector('#oneri-primari-input');
  const oneriSecondariInput = container.querySelector('#oneri-secondari-input');
  const smaltimentoRifiutiInput = container.querySelector('#smaltimento-rifiuti-input');
  const volumeOneriInput = container.querySelector('#volume-oneri-input');
  
  if (oneriPrimariInput) {
    oneriPrimariInput.addEventListener('input', () => {
      calcolaOneriUrbanizzazione();
      salvaDatiCostoCostruzione();
    });
    oneriPrimariInput.addEventListener('blur', function() {
      const valore = parseItalianNumber(this.value.replace(/\./g, '')) || 0;
      this.value = formatItalianNumber(valore);
      calcolaOneriUrbanizzazione();
      salvaDatiCostoCostruzione();
    });
  }
  
  if (oneriSecondariInput) {
    oneriSecondariInput.addEventListener('input', () => {
      calcolaOneriUrbanizzazione();
      salvaDatiCostoCostruzione();
    });
    oneriSecondariInput.addEventListener('blur', function() {
      const valore = parseItalianNumber(this.value.replace(/\./g, '')) || 0;
      this.value = formatItalianNumber(valore);
      calcolaOneriUrbanizzazione();
      salvaDatiCostoCostruzione();
    });
  }
  
  if (smaltimentoRifiutiInput) {
    smaltimentoRifiutiInput.addEventListener('input', () => {
      calcolaOneriUrbanizzazione();
      salvaDatiCostoCostruzione();
    });
    smaltimentoRifiutiInput.addEventListener('blur', function() {
      const valore = parseItalianNumber(this.value.replace(/\./g, '')) || 0;
      this.value = formatItalianNumber(valore);
      calcolaOneriUrbanizzazione();
      salvaDatiCostoCostruzione();
    });
  }
  
  if (volumeOneriInput) {
    volumeOneriInput.addEventListener('input', () => {
      calcolaOneriUrbanizzazione();
      salvaDatiCostoCostruzione();
    });
    volumeOneriInput.addEventListener('blur', function() {
      const valore = parseItalianNumber(this.value.replace(/\./g, '')) || 0;
      this.value = formatItalianNumber(valore);
      calcolaOneriUrbanizzazione();
      salvaDatiCostoCostruzione();
    });
  }
  
  // Calcola gli oneri iniziali
  calcolaOneriUrbanizzazione();
  
  // Aggiorna il riepilogo dei costi iniziale
  setTimeout(() => {
    if (typeof aggiornaRiepilogoCosti === 'function') {
      aggiornaRiepilogoCosti();
    }
  }, 200);
  
  // Aggiungi event listener per mostrare/nascondere la tabella ART. 8
  const btnToggleArt8 = container.querySelector('#btn-toggle-art8');
  const tabellaArt8 = container.querySelector('#tabella-art8');
  const btnToggleArt8Text = container.querySelector('#btn-toggle-art8-text');
  
  if (btnToggleArt8 && tabellaArt8 && btnToggleArt8Text) {
    btnToggleArt8.addEventListener('click', function(e) {
      e.preventDefault();
      const currentDisplay = window.getComputedStyle(tabellaArt8).display;
      const isVisible = currentDisplay !== 'none';
      
      if (isVisible) {
        tabellaArt8.style.display = 'none';
        btnToggleArt8Text.textContent = 'Mostra';
      } else {
        tabellaArt8.style.display = 'block';
        btnToggleArt8Text.textContent = 'Nascondi';
      }
    });
  }
  
  // Aggiungi event listener per il pulsante di stampa
  const btnStampa = container.querySelector('#btn-stampa-costo-costruzione');
  if (btnStampa) {
    btnStampa.addEventListener('click', () => {
      // Leggi i valori dal DOM al momento della stampa per avere i dati più aggiornati
      const inc3Element = container.querySelector('#inc3-value');
      const inc3Value = inc3Element ? parseItalianNumber(inc3Element.textContent) || 0 : 0;
      
      const totaleIncrementiElement = container.querySelector('#totale-incrementi-value');
      const totaleIncrementi = totaleIncrementiElement ? parseItalianNumber(totaleIncrementiElement.textContent) || 0 : 0;
      
      const classeEdificioElement = container.querySelector('#classe-edificio-value');
      const classeEdificio = classeEdificioElement ? classeEdificioElement.textContent || '-' : '-';
      
      const maggiorazioneElement = container.querySelector('#maggiorazione-value');
      const maggiorazione = maggiorazioneElement ? maggiorazioneElement.textContent || '-' : '-';
      
      const costoMqInput = container.querySelector('#costo-mq-input');
      const costoMq = costoMqInput ? parseItalianNumber(costoMqInput.value) || 0 : 0;
      
      const costoMqMaggioratoElement = container.querySelector('#costo-mq-maggiorato-value');
      const costoMqMaggiorato = costoMqMaggioratoElement ? parseItalianNumber(costoMqMaggioratoElement.textContent.replace(/\./g, '')) || 0 : 0;
      
      const costoCostruzioneTotaleElement = container.querySelector('#costo-costruzione-totale-value');
      const costoCostruzioneTotale = costoCostruzioneTotaleElement ? parseItalianNumber(costoCostruzioneTotaleElement.textContent.replace(/\./g, '')) || 0 : 0;
      
      // Leggi la percentuale selezionata e il contributo
      const percentualeRadioSelezionato = container.querySelector('input[name="percentuale-contributo"]:checked');
      const percentualeSelezionata = percentualeRadioSelezionato ? parseFloat(percentualeRadioSelezionato.value) || 0 : 0;
      const percentualeRow = percentualeRadioSelezionato ? percentualeRadioSelezionato.closest('tr') : null;
      const classeRange = percentualeRow ? percentualeRow.getAttribute('data-classe-range') || '' : '';
      const tipoCostruzione = percentualeRadioSelezionato ? percentualeRadioSelezionato.getAttribute('data-tipo') || '' : '';
      const comune = percentualeRadioSelezionato ? percentualeRadioSelezionato.getAttribute('data-comune') || '' : '';
      
      const contributoElement = container.querySelector('#contributo-costo-costruzione-value');
      const contributoDaVersare = contributoElement ? parseItalianNumber(contributoElement.textContent.replace(/\./g, '')) || 0 : 0;
      
      // Leggi i valori degli oneri di urbanizzazione
      const oneriPrimariInput = container.querySelector('#oneri-primari-input');
      const oneriSecondariInput = container.querySelector('#oneri-secondari-input');
      const smaltimentoRifiutiInput = container.querySelector('#smaltimento-rifiuti-input');
      const volumeOneriInput = container.querySelector('#volume-oneri-input');
      const totaleOneriElement = container.querySelector('#totale-oneri-value');
      
      const oneriPrimari = oneriPrimariInput ? parseItalianNumber(oneriPrimariInput.value.replace(/\./g, '')) || 0 : 0;
      const oneriSecondari = oneriSecondariInput ? parseItalianNumber(oneriSecondariInput.value.replace(/\./g, '')) || 0 : 0;
      const smaltimentoRifiuti = smaltimentoRifiutiInput ? parseItalianNumber(smaltimentoRifiutiInput.value.replace(/\./g, '')) || 0 : 0;
      const volumeOneri = volumeOneriInput ? parseItalianNumber(volumeOneriInput.value.replace(/\./g, '')) || 0 : 0;
      const totaleOneri = totaleOneriElement ? parseItalianNumber(totaleOneriElement.textContent.replace(/\./g, '')) || 0 : 0;
      
      // Calcola la somma degli oneri (prima della moltiplicazione per volume)
      const sommaOneri = oneriPrimari + oneriSecondari + smaltimentoRifiuti;
      
      // Calcola Sc e St
      const sc = su + (snr * 0.6);
      const st = stNonResidenziale;
      
      stampaCostoCostruzione({
        totaliColonne,
        conteggiColonne,
        rapportiPerClasse,
        incrementiCalcolati,
        inc1,
        inc2: incrementoArt6,
        inc3: inc3Value,
        totaleIncrementi,
        classeEdificio,
        maggiorazione,
        su,
        snr,
        rapportoSnrSu,
        intervalloSnrSu,
        incrementoArt6,
        sc,
        st,
        suNonResidenziale,
        saNonResidenziale,
        stNonResidenziale,
        costoMq,
        costoMqMaggiorato,
        costoCostruzioneTotale,
        percentualeSelezionata,
        classeRange,
        tipoCostruzione,
        comune,
        contributoDaVersare,
        oneriPrimari,
        oneriSecondari,
        smaltimentoRifiuti,
        volumeOneri,
        sommaOneri,
        totaleOneri,
        container
      });
    });
  }
}

// Funzione per stampare il costo di costruzione su A4 verticale
function stampaCostoCostruzione(dati) {
  const {
    totaliColonne,
    conteggiColonne,
    rapportiPerClasse,
    incrementiCalcolati,
    inc1,
    inc2,
    inc3,
    totaleIncrementi,
    classeEdificio,
    maggiorazione,
    su,
    snr,
    rapportoSnrSu,
    intervalloSnrSu,
    incrementoArt6,
    sc,
    st,
    suNonResidenziale,
    saNonResidenziale,
    stNonResidenziale,
    costoMq,
    costoMqMaggiorato,
    costoCostruzioneTotale,
    percentualeSelezionata,
    classeRange,
    tipoCostruzione,
    comune,
    contributoDaVersare,
    oneriPrimari,
    oneriSecondari,
    smaltimentoRifiuti,
    volumeOneri,
    sommaOneri,
    totaleOneri
  } = dati;
  
  // Formatta tutti i valori prima di inserirli nell'HTML
  const formatVal = (val) => formatItalianNumber(val);
  
  // Formatta i valori monetari con separatore migliaia e simbolo euro
  const formatEuro = (val) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    const fixed = num.toFixed(2);
    const parts = fixed.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '00';
    
    // Aggiungi il separatore delle migliaia (punto) ogni 3 cifre
    const integerWithThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // Unisci con la virgola per i decimali e aggiungi il simbolo euro
    return `${integerWithThousands},${decimalPart} €`;
  };
  
  // Calcola i valori combinati per la Tabella 2 come nell'immagine
  // La riga a) include: Accessori + Box Sing. + Box Col.
  const accessoriTotali = totaliColonne['Accessori'] + totaliColonne['Box Sing.'] + totaliColonne['Box Col.'];
  const androniPorticati = totaliColonne['Androni'] + totaliColonne['Porticati'];
  const loggeBalconi = totaliColonne['Logge'] + totaliColonne['Balconi'];
  
  // Calcola 60% Snr
  const snr60 = snr * 0.6;
  
  // Calcola 60% Sa
  const sa60 = saNonResidenziale * 0.6;
  
  // Genera HTML per la stampa seguendo esattamente il layout dell'immagine
  const printHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Stampa Costo di Costruzione</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 1cm 1.5cm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: 100%;
      height: auto;
      overflow: visible;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 8.5pt;
      margin: 0;
      padding: 0;
      line-height: 1.25;
      background: white;
    }
    
    .page {
      page-break-after: always;
      width: 100%;
      height: 100%;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    h2 {
      font-size: 11pt;
      font-weight: bold;
      margin: 2px 0;
      text-align: center;
      line-height: 1.25;
    }
    
    h3 {
      font-size: 9pt;
      font-weight: bold;
      margin: 2px 0 1px 0;
      text-align: center;
      line-height: 1.2;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 3px;
      font-size: 7.5pt;
    }
    
    table th, table td {
      border: 1px solid #000;
      padding: 2px;
      text-align: center;
      vertical-align: middle;
      line-height: 1.15;
    }
    
    table thead th {
      background-color: #e0e0e0;
      font-weight: bold;
      font-size: 7.5pt;
      padding: 2px;
    }
    
    .table-totale td {
      background-color: #00FFFF;
      font-weight: bold;
    }
    
    .tabella-container {
      display: flex;
      gap: 4px;
      margin-top: 3px;
    }
    
    .tabella-60 {
      width: 60%;
    }
    
    .tabella-40 {
      width: 40%;
    }
    
    .formula-snr-su {
      margin-top: 2px;
      font-weight: bold;
      font-size: 8.5pt;
      text-align: left;
      line-height: 1.2;
    }
    
    .sezione-container {
      display: flex;
      gap: 4px;
      margin-top: 3px;
    }
    
    .sezione-sinistra {
      width: 50%;
    }
    
    .sezione-destra {
      width: 50%;
    }
    
    .formule-container {
      margin-top: 3px;
      font-size: 8.5pt;
      line-height: 1.25;
    }
    
    .formula-riga {
      margin: 1px 0;
      padding: 0;
      line-height: 1.25;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      
      .page {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <!-- PAGINA 1 -->
  <div class="page">
    <!-- Titolo principale -->
    <h2>TABELLA (All.1)</h2>
    <h2>Per la determinazione del contributo commisurato al costo di costruzione</h2>
    
    <!-- Tabella 1 - In alto a tutta larghezza -->
    <h3>TABELLA 1 - Incremento per superficie utile abitabile (art. 5)</h3>
    <table>
      <thead>
        <tr>
          <th>(1)<br>Classi di Superficie (mq)</th>
          <th>(2)<br>Alloggi (n)</th>
          <th>(3)<br>Sup. Utile abitabile (mq)</th>
          <th>(4)<br>Rapporto rispetto al totale s.u.</th>
          <th>(5)<br>% incremento (art.2)</th>
          <th>(6)<br>% incremento per classi di superficie</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>&lt;95</td>
          <td>${conteggiColonne['<95']}</td>
          <td>${formatVal(totaliColonne['<95'])}</td>
          <td>${formatVal(rapportiPerClasse['<95'])}</td>
          <td>0</td>
          <td>${formatVal(incrementiCalcolati['<95'])}</td>
        </tr>
        <tr>
          <td>&gt;95 - 110</td>
          <td>${conteggiColonne['95-110']}</td>
          <td>${formatVal(totaliColonne['95-110'])}</td>
          <td>${formatVal(rapportiPerClasse['95-110'])}</td>
          <td>5</td>
          <td>${formatVal(incrementiCalcolati['95-110'])}</td>
        </tr>
        <tr>
          <td>&gt;110 - 130</td>
          <td>${conteggiColonne['110-130']}</td>
          <td>${formatVal(totaliColonne['110-130'])}</td>
          <td>${formatVal(rapportiPerClasse['110-130'])}</td>
          <td>15</td>
          <td>${formatVal(incrementiCalcolati['110-130'])}</td>
        </tr>
        <tr>
          <td>&gt;130 - 160</td>
          <td>${conteggiColonne['130-160']}</td>
          <td>${formatVal(totaliColonne['130-160'])}</td>
          <td>${formatVal(rapportiPerClasse['130-160'])}</td>
          <td>30</td>
          <td>${formatVal(incrementiCalcolati['130-160'])}</td>
        </tr>
        <tr>
          <td>&gt;160</td>
          <td>${conteggiColonne['>160']}</td>
          <td>${formatVal(totaliColonne['>160'])}</td>
          <td>${formatVal(rapportiPerClasse['>160'])}</td>
          <td>50</td>
          <td>${formatVal(incrementiCalcolati['>160'])}</td>
        </tr>
        <tr class="table-totale">
          <td></td>
          <td></td>
          <td><strong>s.u.</strong></td>
          <td></td>
          <td></td>
          <td><strong>somma---&gt; i1</strong></td>
        </tr>
        <tr class="table-totale">
          <td></td>
          <td></td>
          <td><strong>${formatVal(su)}</strong></td>
          <td></td>
          <td></td>
          <td><strong>${formatVal(inc1)}</strong></td>
        </tr>
      </tbody>
    </table>
    
    <!-- Tabella 2 e Tabella 3 affiancate -->
    <div class="tabella-container">
      <!-- Tabella 2 - 60% -->
      <div class="tabella-60">
        <h3>Tabella 2 - superfici per servizi e accessori relativi alla parte residenziale (art.2)</h3>
        <table>
          <thead>
            <tr>
              <th>(7)<br>DESTINAZIONI</th>
              <th>(8)<br>Superficie netta di servizi accessori</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: left;">a) Cantinole, soffitte, locali motore ascensore, cabine idriche, lavatoi comuni, centrali termiche e altri locali a stretto servizio della residenza.</td>
              <td>${formatVal(accessoriTotali)}</td>
            </tr>
            <tr>
              <td style="text-align: left;">b) Androni d'ingresso e porticati liberi</td>
              <td>${formatVal(androniPorticati)}</td>
            </tr>
            <tr>
              <td style="text-align: left;">c) Logge e balconi</td>
              <td>${formatVal(loggeBalconi)}</td>
            </tr>
            <tr class="table-totale">
              <td><strong>s.n.r.</strong></td>
              <td><strong>${formatVal(snr)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="formula-snr-su">
          (Snr / Su) x 100 = ${formatVal(rapportoSnrSu)}
        </div>
      </div>
      
      <!-- Tabella 3 - 40% -->
      <div class="tabella-40">
        <h3>Tabella 3 - Incremento per servizi ed accessori relativi alla parte residenziale (art.6)</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 55%;">(9)<br>Interventi di viabilità del rapporto percentuale s.n.r./s.u. X 100</th>
              <th style="width: 15%;">(10)</th>
              <th style="width: 30%;">(11)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>&lt; 50</td>
              <td>${intervalloSnrSu === '< 50' ? 'X' : ''}</td>
              <td>0</td>
            </tr>
            <tr>
              <td>&gt;50 - 75</td>
              <td>${intervalloSnrSu === '>50 <75' ? 'X' : ''}</td>
              <td>10</td>
            </tr>
            <tr>
              <td>&gt;75 - 100</td>
              <td>${intervalloSnrSu === '>75 <100' ? 'X' : ''}</td>
              <td>20</td>
            </tr>
            <tr>
              <td>&gt;100</td>
              <td>${intervalloSnrSu === '>100' ? 'X' : ''}</td>
              <td>30</td>
            </tr>
            <tr class="table-totale">
              <td></td>
              <td></td>
              <td><strong>i2</strong></td>
            </tr>
            <tr class="table-totale">
              <td></td>
              <td></td>
              <td><strong>${formatVal(inc2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Sezione Superfici Residenziali e Tabella 4 affiancate -->
    <div class="sezione-container">
      <!-- Superfici Residenziali - Sinistra -->
      <div class="sezione-sinistra">
        <h3>SUPERFICI RESIDENZIALI E RELATIVI SERVIZI ED ACCESSORI</h3>
        <table>
          <thead>
            <tr>
              <th>(17)<br>SIGLA</th>
              <th>(18)<br>Denominazione</th>
              <th>(19)<br>Superficie (mq)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>s.u. (art.3)</td>
              <td>${formatVal(su)}</td>
            </tr>
            <tr>
              <td>2</td>
              <td>s.n.r. (art 2)</td>
              <td>${formatVal(snr)}</td>
            </tr>
            <tr>
              <td>3</td>
              <td>60% s.n.r.</td>
              <td>${formatVal(snr60)}</td>
            </tr>
            <tr class="table-totale">
              <td>4=1+3</td>
              <td><strong>s.c. (art 2)</strong></td>
              <td><strong>${formatVal(sc)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Tabella 4 - Destra -->
      <div class="sezione-destra">
        <h3>Tabella 4 - Incremento per particolari caratteristiche (art.7)</h3>
        <table>
          <thead>
            <tr>
              <th>Numero di caratteristiche</th>
              <th>(13)</th>
              <th>(14)<br>% incremento</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>0</td>
              <td>${inc3 === 0 ? 'X' : ''}</td>
              <td>0</td>
            </tr>
            <tr>
              <td>1</td>
              <td>${inc3 === 10 ? 'X' : ''}</td>
              <td>10</td>
            </tr>
            <tr>
              <td>2</td>
              <td>${inc3 === 20 ? 'X' : ''}</td>
              <td>20</td>
            </tr>
            <tr>
              <td>3</td>
              <td>${inc3 === 30 ? 'X' : ''}</td>
              <td>30</td>
            </tr>
            <tr>
              <td>4</td>
              <td>${inc3 === 40 ? 'X' : ''}</td>
              <td>40</td>
            </tr>
            <tr>
              <td>5</td>
              <td>${inc3 === 50 ? 'X' : ''}</td>
              <td>50</td>
            </tr>
            <tr class="table-totale">
              <td></td>
              <td></td>
              <td><strong>i3</strong></td>
            </tr>
            <tr class="table-totale">
              <td></td>
              <td></td>
              <td><strong>${formatVal(inc3)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Superfici per attività turistiche commerciali -->
    <h3>SUPERFICI PER ATTIVITA' TURISTICHE COMMERCIALI E DIREZIONALI E ACCESSORI</h3>
    <table>
      <thead>
        <tr>
          <th>(20)</th>
          <th>(21)<br>Denominazione</th>
          <th>(22)<br>Superficie (mq)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>s.u. (art.9)</td>
          <td>${formatVal(suNonResidenziale)}</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Sa (art 9)</td>
          <td>${formatVal(saNonResidenziale)}</td>
        </tr>
        <tr>
          <td>3</td>
          <td>60% Sa</td>
          <td>${formatVal(sa60)}</td>
        </tr>
        <tr class="table-totale">
          <td>4=1+3</td>
          <td><strong>St (art 9)</strong></td>
          <td><strong>${formatVal(st)}</strong></td>
        </tr>
      </tbody>
    </table>
    
    <!-- Totale Incrementi e Classe Edificio -->
    <h3>TOTALE INCREMENTI i = i1+i2+i3 = ${formatVal(totaleIncrementi)}</h3>
    <table style="width: 50%; margin: 0 auto;">
      <thead>
        <tr>
          <th>Classe edificio (15)</th>
          <th>Maggiorazione % (16)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${classeEdificio}</td>
          <td>${maggiorazione}</td>
        </tr>
      </tbody>
    </table>
    
    <!-- Formule A, B, C -->
    <div class="formule-container" style="margin-top: 6px;">
      <div class="formula-riga">
        <strong>A - Costo a mq. di costruzione</strong> (Delib.Giunta Regionale n. 5/53844 del 31-5-1994) = <strong>${formatEuro(costoMq)}</strong>
      </div>
      <div class="formula-riga">
        <strong>B - Costo a mq. di costruzione maggiorato</strong> A x ((1+(M : 100))) = <strong>${formatEuro(costoMqMaggiorato)}</strong>
      </div>
      <div class="formula-riga">
        <strong>C - Costo di costruzione dell'edificio</strong> (Sc +St) x B = <strong>${formatEuro(costoCostruzioneTotale)}</strong>
      </div>
    </div>
    
    <!-- Tabella Percentuali del Costo di Costruzione -->
    <h3>PERCENTUALI DEL COSTO DI COSTRUZIONE PER LA DETERMINAZIONE DEL CONTRIBUTO AFFERENTE ALLA CONCESSIONE EDILIZIA</h3>
    <p style="font-size: 7pt; margin: 1px 0 2px 0; text-align: center;">(Art. 3 e 6 della Legge 28 gennaio 1977, n. 10; Delib. Giunta Regionale n.5/53844 del 31-5-1994)</p>
    <table>
      <thead>
        <tr>
          <th rowspan="2">Classi tipologiche<br>(ex art. 8 D.M. 10 maggio 1977)</th>
          <th colspan="2">Comuni con più di 50.000 abitanti</th>
          <th colspan="2">Comuni con meno di 50.000 abitanti</th>
        </tr>
        <tr>
          <th>nuove costruzioni</th>
          <th>edifici esistenti (1)</th>
          <th>nuove costruzioni</th>
          <th>edifici esistenti (1)</th>
        </tr>
      </thead>
      <tbody>
        <tr data-classe-range="I,II,III" ${classeRange === 'I,II,III' && ((tipoCostruzione === 'nuove' && comune === '>50k') || (tipoCostruzione === 'esistenti' && comune === '>50k') || (tipoCostruzione === 'nuove' && comune === '<50k') || (tipoCostruzione === 'esistenti' && comune === '<50k')) ? 'style="background-color: #ffff99;"' : ''}>
          <td>classi I, II, III</td>
          <td class="text-center" ${tipoCostruzione === 'nuove' && comune === '>50k' && percentualeSelezionata === 7 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>7</td>
          <td class="text-center" ${tipoCostruzione === 'esistenti' && comune === '>50k' && percentualeSelezionata === 5 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>5</td>
          <td class="text-center" ${tipoCostruzione === 'nuove' && comune === '<50k' && percentualeSelezionata === 6 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>6</td>
          <td class="text-center" ${tipoCostruzione === 'esistenti' && comune === '<50k' && percentualeSelezionata === 5 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>5</td>
        </tr>
        <tr data-classe-range="IV,V,VI,VII,VIII" ${classeRange === 'IV,V,VI,VII,VIII' && ((tipoCostruzione === 'nuove' && comune === '>50k') || (tipoCostruzione === 'esistenti' && comune === '>50k') || (tipoCostruzione === 'nuove' && comune === '<50k') || (tipoCostruzione === 'esistenti' && comune === '<50k')) ? 'style="background-color: #ffff99;"' : ''}>
          <td>classi IV, V, VI, VII, VIII</td>
          <td class="text-center" ${tipoCostruzione === 'nuove' && comune === '>50k' && percentualeSelezionata === 10 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>10</td>
          <td class="text-center" ${tipoCostruzione === 'esistenti' && comune === '>50k' && percentualeSelezionata === 6 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>6</td>
          <td class="text-center" ${tipoCostruzione === 'nuove' && comune === '<50k' && percentualeSelezionata === 8 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>8</td>
          <td class="text-center" ${tipoCostruzione === 'esistenti' && comune === '<50k' && percentualeSelezionata === 6 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>6</td>
        </tr>
        <tr data-classe-range="IX,X,XI" ${classeRange === 'IX,X,XI' && ((tipoCostruzione === 'nuove' && comune === '>50k') || (tipoCostruzione === 'esistenti' && comune === '>50k') || (tipoCostruzione === 'nuove' && comune === '<50k') || (tipoCostruzione === 'esistenti' && comune === '<50k')) ? 'style="background-color: #ffff99;"' : ''}>
          <td>classi IX, X, XI</td>
          <td class="text-center" ${tipoCostruzione === 'nuove' && comune === '>50k' && percentualeSelezionata === 20 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>20</td>
          <td class="text-center" ${tipoCostruzione === 'esistenti' && comune === '>50k' && percentualeSelezionata === 15 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>15</td>
          <td class="text-center" ${tipoCostruzione === 'nuove' && comune === '<50k' && percentualeSelezionata === 18 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>18</td>
          <td class="text-center" ${tipoCostruzione === 'esistenti' && comune === '<50k' && percentualeSelezionata === 10 ? 'style="background-color: #ffff00; font-weight: bold;"' : ''}>10</td>
        </tr>
      </tbody>
    </table>
    <p style="font-size: 7pt; margin: 1px 0 2px 0;">(1) Interventi di restauro; risanamento conservativo ristrutturazione e ampliamento al di fuori dei casi di cui all'art. 9 della Legge 10, nonché quelli di cui all'art. 7 Legge 94/82.</p>
    
    <!-- Calcolo Contributo -->
    <div class="formule-container" style="margin-top: 2px; border: 1px solid #000; padding: 4px;">
      <div class="formula-riga" style="margin-bottom: 5px; font-size: 9pt; font-weight: bold; text-align: center;">
        (Costo di costruzione x percentuale regionale) : 100 = Contributo Costo di Costruzione
      </div>
      <div class="formula-riga" style="display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 10pt; flex-wrap: nowrap;">
        <span style="border: 1px solid #000; padding: 4px 12px; flex: 1 1 auto; min-width: 120px; text-align: center; display: inline-block; font-size: 10pt;">${formatEuro(costoCostruzioneTotale)}</span>
        <span style="font-size: 10pt; font-weight: bold;">x</span>
        <span style="border: 1px solid #000; padding: 4px 12px; flex: 0 0 auto; min-width: 50px; text-align: center; display: inline-block; font-size: 10pt;">${percentualeSelezionata > 0 ? percentualeSelezionata : ''}</span>
        <span style="font-size: 10pt;">)</span>
        <span style="font-size: 10pt;">:</span>
        <span style="font-size: 10pt;">100</span>
        <span style="font-size: 10pt; font-weight: bold;">=</span>
        <span style="border: 1px solid #000; padding: 4px 12px; flex: 1 1 auto; min-width: 120px; text-align: center; display: inline-block; font-weight: bold; font-size: 10pt;">${formatEuro(contributoDaVersare)}</span>
      </div>
    </div>
  </div>
  
  <!-- PAGINA 2 -->
  <div class="page">
    <h3 style="margin-top: 0;">2) CALCOLO DEGLI ONERI DI URBANIZZAZIONE</h3>
    
    <!-- Sezione TARIFFA -->
    <div style="margin-bottom: 8px;">
      <div style="font-weight: bold; margin-bottom: 4px; font-size: 9pt;">TARIFFA</div>
      <div style="display: flex; flex-direction: column; gap: 3px;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="min-width: 150px; font-size: 8.5pt;">Urbanizzazione I</span>
          <span style="border: 1px solid #000; padding: 3px 10px; flex: 0 0 auto; min-width: 120px; text-align: center; display: inline-block; font-size: 9pt;">${formatVal(oneriPrimari)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="min-width: 150px; font-size: 8.5pt;">Urbanizzazione II</span>
          <span style="border: 1px solid #000; padding: 3px 10px; flex: 0 0 auto; min-width: 120px; text-align: center; display: inline-block; font-size: 9pt;">${formatVal(oneriSecondari)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="min-width: 150px; font-size: 8.5pt;">Smaltimento rifiuti</span>
          <span style="border: 1px solid #000; padding: 3px 10px; flex: 0 0 auto; min-width: 120px; text-align: center; display: inline-block; font-size: 9pt;">${formatVal(smaltimentoRifiuti)}</span>
        </div>
      </div>
      <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
    </div>
    
    <!-- Sezione SOMMANO -->
    <div style="margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 5px; font-size: 9pt;">
        <span style="min-width: 150px; font-weight: bold;">SOMMANO</span>
        <span style="border: 1px solid #000; padding: 3px 10px; flex: 0 0 auto; min-width: 120px; text-align: center; display: inline-block; font-size: 9pt;">${formatVal(sommaOneri)}</span>
        <span>x</span>
        <span style="font-size: 8.5pt;">mc. (o) mq.</span>
        <span style="border: 1px solid #000; padding: 3px 10px; flex: 0 0 auto; min-width: 120px; text-align: center; display: inline-block; font-size: 9pt;">${formatVal(volumeOneri)}</span>
        <span>=</span>
        <span style="border: 1px solid #000; padding: 3px 10px; flex: 0 0 auto; min-width: 120px; text-align: center; display: inline-block; font-weight: bold; font-size: 9pt;">${formatEuro(totaleOneri)}</span>
      </div>
      <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
    </div>
    
    <!-- Sezione TOTALE CONTRIBUTI -->
    <div style="margin-top: 10px;">
      <div style="font-weight: bold; margin-bottom: 4px; font-size: 9pt;">TOTALE CONTRIBUTI</div>
      <div style="display: flex; flex-direction: column; gap: 3px;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="min-width: 150px; font-size: 8.5pt;">Totale costo di costruzione</span>
          <span style="border: 1px solid #000; padding: 3px 10px; flex: 0 0 auto; min-width: 120px; text-align: center; display: inline-block; font-size: 9pt;">${formatEuro(contributoDaVersare)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="min-width: 150px; font-size: 8.5pt;">Totale Oneri</span>
          <span style="border: 1px solid #000; padding: 3px 10px; flex: 0 0 auto; min-width: 120px; text-align: center; display: inline-block; font-size: 9pt;">${formatEuro(totaleOneri)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="min-width: 150px; font-weight: bold; font-size: 8.5pt;">TOTALE</span>
          <span style="border: 1px solid #000; padding: 3px 10px; flex: 0 0 auto; min-width: 120px; text-align: center; display: inline-block; font-weight: bold; font-size: 9pt;">${formatEuro(contributoDaVersare + totaleOneri)}</span>
        </div>
      </div>
    </div>
    
    <!-- Tabella ART. 8 DECRETO MINISTERIALE 10 MAGGIO 1977 -->
    <div style="margin-top: 15px; page-break-inside: avoid;">
      <h3 style="margin-top: 10px; margin-bottom: 5px; font-size: 9pt; text-align: left;">ART. 8 DECRETO MINISTERIALE 10 MAGGIO 1977</h3>
      <p style="font-size: 7.5pt; margin: 2px 0 8px 0; text-align: justify;">
        Le classi di edifici e le relative maggiorazioni di costo di cui al secondo comma dell'art. 6 della legge 28 gennaio 1977 n° 10, sono così individuate:
      </p>
      <table style="width: 100%; margin-top: 5px; font-size: 8pt;">
        <thead>
          <tr>
            <th style="width: 15%; text-align: center; border: 1px solid #000; padding: 4px; background-color: #e0e0e0;">Classe</th>
            <th style="width: 45%; text-align: left; border: 1px solid #000; padding: 4px; background-color: #e0e0e0;">Percentuale di incremento</th>
            <th style="width: 40%; text-align: left; border: 1px solid #000; padding: 4px; background-color: #e0e0e0;">Maggiorazione</th>
          </tr>
        </thead>
        <tbody>
          <tr ${classeEdificio === 'I' ? 'style="background-color: #ffff99; border: 2px solid #000;"' : ''}>
            <td style="text-align: center; border: ${classeEdificio === 'I' ? '2px' : '1px'} solid #000; padding: 3px; font-weight: ${classeEdificio === 'I' ? 'bold' : 'normal'};">I</td>
            <td style="text-align: left; border: ${classeEdificio === 'I' ? '2px' : '1px'} solid #000; padding: 3px;">fino a 5 inclusa</td>
            <td style="text-align: left; border: ${classeEdificio === 'I' ? '2px' : '1px'} solid #000; padding: 3px;">nessuna maggiorazione</td>
          </tr>
          <tr ${classeEdificio === 'II' ? 'style="background-color: #ffff99; border: 2px solid #000;"' : ''}>
            <td style="text-align: center; border: ${classeEdificio === 'II' ? '2px' : '1px'} solid #000; padding: 3px; font-weight: ${classeEdificio === 'II' ? 'bold' : 'normal'};">II</td>
            <td style="text-align: left; border: ${classeEdificio === 'II' ? '2px' : '1px'} solid #000; padding: 3px;">da 5 a 10 inclusa</td>
            <td style="text-align: left; border: ${classeEdificio === 'II' ? '2px' : '1px'} solid #000; padding: 3px;">maggiorazione del 5%</td>
          </tr>
          <tr ${classeEdificio === 'III' ? 'style="background-color: #ffff99; border: 2px solid #000;"' : ''}>
            <td style="text-align: center; border: ${classeEdificio === 'III' ? '2px' : '1px'} solid #000; padding: 3px; font-weight: ${classeEdificio === 'III' ? 'bold' : 'normal'};">III</td>
            <td style="text-align: left; border: ${classeEdificio === 'III' ? '2px' : '1px'} solid #000; padding: 3px;">da 10 a 15 inclusa</td>
            <td style="text-align: left; border: ${classeEdificio === 'III' ? '2px' : '1px'} solid #000; padding: 3px;">maggiorazione del 10%</td>
          </tr>
          <tr ${classeEdificio === 'IV' ? 'style="background-color: #ffff99; border: 2px solid #000;"' : ''}>
            <td style="text-align: center; border: ${classeEdificio === 'IV' ? '2px' : '1px'} solid #000; padding: 3px; font-weight: ${classeEdificio === 'IV' ? 'bold' : 'normal'};">IV</td>
            <td style="text-align: left; border: ${classeEdificio === 'IV' ? '2px' : '1px'} solid #000; padding: 3px;">da 15 a 20 inclusa</td>
            <td style="text-align: left; border: ${classeEdificio === 'IV' ? '2px' : '1px'} solid #000; padding: 3px;">maggiorazione del 15%</td>
          </tr>
          <tr ${classeEdificio === 'V' ? 'style="background-color: #ffff99; border: 2px solid #000;"' : ''}>
            <td style="text-align: center; border: ${classeEdificio === 'V' ? '2px' : '1px'} solid #000; padding: 3px; font-weight: ${classeEdificio === 'V' ? 'bold' : 'normal'};">V</td>
            <td style="text-align: left; border: ${classeEdificio === 'V' ? '2px' : '1px'} solid #000; padding: 3px;">da 20 a 25 inclusa</td>
            <td style="text-align: left; border: ${classeEdificio === 'V' ? '2px' : '1px'} solid #000; padding: 3px;">maggiorazione del 20%</td>
          </tr>
          <tr ${classeEdificio === 'VI' ? 'style="background-color: #ffff99; border: 2px solid #000;"' : ''}>
            <td style="text-align: center; border: ${classeEdificio === 'VI' ? '2px' : '1px'} solid #000; padding: 3px; font-weight: ${classeEdificio === 'VI' ? 'bold' : 'normal'};">VI</td>
            <td style="text-align: left; border: ${classeEdificio === 'VI' ? '2px' : '1px'} solid #000; padding: 3px;">da 25 a 30 inclusa</td>
            <td style="text-align: left; border: ${classeEdificio === 'VI' ? '2px' : '1px'} solid #000; padding: 3px;">maggiorazione del 25%</td>
          </tr>
          <tr ${classeEdificio === 'VII' ? 'style="background-color: #ffff99; border: 2px solid #000;"' : ''}>
            <td style="text-align: center; border: ${classeEdificio === 'VII' ? '2px' : '1px'} solid #000; padding: 3px; font-weight: ${classeEdificio === 'VII' ? 'bold' : 'normal'};">VII</td>
            <td style="text-align: left; border: ${classeEdificio === 'VII' ? '2px' : '1px'} solid #000; padding: 3px;">da 30 a 35 inclusa</td>
            <td style="text-align: left; border: ${classeEdificio === 'VII' ? '2px' : '1px'} solid #000; padding: 3px;">maggiorazione del 30%</td>
          </tr>
          <tr ${classeEdificio === 'VIII' ? 'style="background-color: #ffff99; border: 2px solid #000;"' : ''}>
            <td style="text-align: center; border: ${classeEdificio === 'VIII' ? '2px' : '1px'} solid #000; padding: 3px; font-weight: ${classeEdificio === 'VIII' ? 'bold' : 'normal'};">VIII</td>
            <td style="text-align: left; border: ${classeEdificio === 'VIII' ? '2px' : '1px'} solid #000; padding: 3px;">da 35 a 40 inclusa</td>
            <td style="text-align: left; border: ${classeEdificio === 'VIII' ? '2px' : '1px'} solid #000; padding: 3px;">maggiorazione del 35%</td>
          </tr>
          <tr ${classeEdificio === 'IX' ? 'style="background-color: #ffff99; border: 2px solid #000;"' : ''}>
            <td style="text-align: center; border: ${classeEdificio === 'IX' ? '2px' : '1px'} solid #000; padding: 3px; font-weight: ${classeEdificio === 'IX' ? 'bold' : 'normal'};">IX</td>
            <td style="text-align: left; border: ${classeEdificio === 'IX' ? '2px' : '1px'} solid #000; padding: 3px;">da 40 a 45 inclusa</td>
            <td style="text-align: left; border: ${classeEdificio === 'IX' ? '2px' : '1px'} solid #000; padding: 3px;">maggiorazione del 40%</td>
          </tr>
          <tr ${classeEdificio === 'X' ? 'style="background-color: #ffff99; border: 2px solid #000;"' : ''}>
            <td style="text-align: center; border: ${classeEdificio === 'X' ? '2px' : '1px'} solid #000; padding: 3px; font-weight: ${classeEdificio === 'X' ? 'bold' : 'normal'};">X</td>
            <td style="text-align: left; border: ${classeEdificio === 'X' ? '2px' : '1px'} solid #000; padding: 3px;">da 45 a 50 inclusa</td>
            <td style="text-align: left; border: ${classeEdificio === 'X' ? '2px' : '1px'} solid #000; padding: 3px;">maggiorazione del 45%</td>
          </tr>
          <tr ${classeEdificio === 'XI' ? 'style="background-color: #ffff99; border: 2px solid #000;"' : ''}>
            <td style="text-align: center; border: ${classeEdificio === 'XI' ? '2px' : '1px'} solid #000; padding: 3px; font-weight: ${classeEdificio === 'XI' ? 'bold' : 'normal'};">XI</td>
            <td style="text-align: left; border: ${classeEdificio === 'XI' ? '2px' : '1px'} solid #000; padding: 3px;">oltre il 50% inclusa</td>
            <td style="text-align: left; border: ${classeEdificio === 'XI' ? '2px' : '1px'} solid #000; padding: 3px;">maggiorazione del 50%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
  `;
  
  // Crea un iframe nascosto per la stampa (evita problemi con il contenuto della pagina)
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'absolute';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = 'none';
  printFrame.style.left = '-9999px';
  document.body.appendChild(printFrame);
  
  let printExecuted = false; // Flag per evitare doppie stampe
  
  const executePrint = () => {
    if (printExecuted) return; // Evita doppie stampe
    printExecuted = true;
    
    setTimeout(() => {
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
    }, 100);
  };
  
  const printDoc = printFrame.contentWindow.document;
  printDoc.open();
  printDoc.write(printHTML);
  printDoc.close();
  
  // Attendi che il contenuto sia caricato, poi stampa
  printFrame.onload = executePrint;
  
  // Fallback solo se onload non viene chiamato entro un tempo ragionevole
  setTimeout(() => {
    if (!printExecuted && printFrame.parentNode) {
      executePrint();
    }
  }, 1000);
}

function injectRiepilogoPrintStyles() {
  let style = document.getElementById('riepilogo-print-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'riepilogo-print-style';
    style.textContent = `
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body * { visibility: hidden; }
        #riepilogo-superfici-content, #riepilogo-superfici-content * { visibility: visible; }
        #riepilogo-superfici-content { position: absolute; left: 0; top: 0; right: 0; }
        #riepilogo-superfici-content { font-size: 10pt; }
        #riepilogo-superfici-content table { width: 100%; border-collapse: collapse; }
        #riepilogo-superfici-content th, #riepilogo-superfici-content td { 
          border: 1px solid #dee2e6; 
          padding: 2px 4px !important; 
          font-size: 10pt; 
          line-height: 1.1 !important; 
          text-align: center; 
          vertical-align: middle; 
        }
        #riepilogo-superfici-content tr { 
          height: auto !important; 
        }
        #riepilogo-superfici-content thead th { 
          background: #cfe2ff !important; 
          font-weight: bold; 
        }
        #riepilogo-superfici-content .table-secondary td { 
          background: #e9ecef !important; 
          font-weight: bold; 
        }
        #riepilogo-superfici-content h3 { 
          font-size: 12pt; 
          margin: 4px 0 !important; 
          font-weight: bold; 
        }
        #riepilogo-superfici-content .card-body { 
          padding: 8px !important; 
        }
        #riepilogo-superfici-content .mb-3 { 
          margin-bottom: 4px !important; 
        }
        #riepilogo-superfici-content .mt-4 { 
          margin-top: 8px !important; 
        }
        #riepilogo-superfici-content .align-middle { 
          vertical-align: middle !important; 
        }
        #btn-riepilogo-stampa-pdf, #btn-riepilogo-export-excel { 
          display: none !important; 
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function injectRiepilogoNonResidenzialiPrintStyles() {
  let style = document.getElementById('riepilogo-non-residenziali-print-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'riepilogo-non-residenziali-print-style';
    style.textContent = `
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body * { visibility: hidden; }
        #riepilogo-superfici-non-residenziali-content, #riepilogo-superfici-non-residenziali-content * { visibility: visible; }
        #riepilogo-superfici-non-residenziali-content { position: absolute; left: 0; top: 0; right: 0; }
        #riepilogo-superfici-non-residenziali-content { font-size: 10pt; }
        #riepilogo-superfici-non-residenziali-content table { width: 100%; border-collapse: collapse; }
        #riepilogo-superfici-non-residenziali-content th, #riepilogo-superfici-non-residenziali-content td { 
          border: 1px solid #dee2e6; 
          padding: 2px 4px !important; 
          font-size: 10pt; 
          line-height: 1.1 !important; 
          text-align: center; 
          vertical-align: middle; 
        }
        #riepilogo-superfici-non-residenziali-content tr { 
          height: auto !important; 
        }
        #riepilogo-superfici-non-residenziali-content thead th { 
          background: #cfe2ff !important; 
          font-weight: bold; 
        }
        #riepilogo-superfici-non-residenziali-content .table-secondary td { 
          background: #e9ecef !important; 
          font-weight: bold; 
        }
        #riepilogo-superfici-non-residenziali-content h3 { 
          font-size: 12pt; 
          margin: 4px 0 !important; 
          font-weight: bold; 
        }
        #riepilogo-superfici-non-residenziali-content .card-body { 
          padding: 8px !important; 
        }
        #riepilogo-superfici-non-residenziali-content .mb-3 { 
          margin-bottom: 4px !important; 
        }
        #riepilogo-superfici-non-residenziali-content .align-middle { 
          vertical-align: middle !important; 
        }
        #btn-riepilogo-non-residenziali-stampa-pdf, #btn-riepilogo-non-residenziali-export-excel { 
          display: none !important; 
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function printRiepilogoSuperfici() {
  // Assicurati che il riepilogo sia generato
  generaRiepilogoSuperfici();
  injectRiepilogoPrintStyles();
  setTimeout(() => window.print(), 50);
}

function printRiepilogoSuperficiNonResidenziali() {
  // Assicurati che il riepilogo sia generato
  generaRiepilogoSuperficiNonResidenziali();
  injectRiepilogoNonResidenzialiPrintStyles();
  setTimeout(() => window.print(), 50);
}

// Esportazione Excel Riepilogo Superfici Residenziali
async function exportRiepilogoSuperficiExcel() {
  const edifici = dataModel.getAllEdifici();
  if (!edifici || edifici.length === 0) {
    showErrorToast('Nessun dato disponibile da esportare.');
    return;
  }

  showInfoToast('Esportazione Excel in corso...');
  try {
    const excelContent = generateRiepilogoExcelContent(edifici, true);

    await ensureTauriApis();
    if (tauriDialog && typeof tauriDialog.save === 'function' && tauriFs && typeof tauriFs.writeTextFile === 'function') {
      const filePath = await tauriDialog.save({
        defaultPath: 'riepilogo-superfici-residenziali.xls',
        filters: [{ name: 'File Excel', extensions: ['xls'] }]
      });
      if (!filePath) {
        toastInfo?.hide();
        return;
      }
      await tauriFs.writeTextFile(filePath, excelContent);
      toastInfo?.hide();
      showSuccessToast('Esportazione Excel completata.');
      return;
    }

    fallbackExportExcel(excelContent, 'riepilogo-superfici-residenziali');
    toastInfo?.hide();
    showSuccessToast('Esportazione Excel completata.');
  } catch (error) {
    console.error('Errore durante l\'esportazione Excel', error);
    toastInfo?.hide();
    showErrorToast('Errore durante l\'esportazione Excel.');
  }
}

// Esportazione Excel Riepilogo Superfici Non Residenziali
async function exportRiepilogoSuperficiNonResidenzialiExcel() {
  const edifici = dataModel.getAllEdifici();
  if (!edifici || edifici.length === 0) {
    showErrorToast('Nessun dato disponibile da esportare.');
    return;
  }

  showInfoToast('Esportazione Excel in corso...');
  try {
    const excelContent = generateRiepilogoExcelContent(edifici, false);

    await ensureTauriApis();
    if (tauriDialog && typeof tauriDialog.save === 'function' && tauriFs && typeof tauriFs.writeTextFile === 'function') {
      const filePath = await tauriDialog.save({
        defaultPath: 'riepilogo-superfici-non-residenziali.xls',
        filters: [{ name: 'File Excel', extensions: ['xls'] }]
      });
      if (!filePath) {
        toastInfo?.hide();
        return;
      }
      await tauriFs.writeTextFile(filePath, excelContent);
      toastInfo?.hide();
      showSuccessToast('Esportazione Excel completata.');
      return;
    }

    fallbackExportExcel(excelContent, 'riepilogo-superfici-non-residenziali');
    toastInfo?.hide();
    showSuccessToast('Esportazione Excel completata.');
  } catch (error) {
    console.error('Errore durante l\'esportazione Excel', error);
    toastInfo?.hide();
    showErrorToast('Errore durante l\'esportazione Excel.');
  }
}

// Genera contenuto Excel per i riepiloghi
function generateRiepilogoExcelContent(edifici, isResidenziale) {
  // Raccogli tutti i locali con le loro informazioni, raggruppati per unità (edificio) e tipologia
  const localiPerUnitaETipologia = {};
  const tipologieFiltro = isResidenziale ? TIPOLOGIE_RESIDENZIALI : TIPOLOGIE_NON_RESIDENZIALI;
  const titolo = isResidenziale ? 'RIEPILOGO SUPERFICI PER TIPOLOGIA RESIDENZIALE' : 'RIEPILOGO SUPERFICI NON RESIDENZIALI';
  
  edifici.forEach(edificio => {
    if (!edificio.piani || !Array.isArray(edificio.piani)) return;
    const nomeEdificio = edificio.nome || 'Edificio senza nome';
    
    if (!localiPerUnitaETipologia[nomeEdificio]) {
      localiPerUnitaETipologia[nomeEdificio] = {};
    }
    
    edificio.piani.forEach(piano => {
      if (!piano.locali || !Array.isArray(piano.locali)) return;
      
      piano.locali.forEach(locale => {
        const tipologia = locale.tipologiaSuperficie || 'Non specificata';
        
        // Filtra solo le tipologie appropriate
        if (!tipologieFiltro.includes(tipologia)) {
          return;
        }
        
        // Gestisci sia stringa che numero per superficieUtile
        let superficie = 0;
        if (typeof locale.superficieUtile === 'number') {
          superficie = locale.superficieUtile;
        } else if (typeof locale.superficieUtile === 'string') {
          superficie = parseItalianNumber(locale.superficieUtile || '0');
        }
        
        // Salta i locali con superficie zero o negativa
        if (superficie <= 0) {
          return;
        }
        
        if (!localiPerUnitaETipologia[nomeEdificio][tipologia]) {
          localiPerUnitaETipologia[nomeEdificio][tipologia] = {
            locali: [],
            somma: 0
          };
        }
        
        localiPerUnitaETipologia[nomeEdificio][tipologia].locali.push({
          nome: locale.nome || 'Locale senza nome',
          superficie: superficie,
          specificaSuperficie: locale.specificaSuperficie || ''
        });
        
        localiPerUnitaETipologia[nomeEdificio][tipologia].somma += superficie;
      });
    });
  });

  // Genera HTML Excel
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${escapeHtml(titolo)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #000; padding: 4px; text-align: center; }
th { background-color: #cfe2ff; font-weight: bold; }
.table-secondary td { background-color: #e9ecef; font-weight: bold; }
</style>
</head>
<body>
<table>
<thead>
<tr>
<th>UNITA</th>
<th>TIPOLOGIA</th>
<th>LOCALE</th>
<th>SPECIFICA SUPERFICIE</th>
<th>SUP.</th>
</tr>
</thead>
<tbody>`;

  // Itera per ogni unità (edificio)
  Object.keys(localiPerUnitaETipologia).forEach(nomeEdificio => {
    const tipologieUnita = localiPerUnitaETipologia[nomeEdificio];
    
    // Separa ABITAZIONE, ACCESSORIO ABITAZIONE e altre tipologie (solo per residenziali)
    const tipologieAbitazione = [];
    const altreTipologie = [];
    
    Object.keys(tipologieUnita).forEach(tipologia => {
      if (isResidenziale && (tipologia === 'ABITAZIONE' || tipologia === 'ACCESSORIO ABITAZIONE')) {
        tipologieAbitazione.push(tipologia);
      } else {
        altreTipologie.push(tipologia);
      }
    });
    
    // Ordina ABITAZIONE prima di ACCESSORIO ABITAZIONE (solo per residenziali)
    if (isResidenziale) {
      tipologieAbitazione.sort((a, b) => {
        if (a === 'ABITAZIONE') return -1;
        if (b === 'ABITAZIONE') return 1;
        return 0;
      });
    }
    
    // Ordina le altre tipologie alfabeticamente
    altreTipologie.sort((a, b) => a.localeCompare(b));
    
    // Calcola il numero totale di righe per questa unità
    let totaleRighe = 0;
    if (isResidenziale) {
      tipologieAbitazione.forEach(tipologia => {
        const dati = tipologieUnita[tipologia];
        if (dati.locali.length > 0 && dati.somma > 0) {
          totaleRighe += dati.locali.length + 1;
        }
      });
    }
    altreTipologie.forEach(tipologia => {
      const dati = tipologieUnita[tipologia];
      if (dati.locali.length > 0 && dati.somma > 0) {
        totaleRighe += dati.locali.length + 1;
      }
    });
    
    if (totaleRighe === 0) {
      return;
    }
    
    let primaRiga = true;
    
    // Per residenziali: mostra ABITAZIONE e ACCESSORIO ABITAZIONE prima
    if (isResidenziale) {
      if (tipologieAbitazione.includes('ABITAZIONE')) {
        const dati = tipologieUnita['ABITAZIONE'];
        if (dati.locali.length > 0 && dati.somma > 0) {
          dati.locali.forEach((locale, index) => {
            if (primaRiga) {
              html += `<tr><td rowspan="${totaleRighe}">${escapeHtml(nomeEdificio)}</td><td>ABITAZIONE</td><td>${escapeHtml(locale.nome)}</td><td>${escapeHtml(locale.specificaSuperficie)}</td><td>${formatItalianNumber(locale.superficie)}</td></tr>`;
              primaRiga = false;
            } else {
              html += `<tr><td>ABITAZIONE</td><td>${escapeHtml(locale.nome)}</td><td>${escapeHtml(locale.specificaSuperficie)}</td><td>${formatItalianNumber(locale.superficie)}</td></tr>`;
            }
          });
          html += `<tr class="table-secondary"><td><strong>SOMMA ABITAZIONE</strong></td><td></td><td></td><td><strong>${formatItalianNumber(dati.somma)}</strong></td></tr>`;
        }
      }
      
      if (tipologieAbitazione.includes('ACCESSORIO ABITAZIONE')) {
        const dati = tipologieUnita['ACCESSORIO ABITAZIONE'];
        if (dati.locali.length > 0 && dati.somma > 0) {
          dati.locali.forEach(locale => {
            html += `<tr><td>ACCESSORIO ABITAZIONE</td><td>${escapeHtml(locale.nome)}</td><td>${escapeHtml(locale.specificaSuperficie)}</td><td>${formatItalianNumber(locale.superficie)}</td></tr>`;
          });
          html += `<tr class="table-secondary"><td><strong>SOMMA ACCESSORIO ABITAZIONE</strong></td><td></td><td></td><td><strong>${formatItalianNumber(dati.somma)}</strong></td></tr>`;
        }
      }
    }
    
    // Mostra le altre tipologie
    altreTipologie.forEach(tipologia => {
      const dati = tipologieUnita[tipologia];
      if (dati.locali.length > 0 && dati.somma > 0) {
        dati.locali.forEach((locale, index) => {
          if (primaRiga) {
            html += `<tr><td rowspan="${totaleRighe}">${escapeHtml(nomeEdificio)}</td><td>${escapeHtml(tipologia)}</td><td>${escapeHtml(locale.nome)}</td><td>${escapeHtml(locale.specificaSuperficie)}</td><td>${formatItalianNumber(locale.superficie)}</td></tr>`;
            primaRiga = false;
          } else {
            html += `<tr><td>${escapeHtml(tipologia)}</td><td>${escapeHtml(locale.nome)}</td><td>${escapeHtml(locale.specificaSuperficie)}</td><td>${formatItalianNumber(locale.superficie)}</td></tr>`;
          }
        });
        html += `<tr class="table-secondary"><td><strong>SOMMA ${escapeHtml(tipologia.toUpperCase())}</strong></td><td></td><td></td><td><strong>${formatItalianNumber(dati.somma)}</strong></td></tr>`;
      }
    });
  });

  html += `</tbody></table>`;

  // Aggiungi la seconda tabella per il riepilogo residenziale
  if (isResidenziale) {
    html += `<br><br><table>`;
    html += `<thead><tr>`;
    html += `<th>UNITA</th>`;
    html += `<th>&lt; 95</th>`;
    html += `<th>&gt; 95 &lt; 110</th>`;
    html += `<th>&gt; 110 &lt; 130</th>`;
    html += `<th>&gt; 130 &lt; 160</th>`;
    html += `<th>&gt; 160</th>`;
    html += `<th>Accessori</th>`;
    html += `<th>Androni</th>`;
    html += `<th>Porticati</th>`;
    html += `<th>Logge</th>`;
    html += `<th>Balconi</th>`;
    html += `<th>Box Sing.</th>`;
    html += `<th>Box Col.</th>`;
    html += `</tr></thead><tbody>`;

    // Raccogli i dati per la seconda tabella
    const datiClassiSuperficie = {};
    const totaliColonne = {
      '<95': 0,
      '95-110': 0,
      '110-130': 0,
      '130-160': 0,
      '>160': 0,
      'Accessori': 0,
      'Androni': 0,
      'Porticati': 0,
      'Logge': 0,
      'Balconi': 0,
      'Box Sing.': 0,
      'Box Col.': 0
    };
    const conteggiColonne = {
      '<95': 0,
      '95-110': 0,
      '110-130': 0,
      '130-160': 0,
      '>160': 0,
      'Accessori': 0,
      'Androni': 0,
      'Porticati': 0,
      'Logge': 0,
      'Balconi': 0,
      'Box Sing.': 0,
      'Box Col.': 0
    };

    Object.keys(localiPerUnitaETipologia).forEach(nomeEdificio => {
      const tipologieUnita = localiPerUnitaETipologia[nomeEdificio];
      
      // Calcola la superficie totale di ABITAZIONE + ACCESSORIO ABITAZIONE
      let superficieAbitazione = 0;
      let superficieAccessorio = 0;
      
      if (tipologieUnita['ABITAZIONE']) {
        superficieAbitazione = tipologieUnita['ABITAZIONE'].somma;
      }
      if (tipologieUnita['ACCESSORIO ABITAZIONE']) {
        superficieAccessorio = tipologieUnita['ACCESSORIO ABITAZIONE'].somma;
      }
      
      const superficieTotaleAbitazione = superficieAbitazione + superficieAccessorio;
      
      // Classifica in base alla classe di superficie
      let classeSuperficie = '';
      if (superficieTotaleAbitazione > 0 && superficieTotaleAbitazione < 95) {
        classeSuperficie = '<95';
        totaliColonne['<95'] += superficieTotaleAbitazione;
        conteggiColonne['<95']++;
      } else if (superficieTotaleAbitazione >= 95 && superficieTotaleAbitazione < 110) {
        classeSuperficie = '95-110';
        totaliColonne['95-110'] += superficieTotaleAbitazione;
        conteggiColonne['95-110']++;
      } else if (superficieTotaleAbitazione >= 110 && superficieTotaleAbitazione < 130) {
        classeSuperficie = '110-130';
        totaliColonne['110-130'] += superficieTotaleAbitazione;
        conteggiColonne['110-130']++;
      } else if (superficieTotaleAbitazione >= 130 && superficieTotaleAbitazione < 160) {
        classeSuperficie = '130-160';
        totaliColonne['130-160'] += superficieTotaleAbitazione;
        conteggiColonne['130-160']++;
      } else if (superficieTotaleAbitazione >= 160) {
        classeSuperficie = '>160';
        totaliColonne['>160'] += superficieTotaleAbitazione;
        conteggiColonne['>160']++;
      }
      
      // Raccogli i totali per le altre tipologie
      const totaliTipologie = {
        'Accessori': tipologieUnita['ACCESSORIO ABITAZIONE'] ? tipologieUnita['ACCESSORIO ABITAZIONE'].somma : 0,
        'Androni': tipologieUnita['ANDRONE'] ? tipologieUnita['ANDRONE'].somma : 0,
        'Porticati': tipologieUnita['PORTICATO'] ? tipologieUnita['PORTICATO'].somma : 0,
        'Logge': tipologieUnita['LOGGIA'] ? tipologieUnita['LOGGIA'].somma : 0,
        'Balconi': tipologieUnita['BALCONE'] ? tipologieUnita['BALCONE'].somma : 0,
        'Box Sing.': tipologieUnita['BOX SINGOLO'] ? tipologieUnita['BOX SINGOLO'].somma : 0,
        'Box Col.': tipologieUnita['BOX COLLETTIVO'] ? tipologieUnita['BOX COLLETTIVO'].somma : 0
      };
      
      // Aggiorna i totali delle colonne
      totaliColonne['Accessori'] += totaliTipologie['Accessori'];
      totaliColonne['Androni'] += totaliTipologie['Androni'];
      totaliColonne['Porticati'] += totaliTipologie['Porticati'];
      totaliColonne['Logge'] += totaliTipologie['Logge'];
      totaliColonne['Balconi'] += totaliTipologie['Balconi'];
      totaliColonne['Box Sing.'] += totaliTipologie['Box Sing.'];
      totaliColonne['Box Col.'] += totaliTipologie['Box Col.'];
      
      // Aggiorna i conteggi delle colonne (conta le unità con valore > 0)
      if (totaliTipologie['Accessori'] > 0) conteggiColonne['Accessori']++;
      if (totaliTipologie['Androni'] > 0) conteggiColonne['Androni']++;
      if (totaliTipologie['Porticati'] > 0) conteggiColonne['Porticati']++;
      if (totaliTipologie['Logge'] > 0) conteggiColonne['Logge']++;
      if (totaliTipologie['Balconi'] > 0) conteggiColonne['Balconi']++;
      if (totaliTipologie['Box Sing.'] > 0) conteggiColonne['Box Sing.']++;
      if (totaliTipologie['Box Col.'] > 0) conteggiColonne['Box Col.']++;
      
      datiClassiSuperficie[nomeEdificio] = {
        classeSuperficie: classeSuperficie,
        superficieTotale: superficieTotaleAbitazione,
        totaliTipologie: totaliTipologie
      };
    });

    // Genera le righe della tabella
    Object.keys(datiClassiSuperficie).forEach(nomeEdificio => {
      const dati = datiClassiSuperficie[nomeEdificio];
      
      html += `<tr>`;
      html += `<td>${escapeHtml(nomeEdificio)}</td>`;
      
      // Colonne classi di superficie
      html += `<td>${dati.classeSuperficie === '<95' ? formatItalianNumber(dati.superficieTotale) : ''}</td>`;
      html += `<td>${dati.classeSuperficie === '95-110' ? formatItalianNumber(dati.superficieTotale) : ''}</td>`;
      html += `<td>${dati.classeSuperficie === '110-130' ? formatItalianNumber(dati.superficieTotale) : ''}</td>`;
      html += `<td>${dati.classeSuperficie === '130-160' ? formatItalianNumber(dati.superficieTotale) : ''}</td>`;
      html += `<td>${dati.classeSuperficie === '>160' ? formatItalianNumber(dati.superficieTotale) : ''}</td>`;
      
      // Colonne altre tipologie
      html += `<td>${dati.totaliTipologie['Accessori'] > 0 ? formatItalianNumber(dati.totaliTipologie['Accessori']) : ''}</td>`;
      html += `<td>${dati.totaliTipologie['Androni'] > 0 ? formatItalianNumber(dati.totaliTipologie['Androni']) : ''}</td>`;
      html += `<td>${dati.totaliTipologie['Porticati'] > 0 ? formatItalianNumber(dati.totaliTipologie['Porticati']) : ''}</td>`;
      html += `<td>${dati.totaliTipologie['Logge'] > 0 ? formatItalianNumber(dati.totaliTipologie['Logge']) : ''}</td>`;
      html += `<td>${dati.totaliTipologie['Balconi'] > 0 ? formatItalianNumber(dati.totaliTipologie['Balconi']) : ''}</td>`;
      html += `<td>${dati.totaliTipologie['Box Sing.'] > 0 ? formatItalianNumber(dati.totaliTipologie['Box Sing.']) : ''}</td>`;
      html += `<td>${dati.totaliTipologie['Box Col.'] > 0 ? formatItalianNumber(dati.totaliTipologie['Box Col.']) : ''}</td>`;
      
      html += `</tr>`;
    });

    // Riga dei totali
    html += `<tr class="table-secondary">`;
    html += `<td><strong>TOTALE</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['<95'])}</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['95-110'])}</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['110-130'])}</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['130-160'])}</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['>160'])}</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['Accessori'])}</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['Androni'])}</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['Porticati'])}</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['Logge'])}</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['Balconi'])}</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['Box Sing.'])}</strong></td>`;
    html += `<td><strong>${formatItalianNumber(totaliColonne['Box Col.'])}</strong></td>`;
    html += `</tr>`;

    // Riga dei conteggi (numero di unità)
    html += `<tr class="table-info">`;
    html += `<td><strong>N. UNITA</strong></td>`;
    html += `<td><strong>${conteggiColonne['<95'] > 0 ? conteggiColonne['<95'] : ''}</strong></td>`;
    html += `<td><strong>${conteggiColonne['95-110'] > 0 ? conteggiColonne['95-110'] : ''}</strong></td>`;
    html += `<td><strong>${conteggiColonne['110-130'] > 0 ? conteggiColonne['110-130'] : ''}</strong></td>`;
    html += `<td><strong>${conteggiColonne['130-160'] > 0 ? conteggiColonne['130-160'] : ''}</strong></td>`;
    html += `<td><strong>${conteggiColonne['>160'] > 0 ? conteggiColonne['>160'] : ''}</strong></td>`;
    html += `<td><strong>${conteggiColonne['Accessori'] > 0 ? conteggiColonne['Accessori'] : ''}</strong></td>`;
    html += `<td><strong>${conteggiColonne['Androni'] > 0 ? conteggiColonne['Androni'] : ''}</strong></td>`;
    html += `<td><strong>${conteggiColonne['Porticati'] > 0 ? conteggiColonne['Porticati'] : ''}</strong></td>`;
    html += `<td><strong>${conteggiColonne['Logge'] > 0 ? conteggiColonne['Logge'] : ''}</strong></td>`;
    html += `<td><strong>${conteggiColonne['Balconi'] > 0 ? conteggiColonne['Balconi'] : ''}</strong></td>`;
    html += `<td><strong>${conteggiColonne['Box Sing.'] > 0 ? conteggiColonne['Box Sing.'] : ''}</strong></td>`;
    html += `<td><strong>${conteggiColonne['Box Col.'] > 0 ? conteggiColonne['Box Col.'] : ''}</strong></td>`;
    html += `</tr>`;

    html += `</tbody></table>`;
  }

  html += `</body></html>`;
  return html;
}

// Gestione Modali
function setupModali() {
  // Non più necessario: la gestione è affidata a Bootstrap e initModalCleanup
}

function setupModalDuplicaEdificio() {
  modalDuplicaEdificioElement = document.getElementById('modal-duplica-edificio');
  if (!modalDuplicaEdificioElement) return;

  modalDuplicaEdificioInstance = bootstrap.Modal.getOrCreateInstance(modalDuplicaEdificioElement);
  formDuplicaEdificio = document.getElementById('form-duplica-edificio');
  inputDuplicaEdificio = document.getElementById('input-nome-duplica-edificio');

  if (inputDuplicaEdificio) {
    inputDuplicaEdificio.addEventListener('input', () => {
      inputDuplicaEdificio.classList.remove('is-invalid');
    });
  }

  if (formDuplicaEdificio) {
    formDuplicaEdificio.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!inputDuplicaEdificio) return;

      const valore = inputDuplicaEdificio.value.trim();
      if (!valore) {
        inputDuplicaEdificio.classList.add('is-invalid');
        inputDuplicaEdificio.focus();
        return;
      }

      duplicaModalSubmittedValue = valore;
      if (modalDuplicaEdificioInstance) {
        modalDuplicaEdificioInstance.hide();
      }
    });
  }

  modalDuplicaEdificioElement.addEventListener('shown.bs.modal', () => {
    if (inputDuplicaEdificio) {
      inputDuplicaEdificio.focus();
      inputDuplicaEdificio.select();
    }
  });

  modalDuplicaEdificioElement.addEventListener('hidden.bs.modal', () => {
    if (inputDuplicaEdificio) {
      inputDuplicaEdificio.value = '';
      inputDuplicaEdificio.classList.remove('is-invalid');
    }

    if (duplicaModalResolver) {
      const resolve = duplicaModalResolver;
      duplicaModalResolver = null;
      resolve(duplicaModalSubmittedValue);
    }
    duplicaModalSubmittedValue = null;
  });
}

function chiudiModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    const modalInstance = bootstrap.Modal.getInstance(modal) || bootstrap.Modal.getOrCreateInstance(modal);
    if (modalInstance) {
      modalInstance.hide();
    }
  }
  document.body.classList.remove('modal-open');
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
}

// Esponi subito le funzioni su window per essere disponibili globalmente
window.chiudiModal = chiudiModal;

function apriModalEdificio(edificioId = null) {
  const modalElement = document.getElementById('modal-edificio');
  const title = document.getElementById('modal-edificio-title');
  const form = document.getElementById('form-edificio');
  
  if (edificioId) {
    // Modifica edificio esistente
    const edificio = dataModel.getEdificio(edificioId);
    if (edificio) {
      title.textContent = 'Modifica Edificio';
      document.getElementById('input-nome-edificio').value = edificio.nome;
      document.getElementById('input-indirizzo-edificio').value = edificio.indirizzo || '';
      form.dataset.edificioId = edificioId;
    }
  } else {
    // Nuovo edificio
    title.textContent = 'Nuovo Edificio';
    form.reset();
    delete form.dataset.edificioId;
  }
  
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

function apriModalPiano(edificioId = null, pianoId = null) {
  const modalElement = document.getElementById('modal-piano');
  const title = document.getElementById('modal-piano-title');
  const form = document.getElementById('form-piano');

  if (!edificioId) {
    // Se non viene passato un edificio, prova a usare quello selezionato nello stato
    if (statoApp.edificioSelezionato) {
      edificioId = statoApp.edificioSelezionato;
    } else {
      showErrorToast('Seleziona un edificio prima di creare un piano.');
      return;
    }
  }

  form.dataset.edificioId = edificioId;

  if (pianoId) {
    const piano = dataModel.getPiano(edificioId, pianoId);
    if (piano) {
      title.textContent = 'Modifica Piano';
      document.getElementById('input-nome-piano').value = piano.nome;
      form.dataset.pianoId = pianoId;
    }
  } else {
    title.textContent = 'Nuovo Piano';
    document.getElementById('input-nome-piano').value = '';
    delete form.dataset.pianoId;
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  modal.show();
}

function apriModalLocale(edificioId = null, pianoId = null, localeId = null) {
  // Se non ci sono parametri, usa quelli selezionati
  if (!edificioId) edificioId = statoApp.edificioSelezionato;
  if (!pianoId) pianoId = statoApp.pianoSelezionato;
  
  // Verifica che edificioId e pianoId siano validi
  if (!edificioId || !pianoId) {
    alert('Errore: Seleziona prima un edificio e un piano');
    console.error('apriModalLocale chiamata con parametri invalidi:', { edificioId, pianoId, localeId });
    return;
  }
  
  // Verifica che l'edificio e il piano esistano
  const edificio = dataModel.getEdificio(edificioId);
  const piano = dataModel.getPiano(edificioId, pianoId);
  
  if (!edificio) {
    alert(`Errore: Edificio con ID ${edificioId} non trovato`);
    return;
  }
  
  if (!piano) {
    alert(`Errore: Piano con ID ${pianoId} non trovato nell'edificio ${edificio.nome}`);
    return;
  }
  
  // Se siamo nella vista edifici, salva la vista corrente per ripristinarla dopo
  if (statoApp.vistaCorrente === 'edifici') {
    statoApp.vistaPrimaDelModal = 'edifici';
  }
  
  const modalElement = document.getElementById('modal-locale');
  const title = document.getElementById('modal-locale-title');
  
  if (localeId) {
    title.textContent = 'Modifica Locale';
  } else {
    title.textContent = 'Nuovo Locale';
  }
  
  // Carica il form locale dinamicamente
  caricaFormLocale(edificioId, pianoId, localeId);
  
  // Mostra la modale usando Bootstrap
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

// Esponi subito le funzioni su window per essere disponibili globalmente
window.apriModalLocale = apriModalLocale;

// Setup Form
function setupForm() {
  // Form Edificio
  document.getElementById('form-edificio').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const nome = document.getElementById('input-nome-edificio').value;
    const indirizzo = document.getElementById('input-indirizzo-edificio').value;
    let edificioCreato = null;
    let edificioIdCorrente = form.dataset.edificioId || null;

    if (form.dataset.edificioId) {
      dataModel.modificaEdificio(form.dataset.edificioId, nome, indirizzo);
    } else {
      const nuovoEdificio = dataModel.aggiungiEdificio(nome, indirizzo);
      edificioCreato = nuovoEdificio;
      edificioIdCorrente = nuovoEdificio.id;
      edificioDaEvidenziare = nuovoEdificio.id;
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById('modal-edificio'));
    if (modal) modal.hide();
    if (edificioIdCorrente) {
      statoApp.edificioSelezionato = edificioIdCorrente;
      statoApp.pianoSelezionato = null;
      if (statoApp.vistaCorrente === 'locali') {
        aggiornaVistaLocali();
      }
    } else if (statoApp.vistaCorrente === 'locali') {
      aggiornaVistaLocali();
    }

    if (!edificioDaEvidenziare && edificioIdCorrente) {
      edificioDaEvidenziare = edificioIdCorrente;
    }

    aggiornaVistaEdifici();
  });
  
  // Form Piano
  document.getElementById('form-piano').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const nome = document.getElementById('input-nome-piano').value;
    const edificioId = form.dataset.edificioId;
    let pianoCreato = null;
    let pianoIdCorrente = form.dataset.pianoId || null;
    
    if (form.dataset.pianoId) {
      dataModel.modificaPiano(edificioId, form.dataset.pianoId, nome);
    } else {
      const nuovoPiano = dataModel.aggiungiPiano(edificioId, nome);
      pianoCreato = nuovoPiano;
      pianoIdCorrente = nuovoPiano ? nuovoPiano.id : null;
    }
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('modal-piano'));
    if (modal) modal.hide();
    aggiornaVistaEdifici();
    
    if (edificioId) {
      statoApp.edificioSelezionato = edificioId;
    }
    if (pianoIdCorrente) {
      statoApp.pianoSelezionato = pianoIdCorrente;
    } else if (!form.dataset.pianoId) {
      statoApp.pianoSelezionato = null;
    }
    
    if (statoApp.vistaCorrente === 'locali') {
      aggiornaVistaLocali();
    }
  });
}

// Funzioni globali per i bottoni
window.modificaEdificio = apriModalEdificio;
window.eliminaEdificio = async function(id) {
  const conferma = await showConfirm('Sei sicuro di voler eliminare questo edificio? Verranno eliminati anche tutti i piani e locali associati.');
  if (conferma) {
    dataModel.eliminaEdificio(id);
    aggiornaVistaEdifici();
  }
};

window.apriModalPiano = apriModalPiano;
window.modificaPiano = apriModalPiano;
window.eliminaPiano = async function(edificioId, pianoId) {
  const conferma = await showConfirm('Sei sicuro di voler eliminare questo piano? Verranno eliminati anche tutti i locali associati.');
  if (conferma) {
    dataModel.eliminaPiano(edificioId, pianoId);
    aggiornaVistaEdifici();
  }
};

// apriModalLocale è già esposta sopra
window.modificaLocale = apriModalLocale;
window.eliminaLocale = async function(edificioId, pianoId, localeId) {
  const conferma = await showConfirm('Sei sicuro di voler eliminare questo locale?');
  if (conferma) {
    dataModel.eliminaLocale(edificioId, pianoId, localeId);
    aggiornaListaLocali();
    aggiornaVistaEdifici();
  }
};

// chiudiModal è già esposta sopra dopo la sua definizione

// Esponi funzioni per essere chiamate da locale-form.js
window.aggiornaListaLocali = aggiornaListaLocali;
window.aggiornaVistaLocali = aggiornaVistaLocali;
window.aggiornaVistaEdifici = aggiornaVistaEdifici;
window.statoApp = statoApp;
window.mostraVista = mostraVista;

const nuovoEdificioLocaliBtn = document.getElementById('btn-nuovo-edificio-locali');
const nuovoPianoLocaliBtn = document.getElementById('btn-nuovo-piano-locali');
if (nuovoEdificioLocaliBtn) {
  nuovoEdificioLocaliBtn.addEventListener('click', (e) => {
    e.preventDefault();
    apriModalEdificio();
  });
}
if (nuovoPianoLocaliBtn) {
  nuovoPianoLocaliBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!statoApp.edificioSelezionato) {
      showErrorToast('Seleziona prima un edificio.');
      return;
    }
    apriModalPiano(statoApp.edificioSelezionato);
  });
}

async function handleExportExcel() {
  const edifici = dataModel.getAllEdifici();
  if (!edifici || edifici.length === 0) {
    showErrorToast('Nessun dato disponibile da esportare.');
    return;
  }

  showInfoToast('Esportazione Excel in corso...');
  try {
    const excelContent = generateExcelContent(edifici);

    await ensureTauriApis();
    if (tauriDialog && typeof tauriDialog.open === 'function' && tauriFs && typeof tauriFs.writeTextFile === 'function') {
      const directorySelection = await tauriDialog.open({ directory: true, multiple: false });
      const selectedDirectory = Array.isArray(directorySelection) ? directorySelection[0] : directorySelection;
      if (!selectedDirectory) {
        toastInfo?.hide();
        return;
      }
      const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
      const fileName = `pratica-edilizia-${timestamp}.xls`;
      const fullPath = joinPaths(selectedDirectory, fileName);
      await tauriFs.writeTextFile(fullPath, excelContent);
      toastInfo?.hide();
      showSuccessToast('Esportazione Excel completata.');
      return;
    }

    if (tauriDialog && typeof tauriDialog.save === 'function' && tauriFs && typeof tauriFs.writeTextFile === 'function') {
      const filePath = await tauriDialog.save({
        defaultPath: 'pratica-edilizia.xls',
        filters: [{ name: 'File Excel', extensions: ['xls'] }]
      });
      if (!filePath) {
        toastInfo?.hide();
        return;
      }
      await tauriFs.writeTextFile(filePath, excelContent);
      toastInfo?.hide();
      showSuccessToast('Esportazione Excel completata.');
      return;
    }

    fallbackExportExcel(excelContent);
    toastInfo?.hide();
    showSuccessToast('Esportazione Excel completata.');
  } catch (error) {
    console.error('Errore durante l\'esportazione Excel', error);
    toastInfo?.hide();
    showErrorToast('Errore durante l\'esportazione Excel.');
  }
}

function fallbackExportExcel(htmlContent, baseName = 'pratica-edilizia') {
  try {
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    link.download = `${baseName}-${timestamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Errore durante il download del file Excel', error);
    showErrorToast('Impossibile creare il file Excel.');
  }
}

function generateExcelContent(edifici) {
  const headers = [
    'UNITÀ',
    'PIANO',
    'LOCALE',
    'TIPOLOGIA',
    'Specifica superficie',
    'Sup. Locale (m²)',
    'L',
    'L/2',
    'Imp.',
    'Dimensioni apertura',
    'Calcolo superficie finestrata utile',
    'Sup. Fin. (m²)',
    'Tot. (m²)',
    'Rapporto (Sₙ/Af)'
  ];

  let rowsHtml = '';

  edifici.forEach((edificio) => {
    const piani = Array.isArray(edificio.piani) ? edificio.piani : [];
    if (piani.length === 0) {
      rowsHtml += createExcelRow([
        edificio.nome,
        '-', '-', '-', '', '0,00', '0,00', '0,000', '0,20', '0,00 × 0,00', '0,00×(0,00+(0,000:3))', '0,00', '0,00', '0,00'
      ]);
      return;
    }

    piani.forEach((piano) => {
      const locali = Array.isArray(piano.locali) ? piano.locali : [];
      if (locali.length === 0) {
        rowsHtml += createExcelRow([
          edificio.nome,
          piano.nome,
          '-', '-', '', '0,00', '0,00', '0,000', '0,20', '0,00 × 0,00', '0,00×(0,00+(0,000:3))', '0,00', '0,00', '0,00'
        ]);
        return;
      }

      locali.forEach((locale) => {
        const superficie = parseItalianNumber(locale.superficieUtile || '0');
        const rapportoRichiesto = parseItalianNumber(locale.rapportoRichiesto || '8,00');
        const tipologia = locale.tipologiaSuperficie || '';
        const spec = (locale.specificaSuperficie || '').replace(/\*/g, '×');

        // Aperture array/oggetto -> array
        let aperture = [];
        if (Array.isArray(locale.aperture)) aperture = locale.aperture;
        else if (locale.aperture && typeof locale.aperture === 'object') {
          try { aperture = Object.values(locale.aperture); } catch { aperture = []; }
        }

        if (aperture.length === 0) {
        rowsHtml += createExcelRow([
          edificio.nome,
          piano.nome,
            locale.nome || '',
            tipologia,
            spec,
          formatItalianNumber(superficie),
            '0,00', '0,000', '0,20', '0,00 × 0,00', '0,00×(0,00+(0,000:3))', '0,00', '0,00', `${formatItalianNumber(0)} < ${formatItalianNumber(rapportoRichiesto)}`
          ]);
          return;
        }

        const totaleArea = calcolaTotaleAreaFinestrata(aperture);
        const rapportoTot = calcolaRapporto(superficie, totaleArea);
        const nonVerificato = rapportoTot > rapportoRichiesto;
        const trStyle = nonVerificato ? ' style="background-color:#fde2e1;"' : '';

        aperture.forEach((apertura, index) => {
            const calcoli = calcolaApertura(apertura);
          const L = parseItalianNumber(apertura.sporgenza || '0');
          const larghezza = parseItalianNumber(apertura.larghezza || '0');
          const H = parseItalianNumber(apertura.altezza || '0');
          const imp = parseItalianNumber(apertura.imposta || '0,20');
          const formulaStr = `${formatItalianNumber(larghezza)}×(${formatItalianNumber(calcoli.intero)}+(${formatItalianNumber(calcoli.unterzo,3)}:3))`;

          const cells = [
            index === 0 ? edificio.nome : '',
            index === 0 ? piano.nome : '',
            index === 0 ? (locale.nome || '') : '',
            index === 0 ? tipologia : '',
            index === 0 ? spec : '',
            index === 0 ? formatItalianNumber(superficie) : '',
            formatItalianNumber(L),
            formatItalianNumber(calcoli.l2, 3),
            formatItalianNumber(imp),
            `${formatItalianNumber(larghezza)} × ${formatItalianNumber(H)}`,
            formulaStr,
            formatItalianNumber(calcoli.areaFinestrata)
          ];

          if (index === 0) {
            cells.push(
              formatItalianNumber(totaleArea),
              `${formatItalianNumber(rapportoTot)} < ${formatItalianNumber(rapportoRichiesto)}`
            );
          } else {
            cells.push('', '');
          }

          rowsHtml += `<tr${trStyle}>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
        });
      });
    });
  });

  if (!rowsHtml) {
    rowsHtml = `<tr><td colspan="${headers.length}">Nessun dato disponibile</td></tr>`;
  }

  const tableHtml = `
    <table border="1" style="border-collapse:collapse;">
      <thead>
        <tr>${headers.map((header) => `<th style="background-color:#0d6efd;color:#fff;">${escapeHtml(header)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 4px; }
          th { background-color: #0d6efd; color: #fff; }
        </style>
      </head>
      <body>
        ${tableHtml}
      </body>
    </html>
  `;
}

function createExcelRow(cells) {
  return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function joinPaths(folder, fileName) {
  if (!folder) return fileName;
  const hasTrailingSlash = /[\\/]+$/.test(folder);
  if (hasTrailingSlash) {
    return `${folder}${fileName}`;
  }
  const separator = folder.includes('\\') && !folder.includes('/') ? '\\' : '/';
  return `${folder}${separator}${fileName}`;
}

async function handleNuovoCalcolo() {
  const conferma = await showConfirm('Questa operazione cancellerà tutti i dati inseriti. Vuoi continuare?');
  if (!conferma) return;

  showInfoToast('Pulizia dati in corso...');
  dataModel.resetData();
  statoApp.vistaCorrente = 'edifici';
  statoApp.edificioSelezionato = null;
  statoApp.pianoSelezionato = null;
  statoApp.localeSelezionato = null;

  await autoSaveDataModel();
  aggiornaVistaEdifici();
  aggiornaVistaLocali();
  aggiornaVistaReport();
  mostraVista('edifici');
  showSuccessToast('Nuovo calcolo pronto.');
}

async function handleChiudiApp() {
  const conferma = await showConfirm('Hai già salvato i dati? Confermi di voler chiudere l\'applicazione?');
  if (!conferma) return;

  await ensureTauriApis();
  if (tauriWindow && typeof tauriWindow.close === 'function') {
    await tauriWindow.close();
  } else {
    window.close();
  }
}

