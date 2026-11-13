'use strict';

/**
 * Resolves the recommended builds (scripts/featured-source.js) against the
 * game database and writes data/featured.json.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { SOURCES, BUILDS, LOOKS } = require('./featured-source');

const root = path.join(__dirname, '..');
const db = new Database(path.join(root, 'monster_hunter.db'), { readonly: true });

const norm = s => s.toLowerCase()
  .replace(/\bjwl\b/g, 'jewel')
  .replace(/[^a-z0-9αβγ\[\]]+/g, '');

const index = (rows) => {
  const map = new Map();
  for (const r of rows) {
    map.set(r.name_en, r);
    if (!map.has(norm(r.name_en))) map.set(norm(r.name_en), r);
  }
  return name => map.get(name) || map.get(norm(name));
};
const weapons = index(db.prepare('SELECT id, kind, name_en, slots, hr FROM weapons').all());
const armor = index(db.prepare('SELECT id, kind, name_en, slots, hr FROM armor').all());
const charms = index(db.prepare('SELECT id, name_en, hr FROM charms').all());
const decos = index(db.prepare('SELECT id, kind, slot, name_en FROM decorations').all());

const missing = [];
const out = [];

for (const b of BUILDS) {
  const label = `${b.kind} / ${b.name}`;
  const weapon = weapons(b.weapon);
  if (!weapon) { missing.push(`${label}: weapon "${b.weapon}" (build skipped)`); continue; }
  if (weapon.kind !== b.kind) missing.push(`${label}: weapon kind mismatch ${weapon.kind}`);
  const build = { w: weapon.id, a: {}, c: null, d: {} };
  let hr = weapon.hr;
  const slotsOf = { w: JSON.parse(weapon.slots) };

  for (const name of b.armor) {
    const piece = armor(name);
    if (!piece) { missing.push(`${label}: armor "${name}"`); continue; }
    build.a[piece.kind] = piece.id;
    slotsOf[piece.kind] = JSON.parse(piece.slots);
    hr = Math.max(hr, piece.hr);
  }
  if (b.charm) {
    const charm = charms(b.charm);
    if (charm) { build.c = charm.id; hr = Math.max(hr, charm.hr); }
    else missing.push(`${label}: charm "${b.charm}"`);
  }
  for (const [key, names] of Object.entries(b.decos || {})) {
    const slots = slotsOf[key];
    if (!slots) continue;
    const placed = slots.map(() => null);
    const list = names.map(n => {
      const d = decos(n);
      if (!d) missing.push(`${label}: decoration "${n}"`);
      return d;
    }).filter(Boolean).sort((x, y) => y.slot - x.slot);
    for (const d of list) {
      const i = slots.findIndex((size, j) => placed[j] === null && size >= d.slot);
      if (i >= 0) placed[i] = d.id;
      else missing.push(`${label}: no slot for "${d.name_en}" in ${key}`);
    }
    if (placed.some(x => x !== null)) build.d[key] = placed;
  }

  out.push({
    id: `f-${b.kind}-${b.rank}-${b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    kind: b.kind, rank: b.rank, hr: Math.max(b.hr, hr), style: b.style, name: b.name,
    source: SOURCES[b.src], url: b.url, build
  });
}

fs.writeFileSync(path.join(root, 'data', 'featured.json'), JSON.stringify(out));
console.log(`data/featured.json: ${out.length} builds`);

// Cosmetic outfit ideas
const looks = [];
for (const l of LOOKS) {
  const look = { w: null, a: {}, colors: l.colors };
  if (l.weapon) {
    const w = weapons(l.weapon);
    if (w) look.w = w.id; else missing.push(`look ${l.id}: weapon "${l.weapon}"`);
  }
  for (const name of l.armor) {
    const piece = armor(name);
    if (piece) look.a[piece.kind] = piece.id; else missing.push(`look ${l.id}: armor "${name}"`);
  }
  looks.push({ id: `look-${l.id}`, name: l.name, desc: l.desc, look });
}
fs.writeFileSync(path.join(root, 'data', 'looks.json'), JSON.stringify(looks));
console.log(`data/looks.json: ${looks.length} outfits`);
if (missing.length) console.log('Unresolved:\n  ' + missing.join('\n  '));
db.close();
