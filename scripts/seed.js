'use strict';

/**
 * Builds the Monster Hunter Wilds game database (weapons, armor, decorations,
 * charms, skills, materials, monsters) in English and French.
 *
 * Source: the community Monster Hunter Wilds database (https://docs.wilds.mhdb.io),
 * compiled from the game files and the community wiki.
 *
 *   npm run seed                 -> downloads the data from the API
 *   npm run seed -- --from=dir   -> uses local JSON dumps (en_weapons.json, fr_weapons.json, ...)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { createGameSchema, createCommunitySchema } = require('../lib/schema');
const { hrForRarity, hrForMonster } = require('../lib/progression');

const API = 'https://wilds.mhdb.io';
const LOCALES = ['en', 'fr'];
const ENDPOINTS = ['weapons', 'armor', 'armor/sets', 'decorations', 'charms', 'skills', 'items', 'monsters'];
const DB_PATH = path.join(__dirname, '..', 'monster_hunter.db');

const fromArg = process.argv.find(a => a.startsWith('--from='));
const fromDir = fromArg ? path.resolve(fromArg.slice('--from='.length)) : null;

async function load(locale, endpoint) {
  const file = `${locale}_${endpoint.replace('/', '_')}.json`;
  if (fromDir) return JSON.parse(fs.readFileSync(path.join(fromDir, file), 'utf8'));
  const res = await fetch(`${API}/${locale}/${endpoint}`, { headers: { 'Accept-Encoding': 'gzip' } });
  if (!res.ok) throw new Error(`${endpoint} (${locale}): HTTP ${res.status}`);
  return res.json();
}

const byId = list => new Map(list.map(x => [x.id, x]));
const json = v => JSON.stringify(v);
const trim = s => (typeof s === 'string' ? s.trim() : s) || null;

async function main() {
  console.log(fromDir ? `Reading dumps from ${fromDir}` : `Downloading from ${API}`);
  const raw = {};
  for (const locale of LOCALES) {
    raw[locale] = {};
    for (const ep of ENDPOINTS) {
      raw[locale][ep] = await load(locale, ep);
      console.log(`  ${locale} ${ep}: ${raw[locale][ep].length}`);
    }
  }
  const en = raw.en, fr = raw.fr;
  const frIdx = Object.fromEntries(ENDPOINTS.map(ep => [ep, byId(fr[ep])]));

  const db = new Database(DB_PATH);
  createGameSchema(db);
  createCommunitySchema(db);

  const insert = (table, row) => {
    const cols = Object.keys(row);
    const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
    return stmt.run(...cols.map(c => row[c]));
  };

  db.transaction(() => {
    insert('meta', { key: 'source', value: API });
    insert('meta', { key: 'generated_at', value: new Date().toISOString() });

    // ---- Skills ---------------------------------------------------------
    const skillKind = new Map();
    for (const s of en.skills) {
      const f = frIdx.skills.get(s.id) || s;
      const ranks = list => list.map(r => ({
        level: r.level, name: trim(r.name), description: trim(r.description), pieces: r.setPiecesRequired || null
      }));
      skillKind.set(s.id, s.kind);
      insert('skills', {
        id: s.id, kind: s.kind, icon: s.icon && s.icon.kind,
        max_level: Math.max(...s.ranks.map(r => r.level), 1),
        name_en: s.name, name_fr: f.name, desc_en: trim(s.description), desc_fr: trim(f.description),
        ranks_en: json(ranks(s.ranks)), ranks_fr: json(ranks(f.ranks || s.ranks))
      });
    }

    // ---- Items / materials ---------------------------------------------
    const itemIds = new Set();
    for (const it of en.items) {
      const f = frIdx.items.get(it.id) || it;
      itemIds.add(it.id);
      insert('items', {
        id: it.id, rarity: it.rarity, value: it.value, carry_limit: it.carryLimit,
        icon_kind: it.icon && it.icon.kind, icon_color: it.icon && it.icon.color,
        name_en: it.name, name_fr: f.name, desc_en: trim(it.description), desc_fr: trim(f.description)
      });
    }
    // Items referenced by recipes but absent from the items list.
    const ensureItem = (item) => {
      if (itemIds.has(item.id)) return;
      itemIds.add(item.id);
      insert('items', {
        id: item.id, rarity: item.rarity, value: item.value, carry_limit: item.carryLimit,
        icon_kind: item.icon && item.icon.kind, icon_color: item.icon && item.icon.color,
        name_en: item.name, name_fr: item.name, desc_en: trim(item.description), desc_fr: null
      });
    };

    // ---- Monsters & drop sources ---------------------------------------
    const itemMinHr = new Map(); // item id -> lowest HR at which a monster drops it (high rank)
    const itemLowRank = new Set(); // items dropped in low rank
    const sourceSeen = new Set();
    for (const m of en.monsters) {
      const f = frIdx.monsters.get(m.id) || m;
      const hr = m.kind === 'large' ? hrForMonster(m.name) : 1;
      const weaknesses = (m.weaknesses || []).map(w => ({
        type: w.element || w.status || w.effect, kind: w.kind, level: w.level || 1, condition: trim(w.condition)
      }));
      insert('monsters', {
        id: m.id, kind: m.kind, species: m.species, hr_unlock: hr,
        name_en: m.name, name_fr: f.name, desc_en: trim(m.description), desc_fr: trim(f.description),
        weaknesses: json(weaknesses),
        resistances: json((m.resistances || []).map(r => r.element || r.status || r.effect)),
        locations_en: json((m.locations || []).map(l => l.name)),
        locations_fr: json((f.locations || m.locations || []).map(l => l.name))
      });
      for (const rw of m.rewards || []) {
        ensureItem(rw.item);
        for (const c of rw.conditions || []) {
          const key = `${rw.item.id}:${m.id}:${c.rank}`;
          if (!sourceSeen.has(key)) {
            sourceSeen.add(key);
            insert('item_sources', { item_id: rw.item.id, monster_id: m.id, rank: c.rank });
          }
          if (c.rank === 'low') itemLowRank.add(rw.item.id);
          else {
            const prev = itemMinHr.get(rw.item.id);
            if (prev === undefined || hr < prev) itemMinHr.set(rw.item.id, hr);
          }
        }
      }
    }

    // HR needed for a recipe: rarity tier, raised by the hardest material to get.
    const hrFor = (rarity, rank, materials) => {
      let hr = hrForRarity(rarity);
      if (rank === 'high') {
        for (const m of materials) {
          if (itemLowRank.has(m.item.id)) continue;
          const h = itemMinHr.get(m.item.id);
          if (h && h > hr) hr = h;
        }
      }
      return hr;
    };

    // ---- Weapons ---------------------------------------------------------
    const weaponExtra = w => {
      const extra = {};
      if (w.phial) extra.phial = w.phial;
      if (w.shell) extra.shell = { kind: w.shell, level: w.shellLevel };
      if (w.coatings) extra.coatings = w.coatings;
      if (w.ammo) extra.ammo = w.ammo.map(a => [a.kind, a.level, a.capacity]);
      if (w.specialAmmo) extra.specialAmmo = w.specialAmmo;
      if (w.kinsectLevel) extra.kinsect = w.kinsectLevel;
      if (w.melody) extra.melody = w.melody.id || true;
      if (w.echoBubble) extra.echoBubble = w.echoBubble.kind || w.echoBubble.name || true;
      if (w.echoWave) extra.echoWave = w.echoWave.kind || w.echoWave.name || true;
      return Object.keys(extra).length ? json(extra) : null;
    };
    for (const w of en.weapons) {
      const f = frIdx.weapons.get(w.id) || w;
      const c = w.crafting || {};
      const special = (w.specials || [])[0];
      const s = w.sharpness;
      const mats = [...(c.craftingMaterials || []), ...(c.upgradeMaterials || [])];
      mats.forEach(m => ensureItem(m.item));
      const rank = w.rarity >= 5 ? 'high' : 'low';
      insert('weapons', {
        id: w.id, kind: w.kind, rarity: w.rarity, rank, hr: hrFor(w.rarity, rank, mats),
        name_en: w.name, name_fr: f.name, desc_en: trim(w.description), desc_fr: trim(f.description),
        series_en: w.series ? w.series.name : null, series_fr: f.series ? f.series.name : null,
        attack: w.damage.display, attack_raw: w.damage.raw, affinity: w.affinity || 0,
        defense_bonus: w.defenseBonus || 0,
        element: special ? (special.element || special.status) : null,
        element_value: special ? special.damage.display : null,
        element_hidden: special && special.hidden ? 1 : 0,
        elderseal: w.elderseal || null,
        slots: json(w.slots || []),
        skills: json((w.skills || []).map(sk => [sk.skill.id, sk.level])),
        sharpness: s ? json([s.red, s.orange, s.yellow, s.green, s.blue, s.white, s.purple]) : null,
        handicraft: w.handicraft ? json(w.handicraft) : null,
        extra: weaponExtra(w),
        previous_id: c.previous ? c.previous.id : null,
        craftable: c.craftable ? 1 : 0,
        craft_zenny: c.craftingZennyCost || 0,
        upgrade_zenny: c.upgradeZennyCost || 0
      });
      for (const m of c.craftingMaterials || []) insert('weapon_materials', { weapon_id: w.id, item_id: m.item.id, quantity: m.quantity, type: 'craft' });
      for (const m of c.upgradeMaterials || []) insert('weapon_materials', { weapon_id: w.id, item_id: m.item.id, quantity: m.quantity, type: 'upgrade' });
    }

    // ---- Armor sets & pieces ---------------------------------------------
    for (const set of en['armor/sets']) {
      const f = frIdx['armor/sets'].get(set.id) || set;
      const pieces = set.pieces || [];
      const rarity = Math.max(...pieces.map(p => p.rarity), 1);
      const rank = pieces[0] ? pieces[0].rank : 'low';
      const allMats = pieces.flatMap(p => (p.crafting && p.crafting.materials) || []);
      allMats.forEach(m => ensureItem(m.item));
      insert('armor_sets', {
        id: set.id, rank, rarity, hr: hrFor(rarity, rank, allMats),
        name_en: set.name, name_fr: f.name,
        set_skill_id: set.setBonusSkill ? set.setBonusSkill.id : (set.bonus && set.bonus.skill ? set.bonus.skill.id : null),
        group_skill_id: set.groupBonusSkill ? set.groupBonusSkill.id : (set.groupBonus && set.groupBonus.skill ? set.groupBonus.skill.id : null)
      });
    }
    for (const a of en.armor) {
      const f = frIdx.armor.get(a.id) || a;
      const mats = (a.crafting && a.crafting.materials) || [];
      mats.forEach(m => ensureItem(m.item));
      const r = a.resistances || {};
      insert('armor', {
        id: a.id, set_id: a.armorSet ? a.armorSet.id : null, kind: a.kind, rank: a.rank, rarity: a.rarity,
        hr: hrFor(a.rarity, a.rank, mats),
        name_en: a.name, name_fr: f.name, desc_en: trim(a.description), desc_fr: trim(f.description),
        defense_base: a.defense.base, defense_max: a.defense.max,
        resistances: json([r.fire || 0, r.water || 0, r.thunder || 0, r.ice || 0, r.dragon || 0]),
        slots: json(a.slots || []),
        skills: json((a.skills || [])
          .filter(sk => !['set', 'group'].includes(skillKind.get(sk.skill.id)))
          .map(sk => [sk.skill.id, sk.level])),
        zenny: (a.crafting && a.crafting.zennyCost) || 0
      });
      for (const m of mats) insert('armor_materials', { armor_id: a.id, item_id: m.item.id, quantity: m.quantity });
    }

    // ---- Decorations -----------------------------------------------------
    for (const d of en.decorations) {
      const f = frIdx.decorations.get(d.id) || d;
      insert('decorations', {
        id: d.id, kind: d.kind, slot: d.slot, rarity: d.rarity, name_en: d.name, name_fr: f.name,
        skills: json((d.skills || []).map(sk => [sk.skill.id, sk.level]))
      });
    }

    // ---- Charms (talismans) ----------------------------------------------
    for (const ch of en.charms) {
      const f = frIdx.charms.get(ch.id) || ch;
      const frRanks = byId(f.ranks || []);
      for (const r of ch.ranks) {
        const fr = frRanks.get(r.id) || r;
        const c = r.crafting || {};
        const mats = c.materials || [];
        mats.forEach(m => ensureItem(m.item));
        insert('charms', {
          id: r.id, charm_id: ch.id, level: r.level, rarity: r.rarity,
          hr: hrFor(r.rarity, r.rarity >= 5 ? 'high' : 'low', mats),
          name_en: r.name, name_fr: fr.name,
          skills: json((r.skills || []).map(sk => [sk.skill.id, sk.level])),
          craftable: c.craftable ? 1 : 0, zenny: c.zennyCost || 0
        });
        for (const m of mats) insert('charm_materials', { charm_id: r.id, item_id: m.item.id, quantity: m.quantity });
      }
    }
  })();

  const count = t => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  console.log('Database ready:', ['weapons', 'armor', 'armor_sets', 'decorations', 'charms', 'skills', 'items', 'monsters']
    .map(t => `${t}=${count(t)}`).join(' '));
  db.pragma('journal_mode = DELETE');
  db.exec('VACUUM');
  db.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
