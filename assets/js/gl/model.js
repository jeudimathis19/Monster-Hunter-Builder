// Procedural hunter model: anatomy + armor shells whose silhouette follows each armor family
// (horns, fur, robes, fins, crystals, spikes...). Units are meters, y up, +z faces the camera.

import { chain, translate, scale, rotX, rotY, rotZ, alignY, hex } from './math.js';
import { UNDERSUIT } from '../look.js';

// Visual traits per armor family (matched against the set key).
const TRAITS = [
  ['gogmazios', { horns: 'big', spikes: true, bulk: 1.18, metal: 0.6, glow: true }],
  ['guardian-ebony', { spikes: true, fur: true, bulk: 1.08 }],
  ['ebony', { spikes: true, fur: true, bulk: 1.08 }],
  ['guardian-fulgur', { horns: 'back', spikes: true, bulk: 1.12, fur: true }],
  ['fulgur', { horns: 'back', spikes: true, bulk: 1.12, fur: true }],
  ['guardian-rathalos', { horns: 'back', spikes: true, wings: 'small', metal: 0.45 }],
  ['rathalos', { horns: 'back', spikes: true, wings: 'small', metal: 0.45 }],
  ['rathian', { horns: 'small', spikes: true, metal: 0.35 }],
  ['guardian-arkveld', { horns: 'back', chains: true, bulk: 1.1, metal: 0.55 }],
  ['arkvulcan', { horns: 'back', chains: true, fins: true, bulk: 1.12, metal: 0.65 }],
  ['arkveld', { horns: 'back', chains: true, fins: true, bulk: 1.1, metal: 0.6 }],
  ['guardian-doshaguma', { fur: true, bulk: 1.2 }],
  ['doshaguma', { fur: true, bulk: 1.22 }],
  ['rey-dau', { fins: true, horns: 'back', metal: 0.55, glow: true }],
  ['uth-duna', { robe: true, fins: true, metal: 0.3 }],
  ['nu-udra', { tentacles: true, horns: 'curved', glow: true }],
  ['dahaad', { crystals: true, bulk: 1.15, metal: 0.7 }],
  ['numinous', { robe: true, cape: true, head: 'crown', metal: 0.4 }],
  ['gore', { horns: 'curved', cape: true, spikes: true }],
  ['bale', { horns: 'curved', cape: true, bulk: 1.1, metal: 0.5 }],
  ['lagiacrus', { spikes: true, fins: true, metal: 0.45 }],
  ['mizutsune', { fins: true, fur: true, head: 'plume', sheen: 0.25 }],
  ['regios', { fins: true, spikes: true, metal: 0.6 }],
  ['seregios', { fins: true, spikes: true, metal: 0.6 }],
  ['omega', { tech: true, metal: 0.9, bulk: 1.05, glow: true }],
  ['balahara', { head: 'hood', scales: true, bulk: 0.95 }],
  ['chatacabra', { bulk: 1.15, head: 'mask' }],
  ['quematrice', { head: 'crest', spikes: true }],
  ['barina', { fins: true, head: 'plume' }],
  ['conga', { fur: true, bulk: 1.15 }],
  ['nerscylla', { spikes: true, head: 'mask' }],
  ['hirabami', { head: 'hood', fins: true }],
  ['ajarakan', { horns: 'small', bulk: 1.16, glow: true }],
  ['gravios', { bulk: 1.32, tech: true, metal: 0.3 }],
  ['blango', { fur: true, bulk: 1.15 }],
  ['kut-ku', { head: 'crest', fins: true }],
  ['gypceros', { head: 'crest' }],
  ['xu-wu', { tentacles: true, head: 'hood' }],
  ['rompopolo', { head: 'mask', spikes: true }],
  ['rompomask', { head: 'mask' }],
  ['vespoid', { wings: 'insect', head: 'mask' }],
  ['butterfly', { wings: 'insect', head: 'crown', bulk: 0.92 }],
  ['melahoa', { leaves: true, robe: true, head: 'hood', bulk: 0.95 }],
  ['sakuratide', { robe: true, head: 'crown', bulk: 0.9 }],
  ['blossom', { robe: true, bulk: 0.9 }],
  ['gala-suit', { robe: true, bulk: 0.9 }],
  ['noblesse', { robe: true, cape: true, bulk: 0.9 }],
  ['guild-knight', { cape: true, head: 'plume', bulk: 0.95 }],
  ['guild-ace', { cape: true, head: 'plume', bulk: 0.95 }],
  ['guild-cross', { cape: true, bulk: 0.95 }],
  ['feudal-soldier', { head: 'crest', metal: 0.4 }],
  ['damascus', { tech: true, metal: 0.85, bulk: 1.1 }],
  ['dragonking', { horns: 'curved', metal: 0.7, bulk: 1.1 }],
  ['akuma', { horns: 'big', bulk: 1.1 }],
  ['high-metal', { tech: true, metal: 0.95 }],
  ['king-beetle', { horns: 'beetle', metal: 0.6, bulk: 1.12 }],
  ['death-stench', { cape: true, head: 'hood' }],
  ['bone', { spikes: true, head: 'mask', bulk: 1.05 }],
  ['hope', { light: true, head: 'hood' }],
  ['leather', { light: true, head: 'hood' }],
  ['alloy', { metal: 0.7, head: 'visor' }],
  ['chainmail', { metal: 0.6, chains: true, head: 'visor' }],
  ['artian', { tech: true, metal: 0.8 }],
  ['kunafa', { light: true, head: 'hood' }],
  ['sild', { light: true, head: 'hood' }],
  ['suja', { light: true }],
  ['azuz', { light: true }],
  ['comaqchi', { head: 'plume' }],
  ['bulaqchi', { head: 'mask' }],
  ['talioth', { scales: true }],
  ['gajau', { fins: true }],
  ['piragill', { fins: true }],
  ['dober', { light: true }],
  ['ingot', { metal: 0.8, tech: true }],
  ['commission', { light: true }],
  ['expedition', { light: true }],
  ['gelidron', { crystals: true }],
  ['orion', { tech: true, metal: 0.7, glow: true }],
  ['cosmoloid', { tech: true, metal: 0.9, glow: true }],
  ['dreamwalker', { robe: true, head: 'hood' }],
  ['azure-age', { cape: true, metal: 0.5 }],
  ['sororal', { robe: true }]
];

function traitsFor(piece) {
  if (!piece) return {};
  const key = piece.setKey || '';
  const hit = TRAITS.find(([k]) => key === k || key.startsWith(k + '-') || key.includes(k));
  const t = hit ? { ...hit[1] } : {};
  t.rarity = piece.r;
  return t;
}

