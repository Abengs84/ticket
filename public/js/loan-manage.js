(function () {
  const $ = (sel) => document.querySelector(sel);
  const I18n = window.ITTicketsI18n;
  const t = I18n ? I18n.t.bind(I18n) : (k) => k;

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

  async function load() {
    const rows = await api('/api/loan/assets');
    const computers = rows.filter((r) => r.kind === 'computer');
    const chargers = rows.filter((r) => r.kind === 'charger');
    const others = rows.filter((r) => r.kind === 'other');
    renderList($('#listComputers'), computers);
    renderList($('#listChargers'), chargers);
    renderList($('#listOther'), others);
  }

  function renderList(ul, rows) {
    ul.innerHTML = '';
    if (!rows.length) {
      ul.innerHTML = `<li style="color:var(--muted);border:none">${escapeHtml(t('loanListEmpty'))}</li>`;
      return;
    }
    rows.forEach((r) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(r.name)}</span>`;
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
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  $('#formComputer').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#computerName').value.trim();
    if (!name) return;
    try {
      await api('/api/loan/assets', {
        method: 'POST',
        body: JSON.stringify({ kind: 'computer', name }),
      });
      $('#computerName').value = '';
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
        body: JSON.stringify({ kind: 'charger', name }),
      });
      $('#chargerName').value = '';
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
        body: JSON.stringify({ kind: 'other', name }),
      });
      $('#otherName').value = '';
      await load();
    } catch (err) {
      alert(err.message);
    }
  });

  window.addEventListener('it-lang-change', () => {
    load().catch((e) => alert(e.message));
  });

  load().catch((e) => alert(e.message));
})();
