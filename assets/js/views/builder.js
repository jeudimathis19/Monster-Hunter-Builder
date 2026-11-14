// Custom build creator.

import { html, raw, mount, num, toast, copyText, openDialog, setTitle, $ } from '../ui.js';
import { t, WEAPON_KINDS, ARMOR_KINDS } from '../i18n.js';
import { icon } from '../icons.js';
import { drafts, favorites } from '../store.js';
import { computeBuild, sanitize, emptyBuild, buildKey } from '../calc.js';
import { decodeBuild, parseImport } from '../codec.js';
import { lookFor } from '../look.js';
import { mountHunter } from '../hunter3d.js';
import {
  rarity, hrBadge, rankBadge, elementTag, slotsTag, slotLabel, requirementsBlock, statsBlock,
  skillTable, bonusTable, materialsBlock, monstersBlock, bindChecklist, renderAlt
} from '../components.js';
import { pickGear, pickerTitle } from './picker.js';
import { publishDialog } from './publish.js';
import { shareUrl, requireSignIn, signInGate } from './shared.js';
import { getBuild, canEdit } from '../api.js';

export async function render(el, { data, query }) {
  setTitle(t('builder.title'));
  if (signInGate(el, { title: t('builder.title'), reasonKey: 'acc.need.create' })) return;
  // Editing a published build is for its author only; others are sent back to it.
  if (query.get('edit') && !(await canEdit(query.get('edit')))) {
    toast(t('acc.need.owner'), 'error');
    location.replace(`#/build/${query.get('edit')}`);
    return;
  }
  let state = drafts.get('builder') || { name: '', kind: 'long-sword', build: emptyBuild() };
  const editId = query.get('edit');
  if (query.get('b')) {
    const decoded = decodeBuild(query.get('b'));
    if (decoded) state = { name: decoded.meta.name || '', kind: null, build: decoded.build };
  } else if (editId) {
    try {
      const remote = await getBuild(editId);
      state = { name: remote.name, kind: remote.weaponKind, build: remote.build, remote };
    } catch { /* keep draft */ }
  }
  state.build = sanitize(state.build, data);
  if (state.build.w) state.kind = data.weaponById.get(state.build.w).k;
  if (!WEAPON_KINDS.includes(state.kind)) state.kind = 'long-sword';

  mount(el, html`
    <div class="page-hero"><div class="container">
      <h1>${t('builder.title')}</h1><p>${t('builder.lead')}</p>
    </div></div>
    <div class="container page">
      <div class="builder-layout">
        <div class="stack">
          <section class="panel" aria-labelledby="b-gear">
            <h2 id="b-gear" class="panel-title">${t('view.gear')}</h2>
            <div class="form-grid">
              <label class="field"><span>${t('builder.name')}</span><input type="text" id="b-name" maxlength="60" placeholder="${t('builder.namePh')}" value="${state.name}"></label>
              <label class="field"><span>${t('builder.weaponKind')}</span><select id="b-kind">${WEAPON_KINDS.map(k => html`<option value="${k}" ${k === state.kind ? raw('selected') : ''}>${t(`weapon.${k}`)}</option>`)}</select></label>
            </div>
            <ul class="slot-list" id="b-slots"></ul>
          </section>
          <section class="panel" aria-labelledby="b-actions-t">
            <h2 id="b-actions-t" class="panel-title">${t('common.share')}</h2>
            <div class="builder-actions">
              <button type="button" class="btn btn-primary" data-act="publish">${raw(icon('globe'))}${state.remote ? t('publish.update') : t('builder.publish')}</button>
              <button type="button" class="btn" data-act="fav">${raw(icon('heart'))}${t('builder.saveFav')}</button>
              <button type="button" class="btn" data-act="share">${raw(icon('share'))}${t('builder.share')}</button>
              <button type="button" class="btn" data-act="export">${raw(icon('list'))}${t('builder.export')}</button>
              <button type="button" class="btn" data-act="import">${t('builder.import')}</button>
              <button type="button" class="btn btn-ghost btn-danger" data-act="reset">${raw(icon('trash'))}${t('builder.reset')}</button>
            </div>
          </section>
          <section class="panel" aria-labelledby="b-skills"><h2 id="b-skills" class="panel-title">${t('stat.skills')}</h2><div id="b-skill-body"></div></section>
          <section class="panel" aria-labelledby="b-mats"><h2 id="b-mats" class="panel-title">${t('builder.checklist')}</h2><div id="b-mats-body"></div>
            <p class="small muted">${t('builder.decoNote')}</p></section>
          <section class="panel" aria-labelledby="b-mon"><h2 id="b-mon" class="panel-title">${t('stat.monsters')}</h2><div id="b-mon-body"></div></section>
        </div>
        <aside class="builder-side" aria-label="${t('view.summary')}">
          <section class="panel" aria-labelledby="b-render"><h2 id="b-render" class="panel-title">${t('render.title')}</h2><div id="b-3d"></div></section>
          <section class="panel" aria-labelledby="b-req"><h2 id="b-req" class="panel-title">${t('view.requirements')}</h2><div id="b-req-body"></div></section>
          <section class="panel" aria-labelledby="b-stats"><h2 id="b-stats" class="panel-title">${t('view.overview')}</h2><div id="b-stats-body"></div></section>
        </aside>
      </div>
    </div>`);

  const slotsEl = $('#b-slots', el);
  let c = computeBuild(state.build, data);
  const hunter = mountHunter($('#b-3d', el), lookFor(c.r), { label: renderAlt(c) });
  bindChecklist(el);

  const save = () => drafts.set('builder', { name: state.name, kind: state.kind, build: state.build });

  const slotCard = (slot, piece) => {
    const decos = slot === 'charm' ? null : c.r.decos[slot] || [];
    const iconName = slot === 'w' ? (piece ? piece.k : state.kind) : slot === 'charm' ? 'charm' : slot;
    let meta = '';
    if (piece && slot === 'w') meta = html`<span class="pick-meta">${t('stat.attack')} <b>${num(piece.atk)}</b> · ${piece.aff}% ${elementTag(piece.el, piece.ev, piece.eh)} ${slotsTag(piece.s)}</span>`;
    else if (piece && slot !== 'charm') meta = html`<span class="pick-meta">${t('stat.defense')} ${piece.d[0]}→${piece.d[1]} ${slotsTag(piece.s)}</span>`;
    const skills = piece ? piece.sk.map(([id, lv]) => { const s = data.skillById.get(id); return s ? `${s.n} ${lv}` : ''; }).filter(Boolean).join(' · ') : '';
    return html`<li class="slot-card">
      <span class="gear-icon${piece ? ` r${piece.r}` : ''}">${raw(icon(iconName, { size: 22 }))}</span>
      <div class="slot-card-main">
        <span class="gear-slot">${slotLabel(slot)}</span>
        <span class="gear-name">${piece ? piece.n : t('builder.empty')}</span>
        ${piece ? html`<span class="badges">${rarity(piece.r)}${piece.rk ? rankBadge(piece.rk) : ''}${hrBadge(piece.hr)}</span>` : ''}
        ${meta}
        ${skills ? html`<span class="gear-skills">${skills}</span>` : ''}
      </div>
      <div class="slot-card-actions">
        <button type="button" class="btn btn-sm" data-pick="${slot}">${piece ? t('builder.change') : t('builder.pick')}<span class="sr-only"> : ${slotLabel(slot)}</span></button>
        ${piece ? html`<button type="button" class="btn btn-sm btn-ghost" data-clear="${slot}" aria-label="${t('builder.remove')} : ${slotLabel(slot)}">${raw(icon('x', { size: 16 }))}</button>` : ''}
      </div>
      ${decos && piece && piece.s.length ? html`<div class="slot-decos">${piece.s.map((size, i) => {
        const d = decos[i];
        return html`<button type="button" class="deco-btn${d ? ' has-deco' : ''}" data-deco="${slot}" data-index="${i}"
          aria-label="${t('builder.slot', { n: size })} : ${d ? d.n : t('builder.empty')}">
          <span class="slot s${size}" aria-hidden="true">${size}</span>${d ? d.n : t('builder.slotEmpty', { n: i + 1 })}</button>`;
      })}</div>` : ''}
    </li>`;
  };

  const refresh = () => {
    state.build = sanitize(state.build, data);
    c = computeBuild(state.build, data);
    mount(slotsEl, html`${slotCard('w', c.r.weapon)}${ARMOR_KINDS.map(k => slotCard(k, c.r.armor[k]))}${slotCard('charm', c.r.charm)}`);
    const key = buildKey(state.build);
    mount($('#b-req-body', el), requirementsBlock(c, data));
    mount($('#b-stats-body', el), statsBlock(c));
    mount($('#b-skill-body', el), html`${skillTable(c)}${bonusTable(c)}`);
    mount($('#b-mats-body', el), materialsBlock(c, data, key));
    mount($('#b-mon-body', el), c.monsters.length ? monstersBlock(c, data) : html`<p class="muted">${t('common.empty')}</p>`);
    hunter.update(lookFor(c.r), renderAlt(c));
    save();
  };

  const listFor = slot => {
    if (slot === 'w') return data.weaponsByKind.get(state.kind) || [];
    if (slot === 'charm') return data.charms;
    return data.armorByKind.get(slot) || [];
  };

  el.addEventListener('click', async e => {
    const pick = e.target.closest('[data-pick]');
    const clear = e.target.closest('[data-clear]');
    const deco = e.target.closest('[data-deco]');
    const act = e.target.closest('[data-act]');
    if (pick) {
      const slot = pick.dataset.pick;
      const current = slot === 'w' ? state.build.w : slot === 'charm' ? state.build.c : state.build.a[slot];
      const id = await pickGear({ slot, list: listFor(slot), current, data, title: pickerTitle(slot) });
      if (id === undefined) return;
      if (slot === 'w') { state.build.w = id; state.build.d.w = []; }
      else if (slot === 'charm') state.build.c = id;
      else { state.build.a[slot] = id; state.build.d[slot] = []; }
      refresh();
      el.querySelector(`[data-pick="${slot}"]`)?.focus();
    }
    if (clear) {
      const slot = clear.dataset.clear;
      if (slot === 'w') state.build.w = null; else if (slot === 'charm') state.build.c = null; else delete state.build.a[slot];
      delete state.build.d[slot];
      refresh();
      el.querySelector(`[data-pick="${slot}"]`)?.focus();
    }
    if (deco) {
      const slot = deco.dataset.deco, i = +deco.dataset.index;
      const size = c.r.slotsOf[slot][i];
      const kind = slot === 'w' ? 'weapon' : 'armor';
      const list = data.decorations.filter(d => d.k === kind && d.s <= size);
      const current = (state.build.d[slot] || [])[i] || null;
      const id = await pickGear({ slot: 'deco', list, current, data, title: `${pickerTitle('deco')} (${t('builder.slot', { n: size })})` });
      if (id === undefined) return;
      const arr = (state.build.d[slot] || c.r.slotsOf[slot].map(() => null)).slice();
      arr[i] = id;
      state.build.d[slot] = arr;
      refresh();
      el.querySelector(`[data-deco="${slot}"][data-index="${i}"]`)?.focus();
    }
    if (act) await action(act.dataset.act);
  });

  const action = async name => {
    const label = state.name || t('builder.namePh');
    if (name === 'share') { if (await copyText(shareUrl(state.build, state.name))) toast(t('common.copied'), 'success'); }
    if (name === 'fav') {
      if (!requireSignIn('acc.need.fav')) return;
      favorites.add({ id: buildKey(state.build), name: label, build: state.build, kind: state.kind, style: 'custom', type: 'build' });
      toast(t('card.favAdded'), 'success');
    }
    if (name === 'export') {
      const json = JSON.stringify({ name: label, build: state.build }, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${label.replace(/[^\w-]+/g, '_') || 'build'}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    if (name === 'import') {
      const v = await openDialog(html`<form method="dialog">
        <div class="dialog-head"><h2>${t('builder.import')}</h2><button type="button" class="btn btn-icon" data-close="" aria-label="${t('common.close')}">${raw(icon('x'))}</button></div>
        <div class="dialog-body form">
          <label class="field"><span>${t('builder.importPrompt')}</span><textarea name="code" required></textarea></label>
          <div class="builder-actions"><button class="btn btn-primary" value="ok">${t('builder.import')}</button></div>
        </div></form>`, {
        label: t('builder.import'),
        onMount(dlg) {
          dlg.classList.add('dialog-small');
          dlg.querySelector('form').addEventListener('submit', () => { importCode = dlg.querySelector('textarea').value; });
        }
      });
      if (v === 'ok') {
        const parsed = parseImport(importCode);
        if (!parsed || !parsed.build) { toast(t('builder.importError'), 'error'); return; }
        state.build = sanitize(parsed.build, data);
        if (parsed.meta && parsed.meta.name) { state.name = parsed.meta.name; $('#b-name', el).value = state.name; }
        if (state.build.w) { state.kind = data.weaponById.get(state.build.w).k; $('#b-kind', el).value = state.kind; }
        refresh();
      }
    }
    if (name === 'reset') {
      const v = await openDialog(html`<div class="dialog-body"><p>${t('builder.resetConfirm')}</p>
        <div class="builder-actions"><button type="button" class="btn btn-danger" data-close="ok">${t('builder.reset')}</button>
        <button type="button" class="btn" data-close="">${t('common.cancel')}</button></div></div>`, { label: t('builder.reset'), onMount: d => d.classList.add('dialog-small') });
      if (v === 'ok') { state.build = emptyBuild(); state.name = ''; $('#b-name', el).value = ''; refresh(); }
    }
    if (name === 'publish') {
      if (!state.build.w) { toast(t('publish.needWeapon'), 'error'); return; }
      const id = await publishDialog({ type: 'build', build: state.build, name: label, editId: state.remote ? editId : null, existing: state.remote || {} });
      if (id) location.hash = `#/build/${id}`;
    }
  };
  let importCode = '';

  $('#b-name', el).addEventListener('input', e => { state.name = e.target.value; save(); });
  $('#b-kind', el).addEventListener('change', e => {
    state.kind = e.target.value;
    if (state.build.w && data.weaponById.get(state.build.w).k !== state.kind) { state.build.w = null; delete state.build.d.w; }
    refresh();
  });

  refresh();
  return { destroy: () => hunter.destroy() };
}
