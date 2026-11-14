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
const { HIGH_RANK_ONLY, hrForRarity, hrForMonster, hrForTempered, hrForArchTempered } = require('../lib/progression');

const API = 'https://wilds.mhdb.io';
const LOCALES = ['en', 'fr'];
const ENDPOINTS = ['weapons', 'armor', 'armor/sets', 'decorations', 'charms', 'skills', 'items', 'monsters', 'locations'];
const GATHERING = path.join(__dirname, 'gathering.json');
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

    // ---- Locations --------------------------------------------------------
    const locationByName = new Map();
    for (const l of en.locations) {
      const f = frIdx.locations.get(l.id) || l;
      locationByName.set(l.name.toLowerCase(), l.id);
      insert('locations', { id: l.id, zone_count: l.zoneCount || null, name_en: l.name, name_fr: f.name });
    }

    // ---- Monsters & drop sources ---------------------------------------
    // item id -> lowest HR at which it can be obtained (any source, any rank)
    const itemMinHr = new Map();
    const lowerHr = (itemId, hr) => {
      const prev = itemMinHr.get(itemId);
      if (prev === undefined || hr < prev) itemMinHr.set(itemId, hr);
    };
    const sourceSeen = new Set();
    for (const m of en.monsters) {
      const f = frIdx.monsters.get(m.id) || m;
      const large = m.kind === 'large';
      // Some High Rank materials (rarity 5+) are listed with a low-rank condition in the source data.
      const isLow = (rw, c) => c.rank === 'low' && rw.item.rarity <= 4 && !HIGH_RANK_ONLY.has(m.name);
      const inLowRank = (m.rewards || []).some(rw => (rw.conditions || []).some(c => isLow(rw, c)));
      const lowHr = large ? hrForMonster(m.name, 'low') : 1;
      const highHr = large ? hrForMonster(m.name, 'high') : 9;
      // Shown in the encyclopedia: the first HR at which the monster can be hunted.
      const hr = inLowRank ? lowHr : highHr;
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
      for (const l of m.locations || []) {
        if (locationByName.has(l.name.toLowerCase())) insert('monster_locations', { monster_id: m.id, location_id: l.id });
      }
      for (const rw of m.rewards || []) {
        ensureItem(rw.item);
        for (const c of rw.conditions || []) {
          insert('item_drops', {
            item_id: rw.item.id, monster_id: m.id, rank: c.rank, kind: c.kind, part: c.part || null,
            quantity: c.quantity || 1, chance: Math.round(c.chance || 0)
          });
          const key = `${rw.item.id}:${m.id}:${c.rank}`;
          if (!sourceSeen.has(key)) {
            sourceSeen.add(key);
            insert('item_sources', { item_id: rw.item.id, monster_id: m.id, rank: c.rank });
          }
          lowerHr(rw.item.id, isLow(rw, c) ? lowHr : highHr);
        }
      }
    }

    // ---- Gathering spots and other sources (wiki supplement) -------------
    const monsterByName = new Map(en.monsters.map(m => [m.name.toLowerCase(), m.id]));
    const itemByName = new Map(en.items.map(i => [i.name.toLowerCase(), i.id]));
    const other = row => insert('item_other_sources', { name: null, monster_id: null, rank: null, method: null, chance: null, ...row });
    const documented = new Set();
    const gathering = fs.existsSync(GATHERING) ? JSON.parse(fs.readFileSync(GATHERING, 'utf8')).items : {};
    for (const [name, info] of Object.entries(gathering)) {
      const itemId = itemByName.get(name.toLowerCase());
      if (!itemId) continue;
      documented.add(itemId);
      for (const loc of info.locations || []) {
        const id = locationByName.get(loc.toLowerCase());
        if (id) insert('item_locations', { item_id: itemId, location_id: id });
      }
      if ((info.locations || []).length) lowerHr(itemId, 1); // gathered on the maps: rarity floor applies
      const seen = new Set();
      for (const m of info.monsters || []) {
        const label = m.name.replace(/\s+/g, ' ').trim();
        const tempered = label.match(/^Tempered (.+)$/i);
        if (tempered && monsterByName.has(tempered[1].toLowerCase())) {
          other({ item_id: itemId, type: 'tempered', monster_id: monsterByName.get(tempered[1].toLowerCase()), rank: 'high' });
          lowerHr(itemId, hrForTempered(en.monsters.find(x => x.name.toLowerCase() === tempered[1].toLowerCase()).name));
        } else if (/tempered/i.test(label)) {
          if (!seen.has('tempered-any')) { seen.add('tempered-any'); other({ item_id: itemId, type: 'tempered', rank: 'high' }); }
          // "Tier 7/8 tempered apex" style sources: last tempered tier.
          lowerHr(itemId, /tier 7|tier 8|apex/i.test(label) ? hrForTempered('Arkveld') : hrForTempered('Chatacabra'));
        } else if (/frenzied/i.test(label)) {
          other({ item_id: itemId, type: 'frenzied' });
          lowerHr(itemId, 16);
        } else if (m.rates && m.rates.length && /^[A-Za-z' .-]{3,30}$/.test(label)) {
          // Small monster with documented rates. "+" materials only exist in High Rank.
          const rank = /\+$/.test(name) ? 'high' : m.rank;
          lowerHr(itemId, rank === 'high' ? 9 : 1);
          for (const [method, chance] of m.rates) {
            const key = `${label}:${rank}:${method}`;
            if (seen.has(key)) continue;
            seen.add(key);
            other({ item_id: itemId, type: 'small-monster', name: label, rank, method: /carve/i.test(method) ? 'carve' : 'drop', chance });
          }
        }
      }
      for (const q of info.quests || []) {
        const quest = q.replace(/\(\s*(Limited-Time )?(Event Quest|Side Mission|Optional Quest)\s*\)/i, '').replace(/\s+/g, ' ').trim();
        if (!quest || /goes here|^[-?]+$/i.test(quest) || quest.length > 60) continue;
        other({ item_id: itemId, type: 'quest', name: quest });
      }
    }
    // Sources that follow a naming rule in the game.
    for (const it of en.items) {
      if (documented.has(it.id)) continue;
      const cert = it.name.match(/^(.+) Certificate γ$/);
      if (cert && monsterByName.has(cert[1].toLowerCase())) {
        other({ item_id: it.id, type: 'arch-tempered', monster_id: monsterByName.get(cert[1].toLowerCase()), rank: 'high' });
        lowerHr(it.id, hrForArchTempered(en.monsters.find(x => x.name.toLowerCase() === cert[1].toLowerCase()).name));
      }
      else if (/^(Chata|Rathian|Pinnacle) Coin$/.test(it.name)) other({ item_id: it.id, type: 'arena' });
      else if (/^(Blossomdance|Flamefete|Dreamspell|Lumenhymn) (Ticket|Catalog)$/.test(it.name)) other({ item_id: it.id, type: 'event' });
    }

    // HR needed for a recipe: rarity tier, raised by the hardest material to get.
    // Each material counts at its easiest source; unknown sources fall back to the rarity floor.
    const hrFor = (rarity, rank, materials) => {
      let hr = hrForRarity(rarity);
      for (const m of materials) {
        const h = itemMinHr.get(m.item.id);
        if (h && h > hr) hr = h;
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
  console.log('Database ready:', ['weapons', 'armor', 'armor_sets', 'decorations', 'charms', 'skills', 'items', 'monsters',
    'locations', 'item_drops', 'item_locations', 'item_other_sources']
    .map(t => `${t}=${count(t)}`).join(' '));
  // Fold the write-ahead log back into the main file so the database file is complete.
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.pragma('journal_mode = DELETE');
    db.exec('VACUUM');
  } catch (err) {
    console.warn('Note: the database is in use by a running server. Restart it to load the new data.');
  }
  db.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
