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
  const cloth = { spec: 0.05, shin: 8 };
  const skinMat = { spec: 0.12, shin: 16, sheen: 0.05 };
  const furMat = { spec: 0.02, shin: 4, sheen: 0.12 };
  const armorMat = t => ({ spec: 0.15 + (t.metal || 0.25) * 0.75, shin: 18 + (t.metal || 0.25) * 60, sheen: t.sheen || 0 });

  // Shape helpers
  const ell = (c, r, color, mat, rot = [0, 0, 0], mesh = 'sphere') =>
    P(mesh, chain(translate(...c), rotY(rot[1]), rotX(rot[0]), rotZ(rot[2]), scale(...r)), color, mat);
  const limb = (p0, p1, r0, r1, color, mat, mesh = 'tube') => {
    const { m, len } = alignY(p0, p1);
    const t = r1 / r0;
    P(mesh === 'tube' && Math.abs(t - 1) > 0.03 ? `tube:${t.toFixed(2)}` : mesh, chain(m, scale(r0, len, r0)), color, mat);
  };
  const capsule = (p0, p1, r, color, mat) => {
    limb(p0, p1, r, r, color, mat);
    ell(p0, [r, r, r], color, mat);
    ell(p1, [r, r, r], color, mat);
  };
  const cone = (base, tip, r, color, mat) => {
    const { m, len } = alignY(base, tip);
    P('cone', chain(m, scale(r, len, r)), color, mat);
  };
  const box = (c, half, color, mat, rot = [0, 0, 0], mesh = 'box') =>
    P(mesh, chain(translate(...c), rotY(rot[1]), rotX(rot[0]), rotZ(rot[2]), scale(...half)), color, mat);

  const skin = look.skin;
  const suit = UNDERSUIT;
  const part = k => look.parts[k] || { piece: null };
  const head = part('head'), chest = part('chest'), arms = part('arms'), waist = part('waist'), legs = part('legs');
  const T = { head: traitsFor(head.piece), chest: traitsFor(chest.piece), arms: traitsFor(arms.piece), waist: traitsFor(waist.piece), legs: traitsFor(legs.piece) };
  const bulk = k => (part(k).piece ? (T[k].bulk || 1) : 1);
  const glowMat = k => ({ ...armorMat(T[k]), emit: T[k].glow ? 0.35 : 0 });

  // ---------------------------------------------------------------- Body (undersuit + skin)
  ell([0, 1.635, 0.005], [0.1, 0.122, 0.112], skin, skinMat);               // head
  limb([0, 1.47, 0], [0, 1.56, 0], 0.048, 0.045, skin, skinMat);            // neck
  P('tube:1.32', chain(translate(0, 1.0, 0), scale(0.145, 0.44, 0.1)), hex(suit), cloth); // V-shaped torso
  ell([0, 1.44, 0], [0.19, 0.06, 0.13], suit, cloth);                       // shoulder line
  ell([0, 0.96, 0], [0.165, 0.11, 0.115], suit, cloth);                     // pelvis
  const SH = 0.235, HIP = 0.095;
  for (const s of [-1, 1]) {
    capsule([s * SH, 1.41, 0], [s * 0.285, 1.14, 0.01], 0.055, suit, cloth);        // upper arm
    capsule([s * 0.285, 1.14, 0.01], [s * 0.315, 0.9, 0.05], 0.047, suit, cloth);   // forearm
    ell([s * 0.322, 0.84, 0.06], [0.04, 0.05, 0.035], skin, skinMat);               // hand
    capsule([s * HIP, 0.93, 0], [s * 0.105, 0.53, 0.015], 0.074, suit, cloth);      // thigh
    capsule([s * 0.105, 0.53, 0.015], [s * 0.11, 0.1, -0.005], 0.058, suit, cloth); // shin
    ell([s * 0.11, 0.045, 0.045], [0.055, 0.04, 0.11], '#2a221c', cloth);           // foot
  }

  // ---------------------------------------------------------------- Head
  const ht = T.head;
  if (head.piece) {
    const shape = ht.head || look.head;
    const hm = glowMat('head');
    const b = bulk('head');
    if (shape === 'accessory') {
      ell([0, 1.69, -0.01], [0.105, 0.07, 0.115], '#2a211b', furMat, [0, 0, 0], 'dome');
      box([0, 1.645, 0.105], [0.085, 0.017, 0.012], head.p, hm);
      box([0, 1.645, 0.11], [0.03, 0.01, 0.01], head.s, hm);
    } else if (shape === 'hood' || ht.light) {
      ell([0, 1.645, -0.02], [0.125 * b, 0.14 * b, 0.13 * b], head.p, { ...cloth, sheen: 0.05 });
      ell([0, 1.6, 0.085], [0.07, 0.085, 0.03], skin, skinMat);                         // face
      ell([0, 1.53, -0.01], [0.13, 0.04, 0.12], head.s, cloth);                          // collar
    } else {
      ell([0, 1.66, -0.005], [0.123 * b, 0.135 * b, 0.13 * b], head.p, hm);              // helmet shell
      box([0, 1.62, 0.115 * b], [0.06, 0.03, 0.02], '#16110d', { spec: 0.6, shin: 60 }); // visor slit
      ell([0, 1.665, 0.06], [0.11 * b, 0.02, 0.1], head.s, hm, [0.25, 0, 0]);            // brow band
      if (shape === 'mask') box([0, 1.6, 0.11 * b], [0.07, 0.06, 0.02], head.s, hm, [0, 0, 0], 'slab');
      if (shape === 'visor') box([0, 1.635, 0.12 * b], [0.09, 0.025, 0.02], head.s, hm);
      if (shape === 'crest' || ht.head === 'crest') ell([0, 1.79, -0.03], [0.012, 0.07, 0.13], head.s, hm);
      if (shape === 'plume') ell([0, 1.77, -0.12], [0.03, 0.06, 0.15], head.s, { ...furMat, sheen: 0.2 }, [-0.5, 0, 0]);
      if (shape === 'crown') for (const x of [-0.07, 0, 0.07]) cone([x, 1.76, 0.03], [x * 1.3, 1.86 + (x === 0 ? 0.04 : 0), 0.02], 0.022, head.s, hm);
    }
    const horns = ht.horns;
    if (horns) for (const s of [-1, 1]) {
      if (horns === 'back') cone([s * 0.07, 1.74, -0.04], [s * 0.12, 1.84, -0.22], 0.03, head.s, hm);
      if (horns === 'small') cone([s * 0.07, 1.74, 0], [s * 0.1, 1.83, -0.06], 0.022, head.s, hm);
      if (horns === 'curved') { cone([s * 0.09, 1.72, 0], [s * 0.2, 1.78, -0.05], 0.03, head.s, hm); cone([s * 0.2, 1.78, -0.05], [s * 0.22, 1.9, -0.12], 0.018, head.s, hm); }
      if (horns === 'big') { cone([s * 0.09, 1.73, -0.02], [s * 0.24, 1.86, -0.18], 0.04, head.s, hm); cone([s * 0.1, 1.7, -0.06], [s * 0.18, 1.72, -0.3], 0.026, head.s, hm); }
    }
    if (horns === 'beetle') cone([0, 1.75, 0.08], [0, 1.95, 0.16], 0.03, head.s, hm);
    if (ht.fins) for (const s of [-1, 1]) ell([s * 0.13, 1.69, -0.04], [0.012, 0.05, 0.11], head.s, hm, [0, 0, s * 0.4]);
    if (ht.fur) ell([0, 1.54, -0.02], [0.15, 0.06, 0.14], head.s, furMat, [0, 0, 0], 'lowsphere');
  } else {
    ell([0, 1.7, -0.015], [0.105, 0.075, 0.118], '#2a211b', furMat, [0, 0, 0], 'dome');   // hair
    for (const s of [-1, 1]) ell([s * 0.035, 1.645, 0.103], [0.012, 0.008, 0.006], '#1a1410', skinMat); // eyes
  }

  // ---------------------------------------------------------------- Chest
  const ct = T.chest;
  if (chest.piece) {
    const cm = glowMat('chest'), b = bulk('chest');
    if (ct.robe) {
      P('tube:1.28', chain(translate(0, 0.98, 0), scale(0.16 * b, 0.47, 0.115 * b)), hex(chest.p), { ...cloth, sheen: 0.08 });
      ell([0, 1.45, 0], [0.2 * b, 0.065, 0.14 * b], chest.p, { ...cloth, sheen: 0.08 });
      box([0, 1.25, 0.135 * b], [0.018, 0.2, 0.02], chest.s, cloth);                // front seam
    } else {
      P('tube:1.3', chain(translate(0, 1.03, 0.005), scale(0.162 * b, 0.42, 0.115 * b)), hex(chest.p), cm); // cuirass
      ell([0, 1.45, 0], [0.212 * b, 0.075, 0.145 * b], chest.p, cm);                // shoulder line
      box([0, 1.33, 0.12 * b], [0.15 * b, 0.1, 0.035], chest.p, cm, [-0.12, 0, 0], 'slab'); // breastplate
      box([0, 1.335, 0.15 * b], [0.03, 0.08, 0.012], chest.s, cm, [-0.12, 0, 0]);   // sternum ridge
      for (const y of [1.17, 1.1]) P('ring', chain(translate(0, y, 0.004), scale(0.152 * b, 0.12, 0.108 * b)), hex(chest.s), cm); // abdomen bands
    }
    P('ring', chain(translate(0, 1.47, 0), scale(0.095 * b, 0.06, 0.085 * b)), hex(chest.s), cm);  // collar
    for (const s of [-1, 1]) {
      // pauldrons
      ell([s * 0.265, 1.43, 0], [0.105 * b, 0.075 * b, 0.105 * b], chest.p, cm, [0, 0, s * -0.35], 'dome');
      ell([s * 0.29, 1.4, 0], [0.09 * b, 0.05 * b, 0.09 * b], chest.s, cm, [0, 0, s * -0.5], 'dome');
      if (ct.spikes) cone([s * 0.29, 1.47, -0.02], [s * 0.36, 1.57, -0.08], 0.025, chest.s, cm);
      if (ct.fins) ell([s * 0.33, 1.5, -0.06], [0.012, 0.09, 0.07], chest.s, cm, [0, 0, s * -0.6]);
      if (ct.crystals) P('crystal', chain(translate(s * 0.3, 1.52, -0.02), rotZ(s * -0.4), scale(0.04, 0.11, 0.04)), hex(chest.s), { spec: 1, shin: 90, emit: 0.15 });
    }
    if (ct.fur) for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI - Math.PI;
      ell([Math.cos(a) * 0.17, 1.47, Math.sin(a) * 0.1 - 0.01], [0.075, 0.06, 0.07], chest.s, furMat, [0, 0, 0], 'lowsphere');
    }
    if (ct.spikes) for (let i = 0; i < 4; i++) cone([0, 1.42 - i * 0.09, -0.12 * b], [0, 1.45 - i * 0.09, -0.2 * b], 0.025, chest.s, cm);
    if (ct.crystals) for (const [x, y] of [[-0.08, 1.38], [0.07, 1.25], [0, 1.45]]) P('crystal', chain(translate(x, y, -0.15), rotX(-0.6), scale(0.035, 0.12, 0.035)), hex(chest.s), { spec: 1, shin: 90, emit: 0.15 });
    if (ct.cape || ct.wings) {
      if (ct.cape) box([0, 1.05, -0.17], [0.2, 0.38, 0.012], chest.s, { ...cloth, sheen: 0.06 }, [0.12, 0, 0], 'slab');
    }
    if (ct.wings === 'small') for (const s of [-1, 1]) ell([s * 0.2, 1.3, -0.2], [0.18, 0.1, 0.01], chest.s, cm, [0.2, s * 0.6, s * 0.5]);
    if (ct.wings === 'insect') for (const s of [-1, 1]) for (const [y, r] of [[1.36, 0.22], [1.15, 0.16]]) ell([s * 0.16, y, -0.18], [r, r * 0.6, 0.008], chest.s, { spec: 0.6, shin: 40, alpha: 0.85, sheen: 0.3 }, [0.1, s * 0.4, s * 0.5]);
    if (ct.chains) P('ring', chain(translate(0, 1.23, 0.005), rotX(0.25), scale(0.2, 0.15, 0.135)), hex(chest.s), { spec: 0.9, shin: 70 });
    if (ct.leaves) for (let i = 0; i < 6; i++) ell([Math.cos(i) * 0.15, 1.45 - (i % 3) * 0.1, -0.12 + Math.sin(i) * 0.04], [0.06, 0.012, 0.1], chest.s, cloth, [0.6, i, 0.3]);
  }

  // ---------------------------------------------------------------- Arms
  const at = T.arms;
  for (const s of [-1, 1]) {
    if (!arms.piece) continue;
    const am = glowMat('arms'), b = bulk('arms');
    const robeSleeve = at.robe || T.chest.robe;
    limb([s * 0.282, 1.16, 0.01], [s * 0.318, 0.88, 0.05], 0.066 * b, (robeSleeve ? 0.085 : 0.056) * b, arms.p, robeSleeve ? cloth : am); // vambrace
    ell([s * 0.283, 1.15, 0.012], [0.062 * b, 0.05 * b, 0.062 * b], arms.s, am);    // elbow cop
    ell([s * 0.322, 0.85, 0.06], [0.05, 0.058, 0.045], arms.p, am);                  // gauntlet
    ell([s * 0.33, 0.87, 0.075], [0.035, 0.02, 0.035], arms.s, am);
    limb([s * 0.245, 1.4, 0], [s * 0.28, 1.2, 0.01], 0.064 * b, 0.06 * b, arms.p, { ...am, spec: am.spec * 0.8 }); // upper arm guard
    if (at.fins) ell([s * 0.35, 1.0, 0.0], [0.012, 0.13, 0.05], arms.s, am, [0, 0, s * -0.25]);
    if (at.spikes) cone([s * 0.33, 1.02, -0.03], [s * 0.4, 1.08, -0.1], 0.02, arms.s, am);
    if (at.fur) ell([s * 0.3, 1.0, 0.03], [0.08, 0.06, 0.08], arms.s, furMat, [0, 0, 0], 'lowsphere');
    if (at.chains) for (const y of [0.95, 1.03]) P('ring', chain(translate(s * (0.3 + (1.03 - y) * 0.1), y, 0.035), scale(0.07, 0.07, 0.07)), hex(arms.s), { spec: 0.9, shin: 70 });
    if (at.crystals) P('crystal', chain(translate(s * 0.35, 1.02, -0.02), rotZ(s * -0.3), scale(0.03, 0.09, 0.03)), hex(arms.s), { spec: 1, shin: 90, emit: 0.15 });
  }

  // ---------------------------------------------------------------- Waist
  const wt = T.waist;
  if (waist.piece) {
    const wm = glowMat('waist'), b = bulk('waist');
    P('tube', chain(translate(0, 0.94, 0), scale(0.172 * b, 0.075, 0.122 * b)), hex(waist.p), wm);   // belt
    box([0, 0.975, 0.125 * b], [0.035, 0.035, 0.012], waist.s, { spec: 0.9, shin: 70 });              // buckle
    const robe = wt.robe || T.chest.robe;
    if (robe) {
      P('tube:0.56', chain(translate(0, 0.31, 0), scale(0.32 * b, 0.63, 0.26 * b)), hex(waist.p), { ...cloth, sheen: 0.08 }); // skirt (wider at the bottom)
      P('ring', chain(translate(0, 0.33, 0), scale(0.31 * b, 0.05, 0.25 * b)), hex(waist.s), cloth);
    } else {
      for (const [x, z, ry] of [[-0.09, 0.11, 0.25], [0.09, 0.11, -0.25], [0, -0.12, Math.PI]]) {
        box([x, 0.8, z * b], [x === 0 ? 0.13 : 0.075, 0.12, 0.012], waist.p, wm, [z > 0 ? -0.18 : 0.18, ry, 0], 'slab');
        box([x, 0.69, z * b * 1.08], [x === 0 ? 0.12 : 0.07, 0.015, 0.014], waist.s, wm, [z > 0 ? -0.18 : 0.18, ry, 0]);
      }
      for (const s of [-1, 1]) box([s * 0.17 * b, 0.82, 0], [0.012, 0.11, 0.08], waist.p, wm, [0, 0, s * 0.18], 'slab');
    }
    if (wt.tentacles) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      limb([Math.cos(a) * 0.15, 0.9, Math.sin(a) * 0.11], [Math.cos(a) * 0.22, 0.45, Math.sin(a) * 0.17], 0.022, 0.008, waist.s, { spec: 0.4, shin: 30, emit: wt.glow ? 0.2 : 0 });
    }
    if (wt.fur) P('ring', chain(translate(0, 0.9, 0), scale(0.18, 0.12, 0.13)), hex(waist.s), furMat);
    if (wt.chains) P('ring', chain(translate(0, 0.9, 0), rotZ(0.15), scale(0.19, 0.1, 0.14)), hex(waist.s), { spec: 0.9, shin: 70 });
  }

  // ---------------------------------------------------------------- Legs
  const lt = T.legs;
  for (const s of [-1, 1]) {
    if (!legs.piece) continue;
    const lm = glowMat('legs'), b = bulk('legs');
    limb([s * 0.1, 0.9, 0.005], [s * 0.106, 0.58, 0.02], 0.084 * b, 0.072 * b, legs.p, { ...lm, spec: lm.spec * 0.7 }); // cuisse
    ell([s * 0.107, 0.53, 0.06], [0.06 * b, 0.07 * b, 0.04], legs.s, lm);                          // knee cop
    limb([s * 0.107, 0.5, 0.015], [s * 0.11, 0.1, -0.005], 0.072 * b, 0.068 * b, legs.p, lm);       // greave
    ell([s * 0.11, 0.06, 0.05], [0.068 * b, 0.055, 0.13], legs.p, lm);                              // boot
    ell([s * 0.11, 0.035, 0.07], [0.07 * b, 0.025, 0.13], legs.s, lm);                              // sole
    if (lt.spikes) cone([s * 0.12, 0.42, -0.06], [s * 0.15, 0.5, -0.16], 0.022, legs.s, lm);
    if (lt.fins) ell([s * 0.17, 0.3, -0.01], [0.012, 0.12, 0.06], legs.s, lm, [0, 0, s * -0.15]);
    if (lt.fur) ell([s * 0.11, 0.18, 0.01], [0.09, 0.06, 0.09], legs.s, furMat, [0, 0, 0], 'lowsphere');
    if (lt.crystals) P('crystal', chain(translate(s * 0.15, 0.36, 0.0), rotZ(s * -0.2), scale(0.03, 0.09, 0.03)), hex(legs.s), { spec: 1, shin: 90, emit: 0.15 });
  }

  // ---------------------------------------------------------------- Weapon (on the back)
  if (look.weapon) {
    const w = look.weapon;
    const metal = { spec: 0.9, shin: 80, sheen: 0.1 };
    const acc = { spec: 0.6, shin: 40, emit: 0.1 };
    const grip = '#3a2a20';
    const back = (...ms) => chain(translate(0, 1.22, -0.2), rotZ(0.55), ...ms);
    const W = (mesh, m, color, mat) => P(mesh, back(m), color, mat);
    const bx = (c, h, color, mat, mesh = 'box') => W(mesh, chain(translate(...c), scale(...h)), color, mat);
    const cyl = (c, r, h, color, mat, mesh = 'tube') => W(mesh, chain(translate(c[0], c[1], c[2]), scale(r, h, r)), color, mat);
    switch (w.kind) {
      case 'great-sword':
        bx([0, 0.15, 0], [0.085, 0.5, 0.012], w.p, metal); bx([0, 0.15, 0.004], [0.02, 0.45, 0.013], w.s, acc);
        bx([0, -0.37, 0], [0.13, 0.025, 0.035], w.s, acc); cyl([0, -0.62, 0], 0.022, 0.23, grip, cloth); break;
      case 'long-sword':
        bx([0, 0.22, 0], [0.025, 0.6, 0.008], w.p, metal); bx([0, -0.4, 0], [0.05, 0.015, 0.05], w.s, acc, 'slab');
        cyl([0, -0.7, 0], 0.018, 0.29, grip, cloth); break;
      case 'sword-shield':
        bx([0, 0, -0.02], [0.17, 0.21, 0.02], w.p, metal, 'slab'); ell([0, 0, 0.01], [0.06, 0.06, 0.02], w.s, acc);
        P('box', chain(translate(-0.2, 0.92, 0.04), rotZ(-0.2), scale(0.02, 0.2, 0.006)), hex(w.p), metal); break;
      case 'dual-blades':
        for (const r of [-0.35, 0.35]) W('box', chain(rotZ(r), translate(0, 0.05, 0), scale(0.025, 0.3, 0.007)), w.p, metal);
        for (const r of [-0.35, 0.35]) W('box', chain(rotZ(r), translate(0, 0.05, 0.002), scale(0.008, 0.27, 0.008)), w.s, acc); break;
      case 'hammer':
        cyl([0, -0.45, 0], 0.022, 0.75, grip, cloth); bx([0, 0.36, 0], [0.16, 0.11, 0.11], w.p, metal); bx([0, 0.36, 0], [0.17, 0.04, 0.12], w.s, acc); break;
      case 'hunting-horn':
        cyl([0, -0.45, 0], 0.024, 0.6, grip, cloth); ell([0, 0.25, 0], [0.13, 0.17, 0.09], w.p, metal);
        W('cone', chain(translate(0.05, 0.3, 0), rotZ(-1.2), scale(0.07, 0.2, 0.07)), w.s, acc); break;
      case 'lance':
        W('cone', chain(translate(-0.05, -0.55, 0), scale(0.035, 1.35, 0.035)), w.p, metal);
        P('slab', chain(translate(0.24, 1.0, -0.17), scale(0.15, 0.24, 0.03)), hex(w.p), metal);
        P('sphere', chain(translate(0.24, 1.0, -0.13), scale(0.05, 0.05, 0.02)), hex(w.s), acc); break;
      case 'gunlance':
        cyl([-0.05, -0.5, 0], 0.045, 1.05, w.p, metal); W('cone', chain(translate(-0.05, 0.55, 0), scale(0.035, 0.25, 0.035)), w.s, acc);
        P('slab', chain(translate(0.24, 1.0, -0.17), scale(0.15, 0.24, 0.03)), hex(w.p), metal); break;
      case 'switch-axe':
        cyl([0, -0.5, 0], 0.024, 0.85, grip, cloth); bx([0.07, 0.33, 0], [0.11, 0.13, 0.015], w.p, metal, 'slab'); bx([0.07, 0.33, 0.005], [0.04, 0.1, 0.017], w.s, acc); break;
      case 'charge-blade':
        bx([-0.06, 0.05, 0], [0.04, 0.38, 0.012], w.p, metal); bx([0.1, 0.0, -0.02], [0.12, 0.18, 0.025], w.p, metal, 'slab');
        ell([0.1, 0.0, 0.01], [0.05, 0.08, 0.02], w.s, acc); break;
      case 'insect-glaive':
        cyl([0, -0.6, 0], 0.016, 1.2, grip, cloth); for (const y of [0.6, -0.6]) bx([0, y, 0], [0.03, 0.09, 0.006], w.p, metal);
        ell([0, 0, 0.02], [0.03, 0.05, 0.02], w.s, acc); break;
      case 'bow':
        for (const [y, r] of [[0.32, -0.18], [-0.32, 0.18]]) W('tube:0.5', chain(translate(0, y > 0 ? 0.05 : -0.05, 0), rotZ(r), scale(0.022, y > 0 ? 0.5 : -0.5, 0.022)), w.p, metal);
        cyl([0, -0.07, 0], 0.03, 0.14, grip, cloth); bx([0.1, 0, 0], [0.002, 0.52, 0.002], '#e8e0d0', cloth); break;
      case 'heavy-bowgun':
        bx([0, 0, 0], [0.09, 0.33, 0.08], w.p, metal); cyl([0, 0.3, 0], 0.035, 0.3, w.s, acc); bx([0.06, -0.25, 0], [0.04, 0.1, 0.06], grip, cloth); break;
      default: // light-bowgun
        bx([0, 0, 0], [0.065, 0.24, 0.06], w.p, metal); cyl([0, 0.22, 0], 0.025, 0.22, w.s, acc); bx([0.04, -0.18, 0], [0.03, 0.08, 0.05], grip, cloth);
    }
  }

  // Ground shadow
  parts.push({ mesh: 'disc', m: chain(translate(0, 0.002, 0.01), scale(0.42, 1, 0.3)), color: [0, 0, 0], alpha: 0.35, spec: 0, shin: 1, shadow: true, emit: -1 });
  return parts;
}
