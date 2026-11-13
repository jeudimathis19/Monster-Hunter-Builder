// Build computations: skills, set bonuses, stats, cost, materials and requirements.

import { ARMOR_KINDS } from './i18n.js';

export const emptyBuild = () => ({ w: null, a: {}, c: null, d: {} });

/** Resolves ids to game objects. Unknown ids are dropped. */
export function resolve(build, data) {
  const weapon = build.w ? data.weaponById.get(build.w) || null : null;
  const armor = {};
  for (const k of ARMOR_KINDS) {
    const p = build.a && build.a[k] ? data.armorById.get(build.a[k]) : null;
    if (p && p.k === k) armor[k] = p;
  }
  const charm = build.c ? data.charmById.get(build.c) || null : null;
  const decos = {};
  const slotsOf = { w: weapon ? weapon.s : [] };
  for (const k of ARMOR_KINDS) slotsOf[k] = armor[k] ? armor[k].s : [];
  for (const [key, slots] of Object.entries(slotsOf)) {
    const list = (build.d && build.d[key]) || [];
    decos[key] = slots.map((size, i) => {
      const d = list[i] ? data.decoById.get(list[i]) : null;
      const ok = d && d.s <= size && d.k === (key === 'w' ? 'weapon' : 'armor');
      return ok ? d : null;
    });
  }
  return { weapon, armor, charm, decos, slotsOf };
}

/** Removes ids that no longer fit (e.g. after changing a piece). */
export function sanitize(build, data) {
  const r = resolve(build, data);
  const out = { w: r.weapon ? r.weapon.id : null, a: {}, c: r.charm ? r.charm.id : null, d: {} };
  for (const k of ARMOR_KINDS) if (r.armor[k]) out.a[k] = r.armor[k].id;
  for (const [key, list] of Object.entries(r.decos)) {
    if (list.some(Boolean)) out.d[key] = list.map(d => (d ? d.id : null));
  }
  return out;
}

/** Path of weapons from a craftable root to the given weapon (inclusive). */
export function weaponPath(weapon, data) {
  const path = [];
  let w = weapon, guard = 0;
  while (w && guard++ < 30) {
    path.unshift(w);
    if (w.c || !w.p) break;
    w = data.weaponById.get(w.p);
  }
  return path;
}

/** Charm ranks needed to reach the given charm level (rank I is crafted, the next ones are upgrades). */
export function charmPath(charm, data) {
  const family = data.charmsByFamily.get(charm.c) || [charm];
  return family.filter(c => c.l <= charm.l).sort((a, b) => a.l - b.l);
}

