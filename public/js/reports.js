(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

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

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
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
        <h3>Open</h3>
        <div class="stat-big">${open}</div>
        <p style="margin:0;font-size:0.85rem;color:var(--muted)">Active tickets</p>
      </div>
      <div class="card">
        <h3>Closed</h3>
        <div class="stat-big">${closed}</div>
        <p style="margin:0;font-size:0.85rem;color:var(--muted)">Resolved &amp; closed</p>
      </div>
      <div class="card">
        <h3>Unresolved</h3>
        <div class="stat-big">${unresolved}</div>
        <p style="margin:0;font-size:0.85rem;color:var(--muted)">Needs follow-up</p>
      </div>
      <div class="card">
        <h3>Total</h3>
        <div class="stat-big">${s.total}</div>
        <p style="margin:0;font-size:0.85rem;color:var(--muted)">All time</p>
      </div>
      <div class="card">
        <h3>By category</h3>
        <div class="bar-list">
          ${s.byCategory
            .map(
              (x) => `
            <div class="bar-row">
              <span>${escapeHtml(x.category)}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${(100 * x.c) / maxCat}%"></div></div>
              <span>${x.c}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>
      <div class="card">
        <h3>By priority</h3>
        <div class="bar-list">
          ${s.byPriority
            .map(
              (x) => `
            <div class="bar-row">
              <span>${escapeHtml(x.priority === 'na' ? 'N/A' : x.priority)}</span>
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
    $('#reportMeta').textContent = `Range: ${sm.start.slice(0, 10)} → ${sm.end.slice(0, 10)} · ${sm.count} ticket(s)`;
    const priLabel = (k) => (k === 'na' ? 'N/A' : k);
    $('#reportSummary').innerHTML = `
      <div class="bar-list" style="max-width:420px">
        <strong style="font-size:0.85rem">Status</strong>
        ${Object.entries(sm.byStatus)
          .map(([k, v]) => `<div>${escapeHtml(k)}: <strong>${v}</strong></div>`)
          .join('')}
        <strong style="font-size:0.85rem;display:block;margin-top:0.5rem">Category</strong>
        ${Object.entries(sm.byCategory)
          .map(([k, v]) => `<div>${escapeHtml(k)}: <strong>${v}</strong></div>`)
          .join('')}
        <strong style="font-size:0.85rem;display:block;margin-top:0.5rem">Priority</strong>
        ${Object.entries(sm.byPriority)
          .map(([k, v]) => `<div>${escapeHtml(priLabel(k))}: <strong>${v}</strong></div>`)
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

  Promise.all([loadDashboard(), loadReport()]).catch((e) => {
    console.error(e);
    $('#dashboard').innerHTML = `<p class="err">Could not load reports. Is the server running?</p>`;
  });
})();
