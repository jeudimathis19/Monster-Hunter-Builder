// Encyclopedia: browse every weapon, armor piece, set, decoration, charm, skill, material and monster.

import { html, raw, mount, num, debounce, setTitle, $ } from '../ui.js';
import { t, getLang, WEAPON_KINDS, ARMOR_KINDS, ELEMENTS, STATUSES } from '../i18n.js';
import { icon } from '../icons.js';
import { loadText } from '../data.js';
import { weaponPath, charmPath } from '../calc.js';
import { encodeBuild } from '../codec.js';
import { rarity, hrBadge, rankBadge, elementTag, slotsTag, sharpnessBar } from '../components.js';
import { itemSourcesDetail, monsterDrops, sourceSummary, zoneNames } from '../sources.js';

const CATS = ['weapons', 'armor', 'sets', 'decorations', 'charms', 'skills', 'items', 'monsters'];
const PAGE = 50;
// Weapon mechanic names (phials, shelling, coatings, ammo).
const tx = v => { const k = `x.${v}`; const r = t(k); return r === k ? v : r; };

const skillStr = (sk, data) => sk.map(([id, lv]) => { const s = data.skillById.get(id); return s ? `${s.n} ${lv}` : ''; }).filter(Boolean).join(' · ');
const matsList = (mats, data) => html`<ul class="chips">${mats.map(([id, q]) => {
  const it = data.itemById.get(id);
  return it ? html`<li class="chip"><a href="#/db/items/${id}">${it.n}</a> <b>×${q}</b></li>` : '';
})}</ul>`;
const builderLink = build => html`<a class="btn btn-sm btn-primary" href="#/builder?b=${encodeURIComponent(encodeBuild(build))}">${raw(icon('edit', { size: 16 }))}${t('db.useInBuilder')}</a>`;

