// Modello dati per l'applicazione Pratica Edilizia

/**
 * Classe per gestire i dati dell'applicazione
 */
export class DataModel {
  constructor() {
    this.edifici = [];
    this.costoCostruzione = {
      costoMq: '0,00',
      oneriPrimari: '0,00',
      oneriSecondari: '0,00',
      smaltimentoRifiuti: '0,00',
      volume: '0,00',
      inc3: '0',
      percentualeContributo: null
    };
    this.loadFromStorage();
  }

  // Salva i dati nel localStorage
  saveToStorage() {
    try {
      const dataToSave = {
        edifici: this.edifici,
        costoCostruzione: this.costoCostruzione
      };
      localStorage.setItem('praticaEdilizia', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
    }
  }

  // Carica i dati dal localStorage
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('praticaEdilizia');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Supporta sia il vecchio formato (solo array) che il nuovo formato (oggetto)
        if (Array.isArray(parsed)) {
          this.edifici = parsed;
        } else {
          this.edifici = parsed.edifici || [];
          this.costoCostruzione = parsed.costoCostruzione || {
            costoMq: '0,00',
            oneriPrimari: '0,00',
            oneriSecondari: '0,00',
            smaltimentoRifiuti: '0,00',
            volume: '0,00',
            inc3: '0',
            percentualeContributo: null
          };
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento:', error);
      this.edifici = [];
      this.costoCostruzione = {
        costoMq: '0,00',
        oneriPrimari: '0,00',
        oneriSecondari: '0,00',
        smaltimentoRifiuti: '0,00',
        volume: '0,00',
        inc3: '0',
        percentualeContributo: null
      };
    }
  }

  // Genera un ID univoco
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Gestione Edifici
  aggiungiEdificio(nome, indirizzo = '') {
    const edificio = {
      id: this.generateId(),
      nome: nome,
      indirizzo: indirizzo,
      piani: [],
      createdAt: new Date().toISOString()
    };
    this.edifici.push(edificio);
    this.saveToStorage();
    return edificio;
  }

  duplicaEdificio(edificioId, nuovoNome) {
    const edificioOrigine = this.getEdificio(edificioId);
    if (!edificioOrigine) {
      return null;
    }

    const nuovoEdificio = {
      ...edificioOrigine,
      id: this.generateId(),
      nome: nuovoNome || `${edificioOrigine.nome} copia`,
      piani: [],
      createdAt: new Date().toISOString()
    };

    const pianiOrigine = Array.isArray(edificioOrigine.piani) ? edificioOrigine.piani : [];

    pianiOrigine.forEach((pianoOrigine) => {
      const nuovoPiano = {
        ...pianoOrigine,
        id: this.generateId(),
        locali: [],
        createdAt: new Date().toISOString(),
        edificioId: nuovoEdificio.id
      };

      const localiOrigine = Array.isArray(pianoOrigine.locali) ? pianoOrigine.locali : [];

      localiOrigine.forEach((localeOrigine) => {
        const nuovoLocale = {
          ...localeOrigine,
          id: this.generateId(),
          edificioId: nuovoEdificio.id,
          edificioNome: nuovoEdificio.nome,
          pianoId: nuovoPiano.id,
          pianoNome: nuovoPiano.nome,
          aperture: Array.isArray(localeOrigine.aperture)
            ? JSON.parse(JSON.stringify(localeOrigine.aperture))
            : [],
          createdAt: new Date().toISOString()
        };
        nuovoPiano.locali.push(nuovoLocale);
      });

      nuovoEdificio.piani.push(nuovoPiano);
    });

    this.edifici.push(nuovoEdificio);
    this.saveToStorage();
    return nuovoEdificio;
  }

  getEdificio(id) {
    return this.edifici.find(e => e.id === id);
  }

  modificaEdificio(id, nome, indirizzo) {
    const edificio = this.getEdificio(id);
    if (edificio) {
      edificio.nome = nome;
      edificio.indirizzo = indirizzo;
      this.saveToStorage();
      return edificio;
    }
    return null;
  }

