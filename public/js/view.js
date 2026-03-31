(function () {
  const THEME_KEY = 'it-tickets-theme';
  const path = window.location.pathname.replace(/\/+$/, '');
  const segments = path.split('/');
  const publicId = segments[segments.length - 1];

  const TYPE_LABELS = {
    printer: 'Printer',
    computer: 'Computer',
    peripheral: 'Peripheral',
    other: 'Other',
  };

  function $(sel) {
    return document.querySelector(sel);
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

  if (!publicId || publicId === 'view') {
    $('#stateLoad').hidden = true;
    $('#stateErr').hidden = false;
    $('#stateErr').textContent = 'Invalid ticket link.';
  } else {
    fetch(`/api/public/tickets/${encodeURIComponent(publicId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Ticket not found.' : 'Could not load.');
        return r.json();
      })
      .then(async (t) => {
        const attRes = await fetch(`/api/tickets/${t.id}/attachments`);
        const attachments = attRes.ok ? await attRes.json() : [];

        $('#stateLoad').hidden = true;
        $('#card').hidden = false;
        $('#vTitle').textContent = `#${t.id} — ${t.title}`;
        $('#vDesc').innerHTML = escapeHtml(t.description);
        $('#vReporter').textContent = [t.reporterName, `(${reporterLabel(t.reporterType)})`]
          .filter(Boolean)
          .join(' ');
        $('#vMeta').textContent = `${t.category} · ${priorityLabel(t.priority)} · ${t.status}`;
        if (t.device) {
          $('#vDeviceWrap').hidden = false;
          $('#vDevice').textContent = formatDevice(t.device);
        } else {
          $('#vDeviceWrap').hidden = true;
        }
        const resText = (t.resolution || '').trim();
        if (t.status === 'closed' && resText) {
          $('#vResolutionWrap').hidden = false;
          $('#vResolution').textContent = resText;
        } else {
          $('#vResolutionWrap').hidden = true;
        }
        $('#vTags').textContent = t.tags && t.tags.length ? t.tags.join(', ') : '—';
        $('#vTime').textContent = `Created ${t.createdAt} · Last updated ${t.updatedAt}`;

        if (!attachments.length) {
          $('#vAttach').innerHTML = '<span style="color:var(--muted)">None</span>';
        } else {
          $('#vAttach').innerHTML = attachments
            .map(
              (a) =>
                `<div style="margin:0.35rem 0"><a href="${a.viewUrl}" target="_blank" rel="noopener">${escapeHtml(a.originalName)}</a> <span style="color:var(--muted);font-size:0.85rem">(opens in browser)</span></div>`
            )
            .join('');
        }

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

        function fillPrint(qrDataUrl) {
          const pubUrl = window.location.href.split('?')[0];
          const devLine = t.device ? formatDevice(t.device) : '';
          $('#print-area').innerHTML = `
            <h1 style="font-size:1.2rem">IT Ticket #${t.id}</h1>
            <p><strong>${escapeHtml(t.title)}</strong></p>
            <p style="white-space:pre-wrap">${escapeHtml(t.description)}</p>
            <p>Reporter: ${escapeHtml(reporterLabel(t.reporterType))} ${escapeHtml(t.reporterName || '')}</p>
            <p>${escapeHtml(t.category)} · ${escapeHtml(priorityLabel(t.priority))} · ${escapeHtml(t.status)}</p>
            ${devLine ? `<p>Device: ${escapeHtml(devLine)}</p>` : ''}
            ${
              t.status === 'closed' && (t.resolution || '').trim()
                ? `<p><strong>What solved it:</strong></p><p style="white-space:pre-wrap">${escapeHtml((t.resolution || '').trim())}</p>`
                : ''
            }
            <p>Tags: ${escapeHtml((t.tags || []).join(', ') || '—')}</p>
            <p>${escapeHtml(t.createdAt)} — ${escapeHtml(t.updatedAt)}</p>
            <div style="text-align:center;margin-top:1rem">
              <img src="${qrDataUrl}" width="200" height="200" alt="QR" />
              <p style="font-size:0.85rem">${escapeHtml(pubUrl)}</p>
            </div>
          `;
        }

        function waitPaint() {
          return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        }

        $('#btnPrint').addEventListener('click', async () => {
          try {
            const qr = await ticketQrDataUrl(t.id);
            fillPrint(qr);
            await waitPaint();
            window.print();
          } catch (e) {
            alert(e.message || String(e));
          }
        });
      })
      .catch((err) => {
        $('#stateLoad').hidden = true;
        $('#stateErr').hidden = false;
        $('#stateErr').textContent = err.message || String(err);
      });
  }
})();
