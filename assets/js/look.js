// Colors and shapes used by the hunter renders, derived from armor sets.

import { ARMOR_KINDS } from './i18n.js';

// Signature colors per monster / set family (matched against the set key).
const SET_COLORS = [
  ['gogmazios', '#3a2a2e', '#c2402e'], ['guardian-ebony', '#2c2329', '#b23a3a'], ['ebony', '#2c2329', '#b23a3a'],
  ['guardian-fulgur', '#3b3530', '#e0b93a'], ['fulgur', '#3b3530', '#e0b93a'],
  ['guardian-rathalos', '#9a2c24', '#e0a33a'], ['rathalos', '#a8322a', '#2f2a26'], ['rathian', '#5f7f3a', '#c9b06a'],
  ['guardian-arkveld', '#59606e', '#c9c2b0'], ['arkveld', '#4f5868', '#8fd0e0'], ['arkvulcan', '#4f5868', '#8fd0e0'],
  ['guardian-doshaguma', '#6b4a32', '#d8c49a'], ['doshaguma', '#7a5638', '#d8c49a'], ['doshagumask', '#7a5638', '#d8c49a'],
  ['rey-dau', '#d2a636', '#33302c'], ['uth-duna', '#3e6e8e', '#d9d2c0'], ['nu-udra', '#5a1f22', '#e26a2c'],
  ['jin-dahaad', '#8ec0d8', '#e8f2f6'], ['dahaad', '#8ec0d8', '#e8f2f6'], ['numinous', '#e9e3d1', '#c9a95a'],
  ['zoh-shia', '#e9e3d1', '#c9a95a'], ['gore', '#43354d', '#a6a0a8'], ['bale', '#2f2a3a', '#7e5ab0'],
  ['lagiacrus', '#2f5f9a', '#e0d6b8'], ['mizutsune', '#e3b6c6', '#f4efe6'], ['seregios', '#c9a43a', '#3f5a3a'],
  ['omega', '#9fb3c8', '#e04a5a'], ['balahara', '#c9b48a', '#6a5a40'], ['chatacabra', '#6f8a5a', '#d9c9a0'],
  ['quematrice', '#d06a2c', '#3a2a22'], ['lala-barina', '#c2405a', '#f0d0c0'], ['conga', '#d48aa6', '#6a3a4a'],
  ['nerscylla', '#5b4a7a', '#d0c0a0'], ['hirabami', '#6c8592', '#e0d8c8'], ['ajarakan', '#c4562e', '#2e2a28'],
  ['gravios', '#6b6560', '#d0582e'], ['blango', '#d9dde0', '#7a8a96'], ['kut-ku', '#d98a8a', '#5a4a6a'],
  ['gypceros', '#6b5aa0', '#d0c040'], ['xu-wu', '#3d3a46', '#9a8ab8'], ['rompopolo', '#7b3fa0', '#e0a0c0'],
  ['rompomask', '#7b3fa0', '#e0a0c0'], ['vespoid', '#b68a2a', '#2a2a2a'], ['talioth', '#8a7a5a', '#d0c0a0'],
  ['hope', '#4a6a8a', '#d8cba8'], ['bone', '#d8cdb0', '#7a6a50'], ['alloy', '#8a8f96', '#d0c8b8'],
  ['leather', '#8a5a3a', '#d0b890'], ['chainmail', '#7a8088', '#5a4a3a'], ['kranodath', '#5a6a4a', '#c0a060'],
  ['damascus', '#5a6a7a', '#d0b060'], ['dragonking', '#2a2a30', '#d03030'], ['akuma', '#3a2020', '#d04030'],
  ['guild-knight', '#2e3a5a', '#d0b060'], ['guild-ace', '#8a2a2a', '#e0c070'], ['guild-cross', '#2a2a2a', '#e0c070'],
  ['artian', '#7a7a80', '#e0a040'], ['butterfly', '#6a9ac0', '#f0e0a0'], ['melahoa', '#5a8a4a', '#e0d0a0'],
  ['commission', '#4a5a6a', '#d0c0a0'], ['king-beetle', '#3a4a2a', '#c0a030'], ['high-metal', '#8a9aa8', '#3a3a3a'],
  ['death-stench', '#3a3a30', '#8a9a5a'], ['azure-age', '#2f6fa0', '#e0e0e0'], ['gelidron', '#a0c8e0', '#3a5a7a'],
  ['orion', '#3a3a5a', '#d0d0f0'], ['sakuratide', '#e8b0c0', '#6a3a4a'], ['blossom', '#e8b0c0', '#5a7a4a'],
  ['gala-suit', '#1e1e24', '#d0b070'], ['feudal-soldier', '#6a3a2a', '#c0a060'], ['noblesse', '#4a2a5a', '#d0b070']
];

