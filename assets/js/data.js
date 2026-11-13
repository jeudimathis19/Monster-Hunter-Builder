// Loads and indexes the localized game data bundles from /data.

const cache = new Map();

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

const byId = list => new Map(list.map(x => [x.id, x]));
const groupBy = (list, key) => {
  const map = new Map();
  for (const x of list) {
    if (!map.has(x[key])) map.set(x[key], []);
    map.get(x[key]).push(x);
  }
  return map;
};

function index(d) {
  d.skillById = byId(d.skills);
  d.skillByKey = new Map(d.skills.map(s => [s.key, s]));
  d.itemById = byId(d.items);
  d.monsterById = byId(d.monsters);
  d.weaponById = byId(d.weapons);
  d.armorById = byId(d.armor);
  d.setById = byId(d.sets);
  d.decoById = byId(d.decorations);
  d.charmById = byId(d.charms);
  d.weaponsByKind = groupBy(d.weapons, 'k');
  d.armorByKind = groupBy(d.armor, 'k');
  d.armorBySet = groupBy(d.armor, 'set');
  d.charmsByFamily = groupBy(d.charms, 'c');

  for (const a of d.armor) {
    const set = d.setById.get(a.set);
    a.ss = set ? set.ss : undefined;
    a.gs = set ? set.gs : undefined;
    a.setKey = set ? set.key : '';
  }
  // Weapon upgrade tree: children per weapon.
  d.weaponChildren = new Map();
  for (const w of d.weapons) {
    if (!w.p) continue;
    if (!d.weaponChildren.has(w.p)) d.weaponChildren.set(w.p, []);
    d.weaponChildren.get(w.p).push(w.id);
  }
  // Which gear uses each material (for the encyclopedia).
  d.itemUsage = new Map();
  const use = (itemId, ref) => {
    if (!d.itemUsage.has(itemId)) d.itemUsage.set(itemId, []);
    d.itemUsage.get(itemId).push(ref);
  };
  for (const w of d.weapons) for (const [i] of w.m) use(i, ['weapon', w.id]);
  for (const a of d.armor) for (const [i] of a.m) use(i, ['armor', a.id]);
  for (const c of d.charms) for (const [i] of c.m) use(i, ['charm', c.id]);
  return d;
}

export function loadData(lang) {
  const key = `core:${lang}`;
  if (!cache.has(key)) {
    const p = getJSON(`data/${lang}.json`).then(index);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key);
}

export function loadText(lang) {
  const key = `text:${lang}`;
  if (!cache.has(key)) cache.set(key, getJSON(`data/${lang}-text.json`).catch(() => ({ weapons: {}, armor: {}, items: {}, monsters: {} })));
  return cache.get(key);
}

export function loadFeatured() {
  if (!cache.has('featured')) cache.set('featured', getJSON('data/featured.json').catch(() => []));
  return cache.get('featured');
}

export function loadLooks() {
  if (!cache.has('looks')) cache.set('looks', getJSON('data/looks.json').catch(() => []));
  return cache.get('looks');
}
