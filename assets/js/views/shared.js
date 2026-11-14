// Actions shared by build cards (view, edit, favorite, share).

import { html, raw, toast, copyText } from '../ui.js';
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { favorites } from '../store.js';
import { encodeBuild } from '../codec.js';
import { buildKey } from '../calc.js';
import { currentUser, isSignedIn, authEnabled } from '../auth.js';

/** True when a listed build was published by the signed-in account. */
export function isOwn(b) {
  const user = currentUser();
  return !!(user && user.username && b.author === user.username);
}

/**
 * Favorites and publications need an account. Returns true when signed in;
 * otherwise explains why and opens the account page, coming back here afterwards.
 */
export function requireSignIn(reasonKey) {
  if (isSignedIn()) return true;
  if (!authEnabled()) { toast(t('acc.disabled'), 'error'); return false; }
  const next = location.hash.replace(/^#/, '') || '/';
  location.hash = `#/account?why=${encodeURIComponent(reasonKey)}&next=${encodeURIComponent(next)}`;
  return false;
}

/**
 * Editors (builder, outfit editor) are for signed-in visitors. When signed out, renders a
 * panel inviting to sign in (coming back to the same page) and returns true.
 */
export function signInGate(el, { title, reasonKey }) {
  if (isSignedIn() || !authEnabled()) return false;
  const next = encodeURIComponent(location.hash.replace(/^#/, '') || '/');
  el.innerHTML = String(html`
    <div class="page-hero"><div class="container"><h1>${title}</h1></div></div>
    <div class="container page"><div class="account-box panel">
      <p>${t(reasonKey)}</p>
      <p class="builder-actions">
        <a class="btn btn-primary" href="#/account?next=${next}">${t('acc.signin')}</a>
        <a class="btn" href="#/account?mode=signup&next=${next}">${t('acc.signup')}</a>
      </p>
    </div></div>`);
  return true;
}

const registry = new Map();
let seq = 0;

export const shareUrl = (build, name, route = 'build') => {
  const base = location.href.split('#')[0];
  return `${base}#/${route}?b=${encodeURIComponent(encodeBuild(build, { name }))}`;
};
export const viewHref = (build, name) => `#/build?b=${encodeURIComponent(encodeBuild(build, { name }))}`;
export const editHref = (build, name) => `#/builder?b=${encodeURIComponent(encodeBuild(build, { name }))}`;

/**
 * entry: { build, name, style, kind, favId, communityId, type }
 */
export function cardActions(entry, { view = true, edit = true, share = true } = {}) {
  const ref = `a${++seq}`;
  const favId = entry.favId || entry.communityId || buildKey(entry.build);
  registry.set(ref, { ...entry, favId });
  const isFav = favorites.has(favId);
  const href = entry.communityId ? `#/build/${entry.communityId}` : viewHref(entry.build, entry.name);
  return html`
    ${view ? html`<a class="btn btn-sm" href="${href}">${raw(icon('eye', { size: 16 }))}${t('card.view')}</a>` : ''}
    ${edit ? html`<a class="btn btn-sm" href="${editHref(entry.build, entry.name)}">${raw(icon('plus', { size: 16 }))}${t('card.copy')}</a>` : ''}
    <button type="button" class="btn btn-sm btn-ghost${isFav ? ' is-on' : ''}" data-fav="${ref}" aria-pressed="${isFav}">
      ${raw(icon('heart', { size: 16 }))}<span>${isFav ? t('card.unfav') : t('card.fav')}</span></button>
    ${share ? html`<button type="button" class="btn btn-sm btn-ghost" data-share="${ref}">${raw(icon('share', { size: 16 }))}<span class="sr-only">${t('common.share')}</span></button>` : ''}`;
}

export function bindCardActions(root) {
  if (root.dataset.actionsBound) return;
  root.dataset.actionsBound = '1';
  root.addEventListener('click', async e => {
    const fav = e.target.closest('[data-fav]');
    const share = e.target.closest('[data-share]');
    if (fav) {
      const entry = registry.get(fav.dataset.fav);
      if (!entry || !requireSignIn('acc.need.fav')) return;
      const on = favorites.toggle({
        id: entry.favId, name: entry.name, build: entry.build, style: entry.style || 'custom',
        kind: entry.kind || null, communityId: entry.communityId || null, type: entry.type || 'build'
      });
      fav.classList.toggle('is-on', on);
      fav.setAttribute('aria-pressed', String(on));
      fav.querySelector('span').textContent = on ? t('card.unfav') : t('card.fav');
      toast(on ? t('card.favAdded') : t('card.favRemoved'), 'success');
    }
    if (share) {
      const entry = registry.get(share.dataset.share);
      if (!entry) return;
      const url = entry.communityId
        ? `${location.href.split('#')[0]}#/${entry.type === 'cosmetic' ? 'cosmetic' : 'build'}/${entry.communityId}`
        : shareUrl(entry.build, entry.name, entry.type === 'cosmetic' ? 'cosmetic/edit' : 'build');
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        try { await navigator.share({ title: entry.name, url }); return; } catch { /* cancelled */ }
      }
      if (await copyText(url)) toast(t('common.copied'), 'success');
    }
  });
}
