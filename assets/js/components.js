// Reusable UI blocks: badges, build cards, 2D silhouette, detailed build sheet.

import { html, raw, num } from './ui.js';
import { t, ARMOR_KINDS, rankLabel, getLang } from './i18n.js';
import { icon } from './icons.js';
import { lookFor } from './look.js';
import { weaponPath } from './calc.js';
import { checklist } from './store.js';

export const rarity = r => html`<span class="badge rarity r${r}" title="${t('rarity', { n: r })}">${t('rarity', { n: r })}</span>`;
export const hrBadge = n => html`<span class="badge badge-hr" title="${t('hr.required')} — ${t('hr.estimate')}">${t('hr.min', { n })}</span>`;
export const rankBadge = rk => html`<span class="badge badge-rank ${rk === 'h' || rk === 'high' ? 'is-high' : 'is-low'}">${rankLabel(rk)}</span>`;
export const zenny = z => html`<span class="zenny">${icon('coin', { size: 16 })} ${num(z)}&nbsp;${t('zenny')}</span>`;
export const elementTag = (el, value, hidden) => el
  ? html`<span class="el el-${el}${hidden ? ' is-hidden' : ''}">${t(`el.${el}`)} ${value ? num(value) : ''}${hidden ? ' (?)' : ''}</span>`
  : '';
export const slotsTag = slots => (slots && slots.length
  ? html`<span class="slots" aria-label="${t('stat.slots')}: ${slots.join(', ')}">${slots.map(s => html`<span class="slot s${s}" aria-hidden="true">${s}</span>`)}</span>`
  : html`<span class="muted">${t('builder.noSlots')}</span>`);

const LABEL = { w: 'kind.weapon', charm: 'kind.charm' };
export const slotLabel = k => t(LABEL[k] || `kind.${k}`);

/** Sharpness bar (values in game units, 7 colors). */
export function sharpnessBar(sh) {
  if (!sh) return '';
  const total = sh.reduce((a, b) => a + b, 0) || 1;
  const names = ['red', 'orange', 'yellow', 'green', 'blue', 'white', 'purple'];
  return html`<span class="sharp" role="img" aria-label="${t('stat.sharpness')}: ${sh.map((v, i) => v ? `${names[i]} ${v}` : '').filter(Boolean).join(', ')}">
    ${sh.map((v, i) => (v ? html`<span class="sh-${names[i]}" style="flex-grow:${v / total}"></span>` : ''))}</span>`;
}

/** Simple 2D front silhouette, used on cards (cheap to render in lists). */
export function hunter2d(look, { size = 120 } = {}) {
  const P = k => look.parts[k];
  const c = (k, f = 'p') => (P(k) && P(k).piece ? P(k)[f] : '#3a332d');
  const w = look.weapon;
  const weapon = w ? `<path d="M20 30 L100 132" stroke="${w.p}" stroke-width="7" stroke-linecap="round"/><path d="M20 30 L40 56" stroke="${w.s}" stroke-width="7" stroke-linecap="round"/>` : '';
  return raw(`<svg class="h2d" viewBox="0 0 120 170" width="${size}" height="${Math.round(size * 1.42)}" aria-hidden="true" focusable="false">
    <ellipse cx="60" cy="164" rx="34" ry="5" class="h2d-shadow"/>
    ${weapon}
    <rect x="47" y="10" width="26" height="28" rx="8" fill="${c('head')}"/><rect x="51" y="22" width="18" height="8" rx="2" fill="#1d1714"/>
    <rect x="44" y="12" width="32" height="5" rx="2" fill="${c('head', 's')}"/>
    <rect x="38" y="42" width="44" height="46" rx="6" fill="${c('chest')}"/><rect x="48" y="50" width="24" height="16" rx="3" fill="${c('chest', 's')}"/>
    <rect x="27" y="42" width="15" height="12" rx="4" fill="${c('chest', 's')}"/><rect x="78" y="42" width="15" height="12" rx="4" fill="${c('chest', 's')}"/>
    <rect x="28" y="55" width="12" height="40" rx="4" fill="${c('arms')}"/><rect x="80" y="55" width="12" height="40" rx="4" fill="${c('arms')}"/>
    <rect x="28" y="84" width="12" height="7" fill="${c('arms', 's')}"/><rect x="80" y="84" width="12" height="7" fill="${c('arms', 's')}"/>
    <rect x="37" y="88" width="46" height="14" rx="3" fill="${c('waist')}"/><rect x="55" y="90" width="10" height="10" rx="2" fill="${c('waist', 's')}"/>
    <rect x="41" y="102" width="16" height="54" rx="4" fill="${c('legs')}"/><rect x="63" y="102" width="16" height="54" rx="4" fill="${c('legs')}"/>
    <rect x="41" y="128" width="16" height="6" fill="${c('legs', 's')}"/><rect x="63" y="128" width="16" height="6" fill="${c('legs', 's')}"/>
  </svg>`);
}

