// Playstyle-based build generator working on the real gear database.

import { ARMOR_KINDS, ELEMENTS, STATUSES } from './i18n.js';
import { computeBuild, weaponPath } from './calc.js';

const MELEE_SHARP = new Set(['great-sword', 'long-sword', 'sword-shield', 'dual-blades', 'hammer', 'hunting-horn', 'lance', 'gunlance', 'switch-axe', 'charge-blade', 'insect-glaive']);
const RANGED = new Set(['bow', 'heavy-bowgun', 'light-bowgun']);
const SHIELDED = new Set(['sword-shield', 'lance', 'gunlance', 'charge-blade']);

// Weight per skill category (skill icon) and playstyle.
const CATEGORY = {
  aggressive: { attack: 3, affinity: 3, offense: 2.4, handicraft: 1.4, ranged: 1.6, utility: 0.6, health: 0.3, defense: 0.25, stamina: 0.4, item: 0.1, set: 2.6, group: 2.2 },
  defensive:  { attack: 1.4, affinity: 1.2, offense: 1, handicraft: 1, ranged: 0.8, utility: 1.2, health: 2.2, defense: 0.8, stamina: 0.8, item: 0.2, set: 1.8, group: 2 },
  technical:  { attack: 1.8, affinity: 1.8, offense: 1.8, handicraft: 2.4, ranged: 1.6, utility: 2, health: 0.8, defense: 0.6, stamina: 1.8, item: 0.2, set: 2, group: 2 },
  support:    { attack: 1.2, affinity: 1, offense: 1.4, handicraft: 1, ranged: 1, utility: 1.2, health: 1.8, defense: 0.6, stamina: 0.8, item: 0.5, set: 1.5, group: 1.8 },
  status:     { attack: 1.4, affinity: 1.6, offense: 1.6, handicraft: 1.2, ranged: 1.2, utility: 1, health: 0.8, defense: 0.6, stamina: 0.6, item: 0.4, set: 1.8, group: 1.8 },
  balanced:   { attack: 2.2, affinity: 2, offense: 1.8, handicraft: 1.4, ranged: 1.4, utility: 1.3, health: 1.4, defense: 1.3, stamina: 0.8, item: 0.3, set: 2.2, group: 2 },
  beginner:   { attack: 1.8, affinity: 1.4, offense: 1.2, handicraft: 1.2, ranged: 1.2, utility: 1.2, health: 2.4, defense: 0.8, stamina: 1, item: 0.3, set: 1.6, group: 1.8 }
};

// Fine-tuning per skill key and playstyle.
const SKILL = {
  aggressive: { 'weakness-exploit': 3.6, 'critical-boost': 3.4, agitator: 3.2, 'attack-boost': 3.2, 'critical-eye': 3, 'maximum-might': 2.6, burst: 2.8, 'latent-power': 2.2, counterstrike: 2.2, 'peak-performance': 2, 'adrenaline-rush': 1.4, resentment: 1.8, antivirus: 2, flayer: 1.6 },
  defensive: { 'divine-blessing': 3.2, 'defense-boost': 2.6, 'recovery-up': 2.4, 'recovery-speed': 2.4, 'stun-resistance': 2.2, earplugs: 2.2, 'flinch-free': 1.8, 'offensive-guard': 2.4, guard: 3.2, 'guard-up': 3, 'iron-skin': 1.4, constitution: 1, 'shock-absorber': 1.2 },
  technical: { 'evade-window': 3.4, 'evade-extender': 2.4, focus: 2.6, 'quick-sheathe': 2.2, 'razor-sharp': 2.2, handicraft: 2, 'master-s-touch': 2.2, constitution: 2, 'stamina-surge': 1.8, 'speed-sharpening': 1.6, 'critical-eye': 2.4, 'weakness-exploit': 2.6, 'power-prolonger': 2 },
  support: { 'wide-range': 3.4, 'horn-maestro': 3.4, 'speed-eating': 2, 'free-meal': 2, 'item-prolonger': 2.2, 'recovery-up': 2.2, 'paralysis-attack': 2.6, 'sleep-attack': 2.4, 'stamina-thief': 2, slugger: 1.6, earplugs: 2, 'divine-blessing': 1.8, 'palico-rally': 1.6, 'tool-specialist': 1.4 },
  status: { 'critical-status': 3, 'poison-duration-up': 1.6, 'critical-eye': 2.4, 'weakness-exploit': 2.6, agitator: 2.2, burst: 2 },
  balanced: { 'weakness-exploit': 2.8, 'critical-boost': 2.4, agitator: 2.4, 'attack-boost': 2.6, 'critical-eye': 2.4, 'divine-blessing': 2, 'recovery-up': 1.6, earplugs: 1.6, 'stun-resistance': 1.6, burst: 2, 'evade-window': 1.6 },
  beginner: { 'divine-blessing': 3.2, 'recovery-up': 2.8, 'recovery-speed': 2.6, 'defense-boost': 2.2, earplugs: 2.4, 'stun-resistance': 2.4, 'attack-boost': 2.4, 'evade-extender': 1.6, 'evade-window': 2, 'speed-eating': 1.6, 'flinch-free': 1.6 }
};

