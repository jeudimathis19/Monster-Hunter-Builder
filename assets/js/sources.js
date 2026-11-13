// Where to get materials: monster drop rates, hunting zones, gathering maps and other sources.

import { html, raw } from './ui.js';
import { t, getLang, rankLabel } from './i18n.js';

const PARTS_FR = {
  'left-front-leg': 'Patte avant gauche', 'right-front-leg': 'Patte avant droite', 'head-hide': 'Peau de la tête',
  'left-wing-arm-hide': 'Peau du bras-aile gauche', 'right-wing-arm-hide': 'Peau du bras-aile droit', 'tail-hair': 'Poils de la queue',
  head: 'Tête', hide: 'Peau', 'left-nail': 'Griffe gauche', 'right-nail': 'Griffe droite', petal: 'Pétale', tail: 'Queue',
  'left-wing': 'Aile gauche', 'right-wing': 'Aile droite', antennae: 'Antennes', back: 'Dos', 'left-leg': 'Patte gauche',
  'right-leg': 'Patte droite', stomach: 'Ventre', 'left-wing-blade': 'Lame d’aile gauche', 'right-wing-blade': 'Lame d’aile droite',
  'dorsal-fin': 'Nageoire dorsale', 'left-front-arm': 'Bras avant gauche', 'right-front-arm': 'Bras avant droit', mouth: 'Gueule',
  'frozen-bigcore-after': 'Grand noyau gelé', 'frozen-core-waist': 'Noyau gelé (taille)', 'right-hind-leg': 'Patte arrière droite',
  'left-hind-leg': 'Patte arrière gauche', 'tail-tip': 'Bout de la queue', 'front-legs': 'Pattes avant', periscope: 'Périscope',
  chest: 'Poitrine', 'left-wing-legs': 'Pattes-ailes gauches', 'right-wing-legs': 'Pattes-ailes droites'
};

export function partLabel(part) {
  if (!part) return '';
  if (getLang() === 'fr' && PARTS_FR[part]) return PARTS_FR[part];
  const s = part.replace(/-/g, ' ');
  return s[0].toUpperCase() + s.slice(1);
}

// A 100 % target reward is a guaranteed reward of a special quest, not the usual rate.
const isSpecial = (kind, chance) => kind === 'target-reward' && chance >= 100;
export const dropKindLabel = (kind, chance = 0) => t(isSpecial(kind, chance) ? 'drop.target-reward-special' : `drop.${kind}`);
export const zoneNames = (ids, data) => (ids || []).map(id => data.locationById.get(id)).filter(Boolean).map(l => l.n);

/**
 * Structured sources of an item.
 * @param rank 'low' | 'high' | null — when set, only that rank's drops are kept (falls back to all).
 */
export function itemSources(itemId, data, rank = null) {
  const rk = rank ? rank[0] : null;
  let rows = data.drops[itemId] || [];
  if (rk && rows.some(r => r[1] === rk)) rows = rows.filter(r => r[1] === rk);
  const byMonster = new Map();
  for (const [monsterId, r, kindIdx, part, qty, chance] of rows) {
    const monster = data.monsterById.get(monsterId);
    if (!monster) continue;
    const key = `${monsterId}${r}`;
    if (!byMonster.has(key)) byMonster.set(key, { monster, rk: r, rows: [], best: null });
    const entry = byMonster.get(key);
    const kind = data.dropKinds[kindIdx];
    const row = { kind, part: part || null, qty, chance, special: isSpecial(kind, chance) };
    entry.rows.push(row);
  }
  for (const entry of byMonster.values()) {
    const regular = entry.rows.filter(r => !r.special);
    entry.best = (regular.length ? regular : entry.rows).reduce((a, b) => (b.chance > a.chance ? b : a));
  }
  const monsters = [...byMonster.values()].sort((a, b) => b.best.chance - a.best.chance);
  const gather = (data.gather[itemId] || []).map(id => data.locationById.get(id)).filter(Boolean);
  let other = (data.other[itemId] || []).map(([type, name, monsterId, r, method, chance]) => ({
    type, name: name || null, monster: monsterId ? data.monsterById.get(monsterId) : null, rk: r || null, method: method || null, chance: chance || null
  }));
  if (rk && other.some(o => o.type === 'small-monster' && o.rk === rk)) other = other.filter(o => o.type !== 'small-monster' || o.rk === rk || !o.rk);
  return { monsters, gather, other, empty: !monsters.length && !gather.length && !other.length };
}

