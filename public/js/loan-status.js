(function () {
  const $ = (sel) => document.querySelector(sel);
  const I18n = window.ITTicketsI18n;
  const t = I18n ? I18n.t.bind(I18n) : (k) => k;
  const locale = () => (I18n && I18n.getLang() === 'sv' ? 'sv-SE' : 'en-GB');

  const EQUIP_VIEW_KEY = 'it-loan-equipment-view';

  function formatSince(iso) {
    if (!iso) return '';
    const dt = window.ITLoanDateTime;
    if (dt) {
      const s = dt.formatLoanLocal(iso, locale());
      if (s) return s;
    }
    return String(iso);
  }

  const path = location.pathname.replace(/\/$/, '') || '/';
  if (path === '/loan-computers' || path === '/loan-computers/status') {
    document.querySelector('[data-loan-overview]')?.setAttribute('aria-current', 'page');
  }

  const loanBc =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('it-loan-sync') : null;
  function notifyLoanChanged() {
    if (loanBc) loanBc.postMessage({ type: 'loan-changed' });
  }

  function roleLabel(r) {
    const m = {
      pupil: 'loanRolePupil',
      staff: 'loanRoleStaff',
      other: 'loanRoleOther',
    };
    return t(m[r] || 'loanRoleOther');
  }

  function kindLabel(k) {
    const m = {
      computer: 'loanKindComputer',
      charger: 'loanKindCharger',
      other: 'loanKindOther',
    };
    return t(m[k] || k);
  }

  function equipmentKindIcon(kind) {
    if (kind === 'computer') {
      return `<svg class="loan-equip-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 18h20"/><path d="M9 18h6"/></svg>`;
    }
    if (kind === 'other') {
      return `<svg class="loan-equip-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="12" rx="5" ry="8"/><path d="M12 6v2"/></svg>`;
    }
    return `<svg class="loan-equip-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>`;
  }

  function getEquipmentView() {
    try {
      return localStorage.getItem(EQUIP_VIEW_KEY) === 'icons' ? 'icons' : 'list';
    } catch {
      return 'list';
    }
  }

  function setEquipmentView(mode) {
    try {
      localStorage.setItem(EQUIP_VIEW_KEY, mode === 'icons' ? 'icons' : 'list');
    } catch {
      /* ignore */
    }
  }

  function applyViewToggleUI() {
    const mode = getEquipmentView();
    const listWrap = $('#loanAllListWrap');
    const iconsWrap = $('#loanAllIconsWrap');
    const btnList = $('#btnViewList');
    const btnIcons = $('#btnViewIcons');
    if (!listWrap || !iconsWrap || !btnList || !btnIcons) return;
    const isIcons = mode === 'icons';
    listWrap.hidden = isIcons;
    iconsWrap.hidden = !isIcons;
    btnList.setAttribute('aria-pressed', isIcons ? 'false' : 'true');
    btnIcons.setAttribute('aria-pressed', isIcons ? 'true' : 'false');
    btnList.classList.toggle('is-active', !isIcons);
    btnIcons.classList.toggle('is-active', isIcons);
  }

  async function load() {
    const res = await fetch('/api/loan/status');
    if (!res.ok) throw new Error(t('loanLoadErr'));
    const data = await res.json();
    const activeLoans = data.activeLoans || [];
    renderActive(activeLoans);
    renderAllEquipment(data.items || [], activeLoans);
  }

  function renderActive(rows) {
    const tb = $('#tbodyActive');
    const empty = $('#activeEmpty');
    tb.innerHTML = '';
    if (!rows.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      const checkoutId = row.checkout_id;
      const primaryName = row.primary_name ?? row.computer_name ?? '';
      const kindSuffix =
        row.primary_kind === 'other'
          ? ` <span style="color:var(--muted)">${escapeHtml(t('loanKindOtherParen'))}</span>`
          : '';
      tr.innerHTML = `
        <td>${escapeHtml(formatSince(row.created_at))}</td>
        <td>${escapeHtml(row.borrower_name || '')}</td>
        <td>${escapeHtml(roleLabel(row.borrower_role))}</td>
        <td>${escapeHtml(primaryName)}${kindSuffix}</td>
        <td>${escapeHtml(row.charger_name || '—')}</td>
        <td></td>
      `;
      const td = tr.querySelector('td:last-child');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary';
      btn.textContent = t('loanMarkReturned');
      btn.addEventListener('click', async () => {
        if (!confirm(t('loanConfirmReturn'))) return;
        btn.disabled = true;
        try {
          const r = await fetch(`/api/loan/return/${checkoutId}`, {
            method: 'POST',
            headers: { Accept: 'application/json' },
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || t('loanReturnFail'));
          notifyLoanChanged();
          await load();
        } catch (e) {
          alert(e.message);
          btn.disabled = false;
        }
      });
      td.appendChild(btn);
      tb.appendChild(tr);
    });
  }

  function buildEquipmentRows(items, activeLoans) {
    const loans = activeLoans || [];
    const chargerIdsPairedWithPrimary = new Set();
    const primaryIdToChargerName = new Map();
    for (const row of loans) {
      const cid = row.charger_asset_id;
      if (cid) {
        chargerIdsPairedWithPrimary.add(Number(cid));
        primaryIdToChargerName.set(Number(row.computer_asset_id), row.charger_name || '');
      }
    }

    const rows = [];
    items.forEach((it) => {
      if (it.kind === 'charger' && !it.available && chargerIdsPairedWithPrimary.has(Number(it.id))) {
        return;
      }
      const avail = it.available;
      const who =
        it.checkout && it.checkout.borrowerName
          ? `${it.checkout.borrowerName} (${roleLabel(it.checkout.borrowerRole)})`
          : '—';
      let nameHtml = escapeHtml(it.name);
      let nameText = it.name;
      if (!avail && primaryIdToChargerName.has(Number(it.id))) {
        const chg = primaryIdToChargerName.get(Number(it.id));
        if (chg) {
          const bit = t('loanNameChargerBit').replace(/\{name\}/g, escapeHtml(chg));
          nameHtml += ` <span class="loan-inline-charger">${bit}</span>`;
          nameText += ` ${t('loanNameChargerBit').replace(/\{name\}/g, chg)}`;
        }
      }
      rows.push({
        kind: it.kind,
        id: it.id,
        avail,
        nameHtml,
        nameText,
        whoLabel: avail ? '' : who,
      });
    });
    return rows;
  }

  function renderList(rows) {
    const tb = $('#tbodyAll');
    tb.innerHTML = '';
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(kindLabel(row.kind))}</td>
        <td>${row.nameHtml}</td>
        <td><span class="loan-badge ${row.avail ? 'ok' : 'out'}">${row.avail ? escapeHtml(t('loanAvail')) : escapeHtml(t('loanOut'))}</span></td>
        <td>${row.avail ? '—' : escapeHtml(row.whoLabel)}</td>
      `;
      tb.appendChild(tr);
    });
  }

  function renderIcons(rows) {
    const grid = $('#loanAllIconsGrid');
    grid.innerHTML = '';
    rows.forEach((row) => {
      const card = document.createElement('div');
      card.className = `loan-equip-icon-card ${row.avail ? 'is-avail' : 'is-out'}`;
      const frame = document.createElement('div');
      frame.className = 'loan-equip-icon-frame';
      frame.innerHTML = equipmentKindIcon(row.kind);
      const nameEl = document.createElement('div');
      nameEl.className = 'loan-equip-icon-name';
      nameEl.textContent = row.nameText;
      card.appendChild(frame);
      card.appendChild(nameEl);
      if (!row.avail && row.whoLabel) {
        const whoEl = document.createElement('div');
        whoEl.className = 'loan-equip-icon-who';
        whoEl.textContent = row.whoLabel;
        card.appendChild(whoEl);
      }
      grid.appendChild(card);
    });
  }

  function renderAllEquipment(items, activeLoans) {
    const rows = buildEquipmentRows(items, activeLoans);
    renderList(rows);
    renderIcons(rows);
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  $('#btnRefresh').addEventListener('click', () => {
    load().catch((e) => alert(e.message));
  });

  $('#btnViewList').addEventListener('click', () => {
    setEquipmentView('list');
    applyViewToggleUI();
  });
  $('#btnViewIcons').addEventListener('click', () => {
    setEquipmentView('icons');
    applyViewToggleUI();
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

  applyViewToggleUI();
  load().catch((e) => alert(e.message));
})();
