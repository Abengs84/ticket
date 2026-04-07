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

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  async function load() {
    const rows = await api('/api/loan/abitti2-versions');
    const ul = $('#listAbitti2');
    const empty = $('#abitti2Empty');
    ul.innerHTML = '';
    if (!rows.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    rows.forEach((r) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'loan-abitti2-version-label';
      span.textContent = r.label;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn';
      del.dataset.i18n = 'loanAbitti2Remove';
      del.textContent = t('loanAbitti2Remove');
      del.addEventListener('click', async () => {
        const msg = t('loanAbitti2ConfirmRemove').replace(/\{name\}/g, r.label);
        if (!confirm(msg)) return;
        try {
          await api(`/api/loan/abitti2-versions/${r.id}`, { method: 'DELETE' });
          await load();
        } catch (e) {
          alert(e.message);
        }
      });
      li.appendChild(span);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  $('#formAbitti2').addEventListener('submit', async (e) => {
    e.preventDefault();
    const label = $('#abitti2Label').value.trim();
    if (!label) return;
    try {
      await api('/api/loan/abitti2-versions', {
        method: 'POST',
        body: JSON.stringify({ label }),
      });
      $('#abitti2Label').value = '';
      await load();
    } catch (err) {
      alert(err.message);
    }
  });

  window.addEventListener('it-lang-change', () => {
    if (I18n) I18n.applyDataI18n();
    load().catch((e) => alert(e.message));
  });

  load().catch((e) => alert(e.message));
})();