/** Top skills as compact chips. */
export function skillChips(skills, limit = 6) {
  return html`<ul class="chips">${skills.slice(0, limit).map(s => html`<li class="chip${s.level >= s.max ? ' is-max' : ''}">${s.skill.n} <b>${s.level}</b></li>`)}</ul>`;
}

/**
 * Build card used by the generator, featured list, discovery and favorites.
 * entry: { id, title, subtitle, tags: [], build, c (computed), href, actions }
 */
export function buildCard({ id, title, subtitle, tags = [], c, actions = '', footer = '' }) {
  const look = lookFor(c.r);
  const w = c.r.weapon;
  return html`<article class="card build-card" data-id="${id}">
    <div class="build-card-art">${hunter2d(look, { size: 96 })}</div>
    <div class="build-card-body">
      <header class="build-card-head">
        <h3 class="build-card-title">${title}</h3>
        ${subtitle ? html`<p class="build-card-sub">${subtitle}</p>` : ''}
        <div class="badges">${tags}${rankBadge(c.rank)}${hrBadge(c.hr)}</div>
      </header>
      ${w ? html`<p class="build-card-weapon">${raw(icon(w.k, { size: 18 }))}<span>${w.n}</span> ${rarity(w.r)}</p>` : ''}
      <dl class="mini-stats">
        <div><dt>${t('stat.attack')}</dt><dd>${num(c.stats.attack)}</dd></div>
        <div><dt>${t('stat.affinity')}</dt><dd>${c.stats.affinity}%</dd></div>
        <div><dt>${t('stat.defenseMax')}</dt><dd>${num(c.stats.defMax)}</dd></div>
        <div><dt>${t('stat.cost')}</dt><dd>${num(c.zenny)}&nbsp;z</dd></div>
      </dl>
      ${skillChips(c.skills)}
      ${c.bonuses.filter(b => b.active).length ? html`<p class="bonus-line">${c.bonuses.filter(b => b.active).map(b => html`<span class="chip chip-bonus">${b.skill.n}${b.active.n ? ` · ${b.active.n}` : ''}</span>`)}</p>` : ''}
      ${footer}
      <div class="card-actions">${actions}</div>
    </div>
  </article>`;
}

function pieceRow(slot, piece, decos, data) {
  if (!piece) {
    return html`<li class="gear-row is-empty"><span class="gear-icon">${raw(icon(slot === 'w' ? 'sword' : slot, { size: 22 }))}</span>
      <div><span class="gear-slot">${slotLabel(slot)}</span><span class="muted">${t('builder.empty')}</span></div></li>`;
  }
  const skills = piece.sk.map(([id, lv]) => { const s = data.skillById.get(id); return s ? `${s.n} ${lv}` : ''; }).filter(Boolean);
  const set = piece.ss || piece.gs ? [piece.ss, piece.gs].map(id => id && data.skillById.get(id)).filter(Boolean).map(s => s.n) : [];
  return html`<li class="gear-row">
    <span class="gear-icon r${piece.r}">${raw(icon(slot === 'w' ? piece.k : slot === 'charm' ? 'charm' : slot, { size: 22 }))}</span>
    <div class="gear-main">
      <span class="gear-slot">${slotLabel(slot)}</span>
      <span class="gear-name">${piece.n}</span>
      <span class="badges">${rarity(piece.r)}${hrBadge(piece.hr)}</span>
      ${skills.length ? html`<span class="gear-skills">${skills.join(' · ')}</span>` : ''}
      ${set.length ? html`<span class="gear-skills gear-set">${set.join(' · ')}</span>` : ''}
      ${decos && decos.length ? html`<span class="gear-decos">${decos.map((d, i) => html`<span class="deco${d ? '' : ' is-empty'}">${raw(icon('deco', { size: 14 }))}${d ? d.n : t('builder.slotEmpty', { n: i + 1 })}</span>`)}</span>` : ''}
    </div>
  </li>`;
}

/** Piece-by-piece gear list. */
export function gearList(c, data) {
  const r = c.r;
  return html`<ul class="gear-list">
    ${pieceRow('w', r.weapon, r.decos.w, data)}
    ${ARMOR_KINDS.map(k => pieceRow(k, r.armor[k], r.decos[k], data))}
    ${pieceRow('charm', r.charm, null, data)}
  </ul>`;
}