/** Category definitions: list, filters, columns, row search text and detail. */
function categories(data) {
  const rankFilter = { name: 'rank', label: t('db.rank'), options: [['l', t('rank.low')], ['h', t('rank.high')]], test: (x, v) => x.rk === v };
  const rarityFilter = list => ({ name: 'rarity', label: t('db.rarity'), options: [...new Set(list.map(x => x.r))].sort((a, b) => a - b).map(r => [String(r), String(r)]), test: (x, v) => x.r === +v });
  const skillFilter = list => {
    const ids = new Set();
    for (const x of list) for (const [id] of x.sk || []) ids.add(id);
    const skills = [...ids].map(id => data.skillById.get(id)).filter(Boolean).sort((a, b) => a.n.localeCompare(b.n, getLang()));
    return { name: 'skill', label: t('builder.picker.skill'), options: skills.map(s => [String(s.id), s.n]), test: (x, v) => (x.sk || []).some(([id]) => id === +v) || x.ss === +v || x.gs === +v };
  };
  return {
    weapons: {
      list: data.weapons,
      filters: [
        { name: 'kind', label: t('db.type'), options: WEAPON_KINDS.map(k => [k, t(`weapon.${k}`)]), test: (x, v) => x.k === v },
        rankFilter, rarityFilter(data.weapons),
        { name: 'element', label: t('stat.element'), options: [['none', t('common.none')], ...[...ELEMENTS, ...STATUSES].map(e => [e, t(`el.${e}`)])], test: (x, v) => (v === 'none' ? !x.el : x.el === v) },
        skillFilter(data.weapons)
      ],
      cols: [t('db.name'), t('db.type'), t('db.rarity'), t('hr'), t('stat.attack'), t('stat.affinity'), t('stat.element'), t('stat.slots')],
      row: x => [raw(icon(x.k, { size: 16 })), t(`weapon.${x.k}`), rarity(x.r), hrBadge(x.hr), num(x.atk), `${x.aff}%`, elementTag(x.el, x.ev, x.eh), slotsTag(x.s)]
    },
    armor: {
      list: data.armor,
      filters: [
        { name: 'kind', label: t('db.type'), options: ARMOR_KINDS.map(k => [k, t(`kind.${k}`)]), test: (x, v) => x.k === v },
        rankFilter, rarityFilter(data.armor), skillFilter(data.armor)
      ],
      cols: [t('db.name'), t('db.type'), t('db.rarity'), t('hr'), t('stat.defense'), t('stat.slots'), t('stat.skills')],
      row: x => [raw(icon(x.k, { size: 16 })), t(`kind.${x.k}`), rarity(x.r), hrBadge(x.hr), `${x.d[0]} → ${x.d[1]}`, slotsTag(x.s), html`<span class="wrap small">${skillStr(x.sk, data)}</span>`]
    },
    sets: {
      list: data.sets,
      filters: [rankFilter, rarityFilter(data.sets)],
      cols: [t('db.name'), t('db.rank'), t('db.rarity'), t('hr'), t('stat.setBonus'), t('stat.groupBonus')],
      row: x => ['', rankBadge(x.rk), rarity(x.r), hrBadge(x.hr), x.ss ? data.skillById.get(x.ss)?.n : '—', x.gs ? data.skillById.get(x.gs)?.n : '—']
    },
    decorations: {
      list: data.decorations,
      filters: [
        { name: 'kind', label: t('db.type'), options: [['weapon', t('db.weaponSkill')], ['armor', t('db.armorSkill')]], test: (x, v) => x.k === v },
        { name: 'size', label: t('db.slot'), options: [['1', '1'], ['2', '2'], ['3', '3']], test: (x, v) => x.s === +v },
        rarityFilter(data.decorations), skillFilter(data.decorations)
      ],
      cols: [t('db.name'), t('db.type'), t('db.slot'), t('db.rarity'), t('stat.skills')],
      row: x => [raw(icon('deco', { size: 16 })), x.k === 'weapon' ? t('db.weaponSkill') : t('db.armorSkill'), slotsTag([x.s]), rarity(x.r), html`<span class="small">${skillStr(x.sk, data)}</span>`]
    },
    charms: {
      list: data.charms,
      filters: [rarityFilter(data.charms), skillFilter(data.charms)],
      cols: [t('db.name'), t('db.rarity'), t('hr'), t('stat.skills'), t('stat.cost')],
      row: x => [raw(icon('charm', { size: 16 })), rarity(x.r), hrBadge(x.hr), html`<span class="small">${skillStr(x.sk, data)}</span>`, `${num(charmPath(x, data).reduce((s, c) => s + c.z, 0))} z`]
    },
    skills: {
      list: data.skills,
      filters: [{ name: 'kind', label: t('db.type'), options: ['weapon', 'armor', 'set', 'group'].map(k => [k, t(`db.skillKind.${k}`)]), test: (x, v) => x.k === v }],
      cols: [t('db.name'), t('db.type'), t('db.level'), t('db.details')],
      row: x => ['', t(`db.skillKind.${x.k}`), x.m, html`<span class="wrap small">${x.d || (x.r[0] && x.r[0].d) || ''}</span>`]
    },
    items: {
      list: data.items,
      filters: [
        rarityFilter(data.items),
        { name: 'drop', label: t('src.monster'), options: data.monsters.filter(m => m.k === 'large').map(m => [String(m.id), m.n]), test: (x, v) => (data.sources[x.id] || []).some(([id]) => id === +v) },
        { name: 'zone', label: t('src.zone'), options: data.locations.map(l => [String(l.id), l.n]),
          test: (x, v) => (data.gather[x.id] || []).includes(+v) || (data.sources[x.id] || []).some(([id]) => (data.monsterById.get(id)?.loc || []).includes(+v)) },
        { name: 'craft', label: t('src.usedFilter'), options: [['1', t('src.usedOnly')]], test: x => data.itemUsage.has(x.id) }
      ],
      cols: [t('db.name'), t('db.rarity'), t('db.value'), t('src.where')],
      row: x => ['', rarity(x.r), `${num(x.v)} z`, html`<span class="wrap small">${sourceSummary(x.id, data, null)}</span>`]
    },
    monsters: {
      list: data.monsters,
      filters: [
        { name: 'weak', label: t('db.weaknesses'), options: ELEMENTS.map(e => [e, t(`el.${e}`)]), test: (x, v) => x.w.some(([type, lv]) => type === v && lv >= 2) },
        { name: 'zone', label: t('src.zone'), options: data.locations.map(l => [String(l.id), l.n]), test: (x, v) => x.loc.includes(+v) }
      ],
      cols: [t('db.name'), t('db.type'), t('hr'), t('db.locations'), t('db.weaknesses')],
      row: x => ['', x.sp || x.k, hrBadge(x.hr), html`<span class="wrap small">${zoneNames(x.loc, data).join(', ')}</span>`, html`<span class="inline-list">${x.w.filter(([type, lv]) => ELEMENTS.includes(type) && lv >= 2).map(([type, lv]) => html`<span class="el el-${type}">${t(`el.${type}`)} ${'★'.repeat(lv)}</span>`)}</span>`]
    }
  };
}

