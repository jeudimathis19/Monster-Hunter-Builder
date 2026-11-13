// Discover: community builds with filters, sorting and likes.

import { html, raw, mount, toast, debounce, setTitle, $ } from '../ui.js';
import { t, WEAPON_KINDS, STYLES } from '../i18n.js';
import { icon } from '../icons.js';
import { computeBuild, sanitize } from '../calc.js';
import { loadFeatured } from '../data.js';
import { buildCard } from '../components.js';
import { listBuilds, likeBuild, hasCommunity } from '../api.js';
import { cardActions, bindCardActions, isOwn } from './shared.js';

export async function render(el, { data }) {
  setTitle(t('discover.title'));
  mount(el, html`
    <div class="page-hero"><div class="container">
      <h1>${t('discover.title')}</h1><p>${t('discover.lead')}</p>
    </div></div>
    <div class="container page">
      <form class="panel toolbar" id="d-filters" role="search" aria-label="${t('common.search')}">
        <label class="field field-search"><span>${t('common.search')}</span><input type="search" name="q" autocomplete="off"></label>
        <label class="field"><span>${t('gen.weapon')}</span><select name="weapon"><option value="">${t('common.all')}</option>${WEAPON_KINDS.map(k => html`<option value="${k}">${t(`weapon.${k}`)}</option>`)}</select></label>
        <label class="field"><span>${t('gen.style')}</span><select name="playstyle"><option value="">${t('common.all')}</option>${[...STYLES, 'custom'].map(s => html`<option value="${s}">${t(`style.${s}`)}</option>`)}</select></label>
        <label class="field"><span>${t('db.rank')}</span><select name="rank"><option value="">${t('common.all')}</option><option value="low">${t('rank.low')}</option><option value="high">${t('rank.high')}</option></select></label>
        <label class="field"><span>${t('builder.maxHr')}</span><input type="number" name="hrMax" min="1" max="999" inputmode="numeric"></label>
        <label class="field"><span>${t('discover.sort')}</span><select name="sort">
          <option value="recent">${t('discover.sort.recent')}</option><option value="popular">${t('discover.sort.popular')}</option><option value="views">${t('discover.sort.views')}</option></select></label>
      </form>
      <div id="d-list" aria-live="polite"><div class="skeleton"></div></div>
    </div>`);

  const list = $('#d-list', el);
  const form = $('#d-filters', el);
  form.addEventListener('submit', e => e.preventDefault());
  bindCardActions(list);

  if (!hasCommunity()) {
    const featured = await loadFeatured();
    const draw = () => {
      const f = new FormData(form);
      const q = (f.get('q') || '').toString().toLowerCase();
      const rows = featured.filter(x => (!f.get('weapon') || x.kind === f.get('weapon')) && (!f.get('playstyle') || x.style === f.get('playstyle')) &&
        (!f.get('rank') || x.rank === f.get('rank')) && (!+f.get('hrMax') || x.hr <= +f.get('hrMax')) &&
        (!q || x.name.toLowerCase().includes(q) || t(`weapon.${x.kind}`).toLowerCase().includes(q)));
      mount(list, html`<p class="alert alert-info">${t('discover.offline')}</p>
        ${rows.length ? html`<div class="grid grid-cards section">${rows.map(x => {
          const c = computeBuild(x.build, data);
          return buildCard({ id: x.id, title: `${t(`weapon.${x.kind}`)} · ${x.name}`, subtitle: `${t(`style.${x.style}`)} · ${x.source}`,
            c: { ...c, hr: Math.max(c.hr, x.hr) }, actions: cardActions({ build: x.build, name: x.name, style: x.style, kind: x.kind, favId: x.id }) });
        })}</div>` : html`<p class="empty">${t('discover.empty')}</p>`}`);
    };
    form.addEventListener('input', debounce(draw, 150));
    draw();
    return;
  }

  let page = 0;
  const load = async () => {
    const f = new FormData(form);
    const params = { type: 'build', page };
    for (const [k, v] of f.entries()) if (v) params[k] = v;
    try {
      const res = await listBuilds(params);
      const pages = Math.max(1, Math.ceil(res.total / res.pageSize));
      if (!res.builds.length) { mount(list, html`<p class="empty">${t('discover.empty')}</p><p><a class="btn btn-primary" href="#/builder">${t('home.cta.create')}</a></p>`); return; }
      mount(list, html`<p class="pick-count">${t('common.results', { n: res.total })}</p>
        <div class="grid grid-cards">${res.builds.map(b => {
          const build = sanitize(b.build, data);
          const c = computeBuild(build, data);
          return buildCard({
            id: b.id, title: b.name,
            subtitle: t('common.by', { name: b.author || t('common.anonymous') }),
            tags: html`<span class="badge">${t(`style.${b.playstyle}`)}</span>${isOwn(b) ? html`<span class="badge badge-variant">${t('discover.yours')}</span>` : ''}`,
            c,
            footer: html`<p class="card-meta">
              <button type="button" class="btn btn-sm${b.liked ? ' is-on' : ''}" data-like="${b.id}" aria-pressed="${b.liked}">${raw(icon('heart', { size: 16 }))}<span>${t('discover.likes', { n: b.likes })}</span></button>
              <span>${raw(icon('eye', { size: 16 }))} ${t('discover.views', { n: b.views })}</span></p>
              ${b.description ? html`<p class="small muted">${b.description.length > 140 ? b.description.slice(0, 140) + '…' : b.description}</p>` : ''}`,
            actions: cardActions({ build, name: b.name, style: b.playstyle, kind: b.weaponKind, communityId: b.id })
          });
        })}</div>
        ${pages > 1 ? html`<nav class="pager" aria-label="${t('common.page', { n: page + 1, total: pages })}">
          <button type="button" class="btn btn-sm" data-page="-1" ${page === 0 ? raw('disabled') : ''}>${t('common.prev')}</button>
          <span>${t('common.page', { n: page + 1, total: pages })}</span>
          <button type="button" class="btn btn-sm" data-page="1" ${page + 1 >= pages ? raw('disabled') : ''}>${t('common.next')}</button></nav>` : ''}`);
    } catch (ex) {
      mount(list, html`<p class="alert" role="alert">${t('common.error')} (${ex.message})</p>`);
    }
  };
  form.addEventListener('input', debounce(() => { page = 0; load(); }, 250));
  list.addEventListener('click', async e => {
    const p = e.target.closest('[data-page]');
    if (p) { page += +p.dataset.page; await load(); list.scrollIntoView({ behavior: 'smooth' }); }
    const like = e.target.closest('[data-like]');
    if (like) {
      try {
        const res = await likeBuild(like.dataset.like);
        like.classList.toggle('is-on', res.liked);
        like.setAttribute('aria-pressed', String(res.liked));
        like.querySelector('span').textContent = t('discover.likes', { n: res.likes });
      } catch (ex) { toast(ex.message, 'error'); }
    }
  });
  load();
}
