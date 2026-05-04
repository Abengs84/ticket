(function () {
  const $ = (sel) => document.querySelector(sel);
  const I18n = window.ITTicketsI18n;
  const t = I18n ? I18n.t.bind(I18n) : (k) => k;

  let editingAbitti2Id = null;

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

  function closeAbitti2Modal() {
    $('#abitti2ModalBackdrop').hidden = true;
    editingAbitti2Id = null;
    $('#modalAbitti2Id').value = '';
    $('#modalAbitti2Label').value = '';
    $('#abitti2ModalTitle').textContent = t('loanAbitti2ModalAdd');
    $('#abitti2ModalSubmit').textContent = t('loanAbitti2Add');
  }

  function openAbitti2Modal(row) {
    editingAbitti2Id = row && row.id != null ? Number(row.id) : null;
    $('#modalAbitti2Id').value = editingAbitti2Id ? String(editingAbitti2Id) : '';
    if (row) {
      $('#modalAbitti2Label').value = row.label || '';
      $('#abitti2ModalTitle').textContent = t('loanAbitti2ModalEdit');
      $('#abitti2ModalSubmit').textContent = t('loanModalSave');
    } else {
      $('#modalAbitti2Label').value = '';
      $('#abitti2ModalTitle').textContent = t('loanAbitti2ModalAdd');
      $('#abitti2ModalSubmit').textContent = t('loanAbitti2Add');
    }
    $('#abitti2ModalBackdrop').hidden = false;
    requestAnimationFrame(() => $('#modalAbitti2Label').focus());
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
      li.className = 'loan-abitti2-row';
      const span = document.createElement('span');
      span.className = 'loan-abitti2-version-label';
      span.textContent = r.label;
      const actions = document.createElement('div');
      actions.className = 'loan-abitti2-row-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn btn-ghost btn-sm';
      edit.textContent = t('devEdit');
      edit.addEventListener('click', () => openAbitti2Modal(r));
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-sm';
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
      actions.appendChild(edit);
      actions.appendChild(del);
      li.appendChild(span);
      li.appendChild(actions);
      ul.appendChild(li);
    });
  }

  $('#abitti2ModalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const label = $('#modalAbitti2Label').value.trim();
    if (!label) return;
    try {
      if (editingAbitti2Id) {
        await api(`/api/loan/abitti2-versions/${editingAbitti2Id}`, {
          method: 'PATCH',
          body: JSON.stringify({ label }),
        });
      } else {
        await api('/api/loan/abitti2-versions', {
          method: 'POST',
          body: JSON.stringify({ label }),
        });
      }
      closeAbitti2Modal();
      await load();
    } catch (err) {
      alert(err.message);
    }
  });

  $('#btnAddAbitti2').addEventListener('click', () => openAbitti2Modal(null));

  $('#abitti2ModalCancel').addEventListener('click', () => closeAbitti2Modal());
  $('#abitti2ModalCloseX').addEventListener('click', () => closeAbitti2Modal());
  $('#abitti2ModalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('#abitti2ModalBackdrop')) closeAbitti2Modal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#abitti2ModalBackdrop').hidden) closeAbitti2Modal();
  });

  window.addEventListener('it-lang-change', () => {
    closeAbitti2Modal();
    if (I18n) I18n.applyDataI18n();
    load().catch((e) => alert(e.message));
  });

  closeAbitti2Modal();
  load().catch((e) => alert(e.message));
})();