export function computeBuild(build, data, opts = {}) {
  const r = resolve(build, data);
  const points = new Map();
  const add = (skillId, level, source) => {
    const s = data.skillById.get(skillId);
    if (!s) return;
    if (!points.has(skillId)) points.set(skillId, { skill: s, points: 0, sources: [] });
    const e = points.get(skillId);
    e.points += level;
    e.sources.push([source, level]);
  };

  const pieces = [];
  if (r.weapon) pieces.push(['w', r.weapon]);
  for (const k of ARMOR_KINDS) if (r.armor[k]) pieces.push([k, r.armor[k]]);

  // Equipment skills (weapon + armor + charm + decorations).
  for (const [, p] of pieces) for (const [id, lv] of p.sk) add(id, lv, p.n);
  if (r.charm) for (const [id, lv] of r.charm.sk) add(id, lv, r.charm.n);
  for (const list of Object.values(r.decos)) for (const d of list) if (d) for (const [id, lv] of d.sk) add(id, lv, d.n);

  // Set & group bonuses: each armor piece counts once for its set skill and group skill.
  for (const k of ARMOR_KINDS) {
    const p = r.armor[k];
    if (!p) continue;
    if (p.ss) add(p.ss, 1, p.n);
    if (p.gs) add(p.gs, 1, p.n);
  }

  const skills = [], bonuses = [];
  for (const e of points.values()) {
    const s = e.skill;
    if (s.k === 'set' || s.k === 'group') {
      const ranks = s.r.filter(rk => (rk.p || 0) <= e.points);
      const active = ranks.length ? ranks[ranks.length - 1] : null;
      const next = s.r.find(rk => (rk.p || 0) > e.points) || null;
      bonuses.push({ skill: s, pieces: e.points, active, next, sources: e.sources });
    } else {
      const level = Math.min(e.points, s.m);
      skills.push({ skill: s, level, points: e.points, max: s.m, over: e.points > s.m, rank: s.r.find(x => x.l === level), sources: e.sources });
    }
  }
  skills.sort((a, b) => b.level - a.level || a.skill.n.localeCompare(b.skill.n));
  bonuses.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0) || b.pieces - a.pieces);

  // Stats.
  const armorList = ARMOR_KINDS.map(k => r.armor[k]).filter(Boolean);
  const defBase = armorList.reduce((s, p) => s + p.d[0], 0) + (r.weapon ? r.weapon.def : 0);
  const defMax = armorList.reduce((s, p) => s + p.d[1], 0) + (r.weapon ? r.weapon.def : 0);
  if (opts.light) return { r, skills, bonuses, stats: { defMax } };
  const res = [0, 0, 0, 0, 0];
  for (const p of armorList) p.res.forEach((v, i) => { res[i] += v; });

  // Requirements.
  const all = [...pieces.map(x => x[1]), ...(r.charm ? [r.charm] : [])];
  const hr = all.reduce((m, p) => Math.max(m, p.hr || 1), 1);
  const high = all.some(p => p.rk === 'h' || p.r >= 5);

  // Cost & materials.
  const mats = new Map();
  const steps = [];
  const addMats = (list, label) => {
    for (const [itemId, qty] of list) {
      if (!mats.has(itemId)) mats.set(itemId, { item: data.itemById.get(itemId), qty: 0, for: [] });
      const e = mats.get(itemId);
      e.qty += qty;
      e.for.push([label, qty]);
    }
  };
  let zenny = 0;
  if (r.weapon) {
    for (const w of weaponPath(r.weapon, data)) {
      zenny += w.z;
      addMats(w.m, w.n);
      steps.push({ slot: 'w', piece: w, zenny: w.z, craft: !!w.c });
    }
  }
  for (const p of armorList) {
    zenny += p.z;
    addMats(p.m, p.n);
    steps.push({ slot: p.k, piece: p, zenny: p.z, craft: true });
  }
  if (r.charm) {
    for (const c of charmPath(r.charm, data)) {
      zenny += c.z;
      addMats(c.m, c.n);
      steps.push({ slot: 'charm', piece: c, zenny: c.z, craft: !!c.cr });
    }
  }
  const materials = [...mats.values()].filter(m => m.item).sort((a, b) => b.item.r - a.item.r || b.qty - a.qty);

  // Monsters to hunt for those materials (High Rank drops first when the build is High Rank).
  const monsterMap = new Map();
  for (const m of materials) {
    const src = data.sources[m.item.id] || [];
    const preferred = src.filter(([, rk]) => (high ? rk === 'h' : rk === 'l'));
    for (const [monsterId] of (preferred.length ? preferred : src)) {
      const mon = data.monsterById.get(monsterId);
      if (!mon || mon.k !== 'large') continue;
      if (!monsterMap.has(monsterId)) monsterMap.set(monsterId, { monster: mon, items: [] });
      monsterMap.get(monsterId).items.push(m.item);
    }
  }
  const monsters = [...monsterMap.values()].sort((a, b) => b.items.length - a.items.length);

  // Slots usage.
  let slotsTotal = 0, slotsUsed = 0;
  for (const [key, list] of Object.entries(r.decos)) {
    slotsTotal += r.slotsOf[key].length;
    slotsUsed += list.filter(Boolean).length;
  }

  return {
    r, skills, bonuses,
    stats: {
      attack: r.weapon ? r.weapon.atk : 0,
      raw: r.weapon ? r.weapon.raw : 0,
      affinity: r.weapon ? r.weapon.aff : 0,
      element: r.weapon && r.weapon.el ? { type: r.weapon.el, value: r.weapon.ev, hidden: !!r.weapon.eh } : null,
      sharpness: r.weapon ? r.weapon.sh : null,
      defBase, defMax, res,
      slotsTotal, slotsUsed
    },
    hr, rank: high ? 'high' : 'low',
    zenny, steps, materials, monsters,
    complete: !!r.weapon && armorList.length === 5
  };
}

/** Stable key for a build (used for favorites / checklists). */
export function buildKey(build) {
  const a = ARMOR_KINDS.map(k => (build.a && build.a[k]) || 0).join('.');
  const d = Object.entries(build.d || {}).sort().map(([k, v]) => `${k}:${v.map(x => x || 0).join(',')}`).join(';');
  return `b${build.w || 0}-${a}-${build.c || 0}-${d}`;
}
