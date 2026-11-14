// Cosmetics gallery: outfit ideas + community outfits, with 3D renders.

import { html, raw, mount, toast, setTitle, $ } from '../ui.js';
import { t, getLang, ARMOR_KINDS } from '../i18n.js';
import { icon } from '../icons.js';
import { loadLooks } from '../data.js';
import { resolve } from '../calc.js';
import { lookFor } from '../look.js';
import { mountHunter } from '../hunter3d.js';
import { hrBadge, rankBadge, hunter2d } from '../components.js';
import { listBuilds, likeBuild, hasCommunity } from '../api.js';
import { cardActions, bindCardActions, isOwn } from './shared.js';
import { encodeBuild } from '../codec.js';

/** Summary of a look: resolved gear, HR and rank needed to unlock it. */
export function lookInfo(look, data) {
  const r = resolve({ w: look.w, a: look.a || {}, c: null, d: {} }, data);
  const pieces = [r.weapon, ...ARMOR_KINDS.map(k => r.armor[k])].filter(Boolean);
  const hr = pieces.reduce((m, p) => Math.max(m, p.hr || 1), 1);
  const rank = pieces.some(p => p.rk === 'h') ? 'high' : 'low';
  return { r, pieces, hr, rank, look: lookFor(r, look.colors || {}) };
}

export const lookAlt = info => t('render.alt', { list: info.pieces.map(p => p.n).join(', ') || t('common.none') });

function lookCard({ id, name, desc, author, info, actions, footer = '' }) {
  return html`<article class="card build-card look-card" data-look="${id}">
    <div class="build-card-body">
      <div class="look-render" data-render="${id}">
        <div class="look-2d">${hunter2d(info.look, { size: 150 })}</div>
        <button type="button" class="btn btn-sm look-3d-btn" data-show3d="${id}">${t('cosmetic.view3d')}<span class="sr-only"> : ${name}</span></button>
      </div>
      <header class="build-card-head">
        <h3 class="build-card-title">${name}</h3>
        ${author ? html`<p class="build-card-sub">${t('common.by', { name: author })}</p>` : ''}
        <div class="badges">${rankBadge(info.rank)}${hrBadge(info.hr)}</div>
      </header>
      ${desc ? html`<p class="small muted">${desc}</p>` : ''}
      <ul class="chips">${info.pieces.map(p => html`<li class="chip">${p.n}</li>`)}</ul>
      ${footer}
      <div class="card-actions">${actions}</div>
    </div>
  </article>`;
}

export async function render(el, { data }) {
  setTitle(t('cosmetic.title'));
  const lang = getLang();
  const ideas = await loadLooks(); // loaded before the first paint of the view: no layout shift
  mount(el, html`
    <div class="page-hero"><div class="container view-head">
      <div><h1>${t('cosmetic.title')}</h1><p>${t('cosmetic.lead')}</p></div>
      <a class="btn btn-primary" href="#/cosmetic/edit">${raw(icon('plus'))}${t('cosmetic.create')}</a>
    </div></div>
    <div class="container page">
      <section class="section" aria-labelledby="c-feat"><h2 id="c-feat" class="section-title">${t('cosmetic.featured')}</h2>
        <div class="grid grid-cards" id="c-ideas"></div></section>
      <section class="section" aria-labelledby="c-com"><h2 id="c-com" class="section-title">${t('cosmetic.gallery')}</h2>
        <div id="c-community" aria-live="polite"><div class="skeleton"></div></div></section>
      <p class="small muted">${t('cosmetic.note')}</p>
    </div>`);

  const renders = [];
  // Cards show a light 2D silhouette; the 3D render is mounted on demand.
  const lookInfos = new Map();
  const mountRenders = (root, infos) => { for (const [id, info] of infos) lookInfos.set(id, info); };
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-show3d]');
    if (!btn) return;
    const info = lookInfos.get(btn.dataset.show3d);
    const slot = btn.closest('[data-render]');
    if (!info || !slot) return;
    renders.push(mountHunter(slot, info.look, { compact: true, label: lookAlt(info) }));
    slot.querySelector('.h3d-stage')?.focus();
  });

  const ideaInfos = ideas.map(l => [l.id, lookInfo(l.look, data)]);
  const ideasEl = $('#c-ideas', el);
  mount(ideasEl, html`${ideas.map((l, i) => {
    const info = ideaInfos[i][1];
    const editHref = `#/cosmetic/edit?b=${encodeURIComponent(encodeBuild(l.look, { name: l.name[lang] }))}`;
    return lookCard({
      id: l.id, name: l.name[lang], desc: l.desc[lang], info,
      actions: html`<a class="btn btn-sm" href="${editHref}">${raw(icon('plus', { size: 16 }))}${t('card.copy')}</a>
        ${cardActions({ build: l.look, name: l.name[lang], favId: l.id, type: 'cosmetic' }, { view: false, edit: false })}`
    });
  })}`);
  mountRenders(ideasEl, ideaInfos);
  bindCardActions(ideasEl);

  const com = $('#c-community', el);
  bindCardActions(com);
  if (!hasCommunity()) {
    mount(com, html`<p class="alert alert-info">${t('publish.offline')}</p>`);
  } else {
    try {
      const res = await listBuilds({ type: 'cosmetic', sort: 'popular' });
      if (!res.builds.length) mount(com, html`<p class="empty">${t('cosmetic.empty')}</p>`);
      else {
        const infos = res.builds.map(b => [b.id, lookInfo(b.build, data)]);
        mount(com, html`<div class="grid grid-cards">${res.builds.map((b, i) => lookCard({
          id: b.id, name: b.name, desc: b.description, author: b.author || t('common.anonymous'), info: infos[i][1],
          footer: html`<p class="card-meta"><button type="button" class="btn btn-sm${b.liked ? ' is-on' : ''}" data-like="${b.id}" aria-pressed="${b.liked}">${raw(icon('heart', { size: 16 }))}<span>${t('discover.likes', { n: b.likes })}</span></button>
            ${isOwn(b) ? html`<span class="badge badge-variant">${t('discover.yours')}</span>` : ''}</p>`,
          actions: html`<a class="btn btn-sm" href="#/cosmetic/${b.id}">${raw(icon('eye', { size: 16 }))}${t('card.view')}</a>
            ${cardActions({ build: b.build, name: b.name, communityId: b.id, type: 'cosmetic' }, { view: false, edit: false })}`
        }))}</div>`);
        mountRenders(com, infos);
      }
    } catch (ex) {
      mount(com, html`<p class="alert" role="alert">${t('common.error')} (${ex.message})</p>`);
    }
    com.addEventListener('click', async e => {
      const like = e.target.closest('[data-like]');
      if (!like) return;
      try {
        const res = await likeBuild(like.dataset.like);
        like.classList.toggle('is-on', res.liked);
        like.setAttribute('aria-pressed', String(res.liked));
        like.querySelector('span').textContent = t('discover.likes', { n: res.likes });
      } catch (ex) { toast(ex.message, 'error'); }
    });
  }
  return { destroy: () => renders.forEach(r => r.destroy()) };
}

export { lookCard };
