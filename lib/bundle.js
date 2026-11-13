'use strict';

/**
 * Builds the compact, localized game data bundles consumed by the front-end.
 * Used by `npm run export` (static files for GitHub Pages) and by the server.
 */

const LANGS = ['en', 'fr'];
const parse = s => (s ? JSON.parse(s) : null);
// Language-independent key, e.g. "Weakness Exploit" -> "weakness-exploit".
const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
    id: s.id, key: slug(s.name_en), k: s.kind, i: s.icon, m: s.max_level, n: s[N], d: s[D],
    r: parse(s[`ranks_${lang}`]).map(r => ({ l: r.level, n: r.name, d: r.description, p: r.pieces }))
  }));

  const items = all('SELECT * FROM items ORDER BY id').map(i => ({
    id: i.id, n: i[N], r: i.rarity, v: i.value, i: i.icon_kind, c: i.icon_color
  }));

  const locations = all('SELECT * FROM locations ORDER BY id').map(l => ({ id: l.id, n: l[N], z: l.zone_count }));
  const monsterLocs = groupBy(all('SELECT * FROM monster_locations ORDER BY location_id'), 'monster_id', r => r.location_id);

  const monsters = all('SELECT * FROM monsters ORDER BY name_en').map(m => ({
    id: m.id, key: slug(m.name_en), n: m[N], k: m.kind, sp: m.species, hr: m.hr_unlock,
    w: parse(m.weaknesses).map(w => [w.type, w.level, w.condition]),
    res: parse(m.resistances), loc: monsterLocs.get(m.id) || []
  }));

  // Drop tables: item id -> [[monsterId, rank, kind index, part, quantity, chance %]]
  const dropKinds = all('SELECT DISTINCT kind FROM item_drops ORDER BY kind').map(r => r.kind);
  const drops = {};
  for (const d of all('SELECT * FROM item_drops ORDER BY item_id, monster_id, rank, chance DESC')) {
    (drops[d.item_id] = drops[d.item_id] || []).push([d.monster_id, d.rank[0], dropKinds.indexOf(d.kind), d.part || 0, d.quantity, d.chance]);
  }
  // Gathering maps: item id -> [location ids]
  const gather = {};
  for (const g of all('SELECT * FROM item_locations ORDER BY item_id, location_id')) {
    (gather[g.item_id] = gather[g.item_id] || []).push(g.location_id);
  }
  // Other sources: item id -> [[type, name, monsterId, rank, method, chance]]
  const other = {};
  for (const o of all('SELECT * FROM item_other_sources ORDER BY item_id, type, chance DESC')) {
    (other[o.item_id] = other[o.item_id] || []).push([o.type, o.name || 0, o.monster_id || 0, o.rank ? o.rank[0] : 0, o.method || 0, o.chance || 0]);
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
    id: s.id, key: slug(s.name_en), n: s[N], rk: s.rank[0], r: s.rarity, hr: s.hr,
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
    lang, source: meta.source,
    skills, items, monsters, locations, dropKinds, drops, gather, other, weapons, sets, armor, decorations, charms
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
