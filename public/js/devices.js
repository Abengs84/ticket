(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const THEME_KEY = 'it-tickets-theme';

  const TYPE_LABELS = {
    printer: 'Printer',
    computer: 'Computer',
    peripheral: 'Peripheral',
    other: 'Other',
  };

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

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  let editingDeviceId = null;

  async function loadBrandSelect(selectedId) {
    const brands = await api('/api/brands');
    const sel = $('#devBrandId');
    const cur = selectedId != null ? String(selectedId) : sel.value;
    sel.innerHTML = brands
      .map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`)
      .join('');
    if (brands.length && cur && [...sel.options].some((o) => o.value === cur)) {
      sel.value = cur;
    }
    return brands;
  }

  async function loadBrandsTable() {
    const brands = await api('/api/brands');
    const tb = $('#brandRows');
    if (!brands.length) {
      tb.innerHTML = `<tr><td colspan="2" class="empty-state">No brands yet. Add one above.</td></tr>`;
      return;
    }
    tb.innerHTML = brands
      .map(
        (b) => `<tr data-brand-id="${b.id}">
        <td>
          <span class="brand-view-${b.id}">${escapeHtml(b.name)}</span>
          <input type="text" class="brand-edit-${b.id}" value="${escapeHtml(b.name)}" style="display:none;width:100%;font:inherit" />
        </td>
        <td style="white-space:nowrap">
          <button type="button" class="btn btn-ghost btn-sm brand-edit-btn" data-id="${b.id}">Edit</button>
          <button type="button" class="btn btn-danger btn-sm brand-del-btn" data-id="${b.id}">Delete</button>
          <button type="button" class="btn btn-primary btn-sm brand-save-btn" data-id="${b.id}" style="display:none">Save</button>
          <button type="button" class="btn btn-ghost btn-sm brand-cancel-btn" data-id="${b.id}" style="display:none">Cancel</button>
        </td>
      </tr>`
      )
      .join('');

    $$('.brand-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        $(`.brand-view-${id}`).style.display = 'none';
        $(`.brand-edit-${id}`).style.display = 'block';
        $(`.brand-edit-btn[data-id="${id}"]`).style.display = 'none';
        $(`.brand-del-btn[data-id="${id}"]`).style.display = 'none';
        $(`.brand-save-btn[data-id="${id}"]`).style.display = 'inline-flex';
        $(`.brand-cancel-btn[data-id="${id}"]`).style.display = 'inline-flex';
      });
    });

    $$('.brand-cancel-btn').forEach((btn) => {
      btn.addEventListener('click', () => loadBrandsTable().catch(console.error));
    });

    $$('.brand-save-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        const name = $(`.brand-edit-${id}`).value;
        try {
          await api(`/api/brands/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
          await refreshAll();
        } catch (e) {
          alert(e.message || String(e));
        }
      });
    });

    $$('.brand-del-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this brand? (Only if no devices use it.)')) return;
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
      tb.innerHTML = `<tr><td colspan="4" class="empty-state">No devices yet.</td></tr>`;
      return;
    }
    tb.innerHTML = devices
      .map(
        (d) => `<tr>
        <td>${escapeHtml(TYPE_LABELS[d.device_type] || d.device_type)}</td>
        <td>${escapeHtml(d.brand_name)}</td>
        <td>${escapeHtml(d.label || '—')}</td>
        <td style="white-space:nowrap">
          <button type="button" class="btn btn-ghost btn-sm dev-edit" data-id="${d.id}">Edit</button>
          <button type="button" class="btn btn-danger btn-sm dev-del" data-id="${d.id}">Delete</button>
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
        editingDeviceId = id;
        $('#devType').value = d.device_type;
        $('#devBrandId').value = String(d.brand_id);
        $('#devLabel').value = d.label || '';
        $('#deviceSubmitBtn').textContent = 'Save device';
        $('#deviceCancelEdit').hidden = false;
        $('#deviceForm').scrollIntoView({ behavior: 'smooth' });
      });
    });

    $$('.dev-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this device? Linked tickets will keep history but device link clears.'))
          return;
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
    editingDeviceId = null;
    $('#deviceSubmitBtn').textContent = 'Add device';
    $('#deviceCancelEdit').hidden = true;
    $('#deviceForm').reset();
    await loadBrandSelect();
    await Promise.all([loadBrandsTable(), loadDevicesTable()]);
  }

  $('#brandForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#brandNameInput').value.trim();
    if (!name) return;
    try {
      await api('/api/brands', { method: 'POST', body: JSON.stringify({ name }) });
      $('#brandNameInput').value = '';
      await refreshAll();
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  $('#deviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      deviceType: $('#devType').value,
      brandId: Number($('#devBrandId').value),
      label: $('#devLabel').value,
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
      await refreshAll();
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  $('#deviceCancelEdit').addEventListener('click', () => refreshAll().catch(console.error));

  refreshAll().catch((e) => {
    console.error(e);
    $('#brandRows').innerHTML = `<tr><td colspan="2" class="err">Could not reach the server.</td></tr>`;
  });
})();