export function skillTable(c) {
  if (!c.skills.length) return html`<p class="muted">${t('common.empty')}</p>`;
  return html`<table class="table skills-table">
    <caption class="sr-only">${t('stat.skills')}</caption>
    <thead><tr><th scope="col">${t('db.skills')}</th><th scope="col">${t('db.level')}</th><th scope="col">${t('db.details')}</th></tr></thead>
    <tbody>${c.skills.map(s => html`<tr>
      <th scope="row">${s.skill.n}</th>
      <td><span class="pips" role="img" aria-label="${s.level} / ${s.max}">${Array.from({ length: s.max }, (_, i) => html`<i class="${i < s.level ? 'on' : ''}"></i>`)}</span>
        ${s.over ? html`<span class="badge badge-warn" title="${t('builder.overcap')}">+${s.points - s.max}</span>` : ''}</td>
      <td class="small">${s.rank && s.rank.d ? s.rank.d : (s.skill.d || '')}</td>
    </tr>`)}</tbody></table>`;
}

export function bonusTable(c) {
  if (!c.bonuses.length) return '';
  return html`<ul class="bonus-list">${c.bonuses.map(b => html`<li class="${b.active ? 'is-active' : ''}">
    <strong>${b.skill.n}</strong> <span class="badge">${b.skill.k === 'set' ? t('stat.setBonus') : t('stat.groupBonus')}</span>
    <span class="muted">${t('builder.piecesOk', { n: b.pieces })}</span>
    ${b.active ? html`<p>${b.active.n ? html`<b>${b.active.n}</b> — ` : ''}${b.active.d || ''}</p>` : ''}
    ${b.next ? html`<p class="small muted">${b.next.p} → ${b.next.n || ''} ${b.next.d || ''}</p>` : ''}
  </li>`)}</ul>`;
}

export function statsBlock(c) {
  const s = c.stats;
  const resNames = ['fire', 'water', 'thunder', 'ice', 'dragon'];
  return html`<dl class="stats-grid">
    <div><dt>${t('stat.attack')}</dt><dd>${num(s.attack)} <small class="muted">(${t('stat.raw')} ${num(s.raw)})</small></dd></div>
    <div><dt>${t('stat.affinity')}</dt><dd>${s.affinity}%</dd></div>
    <div><dt>${t('stat.element')}</dt><dd>${s.element ? elementTag(s.element.type, s.element.value, s.element.hidden) : t('common.none')}</dd></div>
    <div><dt>${t('stat.defense')}</dt><dd>${num(s.defBase)} → ${num(s.defMax)}</dd></div>
    <div><dt>${t('stat.slots')}</dt><dd>${s.slotsUsed} / ${s.slotsTotal}</dd></div>
    ${s.sharpness ? html`<div class="span-2"><dt>${t('stat.sharpness')}</dt><dd>${sharpnessBar(s.sharpness)}</dd></div>` : ''}
    <div class="span-2"><dt>${t('stat.resistances')}</dt><dd class="res-list">${s.res.map((v, i) => html`<span class="el el-${resNames[i]}">${t(`el.${resNames[i]}`)} <b>${v > 0 ? '+' : ''}${v}</b></span>`)}</dd></div>
  </dl>`;
}

/** Requirements: HR, rank, total cost and the crafting steps. */
export function requirementsBlock(c, data) {
  const path = c.r.weapon ? weaponPath(c.r.weapon, data) : [];
  return html`<div class="req">
    <div class="req-main">
      <div class="req-item"><span class="req-label">${t('hr.required')}</span><span class="req-value">${t('hr.min', { n: c.hr })}</span></div>
      <div class="req-item"><span class="req-label">${t('db.rank')}</span><span class="req-value">${rankLabel(c.rank)}</span></div>
      <div class="req-item"><span class="req-label">${t('stat.cost')}</span><span class="req-value">${num(c.zenny)} z</span></div>
    </div>
    <p class="small muted">${t('hr.estimate')}</p>
    ${path.length > 1 ? html`<p class="path"><span class="req-label">${t('builder.weaponPath')}</span>
      <span class="path-steps">${path.map((w, i) => html`${i ? raw('<span aria-hidden="true">→</span>') : ''}<span class="path-step">${w.n} <small>${num(w.z)} z</small></span>`)}</span></p>` : ''}
  </div>`;
}

