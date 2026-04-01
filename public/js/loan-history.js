(function () {
  const $ = (sel) => document.querySelector(sel);
  const I18n = window.ITTicketsI18n;
  const t = I18n ? I18n.t.bind(I18n) : (k) => k;
  const locale = () => (I18n && I18n.getLang() === 'sv' ? 'sv-SE' : 'en-GB');

  const loanBc =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('it-loan-sync') : null;

  function roleLabel(r) {
    const m = {
      pupil: 'loanRolePupil',
      staff: 'loanRoleStaff',
      other: 'loanRoleOther',
    };
    return t(m[r] || 'loanRoleOther');
  }

  function kindSuffix(primaryKind) {
    return primaryKind === 'other'
      ? ` <span style="color:var(--muted)">${escapeHtml(t('loanKindOtherParen'))}</span>`
      : '';
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function fmtWhen(iso) {
    if (!iso) return '—';
    const dt = window.ITLoanDateTime;
    const formatted = dt ? dt.formatLoanLocal(iso, locale()) : '';
    if (!formatted) return escapeHtml(String(iso));
    return escapeHtml(formatted);
  }

  async function load() {
    const res = await fetch('/api/loan/history');
    if (!res.ok) throw new Error(t('loanLoadErr'));
    const rows = await res.json();
    render(rows || []);
  }

  function render(rows) {
    const tb = $('#tbodyHistory');
    const empty = $('#histEmpty');
    tb.innerHTML = '';
    if (!rows.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      const returned = !!row.returned_at;
      const stateKey = returned ? 'loanHistReturned' : 'loanHistActive';
      const primaryName = row.primary_name ?? '';
      tr.innerHTML = `
        <td>${fmtWhen(row.created_at)}</td>
        <td>${returned ? fmtWhen(row.returned_at) : '—'}</td>
        <td><span class="loan-badge ${returned ? 'ok' : 'out'}">${escapeHtml(t(stateKey))}</span></td>
        <td>${escapeHtml(row.borrower_name || '')}</td>
        <td>${escapeHtml(roleLabel(row.borrower_role))}</td>
        <td>${escapeHtml(primaryName)}${kindSuffix(row.primary_kind)}</td>
        <td>${escapeHtml(row.charger_name || '—')}</td>
      `;
      tb.appendChild(tr);
    });
  }

  $('#btnRefresh').addEventListener('click', () => {
    load().catch((e) => alert(e.message));
  });

  window.addEventListener('it-lang-change', () => {
    load().catch((e) => alert(e.message));
  });

  if (loanBc) {
    loanBc.onmessage = () => {
      load().catch(() => {});
    };
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) load().catch(() => {});
  });
  setInterval(() => {
    if (!document.hidden) load().catch(() => {});
  }, 2000);

  load().catch((e) => alert(e.message));
})();
