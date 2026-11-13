'use strict';

/**
 * Builds the compact, localized game data bundles consumed by the front-end.
 * Used by `npm run export` (static files for GitHub Pages) and by the server.
 */

const LANGS = ['en', 'fr'];
const parse = s => (s ? JSON.parse(s) : null);
const groupBy = (rows, key, map) => {
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r[key])) out.set(r[key], []);
    out.get(r[key]).push(map(r));
  }
  return out;
};

function buildCore(db, lang) {
  if (!LANGS.includes(lang)) throw new Error(`Unsupported language: ${lang}`);
  const N = `name_${lang}`, D = `desc_${lang}`;
  const all = sql => db.prepare(sql).all();
  const meta = Object.fromEntries(all('SELECT key, value FROM meta').map(r => [r.key, r.value]));

  const skills = all('SELECT * FROM skills ORDER BY id').map(s => ({
    id: s.id, k: s.kind, i: s.icon, m: s.max_level, n: s[N], d: s[D],
    r: parse(s[`ranks_${lang}`]).map(r => ({ l: r.level, n: r.name, d: r.description, p: r.pieces }))
  }));

  const items = all('SELECT * FROM items ORDER BY id').map(i => ({
    id: i.id, n: i[N], r: i.rarity, v: i.value, i: i.icon_kind, c: i.icon_color
  }));

  const monsters = all('SELECT * FROM monsters ORDER BY name_en').map(m => ({
    id: m.id, n: m[N], k: m.kind, sp: m.species, hr: m.hr_unlock,
    w: parse(m.weaknesses).map(w => [w.type, w.level, w.condition]),
    res: parse(m.resistances), loc: parse(m[`locations_${lang}`])
  }));

  const sources = {};
  for (const s of all('SELECT * FROM item_sources ORDER BY item_id, monster_id')) {
    (sources[s.item_id] = sources[s.item_id] || []).push([s.monster_id, s.rank === 'high' ? 'h' : 'l']);
  }

  const wMats = groupBy(all('SELECT * FROM weapon_materials'), 'weapon_id', m => [m.item_id, m.quantity]);
  const weapons = all('SELECT * FROM weapons ORDER BY kind, id').map(w => ({
    id: w.id, k: w.kind, n: w[N], ser: w[`series_${lang}`], r: w.rarity, rk: w.rank[0], hr: w.hr,
    atk: w.attack, raw: w.attack_raw, aff: w.affinity, def: w.defense_bonus,
    el: w.element, ev: w.element_value, eh: w.element_hidden || undefined, es: w.elderseal || undefined,
    s: parse(w.slots), sk: parse(w.skills), sh: parse(w.sharpness) || undefined, x: parse(w.extra) || undefined,
    p: w.previous_id || undefined, c: w.craftable, z: w.craftable ? w.craft_zenny : w.upgrade_zenny,
    m: wMats.get(w.id) || []
  }));

  const sets = all('SELECT * FROM armor_sets ORDER BY id').map(s => ({
    id: s.id, n: s[N], rk: s.rank[0], r: s.rarity, hr: s.hr,
    ss: s.set_skill_id || undefined, gs: s.group_skill_id || undefined
  }));

  const aMats = groupBy(all('SELECT * FROM armor_materials'), 'armor_id', m => [m.item_id, m.quantity]);
  const armor = all('SELECT * FROM armor ORDER BY set_id, id').map(a => ({
    id: a.id, set: a.set_id, k: a.kind, n: a[N], rk: a.rank[0], r: a.rarity, hr: a.hr,
    d: [a.defense_base, a.defense_max], res: parse(a.resistances), s: parse(a.slots), sk: parse(a.skills),
    z: a.zenny, m: aMats.get(a.id) || []
  }));

  const decorations = all('SELECT * FROM decorations ORDER BY kind, slot, id').map(d => ({
    id: d.id, k: d.kind, s: d.slot, r: d.rarity, n: d[N], sk: parse(d.skills)
  }));

  const cMats = groupBy(all('SELECT * FROM charm_materials'), 'charm_id', m => [m.item_id, m.quantity]);
  const charms = all('SELECT * FROM charms ORDER BY charm_id, level').map(c => ({
    id: c.id, c: c.charm_id, l: c.level, r: c.rarity, hr: c.hr, n: c[N], sk: parse(c.skills),
    cr: c.craftable, z: c.zenny, m: cMats.get(c.id) || []
  }));

  return {
    lang, generated: meta.generated_at, source: meta.source,
    skills, items, monsters, sources, weapons, sets, armor, decorations, charms
  };
}

/** Long descriptions, loaded lazily by the encyclopedia. */
function buildText(db, lang) {
  const D = `desc_${lang}`;
  const map = table => Object.fromEntries(
    db.prepare(`SELECT id, ${D} AS d FROM ${table} WHERE ${D} IS NOT NULL`).all().map(r => [r.id, r.d])
  );
  return { weapons: map('weapons'), armor: map('armor'), items: map('items'), monsters: map('monsters') };
}

module.exports = { LANGS, buildCore, buildText };
