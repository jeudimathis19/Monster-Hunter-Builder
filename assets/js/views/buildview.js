// Build detail page: shared link (#/build?b=...) or community build (#/build/:id).

import { html, raw, mount, toast, openDialog, setTitle, $ } from '../ui.js';
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { computeBuild, sanitize, buildKey } from '../calc.js';
import { decodeBuild } from '../codec.js';
import { lookFor } from '../look.js';
import { mountHunter } from '../hunter3d.js';
import { buildSheet, bindChecklist, renderAlt, rankBadge, hrBadge } from '../components.js';
import { getBuild, likeBuild, deleteBuild, hasCommunity, canEdit } from '../api.js';
import { cardActions, bindCardActions } from './shared.js';

export async function render(el, { data, params, query }) {
  let entry = null;
  const id = params[0];
  if (id) {
    if (hasCommunity()) {
      try { entry = await getBuild(id, true); } catch { entry = null; }
    }
    if (entry && entry.type === 'cosmetic') { location.replace(`#/cosmetic/${id}`); return; }
  } else if (query.get('b')) {
    const decoded = decodeBuild(query.get('b'));
    if (decoded) entry = { name: decoded.meta.name || t('view.title'), build: decoded.build };
  }
  if (!entry || !entry.build || !entry.build.w) {
    setTitle(t('view.notFound'));
    mount(el, html`<div class="container page"><h1>${t('view.title')}</h1><p class="empty">${t('view.notFound')}</p></div>`);
    return;
  }

  const build = sanitize(entry.build, data);
  const c = computeBuild(build, data);
  const isMine = id && await canEdit(id);
  setTitle(entry.name);

  mount(el, html`
    <div class="page-hero"><div class="container view-head">
      <div>
        <h1>${entry.name}</h1>
        <p class="badges">
          ${c.r.weapon ? html`<span class="badge">${raw(icon(c.r.weapon.k, { size: 14 }))} ${t(`weapon.${c.r.weapon.k}`)}</span>` : ''}
          ${entry.playstyle ? html`<span class="badge">${t(`style.${entry.playstyle}`)}</span>` : ''}
          ${rankBadge(c.rank)}${hrBadge(c.hr)}
          ${isMine ? html`<span class="badge badge-variant">${t('discover.yours')}</span>` : ''}
        </p>
        ${id ? html`<p class="card-meta">
          <span>${t('common.by', { name: entry.author || t('common.anonymous') })}</span>
          <span>${t('discover.views', { n: entry.views })}</span>
          <span>${new Date(entry.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString()}</span></p>` : ''}
      </div>
      <div class="card-actions" id="v-actions">
        ${id ? html`<button type="button" class="btn${entry.liked ? ' is-on' : ''}" data-like aria-pressed="${!!entry.liked}">${raw(icon('heart'))}<span>${t('discover.likes', { n: entry.likes })}</span></button>` : ''}
        ${cardActions({ build, name: entry.name, style: entry.playstyle, kind: c.r.weapon.k, communityId: id || null, favId: id || buildKey(build) }, { view: false })}
        ${isMine ? html`<a class="btn btn-sm" href="#/builder?edit=${id}">${raw(icon('edit', { size: 16 }))}${t('common.edit')}</a>
          <button type="button" class="btn btn-sm btn-danger" data-delete>${raw(icon('trash', { size: 16 }))}${t('common.delete')}</button>` : ''}
      </div>
    </div></div>
    <div class="container page">
      ${entry.description ? html`<section class="panel" aria-label="${t('publish.description')}"><p class="desc">${entry.description}</p></section>` : ''}
      <div class="section">${buildSheet(c, data, { key: buildKey(build) })}</div>
    </div>`);

  const hunter = mountHunter($('.render-slot', el), lookFor(c.r), { label: renderAlt(c) });
  bindChecklist(el);
  bindCardActions($('#v-actions', el));

  el.querySelector('[data-like]')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    try {
      const res = await likeBuild(id);
      btn.classList.toggle('is-on', res.liked);
      btn.setAttribute('aria-pressed', String(res.liked));
      btn.querySelector('span').textContent = t('discover.likes', { n: res.likes });
    } catch (ex) { toast(ex.message, 'error'); }
  });
  el.querySelector('[data-delete]')?.addEventListener('click', async () => {
    const v = await openDialog(html`<div class="dialog-body"><p>${t('publish.deleteConfirm')}</p>
      <div class="builder-actions"><button type="button" class="btn btn-danger" data-close="ok">${t('common.delete')}</button>
      <button type="button" class="btn" data-close="">${t('common.cancel')}</button></div></div>`, { label: t('common.delete'), onMount: d => d.classList.add('dialog-small') });
    if (v !== 'ok') return;
    try { await deleteBuild(id); toast(t('publish.deleted'), 'success'); location.hash = '#/discover'; }
    catch (ex) { toast(ex.message, 'error'); }
  });
  return { destroy: () => hunter.destroy() };
}
