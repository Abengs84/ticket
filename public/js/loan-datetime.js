/**
 * SQLite datetime('now') values are UTC but have no timezone suffix. Browsers would
 * otherwise treat "YYYY-MM-DD HH:MM:SS" as local time, skewing display by the UTC offset.
 */
(function (global) {
  function parseSqlUtc(s) {
    if (s == null || s === '') return null;
    const str = String(s).trim();
    if (!str) return null;
    if (/[zZ]$/.test(str) || /[+-]\d{2}:?\d{2}$/.test(str)) {
      const d = new Date(str);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const normalized = str.includes('T') ? str : str.replace(' ', 'T');
    const d = new Date(`${normalized}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /** Date as d.m.yyyy, then short time in the given locale. */
  function formatLoanLocal(iso, locale, options) {
    const date = parseSqlUtc(iso);
    if (!date) return '';
    if (options && Object.keys(options).length > 0) {
      return date.toLocaleString(locale, options);
    }
    const datePart = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    const timePart = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
  }

  global.ITLoanDateTime = { parseSqlUtc, formatLoanLocal };
})(typeof window !== 'undefined' ? window : globalThis);
