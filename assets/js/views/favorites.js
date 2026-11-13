// My builds: favorites, own publications and side-by-side comparison.

import { html, raw, mount, num, toast, setTitle, $ } from '../ui.js';
import { t, getLang } from '../i18n.js';
import { icon } from '../icons.js';
import { favorites, owned } from '../store.js';
import { computeBuild, sanitize } from '../calc.js';
import { buildCard } from '../components.js';
import { getBuild, hasCommunity, myBuilds, accountsEnabled } from '../api.js';
import { isSignedIn } from '../auth.js';
import { cardActions, bindCardActions } from './shared.js';
import { encodeBuild } from '../codec.js';
import { lookInfo } from './cosmetic.js';
import { hunter2d } from '../components.js';

export async function render(el, { data }) {
  setTitle(t('fav.title'));
  // Favorites and creations live on the account.
  if (accountsEnabled() && !isSignedIn()) {
    mount(el, html`
      <div class="page-hero"><div class="container"><h1>${t('fav.title')}</h1><p>${t('fav.lead')}</p></div></div>
      <div class="container page"><div class="account-box panel">
        <p>${t('acc.need.favorites')}</p>
        <p class="builder-actions">
          <a class="btn btn-primary" href="#/account?next=%2Ffavorites">${t('acc.signin')}</a>
          <a class="btn" href="#/account?mode=signup&next=%2Ffavorites">${t('acc.signup')}</a>
        </p>
      </div></div>`);
    return;
  }
  mount(el, html`
    <div class="page-hero"><div class="container">
      <h1>${t('fav.title')}</h1><p>${t('fav.lead')}</p>
    </div></div>
    <div class="container page">
      <section class="section" aria-labelledby="f-saved"><h2 id="f-saved" class="section-title">${t('fav.saved')}</h2><div id="f-list"></div></section>
      <section class="section" aria-labelledby="f-cmp"><h2 id="f-cmp" class="section-title">${t('fav.compareTitle')}</h2><div id="f-compare"></div></section>
      <section class="section" aria-labelledby="f-pub"><h2 id="f-pub" class="section-title">${t('fav.published')}</h2><div id="f-pub-list"></div></section>
    </div>`);

  const list = $('#f-list', el);
  bindCardActions(list);
  const drawFavorites = () => {
    const favs = favorites.all();
    if (!favs.length) { mount(list, html`<p class="empty">${t('fav.empty')}</p>`); drawCompare([]); return; }
    mount(list, html`<div class="grid grid-cards">${favs.map(f => {
      if (f.type === 'cosmetic') {
        const info = lookInfo(f.build, data);
        const href = f.communityId ? `#/cosmetic/${f.communityId}` : `#/cosmetic/edit?b=${encodeURIComponent(encodeBuild(f.build, { name: f.name }))}`;
        return html`<article class="card build-card look-card"><div class="build-card-art">${hunter2d(info.look, { size: 80 })}</div>
          <div class="build-card-body"><h3 class="build-card-title">${typeof f.name === 'object' ? f.name[getLang()] : f.name}</h3>
          <p class="badges"><span class="badge">${t('nav.cosmetic')}</span></p>
          <div class="card-actions"><a class="btn btn-sm" href="${href}">${raw(icon('eye', { size: 16 }))}${t('card.view')}</a>
          <button type="button" class="btn btn-sm btn-ghost is-on" data-unfav="${f.id}">${raw(icon('heart', { size: 16 }))}${t('card.unfav')}</button></div></div></article>`;
      }
      const build = sanitize(f.build, data);
      const c = computeBuild(build, data);
      return buildCard({
        id: f.id, title: f.name, subtitle: f.style ? t(`style.${f.style}`) : '', c,
        footer: html`<label class="inline-list small"><input type="checkbox" data-compare="${f.id}"> ${t('fav.compare')}</label>`,
        actions: cardActions({ build, name: f.name, style: f.style, kind: f.kind, favId: f.id, communityId: f.communityId })
      });
    })}</div>`);
    drawCompare([]);
  };

  const cmp = $('#f-compare', el);
  const drawCompare = ids => {
    if (ids.length < 2) { mount(cmp, html`<p class="muted">${t('fav.compareHint')}</p>`); return; }
    const entries = ids.map(id => favorites.all().find(f => f.id === id)).filter(Boolean);
    const cs = entries.map(f => computeBuild(sanitize(f.build, data), data));
    const skillIds = [...new Set(cs.flatMap(c => c.skills.map(s => s.skill.id)))];
    const lvl = (c, id) => (c.skills.find(s => s.skill.id === id) || { level: 0 }).level;
    const row = (label, fn) => html`<tr><th scope="row">${label}</th>${cs.map(c => html`<td>${fn(c)}</td>`)}</tr>`;
    mount(cmp, html`<div class="table-wrap panel"><table class="table">
      <caption class="sr-only">${t('fav.compareTitle')}</caption>
      <thead><tr><th scope="col"></th>${entries.map(f => html`<th scope="col">${f.name}</th>`)}</tr></thead>
      <tbody>
        ${row(t('hr.required'), c => t('hr.min', { n: c.hr }))}
        ${row(t('db.rank'), c => t(`rank.${c.rank}`))}
        ${row(t('stat.cost'), c => `${num(c.zenny)} z`)}
        ${row(t('stat.attack'), c => num(c.stats.attack))}
        ${row(t('stat.affinity'), c => `${c.stats.affinity}%`)}
        ${row(t('stat.element'), c => (c.stats.element ? `${t(`el.${c.stats.element.type}`)} ${c.stats.element.value}` : '—'))}
        ${row(t('stat.defenseMax'), c => num(c.stats.defMax))}
        ${row(t('stat.slots'), c => `${c.stats.slotsUsed}/${c.stats.slotsTotal}`)}
        ${skillIds.map(id => row(data.skillById.get(id).n, c => { const a = lvl(c, id); const best = Math.max(...cs.map(x => lvl(x, id))); return a ? html`<b class="${a === best ? 'zenny' : ''}">${a}</b>` : '—'; }))}
      </tbody></table></div>`);
  };

  el.addEventListener('change', e => {
    if (!e.target.matches('[data-compare]')) return;
    const checked = [...el.querySelectorAll('[data-compare]:checked')];
    if (checked.length > 2) { e.target.checked = false; return; }
    drawCompare(checked.map(c => c.dataset.compare));
  });
  el.addEventListener('click', e => {
    const un = e.target.closest('[data-unfav]');
    if (un) { favorites.remove(un.dataset.unfav); toast(t('card.favRemoved'), 'success'); drawFavorites(); }
  });
  list.addEventListener('click', e => { if (e.target.closest('[data-fav]')) setTimeout(drawFavorites, 0); });
  drawFavorites();

  // Own publications
  const pub = $('#f-pub-list', el);
  if (!hasCommunity()) { mount(pub, html`<p class="muted">${t('publish.offline')}</p>`); return; }
  const signedIn = accountsEnabled() && isSignedIn();
  let items = [];
  if (signedIn) { try { items = await myBuilds(); } catch { items = []; } }
  const known = new Set(items.map(b => b.id));
  const localIds = Object.keys(owned.all()).filter(id => !known.has(id));
  const local = (await Promise.all(localIds.map(id => getBuild(id).catch(err => (err.status === 404 ? (owned.remove(id), null) : null))))).filter(Boolean);
  items = [...items, ...local];
  const prompt = accountsEnabled() && !signedIn
    ? html`<p class="alert alert-info">${t('acc.signInToSync')} <a href="#/account">${t('acc.signin')}</a> · <a href="#/account?mode=signup">${t('acc.signup')}</a></p>` : '';
  mount(pub, items.length ? html`${prompt}<ul class="monster-list">${items.map(b => html`<li>
    <a href="#/${b.type === 'cosmetic' ? 'cosmetic' : 'build'}/${b.id}"><strong>${b.name}</strong></a>
    <span class="badge">${b.type === 'cosmetic' ? t('nav.cosmetic') : t(`style.${b.playstyle}`)}</span>
    <span class="muted small">${t('discover.likes', { n: b.likes })} · ${t('discover.views', { n: b.views })}</span>
    <a class="btn btn-sm" href="#/${b.type === 'cosmetic' ? 'cosmetic/edit' : 'builder'}?edit=${b.id}">${raw(icon('edit', { size: 16 }))}${t('common.edit')}</a>
  </li>`)}</ul>` : html`${prompt}<p class="empty">${t('common.empty')}</p>`);
}
