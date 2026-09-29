// Synchronous and before CSS/React: avoid a light frame on dark devices.
(() => {
  const root = document.documentElement;
  const deviceDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let cache;
  try {
    cache = JSON.parse(localStorage.getItem('btb.appearance.v1') || 'null');
  } catch {}
  const settings = cache?.settings;
  const theme =
    settings?.followDeviceTheme === false && ['light', 'dark'].includes(settings.theme)
      ? settings.theme
      : deviceDark
        ? 'dark'
        : 'light';
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.style.backgroundColor = theme === 'dark' ? '#100d17' : '#f7f8fc';
  if (cache?.resolvedTheme === theme && cache.variables) {
    for (const [name, value] of Object.entries(cache.variables)) {
      if (/^--[a-z-]+$/.test(name) && typeof value === 'string')
        root.style.setProperty(name, value);
    }
  }
  root.lang = settings?.language === 'ar' ? 'ar' : 'en';
  root.dir = root.lang === 'ar' ? 'rtl' : 'ltr';
  root.classList.toggle('roomy', settings?.roomyText === true);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#100d17' : '#f7f8fc');
})();