function detail(cat, x, data, text) {
  if (!x) return html`<p class="muted">${t('db.details')}</p>`;
  const desc = (map, id) => (map && map[id] ? html`<p class="small muted desc">${map[id]}</p>` : '');
  const head = (extra = '') => html`<h2 class="panel-title">${x.n}</h2><p class="badges">${x.r ? rarity(x.r) : ''}${x.rk ? rankBadge(x.rk) : ''}${x.hr ? hrBadge(x.hr) : ''}${extra}</p>`;
  if (cat === 'weapons') {
    const path = weaponPath(x, data);
    const children = (data.weaponChildren.get(x.id) || []).map(id => data.weaponById.get(id));
    const extra = x.x || {};
    return html`${head(html`<span class="badge">${t(`weapon.${x.k}`)}</span>`)}${desc(text.weapons, x.id)}
      <dl class="kv">
        <dt>${t('stat.attack')}</dt><dd>${num(x.atk)} (${t('stat.raw')} ${x.raw})</dd>
        <dt>${t('stat.affinity')}</dt><dd>${x.aff}%</dd>
        <dt>${t('stat.element')}</dt><dd>${x.el ? elementTag(x.el, x.ev, x.eh) : t('common.none')}</dd>
        ${x.def ? html`<dt>${t('stat.defense')}</dt><dd>+${x.def}</dd>` : ''}
        ${x.es ? html`<dt>${t('stat.elderseal')}</dt><dd>${x.es}</dd>` : ''}
        <dt>${t('stat.slots')}</dt><dd>${slotsTag(x.s)}</dd>
        ${x.sh ? html`<dt>${t('stat.sharpness')}</dt><dd>${sharpnessBar(x.sh)}</dd>` : ''}
        ${x.sk.length ? html`<dt>${t('stat.skills')}</dt><dd>${skillStr(x.sk, data)}</dd>` : ''}
        ${extra.phial ? html`<dt>${t('stat.phial')}</dt><dd>${tx(typeof extra.phial === 'string' ? extra.phial : extra.phial.kind)}${extra.phial.damage ? ` ${num(extra.phial.damage.display)}` : ''}</dd>` : ''}
        ${extra.shell ? html`<dt>${t('stat.shell')}</dt><dd>${tx(extra.shell.kind)} ${t('common.level', { n: extra.shell.level })}</dd>` : ''}
        ${extra.kinsect ? html`<dt>${t('stat.kinsect')}</dt><dd>${t('common.level', { n: extra.kinsect })}</dd>` : ''}
        ${extra.coatings ? html`<dt>${t('stat.coatings')}</dt><dd>${extra.coatings.map(tx).join(', ')}</dd>` : ''}
        ${extra.ammo ? html`<dt>${t('stat.ammo')}</dt><dd class="small">${extra.ammo.map(a => `${tx(a[0])} ${a[1]} (×${a[2]})`).join(', ')}</dd>` : ''}
        <dt>${x.c ? t('stat.craft') : t('stat.upgrade')}</dt><dd>${x.p ? html`<a href="#/db/weapons/${x.p}">${data.weaponById.get(x.p)?.n}</a> · ` : ''}${num(x.z)} z</dd>
      </dl>
      <h3>${t('stat.materials')}</h3>${matsList(x.m, data)}
      ${path.length > 1 ? html`<h3>${t('builder.weaponPath')}</h3><p class="path-steps">${path.map((w, i) => html`${i ? raw('<span aria-hidden="true">→</span>') : ''}<a class="path-step" href="#/db/weapons/${w.id}">${w.n}</a>`)}</p>
        <p class="small">${t('stat.cost')} : <b>${num(path.reduce((s, w) => s + w.z, 0))} z</b></p>` : ''}
      ${children.length ? html`<h3>→</h3><ul class="chips">${children.map(w => html`<li class="chip"><a href="#/db/weapons/${w.id}">${w.n}</a></li>`)}</ul>` : ''}
      <p>${builderLink({ w: x.id, a: {}, c: null, d: {} })}</p>`;
  }
  if (cat === 'armor') {
    const set = data.setById.get(x.set);
    const bonus = [x.ss, x.gs].map(id => id && data.skillById.get(id)).filter(Boolean);
    return html`${head(html`<span class="badge">${t(`kind.${x.k}`)}</span>`)}${desc(text.armor, x.id)}
      <dl class="kv">
        <dt>${t('stat.defense')}</dt><dd>${x.d[0]} → ${x.d[1]}</dd>
        <dt>${t('stat.resistances')}</dt><dd class="res-list">${['fire', 'water', 'thunder', 'ice', 'dragon'].map((e, i) => html`<span class="el el-${e}">${x.res[i] > 0 ? '+' : ''}${x.res[i]}</span>`)}</dd>
        <dt>${t('stat.slots')}</dt><dd>${slotsTag(x.s)}</dd>
        <dt>${t('stat.skills')}</dt><dd>${skillStr(x.sk, data) || t('common.none')}</dd>
        ${set ? html`<dt>${t('db.sets')}</dt><dd><a href="#/db/sets/${set.id}">${set.n}</a></dd>` : ''}
        ${bonus.length ? html`<dt>${t('stat.setBonus')}</dt><dd>${bonus.map(b => b.n).join(' · ')}</dd>` : ''}
        <dt>${t('stat.cost')}</dt><dd>${num(x.z)} z</dd>
      </dl>
      <h3>${t('stat.materials')}</h3>${matsList(x.m, data)}
      <p>${builderLink({ w: null, a: { [x.k]: x.id }, c: null, d: {} })}</p>`;
  }
  if (cat === 'sets') {
    const pieces = data.armorBySet.get(x.id) || [];
    const bonus = [x.ss, x.gs].map(id => id && data.skillById.get(id)).filter(Boolean);
    const a = {};
    pieces.forEach(p => { a[p.k] = p.id; });
    return html`${head()}
      <h3>${t('db.pieces')}</h3><ul class="chips">${pieces.map(p => html`<li class="chip"><a href="#/db/armor/${p.id}">${p.n}</a></li>`)}</ul>
      ${bonus.map(b => html`<h3>${b.n}</h3><ul class="small">${b.r.map(r => html`<li><b>${r.p} ${t('db.pieces').toLowerCase()}</b> — ${r.n || ''} ${r.d || ''}</li>`)}</ul>`)}
      <p class="small">${t('stat.cost')} : <b>${num(pieces.reduce((s, p) => s + p.z, 0))} z</b></p>
      <p>${builderLink({ w: null, a, c: null, d: {} })}</p>`;
  }
  if (cat === 'decorations') {
    return html`${head(html`<span class="badge">${x.k === 'weapon' ? t('db.weaponSkill') : t('db.armorSkill')}</span>`)}
      ${x.sk.map(([id, lv]) => { const s = data.skillById.get(id); return s ? html`<h3><a href="#/db/skills/${s.id}">${s.n}</a> ${lv}</h3><p class="small">${(s.r.find(r => r.l === lv) || {}).d || s.d || ''}</p>` : ''; })}
      <p class="small muted">${t('builder.decoNote')}</p>`;
  }
  if (cat === 'charms') {
    const path = charmPath(x, data);
    const mats = new Map();
    path.forEach(c => c.m.forEach(([id, q]) => mats.set(id, (mats.get(id) || 0) + q)));
    return html`${head()}
      <dl class="kv"><dt>${t('stat.skills')}</dt><dd>${skillStr(x.sk, data)}</dd>
      <dt>${t('stat.cost')}</dt><dd>${num(path.reduce((s, c) => s + c.z, 0))} z</dd></dl>
      ${path.length > 1 ? html`<p class="path-steps">${path.map((c, i) => html`${i ? raw('<span aria-hidden="true">→</span>') : ''}<a class="path-step" href="#/db/charms/${c.id}">${c.n}</a>`)}</p>` : ''}
      <h3>${t('stat.materials')}</h3>${matsList([...mats.entries()], data)}
      <p>${builderLink({ w: null, a: {}, c: x.id, d: {} })}</p>`;
  }
  if (cat === 'skills') {
    const decos = data.decorations.filter(d => d.sk.some(([id]) => id === x.id));
    const armor = data.armor.filter(a => a.sk.some(([id]) => id === x.id) || a.ss === x.id || a.gs === x.id);
    return html`<h2 class="panel-title">${x.n}</h2><p class="badges"><span class="badge">${t(`db.skillKind.${x.k}`)}</span><span class="badge">${t('db.maxLevel', { n: x.m })}</span></p>
      ${x.d ? html`<p>${x.d}</p>` : ''}
      <ol class="small">${x.r.map(r => html`<li>${r.p ? html`<b>${r.p} ${t('db.pieces').toLowerCase()}</b> — ` : ''}${r.n ? html`<b>${r.n}</b> — ` : ''}${r.d || ''}</li>`)}</ol>
      ${decos.length ? html`<h3>${t('db.decorations')}</h3><ul class="chips">${decos.map(d => html`<li class="chip"><a href="#/db/decorations/${d.id}">${d.n}</a></li>`)}</ul>` : ''}
      ${armor.length ? html`<h3>${t('db.armor')} (${armor.length})</h3><ul class="chips">${armor.slice(0, 30).map(a => html`<li class="chip"><a href="#/db/armor/${a.id}">${a.n}</a></li>`)}</ul>` : ''}`;
  }
  if (cat === 'items') {
    const usage = data.itemUsage.get(x.id) || [];
    const ref = ([type, id]) => {
      const obj = type === 'weapon' ? data.weaponById.get(id) : type === 'armor' ? data.armorById.get(id) : data.charmById.get(id);
      const catName = type === 'weapon' ? 'weapons' : type === 'armor' ? 'armor' : 'charms';
      return obj ? html`<li class="chip"><a href="#/db/${catName}/${id}">${obj.n}</a></li>` : '';
    };
    return html`${head()}${desc(text.items, x.id)}
      <dl class="kv"><dt>${t('db.value')}</dt><dd>${num(x.v)} z</dd></dl>
      <h3 class="detail-h">${t('db.sources')}</h3>${itemSourcesDetail(x.id, data)}
      ${usage.length ? html`<h3>${t('db.usedIn')} (${usage.length})</h3><ul class="chips">${usage.slice(0, 40).map(ref)}</ul>` : ''}`;
  }
  if (cat === 'monsters') {
    return html`<h2 class="panel-title">${x.n}</h2><p class="badges"><span class="badge">${x.sp || x.k}</span>${hrBadge(x.hr)}</p>${desc(text.monsters, x.id)}
      <h3>${t('db.weaknesses')}</h3><ul class="chips">${x.w.map(([type, lv, cond]) => html`<li class="chip"><span class="el el-${type}">${t(`el.${type}`)}</span> ${'★'.repeat(lv)}${cond ? html` <small class="muted">${cond}</small>` : ''}</li>`)}</ul>
      ${x.res.length ? html`<h3>${t('db.resistant')}</h3><ul class="chips">${x.res.map(r => html`<li class="chip">${t(`el.${r}`)}</li>`)}</ul>` : ''}
      ${x.loc && x.loc.length ? html`<h3>${t('db.locations')}</h3><ul class="chips">${zoneNames(x.loc, data).map(n => html`<li class="chip chip-zone">${n}</li>`)}</ul>` : ''}
      ${monsterDrops(x, data)}`;
  }
  return '';
}

