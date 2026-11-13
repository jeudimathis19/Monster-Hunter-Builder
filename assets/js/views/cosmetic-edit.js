// Cosmetic outfit editor: appearance pieces, in-game style colors per piece, live 3D render.

import { html, raw, mount, toast, copyText, setTitle, $ } from '../ui.js';
import { t, ARMOR_KINDS, WEAPON_KINDS } from '../i18n.js';
import { icon } from '../icons.js';
import { drafts, favorites } from '../store.js';
import { decodeBuild } from '../codec.js';
import { computeBuild } from '../calc.js';
import { pieceColors, PALETTES, SKIN_TONES, randomColor, elementColor } from '../look.js';
import { mountHunter } from '../hunter3d.js';
import { rarity, hrBadge, rankBadge, slotLabel, materialsBlock, bindChecklist } from '../components.js';
import { getBuild } from '../api.js';
import { pickGear, pickerTitle } from './picker.js';
import { publishDialog } from './publish.js';
import { requireSignIn } from './shared.js';
import { lookInfo, lookAlt } from './cosmetic.js';
import { encodeBuild } from '../codec.js';

const SLOTS = [...ARMOR_KINDS, 'w'];

export async function render(el, { data, query }) {
  setTitle(t('cosmetic.editor'));
  let state = drafts.get('cosmetic') || { name: '', look: { w: null, a: {}, colors: {} } };
  const editId = query.get('edit');
  if (query.get('b')) {
    const d = decodeBuild(query.get('b'));
    if (d) state = { name: d.meta.name || '', look: { w: d.build.w, a: d.build.a, colors: d.build.colors || {} } };
  } else if (editId) {
    try {
      const remote = await getBuild(editId);
      state = { name: remote.name, look: remote.build, remote };
    } catch { /* keep draft */ }
  }
  state.look.colors = state.look.colors || {};

  mount(el, html`
    <div class="page-hero"><div class="container">
      <h1>${t('cosmetic.editor')}</h1><p>${t('cosmetic.lead')}</p>
    </div></div>
    <div class="container page">
      <div class="cos-layout">
        <div class="cos-render stack">
          <section class="panel" aria-labelledby="ce-render"><h2 id="ce-render" class="panel-title">${t('render.title')}</h2><div id="ce-3d"></div></section>
          <section class="panel" aria-labelledby="ce-unlock"><h2 id="ce-unlock" class="panel-title">${t('cosmetic.unlock')}</h2><div id="ce-unlock-body"></div></section>
        </div>
        <div class="stack">
          <section class="panel" aria-labelledby="ce-pieces">
            <h2 id="ce-pieces" class="panel-title">${t('cosmetic.pieces')}</h2>
            <label class="field"><span>${t('builder.name')}</span><input type="text" id="ce-name" maxlength="60" value="${state.name}" placeholder="${t('builder.namePh')}"></label>
            <ul class="slot-list" id="ce-slots"></ul>
          </section>
          <section class="panel" aria-labelledby="ce-colors">
            <h2 id="ce-colors" class="panel-title">${t('cosmetic.palette')}</h2>
            <div class="palette-row">${Object.entries(PALETTES).map(([k, cols]) => html`<button type="button" class="btn btn-sm palette-btn" data-palette="${k}">
              <i aria-hidden="true">${cols.map(c => html`<b style="background:${c}"></b>`)}</i>${t(`cosmetic.palette.${k}`)}</button>`)}</div>
            <div class="builder-actions section">
              <button type="button" class="btn btn-sm" data-act="random">${raw(icon('dice', { size: 16 }))}${t('cosmetic.randomize')}</button>
              <button type="button" class="btn btn-sm" data-act="resetColors">${t('cosmetic.reset')}</button>
            </div>
            <fieldset><legend>${t('cosmetic.skin')}</legend>
              <div class="swatches" id="ce-skin">${SKIN_TONES.map((c, i) => html`<button type="button" class="swatch" style="background:${c}" data-skin="${c}" aria-label="${t('cosmetic.skin')} ${i + 1}"></button>`)}</div>
            </fieldset>
            <p class="small muted">${t('cosmetic.note')}</p>
          </section>
          <section class="panel" aria-labelledby="ce-share">
            <h2 id="ce-share" class="panel-title">${t('common.share')}</h2>
            <div class="builder-actions">
              <button type="button" class="btn btn-primary" data-act="publish">${raw(icon('globe'))}${state.remote ? t('publish.update') : t('builder.publish')}</button>
              <button type="button" class="btn" data-act="fav">${raw(icon('heart'))}${t('builder.saveFav')}</button>
              <button type="button" class="btn" data-act="share">${raw(icon('share'))}${t('builder.share')}</button>
              <button type="button" class="btn btn-ghost btn-danger" data-act="reset">${raw(icon('trash'))}${t('builder.reset')}</button>
            </div>
          </section>
        </div>
      </div>
    </div>`);

  let info = lookInfo(state.look, data);
  const hunter = mountHunter($('#ce-3d', el), info.look, { label: lookAlt(info) });
  bindChecklist(el);
  const save = () => drafts.set('cosmetic', { name: state.name, look: state.look });

  const defaultsFor = slot => {
    if (slot === 'w') {
      const w = info.r.weapon;
      return { p: '#8c8a86', s: w ? elementColor(w.el) : '#c9c2b0' };
    }
    return pieceColors(info.r.armor[slot]);
  };

  const slotRow = slot => {
    const piece = slot === 'w' ? info.r.weapon : info.r.armor[slot];
    const col = { ...defaultsFor(slot), ...(state.look.colors[slot] || {}) };
    const iconName = slot === 'w' ? (piece ? piece.k : 'sword') : slot;
    return html`<li class="slot-card">
      <span class="gear-icon${piece ? ` r${piece.r}` : ''}">${raw(icon(iconName, { size: 22 }))}</span>
      <div class="slot-card-main">
        <span class="gear-slot">${slotLabel(slot)}</span>
        <span class="gear-name">${piece ? piece.n : t('builder.empty')}</span>
        ${piece ? html`<span class="badges">${rarity(piece.r)}${rankBadge(piece.rk)}${hrBadge(piece.hr)}</span>` : ''}
      </div>
      <div class="slot-card-actions">
        <button type="button" class="btn btn-sm" data-pick="${slot}">${piece ? t('builder.change') : t('builder.pick')}<span class="sr-only"> : ${slotLabel(slot)}</span></button>
        ${piece ? html`<button type="button" class="btn btn-sm btn-ghost" data-clear="${slot}" aria-label="${t('builder.remove')} : ${slotLabel(slot)}">${raw(icon('x', { size: 16 }))}</button>` : ''}
      </div>
      ${piece ? html`<div class="slot-decos color-row">
        <label class="inline-list small">${t('cosmetic.primary')} <input type="color" data-color="${slot}" data-part="p" value="${col.p}" aria-label="${t('cosmetic.primary')} : ${slotLabel(slot)}"></label>
        <label class="inline-list small">${t('cosmetic.secondary')} <input type="color" data-color="${slot}" data-part="s" value="${col.s}" aria-label="${t('cosmetic.secondary')} : ${slotLabel(slot)}"></label>
      </div>` : ''}
    </li>`;
  };

  const unlockBlock = () => {
    const c = computeBuild({ w: state.look.w, a: state.look.a, c: null, d: {} }, data);
    return html`<div class="req-main">
        <div class="req-item"><span class="req-label">${t('hr.required')}</span><span class="req-value">${t('hr.min', { n: info.hr })}</span></div>
        <div class="req-item"><span class="req-label">${t('db.rank')}</span><span class="req-value">${t(`rank.${info.rank}`)}</span></div>
        <div class="req-item"><span class="req-label">${t('stat.cost')}</span><span class="req-value">${c.zenny.toLocaleString()} z</span></div>
      </div>
      <div class="section">${materialsBlock(c, data, `look-${encodeBuild({ w: state.look.w, a: state.look.a })}`)}</div>`;
  };

  const refresh = (full = true) => {
    info = lookInfo(state.look, data);
    if (full) {
      mount($('#ce-slots', el), html`${SLOTS.map(slotRow)}`);
      mount($('#ce-unlock-body', el), unlockBlock());
    }
    hunter.update(info.look, lookAlt(info));
    const skin = (state.look.colors.skin && state.look.colors.skin.p) || SKIN_TONES[1];
    el.querySelectorAll('[data-skin]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.skin === skin)));
    save();
  };

  el.addEventListener('input', e => {
    const input = e.target.closest('[data-color]');
    if (input) {
      const slot = input.dataset.color;
      state.look.colors[slot] = { ...defaultsFor(slot), ...(state.look.colors[slot] || {}), [input.dataset.part]: input.value };
      refresh(false);
    }
    if (e.target.id === 'ce-name') { state.name = e.target.value; save(); }
  });

  el.addEventListener('click', async e => {
    const pick = e.target.closest('[data-pick]');
    const clear = e.target.closest('[data-clear]');
    const pal = e.target.closest('[data-palette]');
    const skin = e.target.closest('[data-skin]');
    const act = e.target.closest('[data-act]');
    if (pick) {
      const slot = pick.dataset.pick;
      const list = slot === 'w' ? WEAPON_KINDS.flatMap(k => data.weaponsByKind.get(k) || []) : data.armorByKind.get(slot) || [];
      const current = slot === 'w' ? state.look.w : state.look.a[slot];
      const id = await pickGear({ slot, list, current, data, title: pickerTitle(slot) });
      if (id === undefined) return;
      if (slot === 'w') state.look.w = id; else if (id) state.look.a[slot] = id; else delete state.look.a[slot];
      delete state.look.colors[slot];
      refresh();
      el.querySelector(`[data-pick="${slot}"]`)?.focus();
    }
    if (clear) {
      const slot = clear.dataset.clear;
      if (slot === 'w') state.look.w = null; else delete state.look.a[slot];
      delete state.look.colors[slot];
      refresh();
      el.querySelector(`[data-pick="${slot}"]`)?.focus();
    }
    if (pal) {
      const cols = PALETTES[pal.dataset.palette];
      SLOTS.forEach((slot, i) => { state.look.colors[slot] = { p: cols[i % cols.length], s: cols[(i + 2) % cols.length] }; });
      refresh();
    }
    if (skin) { state.look.colors.skin = { p: skin.dataset.skin }; refresh(false); }
    if (act) {
      const name = act.dataset.act;
      const label = state.name || t('builder.namePh');
      if (name === 'random') { SLOTS.forEach(slot => { state.look.colors[slot] = { p: randomColor(), s: randomColor() }; }); refresh(); }
      if (name === 'resetColors') { const skinC = state.look.colors.skin; state.look.colors = skinC ? { skin: skinC } : {}; refresh(); }
      if (name === 'reset') { state = { name: '', look: { w: null, a: {}, colors: {} } }; $('#ce-name', el).value = ''; refresh(); }
      if (name === 'share') {
        const url = `${location.href.split('#')[0]}#/cosmetic/edit?b=${encodeURIComponent(encodeBuild(state.look, { name: state.name }))}`;
        if (await copyText(url)) toast(t('common.copied'), 'success');
      }
      if (name === 'fav') {
        if (!requireSignIn('acc.need.fav')) return;
        favorites.add({ id: `look:${encodeBuild(state.look)}`, name: label, build: state.look, type: 'cosmetic', style: 'custom' });
        toast(t('card.favAdded'), 'success');
      }
      if (name === 'publish') {
        if (!Object.keys(state.look.a).length) { toast(t('cosmetic.pieces'), 'error'); return; }
        const id = await publishDialog({ type: 'cosmetic', build: state.look, name: label, editId: state.remote ? editId : null, existing: state.remote || {} });
        if (id) location.hash = `#/cosmetic/${id}`;
      }
    }
  });

  refresh();
  return { destroy: () => hunter.destroy() };
}