// Weapon styles per crafting tree: palette and motifs inspired by the monster (original shapes).
// edge: blade outline; shield: shield outline; other keys toggle ornaments in the 3D model.
const WEAPON_STYLES = [
  ['g. rathalos', { p: '#d6d2ca', s: '#d8552e', edge: 'serrated', shield: 'wingp', claw: true, spikes: true, glow: '#ff9a3a' }],
  ['rathalos', { p: '#a8322a', s: '#2f2a26', edge: 'serrated', shield: 'wingp', claw: true, spikes: true }],
  ['rathian', { p: '#5f7f3a', s: '#d8cba0', edge: 'leaf', shield: 'round', barb: true, scales: true }],
  ['g. arkveld', { p: '#d8d8dc', s: '#3a3a44', edge: 'cleaver', shield: 'kite', chains: true, glow: '#cfe8ff' }],
  ['arkveld', { p: '#3e4450', s: '#c9ccd6', edge: 'cleaver', shield: 'kite', chains: true, glow: '#cfe8ff' }],
  ['rey dau', { p: '#d2a636', s: '#2a2622', edge: 'jagged', shield: 'shard', bladefins: true, glow: '#ffe45c' }],
  ['uth duna', { p: '#2e4e6e', s: '#d9d2c0', edge: 'leaf', shield: 'round', membrane: true }],
  ['nu udra', { p: '#2a1c1e', s: '#e26a2c', edge: 'curved', shield: 'round', tentacle: true, glow: '#ff6a2a' }],
  ['jin dahaad', { p: '#9cc8dc', s: '#eef6fa', edge: 'jagged', shield: 'hexp', crystals: true, glow: '#bff3ff' }],
  ['zoh shia', { p: '#ece6d4', s: '#c9a95a', edge: 'straight', shield: 'kite', halo: true, glow: '#ffe9a8' }],
  ['g. doshaguma', { p: '#7a6a5a', s: '#e0d6c2', edge: 'cleaver', shield: 'round', fur: true }],
  ['doshaguma', { p: '#6b4a32', s: '#d8c49a', edge: 'cleaver', shield: 'round', fur: true, claw: true }],
  ['gore magala', { p: '#2f2a3a', s: '#8a6ab0', edge: 'jagged', shield: 'wingp', membrane: true, spikes: true }],
  ['mizutsune', { p: '#ead6de', s: '#e08aaa', edge: 'curved', shield: 'round', bubbles: true, fur: true }],
  ['lagiacrus', { p: '#2f5f9a', s: '#e8e0c8', edge: 'serrated', shield: 'hexp', spikes: true, glow: '#9fdcff' }],
  ['seregios', { p: '#c9a43a', s: '#3f4a3a', edge: 'serrated', shield: 'shard', bladefins: true }],
  ['quematrice', { p: '#8a3a22', s: '#ffb04a', edge: 'jagged', shield: 'kite', spikes: true, glow: '#ff9a3a' }],
  ['lala barina', { p: '#c2405a', s: '#f0d6c6', edge: 'leaf', shield: 'round', petals: true }],
  ['balahara', { p: '#c9b48a', s: '#4a6a7a', edge: 'curved', shield: 'round', scales: true }],
  ['hirabami', { p: '#5a7a96', s: '#e4e8ee', edge: 'leaf', shield: 'kite', membrane: true }],
  ['nerscylla', { p: '#3a3046', s: '#c04a6a', edge: 'jagged', shield: 'hexp', spikes: true }],
  ['congalala', { p: '#c86a8a', s: '#5a3a2a', edge: 'cleaver', shield: 'round', fur: true }],
  ['blangonga', { p: '#e4e6e8', s: '#8a9aa8', edge: 'straight', shield: 'round', fur: true, spikes: true }],
  ['yian kut-ku', { p: '#d88a7a', s: '#e8dcc0', edge: 'leaf', shield: 'round', membrane: true }],
  ['gypceros', { p: '#6b5aa0', s: '#d0c040', edge: 'leaf', shield: 'round', scales: true }],
  ['ajarakan', { p: '#8a3a22', s: '#ffb04a', edge: 'cleaver', shield: 'hexp', spikes: true, rock: true, glow: '#ff8a3a' }],
  ['gravios', { p: '#5e5a58', s: '#d0582e', edge: 'cleaver', shield: 'hexp', rock: true, glow: '#ff7a2a' }],
  ['g. fulgur', { p: '#d8d0c0', s: '#3a8fd8', edge: 'serrated', shield: 'kite', fur: true, spikes: true, glow: '#9fdcff' }],
  ['g. ebony', { p: '#2a2a2e', s: '#c8442b', edge: 'jagged', shield: 'wingp', spikes: true, fur: true }],
  ['xu wu', { p: '#3d3a46', s: '#c8c0d8', edge: 'curved', shield: 'round', tentacle: true }],
  ['rompopolo', { p: '#5a3a6a', s: '#8ad84a', edge: 'jagged', shield: 'round', spikes: true, glow: '#a8ff6a' }],
  ['chatacabra', { p: '#7a8a5a', s: '#d9c9a0', edge: 'cleaver', shield: 'round', rock: true, bone: true }],
  ['omega', { p: '#e8e8ec', s: '#3a8fd8', edge: 'straight', shield: 'hexp', tech: true, glow: '#6ad8ff' }],
  ['vespoid', { p: '#c8a03a', s: '#2a2420', edge: 'straight', shield: 'kite', membrane: true }],
  ['bone', { p: '#d8cdb0', s: '#7a5a3a', edge: 'cleaver', shield: 'round', bone: true }],
  ['ore', { p: '#8c8a86', s: '#c9b892', edge: 'straight', shield: 'kite', rivets: true }],
  ['expedition', { p: '#9a9690', s: '#8a5a3a', edge: 'straight', shield: 'kite', rivets: true }],
  ['workshop', { p: '#9a9690', s: '#c9a46a', edge: 'straight', shield: 'kite', rivets: true }],
  ['dark knight', { p: '#2a2a30', s: '#b23a3a', edge: 'jagged', shield: 'kite', spikes: true }],
  ['azure', { p: '#2f6fa0', s: '#e0e0e0', edge: 'straight', shield: 'kite' }]
];
const BASE_STYLE = { edge: 'straight', shield: 'kite' };