export async function render(el, { data, params, query }) {
  const cat = CATS.includes(params[0]) ? params[0] : 'weapons';
  const selectedId = params[1] ? +params[1] : null;
  setTitle(`${t(`db.${cat}`)} · ${t('db.title')}`);
  const defs = categories(data);
  const def = defs[cat];
  const text = await loadText(getLang());
  const state = Object.fromEntries([...query.entries()]);

  mount(el, html`
    <div class="page-hero"><div class="container">
      <h1>${t('db.title')}</h1><p>${t('db.lead')}</p>
    </div></div>
    <div class="container page">
      <nav class="tabs" aria-label="${t('db.title')}">${CATS.map(c => html`<a class="tab" href="#/db/${c}" ${c === cat ? raw('aria-current="page"') : ''}>${t(`db.${c}`)} <small class="muted">${num(defs[c].list.length)}</small></a>`)}</nav>
      <form class="toolbar" id="db-filters" role="search" aria-label="${t('common.search')} — ${t(`db.${cat}`)}">
        <label class="field field-search"><span>${t('common.search')}</span><input type="search" name="q" value="${state.q || ''}" autocomplete="off"></label>
        ${def.filters.map(f => html`<label class="field"><span>${f.label}</span><select name="${f.name}">
          <option value="">${t('common.all')}</option>${f.options.map(([v, l]) => html`<option value="${v}" ${state[f.name] === v ? raw('selected') : ''}>${l}</option>`)}</select></label>`)}
      </form>
      <div class="db-layout">
        <div>
          <p class="pick-count" id="db-count" aria-live="polite"></p>
          <div class="table-wrap"><table class="table db-table">
            <caption class="sr-only">${t(`db.${cat}`)}</caption>
            <thead><tr>${def.cols.map((c, i) => html`<th scope="col" ${i === 0 ? raw('class="wrap"') : ''}>${c}</th>`)}</tr></thead>
            <tbody id="db-rows"></tbody>
          </table></div>
          <div class="pager" id="db-pager"></div>
        </div>
        <aside class="panel db-detail" id="db-detail" aria-live="polite" aria-label="${t('db.details')}"></aside>
      </div>
    </div>`);

  const form = $('#db-filters', el);
  const rows = $('#db-rows', el);
  const pager = $('#db-pager', el);
  const detailEl = $('#db-detail', el);
  let page = 0, filtered = def.list;
  const showDetail = id => {
    const x = def.list.find(i => i.id === id) || null;
    mount(detailEl, detail(cat, x, data, text));
    rows.querySelectorAll('tr').forEach(tr => tr.setAttribute('aria-selected', String(+tr.dataset.id === id)));
  };
  const draw = () => {
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
    page = Math.min(page, pages - 1);
    $('#db-count', el).textContent = t('common.results', { n: num(filtered.length) });
    rows.innerHTML = filtered.slice(page * PAGE, page * PAGE + PAGE).map(x => {
      const cells = def.row(x);
      return String(html`<tr data-id="${x.id}" aria-selected="${x.id === selectedId}">
        <th scope="row" class="wrap"><span class="inline-list">${cells[0]}<a class="row-btn" href="#/db/${cat}/${x.id}">${x.n}</a></span></th>
        ${cells.slice(1).map(cell => html`<td>${cell}</td>`)}</tr>`);
    }).join('');
    pager.innerHTML = pages > 1 ? String(html`
      <button type="button" class="btn btn-sm" data-page="-1" ${page === 0 ? raw('disabled') : ''}>${t('common.prev')}</button>
      <span>${t('common.page', { n: page + 1, total: pages })}</span>
      <button type="button" class="btn btn-sm" data-page="1" ${page + 1 >= pages ? raw('disabled') : ''}>${t('common.next')}</button>`) : '';
  };
  const apply = () => {
    const f = new FormData(form);
    const q = (f.get('q') || '').toString().trim().toLowerCase();
    filtered = def.list.filter(x => (!q || x.n.toLowerCase().includes(q)) &&
      def.filters.every(flt => { const v = f.get(flt.name); return !v || flt.test(x, v); }));
    page = 0;
    draw();
  };
  form.addEventListener('submit', e => e.preventDefault());
  form.addEventListener('input', debounce(apply, 150));
  form.addEventListener('change', apply);
  pager.addEventListener('click', e => {
    const b = e.target.closest('[data-page]');
    if (!b) return;
    page += +b.dataset.page;
    draw();
    rows.closest('.table-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // Clicking a row opens details without reloading the whole view.
  rows.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    if (e.target.closest('a')) e.preventDefault();
    const id = +tr.dataset.id;
    history.replaceState(null, '', `#/db/${cat}/${id}`);
    showDetail(id);
    if (matchMedia('(max-width: 1000px)').matches) detailEl.scrollIntoView({ behavior: 'smooth' });
  });
  apply();
  if (selectedId) {
    const idx = filtered.findIndex(x => x.id === selectedId);
    if (idx >= 0) { page = Math.floor(idx / PAGE); draw(); }
    showDetail(selectedId);
  } else {
    showDetail(filtered[0] ? filtered[0].id : null);
  }
  // Links inside the detail panel to the same category stay in place.
  detailEl.addEventListener('click', e => {
    const a = e.target.closest(`a[href^="#/db/${cat}/"]`);
    if (!a) return;
    e.preventDefault();
    const id = +a.getAttribute('href').split('/').pop();
    history.replaceState(null, '', a.getAttribute('href'));
    showDetail(id);
  });
}
