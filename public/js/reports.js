(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const I18n = window.ITTicketsI18n;
  const t = I18n ? I18n.t.bind(I18n) : (k) => k;

  /** YYYY-MM-DD (or prefix) → D.M.YYYY without timezone shifts */
  function formatReportRangeDay(ymd) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''));
    if (!m) return String(ymd || '').slice(0, 10);
    return `${Number(m[3])}.${Number(m[2])}.${m[1]}`;
  }

  const THEME_KEY = 'it-tickets-theme';

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

  let reportPeriod = 'monthly';

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

  function categoryLabel(cat) {
    const m = {
      abitti: 'catAbitti',
      hardware: 'catHardware',
      software: 'catSoftware',
      network: 'catNetwork',
      account: 'catAccount',
      other: 'catOther',
    };
    return t(m[cat] || 'catOther');
  }

  function priorityLabel(p) {
    const m = { low: 'priLow', medium: 'priMedium', high: 'priHigh', na: 'priNA' };
    return t(m[p] || p);
  }

  function statusLabel(s) {
    const m = { open: 'stOpen', closed: 'stClosed', unresolved: 'stUnresolved' };
    return t(m[s] || s);
  }

  async function loadDashboard() {
    const s = await api('/api/stats/summary');
    const open = (s.byStatus.find((x) => x.status === 'open') || {}).c || 0;
    const closed = (s.byStatus.find((x) => x.status === 'closed') || {}).c || 0;
    const unresolved = (s.byStatus.find((x) => x.status === 'unresolved') || {}).c || 0;

    const maxCat = Math.max(1, ...s.byCategory.map((x) => x.c));
    const maxPri = Math.max(1, ...s.byPriority.map((x) => x.c));

    $('#dashboard').innerHTML = `
      <div class="card">
        <h3>${escapeHtml(t('dashOpen'))}</h3>
        <div class="stat-big">${open}</div>
        <p style="margin:0;font-size:0.85rem;color:var(--muted)">${escapeHtml(t('dashOpenHint'))}</p>
      </div>
      <div class="card">
        <h3>${escapeHtml(t('dashClosed'))}</h3>
        <div class="stat-big">${closed}</div>
        <p style="margin:0;font-size:0.85rem;color:var(--muted)">${escapeHtml(t('dashClosedHint'))}</p>
      </div>
      <div class="card">
        <h3>${escapeHtml(t('dashUnresolved'))}</h3>
        <div class="stat-big">${unresolved}</div>
        <p style="margin:0;font-size:0.85rem;color:var(--muted)">${escapeHtml(t('dashUnresHint'))}</p>
      </div>
      <div class="card">
        <h3>${escapeHtml(t('dashTotal'))}</h3>
        <div class="stat-big">${s.total}</div>
        <p style="margin:0;font-size:0.85rem;color:var(--muted)">${escapeHtml(t('dashTotalHint'))}</p>
      </div>
      <div class="card">
        <h3>${escapeHtml(t('dashByCategory'))}</h3>
        <div class="bar-list">
          ${s.byCategory
            .map(
              (x) => `
            <div class="bar-row">
              <span>${escapeHtml(categoryLabel(x.category))}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${(100 * x.c) / maxCat}%"></div></div>
              <span>${x.c}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>
      <div class="card">
        <h3>${escapeHtml(t('dashByPriority'))}</h3>
        <div class="bar-list">
          ${s.byPriority
            .map(
              (x) => `
            <div class="bar-row">
              <span>${escapeHtml(priorityLabel(x.priority))}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${(100 * x.c) / maxPri}%"></div></div>
              <span>${x.c}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>
    `;
  }

  async function loadReport() {
    const data = await api(`/api/stats/report?period=${encodeURIComponent(reportPeriod)}`);
    const sm = data.summary;
    $('#reportMeta').textContent = `${t('repRangePrefix')} ${formatReportRangeDay(sm.start)} ${t('repRangeArrow')} ${formatReportRangeDay(sm.end)} · ${sm.count} ${t('repRangeTickets')}`;
    $('#reportSummary').innerHTML = `
      <div class="bar-list" style="max-width:420px">
        <strong style="font-size:0.85rem">${escapeHtml(t('status'))}</strong>
        ${Object.entries(sm.byStatus)
          .map(([k, v]) => `<div>${escapeHtml(statusLabel(k))}: <strong>${v}</strong></div>`)
          .join('')}
        <strong style="font-size:0.85rem;display:block;margin-top:0.5rem">${escapeHtml(t('thCategory'))}</strong>
        ${Object.entries(sm.byCategory)
          .map(([k, v]) => `<div>${escapeHtml(categoryLabel(k))}: <strong>${v}</strong></div>`)
          .join('')}
        <strong style="font-size:0.85rem;display:block;margin-top:0.5rem">${escapeHtml(t('thPriority'))}</strong>
        ${Object.entries(sm.byPriority)
          .map(([k, v]) => `<div>${escapeHtml(priorityLabel(k))}: <strong>${v}</strong></div>`)
          .join('')}
      </div>
    `;
  }

  $$('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      reportPeriod = btn.dataset.period;
      loadReport().catch((e) => console.error(e));
    });
  });

  $('#exportCsv').addEventListener('click', () => {
    window.location.href = `/api/stats/export.csv?period=${encodeURIComponent(reportPeriod)}`;
  });
  $('#exportPdf').addEventListener('click', () => {
    window.location.href = `/api/stats/export.pdf?period=${encodeURIComponent(reportPeriod)}`;
  });

  window.addEventListener('it-lang-change', () => {
    Promise.all([loadDashboard(), loadReport()]).catch((e) => console.error(e));
  });

  Promise.all([loadDashboard(), loadReport()]).catch((e) => {
    console.error(e);
    $('#dashboard').innerHTML = `<p class="err">${escapeHtml(t('repLoadErr'))}</p>`;
  });
})();
