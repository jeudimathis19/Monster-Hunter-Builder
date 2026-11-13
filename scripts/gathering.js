'use strict';

/**
 * Collects where to find the crafting materials that no large monster drops
 * (ores, bones, small monster parts, tickets...) from the community wiki
 * (monsterhunterwilds.wiki.fextralife.com) and writes scripts/gathering.json.
 *
 * The seed script reads that JSON, so this only needs to be re-run after a
 * game update:  npm run gathering && npm run data
 *
 *   node scripts/gathering.js [--cache=dir]   (cache: keep downloaded pages)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const WIKI = 'https://monsterhunterwilds.wiki.fextralife.com';
const OUT = path.join(__dirname, 'gathering.json');
const cacheArg = process.argv.find(a => a.startsWith('--cache='));
const cacheDir = cacheArg ? path.resolve(cacheArg.slice('--cache='.length)) : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const LOCATIONS = ['Windward Plains', 'Scarlet Forest', 'Oilwell Basin', 'Iceshard Cliffs', 'Ruins of Wyveria'];

function toText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<(br|\/p|\/li|\/h\d|\/tr|\/div)[^>]*>/g, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
}

/** Parses the "How to get" block of an item page. */
function parse(html, name) {
  const text = toText(html);
  const start = text.indexOf('How to get');
  if (start < 0) return null;
  const rest = text.slice(start);
  const endAt = rest.search(/\n[^\n]*Usage in Monster Hunter Wilds/);
  const lines = rest.slice(0, endAt > 0 ? endAt : 2500).split('\n').map(l => l.trim()).filter(Boolean);
  const out = { quests: [], monsters: [], locations: [] };
  let section = null, current = null;
  const empty = l => /^(n\/a|none|tba|\?+|-)$/i.test(l);
  for (const line of lines.slice(1)) {
    if (/^Quests? & Rewards/i.test(line)) { section = 'quests'; continue; }
    if (/^Monsters that drop/i.test(line)) { section = 'monsters'; continue; }
    if (/^Locations with/i.test(line)) { section = 'locations'; continue; }
    if (/^This material can be obtained/i.test(line) || empty(line)) continue;
    if (section === 'quests' && line.length < 70) out.quests.push(line);
    if (section === 'locations') {
      const loc = LOCATIONS.find(l => line.toLowerCase().startsWith(l.toLowerCase()));
      if (loc && !out.locations.includes(loc)) out.locations.push(loc);
    }
    if (section === 'monsters') {
      const rate = line.match(/^(.+?)\s*:?\s*(\d{1,3})\s*%/);
      if (rate && current) current.rates.push([rate[1].trim(), +rate[2]]);
      else if (!rate && line.length < 60) {
        const m = line.match(/^(.+?)\s*\((Low|High) Rank\)\s*$/i);
        current = { name: (m ? m[1] : line).trim(), rank: m ? m[2].toLowerCase() : null, rates: [] };
        out.monsters.push(current);
      }
    }
  }
  out.quests = [...new Set(out.quests)].slice(0, 12);
  if (!out.quests.length && !out.monsters.length && !out.locations.length) return null;
  return out;
}

async function fetchPage(name) {
  const slug = encodeURIComponent(name).replace(/%20/g, '+');
  const file = cacheDir ? path.join(cacheDir, `${slug}.html`) : null;
  if (file && fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const res = await fetch(`${WIKI}/${slug}`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; data-import)' }, redirect: 'follow' });
  if (!res.ok) return null;
  const html = await res.text();
  if (file) fs.writeFileSync(file, html);
  await sleep(350);
  return html;
}

async function main() {
  const db = new Database(path.join(__dirname, '..', 'monster_hunter.db'), { readonly: true });
  // Crafting materials without any large monster drop.
  const items = db.prepare(`
    SELECT id, name_en FROM items
    WHERE id IN (SELECT item_id FROM weapon_materials UNION SELECT item_id FROM armor_materials UNION SELECT item_id FROM charm_materials)
      AND id NOT IN (SELECT item_id FROM item_sources)
    ORDER BY id`).all();
  db.close();
  if (cacheDir) fs.mkdirSync(cacheDir, { recursive: true });

  const result = {};
  let found = 0;
  for (const item of items) {
    let info = null;
    try {
      const html = await fetchPage(item.name_en);
      info = html ? parse(html, item.name_en) : null;
    } catch (err) {
      console.warn(`  ! ${item.name_en}: ${err.message}`);
    }
    if (info) { result[item.name_en] = info; found++; }
    console.log(`${info ? '✓' : '·'} ${item.name_en}`);
  }
  fs.writeFileSync(OUT, JSON.stringify({ source: WIKI, generated: new Date().toISOString().slice(0, 10), items: result }, null, 1));
  console.log(`\n${found}/${items.length} materials documented -> ${path.relative(process.cwd(), OUT)}`);
}

main().catch(err => { console.error(err); process.exit(1); });