  eliminaEdificio(id) {
    const index = this.edifici.findIndex(e => e.id === id);
    if (index !== -1) {
      this.edifici.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Gestione Piani
  aggiungiPiano(edificioId, nome) {
    const edificio = this.getEdificio(edificioId);
    if (edificio) {
      const piano = {
        id: this.generateId(),
        nome: nome,
        locali: [],
        createdAt: new Date().toISOString()
      };
      edificio.piani.push(piano);
      this.saveToStorage();
      return piano;
    }
    return null;
  }

  getPiano(edificioId, pianoId) {
    const edificio = this.getEdificio(edificioId);
    if (edificio) {
      return edificio.piani.find(p => p.id === pianoId);
    }
    return null;
  }

  modificaPiano(edificioId, pianoId, nome) {
    const piano = this.getPiano(edificioId, pianoId);
    if (piano) {
      piano.nome = nome;
      this.saveToStorage();
      return piano;
    }
    return null;
  }

  eliminaPiano(edificioId, pianoId) {
    const edificio = this.getEdificio(edificioId);
    if (edificio) {
      const index = edificio.piani.findIndex(p => p.id === pianoId);
      if (index !== -1) {
        edificio.piani.splice(index, 1);
        this.saveToStorage();
        return true;
      }
    }
    return false;
  }

  // Gestione Locali
  aggiungiLocale(edificioId, pianoId, datiLocale) {
    const edificio = this.getEdificio(edificioId);
    const piano = this.getPiano(edificioId, pianoId);
    if (edificio && piano) {
      const locale = {
        id: this.generateId(),
        edificioId,
        edificioNome: edificio.nome,
        pianoId,
        pianoNome: piano.nome,
        nome: datiLocale.nome || '',
        tipologiaSuperficie: datiLocale.tipologiaSuperficie || 'ABITAZIONE',
        rapportoRichiesto: datiLocale.rapportoRichiesto || '8,00',
        specificaSuperficie: datiLocale.specificaSuperficie || '',
        superficieUtile: datiLocale.superficieUtile || 0,
        aperture: datiLocale.aperture || [],
        createdAt: new Date().toISOString()
      };
      piano.locali.push(locale);
      this.saveToStorage();
      return locale;
    }
    return null;
  }

  getLocale(edificioId, pianoId, localeId) {
    const piano = this.getPiano(edificioId, pianoId);
    if (piano) {
      return piano.locali.find(l => l.id === localeId);
    }
    return null;
  }

  modificaLocale(edificioId, pianoId, localeId, datiLocale) {
    const locale = this.getLocale(edificioId, pianoId, localeId);
    if (locale) {
      Object.assign(locale, {
        edificioId,
        edificioNome: this.getEdificio(edificioId)?.nome || locale.edificioNome,
        pianoId,
        pianoNome: this.getPiano(edificioId, pianoId)?.nome || locale.pianoNome,
        nome: datiLocale.nome,
        tipologiaSuperficie: datiLocale.tipologiaSuperficie || 'ABITAZIONE',
        rapportoRichiesto: datiLocale.rapportoRichiesto,
        specificaSuperficie: datiLocale.specificaSuperficie,
        superficieUtile: datiLocale.superficieUtile,
        aperture: datiLocale.aperture
      });
      this.saveToStorage();
      return locale;
    }
    return null;
  }

  eliminaLocale(edificioId, pianoId, localeId) {
    const piano = this.getPiano(edificioId, pianoId);
    if (piano) {
      const index = piano.locali.findIndex(l => l.id === localeId);
      if (index !== -1) {
        piano.locali.splice(index, 1);
        this.saveToStorage();
        return true;
      }
    }
    return false;
  }

  duplicaLocale(edificioId, pianoId, localeId) {
    const localeOrigine = this.getLocale(edificioId, pianoId, localeId);
    if (!localeOrigine) {
      return null;
    }

    const edificio = this.getEdificio(edificioId);
    const piano = this.getPiano(edificioId, pianoId);
    if (!edificio || !piano) {
      return null;
    }

    const nuovoLocale = {
      ...localeOrigine,
      id: this.generateId(),
      nome: `${localeOrigine.nome || 'Locale'} copia`,
      edificioId,
      edificioNome: edificio.nome,
      pianoId,
      pianoNome: piano.nome,
      aperture: Array.isArray(localeOrigine.aperture)
        ? JSON.parse(JSON.stringify(localeOrigine.aperture))
        : [],
      createdAt: new Date().toISOString()
    };

    piano.locali.push(nuovoLocale);
    this.saveToStorage();
    return nuovoLocale;
  }

  resetData() {
    this.edifici = [];
    this.costoCostruzione = {
      costoMq: '0,00',
      oneriPrimari: '0,00',
      oneriSecondari: '0,00',
      smaltimentoRifiuti: '0,00',
      volume: '0,00',
      inc3: '0',
      percentualeContributo: null
    };
    try {
      localStorage.removeItem('praticaEdilizia');
    } catch (error) {
      console.error('Errore durante la pulizia del localStorage', error);
    }
    this.saveToStorage();
  }

  // Ottieni tutti gli edifici (ordinati per nome in ordine crescente)
  getAllEdifici() {
    // Ordina gli edifici per nome in ordine crescente (alfabetico)
    return [...this.edifici].sort((a, b) => {
      const nomeA = (a.nome || '').toLowerCase().trim();
      const nomeB = (b.nome || '').toLowerCase().trim();
      return nomeA.localeCompare(nomeB, 'it', { sensitivity: 'base' });
    });
  }

  // Ottieni tutti i piani di un edificio
  getPianiByEdificio(edificioId) {
    const edificio = this.getEdificio(edificioId);
    return edificio ? edificio.piani : [];
  }

  // Ottieni tutti i locali di un piano
  getLocaliByPiano(edificioId, pianoId) {
    const piano = this.getPiano(edificioId, pianoId);
    return piano ? piano.locali : [];
  }

  // Ottieni tutti i locali di un edificio
  getAllLocaliByEdificio(edificioId) {
    const edificio = this.getEdificio(edificioId);
    if (!edificio) return [];
    
    const locali = [];
    edificio.piani.forEach(piano => {
      piano.locali.forEach(locale => {
        locali.push({
          ...locale,
          edificioId: edificioId,
          edificioNome: edificio.nome,
          pianoId: piano.id,
          pianoNome: piano.nome
        });
      });
    });
    return locali;
  }
}

