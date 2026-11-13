// App shell: routing, theme, language and navigation.

import { t, getLang, setLang } from './i18n.js';
import { prefs } from './store.js';
import { loadData } from './data.js';
import { html, mount, setTitle } from './ui.js';

const main = document.getElementById('main');

const ROUTES = [
  { re: /^\/?$/, name: 'home', load: () => import('./views/home.js') },
  { re: /^\/builder$/, name: 'builder', load: () => import('./views/builder.js') },
  { re: /^\/build\/([\w-]+)$/, name: 'discover', load: () => import('./views/buildview.js') },
  { re: /^\/build$/, name: 'builder', load: () => import('./views/buildview.js') },
  { re: /^\/discover$/, name: 'discover', load: () => import('./views/discover.js') },
  { re: /^\/cosmetic$/, name: 'cosmetic', load: () => import('./views/cosmetic.js') },
  { re: /^\/cosmetic\/edit$/, name: 'cosmetic', load: () => import('./views/cosmetic-edit.js') },
  { re: /^\/cosmetic\/([\w-]+)$/, name: 'cosmetic', load: () => import('./views/cosmetic-view.js') },
  { re: /^\/db\/(\w+)(?:\/(\d+))?$/, name: 'db', load: () => import('./views/database.js') },
  { re: /^\/favorites$/, name: 'favorites', load: () => import('./views/favorites.js') }
];

let current = null;
let firstRender = true;

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path, query: new URLSearchParams(qs || '') };
}

/** Renders the static shell texts in the current language. */
function translateShell() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  const lang = document.querySelector('.lang-toggle');
  lang.textContent = t('lang.short');
  lang.setAttribute('aria-label', t('lang.switch'));
  lang.setAttribute('lang', getLang() === 'fr' ? 'en' : 'fr');
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.querySelector('.theme-toggle');
  const dark = document.documentElement.dataset.theme === 'dark';
  btn.setAttribute('aria-pressed', String(!dark));
  btn.setAttribute('aria-label', dark ? t('theme.light') : t('theme.dark'));
}

async function render() {
  const token = {};
  render.token = token;
  const { path, query } = parseHash();
  const route = ROUTES.find(r => r.re.test(path));
  if (current && current.destroy) current.destroy();
  current = null;

  document.querySelectorAll('[data-route]').forEach(a => {
    if (route && a.dataset.route === route.name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  closeNav();

  if (!route) {
    setTitle(t('notfound'));
    mount(main, html`<div class="container page"><h1>${t('notfound')}</h1><p><a href="#/">${t('nav.home')}</a></p></div>`);
    return;
  }
  const params = path.match(route.re).slice(1);
  if (!firstRender || route.name !== 'home') {
    mount(main, html`<div class="container page"><p class="loading" role="status"><span class="spinner" aria-hidden="true"></span>${t('common.loading')}</p></div>`);
  }
  try {
    const [mod, data] = await Promise.all([route.load(), loadData(getLang())]);
    if (render.token !== token) return;
    // Each view gets a fresh container so its event listeners die with it.
    const container = document.createElement('div');
    container.className = 'view';
    main.replaceChildren(container);
    const view = await mod.render(container, { params, query, data, rerender: render });
    if (render.token !== token) return;
    current = view || null;
    if (!firstRender) {
      window.scrollTo(0, 0);
      const h1 = main.querySelector('h1');
      if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    }
  } catch (err) {
    console.warn(err);
    mount(main, html`<div class="container page"><p class="alert" role="alert">${t('common.error')}</p>
      <button class="btn" type="button" data-retry>${t('common.retry')}</button></div>`);
    main.querySelector('[data-retry]').addEventListener('click', render);
  }
  firstRender = false;
}

function closeNav() {
  const toggle = document.querySelector('.nav-toggle');
  toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
}

function init() {
  setLang(getLang());
  translateShell();

  document.querySelector('.theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    prefs.set('theme', next);
    updateThemeButton();
  });
  document.querySelector('.lang-toggle').addEventListener('click', () => {
    setLang(getLang() === 'fr' ? 'en' : 'fr');
    translateShell();
    render();
  });
  const toggle = document.querySelector('.nav-toggle');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { closeNav(); toggle.focus(); } });

  window.addEventListener('hashchange', render);
  render();
}

init();