// Skills that only make sense on some weapons.
const WEAPON_ONLY = {
  artillery: ['gunlance', 'charge-blade'], 'load-shells': ['gunlance', 'charge-blade'],
  'rapid-morph': ['switch-axe', 'charge-blade'], 'horn-maestro': ['hunting-horn'], airborne: ['insect-glaive'],
  'critical-draw': ['great-sword', 'long-sword'], 'punishing-draw': ['great-sword', 'long-sword', 'hammer', 'hunting-horn'],
  'charge-up': ['great-sword', 'hammer', 'switch-axe'], 'charge-master': ['great-sword', 'hammer', 'bow', 'switch-axe'],
  slugger: ['hammer', 'hunting-horn'], 'bludgeoner': [], 'tetrad-shot': ['bow'], 'special-ammo-boost': ['heavy-bowgun', 'light-bowgun'],
  'opening-shot': ['heavy-bowgun', 'light-bowgun', 'bow'], 'evading-reload': ['heavy-bowgun', 'light-bowgun'],
  'rapid-fire-up': ['light-bowgun'], 'focus': ['great-sword', 'long-sword', 'bow', 'charge-blade', 'switch-axe', 'insect-glaive', 'heavy-bowgun'],
  'guard': [...SHIELDED, 'great-sword'], 'guard-up': [...SHIELDED, 'great-sword'], 'offensive-guard': [...SHIELDED],
  'synthetic-shield': [...SHIELDED]
};
const GATHERING = new Set(['geologist', 'botanist', 'entomologist', 'outdoorsman', 'catburglar', 'survival-expert',
  'hunger-resistance', 'stench-resistance', 'cliffhanger', 'jump-master', 'leap-of-faith', 'blindsider', 'intimidator',
  'palico-rally', 'rice-ball', 'grillmaster', 'crackling-cornpopper', 'tool-specialist']);
// Niche protections: only useful against specific monsters.
const NICHE = new Set(['bleeding-resistance', 'sleep-resistance', 'paralysis-resistance', 'poison-resistance', 'blast-resistance',
  'bind-resistance', 'tremor-resistance', 'windproof', 'aquatic-oilsilt-mobility', 'iron-skin', 'convert-thunder-resistance',
  'convert-water-resistance', 'self-improvement', 'bombardier', 'mushroomancer', 'stamina-thief',
  'imparted-wisdom', 'neopteron-alert', 'neopteron-camouflage', 'festival-spirit', 'scaling-prowess', 'alluring-pelt',
  'buttery-leathercraft']);
const ELEMENT_SKILL = { 'fire-attack': 'fire', 'water-attack': 'water', 'thunder-attack': 'thunder', 'ice-attack': 'ice', 'dragon-attack': 'dragon',
  'poison-attack': 'poison', 'paralysis-attack': 'paralysis', 'sleep-attack': 'sleep', 'blast-attack': 'blastblight' };
const RESIST_SKILL = { 'fire-resistance': 'fire', 'water-resistance': 'water', 'thunder-resistance': 'thunder', 'ice-resistance': 'ice', 'dragon-resistance': 'dragon' };
const DEF_WEIGHT = { aggressive: 0.01, defensive: 0.07, technical: 0.02, support: 0.03, status: 0.015, balanced: 0.035, beginner: 0.06 };

/** Weight of one skill level for the given context. */
function makeWeigher(ctx) {
  const cache = new Map();
  return skill => {
    if (cache.has(skill.id)) return cache.get(skill.id);
    const key = skill.key;
    let w = (SKILL[ctx.style] || {})[key];
    if (w === undefined) w = (CATEGORY[ctx.style] || CATEGORY.balanced)[skill.k === 'set' || skill.k === 'group' ? skill.k : skill.i] ?? 0.5;
    if (GATHERING.has(key)) w = 0;
    if (NICHE.has(key) && !(SKILL[ctx.style] || {})[key]) w = Math.min(w, 0.25);
    if (WEAPON_ONLY[key] && !WEAPON_ONLY[key].includes(ctx.kind)) w = 0;
    if (skill.i === 'handicraft' && !MELEE_SHARP.has(ctx.kind)) w = 0;
    if (skill.i === 'ranged' && !RANGED.has(ctx.kind)) w = 0;
    if (ELEMENT_SKILL[key]) w = ctx.element && ELEMENT_SKILL[key] === ctx.element ? 3 : 0;
    if (key === 'critical-element') w = ctx.element && ELEMENTS.includes(ctx.element) ? 2 : 0;
    if (key === 'critical-status') w = ctx.element && STATUSES.includes(ctx.element) ? (ctx.style === 'status' ? 3 : 1.5) : 0;
    if (RESIST_SKILL[key]) w = ctx.threat && ctx.threat === RESIST_SKILL[key] ? 1.4 : (ctx.style === 'defensive' ? 0.5 : 0.1);
    if (/^convert-/.test(key) || key === 'convert-element') w = Math.min(w, 0.6);
    cache.set(skill.id, w);
    return w;
  };
}

