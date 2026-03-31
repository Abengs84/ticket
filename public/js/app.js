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

  function priorityLabel(p) {
    return p === 'na' ? 'N/A' : p;
  }

  function reporterLabel(r) {
    return r === 'na' ? 'N/A' : r;
  }

  function formatDevice(d) {
    if (!d) return '';
    const tl = TYPE_LABELS[d.type] || d.type;
    return [tl, d.brandName, d.label].filter(Boolean).join(' · ');
  }

  function deviceOptionLabel(d) {
    const tl = TYPE_LABELS[d.device_type] || d.device_type;
    const lab = (d.label || '').trim();
    return lab
      ? `${tl} · ${d.brand_name} · ${lab}`
      : `${tl} · ${d.brand_name}`;
  }

  async function loadTicketDeviceOptions(selectedDeviceId) {
    const devices = await api('/api/devices');
    const sel = $('#hardwareDevice');
    const cur =
      selectedDeviceId != null ? String(selectedDeviceId) : sel.value;
    sel.innerHTML =
      '<option value="">— Optional: select device —</option>' +
      devices
        .map(
          (d) =>
            `<option value="${d.id}">${escapeHtml(deviceOptionLabel(d))}</option>`
        )
        .join('');
    if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
  }

  function toggleHardwareSection() {
    const hw = $('#category').value === 'hardware';
    $('#hardwareRow').hidden = !hw;
    $('#hardwareHint').hidden = !hw;
    if (!hw) {
      $('#hardwareDevice').innerHTML =
        '<option value="">— Optional: select device —</option>';
    }
  }

  $('#category').addEventListener('change', async () => {
    toggleHardwareSection();
    if ($('#category').value === 'hardware') {
      await loadTicketDeviceOptions();
    }
  });

  function toggleResolutionField() {
    const id = $('#ticketId').value;
    const closed = $('#status').value === 'closed';
    $('#resolutionWrap').hidden = !id || !closed;
  }

  $('#status').addEventListener('change', () => {
    toggleResolutionField();
    if ($('#status').value !== 'closed') {
      $('#resolution').value = '';
    }
  });

  function filterQuery() {
    const p = new URLSearchParams();
    const q = $('#fQ').value.trim();
    if (q) p.set('q', q);
    const st = $('#fStatus').value;
    if (st) p.set('status', st);
    const cat = $('#fCategory').value;
    if (cat) p.set('category', cat);
    const pri = $('#fPriority').value;
    if (pri) p.set('priority', pri);
    const rep = $('#fReporter').value.trim();
    if (rep) p.set('reporter', rep);
    const tag = $('#fTag').value.trim();
    if (tag) p.set('tag', tag);
    const from = $('#fFrom').value;
    if (from) p.set('from', from);
    const to = $('#fTo').value;
    if (to) p.set('to', to);
    const sort = $('#fSort').value;
    if (sort === 'updated') p.set('sort', 'updated');
    return p.toString();
  }

  let debounce;
  function scheduleLoadTickets() {
    clearTimeout(debounce);
    debounce = setTimeout(() => loadTickets().catch((e) => console.error(e)), 250);
  }

  async function loadTagList() {
    try {
      const tags = await api('/api/tags');
      const dl = $('#tagList');
      dl.innerHTML = tags.map((t) => `<option value="${escapeHtml(t)}"></option>`).join('');
    } catch (_e) {
      /* ignore */
    }
  }

  async function loadTickets() {
    const qs = filterQuery();
    const rows = await api(`/api/tickets?${qs}`);
    const tb = $('#ticketRows');
    if (!rows.length) {
      tb.innerHTML = `<tr><td colspan="8" class="empty-state">No tickets match your filters.</td></tr>`;
      return;
    }
    tb.innerHTML = rows
      .map((t) => {
        const badge = `badge badge-${t.status}`;
        const pr = `badge-priority-${t.priority}`;
        const rep = [reporterLabel(t.reporterType), t.reporterName].filter(Boolean).join(' · ');
        const when = t.updatedAt ? t.updatedAt.slice(0, 16).replace('T', ' ') : '';
        const dev = t.device ? escapeHtml(formatDevice(t.device)) : '—';
        return `<tr data-id="${t.id}">
        <td>#${t.id}</td>
        <td>${escapeHtml(t.title)}</td>
        <td>${escapeHtml(rep || '—')}</td>
        <td>${escapeHtml(t.category)}</td>
        <td style="font-size:0.82rem">${dev}</td>
        <td><span class="badge ${pr}">${escapeHtml(priorityLabel(t.priority))}</span></td>
        <td><span class="${badge}">${escapeHtml(t.status)}</span></td>
        <td>${escapeHtml(when)}</td>
      </tr>`;
      })
      .join('');
    $$('#ticketRows tr[data-id]').forEach((tr) => {
      tr.addEventListener('click', () => openModal(Number(tr.dataset.id)));
    });
  }

  const backdrop = $('#modalBackdrop');
  const form = $('#ticketForm');

  function closeModal() {
    backdrop.hidden = true;
    form.reset();
    $('#ticketId').value = '';
    $('#detailExtras').hidden = true;
    $('#btnDelete').hidden = true;
    $('#btnPrint').hidden = true;
    $('#statusWrap').hidden = true;
    $('#modalTitle').textContent = 'Ticket';
    $('#hardwareRow').hidden = true;
    $('#hardwareHint').hidden = true;
    $('#resolutionWrap').hidden = true;
    $('#resolution').value = '';
  }

  $('#modalClose').addEventListener('click', closeModal);
  $('#modalCancel').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  $('#btnNew').addEventListener('click', () => openModal(null));

  async function openModal(id) {
    $('#detailExtras').hidden = true;
    $('#btnDelete').hidden = true;
    $('#btnPrint').hidden = true;
    $('#statusWrap').hidden = true;
    $('#modalTitle').textContent = id ? `Ticket #${id}` : 'New ticket';
    backdrop.hidden = false;

    if (!id) {
      form.reset();
      $('#ticketId').value = '';
      $('#statusWrap').hidden = true;
      $('#resolutionWrap').hidden = true;
      $('#reporterType').value = 'staff';
      toggleHardwareSection();
      return;
    }

    const t = await api(`/api/tickets/${id}`);
    $('#ticketId').value = t.id;
    $('#title').value = t.title;
    $('#description').value = t.description;
    $('#reporterType').value = t.reporterType;
    $('#reporterName').value = t.reporterName || '';
    $('#category').value = t.category;
    $('#priority').value = t.priority;
    $('#status').value = t.status;
    $('#resolution').value = t.resolution || '';
    $('#tags').value = (t.tags || []).join(', ');
    toggleResolutionField();
    toggleHardwareSection();
    if (t.category === 'hardware') {
      await loadTicketDeviceOptions(t.deviceId);
    }
    $('#statusWrap').hidden = false;
    $('#btnDelete').hidden = false;
    $('#btnPrint').hidden = false;
    $('#detailExtras').hidden = false;
    $('#datesLine').textContent = `Created: ${t.createdAt} · Updated: ${t.updatedAt}`;
    const pubUrl = `${window.location.origin}/view/${t.publicId}`;
    const link = $('#publicLink');
    link.href = pubUrl;
    link.textContent = pubUrl;
    $('#qrImg').src = `/api/tickets/${t.id}/qrcode.png?${Date.now()}`;
    await refreshAttachments(t.id);
  }

  async function refreshAttachments(ticketId) {
    const list = $('#attachList');
    try {
      const items = await api(`/api/tickets/${ticketId}/attachments`);
      list.innerHTML = items
        .map(
          (a) => `<li>
          <a href="${a.viewUrl}" target="_blank" rel="noopener">${escapeHtml(a.originalName)}</a>
          <span style="color:var(--muted);font-size:0.75rem">${Math.round(a.sizeBytes / 1024)} KB · view</span>
        </li>`
        )
        .join('');
    } catch (_e) {
      list.innerHTML = '<li>Could not load attachments.</li>';
    }
  }

  $('#attachFile').addEventListener('change', async (e) => {
    const id = $('#ticketId').value;
    const f = e.target.files && e.target.files[0];
    if (!id || !f) return;
    const fd = new FormData();
    fd.append('file', f);
    await fetch(`/api/tickets/${id}/attachments`, { method: 'POST', body: fd });
    e.target.value = '';
    await refreshAttachments(Number(id));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#ticketId').value;
    if (id && !$('#status').value) {
      alert('Please choose a status.');
      return;
    }
    const category = $('#category').value;
    const body = {
      title: $('#title').value,
      description: $('#description').value,
      reporterType: $('#reporterType').value,
      reporterName: $('#reporterName').value,
      category,
      priority: $('#priority').value,
      status: id ? $('#status').value : 'open',
      tags: $('#tags').value,
      deviceId:
        category === 'hardware' && $('#hardwareDevice').value
          ? Number($('#hardwareDevice').value)
          : null,
      resolution: id ? $('#resolution').value : undefined,
    };
    try {
      if (id) {
        await api(`/api/tickets/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/api/tickets', { method: 'POST', body: JSON.stringify(body) });
      }
      closeModal();
      await Promise.all([loadTickets(), loadTagList()]);
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  $('#btnDelete').addEventListener('click', async () => {
    const id = $('#ticketId').value;
    if (!id || !confirm('Delete this ticket permanently?')) return;
    await api(`/api/tickets/${id}`, { method: 'DELETE' });
    closeModal();
    await Promise.all([loadTickets(), loadTagList()]);
  });

  async function ticketQrDataUrl(ticketId) {
    const res = await fetch(`/api/tickets/${ticketId}/qrcode.png`);
    if (!res.ok) throw new Error('Could not load QR code');
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result);
      fr.onerror = () => reject(new Error('QR encode failed'));
      fr.readAsDataURL(blob);
    });
  }

  function fillPrintArea(t, qrDataUrl) {
    const pubUrl = `${window.location.origin}/view/${t.publicId}`;
    const devLine = t.device
      ? `${formatDevice(t.device)}`
      : '';
    $('#print-area').innerHTML = `
      <h1 style="font-size:1.25rem;margin:0 0 1rem">IT Ticket #${t.id}</h1>
      <p style="margin:0 0 0.5rem"><strong>${escapeHtml(t.title)}</strong></p>
      <p style="margin:0 0 1rem;white-space:pre-wrap">${escapeHtml(t.description)}</p>
      <p style="margin:0.25rem 0"><strong>Reporter:</strong> ${escapeHtml(reporterLabel(t.reporterType))} ${escapeHtml(t.reporterName || '')}</p>
      <p style="margin:0.25rem 0"><strong>Category:</strong> ${escapeHtml(t.category)} · <strong>Priority:</strong> ${escapeHtml(priorityLabel(t.priority))} · <strong>Status:</strong> ${escapeHtml(t.status)}</p>
      ${devLine ? `<p style="margin:0.25rem 0"><strong>Device:</strong> ${escapeHtml(devLine)}</p>` : ''}
      ${
        t.status === 'closed' && (t.resolution || '').trim()
          ? `<p style="margin:0.25rem 0"><strong>Resolution:</strong></p><p style="margin:0;white-space:pre-wrap">${escapeHtml(t.resolution)}</p>`
          : ''
      }
      <p style="margin:0.25rem 0"><strong>Tags:</strong> ${escapeHtml((t.tags || []).join(', ') || '—')}</p>
      <p style="margin:0.25rem 0"><strong>Created:</strong> ${escapeHtml(t.createdAt)} · <strong>Updated:</strong> ${escapeHtml(t.updatedAt)}</p>
      <div style="margin-top:1.5rem;text-align:center">
        <img src="${qrDataUrl}" width="220" height="220" alt="QR" />
        <p style="font-size:0.85rem;word-break:break-all">${escapeHtml(pubUrl)}</p>
      </div>
    `;
  }

  function waitPaint() {
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  $('#btnPrint').addEventListener('click', async () => {
    const id = $('#ticketId').value;
    if (!id) return;
    try {
      const t = await api(`/api/tickets/${id}`);
      const qr = await ticketQrDataUrl(t.id);
      fillPrintArea(t, qr);
      await waitPaint();
      window.print();
    } catch (e) {
      alert(e.message || String(e));
    }
  });

  ['fQ', 'fStatus', 'fCategory', 'fPriority', 'fReporter', 'fTag', 'fFrom', 'fTo', 'fSort'].forEach(
    (id) => {
      $(`#${id}`).addEventListener('input', scheduleLoadTickets);
      $(`#${id}`).addEventListener('change', scheduleLoadTickets);
    }
  );

  Promise.all([loadTickets(), loadTagList()]).catch((e) => {
    console.error(e);
    $('#ticketRows').innerHTML = `<tr><td colspan="8" class="err">Could not reach the server. Run <code>npm start</code> from the project folder.</td></tr>`;
  });
})();
