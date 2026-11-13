// Community outfit page.

import { html, raw, mount, toast, openDialog, setTitle, $ } from '../ui.js';
import { t, ARMOR_KINDS } from '../i18n.js';
import { icon } from '../icons.js';
import { mountHunter } from '../hunter3d.js';
import { rarity, hrBadge, rankBadge, slotLabel } from '../components.js';
import { getBuild, likeBuild, deleteBuild, hasCommunity, canEdit } from '../api.js';
import { encodeBuild } from '../codec.js';
import { lookInfo, lookAlt } from './cosmetic.js';
import { cardActions, bindCardActions } from './shared.js';

export async function render(el, { data, params }) {
  const id = params[0];
  let entry = null;
  if (hasCommunity()) { try { entry = await getBuild(id, true); } catch { entry = null; } }
  if (!entry || entry.type !== 'cosmetic') {
    setTitle(t('view.notFound'));
    mount(el, html`<div class="container page"><h1>${t('cosmetic.title')}</h1><p class="empty">${t('view.notFound')}</p></div>`);
    return;
  }
  setTitle(entry.name);
  const info = lookInfo(entry.build, data);
  const mine = await canEdit(id);
  const copyHref = `#/cosmetic/edit?b=${encodeURIComponent(encodeBuild(entry.build, { name: entry.name }))}`;
  const colors = entry.build.colors || {};

  mount(el, html`
    <div class="page-hero"><div class="container view-head">
      <div>
        <h1>${entry.name}</h1>
        <p class="badges">${rankBadge(info.rank)}${hrBadge(info.hr)}${mine ? html`<span class="badge badge-variant">${t('discover.yours')}</span>` : ''}</p>
        <p class="card-meta"><span>${t('common.by', { name: entry.author || t('common.anonymous') })}</span><span>${t('discover.views', { n: entry.views })}</span></p>
      </div>
      <div class="card-actions" id="cv-actions">
        <button type="button" class="btn${entry.liked ? ' is-on' : ''}" data-like aria-pressed="${!!entry.liked}">${raw(icon('heart'))}<span>${t('discover.likes', { n: entry.likes })}</span></button>
        <a class="btn btn-sm" href="${mine ? `#/cosmetic/edit?edit=${id}` : copyHref}">${raw(icon('edit', { size: 16 }))}${t('common.edit')}</a>
        ${cardActions({ build: entry.build, name: entry.name, communityId: id, type: 'cosmetic' }, { view: false, edit: false })}
        ${mine ? html`<button type="button" class="btn btn-sm btn-danger" data-delete>${raw(icon('trash', { size: 16 }))}${t('common.delete')}</button>` : ''}
      </div>
    </div></div>
    <div class="container page">
      <div class="cos-layout">
        <section class="panel" aria-labelledby="cv-r"><h2 id="cv-r" class="panel-title">${t('render.title')}</h2><div id="cv-3d"></div></section>
        <div class="stack">
          ${entry.description ? html`<section class="panel"><p class="desc">${entry.description}</p></section>` : ''}
          <section class="panel" aria-labelledby="cv-p"><h2 id="cv-p" class="panel-title">${t('cosmetic.pieces')}</h2>
            <ul class="gear-list">${[...ARMOR_KINDS, 'w'].map(k => {
              const p = k === 'w' ? info.r.weapon : info.r.armor[k];
              if (!p) return '';
              const col = info.look.parts[k] || (k === 'w' ? info.look.weapon : null);
              return html`<li class="gear-row"><span class="gear-icon r${p.r}">${raw(icon(k === 'w' ? p.k : k, { size: 22 }))}</span>
                <div class="gear-main"><span class="gear-slot">${slotLabel(k)}</span><span class="gear-name">${p.n}</span>
                <span class="badges">${rarity(p.r)}${hrBadge(p.hr)}</span>
                ${col ? html`<span class="inline-list small">${t('cosmetic.primary')} <span class="swatch" style="width:20px;height:20px;background:${(colors[k] && colors[k].p) || col.p}" aria-hidden="true"></span>
                  ${t('cosmetic.secondary')} <span class="swatch" style="width:20px;height:20px;background:${(colors[k] && colors[k].s) || col.s}" aria-hidden="true"></span></span>` : ''}
                </div></li>`;
            })}</ul></section>
        </div>
      </div>
    </div>`);

  const hunter = mountHunter($('#cv-3d', el), info.look, { label: lookAlt(info) });
  bindCardActions($('#cv-actions', el));
  el.querySelector('[data-like]').addEventListener('click', async e => {
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
    try { await deleteBuild(id); toast(t('publish.deleted'), 'success'); location.hash = '#/cosmetic'; }
    catch (ex) { toast(ex.message, 'error'); }
  });
  return { destroy: () => hunter.destroy() };
}
