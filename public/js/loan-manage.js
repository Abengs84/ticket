(function () {
  const $ = (sel) => document.querySelector(sel);
  const I18n = window.ITTicketsI18n;
  const t = I18n ? I18n.t.bind(I18n) : (k) => k;

  const MANAGE_TAB_KEY = 'it-loan-manage-kind';

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

  let brandsCache = [];
  let abittiCache = [];

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
    fillBrandSelect($('#computerBrand'), null);
    fillBrandSelect($('#chargerBrand'), null);
    fillBrandSelect($('#otherBrand'), null);
    fillAbittiSelect($('#computerAbitti'), null);
  }

  async function load() {
    await loadMeta();
    const rows = await api('/api/loan/assets');
    const computers = rows.filter((r) => r.kind === 'computer');
    const chargers = rows.filter((r) => r.kind === 'charger');
    const others = rows.filter((r) => r.kind === 'other');
    renderComputers($('#listComputers'), computers);
    renderBrandRows($('#listChargers'), chargers);
    renderBrandRows($('#listOther'), others);
  }

  async function patchComputerRow(assetId, selB, selA) {
    selB.disabled = true;
    selA.disabled = true;
    try {
      await api(`/api/loan/assets/${assetId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          brandId: selB.value || null,
          abitti2VersionId: selA.value || null,
        }),
      });
      await load();
    } catch (e) {
      alert(e.message);
      await load();
    }
  }

  function renderComputers(ul, rows) {
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
      const row = document.createElement('div');
      row.className = 'loan-manage-li-controls';
      const selB = document.createElement('select');
      selB.className = 'lang-select';
      selB.title = t('loanBrandHintTitle');
      selB.setAttribute('aria-label', t('loanBrandOptional'));
      fillBrandSelect(selB, r.brandId);
      const selA = document.createElement('select');
      selA.className = 'lang-select';
      selA.setAttribute('aria-label', t('loanAbitti2Optional'));
      fillAbittiSelect(selA, r.abitti2VersionId);
      const onChange = () => patchComputerRow(r.id, selB, selA);
      selB.addEventListener('change', onChange);
      selA.addEventListener('change', onChange);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn';
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
      row.appendChild(selB);
      row.appendChild(selA);
      row.appendChild(del);
      li.appendChild(title);
      li.appendChild(row);
      ul.appendChild(li);
    });
  }

  async function patchBrandOnlyRow(assetId, selB) {
    selB.disabled = true;
    try {
      await api(`/api/loan/assets/${assetId}`, {
        method: 'PATCH',
        body: JSON.stringify({ brandId: selB.value || null }),
      });
      await load();
    } catch (e) {
      alert(e.message);
      await load();
    }
  }

  function renderBrandRows(ul, rows) {
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
      const row = document.createElement('div');
      row.className = 'loan-manage-li-controls';
      const selB = document.createElement('select');
      selB.className = 'lang-select';
      selB.title = t('loanBrandHintTitle');
      selB.setAttribute('aria-label', t('loanBrandOptional'));
      fillBrandSelect(selB, r.brandId);
      selB.addEventListener('change', () => patchBrandOnlyRow(r.id, selB));
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn';
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
      row.appendChild(selB);
      row.appendChild(del);
      li.appendChild(title);
      li.appendChild(row);
      ul.appendChild(li);
    });
  }

  $('#formComputer').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#computerName').value.trim();
    if (!name) return;
    try {
      await api('/api/loan/assets', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'computer',
          name,
          brandId: $('#computerBrand').value || null,
          abitti2VersionId: $('#computerAbitti').value || null,
        }),
      });
      $('#computerName').value = '';
      $('#computerBrand').value = '';
      $('#computerAbitti').value = '';
      await load();
    } catch (err) {
      alert(err.message);
    }
  });

  $('#formCharger').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#chargerName').value.trim();
    if (!name) return;
    try {
      await api('/api/loan/assets', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'charger',
          name,
          brandId: $('#chargerBrand').value || null,
        }),
      });
      $('#chargerName').value = '';
      $('#chargerBrand').value = '';
      await load();
    } catch (err) {
      alert(err.message);
    }
  });

  $('#formOther').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#otherName').value.trim();
    if (!name) return;
    try {
      await api('/api/loan/assets', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'other',
          name,
          brandId: $('#otherBrand').value || null,
        }),
      });
      $('#otherName').value = '';
      $('#otherBrand').value = '';
      await load();
    } catch (err) {
      alert(err.message);
    }
  });

  window.addEventListener('it-lang-change', () => {
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
  load().catch((e) => alert(e.message));
})();