/** Style of a weapon from its crafting tree ("Rathalos Tree" -> Rathalos style). */
export function weaponStyle(tree) {
  const t = String(tree || '').toLowerCase().replace(/ tree$/, '');
  const hit = WEAPON_STYLES.find(([k]) => t === k || t.startsWith(k + ' ') || t.startsWith(k));
  return hit ? hit[1] : BASE_STYLE;
}

export const SKIN_TONES = ['#f2d0b4', '#e0b08a', '#c68e64', '#9a6a46', '#6e4a32', '#4a3020'];
export const UNDERSUIT = '#35302b';

const hashHue = s => {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 360;
};
const hsl = (h, s, l) => {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
};

/** Default colors of an armor piece, from its set. */
export function pieceColors(piece) {
  if (!piece) return { p: UNDERSUIT, s: '#5a5048' };
  const key = piece.setKey || '';
  const hit = SET_COLORS.find(([k]) => key === k || key.startsWith(k + '-') || key.includes(k));
  if (hit) return { p: hit[1], s: hit[2] };
  const h = hashHue(key || String(piece.id));
  return { p: hsl(h, 32, 42), s: hsl((h + 40) % 360, 45, 70) };
}

const ELEMENT_COLORS = {
  fire: '#e0562e', water: '#3a8fd8', thunder: '#e8c43a', ice: '#9ad8f0', dragon: '#9a3048',
  poison: '#8a4ab0', paralysis: '#d8c040', sleep: '#5a8ad0', blastblight: '#e08a3a'
};
export const elementColor = el => ELEMENT_COLORS[el] || '#c9c2b0';

