(() => {
  let saved = null;
  try {
    saved = localStorage.getItem('dashlab-plus-site-theme');
  } catch {
    // The operating-system preference remains a safe fallback.
  }
  const theme = saved === 'light' || saved === 'dark'
    ? saved
    : matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  document.querySelector("meta[name='theme-color']")?.setAttribute(
    'content',
    theme === 'light' ? '#f5f2eb' : '#090d0f',
  );
})();