export function buildModel(look) {
  const parts = [];
  const P = (mesh, m, color, mat = {}) => parts.push({ mesh, m, color: Array.isArray(color) ? color : hex(color), ...mat });

  // Material presets
  // Surface patterns: 1 hammered metal, 2 leather, 3 scales, 4 fur, 5 cloth, 6 bone, 7 crystal.
  const cloth = { spec: 0.06, shin: 8, pattern: 5, bump: 0.35, vary: 0.1 };
  const leather = { spec: 0.22, shin: 16, sheen: 0.04, pattern: 2, bump: 0.6, vary: 0.16 };
  const skinMat = { spec: 0.12, shin: 16, sheen: 0.05, pattern: 2, bump: 0.08, vary: 0.03 };
  const furMat = { spec: 0.03, shin: 4, sheen: 0.16, pattern: 4, bump: 1.4, vary: 0.32 };
  const boneMat = { spec: 0.35, shin: 26, sheen: 0.08, pattern: 6, bump: 0.7, vary: 0.18 };
  const gemMat = { spec: 1, shin: 110, emit: 0.18, sheen: 0.25, pattern: 7, bump: 0.25, vary: 0.12, metal: 0.35 };
  const rivetMat = { spec: 1, shin: 90, metal: 0.9, pattern: 1, bump: 0.2, vary: 0.05 };
  const armorMat = t => {
    const metal = t.metal ?? 0.3;
    return {
      spec: 0.2 + metal * 0.75, shin: 22 + metal * 70, sheen: t.sheen || 0.03, metal: metal > 0.4 ? metal * 0.8 : metal * 0.4,
      pattern: t.scales ? 3 : t.fur && metal < 0.4 ? 2 : 1, bump: t.scales ? 1.0 : 0.55, vary: t.scales ? 0.22 : 0.14
    };
  };

  // ---------------------------------------------------------------- Shape helpers
  const ell = (c, r, color, mat, rot = [0, 0, 0], mesh = 'sphere') =>
    P(mesh, chain(translate(...c), rotY(rot[1]), rotX(rot[0]), rotZ(rot[2]), scale(...r)), color, mat);
  const limb = (p0, p1, r0, r1, color, mat, mesh = 'tube') => {
    const { m, len } = alignY(p0, p1);
    const t = r1 / r0;
    P(mesh === 'tube' && Math.abs(t - 1) > 0.03 ? `tube:${t.toFixed(2)}` : mesh, chain(m, scale(r0, len, r0)), color, mat);
  };
  const capsule = (p0, p1, r, color, mat) => { limb(p0, p1, r, r, color, mat); ell(p0, [r, r, r], color, mat); ell(p1, [r, r, r], color, mat); };
  const cone = (base, tip, r, color, mat) => { const { m, len } = alignY(base, tip); P('cone', chain(m, scale(r, len, r)), color, mat); };
  const box = (c, half, color, mat, rot = [0, 0, 0], mesh = 'box') =>
    P(mesh, chain(translate(...c), rotY(rot[1]), rotX(rot[0]), rotZ(rot[2]), scale(...half)), color, mat);
  const ring = (c, r, color, mat, rot = [0, 0, 0]) => P('ring', chain(translate(...c), rotY(rot[1]), rotX(rot[0]), rotZ(rot[2]), scale(...r)), hex(color), mat);
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mulv = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  /** Curved, tapering horn following a quadratic curve from base, through ctrl, to tip. */
  const horn = (base, ctrl, tip, r, color, mat, segs = 6) => {
    const at = t => add(add(mulv(base, (1 - t) * (1 - t)), mulv(ctrl, 2 * (1 - t) * t)), mulv(tip, t * t));
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const r0 = r * (1 - t0 * 0.9), r1 = r * (1 - t1 * 0.9);
      if (i === segs - 1) cone(at(t0), at(t1), r0, color, mat);
      else { limb(at(t0), at(t1), r0, r1, color, mat); ell(at(t1), [r1, r1, r1], color, mat, [0, 0, 0], 'lowsphere'); }
    }
  };
  /** Small spikes pointing along `dir` from each base point. */
  const spikes = (bases, dir, len, r, color, mat) => bases.forEach((b, i) => cone(b, add(b, mulv(dir, len * (1 - (i % 2) * 0.25))), r, color, mat));
  /** Fur ruff: tufts arranged on an ellipse. */
  const ruff = (c, rx, rz, n, len, color, tilt = 0.6) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const base = [c[0] + Math.cos(a) * rx, c[1], c[2] + Math.sin(a) * rz];
      const tip = [c[0] + Math.cos(a) * (rx + len * tilt), c[1] - len * (1 - tilt) + (i % 3) * 0.008, c[2] + Math.sin(a) * (rz + len * tilt)];
      cone(base, tip, 0.024 + (i % 2) * 0.006, color, furMat);
    }
  };
  /** Stack of overlapping plates (lames), each smaller and lower. */
  const lames = (c, half, n, step, color, mat, rot = [0, 0, 0], shrink = 0.9) => {
    for (let i = 0; i < n; i++) {
      const k = Math.pow(shrink, i);
      box([c[0], c[1] - i * step, c[2] + i * 0.004], [half[0] * k, half[1], half[2]], color, mat, rot, 'slab');
    }
  };
  /** Row of small round rivets. */
  const rivets = (points, r = 0.007) => points.forEach(pt => ell(pt, [r, r, r * 0.7], '#c9b892', rivetMat, [0, 0, 0], 'lowsphere'));
  const crystalCluster = (c, dir, color, n = 3, size = 1) => {
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * 0.45;
      P('crystal', chain(translate(c[0], c[1], c[2]), rotZ(dir + a), rotX(-0.3 + i * 0.2), scale(0.028 * size, (0.1 - i * 0.015) * size, 0.028 * size)), hex(color), gemMat);
    }
  };

  const skin = look.skin;
  const suit = UNDERSUIT;
  const part = k => look.parts[k] || { piece: null };
  const head = part('head'), chest = part('chest'), arms = part('arms'), waist = part('waist'), legs = part('legs');
  const T = { head: traitsFor(head.piece), chest: traitsFor(chest.piece), arms: traitsFor(arms.piece), waist: traitsFor(waist.piece), legs: traitsFor(legs.piece) };
  const bulk = k => (part(k).piece ? (T[k].bulk || 1) : 1);
  const glowMat = k => ({ ...armorMat(T[k]), emit: T[k].glow ? 0.3 : 0 });
  // Accent material for spikes/horns: bone-like unless the family is metallic or glowing.
  const accentMat = k => (T[k].glow ? { ...gemMat, emit: 0.25 } : (T[k].metal || 0) > 0.55 ? { spec: 0.9, shin: 80 } : boneMat);
  // Rarer gear gets more ornaments.
  const rich = k => (part(k).piece ? part(k).piece.r >= 6 : false);

  // ---------------------------------------------------------------- Body (undersuit + skin)
  ell([0, 1.635, 0.005], [0.1, 0.122, 0.112], skin, skinMat);
  limb([0, 1.47, 0], [0, 1.56, 0], 0.048, 0.045, skin, skinMat);
  P('tube:1.32', chain(translate(0, 1.0, 0), scale(0.145, 0.44, 0.1)), hex(suit), cloth);
  ell([0, 1.44, 0], [0.19, 0.06, 0.13], suit, cloth);
  ell([0, 0.96, 0], [0.165, 0.11, 0.115], suit, cloth);
  const SH = 0.235, HIP = 0.095;
  for (const s of [-1, 1]) {
    capsule([s * SH, 1.41, 0], [s * 0.285, 1.14, 0.01], 0.055, suit, cloth);
    capsule([s * 0.285, 1.14, 0.01], [s * 0.315, 0.9, 0.05], 0.047, suit, cloth);
    ell([s * 0.322, 0.84, 0.06], [0.04, 0.05, 0.035], skin, skinMat);
    capsule([s * HIP, 0.93, 0], [s * 0.105, 0.53, 0.015], 0.074, suit, cloth);
    capsule([s * 0.105, 0.53, 0.015], [s * 0.11, 0.1, -0.005], 0.058, suit, cloth);
    ell([s * 0.11, 0.045, 0.045], [0.055, 0.04, 0.11], '#2a221c', leather);
  }

  // ---------------------------------------------------------------- Head
  const ht = T.head;
  if (head.piece) {
    const shape = ht.head || look.head;
    const hm = glowMat('head'), am = accentMat('head');
    const b = bulk('head');
    if (shape === 'accessory') {
      ell([0, 1.69, -0.01], [0.105, 0.075, 0.118], '#2a211b', furMat, [0, 0, 0], 'dome');
      box([0, 1.645, 0.105], [0.088, 0.016, 0.01], head.p, hm);
      for (const s of [-1, 1]) ell([s * 0.045, 1.645, 0.112], [0.032, 0.022, 0.006], head.s, { spec: 1, shin: 90, alpha: 0.85 });
    } else if (shape === 'hood' || ht.light) {
      ell([0, 1.65, -0.02], [0.128 * b, 0.145 * b, 0.135 * b], head.p, { ...leather, sheen: 0.06 });
      ell([0, 1.6, 0.085], [0.07, 0.085, 0.03], skin, skinMat);
      ring([0, 1.6, 0.05], [0.09, 0.3, 0.07], head.s, leather, [1.35, 0, 0]);                 // hood rim
      ell([0, 1.53, -0.01], [0.135, 0.045, 0.125], head.s, leather);                           // collar
      box([0, 1.56, 0.105], [0.06, 0.03, 0.012], head.s, leather, [-0.2, 0, 0], 'slab');       // face scarf
      if (rich('head')) for (const s of [-1, 1]) ell([s * 0.11, 1.7, -0.02], [0.012, 0.05, 0.06], head.s, leather, [0, 0, s * 0.5]);
    } else {
      // Helmet: shell, crest ridge, brow, visor, cheek guards and a neck guard.
      ell([0, 1.66, -0.005], [0.123 * b, 0.135 * b, 0.13 * b], head.p, hm);
      box([0, 1.745, -0.01], [0.014, 0.05, 0.12 * b], head.s, hm, [0, 0, 0], 'slab');          // crest ridge
      ell([0, 1.665, 0.062], [0.115 * b, 0.022, 0.1], head.s, hm, [0.25, 0, 0]);               // brow band
      box([0, 1.622, 0.118 * b], [0.07, 0.016, 0.014], '#120d0a', { spec: 0.6, shin: 60, emit: ht.glow ? 0.6 : 0 }); // visor slit
      box([0, 1.582, 0.118 * b], [0.055, 0.03, 0.016], head.p, hm, [-0.25, 0, 0], 'slab');     // mouth guard
      for (const s of [-1, 1]) box([s * 0.098 * b, 1.6, 0.05], [0.018, 0.05, 0.055], head.p, hm, [0, s * 0.35, s * 0.15], 'slab'); // cheek guards
      ell([0, 1.575, -0.085], [0.12 * b, 0.055, 0.07], head.p, hm, [0.5, 0, 0], 'dome');       // neck guard
      if (shape === 'mask') { box([0, 1.6, 0.122 * b], [0.075, 0.065, 0.018], head.s, hm, [0, 0, 0], 'slab'); for (const s of [-1, 1]) ell([s * 0.035, 1.62, 0.14 * b], [0.016, 0.008, 0.004], '#0a0705', { emit: ht.glow ? 0.8 : 0 }); }
      if (shape === 'visor') box([0, 1.635, 0.125 * b], [0.095, 0.03, 0.018], head.s, hm, [0, 0, 0], 'slab');
      if (shape === 'crest' || ht.head === 'crest') { ell([0, 1.8, -0.04], [0.012, 0.085, 0.14], head.s, hm); spikes([[0, 1.84, -0.05], [0, 1.83, -0.11], [0, 1.8, -0.16]], [0, 0.4, -0.9], 0.07, 0.012, head.s, am); }
      if (shape === 'plume') horn([0, 1.76, -0.02], [0, 1.86, -0.12], [0, 1.74, -0.32], 0.035, head.s, { ...furMat, sheen: 0.25 }, 5);
      if (shape === 'crown') for (const [x, h] of [[-0.08, 0.08], [-0.04, 0.11], [0, 0.15], [0.04, 0.11], [0.08, 0.08]]) cone([x, 1.755, 0.05], [x * 1.25, 1.755 + h, 0.06], 0.016, head.s, am);
    }
    const horns = ht.horns || (!ht.head && shape !== 'hood' && shape !== 'accessory' && rich('head') ? 'small' : null);
    if (horns && shape !== 'accessory') for (const s of [-1, 1]) {
      if (horns === 'back') horn([s * 0.075, 1.735, -0.01], [s * 0.15, 1.83, -0.06], [s * 0.14, 1.84, -0.3], 0.034, head.s, am);
      if (horns === 'small') horn([s * 0.075, 1.74, 0.01], [s * 0.1, 1.82, -0.02], [s * 0.11, 1.84, -0.1], 0.024, head.s, am, 4);
      if (horns === 'curved') horn([s * 0.095, 1.72, 0], [s * 0.26, 1.76, -0.02], [s * 0.22, 1.92, -0.14], 0.034, head.s, am, 7);
      if (horns === 'big') { horn([s * 0.09, 1.73, -0.01], [s * 0.26, 1.86, -0.02], [s * 0.27, 1.98, -0.26], 0.045, head.s, am, 7); horn([s * 0.1, 1.69, -0.06], [s * 0.2, 1.7, -0.18], [s * 0.17, 1.76, -0.34], 0.026, head.s, am, 5); }
    }
    if (horns === 'beetle') horn([0, 1.75, 0.09], [0, 1.88, 0.14], [0, 1.98, 0.05], 0.035, head.s, am, 6);
    if (ht.spikes && shape !== 'accessory' && shape !== 'hood') spikes([[0, 1.79, 0.0], [0, 1.78, -0.06], [0, 1.75, -0.11]], [0, 0.6, -0.8], 0.08, 0.014, head.s, am);
    if (ht.fins) for (const s of [-1, 1]) { ell([s * 0.13, 1.7, -0.05], [0.01, 0.06, 0.13], head.s, hm, [0.2, 0, s * 0.45]); ell([s * 0.12, 1.64, -0.07], [0.008, 0.035, 0.09], head.s, hm, [0.3, 0, s * 0.6]); }
    if (ht.crystals) for (const s of [-1, 1]) crystalCluster([s * 0.09, 1.76, -0.04], s * -0.5, head.s, 2, 0.8);
    if (ht.fur) ruff([0, 1.54, -0.01], 0.12, 0.11, 14, 0.07, head.s, 0.55);
  } else {
    ell([0, 1.7, -0.015], [0.105, 0.075, 0.118], '#2a211b', furMat, [0, 0, 0], 'dome');
    for (const s of [-1, 1]) ell([s * 0.035, 1.645, 0.103], [0.012, 0.008, 0.006], '#1a1410', skinMat);
  }

  // ---------------------------------------------------------------- Chest
  const ct = T.chest;
  if (chest.piece) {
    const cm = glowMat('chest'), am = accentMat('chest'), b = bulk('chest');
    if (ct.robe) {
      P('tube:1.28', chain(translate(0, 0.98, 0), scale(0.16 * b, 0.47, 0.115 * b)), hex(chest.p), { ...cloth, sheen: 0.08 });
      ell([0, 1.45, 0], [0.2 * b, 0.065, 0.14 * b], chest.p, { ...cloth, sheen: 0.08 });
      for (const s of [-1, 1]) box([s * 0.05, 1.27, 0.13 * b], [0.07, 0.21, 0.012], chest.s, cloth, [-0.06, s * 0.25, s * -0.12], 'slab'); // crossed lapels
      ring([0, 1.08, 0.004], [0.165 * b, 0.25, 0.12 * b], chest.s, leather);   // sash
      box([0.06, 1.06, 0.13 * b], [0.035, 0.05, 0.012], chest.s, leather, [0, 0, 0.3], 'slab');
    } else {
      P('tube:1.3', chain(translate(0, 1.03, 0.005), scale(0.162 * b, 0.42, 0.115 * b)), hex(chest.p), cm);
      ell([0, 1.45, 0], [0.212 * b, 0.075, 0.145 * b], chest.p, cm);
      for (const s of [-1, 1]) box([s * 0.075, 1.32, 0.118 * b], [0.085 * b, 0.11, 0.032], chest.p, cm, [-0.12, s * 0.28, 0], 'slab'); // pectoral plates
      box([0, 1.335, 0.155 * b], [0.022, 0.1, 0.014], chest.s, cm, [-0.12, 0, 0]);         // sternum ridge
      for (const sd of [-1, 1]) rivets([[sd * 0.13 * b, 1.4, 0.13 * b], [sd * 0.145 * b, 1.33, 0.135 * b], [sd * 0.14 * b, 1.26, 0.13 * b]]);
      for (const sd of [-1, 1]) box([sd * 0.075, 1.215, 0.135 * b], [0.08 * b, 0.008, 0.02], chest.s, cm, [-0.12, sd * 0.28, 0]); // plate edge trims
      ell([0, 1.39, 0.165 * b], [0.03, 0.03, 0.012], chest.s, ht.glow || ct.glow ? gemMat : cm); // chest emblem
      for (const [y, k] of [[1.19, 1], [1.13, 0.97], [1.07, 0.94]]) ring([0, y, 0.004], [0.154 * b * k, 0.13, 0.11 * b * k], chest.s, cm); // abdominal lames
      for (const s of [-1, 1]) box([s * 0.1, 1.38, -0.11 * b], [0.07, 0.12, 0.02], chest.p, cm, [0.15, s * -0.3, 0], 'slab'); // back plates
    }
    ring([0, 1.47, 0], [0.098 * b, 0.07, 0.088 * b], chest.s, cm);                 // collar
    box([0, 1.48, 0.07], [0.07, 0.03, 0.02], chest.p, cm, [-0.5, 0, 0], 'slab');      // gorget
    for (const s of [-1, 1]) {
      // Layered pauldrons with a trimmed edge.
      for (const [i, k] of [[0, 1], [1, 0.86], [2, 0.72]]) ell([s * (0.262 + i * 0.018), 1.44 - i * 0.035, 0], [0.11 * b * k, 0.075 * b * k, 0.11 * b * k], i === 1 ? chest.s : chest.p, cm, [0, 0, s * (-0.35 - i * 0.15)], 'dome');
      ring([s * 0.29, 1.405, 0], [0.085 * b, 0.25, 0.085 * b], chest.s, cm, [0, 0, s * -0.5]);
      rivets([0, 1, 2, 3, 4].map(i => { const a = -0.9 + i * 0.45; return [s * (0.29 + Math.cos(a) * 0.04), 1.43 + Math.sin(a) * 0.012, Math.sin(a) * 0.075 * b]; }), 0.008);
      if (ct.spikes) spikes([[s * 0.28, 1.49, 0.03], [s * 0.3, 1.48, -0.02], [s * 0.32, 1.46, -0.06]], [s * 0.45, 0.85, -0.3], 0.1, 0.018, chest.s, am);
      if (ct.fins) { ell([s * 0.33, 1.52, -0.07], [0.01, 0.11, 0.08], chest.s, cm, [0.3, 0, s * -0.6]); ell([s * 0.35, 1.45, -0.08], [0.008, 0.07, 0.06], chest.s, cm, [0.4, 0, s * -0.9]); }
      if (ct.crystals) crystalCluster([s * 0.3, 1.5, -0.02], s * -0.5, chest.s, 3, 1.1);
      if (ct.horns && !ct.spikes) horn([s * 0.28, 1.48, -0.02], [s * 0.36, 1.56, -0.04], [s * 0.37, 1.62, -0.12], 0.025, chest.s, am, 4);
    }
    if (ct.fur) ruff([0, 1.47, -0.01], 0.17, 0.12, 18, 0.09, chest.s, 0.5);
    if (ct.spikes) spikes([[0, 1.42, -0.125 * b], [0, 1.33, -0.13 * b], [0, 1.24, -0.125 * b], [0, 1.15, -0.115 * b], [0, 1.07, -0.105 * b]], [0, 0.35, -0.94], 0.1, 0.02, chest.s, am);
    if (ct.crystals) for (const [x, y] of [[-0.08, 1.38], [0.07, 1.26], [0, 1.45]]) crystalCluster([x, y, -0.14], 0, chest.s, 2, 1);
    if (ct.scales) for (let r = 0; r < 3; r++) for (let i = -2; i <= 2; i++) ell([i * 0.05 + (r % 2) * 0.025, 1.3 - r * 0.06, 0.13 * b], [0.028, 0.03, 0.008], chest.s, cm, [-0.1, 0, 0]);
    if (ct.cape) { box([0, 1.05, -0.17], [0.2, 0.38, 0.012], chest.s, { ...cloth, sheen: 0.06 }, [0.12, 0, 0], 'slab'); for (const x of [-0.14, -0.05, 0.05, 0.14]) cone([x, 0.7, -0.22], [x * 1.1, 0.62, -0.23], 0.03, chest.s, cloth); }
    if (ct.wings === 'small') for (const s of [-1, 1]) { horn([s * 0.1, 1.38, -0.14], [s * 0.3, 1.5, -0.25], [s * 0.42, 1.35, -0.3], 0.02, chest.s, am, 5); ell([s * 0.27, 1.32, -0.24], [0.17, 0.1, 0.008], chest.p, cm, [0.2, s * 0.55, s * 0.45]); }
    if (ct.wings === 'insect') for (const s of [-1, 1]) for (const [y, r] of [[1.36, 0.22], [1.15, 0.16]]) ell([s * 0.16, y, -0.18], [r, r * 0.6, 0.008], chest.s, { spec: 0.6, shin: 40, alpha: 0.85, sheen: 0.3 }, [0.1, s * 0.4, s * 0.5]);
    if (ct.chains) { ring([0, 1.23, 0.005], [0.2, 0.15, 0.135], chest.s, { spec: 0.9, shin: 70 }, [0.25, 0, 0]); for (let i = 0; i < 5; i++) ring([-0.12 + i * 0.06, 1.2 + Math.abs(i - 2) * 0.02, 0.13], [0.022, 0.4, 0.022], chest.s, { spec: 0.9, shin: 70 }, [0, 0, i % 2 ? 1.57 : 0]); }
    if (ct.leaves) for (let i = 0; i < 9; i++) ell([Math.cos(i * 0.8) * 0.16, 1.47 - (i % 3) * 0.08, -0.1 + Math.sin(i * 0.8) * 0.06], [0.065, 0.012, 0.11], chest.s, cloth, [0.6, i * 0.8, 0.3]);
    if (ct.tech) for (const s of [-1, 1]) box([s * 0.12, 1.2, 0.12 * b], [0.02, 0.06, 0.01], chest.s, { ...gemMat, emit: 0.5 });
  }

  // ---------------------------------------------------------------- Arms
  const at = T.arms;
  for (const s of [-1, 1]) {
    if (!arms.piece) continue;
    const am = glowMat('arms'), acc = accentMat('arms'), b = bulk('arms');
    const robeSleeve = at.robe || T.chest.robe;
    limb([s * 0.282, 1.16, 0.01], [s * 0.318, 0.88, 0.05], 0.066 * b, (robeSleeve ? 0.09 : 0.056) * b, arms.p, robeSleeve ? cloth : am); // vambrace
    if (!robeSleeve) for (const y of [1.06, 0.96]) ring([s * (0.296 + (1.16 - y) * 0.12), y, 0.026], [0.064 * b, 0.25, 0.064 * b], arms.s, am, [0, 0, s * -0.12]);
    ell([s * 0.283, 1.15, 0.012], [0.064 * b, 0.052 * b, 0.064 * b], arms.s, am);      // elbow cop
    if (!robeSleeve) rivets([[s * 0.305, 1.06, 0.09], [s * 0.315, 0.96, 0.095]], 0.007);
    cone([s * 0.29, 1.15, -0.03], [s * 0.31, 1.15, -0.1], 0.025, arms.s, at.spikes ? acc : am); // elbow point
    limb([s * 0.245, 1.4, 0], [s * 0.28, 1.2, 0.01], 0.066 * b, 0.06 * b, arms.p, { ...am, spec: am.spec * 0.8 }); // rerebrace
    ring([s * 0.255, 1.33, 0.003], [0.068 * b, 0.25, 0.068 * b], arms.s, am, [0, 0, s * -0.15]);
    // Gauntlet: back plate, knuckles and fingers (claws for beastly families).
    ell([s * 0.322, 0.85, 0.06], [0.05, 0.058, 0.045], arms.p, am);
    box([s * 0.335, 0.855, 0.085], [0.035, 0.045, 0.012], arms.s, am, [0, s * 0.25, 0], 'slab');
    const claws = at.spikes || at.horns || at.fur;
    for (let f = 0; f < 4; f++) {
      const x = s * (0.305 + f * 0.012), z = 0.08 + f * 0.004;
      if (claws) cone([x, 0.8, z], [x + s * 0.005, 0.74, z + 0.03], 0.009, arms.s, acc);
      else limb([x, 0.81, z], [x, 0.775, z + 0.012], 0.009, 0.008, arms.p, am);
    }
    if (at.fins) { ell([s * 0.355, 1.0, -0.005], [0.01, 0.14, 0.055], arms.s, am, [0, 0, s * -0.25]); ell([s * 0.35, 0.93, -0.02], [0.008, 0.08, 0.04], arms.s, am, [0.2, 0, s * -0.4]); }
    if (at.spikes) spikes([[s * 0.33, 1.05, -0.03], [s * 0.335, 0.98, -0.035], [s * 0.34, 0.91, -0.03]], [s * 0.55, 0.15, -0.8], 0.07, 0.015, arms.s, acc);
    if (at.fur) ruff([s * 0.3, 1.12, 0.02], 0.065, 0.065, 9, 0.05, arms.s, 0.6);
    if (at.chains) for (const y of [0.95, 1.03]) ring([s * (0.3 + (1.03 - y) * 0.1), y, 0.035], [0.07, 0.07, 0.07], arms.s, { spec: 0.9, shin: 70 });
    if (at.crystals) crystalCluster([s * 0.35, 1.02, -0.02], s * -0.4, arms.s, 2, 0.9);
  }

  // ---------------------------------------------------------------- Waist
  const wt = T.waist;
  if (waist.piece) {
    const wm = glowMat('waist'), acc = accentMat('waist'), b = bulk('waist');
    P('tube', chain(translate(0, 0.94, 0), scale(0.172 * b, 0.075, 0.122 * b)), hex(waist.p), wm);   // belt
    ring([0, 0.975, 0], [0.175 * b, 0.12, 0.125 * b], waist.s, wm);
    box([0, 0.975, 0.127 * b], [0.04, 0.038, 0.012], waist.s, { spec: 0.9, shin: 70 }, [0, 0, 0], 'slab'); // buckle
    for (const s of [-1, 1]) box([s * 0.13 * b, 0.93, 0.09 * b], [0.035, 0.035, 0.025], '#4a3424', leather, [0, s * 0.6, 0], 'slab'); // pouches
    rivets([-3, -2, -1, 1, 2, 3].map(i => { const a = Math.PI / 2 + i * 0.32; return [Math.cos(a) * 0.177 * b, 0.975, Math.sin(a) * 0.127 * b]; }), 0.007);
    const robe = wt.robe || T.chest.robe;
    if (robe) {
      P('tube:0.56', chain(translate(0, 0.31, 0), scale(0.32 * b, 0.63, 0.26 * b)), hex(waist.p), { ...cloth, sheen: 0.08 });
      ring([0, 0.33, 0], [0.31 * b, 0.05, 0.25 * b], waist.s, cloth);
      ring([0, 0.6, 0], [0.25 * b, 0.04, 0.2 * b], waist.s, cloth);
      box([0, 0.66, 0.2 * b], [0.07, 0.25, 0.01], waist.s, cloth, [-0.18, 0, 0], 'slab'); // front panel
    } else {
      // Front tassets (layered), back fauld and side plates.
      for (const s of [-1, 1]) lames([s * 0.09, 0.84, 0.115 * b], [0.075, 0.055, 0.012], 3, 0.065, waist.p, wm, [-0.2, s * -0.25, 0]);
      for (const s of [-1, 1]) box([s * 0.09, 0.665, 0.13 * b], [0.055, 0.012, 0.014], waist.s, wm, [-0.2, s * -0.25, 0]);
      lames([0, 0.85, -0.12 * b], [0.13, 0.06, 0.012], 3, 0.07, waist.p, wm, [0.2, Math.PI, 0]);
      for (const s of [-1, 1]) box([s * 0.17 * b, 0.82, 0], [0.012, 0.11, 0.08], waist.p, wm, [0, 0, s * 0.18], 'slab');
      if (wt.spikes) for (const s of [-1, 1]) cone([s * 0.1, 0.66, 0.13 * b], [s * 0.11, 0.6, 0.16 * b], 0.014, waist.s, acc);
    }
    if (wt.tentacles) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      horn([Math.cos(a) * 0.15, 0.9, Math.sin(a) * 0.11], [Math.cos(a) * 0.25, 0.7, Math.sin(a) * 0.2], [Math.cos(a + 0.4) * 0.22, 0.42, Math.sin(a + 0.4) * 0.17], 0.024, waist.s, { spec: 0.4, shin: 30, emit: wt.glow ? 0.2 : 0 }, 6);
    }
    if (wt.fur) ruff([0, 0.9, 0], 0.18, 0.13, 16, 0.08, waist.s, 0.3);
    if (wt.chains) ring([0, 0.9, 0], [0.19, 0.1, 0.14], waist.s, { spec: 0.9, shin: 70 }, [0, 0, 0.15]);
    if (wt.crystals) for (const s of [-1, 1]) crystalCluster([s * 0.17, 0.9, -0.03], s * -0.6, waist.s, 2, 0.8);
  }

  // ---------------------------------------------------------------- Legs
  const lt = T.legs;
  for (const s of [-1, 1]) {
    if (!legs.piece) continue;
    const lm = glowMat('legs'), acc = accentMat('legs'), b = bulk('legs');
    limb([s * 0.1, 0.9, 0.005], [s * 0.106, 0.58, 0.02], 0.084 * b, 0.072 * b, legs.p, { ...lm, spec: lm.spec * 0.7 }); // cuisse
    box([s * 0.105, 0.75, 0.07 * b], [0.055, 0.12, 0.018], legs.p, lm, [-0.05, 0, 0], 'slab');      // thigh plate
    ell([s * 0.107, 0.53, 0.06], [0.062 * b, 0.072 * b, 0.042], legs.s, lm);                          // knee cop
    for (const k of [-1, 1]) ell([s * 0.107 + k * 0.05, 0.53, 0.04], [0.02, 0.04, 0.03], legs.p, lm, [0, k * 0.6, 0]); // knee wings
    limb([s * 0.107, 0.5, 0.015], [s * 0.11, 0.1, -0.005], 0.074 * b, 0.068 * b, legs.p, lm);         // greave
    box([s * 0.108, 0.32, 0.07 * b], [0.04, 0.15, 0.012], legs.s, lm, [0.03, 0, 0], 'slab');           // shin ridge
    for (const y of [0.42, 0.2]) ring([s * 0.109, y, 0.005], [0.075 * b, 0.25, 0.075 * b], legs.s, lm);
    rivets([[s * 0.108, 0.42, 0.083 * b], [s * 0.108, 0.2, 0.083 * b], [s * 0.108, 0.62, 0.095 * b]], 0.008);
    ell([s * 0.11, 0.06, 0.05], [0.07 * b, 0.058, 0.13], legs.p, lm);                                  // sabaton
    cone([s * 0.11, 0.05, 0.15], [s * 0.11, 0.035, 0.22], 0.035, legs.s, lm);                         // pointed toe
    ell([s * 0.11, 0.032, 0.07], [0.072 * b, 0.022, 0.135], legs.s, leather);                        // sole
    if (lt.spikes) { cone([s * 0.11, 0.53, 0.09], [s * 0.115, 0.6, 0.16], 0.018, legs.s, acc); spikes([[s * 0.12, 0.42, -0.06], [s * 0.12, 0.3, -0.065]], [s * 0.3, 0.3, -0.9], 0.08, 0.016, legs.s, acc); cone([s * 0.11, 0.06, -0.07], [s * 0.11, 0.05, -0.14], 0.012, legs.s, acc); }
    if (lt.fins) { ell([s * 0.17, 0.3, -0.01], [0.01, 0.13, 0.065], legs.s, lm, [0, 0, s * -0.15]); ell([s * 0.165, 0.7, -0.01], [0.008, 0.09, 0.05], legs.s, lm, [0, 0, s * -0.2]); }
    if (lt.fur) ruff([s * 0.11, 0.17, 0.01], 0.075, 0.075, 10, 0.06, legs.s, 0.35);
    if (lt.crystals) crystalCluster([s * 0.15, 0.36, 0], s * -0.25, legs.s, 2, 0.9);
    if (lt.horns && !lt.spikes) horn([s * 0.12, 0.55, 0.07], [s * 0.15, 0.62, 0.12], [s * 0.14, 0.68, 0.1], 0.016, legs.s, acc, 4);
  }

  // ---------------------------------------------------------------- Weapon (on the back)
  if (look.weapon) {
    const w = look.weapon;
    const metal = { spec: 0.95, shin: 100, sheen: 0.12, metal: 0.85, pattern: 1, bump: 0.3, vary: 0.08 };
    const edge = { spec: 1, shin: 140, metal: 0.95, sheen: 0.2, pattern: 0 };
    const acc = { spec: 0.6, shin: 40, emit: 0.12, pattern: 6, bump: 0.4, vary: 0.12 };
    const grip = '#3a2a20';
    const back = (...ms) => chain(translate(0, 1.22, -0.2), rotZ(0.55), ...ms);
    const W = (mesh, m, color, mat) => P(mesh, back(m), color, mat);
    const bx = (c, h, color, mat, mesh = 'box', rz = 0) => W(mesh, chain(translate(...c), rotZ(rz), scale(...h)), color, mat);
    const cyl = (c, r, h, color, mat, mesh = 'tube') => W(mesh, chain(translate(c[0], c[1], c[2]), scale(r, h, r)), color, mat);
    const tip = (c, r, h, color, mat, rz = 0) => W('cone', chain(translate(...c), rotZ(rz), scale(r, h, r * 0.35)), color, mat);
    const wrap = (y0, y1, r) => { for (let y = y0; y < y1; y += 0.035) W('ring', chain(translate(0, y, 0), scale(r, 0.4, r)), hex('#5a4030'), leather); };
    switch (w.kind) {
      case 'great-sword':
        bx([0, 0.12, 0], [0.09, 0.47, 0.012], w.p, metal); tip([0, 0.59, 0], 0.09, 0.14, w.p, metal);
        for (const s of [-1, 1]) bx([s * 0.088, 0.12, 0], [0.006, 0.46, 0.007], '#e8e4dc', edge);      // honed edges
        bx([0, 0.1, 0.011], [0.012, 0.38, 0.004], '#1a1410', metal);                                 // fuller
        bx([0, 0.12, 0.006], [0.018, 0.42, 0.012], w.s, acc);
        for (const s of [-1, 1]) tip([s * 0.09, 0.3, 0], 0.025, 0.08, w.p, metal, s * -1.2);
        bx([0, -0.37, 0], [0.14, 0.03, 0.04], w.s, acc, 'slab'); cyl([0, -0.62, 0], 0.022, 0.23, grip, cloth); wrap(-0.6, -0.4, 0.024);
        W('sphere', chain(translate(0, -0.64, 0), scale(0.035, 0.035, 0.035)), hex(w.s), acc); break;
      case 'long-sword':
        bx([0, 0.2, 0], [0.024, 0.58, 0.007], w.p, metal); tip([0, 0.8, 0], 0.024, 0.08, w.p, metal);
        bx([-0.022, 0.2, 0], [0.004, 0.57, 0.005], '#ecebe6', edge);                                    // edge
        bx([0.008, 0.2, 0.004], [0.006, 0.55, 0.006], w.s, acc);
        W('ring', chain(translate(0, -0.4, 0), scale(0.06, 0.6, 0.06)), hex(w.s), acc); cyl([0, -0.72, 0], 0.018, 0.31, grip, cloth); wrap(-0.7, -0.42, 0.02); break;
      case 'sword-shield':
        bx([0, 0, -0.02], [0.17, 0.21, 0.025], w.p, metal, 'slab'); W('ring', chain(translate(0, 0, 0.01), rotX(1.57), scale(0.15, 0.4, 0.18)), hex(w.s), acc);
        W('sphere', chain(translate(0, 0, 0.02), scale(0.06, 0.06, 0.03)), hex(w.s), acc); for (const s of [-1, 1]) tip([s * 0.17, 0.12, -0.02], 0.025, 0.08, w.s, acc, s * -0.9);
        P('box', chain(translate(-0.2, 0.92, 0.04), rotZ(-0.2), scale(0.022, 0.2, 0.006)), hex(w.p), metal); break;
      case 'dual-blades':
        for (const r of [-0.35, 0.35]) { W('box', chain(rotZ(r), translate(-0.024, 0.05, 0), scale(0.004, 0.29, 0.005)), '#ecebe6', edge); W('box', chain(rotZ(r), translate(0, 0.05, 0), scale(0.026, 0.3, 0.007)), w.p, metal); W('cone', chain(rotZ(r), translate(0, 0.35, 0), scale(0.026, 0.08, 0.009)), w.p, metal); W('box', chain(rotZ(r), translate(0.012, 0.05, 0.003), scale(0.008, 0.27, 0.008)), w.s, acc); W('ring', chain(rotZ(r), translate(0, -0.27, 0), scale(0.04, 0.5, 0.04)), hex(w.s), acc); } break;
      case 'hammer':
        cyl([0, -0.45, 0], 0.024, 0.78, grip, cloth); wrap(-0.45, -0.1, 0.027);
        bx([0, 0.36, 0], [0.17, 0.12, 0.12], w.p, metal); bx([0, 0.36, 0], [0.18, 0.045, 0.13], w.s, acc);
        for (const s of [-1, 1]) W('tube:0.85', chain(translate(s * 0.17, 0.36, 0), rotZ(s * -1.5708), scale(0.1, 0.05, 0.1)), w.p, metal);
        tip([0, 0.5, 0], 0.05, 0.1, w.s, acc); break;
      case 'hunting-horn':
        cyl([0, -0.45, 0], 0.024, 0.6, grip, cloth); wrap(-0.45, -0.15, 0.027); ell([0, 0.25, 0], [0.13, 0.17, 0.09], w.p, metal);
        W('tube:2.4', chain(translate(0.05, 0.25, 0), rotZ(-1.2), scale(0.04, 0.22, 0.04)), w.s, acc);
        for (const s of [-1, 1]) W('ring', chain(translate(0, 0.25 + s * 0.08, 0), scale(0.12, 0.5, 0.08)), hex(w.s), acc); break;
      case 'lance':
        W('cone', chain(translate(-0.05, -0.55, 0), scale(0.04, 1.35, 0.04)), w.p, metal);
        for (const y of [-0.3, -0.1, 0.1]) W('ring', chain(translate(-0.05, y, 0), scale(0.045 - y * 0.02, 0.5, 0.045 - y * 0.02)), hex(w.s), acc);
        P('slab', chain(translate(0.24, 1.0, -0.17), scale(0.16, 0.26, 0.035)), hex(w.p), metal);
        P('ring', chain(translate(0.24, 1.0, -0.13), rotX(1.57), scale(0.13, 0.4, 0.22)), hex(w.s), acc);
        P('sphere', chain(translate(0.24, 1.0, -0.13), scale(0.05, 0.05, 0.02)), hex(w.s), acc); break;
      case 'gunlance':
        cyl([-0.05, -0.5, 0], 0.048, 1.05, w.p, metal); W('cone', chain(translate(-0.05, 0.55, 0), scale(0.04, 0.25, 0.04)), w.s, acc);
        W('ring', chain(translate(-0.05, 0.5, 0), scale(0.05, 0.6, 0.05)), hex('#1a1410'), metal);
        bx([0.02, -0.15, 0], [0.04, 0.12, 0.05], w.s, acc, 'slab');
        P('slab', chain(translate(0.24, 1.0, -0.17), scale(0.16, 0.26, 0.035)), hex(w.p), metal); break;
      case 'switch-axe':
        cyl([0, -0.5, 0], 0.026, 0.88, grip, cloth); wrap(-0.5, -0.15, 0.029);
        bx([0.07, 0.33, 0], [0.12, 0.14, 0.016], w.p, metal, 'slab'); tip([0.19, 0.33, 0], 0.08, 0.06, w.p, metal, -1.5708);
        bx([0.07, 0.33, 0.006], [0.04, 0.1, 0.018], w.s, acc); bx([-0.03, 0.25, 0], [0.025, 0.12, 0.03], w.s, acc, 'slab'); break;
      case 'charge-blade':
        bx([-0.06, 0.05, 0], [0.042, 0.38, 0.012], w.p, metal); tip([-0.06, 0.47, 0], 0.042, 0.08, w.p, metal);
        bx([-0.1, 0.05, 0], [0.005, 0.37, 0.007], '#ecebe6', edge);
        for (let i = 0; i < 3; i++) W('tube', chain(translate(-0.06, -0.15 + i * 0.07, 0.016), rotX(1.5708), scale(0.014, 0.012, 0.014)), hex(w.s), { ...acc, emit: 0.4 });
        bx([0.1, 0.0, -0.02], [0.12, 0.18, 0.025], w.p, metal, 'slab'); ell([0.1, 0.0, 0.01], [0.05, 0.08, 0.02], w.s, acc);
        W('ring', chain(translate(0.1, 0, 0.005), rotX(1.57), scale(0.1, 0.3, 0.15)), hex(w.s), acc); break;
      case 'insect-glaive':
        cyl([0, -0.6, 0], 0.016, 1.2, grip, cloth);
        for (const y of [0.6, -0.6]) { bx([0, y, 0], [0.03, 0.09, 0.006], w.p, metal); tip([0, y + (y > 0 ? 0.11 : -0.11), 0], 0.03, y > 0 ? 0.06 : -0.06, w.p, metal); for (const s of [-1, 1]) tip([s * 0.03, y + (y > 0 ? -0.07 : 0.07), 0], 0.012, 0.05, w.s, acc, s * -1); }
        ell([0, 0, 0.02], [0.035, 0.055, 0.022], w.s, acc); break;
      case 'bow':
        for (const [y, r] of [[0.32, -0.18], [-0.32, 0.18]]) { W('tube:0.5', chain(translate(0, y > 0 ? 0.05 : -0.05, 0), rotZ(r), scale(0.024, y > 0 ? 0.5 : -0.5, 0.024)), w.p, metal); tip([y > 0 ? 0.1 : 0.1, y > 0 ? 0.56 : -0.56, 0], 0.02, y > 0 ? 0.06 : -0.06, w.s, acc, y > 0 ? -0.5 : 0.5); }
        cyl([0, -0.07, 0], 0.03, 0.14, grip, cloth); wrap(-0.07, 0.07, 0.033);
        for (const s of [-1, 1]) ell([0, s * 0.12, 0], [0.03, 0.05, 0.02], w.s, acc);
        bx([0.1, 0, 0], [0.002, 0.52, 0.002], '#e8e0d0', cloth); break;
      case 'heavy-bowgun':
        bx([0, 0, 0], [0.09, 0.33, 0.08], w.p, metal); cyl([0, 0.3, 0], 0.035, 0.3, w.s, acc);
        W('ring', chain(translate(0, 0.6, 0), scale(0.042, 0.6, 0.042)), hex('#1a1410'), metal);
        bx([0.06, -0.25, 0], [0.04, 0.1, 0.06], grip, leather); bx([-0.07, 0.05, 0], [0.03, 0.12, 0.05], w.s, acc, 'slab');
        bx([0, 0.12, 0.09], [0.02, 0.05, 0.015], w.s, { ...acc, emit: 0.4 }); break;
      default: // light-bowgun
        bx([0, 0, 0], [0.065, 0.24, 0.06], w.p, metal); cyl([0, 0.22, 0], 0.026, 0.22, w.s, acc);
        W('ring', chain(translate(0, 0.44, 0), scale(0.032, 0.6, 0.032)), hex('#1a1410'), metal);
        bx([0.04, -0.18, 0], [0.03, 0.08, 0.05], grip, leather); bx([-0.05, 0.02, 0], [0.02, 0.09, 0.04], w.s, acc, 'slab');
    }
  }

  // Ground shadow
  parts.push({ mesh: 'disc', m: chain(translate(0, 0.002, 0.01), scale(0.42, 1, 0.3)), color: [0, 0, 0], alpha: 0.35, spec: 0, shin: 1, shadow: true, emit: -1 });
  return parts;
}
