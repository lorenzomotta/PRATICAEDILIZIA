// Combobox a tendina con checkbox per filtri report

const comboboxInstances = new Map();
let documentClickListenerAttached = false;

function escapeHtmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function attachDocumentClickListener() {
  if (documentClickListenerAttached) return;
  documentClickListenerAttached = true;
  document.addEventListener('click', (e) => {
    comboboxInstances.forEach((instance) => {
      if (!instance.isOpen()) return;
      if (instance.root.contains(e.target)) return;
      instance.closeMenu();
    });
  });
}

/**
 * @param {string} rootId - id del contenitore .report-combobox
 * @param {object} options
 */
export function initReportCombobox(rootId, options = {}) {
  const root = document.getElementById(rootId);
  if (!root) {
    console.warn(`Report combobox: elemento #${rootId} non trovato`);
    return null;
  }

  const {
    labelTutti = 'Tutti',
    labelVuoto = 'Nessun elemento',
    onChange = null
  } = options;

  const toggle = root.querySelector('.report-combobox-toggle');
  const summary = root.querySelector('.report-combobox-summary');
  const menu = root.querySelector('.report-combobox-menu');
  const chkTutti = root.querySelector('.report-combobox-chk-tutti');
  const scroll = root.querySelector('.report-combobox-scroll');

  if (!toggle || !summary || !menu || !chkTutti || !scroll) {
    console.warn(`Report combobox #${rootId}: struttura HTML incompleta`);
    return null;
  }

  let items = [];
  let open = false;

  const instance = {
    root,
    rootId,
    isOpen: () => open,
    setItems(newItems, preserveSelection = true) {
      const tuttiAttivo = chkTutti.checked;
      const prev = preserveSelection && !tuttiAttivo
        ? new Set(instance.getSelectedIds())
        : new Set();
      items = Array.isArray(newItems) ? newItems : [];
      renderList(prev);
      updateSummary();
    },
    getSelectedIds() {
      if (chkTutti.checked) return [];
      return Array.from(scroll.querySelectorAll('.report-combobox-chk-item:checked')).map((el) => el.value);
    },
    clearSelection() {
      chkTutti.checked = true;
      scroll.querySelectorAll('.report-combobox-chk-item').forEach((el) => { el.checked = true; });
      updateSummary();
    },
    setEnabled(enabled) {
      root.classList.toggle('is-disabled', !enabled);
      if (!enabled) instance.closeMenu();
    },
    closeMenu: () => {}
  };

  function renderList(prevSelected) {
    if (items.length === 0) {
      scroll.innerHTML = `<div class="report-combobox-empty">${escapeHtmlText(labelVuoto)}</div>`;
      chkTutti.disabled = true;
      chkTutti.checked = true;
      return;
    }
    chkTutti.disabled = false;
    const usaFiltroParziale = prevSelected.size > 0;
    if (!usaFiltroParziale) chkTutti.checked = true;

    scroll.innerHTML = items.map((item) => {
      const inputId = `${rootId}-opt-${item.id}`;
      const checked = !usaFiltroParziale || prevSelected.has(item.id);
      return `
        <div class="report-combobox-item form-check">
          <input type="checkbox" class="form-check-input report-combobox-chk-item" id="${escapeHtmlAttr(inputId)}" value="${escapeHtmlAttr(item.id)}" ${checked ? 'checked' : ''}>
          <label class="form-check-label" for="${escapeHtmlAttr(inputId)}">${escapeHtmlText(item.label)}</label>
        </div>
      `;
    }).join('');
  }

  function updateSummary() {
    if (items.length === 0) {
      summary.textContent = labelVuoto;
      return;
    }
    if (chkTutti.checked) {
      summary.textContent = labelTutti;
      return;
    }
    const selected = instance.getSelectedIds();
    if (selected.length === 0) {
      summary.textContent = 'Nessuno selezionato';
      return;
    }
    if (selected.length === 1) {
      const item = items.find((i) => i.id === selected[0]);
      summary.textContent = item ? item.label : '1 selezionato';
      return;
    }
    summary.textContent = `${selected.length} selezionati`;
  }

  function notifyChange() {
    updateSummary();
    if (typeof onChange === 'function') onChange(instance.getSelectedIds());
  }

  function positionMenu() {
    const rect = toggle.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.width = `${Math.max(rect.width, 220)}px`;
    menu.style.right = 'auto';
    menu.style.zIndex = '2000';
  }

  function resetMenuPosition() {
    menu.style.position = '';
    menu.style.top = '';
    menu.style.left = '';
    menu.style.width = '';
    menu.style.right = '';
    menu.style.zIndex = '';
  }

  function openMenu() {
    if (root.classList.contains('is-disabled')) return;
    closeAllReportComboboxes(rootId);
    positionMenu();
    menu.classList.remove('d-none');
    toggle.setAttribute('aria-expanded', 'true');
    open = true;
  }

  function closeMenu() {
    menu.classList.add('d-none');
    toggle.setAttribute('aria-expanded', 'false');
    resetMenuPosition();
    open = false;
  }

  instance.closeMenu = closeMenu;

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) closeMenu();
    else openMenu();
  });

  chkTutti.addEventListener('change', () => {
    const checkboxes = scroll.querySelectorAll('.report-combobox-chk-item');
    checkboxes.forEach((el) => { el.checked = chkTutti.checked; });
    notifyChange();
  });

  scroll.addEventListener('change', (e) => {
    if (!e.target.classList.contains('report-combobox-chk-item')) return;
    const boxes = scroll.querySelectorAll('.report-combobox-chk-item');
    const checkedCount = Array.from(boxes).filter((b) => b.checked).length;
    chkTutti.checked = checkedCount === boxes.length;
    notifyChange();
  });

  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  window.addEventListener('resize', () => {
    if (open) positionMenu();
  });

  comboboxInstances.set(rootId, instance);
  attachDocumentClickListener();

  return instance;
}

export function closeAllReportComboboxes(exceptId = null) {
  comboboxInstances.forEach((instance, id) => {
    if (id !== exceptId) instance.closeMenu();
  });
}

export function getReportCombobox(rootId) {
  return comboboxInstances.get(rootId) || null;
}
