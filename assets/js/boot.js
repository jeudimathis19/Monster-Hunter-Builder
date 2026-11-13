// Runs before first paint: applies the saved theme and language to avoid a flash.
(function () {
  var root = document.documentElement;
  function read(key) {
    try { return JSON.parse(localStorage.getItem('mhb:pref:' + key)); } catch (e) { return null; }
  }
  var theme = read('theme');
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  root.setAttribute('data-theme', theme);
  var lang = read('lang');
  if (lang !== 'fr' && lang !== 'en') lang = (navigator.language || 'fr').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
  root.lang = lang;
  // Preload the right data bundle.
  var link = document.getElementById('preload-data');
  if (link && lang === 'en') link.href = 'data/en.json';
})();
