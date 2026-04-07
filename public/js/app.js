(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const I18n = window.ITTicketsI18n;
  const t = I18n ? I18n.t.bind(I18n) : (k) => k;
  const locale = () => (I18n && I18n.getLang() === 'sv' ? 'sv-SE' : 'en-GB');

  const THEME_KEY = 'it-tickets-theme';

  const ATTACH_ICON_SVG = `<svg class="ticket-attach-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.38-8.38A4 4 0 1 1 18 12.36l-8.25 8.25a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;

  function formatTicketDate(iso) {
    if (!iso) return '';
    const dt = window.ITLoanDateTime;
    const s = dt ? dt.formatLoanLocal(iso, locale()) : '';
    return s || String(iso);
  }

  function typeLabel(tp) {
    const m = {
      printer: 'typePrinter',
      computer: 'typeComputer',
      peripheral: 'typePeripheral',
      other: 'typeOther',
    };
    return t(m[tp] || 'typeOther');
  }

  function priorityLabel(p) {
    const m = { low: 'priLow', medium: 'priMedium', high: 'priHigh', na: 'priNA' };
    return t(m[p] || p);
  }

  function reporterLabel(r) {
    const m = { pupil: 'repPupil', staff: 'repStaff', unknown: 'repUnknown', na: 'repNA' };
    return t(m[r] || r);
  }

  function categoryLabel(c) {
    const m = {
      abitti: 'catAbitti',
      hardware: 'catHardware',
      software: 'catSoftware',
      network: 'catNetwork',
      account: 'catAccount',
      other: 'catOther',
    };
    return t(m[c] || 'catOther');
  }

  function statusLabel(s) {
    const m = { open: 'stOpen', closed: 'stClosed', unresolved: 'stUnresolved' };
    return t(m[s] || s);
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

  function formatDevice(d) {
    if (!d) return '';
    const tl = typeLabel(d.type);
    return [tl, d.brandName, d.label].filter(Boolean).join(' · ');
  }

  function deviceOptionLabel(d) {
    const tl = typeLabel(d.device_type);
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
    const opt0 = `<option value="">${escapeHtml(t('deviceOptional'))}</option>`;
    sel.innerHTML =
      opt0 +
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
      $('#hardwareDevice').innerHTML = `<option value="">${escapeHtml(t('deviceOptional'))}</option>`;
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
    return p.toString();
  }

  const SORT_STATE_KEY = 'it-tickets-sort-v1';
  const PRIORITY_RANK = { low: 0, medium: 1, high: 2, na: 3 };

  function loadSortState() {
    try {
      const raw = sessionStorage.getItem(SORT_STATE_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && o.key && (o.dir === 'asc' || o.dir === 'desc')) return o;
      }
    } catch {
      /* ignore */
    }
    return { key: 'created', dir: 'desc' };
  }

  let sortState = loadSortState();

  function saveSortState() {
    try {
      sessionStorage.setItem(SORT_STATE_KEY, JSON.stringify(sortState));
    } catch {
      /* ignore */
    }
  }

  function defaultDirForColumn(key) {
    return ['id', 'created', 'updated', 'attachments'].includes(key) ? 'desc' : 'asc';
  }

  function compareTickets(a, b, key) {
    let cmp = 0;
    switch (key) {
      case 'id':
        cmp = Number(a.id) - Number(b.id);
        break;
      case 'title':
        cmp = (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
        break;
      case 'reporter': {
        const ra = `${a.reporterType || ''}\t${a.reporterName || ''}`;
        const rb = `${b.reporterType || ''}\t${b.reporterName || ''}`;
        cmp = ra.localeCompare(rb, undefined, { sensitivity: 'base' });
        break;
      }
      case 'category':
        cmp = (a.category || '').localeCompare(b.category || '');
        break;
      case 'device': {
        const da = formatDevice(a.device) || '';
        const db = formatDevice(b.device) || '';
        cmp = da.localeCompare(db, undefined, { sensitivity: 'base' });
        break;
      }
      case 'priority': {
        const pa = PRIORITY_RANK[a.priority] ?? 99;
        const pb = PRIORITY_RANK[b.priority] ?? 99;
        cmp = pa - pb;
        break;
      }
      case 'status':
        cmp = (a.status || '').localeCompare(b.status || '');
        break;
      case 'attachments':
        cmp = (Number(a.attachmentCount) || 0) - (Number(b.attachmentCount) || 0);
        break;
      case 'created':
        cmp = String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
        break;
      case 'updated':
        cmp = String(a.updatedAt || '').localeCompare(String(b.updatedAt || ''));
        break;
      default:
        cmp = 0;
    }
    return cmp;
  }

  function sortTicketRows(rows) {
    const key = sortState.key;
    const dir = sortState.dir;
    const mult = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const c = compareTickets(a, b, key);
      if (c !== 0) return mult * c;
      return Number(b.id) - Number(a.id);
    });
  }

  let lastTicketRows = [];

  function updateSortHeaderUI() {
    $$('.tickets thead th[data-sort]').forEach((th) => {
      const k = th.getAttribute('data-sort');
      th.classList.remove('sorted', 'sorted-asc', 'sorted-desc');
      if (k === sortState.key) {
        th.classList.add('sorted', sortState.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
        th.setAttribute('aria-sort', sortState.dir === 'asc' ? 'ascending' : 'descending');
      } else {
        th.setAttribute('aria-sort', 'none');
      }
    });
  }

  function onSortColumnClick(key) {
    if (!key) return;
    if (sortState.key === key) {
      sortState = { key, dir: sortState.dir === 'asc' ? 'desc' : 'asc' };
    } else {
      sortState = { key, dir: defaultDirForColumn(key) };
    }
    saveSortState();
    renderTicketTable();
  }

  function renderTicketTable() {
    const tb = $('#ticketRows');
    const rows = lastTicketRows;
    updateSortHeaderUI();
    if (!rows.length) {
      tb.innerHTML = `<tr><td colspan="10" class="empty-state">${escapeHtml(t('noTicketsMatch'))}</td></tr>`;
      return;
    }
    const sorted = sortTicketRows(rows);
    tb.innerHTML = sorted
      .map((row) => {
        const badge = `badge badge-${row.status}`;
        const pr = `badge-priority-${row.priority}`;
        const rep = [reporterLabel(row.reporterType), row.reporterName].filter(Boolean).join(' · ');
        const whenU = row.updatedAt ? formatTicketDate(row.updatedAt) : '';
        const whenC = row.createdAt ? formatTicketDate(row.createdAt) : '';
        const dev = row.device ? escapeHtml(formatDevice(row.device)) : '—';
        const nAttach = Number(row.attachmentCount) || 0;
        const attachCell =
          nAttach > 0
            ? `<td class="ticket-attach-cell" title="${escapeHtml(t('attachments'))}"><span class="ticket-attach-wrap">${ATTACH_ICON_SVG}</span></td>`
            : '<td class="ticket-attach-cell">—</td>';
        return `<tr data-id="${row.id}">
        <td>#${row.id}</td>
        <td>${escapeHtml(row.title)}</td>
        <td>${escapeHtml(rep || '—')}</td>
        <td>${escapeHtml(categoryLabel(row.category))}</td>
        <td style="font-size:0.82rem">${dev}</td>
        <td><span class="badge ${pr}">${escapeHtml(priorityLabel(row.priority))}</span></td>
        <td><span class="${badge}">${escapeHtml(statusLabel(row.status))}</span></td>
        ${attachCell}
        <td>${escapeHtml(whenC)}</td>
        <td>${escapeHtml(whenU)}</td>
      </tr>`;
      })
      .join('');
    $$('#ticketRows tr[data-id]').forEach((tr) => {
      tr.addEventListener('click', () => openModal(Number(tr.dataset.id)));
    });
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
      dl.innerHTML = tags.map((tg) => `<option value="${escapeHtml(tg)}"></option>`).join('');
    } catch (_e) {
      /* ignore */
    }
  }

  async function loadTickets() {
    const qs = filterQuery();
    const rows = await api(`/api/tickets?${qs}`);
    lastTicketRows = Array.isArray(rows) ? rows : [];
    renderTicketTable();
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
    $('#modalTitle').textContent = t('modalTicket');
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
    $('#modalTitle').textContent = id ? `${t('modalTicketNum')}${id}` : t('modalNewTicket');
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

    const row = await api(`/api/tickets/${id}`);
    $('#ticketId').value = row.id;
    $('#title').value = row.title;
    $('#description').value = row.description;
    $('#reporterType').value = row.reporterType;
    $('#reporterName').value = row.reporterName || '';
    $('#category').value = row.category;
    $('#priority').value = row.priority;
    $('#status').value = row.status;
    $('#resolution').value = row.resolution || '';
    $('#tags').value = (row.tags || []).join(', ');
    toggleResolutionField();
    toggleHardwareSection();
    if (row.category === 'hardware') {
      await loadTicketDeviceOptions(row.deviceId);
    }
    $('#statusWrap').hidden = false;
    $('#btnDelete').hidden = false;
    $('#btnPrint').hidden = false;
    $('#detailExtras').hidden = false;
    $('#datesLine').textContent = `${t('createdUpdated')} ${formatTicketDate(row.createdAt)} · ${t('updatedPart')} ${formatTicketDate(row.updatedAt)}`;
    const pubUrl = `${window.location.origin}/view/${row.publicId}`;
    const link = $('#publicLink');
    link.href = pubUrl;
    link.textContent = pubUrl;
    $('#qrImg').src = `/api/tickets/${row.id}/qrcode.png?${Date.now()}`;
    await refreshAttachments(row.id);
  }

  async function refreshAttachments(ticketId) {
    const list = $('#attachList');
    try {
      const items = await api(`/api/tickets/${ticketId}/attachments`);
      list.innerHTML = items
        .map(
          (a) => `<li>
          <a href="${a.viewUrl}" target="_blank" rel="noopener">${escapeHtml(a.originalName)}</a>
          <span style="color:var(--muted);font-size:0.75rem">${Math.round(a.sizeBytes / 1024)} ${t('attachKb')}</span>
        </li>`
        )
        .join('');
    } catch (_e) {
      list.innerHTML = `<li>${escapeHtml(t('attachLoadFail'))}</li>`;
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
      alert(t('alertChooseStatus'));
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
    if (!id || !confirm(t('confirmDelete'))) return;
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

  function fillPrintArea(row, qrDataUrl) {
    const pubUrl = `${window.location.origin}/view/${row.publicId}`;
    const devLine = row.device ? `${formatDevice(row.device)}` : '';
    $('#print-area').innerHTML = `
      <h1 style="font-size:1.25rem;margin:0 0 1rem">${escapeHtml(t('printHeading'))}${row.id}</h1>
      <p style="margin:0 0 0.5rem"><strong>${escapeHtml(row.title)}</strong></p>
      <p style="margin:0 0 1rem;white-space:pre-wrap">${escapeHtml(row.description)}</p>
      <p style="margin:0.25rem 0"><strong>${escapeHtml(t('printReporter'))}</strong> ${escapeHtml(reporterLabel(row.reporterType))} ${escapeHtml(row.reporterName || '')}</p>
      <p style="margin:0.25rem 0"><strong>${escapeHtml(t('printCategory'))}</strong> ${escapeHtml(categoryLabel(row.category))} · <strong>${escapeHtml(t('printPriority'))}</strong> ${escapeHtml(priorityLabel(row.priority))} · <strong>${escapeHtml(t('printStatus'))}</strong> ${escapeHtml(statusLabel(row.status))}</p>
      ${devLine ? `<p style="margin:0.25rem 0"><strong>${escapeHtml(t('printDevice'))}</strong> ${escapeHtml(devLine)}</p>` : ''}
      ${
        row.status === 'closed' && (row.resolution || '').trim()
          ? `<p style="margin:0.25rem 0"><strong>${escapeHtml(t('printResolution'))}</strong></p><p style="margin:0;white-space:pre-wrap">${escapeHtml(row.resolution)}</p>`
          : ''
      }
      <p style="margin:0.25rem 0"><strong>${escapeHtml(t('printTags'))}</strong> ${escapeHtml((row.tags || []).join(', ') || '—')}</p>
      <p style="margin:0.25rem 0"><strong>${escapeHtml(t('printCreated'))}</strong> ${escapeHtml(formatTicketDate(row.createdAt))} · <strong>${escapeHtml(t('printUpdated'))}</strong> ${escapeHtml(formatTicketDate(row.updatedAt))}</p>
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
      const row = await api(`/api/tickets/${id}`);
      const qr = await ticketQrDataUrl(row.id);
      fillPrintArea(row, qr);
      await waitPaint();
      window.print();
    } catch (e) {
      alert(e.message || String(e));
    }
  });

  ['fQ', 'fStatus', 'fCategory', 'fPriority', 'fReporter', 'fTag', 'fFrom', 'fTo'].forEach((id) => {
    const el = $(`#${id}`);
    if (!el) return;
    el.addEventListener('input', scheduleLoadTickets);
    el.addEventListener('change', scheduleLoadTickets);
  });

  $$('.tickets thead th[data-sort]').forEach((th) => {
    th.addEventListener('click', (e) => {
      e.stopPropagation();
      onSortColumnClick(th.getAttribute('data-sort'));
    });
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSortColumnClick(th.getAttribute('data-sort'));
      }
    });
    th.tabIndex = 0;
  });

  window.addEventListener('it-lang-change', () => {
    loadTickets().catch((e) => console.error(e));
    const id = $('#ticketId').value;
    if (id) {
      openModal(Number(id)).catch((e) => console.error(e));
    }
  });

  Promise.all([loadTickets(), loadTagList()]).catch((e) => {
    console.error(e);
    $('#ticketRows').innerHTML = `<tr><td colspan="10" class="err">${t('serverError')}</td></tr>`;
  });
})();
