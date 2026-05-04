(function () {
  const $ = (sel) => document.querySelector(sel);
  const THEME_KEY = 'it-tickets-theme';
  const btn = $('#themeToggle');
  if (!btn) return;

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    btn.textContent = dark ? '☀️' : '🌙';
  }

  btn.addEventListener('click', () => {
    const next =
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  initTheme();
})();
