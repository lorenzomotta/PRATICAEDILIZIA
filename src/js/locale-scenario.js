/**
 * Flag PRIMA / DOPO sui locali e filtri per report e costo di costruzione.
 */

export function localePartecipaPrima(locale) {
  if (!locale) return false;
  if (locale.partecipaPrima === undefined) return true;
  return locale.partecipaPrima === true;
}

export function localePartecipaDopo(locale) {
  if (!locale) return false;
  if (locale.partecipaDopo === undefined) return true;
  return locale.partecipaDopo === true;
}

export function localeInScenario(locale, scenario) {
  if (scenario === 'prima') return localePartecipaPrima(locale);
  return localePartecipaDopo(locale);
}

export function normalizeLocaleFlags(locale) {
  if (!locale) return;
  if (locale.partecipaPrima === undefined) locale.partecipaPrima = true;
  if (locale.partecipaDopo === undefined) locale.partecipaDopo = true;
}

export function normalizeAllLocalesInEdifici(edifici) {
  if (!Array.isArray(edifici)) return;
  edifici.forEach((edificio) => {
    const piani = Array.isArray(edificio.piani) ? edificio.piani : [];
    piani.forEach((piano) => {
      const locali = Array.isArray(piano.locali) ? piano.locali : [];
      locali.forEach((locale) => normalizeLocaleFlags(locale));
    });
  });
}

export function filtraLocaliPerScenario(locali, scenario) {
  const lista = Array.isArray(locali) ? locali : [];
  return lista.filter((l) => localeInScenario(l, scenario));
}

export function etichettaScenarioLocale(locale) {
  const prima = localePartecipaPrima(locale);
  const dopo = localePartecipaDopo(locale);
  if (prima && dopo) return 'PRIMA + DOPO';
  if (prima) return 'solo PRIMA';
  if (dopo) return 'solo DOPO';
  return 'escluso';
}

export function badgeScenarioLocaleHtml(locale) {
  const prima = localePartecipaPrima(locale);
  const dopo = localePartecipaDopo(locale);
  const parts = [];
  if (prima) parts.push('<span class="badge bg-secondary me-1">PRIMA</span>');
  if (dopo) parts.push('<span class="badge bg-primary">DOPO</span>');
  if (parts.length === 0) parts.push('<span class="badge bg-warning text-dark">—</span>');
  return parts.join('');
}
