(function () {
  const $ = (sel) => document.querySelector(sel);
  const I18n = window.ITTicketsI18n;
  const t = I18n ? I18n.t.bind(I18n) : (k) => k;

  const thankYou = $('#kioskThankYou');
  const msg = $('#kioskMsg');

  const loanBc =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('it-loan-sync') : null;
  function notifyLoanChanged() {
    if (loanBc) loanBc.postMessage({ type: 'loan-changed' });
  }

  let msgTimer = null;
  let thanksTimer = null;

  function setMsg(text, isError) {
    if (msgTimer) {
      clearTimeout(msgTimer);
      msgTimer = null;
    }
    msg.textContent = text || '';
    msg.style.color = isError ? 'var(--danger)' : 'var(--muted)';
  }

  function showThanks() {
    thankYou.hidden = false;
    thankYou.textContent = t('kioskMsgThanks');
    if (thanksTimer) clearTimeout(thanksTimer);
    thanksTimer = setTimeout(() => {
      thankYou.hidden = true;
      thanksTimer = null;
    }, 5000);
  }

  async function loadOptions() {
    const res = await fetch('/api/loan/status');
    if (!res.ok) throw new Error(t('kioskMsgLoadFail'));
    const data = await res.json();
    const primaryItems = data.items.filter(
      (i) =>
        i.available &&
        (i.kind === 'computer' || i.kind === 'other' || i.kind === 'charger')
    );
    const chargers = data.items.filter((i) => i.kind === 'charger' && i.available);

    const selC = $('#primaryId');
    const selH = $('#chargerId');
    const prevC = selC.value;
    const prevH = selH.value;

    selC.innerHTML = '';
    if (!primaryItems.length) {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = t('kioskNoPrimaryAvailable');
      o.disabled = true;
      selC.appendChild(o);
    } else {
      primaryItems.forEach((c) => {
        const o = document.createElement('option');
        o.value = String(c.id);
        o.dataset.assetKind = c.kind;
        const tag =
          c.kind === 'other' ? t('kioskOtherTag') : c.kind === 'charger' ? t('kioskChargerTag') : '';
        const brandBit = c.brandName ? `${c.brandName} · ` : '';
        o.textContent = `${brandBit}${c.name}${tag}`;
        selC.appendChild(o);
      });
    }

    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = t('kioskNoCharger');
    selH.innerHTML = '';
    selH.appendChild(opt0);
    chargers.forEach((c) => {
      const o = document.createElement('option');
      o.value = String(c.id);
      o.textContent = c.name;
      selH.appendChild(o);
    });

    if (prevC && [...selC.options].some((o) => o.value === prevC)) selC.value = prevC;
    if (prevH && [...selH.options].some((o) => o.value === prevH)) selH.value = prevH;
    updateChargerVisibility();
  }

  function updateChargerVisibility() {
    const wrap = $('#chargerFieldWrap');
    const sel = $('#primaryId');
    const opt = sel.selectedOptions[0];
    const kind = opt && opt.dataset ? opt.dataset.assetKind : '';
    const showCharger = kind === 'computer';
    wrap.hidden = !showCharger;
    if (!showCharger) $('#chargerId').value = '';
  }

  $('#primaryId').addEventListener('change', updateChargerVisibility);

  $('#btnLoanComputer').addEventListener('click', async () => {
    setMsg('');
    thankYou.hidden = true;
    const name = $('#borrowerName').value.trim();
    const primaryId = $('#primaryId').value;
    updateChargerVisibility();
    const primaryOpt = $('#primaryId').selectedOptions[0];
    const primaryKind = primaryOpt && primaryOpt.dataset ? primaryOpt.dataset.assetKind : '';

    if (!name) {
      setMsg(t('kioskMsgName'), true);
      return;
    }
    if (!primaryId) {
      setMsg(t('kioskMsgNoItem'), true);
      return;
    }

    const role = $('#borrowerRole').value;
    const chargerIdFinal =
      primaryKind === 'computer' && $('#chargerId').value ? Number($('#chargerId').value) : null;

    setMsg(t('kioskMsgSaving'));
    const body = {
      primaryAssetId: Number(primaryId),
      chargerAssetId: chargerIdFinal,
      borrowerName: name,
      borrowerRole: role,
    };
    try {
      const res = await fetch('/api/loan/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('kioskSaveFail'));

      setMsg('');
      $('#borrowerName').value = '';
      $('#chargerId').value = '';
      showThanks();
      notifyLoanChanged();
      await loadOptions();
    } catch (e) {
      setMsg(e.message, true);
    }
  });

  window.addEventListener('it-lang-change', () => {
    if (I18n) I18n.applyDataI18n();
    thankYou.textContent = t('kioskMsgThanks');
    loadOptions().catch((e) => setMsg(e.message, true));
  });

  loadOptions().catch((e) => setMsg(e.message, true));
})();
