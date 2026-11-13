// Gear picker dialog (weapons, armor, charms, decorations) with search, rank, HR and skill filters.

import { html, raw, openDialog, num, debounce } from '../ui.js';
import { t, getLang } from '../i18n.js';
import { icon } from '../icons.js';
import { rarity, hrBadge, rankBadge, elementTag, slotsTag, slotLabel } from '../components.js';

const PAGE = 60;

function skillText(sk, data) {
  return sk.map(([id, lv]) => { const s = data.skillById.get(id); return s ? `${s.n} ${lv}` : ''; }).filter(Boolean).join(' · ');
}

function itemMeta(slot, x, data) {
  if (slot === 'w') {
    return html`<span>${t('stat.attack')} <b>${num(x.atk)}</b></span><span>${t('stat.affinity')} ${x.aff}%</span>
      ${elementTag(x.el, x.ev, x.eh)} ${slotsTag(x.s)} <span>${skillText(x.sk, data)}</span>`;
  }
  if (slot === 'deco') return html`<span>${skillText(x.sk, data)}</span>`;
  if (slot === 'charm') return html`<span>${skillText(x.sk, data)}</span>`;
  const set = [x.ss, x.gs].map(id => id && data.skillById.get(id)).filter(Boolean).map(s => s.n).join(' · ');
  return html`<span>${t('stat.defense')} <b>${x.d[0]}→${x.d[1]}</b></span> ${slotsTag(x.s)} <span>${skillText(x.sk, data)}</span>
    ${set ? html`<span class="gear-set">${set}</span>` : ''}`;
}

/**
 * @param {object} opts { slot: 'w'|'head'|...|'charm'|'deco', list, current, data, title, maxSlot }
 * @returns Promise<id|null|undefined>  id = picked, null = removed, undefined = cancelled
 */
export function pickGear({ slot, list, current, data, title, allowRemove = true }) {
  const skillIds = new Set();
  for (const x of list) for (const [id] of x.sk || []) skillIds.add(id);
  if (slot !== 'w' && slot !== 'deco' && slot !== 'charm') for (const x of list) { if (x.ss) skillIds.add(x.ss); if (x.gs) skillIds.add(x.gs); }
  const skills = [...skillIds].map(id => data.skillById.get(id)).filter(Boolean).sort((a, b) => a.n.localeCompare(b.n, getLang()));
  const isGear = slot !== 'deco';
  const sorts = slot === 'w' ? ['rarity', 'attack', 'name'] : slot === 'deco' || slot === 'charm' ? ['rarity', 'name'] : ['rarity', 'defense', 'name'];

  const body = html`
    <div class="dialog-head">
      <h2>${title}</h2>
      <button type="button" class="btn btn-icon" data-close="" aria-label="${t('common.close')}">${raw(icon('x'))}</button>
    </div>
    <div class="dialog-body">
      <form class="toolbar" data-filters>
        <label class="field field-search"><span>${t('common.search')}</span><input type="search" name="q" autocomplete="off"></label>
        ${isGear ? html`<label class="field"><span>${t('builder.filterRank')}</span><select name="rank">
          <option value="">${t('common.all')}</option><option value="l">${t('rank.low')}</option><option value="h">${t('rank.high')}</option></select></label>
          <label class="field"><span>${t('builder.maxHr')}</span><input type="number" name="hr" min="1" max="999" inputmode="numeric"></label>` : html`
          <label class="field"><span>${t('db.slot')}</span><select name="size"><option value="">${t('common.all')}</option>${[1, 2, 3].map(n => html`<option value="${n}">${n}</option>`)}</select></label>`}
        <label class="field"><span>${t('builder.picker.skill')}</span><select name="skill"><option value="">${t('common.all')}</option>${skills.map(s => html`<option value="${s.id}">${s.n}</option>`)}</select></label>
        <label class="field"><span>${t('builder.sort')}</span><select name="sort">${sorts.map(s => html`<option value="${s}">${t(`builder.sort.${s}`)}</option>`)}</select></label>
      </form>
      ${allowRemove && current ? html`<p><button type="button" class="btn btn-sm btn-danger" data-close="__remove">${raw(icon('trash', { size: 16 }))}${t('builder.remove')}</button></p>` : ''}
      <p class="pick-count" aria-live="polite"></p>
      <ul class="pick-list"></ul>
      <p class="pager"><button type="button" class="btn btn-sm" data-more hidden>${t('common.more')}</button></p>
    </div>`;

  return openDialog(body, {
    label: title,
    onMount(dlg) {
      const form = dlg.querySelector('[data-filters]');
      const ul = dlg.querySelector('.pick-list');
      const count = dlg.querySelector('.pick-count');
      const more = dlg.querySelector('[data-more]');
      let shown = PAGE, filtered = list;
      const apply = () => {
        const f = new FormData(form);
        const q = (f.get('q') || '').toString().trim().toLowerCase();
        const rank = f.get('rank'), hr = parseInt(f.get('hr'), 10), skill = +f.get('skill'), size = +f.get('size');
        filtered = list.filter(x =>
          (!q || x.n.toLowerCase().includes(q)) &&
          (!rank || x.rk === rank) &&
          (!hr || x.hr <= hr) &&
          (!size || x.s === size) &&
          (!skill || (x.sk || []).some(([id]) => id === skill) || x.ss === skill || x.gs === skill));
        const sort = f.get('sort');
        const key = {
          rarity: (a, b) => b.r - a.r || a.n.localeCompare(b.n),
          attack: (a, b) => b.atk - a.atk,
          defense: (a, b) => b.d[1] - a.d[1],
          name: (a, b) => a.n.localeCompare(b.n, getLang())
        }[sort] || (() => 0);
        filtered = [...filtered].sort(key);
        shown = PAGE;
        draw();
      };
      const draw = () => {
        count.textContent = t('common.results', { n: filtered.length });
        ul.innerHTML = filtered.slice(0, shown).map(x => String(html`<li>
          <button type="button" class="pick-item${x.id === current ? ' is-current' : ''}" data-close="${x.id}">
            <span class="pick-name">${slot === 'w' ? raw(icon(x.k, { size: 16 })) : ''} ${x.n}</span>
            <span class="badges">${rarity(x.r)}${x.rk ? rankBadge(x.rk) : ''}${x.hr ? hrBadge(x.hr) : ''}</span>
            <span class="pick-meta">${itemMeta(slot, x, data)}</span>
          </button></li>`)).join('');
        more.hidden = filtered.length <= shown;
      };
      form.addEventListener('submit', e => e.preventDefault());
      form.addEventListener('input', debounce(apply, 120));
      form.addEventListener('change', apply);
      more.addEventListener('click', () => { shown += PAGE; draw(); });
      apply();
      setTimeout(() => form.querySelector('input[type=search]').focus(), 30);
    }
  }).then(v => {
    if (v === '__remove') return null;
    if (!v) return undefined;
    return +v;
  });
}

export const pickerTitle = slot => t('builder.picker.title', { what: slot === 'deco' ? t('stat.decorations') : slotLabel(slot) });