const pct = n => `${n} %`;
const rowText = row => `${pct(row.chance)} · ${dropKindLabel(row.kind)}${row.part ? ` (${partLabel(row.part)})` : ''}${row.qty > 1 ? ` ×${row.qty}` : ''}`;

/** Label of a non-drop source. */
function otherLabel(o) {
  switch (o.type) {
    case 'small-monster': return `${o.name} — ${pct(o.chance)} · ${t(`drop.small.${o.method || 'drop'}`)}`;
    case 'tempered': return o.monster ? t('src.tempered.one', { name: o.monster.n }) : t('src.tempered');
    case 'arch-tempered': return o.monster ? t('src.arch-tempered', { name: o.monster.n }) : t('src.tempered');
    case 'frenzied': return t('src.frenzied');
    case 'arena': return t('src.arena');
    case 'event': return t('src.event');
    case 'quest': return o.name;
    default: return o.name || o.type;
  }
}

/** Compact one-cell summary used in the materials checklist. */
export function sourceSummary(itemId, data, rank) {
  const s = itemSources(itemId, data, rank);
  if (s.empty) return html`<span class="muted">${t('src.unknown')}</span>`;
  const lines = [];
  for (const m of s.monsters.slice(0, 2)) {
    const zones = zoneNames(m.monster.loc, data);
    lines.push(html`<span class="src-line"><a href="#/db/monsters/${m.monster.id}">${m.monster.n}</a> — <b>${pct(m.best.chance)}</b> ${dropKindLabel(m.best.kind, m.best.chance)}${m.best.part ? ` (${partLabel(m.best.part)})` : ''}
      ${zones.length ? html`<span class="src-zones">${zones.join(', ')}</span>` : ''}</span>`);
  }
  if (s.monsters.length > 2) lines.push(html`<span class="src-line muted">+${s.monsters.length - 2} ${t('db.monsters').toLowerCase()}</span>`);
  if (s.gather.length) lines.push(html`<span class="src-line">${t('src.gather')} <span class="src-zones">${s.gather.map(l => l.n).join(', ')}</span></span>`);
  if (!s.monsters.length) {
    const small = s.other.filter(o => o.type === 'small-monster').sort((a, b) => b.chance - a.chance);
    const names = [...new Set(small.map(o => o.name))];
    for (const name of names.slice(0, 2)) {
      const best = small.find(o => o.name === name);
      lines.push(html`<span class="src-line">${name} — <b>${pct(best.chance)}</b> ${t(`drop.small.${best.method || 'drop'}`)}</span>`);
    }
    if (names.length > 2) lines.push(html`<span class="src-line muted">+${names.length - 2} ${t('src.small').toLowerCase()}</span>`);
    const tempered = s.other.filter(o => o.type === 'tempered' || o.type === 'arch-tempered');
    if (tempered.length === 1) lines.push(html`<span class="src-line">${otherLabel(tempered[0])}</span>`);
    else if (tempered.length) lines.push(html`<span class="src-line">${t('src.tempered')}</span>`);
    for (const o of s.other.filter(x => ['frenzied', 'arena', 'event'].includes(x.type))) lines.push(html`<span class="src-line">${otherLabel(o)}</span>`);
    const quests = s.other.filter(o => o.type === 'quest');
    if (quests.length && lines.length < 2) lines.push(html`<span class="src-line">${t('src.quest')} : ${quests.slice(0, 2).map(q => q.name).join(', ')}${quests.length > 2 ? '…' : ''}</span>`);
  }
  return html`<span class="src">${lines}</span>`;
}

