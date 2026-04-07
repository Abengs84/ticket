(function () {
  const $ = (sel) => document.querySelector(sel);
  const I18n = window.ITTicketsI18n;
  const t = I18n ? I18n.t.bind(I18n) : (k) => k;

  const MANAGE_TAB_KEY = 'it-loan-manage-kind';

  let editingLoanAssetId = null;
  let brandsCache = [];
  let abittiCache = [];

  function getManageKind() {
    try {
      const v = localStorage.getItem(MANAGE_TAB_KEY);
      if (v === 'charger' || v === 'other' || v === 'computer') return v;
    } catch (_) {
      /* ignore */
    }
    return 'computer';
  }

  function setManageKind(k) {
    try {
      localStorage.setItem(MANAGE_TAB_KEY, k);
    } catch (_) {
      /* ignore */
    }
  }

  function applyManageTab() {
    const k = getManageKind();
    const map = {
      computer: { panel: $('#panelManageComputers'), tab: $('#tabManageComputers') },
      charger: { panel: $('#panelManageChargers'), tab: $('#tabManageChargers') },
      other: { panel: $('#panelManageOther'), tab: $('#tabManageOther') },
    };
    Object.keys(map).forEach((key) => {
      const on = key === k;
      const { panel, tab } = map[key];
      if (panel) panel.hidden = !on;
      if (tab) {
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.classList.toggle('is-active', on);
        tab.tabIndex = on ? 0 : -1;
      }
    });
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: {
        Accept: 'application/json',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...opts,
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const err = (data && data.error) || res.statusText || 'Request failed';
      throw new Error(err);
    }
    return data;
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function fillBrandSelect(sel, selectedId) {
    sel.innerHTML = '';
    const o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = t('loanBrandOptional');
    sel.appendChild(o0);
    brandsCache.forEach((b) => {
      const o = document.createElement('option');
      o.value = String(b.id);
      o.textContent = b.name;
      if (selectedId != null && Number(selectedId) === Number(b.id)) o.selected = true;
      sel.appendChild(o);
    });
  }

  function fillAbittiSelect(sel, selectedId) {
    sel.innerHTML = '';
    const o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = '';
    sel.appendChild(o0);
    abittiCache.forEach((v) => {
      const o = document.createElement('option');
      o.value = String(v.id);
      o.textContent = v.label;
      if (selectedId != null && Number(selectedId) === Number(v.id)) o.selected = true;
      sel.appendChild(o);
    });
  }

  async function loadMeta() {
    const [brands, abitti] = await Promise.all([
      api('/api/brands'),
      api('/api/loan/abitti2-versions'),
    ]);
    brandsCache = brands || [];
    abittiCache = abitti || [];
  }

  function titleForAdd(kind) {
    if (kind === 'computer') return t('loanModalComputerAdd');
    if (kind === 'charger') return t('loanModalChargerAdd');
    return t('loanModalOtherAdd');
  }

  function titleForEdit(kind) {
    if (kind === 'computer') return t('loanModalComputerEdit');
    if (kind === 'charger') return t('loanModalChargerEdit');
    return t('loanModalOtherEdit');
  }

  function submitLabelForAdd(kind) {
    if (kind === 'computer') return t('loanAddComputer');
    if (kind === 'charger') return t('loanAddCharger');
    return t('loanAddOther');
  }

  function namePlaceholder(kind) {
    if (kind === 'computer') return t('loanPhComputer');
    if (kind === 'charger') return t('loanPhCharger');
    return t('loanPhOther');
  }

  function closeLoanManageModal() {
    $('#loanManageModalBackdrop').hidden = true;
    editingLoanAssetId = null;
    $('#modalLoanAssetId').value = '';
    $('#modalLoanName').value = '';
    $('#modalLoanBrand').innerHTML = '';
    $('#modalLoanAbitti').innerHTML = '';
    $('#loanManageModalTitle').textContent = t('loanModalComputerAdd');
    $('#loanManageModalSubmit').textContent = t('loanAddComputer');
  }

  async function openLoanManageModal(kind, asset) {
    await loadMeta();
    $('#modalLoanKind').value = kind;
    editingLoanAssetId = asset && asset.id != null ? Number(asset.id) : null;
    $('#modalLoanAssetId').value = editingLoanAssetId ? String(editingLoanAssetId) : '';

    const abittiWrap = $('#modalLoanAbittiWrap');
    abittiWrap.hidden = kind !== 'computer';
    fillBrandSelect($('#modalLoanBrand'), asset ? asset.brandId : null);
    if (kind === 'computer') {
      fillAbittiSelect($('#modalLoanAbitti'), asset ? asset.abitti2VersionId : null);
    }

    $('#modalLoanName').placeholder = namePlaceholder(kind);

    if (asset) {
      $('#modalLoanName').value = asset.name || '';
      $('#loanManageModalTitle').textContent = titleForEdit(kind);
      $('#loanManageModalSubmit').textContent = t('loanModalSave');
    } else {
      $('#modalLoanName').value = '';
      $('#loanManageModalTitle').textContent = titleForAdd(kind);
      $('#loanManageModalSubmit').textContent = submitLabelForAdd(kind);
    }

    $('#loanManageModalBackdrop').hidden = false;
    requestAnimationFrame(() => $('#modalLoanName').focus());
  }

  async function load() {
    await loadMeta();
    const rows = await api('/api/loan/assets');
    const computers = rows.filter((r) => r.kind === 'computer');
    const chargers = rows.filter((r) => r.kind === 'charger');
    const others = rows.filter((r) => r.kind === 'other');
    renderList($('#listComputers'), computers, 'computer');
    renderList($('#listChargers'), chargers, 'charger');
    renderList($('#listOther'), others, 'other');
  }

  function renderList(ul, rows, kind) {
    ul.innerHTML = '';
    if (!rows.length) {
      ul.innerHTML = `<li style="color:var(--muted);border:none">${escapeHtml(t('loanListEmpty'))}</li>`;
      return;
    }
    rows.forEach((r) => {
      const li = document.createElement('li');
      li.className = 'loan-manage-li';
      const title = document.createElement('div');
      title.className = 'loan-manage-li-title';
      title.textContent = r.name;
      const actions = document.createElement('div');
      actions.className = 'loan-manage-li-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn btn-ghost btn-sm';
      edit.setAttribute('data-i18n', 'devEdit');
      edit.textContent = t('devEdit');
      edit.addEventListener('click', () => {
        openLoanManageModal(kind, r).catch((e) => alert(e.message));
      });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-sm';
      del.textContent = t('loanRemove');
      del.addEventListener('click', async () => {
        const msg = t('loanConfirmRemove').replace(/\{name\}/g, r.name);
        if (!confirm(msg)) return;
        try {
          await api(`/api/loan/assets/${r.id}`, { method: 'DELETE' });
          await load();
        } catch (e) {
          alert(e.message);
        }
      });
      actions.appendChild(edit);
      actions.appendChild(del);
      li.appendChild(title);
      li.appendChild(actions);
      ul.appendChild(li);
    });
  }

  $('#loanManageModalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const kind = $('#modalLoanKind').value;
    const name = $('#modalLoanName').value.trim();
    if (!name) return;
    const brandId = $('#modalLoanBrand').value || null;
    const abitti2VersionId =
      kind === 'computer' ? $('#modalLoanAbitti').value || null : null;
    try {
      if (editingLoanAssetId) {
        const patch = { name, brandId };
        if (kind === 'computer') patch.abitti2VersionId = abitti2VersionId;
        await api(`/api/loan/assets/${editingLoanAssetId}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        });
      } else {
        await api('/api/loan/assets', {
          method: 'POST',
          body: JSON.stringify({
            kind,
            name,
            brandId,
            abitti2VersionId,
          }),
        });
      }
      closeLoanManageModal();
      await load();
    } catch (err) {
      alert(err.message);
    }
  });

  $('#loanManageModalCancel').addEventListener('click', () => closeLoanManageModal());
  $('#loanManageModalCloseX').addEventListener('click', () => closeLoanManageModal());
  $('#loanManageModalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('#loanManageModalBackdrop')) closeLoanManageModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#loanManageModalBackdrop').hidden) closeLoanManageModal();
  });

  $('#btnAddComputer').addEventListener('click', () => {
    openLoanManageModal('computer', null).catch((err) => alert(err.message));
  });
  $('#btnAddCharger').addEventListener('click', () => {
    openLoanManageModal('charger', null).catch((err) => alert(err.message));
  });
  $('#btnAddOther').addEventListener('click', () => {
    openLoanManageModal('other', null).catch((err) => alert(err.message));
  });

  window.addEventListener('it-lang-change', () => {
    closeLoanManageModal();
    load().catch((e) => alert(e.message));
  });

  ['tabManageComputers', 'tabManageChargers', 'tabManageOther'].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const kind = btn.getAttribute('data-kind');
      if (!kind) return;
      setManageKind(kind);
      applyManageTab();
    });
  });

  applyManageTab();
  closeLoanManageModal();
  load().catch((e) => alert(e.message));
})();
