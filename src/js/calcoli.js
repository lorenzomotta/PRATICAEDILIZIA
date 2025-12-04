// Funzioni di calcolo per le aperture e i rapporti

/**
 * Converte un numero in formato italiano (con virgola) in numero JavaScript
 */
export function parseItalianNumber(value) {
  if (typeof value === 'string') {
    return parseFloat(value.replace(',', '.')) || 0;
  }
  return parseFloat(value) || 0;
}

/**
 * Formatta un numero in formato italiano (con virgola)
 */
export function formatItalianNumber(num, decimals = 2) {
  return num.toFixed(decimals).replace('.', ',');
}

/**
 * Calcola la superficie utile da una formula matematica
 */
export function calcolaSuperficieUtile(formula) {
  try {
    if (!formula || formula.trim() === '') {
      return 0;
    }
    // Sostituisci le virgole con punti per il calcolo
    const formulaCalcolo = formula.replace(/,/g, '.');
    const result = eval(formulaCalcolo);
    return parseFloat(result) || 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Calcola i valori di un'apertura
 */
export function calcolaApertura(apertura) {
  const larghezza = parseItalianNumber(apertura.larghezza) || 0;
  const altezza = parseItalianNumber(apertura.altezza) || 0;
  const hdavanzale = parseItalianNumber(apertura.hdavanzale) || 0;
  const imposta = parseItalianNumber(apertura.imposta) || 0.20;
  const sporgenza = parseItalianNumber(apertura.sporgenza) || 0;

  // Calcola H TOT = ALTEZZA + HDAVANZALE + IMPOSTA
  const htot = altezza + hdavanzale + imposta;

  // Calcola L/2 = SPORGENZA / 2
  const l2 = sporgenza / 2;

  // Calcola UNTERZO
  let unterzo = altezza / 3; // Valore iniziale

  if (sporgenza >= 1.21) {
    const elemezzi = sporgenza / 2;
    unterzo = elemezzi - imposta;
    if (unterzo > altezza) {
      unterzo = altezza;
    }
  } else {
    unterzo = 0;
  }

  // Calcola INTERO
  let intero = 0;
  if (hdavanzale > 0) {
    if (hdavanzale <= 0.6) {
      intero = altezza - (unterzo + 0.6);
    } else {
      intero = altezza - unterzo;
    }
  } else {
    intero = (altezza - 0.6) - unterzo;
  }

  if (intero < 0) {
    unterzo = unterzo + intero;
    intero = 0;
  }

  // AREA FINESTRATA = LARGHEZZA * (INTERO + (UNTERZO / 3))
  let areaFinestrata = 0;
  if (larghezza > 0) {
    areaFinestrata = larghezza * (intero + (unterzo / 3));
  }

  return {
    htot: htot,
    l2: l2,
    unterzo: unterzo,
    intero: intero,
    areaFinestrata: areaFinestrata
  };
}

/**
 * Calcola il totale area finestrata da un array di aperture
 */
export function calcolaTotaleAreaFinestrata(aperture) {
  let totale = 0;
  aperture.forEach(apertura => {
    const calcoli = calcolaApertura(apertura);
    totale += calcoli.areaFinestrata;
  });
  return totale;
}

/**
 * Calcola il rapporto superficie/area finestrata
 */
export function calcolaRapporto(superficieLocale, totaleAreaFinestrata) {
  if (totaleAreaFinestrata > 0) {
    return superficieLocale / totaleAreaFinestrata;
  }
  return 0;
}

/**
 * Verifica se il rapporto è valido rispetto al rapporto richiesto
 */
export function verificaRapporto(rapporto, rapportoRichiesto) {
  return rapporto <= rapportoRichiesto;
}

