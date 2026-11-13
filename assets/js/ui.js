// Small DOM helpers shared by every view.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes a value for safe insertion in HTML. */
export const esc = v => (v === null || v === undefined ? '' : String(v).replace(/[&<>"']/g, c => ESC[c]));

/** Tagged template that escapes interpolations unless wrapped with raw(). */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += renderValue(values[i]);
  });
  return new Raw(out);
}
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = s => new Raw(s);
function renderValue(v) {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(renderValue).join('');
  if (v === false || v === null || v === undefined) return '';
  return esc(v);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function mount(el, content) {
  el.innerHTML = String(content);
}

const nf = {};
export function num(n, lang) {
  const l = lang || document.documentElement.lang || 'fr';
  nf[l] = nf[l] || new Intl.NumberFormat(l);
  return nf[l].format(n || 0);
}

let toastTimer;
/** Accessible toast, announced through an aria-live region. */
export function toast(message, type = 'info') {
  const region = document.getElementById('toast');
  if (!region) return;
  region.className = `toast toast-${type} is-visible`;
  region.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { region.className = 'toast'; region.textContent = ''; }, 3800);
}

/** Opens a native <dialog> with the given HTML and resolves when it closes. */
export function openDialog(content, { label, onMount } = {}) {
  const dlg = document.createElement('dialog');
  dlg.className = 'dialog';
  if (label) dlg.setAttribute('aria-label', label);
  dlg.innerHTML = String(content);
  document.body.appendChild(dlg);
  const opener = document.activeElement;
  return new Promise(resolve => {
    // Resolve as soon as close() is called: the native 'close' event can be delayed
    // while the page is hidden.
    let done = false;
    const finish = value => {
      if (done) return;
      done = true;
      dlg.remove();
      if (opener && opener.focus) opener.focus();
      resolve(value);
    };
    const nativeClose = dlg.close.bind(dlg);
    dlg.close = (value = '') => { nativeClose(value); finish(value); };
    dlg.addEventListener('close', () => finish(dlg.returnValue));
    dlg.addEventListener('submit', e => {
      // <form method="dialog"> without a custom handler: close with the submitter's value.
      setTimeout(() => { if (!e.defaultPrevented) finish(e.submitter ? e.submitter.value : ''); }, 0);
    });
    dlg.addEventListener('click', e => {
      if (e.target === dlg) dlg.close('');
      const closer = e.target.closest('[data-close]');
      if (closer) dlg.close(closer.dataset.close || '');
    });
    if (onMount) onMount(dlg);
    dlg.showModal();
  });
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function setTitle(title) {
  document.title = title ? `${title} · Wilds Forge` : 'Wilds Forge · Monster Hunter Wilds Builder';
}