/** Full sources block for an item (encyclopedia). */
export function itemSourcesDetail(itemId, data) {
  const s = itemSources(itemId, data);
  if (s.empty) return html`<p class="small muted">${t('src.unknown')}</p>`;
  const small = s.other.filter(o => o.type === 'small-monster');
  const tempered = s.other.filter(o => o.type === 'tempered' || o.type === 'arch-tempered');
  const misc = s.other.filter(o => ['frenzied', 'arena', 'event'].includes(o.type));
  const quests = s.other.filter(o => o.type === 'quest');
  return html`
    ${s.gather.length ? html`<h3>${t('src.gather')}</h3><ul class="chips">${s.gather.map(l => html`<li class="chip chip-zone">${l.n}</li>`)}</ul>` : ''}
    ${s.monsters.length ? html`<h3>${t('src.dropTable')}</h3>
      <div class="table-wrap"><table class="table drop-table">
        <caption class="sr-only">${t('src.dropTable')}</caption>
        <thead><tr><th scope="col">${t('src.monster')}</th><th scope="col">${t('src.method')}</th><th scope="col" class="num">${t('src.chance')}</th></tr></thead>
        <tbody>${s.monsters.map(m => html`${m.rows.map((row, i) => html`<tr>
          ${i === 0 ? html`<th scope="rowgroup" rowspan="${m.rows.length}"><a href="#/db/monsters/${m.monster.id}">${m.monster.n}</a>
            <span class="badge badge-rank ${m.rk === 'h' ? 'is-high' : 'is-low'}">${rankLabel(m.rk, true)}</span>
            <span class="src-zones">${zoneNames(m.monster.loc, data).join(', ')}</span></th>` : ''}
          <td>${dropKindLabel(row.kind, row.chance)}${row.part ? html` <span class="muted">(${partLabel(row.part)})</span>` : ''}${row.qty > 1 ? ` ×${row.qty}` : ''}</td>
          <td class="num"><b>${pct(row.chance)}</b></td></tr>`)}`)}</tbody>
      </table></div>` : ''}
    ${small.length ? html`<h3>${t('src.small')}</h3><ul class="chips">${small.map(o => html`<li class="chip">${o.name}${o.rk ? html` <small>${rankLabel(o.rk, true)}</small>` : ''} — <b>${pct(o.chance)}</b> ${t(`drop.small.${o.method || 'drop'}`)}</li>`)}</ul>` : ''}
    ${tempered.length ? html`<h3>${t('src.tempered')}</h3><ul class="chips">${tempered.map(o => html`<li class="chip">${o.monster ? html`<a href="#/db/monsters/${o.monster.id}">${otherLabel(o)}</a>` : otherLabel(o)}</li>`)}</ul>` : ''}
    ${misc.length ? html`<ul class="chips">${misc.map(o => html`<li class="chip">${otherLabel(o)}</li>`)}</ul>` : ''}
    ${quests.length ? html`<h3>${t('src.quests')}</h3><ul class="chips">${quests.slice(0, 12).map(o => html`<li class="chip" lang="en">${o.name}</li>`)}</ul>` : ''}
    ${s.gather.length || small.length || quests.length ? html`<p class="small muted">${t('src.wiki')}</p>` : ''}`;
}

/** Drop table of a monster, per rank (encyclopedia). */
export function monsterDrops(monster, data) {
  const rows = [];
  for (const [itemId, list] of Object.entries(data.drops)) {
    const item = data.itemById.get(+itemId);
    if (!item) continue;
    for (const [monsterId, rk, kindIdx, part, qty, chance] of list) {
      if (monsterId === monster.id) rows.push({ item, rk, kind: data.dropKinds[kindIdx], part: part || null, qty, chance });
    }
  }
  if (!rows.length) return '';
  const table = rk => {
    const list = rows.filter(r => r.rk === rk);
    if (!list.length) return '';
    const byItem = new Map();
    for (const r of list) { if (!byItem.has(r.item.id)) byItem.set(r.item.id, []); byItem.get(r.item.id).push(r); }
    const groups = [...byItem.values()].sort((a, b) => b[0].item.r - a[0].item.r || a[0].item.n.localeCompare(b[0].item.n));
    return html`<h3>${t('db.drops')} — ${rankLabel(rk)}</h3>
      <div class="table-wrap"><table class="table drop-table">
        <caption class="sr-only">${t('db.drops')} — ${rankLabel(rk)}</caption>
        <thead><tr><th scope="col">${t('db.name')}</th><th scope="col">${t('src.method')}</th><th scope="col" class="num">${t('src.chance')}</th></tr></thead>
        <tbody>${groups.map(g => g.sort((a, b) => b.chance - a.chance).map((r, i) => html`<tr>
          ${i === 0 ? html`<th scope="rowgroup" rowspan="${g.length}"><a href="#/db/items/${r.item.id}">${r.item.n}</a></th>` : ''}
          <td>${dropKindLabel(r.kind, r.chance)}${r.part ? html` <span class="muted">(${partLabel(r.part)})</span>` : ''}${r.qty > 1 ? ` ×${r.qty}` : ''}</td>
          <td class="num"><b>${pct(r.chance)}</b></td></tr>`))}</tbody>
      </table></div>`;
  };
  return html`${table('h')}${table('l')}`;
}

export { rowText, raw as _raw };