/** Score of a full build in a context (skills capped at max level, set bonuses by active rank). */
function scoreBuild(build, data, ctx, weigh) {
  const c = computeBuild(build, data, { light: !ctx.budget });
  let score = 0;
  for (const s of c.skills) score += weigh(s.skill) * s.level;
  for (const b of c.bonuses) if (b.active) score += weigh(b.skill) * 2.2 * b.active.l;
  score += c.stats.defMax * (DEF_WEIGHT[ctx.style] || 0.03);
  if (ctx.budget) score -= c.zenny / 5000;
  if (ctx.avoid) for (const id of Object.values(build.a)) if (ctx.avoid.has(id)) score -= 2.5;
  return { score, c };
}

function weaponScore(w, ctx, weigh, maxAtk, maxEv) {
  let s = (w.atk / maxAtk) * 12 + w.aff * 0.12 + w.s.reduce((a, b) => a + b, 0) * 0.5;
  if (ctx.element) {
    if (w.el === ctx.element) s += 4 + (w.ev / (maxEv || 1)) * 3;
    else if (w.el && !w.eh) s -= 1.2;
  } else if (ctx.style === 'status') {
    if (STATUSES.includes(w.el)) s += 4 + (w.ev / (maxEv || 1)) * 2;
  }
  for (const [id, lv] of w.sk) {
    const sk = ctx.data.skillById.get(id);
    if (sk) s += weigh(sk) * lv * 0.8;
  }
  if (w.sh && MELEE_SHARP.has(w.k)) s += (w.sh[5] + w.sh[6] * 1.5) / 60 + w.sh[4] / 120;
  return s;
}

/** Fills slots greedily with the decorations bringing the most value. */
function fillDecorations(build, data, ctx, weigh) {
  const c = computeBuild(build, data, { light: true });
  const levels = new Map(c.skills.map(s => [s.skill.id, s.points]));
  const maxRarity = ctx.hr < 10 ? 4 : ctx.hr < 21 ? 5 : ctx.hr < 41 ? 6 : 8;
  const pool = data.decorations.filter(d => d.r <= maxRarity);
  const slots = [];
  for (const [key, list] of Object.entries(c.r.slotsOf)) list.forEach((size, i) => slots.push({ key, i, size }));
  slots.sort((a, b) => b.size - a.size);
  const d = {};
  for (const slot of slots) {
    const kind = slot.key === 'w' ? 'weapon' : 'armor';
    let best = null, bestGain = 0.05;
    for (const deco of pool) {
      if (deco.k !== kind || deco.s > slot.size) continue;
      let gain = 0;
      for (const [id, lv] of deco.sk) {
        const sk = data.skillById.get(id);
        if (!sk) continue;
        const have = levels.get(id) || 0;
        gain += weigh(sk) * Math.max(0, Math.min(lv, sk.m - have));
      }
      gain -= deco.s * 0.01; // prefer smaller jewels at equal value
      if (gain > bestGain) { bestGain = gain; best = deco; }
    }
    if (!best) continue;
    (d[slot.key] = d[slot.key] || c.r.slotsOf[slot.key].map(() => null))[slot.i] = best.id;
    for (const [id, lv] of best.sk) levels.set(id, (levels.get(id) || 0) + lv);
  }
  return { ...build, d };
}

/** Picks the strongest element against a monster. */
export function monsterElement(monster) {
  if (!monster) return null;
  const el = monster.w.filter(([type]) => ELEMENTS.includes(type)).sort((a, b) => b[1] - a[1]);
  return el.length ? el[0][0] : null;
}
export function monsterStatus(monster) {
  if (!monster) return null;
  const st = monster.w.filter(([type]) => STATUSES.includes(type)).sort((a, b) => b[1] - a[1]);
  return st.length ? st[0][0] : null;
}

/**
 * @param {object} opts { kind, rank: 'low'|'high', hr, style, element: ''|'raw'|element, monsterId }
 * @returns [{ variant, build, score, ctx }]
 */