/** Materials with drop sources and a persisted checklist. */
export function materialsBlock(c, data, key) {
  if (!c.materials.length) return html`<p class="muted">${t('common.empty')}</p>`;
  const done = key ? checklist.get(key) : {};
  const sources = item => {
    const src = (data.sources[item.id] || []).filter(([, rk]) => (c.rank === 'high' ? rk === 'h' : rk === 'l'));
    const list = (src.length ? src : data.sources[item.id] || []).map(([id]) => data.monsterById.get(id)).filter(m => m && m.k === 'large');
    const uniq = [...new Map(list.map(m => [m.id, m])).values()];
    return uniq.length ? uniq.slice(0, 4).map(m => m.n).join(', ') + (uniq.length > 4 ? '…' : '') : t('builder.noDrop');
  };
  return html`<p class="small muted">${t('builder.checklistHint')}</p>
  <table class="table mats-table" data-check="${key || ''}">
    <caption class="sr-only">${t('stat.materials')}</caption>
    <thead><tr><th scope="col"><span class="sr-only">✓</span></th><th scope="col">${t('db.name')}</th><th scope="col">×</th><th scope="col">${t('builder.dropFrom')}</th></tr></thead>
    <tbody>${c.materials.map(m => {
      const id = `m-${key || 'x'}-${m.item.id}`.replace(/[^\w-]/g, '');
      return html`<tr class="${done[m.item.id] ? 'is-done' : ''}">
      <td><input type="checkbox" id="${id}" data-item="${m.item.id}" ${done[m.item.id] ? raw('checked') : ''}></td>
      <th scope="row"><label for="${id}"><span class="badge rarity r${m.item.r}" aria-hidden="true">${m.item.r}</span> ${m.item.n}</label></th>
      <td class="num">${m.qty}</td>
      <td class="small">${sources(m.item)}</td>
    </tr>`;
    })}</tbody>
  </table>`;
}

export function monstersBlock(c) {
  if (!c.monsters.length) return '';
  return html`<ul class="monster-list">${c.monsters.slice(0, 10).map(m => html`<li>
    <strong>${m.monster.n}</strong> <span class="muted small">${t('hr.min', { n: m.monster.hr })} · ${m.items.length} ${t('stat.materials').toLowerCase()}</span>
    <span class="weak">${m.monster.w.filter(([, lv]) => lv >= 2).slice(0, 3).map(([type]) => html`<span class="el el-${type}">${t(`el.${type}`)}</span>`)}</span>
  </li>`)}</ul>`;
}

/** Wires checkbox persistence for a materials table rendered by materialsBlock. */
export function bindChecklist(root) {
  root.addEventListener('change', e => {
    const box = e.target.closest('input[data-item]');
    const table = box && box.closest('[data-check]');
    if (!table || !table.dataset.check) return;
    const key = table.dataset.check;
    const state = checklist.get(key);
    if (box.checked) state[box.dataset.item] = 1; else delete state[box.dataset.item];
    checklist.set(key, state);
    box.closest('tr').classList.toggle('is-done', box.checked);
  });
}

/** Full detail sheet: requirements, stats, skills, bonuses, gear, materials, monsters. */
export function buildSheet(c, data, { key, renderSlot = true } = {}) {
  return html`<div class="sheet">
    ${renderSlot ? html`<section class="panel panel-render" aria-labelledby="sheet-render"><h3 id="sheet-render" class="panel-title">${t('render.title')}</h3><div class="render-slot"></div></section>` : ''}
    <section class="panel" aria-labelledby="sheet-req"><h3 id="sheet-req" class="panel-title">${t('view.requirements')}</h3>${requirementsBlock(c, data)}</section>
    <section class="panel" aria-labelledby="sheet-gear"><h3 id="sheet-gear" class="panel-title">${t('render.pieces')}</h3>${gearList(c, data)}</section>
    <section class="panel" aria-labelledby="sheet-stats"><h3 id="sheet-stats" class="panel-title">${t('view.overview')}</h3>${statsBlock(c)}</section>
    <section class="panel" aria-labelledby="sheet-skills"><h3 id="sheet-skills" class="panel-title">${t('stat.skills')}</h3>${skillTable(c)}${bonusTable(c)}</section>
    <section class="panel" aria-labelledby="sheet-mats"><h3 id="sheet-mats" class="panel-title">${t('builder.checklist')}</h3>${materialsBlock(c, data, key)}
      <p class="small muted">${t('builder.decoNote')}</p></section>
    ${c.monsters.length ? html`<section class="panel" aria-labelledby="sheet-mon"><h3 id="sheet-mon" class="panel-title">${t('stat.monsters')}</h3>${monstersBlock(c)}</section>` : ''}
  </div>`;
}

export function renderAlt(c) {
  const list = [c.r.weapon, ...ARMOR_KINDS.map(k => c.r.armor[k])].filter(Boolean).map(p => p.n);
  return t('render.alt', { list: list.join(', ') || t('common.none') });
}

export const langName = () => (getLang() === 'fr' ? 'fr' : 'en');
