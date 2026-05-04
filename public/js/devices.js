(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const I18n = window.ITTicketsI18n;
  const t = I18n ? I18n.t.bind(I18n) : (k) => k;

  const THEME_KEY = 'it-tickets-theme';

  let editingBrandId = null;
  let editingDeviceId = null;

  function typeLabel(tp) {
    const m = {
      printer: 'typePrinter',
      computer: 'typeComputer',
      peripheral: 'typePeripheral',
      other: 'typeOther',
    };
    return t(m[tp] || 'typeOther');
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    $('#themeToggle').textContent = dark ? '☀️' : '🌙';
  }

  $('#themeToggle').addEventListener('click', () => {
    const next =
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    $('#themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
  });

  initTheme();

  function api(path, opts = {}) {
    return fetch(path, {
      headers: {
        Accept: 'application/json',
        ...(opts.body && typeof opts.body === 'string'
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      ...opts,
    }).then(async (r) => {
      if (r.status === 204) return null;
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || r.statusText);
        return data;
      }
      if (!r.ok) throw new Error(await r.text());
      return r;
    });
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function syncModalDefaultTitles() {
    $('#brandModalTitle').textContent = t('devModalBrandTitleAdd');
    $('#brandModalSubmit').textContent = t('devAddBrand');
    $('#deviceModalTitle').textContent = t('devModalDeviceTitleAdd');
    $('#deviceModalSubmit').textContent = t('devAddDevice');
  }

  function closeBrandModal() {
    $('#brandModalBackdrop').hidden = true;
    editingBrandId = null;
    $('#brandModalForm').reset();
    $('#brandModalTitle').textContent = t('devModalBrandTitleAdd');
    $('#brandModalSubmit').textContent = t('devAddBrand');
  }

  function closeDeviceModal() {
    $('#deviceModalBackdrop').hidden = true;
    editingDeviceId = null;
    $('#modalDevLabel').value = '';
    $('#modalDevType').selectedIndex = 0;
    $('#modalDevBrandId').innerHTML = '';
    $('#deviceModalTitle').textContent = t('devModalDeviceTitleAdd');
    $('#deviceModalSubmit').textContent = t('devAddDevice');
  }

  function openBrandModal(opts) {
    const o = opts || {};
    const id = o.id != null ? Number(o.id) : null;
    const name = o.name != null ? String(o.name) : '';
    editingBrandId = id;
    if (editingBrandId) {
      $('#brandModalTitle').textContent = t('devModalBrandTitleEdit');
      $('#brandModalSubmit').textContent = t('devSave');
      $('#modalBrandName').value = name;
    } else {
      $('#brandModalTitle').textContent = t('devModalBrandTitleAdd');
      $('#brandModalSubmit').textContent = t('devAddBrand');
      $('#modalBrandName').value = '';
    }
    $('#brandModalBackdrop').hidden = false;
    requestAnimationFrame(() => $('#modalBrandName').focus());
  }

  async function loadBrandSelectForModal(selectedId) {
    const brands = await api('/api/brands');
    const sel = $('#modalDevBrandId');
    const cur = selectedId != null ? String(selectedId) : sel.value;
    sel.innerHTML = brands
      .map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`)
      .join('');
    if (brands.length && cur && [...sel.options].some((opt) => opt.value === cur)) {
      sel.value = cur;
    }
    return brands;
  }

  async function openDeviceModal(device) {
    editingDeviceId = device && device.id != null ? Number(device.id) : null;
    if (editingDeviceId) {
      await loadBrandSelectForModal(device.brand_id);
      $('#deviceModalTitle').textContent = t('devModalDeviceTitleEdit');
      $('#deviceModalSubmit').textContent = t('devSaveDevice');
      $('#modalDevType').value = device.device_type;
      $('#modalDevBrandId').value = String(device.brand_id);
      $('#modalDevLabel').value = device.label || '';
    } else {
      $('#modalDevType').selectedIndex = 0;
      $('#modalDevLabel').value = '';
      await loadBrandSelectForModal(null);
      $('#deviceModalTitle').textContent = t('devModalDeviceTitleAdd');
      $('#deviceModalSubmit').textContent = t('devAddDevice');
      if ($('#modalDevBrandId').options.length) $('#modalDevBrandId').selectedIndex = 0;
    }
    $('#deviceModalBackdrop').hidden = false;
    requestAnimationFrame(() => $('#modalDevType').focus());
  }

  async function loadBrandsTable() {
    const brands = await api('/api/brands');
    const tb = $('#brandRows');
    if (!brands.length) {
      tb.innerHTML = `<tr><td colspan="2" class="empty-state">${escapeHtml(t('devNoBrands'))}</td></tr>`;
      return;
    }
    tb.innerHTML = brands
      .map(
        (b) => `<tr data-brand-id="${b.id}">
        <td>${escapeHtml(b.name)}</td>
        <td style="white-space:nowrap">
          <button type="button" class="btn btn-ghost btn-sm brand-edit-btn" data-id="${b.id}">${escapeHtml(t('devEdit'))}</button>
          <button type="button" class="btn btn-danger btn-sm brand-del-btn" data-id="${b.id}">${escapeHtml(t('devDelete'))}</button>
        </td>
      </tr>`
      )
      .join('');

    $$('.brand-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const name = btn.closest('tr').cells[0].textContent.trim();
        openBrandModal({ id, name });
      });
    });

    $$('.brand-del-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(t('devConfirmBrand'))) return;
        try {
          await api(`/api/brands/${btn.dataset.id}`, { method: 'DELETE' });
          await refreshAll();
        } catch (e) {
          alert(e.message || String(e));
        }
      });
    });
  }

  async function loadDevicesTable() {
    const devices = await api('/api/devices');
    const tb = $('#deviceRows');
    if (!devices.length) {
      tb.innerHTML = `<tr><td colspan="4" class="empty-state">${escapeHtml(t('devNoDevices'))}</td></tr>`;
      return;
    }
    tb.innerHTML = devices
      .map(
        (d) => `<tr>
        <td>${escapeHtml(typeLabel(d.device_type))}</td>
        <td>${escapeHtml(d.brand_name)}</td>
        <td>${escapeHtml(d.label || '—')}</td>
        <td style="white-space:nowrap">
          <button type="button" class="btn btn-ghost btn-sm dev-edit" data-id="${d.id}">${escapeHtml(t('devEdit'))}</button>
          <button type="button" class="btn btn-danger btn-sm dev-del" data-id="${d.id}">${escapeHtml(t('devDelete'))}</button>
        </td>
      </tr>`
      )
      .join('');

    $$('.dev-edit').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        const list = await api('/api/devices');
        const d = list.find((x) => x.id === id);
        if (!d) return;
        openDeviceModal(d);
      });
    });

    $$('.dev-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(t('devConfirmDevice'))) return;
        try {
          await api(`/api/devices/${btn.dataset.id}`, { method: 'DELETE' });
          await refreshAll();
        } catch (e) {
          alert(e.message || String(e));
        }
      });
    });
  }

  async function refreshAll() {
    closeBrandModal();
    closeDeviceModal();
    syncModalDefaultTitles();
    await Promise.all([loadBrandsTable(), loadDevicesTable()]);
  }

  $('#openBrandModalBtn').addEventListener('click', () => openBrandModal());

  $('#openDeviceModalBtn').addEventListener('click', () => {
    openDeviceModal(null).catch(console.error);
  });

  $('#brandModalCancel').addEventListener('click', () => closeBrandModal());
  $('#brandModalCloseX').addEventListener('click', () => closeBrandModal());
  $('#brandModalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('#brandModalBackdrop')) closeBrandModal();
  });

  $('#deviceModalCancel').addEventListener('click', () => closeDeviceModal());
  $('#deviceModalCloseX').addEventListener('click', () => closeDeviceModal());
  $('#deviceModalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('#deviceModalBackdrop')) closeDeviceModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#brandModalBackdrop').hidden) closeBrandModal();
    else if (!$('#deviceModalBackdrop').hidden) closeDeviceModal();
  });

  $('#brandModalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#modalBrandName').value.trim();
    if (!name) return;
    try {
      if (editingBrandId) {
        await api(`/api/brands/${editingBrandId}`, { method: 'PUT', body: JSON.stringify({ name }) });
      } else {
        await api('/api/brands', { method: 'POST', body: JSON.stringify({ name }) });
      }
      closeBrandModal();
      await refreshAll();
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  $('#deviceModalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      deviceType: $('#modalDevType').value,
      brandId: Number($('#modalDevBrandId').value),
      label: $('#modalDevLabel').value,
    };
    try {
      if (editingDeviceId) {
        await api(`/api/devices/${editingDeviceId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await api('/api/devices', { method: 'POST', body: JSON.stringify(body) });
      }
      closeDeviceModal();
      await refreshAll();
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  window.addEventListener('it-lang-change', () => {
    syncModalDefaultTitles();
    refreshAll().catch(console.error);
  });

  syncModalDefaultTitles();

  refreshAll().catch((e) => {
    console.error(e);
    $('#brandRows').innerHTML = `<tr><td colspan="2" class="err">${escapeHtml(t('devServerErr'))}</td></tr>`;
  });
})();