export function generateBuilds(opts, data) {
  const monster = opts.monsterId ? data.monsterById.get(+opts.monsterId) : null;
  let element = opts.element && opts.element !== 'raw' ? opts.element : null;
  if (!element && opts.element !== 'raw' && monster) {
    element = opts.style === 'status' ? monsterStatus(monster) || monsterElement(monster) : monsterElement(monster);
  }
  const lowOnly = opts.rank === 'low';
  const hr = Math.max(1, Math.min(999, +opts.hr || 1));
  const ctx = { kind: opts.kind, style: opts.style || 'balanced', element, hr, data, threat: null };
  const weigh = makeWeigher(ctx);
  const allowed = p => p.hr <= hr && (lowOnly ? p.rk === 'l' : true);

  // Weapons
  const weapons = (data.weaponsByKind.get(opts.kind) || []).filter(allowed);
  if (!weapons.length) return [];
  const maxAtk = Math.max(...weapons.map(w => w.atk));
  const maxEv = Math.max(1, ...weapons.filter(w => w.el === element).map(w => w.ev || 0));
  const ranked = weapons.map(w => ({ w, s: weaponScore(w, ctx, weigh, maxAtk, maxEv) })).sort((a, b) => b.s - a.s);

  // Armor candidates: best individual pieces per slot (+ set bonus potential).
  const candidates = {};
  for (const k of ARMOR_KINDS) {
    const list = (data.armorByKind.get(k) || []).filter(allowed);
    const indiv = p => {
      let s = p.d[1] * (DEF_WEIGHT[ctx.style] || 0.03) + p.s.reduce((a, b) => a + b, 0) * 0.45;
      for (const [id, lv] of p.sk) { const sk = data.skillById.get(id); if (sk) s += weigh(sk) * lv; }
      for (const id of [p.ss, p.gs]) { const sk = id && data.skillById.get(id); if (sk) s += weigh(sk) * 0.5; }
      return s;
    };
    candidates[k] = list.map(p => ({ p, s: indiv(p) })).sort((a, b) => b.s - a.s).slice(0, 18).map(x => x.p);
  }
  const charms = data.charms.filter(c => c.hr <= hr && (lowOnly ? c.r <= 4 : true));

  const optimize = (weapon, budget, avoid) => {
    const lctx = { ...ctx, budget, avoid };
    let build = { w: weapon.id, a: {}, c: null, d: {} };
    for (const k of ARMOR_KINDS) if (candidates[k][0]) build.a[k] = candidates[k][0].id;
    let best = scoreBuild(build, data, lctx, weigh).score;
    for (let pass = 0; pass < 3; pass++) {
      let improved = false;
      for (const k of ARMOR_KINDS) {
        for (const p of candidates[k]) {
          if (build.a[k] === p.id) continue;
          const trial = { ...build, a: { ...build.a, [k]: p.id } };
          const s = scoreBuild(trial, data, lctx, weigh).score;
          if (s > best + 1e-6) { best = s; build = trial; improved = true; }
        }
      }
      if (!improved) break;
    }
    // Charm: best of each family's highest available level.
    const top = new Map();
    for (const c of charms) if (!top.has(c.c) || top.get(c.c).l < c.l) top.set(c.c, c);
    for (const c of top.values()) {
      const trial = { ...build, c: c.id };
      const s = scoreBuild(trial, data, lctx, weigh).score;
      if (s > best + 1e-6) { best = s; build = trial; }
    }
    build = fillDecorations(build, data, lctx, weigh);
    return { build, score: scoreBuild(build, data, lctx, weigh).score };
  };

  const results = [];
  const best = optimize(ranked[0].w, false);
  results.push({ variant: 'best', ...best });

  // Alternative: the best weapon from another tree or element.
  const first = ranked[0].w;
  const alt = ranked.find(x => x.w.id !== first.id && (x.w.ser !== first.ser || x.w.el !== first.el));
  const used = new Set(Object.values(best.build.a));
  if (alt) results.push({ variant: 'alt', ...optimize(alt.w, false, used) });

  // Budget: cheapest weapon among the good ones, armor optimized with a cost penalty.
  const pathCost = w => weaponPath(w, data).reduce((s, x) => s + x.z, 0);
  const pool = ranked.filter(x => x.s >= ranked[0].s * 0.75).slice(0, 12);
  const cheap = pool.sort((a, b) => pathCost(a.w) - pathCost(b.w))[0];
  if (cheap) results.push({ variant: 'budget', ...optimize(cheap.w, true, used) });

  return results.map(r => ({ ...r, ctx: { element, monster: monster ? monster.id : null, style: ctx.style, hr, rank: opts.rank } }));
}