// Helmet silhouettes, picked per set so each family looks distinct.
const HEAD_SHAPES = ['horns', 'crest', 'visor', 'hood', 'crown', 'plume', 'mask'];
export function headShape(piece) {
  if (!piece) return 'bare';
  const key = piece.setKey || '';
  if (/glasses|spectacles|shades|eyepatch|earring|ears|frames|circlet|visor|wig|necklace/.test(key)) return 'accessory';
  if (/rathalos|rathian|gore|bale|arkveld|arkvulcan|akuma|dragonking|gogmazios/.test(key)) return 'horns';
  if (/numinous|zoh|guild|noblesse|king/.test(key)) return 'crown';
  if (/lagiacrus|mizutsune|lala|plume|kut-ku|quematrice/.test(key)) return 'plume';
  if (/dosha|conga|blango|hope|leather/.test(key)) return 'hood';
  return HEAD_SHAPES[hashHue(key) % HEAD_SHAPES.length];
}

/**
 * Builds the look description used by the renderers.
 * @param {object} r     resolved build ({ weapon, armor })
 * @param {object} colors optional overrides { head: {p, s}, ..., w: {p, s}, skin: {p} }
 */
export function lookFor(r, colors = {}) {
  const parts = {};
  for (const k of ARMOR_KINDS) {
    const piece = r.armor[k] || null;
    const base = pieceColors(piece);
    const o = colors[k] || {};
    parts[k] = { piece, p: o.p || base.p, s: o.s || base.s, rarity: piece ? piece.r : 0 };
  }
  const w = r.weapon;
  const wo = colors.w || {};
  return {
    parts,
    head: headShape(r.armor.head),
    skin: (colors.skin && colors.skin.p) || SKIN_TONES[1],
    weapon: w ? weaponLook(w, wo) : null
  };
}

function weaponLook(w, wo) {
  const st = weaponStyle(w.ser);
  return { kind: w.k, p: wo.p || st.p || '#8c8a86', s: wo.s || st.s || elementColor(w.el), rarity: w.r, style: st, element: elementColor(w.el) };
}

export const PALETTES = {
  wilds: ['#c9a46a', '#7a5638', '#e0c890', '#5a4030', '#d8b878'],
  ember: ['#a8322a', '#2f2a26', '#e0562e', '#3a2420', '#e0a33a'],
  frost: ['#8ec0d8', '#e8f2f6', '#3e6e8e', '#d0e8f0', '#5a8ab0'],
  shadow: ['#2c2329', '#43354d', '#1e1e24', '#5a4a6a', '#b23a3a'],
  royal: ['#2e3a5a', '#d0b060', '#4a2a5a', '#e9e3d1', '#c9a95a'],
  forest: ['#5f7f3a', '#3a4a2a', '#c9b06a', '#6f8a5a', '#2a3a20']
};

export function randomColor() {
  return hsl(Math.floor(Math.random() * 360), 25 + Math.random() * 45, 25 + Math.random() * 45);
}
