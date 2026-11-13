'use strict';

/**
 * Recommended builds compiled from community references
 * (Game8 build guides and mhwildsbuild.com). Gear is written with English
 * in-game names and resolved to database ids by scripts/featured.js.
 *
 * Fields: kind (weapon type), rank (low|high), hr (recommended minimum HR),
 * style (playstyle), name, src (source key), url, weapon, armor [5 pieces],
 * charm, decos { w|head|chest|arms|waist|legs: [names] }.
 */

const SOURCES = {
  mhwb: 'mhwildsbuild.com',
  game8: 'Game8'
};

const MHWB = slug => `https://www.mhwildsbuild.com/builds/${slug}`;
const G8 = id => `https://game8.co/games/Monster-Hunter-Wilds/archives/${id}`;

const BUILDS = [
  // ---------------------------------------------------------------- Great Sword
  {
    kind: 'great-sword', rank: 'high', hr: 100, style: 'aggressive', name: 'Raw Gore', src: 'mhwb', url: MHWB('great-sword-raw-gore'),
    weapon: 'Ostrak Oblivion',
    armor: ['Arkvulcan Helm γ', 'Dahaad Shardmail γ', 'Arkvulcan Vambraces γ', 'Dahaad Shardcoil γ', 'Gore Greaves β'],
    decos: {
      w: ['Guardian/Handicraft Jwl [3]', 'Shield/Handicraft Jwl [3]', 'Focus/Handicraft Jewel [3]'],
      head: ['Counter Jewel [2]', 'Protection Jewel [1]'], chest: ['Counter Jewel [2]', 'Counter Jewel [2]'],
      arms: ['Protection Jewel [1]', 'Protection Jewel [1]'], waist: ['Steadfast Jewel [1]'],
      legs: ['Chain Jewel [3]', 'Sane Jewel [1]', 'Sane Jewel [1]']
    }
  },
  // ---------------------------------------------------------------- Long Sword
  {
    kind: 'long-sword', rank: 'high', hr: 100, style: 'aggressive', name: 'Gogmazios Element', src: 'mhwb', url: MHWB('long-sword-gogmazios'),
    weapon: "Headsman's Hamus",
    armor: ['G. Ebony Helm β', 'G. Fulgur Mail β', 'Gogmazios Vambraces α', 'Gogmazios Coil α', 'Gogmazios Greaves β'],
    charm: 'Exploiter Charm III',
    decos: {
      w: ['Dragon/Crit Elem Jwl [3]', 'Critical Jewel III [3]', 'Expert Jewel III [3]'],
      head: ['Chain Jewel [3]', 'Sheath Jewel [1]'], chest: ['Tenderizer Jewel [3]', 'Flawless Jewel [2]', 'Sheath Jewel [1]'],
      arms: ['Flawless Jewel [2]', 'Sheath Jewel [1]'], waist: ['Counter Jewel [2]', 'Protection Jewel [1]', 'Protection Jewel [1]'],
      legs: ['Tenderizer Jewel [3]', 'Counter Jewel [2]', 'Protection Jewel [1]']
    }
  },
  // ---------------------------------------------------------------- Sword & Shield
  {
    kind: 'sword-shield', rank: 'high', hr: 100, style: 'balanced', name: 'Elemental', src: 'mhwb', url: MHWB('sword-shield-elemental'),
    weapon: 'Kyrie Verd',
    armor: ['G. Ebony Helm β', 'G. Fulgur Mail β', 'Gogmazios Vambraces α', 'Gogmazios Coil α', 'Gogmazios Greaves β'],
    charm: 'Exploiter Charm III',
    decos: {
      w: ['Guardian/Blaze Jwl [3]', 'Crit Elem/Blaze Jwl [3]', 'Shield/Blaze Jewel [3]'],
      head: ['Chain Jewel [3]', 'Protection Jewel [1]'], chest: ['Tenderizer Jewel [3]', 'Mighty Jewel [2]', 'Protection Jewel [1]'],
      arms: ['Flawless Jewel [2]', 'Protection Jewel [1]'], waist: ['Flawless Jewel [2]', 'Steadfast Jewel [1]', 'Steadfast Jewel [1]'],
      legs: ['Tenderizer Jewel [3]', 'Jumping Jewel [2]', 'Steadfast Jewel [1]']
    }
  },
  // ---------------------------------------------------------------- Dual Blades
  {
    kind: 'dual-blades', rank: 'high', hr: 100, style: 'aggressive', name: 'Weakness Exploit', src: 'mhwb', url: MHWB('dual-blades-weakness-exploit'),
    weapon: 'Eternal Cusp',
    armor: ['Arkvulcan Helm γ', 'Arkvulcan Mail γ', 'Arkvulcan Vambraces γ', 'Gogmazios Coil α', 'Arkvulcan Greaves γ'],
    charm: 'Power Charm III',
    decos: {
      w: ['Dragon/Crit Elem Jwl [3]', 'Sharp Jewel III [3]', 'Expert Jewel III [3]'],
      head: ['Counter Jewel [2]', 'Sprinter Jewel [1]'], chest: ['Throttle Jewel [3]', 'Counter Jewel [2]'],
      arms: ['Medicine Jewel [1]', 'Medicine Jewel [1]'], waist: ['Counter Jewel [2]', 'Medicine Jewel [1]', 'Sprinter Jewel [1]'],
      legs: ['Chain Jewel [3]', 'Flayer Jewel [3]']
    }
  },
  // ---------------------------------------------------------------- Hammer
  {
    kind: 'hammer', rank: 'high', hr: 100, style: 'aggressive', name: 'Black Eclipse', src: 'mhwb', url: MHWB('hammer-black-eclipse'),
    weapon: 'Bound Admonition',
    armor: ['G. Fulgur Helm β', 'Udra Miremail γ', 'Gogmazios Vambraces α', 'Gore Coil α', 'Dahaad Shardgreaves γ'],
    decos: {
      w: ['Critical Jewel III [3]', 'Critical Jewel III [3]', 'Charge Up/Attack Jwl [3]'],
      head: ['Tenderizer Jewel [3]', 'Sane Jewel [1]'], chest: ['Tenderizer Jewel [3]', 'Tenderizer Jewel [3]'],
      arms: ['Counter Jewel [2]', 'Sane Jewel [1]'], waist: ['Chain Jewel [3]', 'Brace Jewel [1]'], legs: ['Mighty Jewel [2]']
    }
  },
  // ---------------------------------------------------------------- Hunting Horn
  { kind: 'hunting-horn', rank: 'high', hr: 100, style: 'aggressive', name: 'Gogmapocalypse Guts', src: 'game8', url: G8(500766),
    weapon: 'Onyx Choros', armor: ['Udra Mirehelm γ', 'Udra Miremail γ', 'Gogmazios Vambraces α', 'Gogmazios Coil α', 'Gogmazios Greaves α'] },
  { kind: 'hunting-horn', rank: 'high', hr: 50, style: 'support', name: 'Rey-Zoh Agitator Burst', src: 'game8', url: G8(500766),
    weapon: 'Blazing Gariel', armor: ['Rey Sandhelm γ', 'Numinous Shroud β', 'Rey Sandbraces γ', 'Numinous Overlay β', 'Rey Sandgreaves γ'], charm: 'Chain Charm II' },
  { kind: 'hunting-horn', rank: 'high', hr: 50, style: 'defensive', name: 'Comfy Zoh Raw', src: 'game8', url: G8(500766),
    weapon: 'Queen Chordmaker', armor: ['Numinous Crown β', 'Numinous Shroud α', 'G. Arkveld Vambraces β', 'Numinous Overlay β', 'Numinous Greaves β'], charm: 'Evasion Charm IV' },
  { kind: 'hunting-horn', rank: 'high', hr: 9, style: 'support', name: 'Mixed Foray', src: 'game8', url: G8(500766),
    weapon: 'Valkyrie Chordmaker I', armor: ['Barina Headgear β', 'Rathian Mail α', 'Kut-Ku Vambraces α', 'Rathian Coil β', 'Conga Greaves β'], charm: 'Chainblade Charm I' },
  { kind: 'hunting-horn', rank: 'low', hr: 6, style: 'aggressive', name: 'Flayer Burst', src: 'game8', url: G8(500766),
    weapon: 'Albirath Feroce I', armor: ['G. Ebony Helm', 'G. Arkveld Mail', 'G. Ebony Braces', 'G. Arkveld Coil', 'G. Rathalos Greaves'], charm: 'Chainblade Charm I' },
  { kind: 'hunting-horn', rank: 'low', hr: 4, style: 'technical', name: 'Rey Dau & Hirabami', src: 'game8', url: G8(500766),
    weapon: 'Ajara Reverberator I', armor: ['Rey Sandhelm', 'Rey Sandmail', 'Hirabami Vambraces', 'Hirabami Coil', 'Nerscylla Greaves'], charm: 'Evasion Charm I' },
  { kind: 'hunting-horn', rank: 'low', hr: 1, style: 'beginner', name: 'Evade Extender Starter', src: 'game8', url: G8(500766),
    weapon: 'Bone Horn II', armor: ['Doshaguma Helm', 'Doshaguma Mail', 'Balahara Vambraces', 'Balahara Coil', 'Balahara Greaves'] },
  // ---------------------------------------------------------------- Lance
  { kind: 'lance', rank: 'high', hr: 100, style: 'aggressive', name: 'AGI-WEX-Flayer Guts', src: 'game8', url: G8(500767),
    weapon: 'Aether Pike', armor: ['Arkvulcan Helm γ', 'Arkvulcan Mail γ', 'Arkvulcan Vambraces γ', 'Gore Coil β', 'Arkvulcan Greaves γ'], charm: 'Challenger Charm III' },
  { kind: 'lance', rank: 'high', hr: 50, style: 'defensive', name: '4x Zoh Shia Comfy Tank', src: 'game8', url: G8(500767),
    weapon: 'Skyscraper', armor: ['Numinous Crown β', 'Numinous Shroud β', 'G. Arkveld Vambraces β', 'Numinous Overlay β', 'Numinous Greaves β'], charm: 'Fire Charm III' },
  { kind: 'lance', rank: 'high', hr: 36, style: 'aggressive', name: 'Frenzied Agitator Raw', src: 'game8', url: G8(500767),
    weapon: 'Skyscraper', armor: ['Gore Helm β', 'Blango Mail β', 'G. Arkveld Vambraces β', 'Arkvulcan Coil β', 'Gore Greaves β'], charm: 'Challenger Charm II' },
  { kind: 'lance', rank: 'high', hr: 21, style: 'balanced', name: 'Max Might Blast', src: 'game8', url: G8(500767),
    weapon: 'Artian Lance I', armor: ['G. Fulgur Helm β', 'G. Rathalos Mail β', 'G. Fulgur Vambraces α', 'G. Rathalos Coil α', 'G. Rathalos Greaves β'], charm: 'Leaping Charm III' },
  { kind: 'lance', rank: 'high', hr: 9, style: 'defensive', name: 'Burst WEX Guard', src: 'game8', url: G8(500767),
    weapon: 'Quematrice Lanza III', armor: ['Bulaqchi Specs α', 'Nerscylla Mail α', 'Talioth Vambraces α', 'Gypceros Coil β', 'Conga Greaves β'], charm: 'Chainblade Charm I' },
  { kind: 'lance', rank: 'low', hr: 6, style: 'technical', name: 'WEX Flayer Evasion', src: 'game8', url: G8(500767),
    weapon: 'G. Veldian Lancea I', armor: ['G. Arkveld Helm', 'G. Arkveld Mail', 'G. Rathalos Vambraces', 'Balahara Coil', 'G. Rathalos Greaves'], charm: 'Leaping Charm I' },
  { kind: 'lance', rank: 'low', hr: 3, style: 'defensive', name: 'Offensive Guard Evade', src: 'game8', url: G8(500767),
    weapon: 'Nu Osminog I', armor: ['Ajarakan Helm', 'Ajarakan Mail', 'Balahara Vambraces', 'Balahara Coil', 'Ajarakan Greaves'], charm: 'Leaping Charm I' },
  { kind: 'lance', rank: 'low', hr: 1, style: 'beginner', name: 'Evade Guard Starter', src: 'game8', url: G8(500767),
    weapon: 'Bone Lance II', armor: ['Doshaguma Helm', 'Doshaguma Mail', 'Balahara Vambraces', 'Balahara Coil', 'Balahara Greaves'] },
  // ---------------------------------------------------------------- Gunlance
  {
    kind: 'gunlance', rank: 'high', hr: 100, style: 'defensive', name: 'Gogmazios Regen', src: 'mhwb', url: MHWB('gunlance-gogmazios-regen'),
    weapon: 'Auguring Omen',
    armor: ['Gogmazios Helm α', 'Numinous Shroud β', 'G. Ebony Braces β', 'Gogmazios Coil α', 'Gogmazios Greaves β'],
    decos: {
      w: ['Magazine/Ironwall Jwl [3]', 'Blaze/Ironwall Jwl [3]', 'Shield/Ironwall Jwl [3]'],
      head: ['Challenger Jewel [3]', 'Recovery Jewel [1]'], chest: ['Chain Jewel [3]'],
      arms: ['Chain Jewel [3]', 'Jumping Jewel [2]'], waist: ['Jumping Jewel [2]', 'Recovery Jewel [1]', 'Recovery Jewel [1]'],
      legs: ['Challenger Jewel [3]', 'Jumping Jewel [2]', 'Medicine Jewel [1]']
    }
  },
  // ---------------------------------------------------------------- Switch Axe
  {
    kind: 'switch-axe', rank: 'high', hr: 100, style: 'aggressive', name: 'Resentment', src: 'mhwb', url: MHWB('switch-axe-resentment'),
    weapon: 'Wicked Regnum',
    armor: ['Lagiacrus Helm β', 'Udra Miremail γ', 'Udra Mirebraces γ', 'Lagiacrus Coil β', 'Gore Greaves β'],
    decos: {
      w: ['Attack Jewel III [3]', 'Critical Jewel III [3]', 'Quickswitch/Handicraft Jwl [3]'],
      head: ['Tenderizer Jewel [3]', 'Counter Jewel [2]', 'Protection Jewel [1]'], chest: ['Tenderizer Jewel [3]', 'Tenderizer Jewel [3]'],
      arms: ['Tenderizer Jewel [3]', 'Protection Jewel [1]', 'Protection Jewel [1]'], waist: ['Furor Jewel [2]', 'Furor Jewel [2]', 'Steadfast Jewel [1]'],
      legs: ['Chain Jewel [3]', 'Sane Jewel [1]', 'Sane Jewel [1]']
    }
  },
  // ---------------------------------------------------------------- Charge Blade
  {
    kind: 'charge-blade', rank: 'high', hr: 100, style: 'balanced', name: 'Gogma Coalescence', src: 'mhwb', url: MHWB('charge-blade-gogma-coalescence'),
    weapon: 'Promised Abyss',
    armor: ['G. Fulgur Helm β', 'Mizutsune Mail β', 'Gogmazios Vambraces α', 'Gogmazios Coil β', 'Gogmazios Greaves β'],
    decos: {
      w: ['Blaze/Ironwall Jwl [3]', 'Quickswitch/Ironwall Jwl [3]', 'Shield/Ironwall Jwl [3]'],
      head: ['Chain Jewel [3]', 'Protection Jewel [1]'], chest: ['Chain Jewel [3]', 'Challenger Jewel [3]'],
      arms: ['Phoenix Jewel [2]', 'Sheath Jewel [1]'], waist: ['Phoenix Jewel [2]', 'Sheath Jewel [1]', 'Sheath Jewel [1]'],
      legs: ['Flayer Jewel [3]', 'Mighty Jewel [2]', 'Shockproof Jewel [1]']
    }
  },
  // ---------------------------------------------------------------- Insect Glaive
  {
    kind: 'insect-glaive', rank: 'high', hr: 100, style: 'technical', name: 'Gogma Evasion', src: 'mhwb', url: MHWB('insect-glaive-gogmazios-evasion'),
    weapon: 'Limbo Llor',
    armor: ['G. Ebony Helm β', 'Gogmazios Mail β', 'Gogmazios Vambraces α', 'Gogmazios Coil α', 'Rathalos Greaves β'],
    charm: 'Exploiter Charm III',
    decos: {
      w: ['Enhancer/Blaze Jewel [3]', 'Rzr Sharp/Blaze Jwl [3]', 'Crit Elem/Blaze Jwl [3]'],
      head: ['Tenderizer Jewel [3]', 'Protection Jewel [1]'], chest: ['Tenderizer Jewel [3]', 'Evasion Jewel [2]'],
      arms: ['Evasion Jewel [2]', 'Protection Jewel [1]'], waist: ['Evasion Jewel [2]', 'Protection Jewel [1]', 'Physique Jewel [1]'],
      legs: ['Chain Jewel [3]', 'Jumping Jewel [2]', 'Physique Jewel [1]']
    }
  },
  // ---------------------------------------------------------------- Bow
  { kind: 'bow', rank: 'high', hr: 100, style: 'aggressive', name: 'Gogma-Gore', src: 'game8', url: G8(500774),
    weapon: 'Calamitous Angel', armor: ['Arkvulcan Helm γ', 'Gogmazios Mail α', 'Gore Vambraces β', 'Dahaad Shardcoil γ', 'Gogmazios Greaves α'] },
  { kind: 'bow', rank: 'high', hr: 50, style: 'technical', name: 'Max Evasion Comfort', src: 'game8', url: G8(500774),
    weapon: 'Angelbein', armor: ['Numinous Crown β', 'Numinous Shroud β', 'Gore Vambraces α', 'Gore Coil α', 'Dahaad Shardgreaves β'], charm: 'Evasion Charm IV' },
  { kind: 'bow', rank: 'high', hr: 36, style: 'aggressive', name: 'Elemental Coalescence', src: 'game8', url: G8(500774),
    weapon: 'Angelbein', armor: ['Gore Helm β', 'Arkvulcan Mail β', 'Gore Vambraces α', 'Gore Coil β', 'Gore Greaves β'], charm: 'Surge Charm III' },
  { kind: 'bow', rank: 'high', hr: 21, style: 'aggressive', name: 'WEX Burst', src: 'game8', url: G8(500774),
    weapon: 'Artian Sight I', armor: ['G. Ebony Helm β', 'G. Rathalos Mail β', 'G. Ebony Braces α', 'G. Rathalos Coil α', 'G. Rathalos Greaves β'], charm: 'Fitness Charm III' },
  { kind: 'bow', rank: 'high', hr: 9, style: 'balanced', name: 'Comfort Burst', src: 'game8', url: G8(500774),
    weapon: 'Windbrace Bow II', armor: ['Kut-Ku Helm β', 'Nerscylla Mail α', 'Talioth Vambraces α', 'Gypceros Coil β', 'Conga Greaves β'], charm: 'Fitness Charm I' },
  { kind: 'bow', rank: 'low', hr: 6, style: 'aggressive', name: 'Burst Boost', src: 'game8', url: G8(500774),
    weapon: 'Albirath Bow I', armor: ['G. Ebony Helm', 'G. Ebony Mail', 'G. Ebony Braces', 'G. Ebony Coil', 'Xu Wu Greaves'], charm: 'Surge Charm I' },
  { kind: 'bow', rank: 'low', hr: 3, style: 'technical', name: 'Ambush', src: 'game8', url: G8(500774),
    weapon: 'Windbrace Bow I', armor: ['Rey Sandhelm', 'Rey Sandmail', 'Nerscylla Vambraces', 'Balahara Coil', 'Nerscylla Greaves'], charm: 'Fitness Charm I' },
  { kind: 'bow', rank: 'low', hr: 1, style: 'beginner', name: 'Evade Runner', src: 'game8', url: G8(500774),
    weapon: 'Quematrice Arco I', armor: ['Bone Helm', 'Bone Mail', 'Balahara Vambraces', 'Bone Coil', 'Balahara Greaves'] },
  // ---------------------------------------------------------------- Light Bowgun
  {
    kind: 'light-bowgun', rank: 'high', hr: 100, style: 'aggressive', name: 'Gogmazios Coalescence', src: 'mhwb', url: MHWB('light-bowgun-gogmazios-coalescence'),
    weapon: 'Bethorned Agony',
    armor: ['G. Fulgur Helm β', 'Mizutsune Mail β', 'Gogmazios Vambraces α', 'Gogmazios Coil β', 'Gogmazios Greaves β'],
    decos: {
      w: ['Blaze/Precise Jewel [3]', 'Bandolier/Precise Jwl [3]', 'Crit Element/Precise Jwl [3]'],
      head: ['Tenderizer Jewel [3]', 'Protection Jewel [1]'], chest: ['Tenderizer Jewel [3]', 'Tenderizer Jewel [3]'],
      arms: ['Phoenix Jewel [2]', 'Protection Jewel [1]'], waist: ['Phoenix Jewel [2]', 'Protection Jewel [1]', 'Growth Jewel [1]'],
      legs: ['Tenderizer Jewel [3]', 'Phoenix Jewel [2]', 'Shockproof Jewel [1]']
    }
  },
  // ---------------------------------------------------------------- Heavy Bowgun
  { kind: 'heavy-bowgun', rank: 'high', hr: 100, style: 'aggressive', name: 'Gore General-Purpose Pierce', src: 'game8', url: G8(500773),
    weapon: 'Trembling Hels', armor: ['Sororal Earrings α', 'Dahaad Shardmail γ', 'Rey Sandbraces γ', 'Gore Coil β', 'Gore Greaves β'] },
  { kind: 'heavy-bowgun', rank: 'high', hr: 50, style: 'defensive', name: 'Comfy Elemental', src: 'game8', url: G8(500773),
    weapon: 'Greifen', armor: ['Gore Helm β', 'Numinous Shroud β', 'Rey Sandbraces γ', 'Numinous Overlay β', 'Gore Greaves β'], charm: 'Mighty Charm II' },
  { kind: 'heavy-bowgun', rank: 'high', hr: 36, style: 'aggressive', name: 'Max Agitator WEX', src: 'game8', url: G8(500773),
    weapon: 'Greifen', armor: ['Dahaad Shardhelm α', 'Arkvulcan Mail β', 'Dahaad Shardbraces β', 'Arkvulcan Coil β', 'Dahaad Shardgreaves β'], charm: 'Chain Charm II' },
  { kind: 'heavy-bowgun', rank: 'high', hr: 21, style: 'aggressive', name: 'Agitated Max Burst', src: 'game8', url: G8(500773),
    weapon: 'Artian Sheller I', armor: ['G. Ebony Helm β', 'Blango Mail β', 'G. Rathalos Vambraces β', 'G. Ebony Coil β', 'G. Rathalos Greaves β'], charm: 'Chain Charm I' },
  { kind: 'heavy-bowgun', rank: 'high', hr: 9, style: 'balanced', name: 'WEX Burst', src: 'game8', url: G8(500773),
    weapon: 'Tankmage I', armor: ['Bulaqchi Specs α', 'Conga Mail α', 'Talioth Vambraces α', 'Balahara Coil α', 'Chatacabra Greaves β'], charm: 'Chainblade Charm I' },
  { kind: 'heavy-bowgun', rank: 'low', hr: 6, style: 'aggressive', name: 'Burst Flay', src: 'game8', url: G8(500773),
    weapon: 'G. Veldian Tormentum I', armor: ['G. Ebony Helm', 'G. Arkveld Mail', 'G. Ebony Braces', 'G. Ebony Coil', 'G. Arkveld Greaves'], charm: 'Chainblade Charm I' },
  { kind: 'heavy-bowgun', rank: 'low', hr: 3, style: 'technical', name: 'Ambush Partbreaker', src: 'game8', url: G8(500773),
    weapon: 'Bone Shooter II', armor: ['Nerscylla Helm', 'Ajarakan Mail', 'Nerscylla Vambraces', 'Balahara Coil', 'Ajarakan Greaves'], charm: 'Fitness Charm I' },
  { kind: 'heavy-bowgun', rank: 'low', hr: 1, style: 'beginner', name: 'Mobile Spread Starter', src: 'game8', url: G8(500773),
    weapon: 'Bone Shooter II', armor: ['Alloy Helm', 'Balahara Mail', 'Balahara Vambraces', 'Balahara Coil', 'Balahara Greaves'] }
];

module.exports = { SOURCES, BUILDS };

/**
 * Cosmetic outfit ideas (layered armor looks with in-game style colors).
 * colors: per piece { p: primary, s: secondary }.
 */
const LOOKS = [
  {
    id: 'dune-sentinel', name: { fr: 'Sentinelle des dunes', en: 'Dune Sentinel' },
    desc: { fr: 'Tenue légère couleur sable pour arpenter les Plaines venteuses.', en: 'Light sand-colored gear to roam the Windward Plains.' },
    weapon: 'Wyvern Blade "Maple"',
    armor: ['Balahara Helm β', 'Balahara Mail β', 'Balahara Vambraces β', 'Balahara Coil β', 'Balahara Greaves β'],
    colors: { head: { p: '#c9a46a', s: '#7a5638' }, chest: { p: '#d8b878', s: '#5a4030' }, arms: { p: '#c9a46a', s: '#7a5638' }, waist: { p: '#7a5638', s: '#e0c890' }, legs: { p: '#c9a46a', s: '#5a4030' } }
  },
  {
    id: 'crimson-sovereign', name: { fr: 'Souverain écarlate', en: 'Crimson Sovereign' },
    desc: { fr: 'Le roi du ciel en rouge profond et filigrane doré.', en: 'The King of the Skies in deep red with gold filigree.' },
    armor: ['Rathalos Helm α', 'Rathalos Mail α', 'Rathalos Vambraces α', 'Rathalos Coil α', 'Rathalos Greaves α'],
    colors: { head: { p: '#8a1e1a', s: '#e0b050' }, chest: { p: '#a8322a', s: '#e0b050' }, arms: { p: '#8a1e1a', s: '#2f2a26' }, waist: { p: '#2f2a26', s: '#e0b050' }, legs: { p: '#a8322a', s: '#2f2a26' } }
  },
  {
    id: 'frost-warden', name: { fr: 'Gardien du givre', en: 'Frost Warden' },
    desc: { fr: 'Armure de cristal de glace, reflets bleu pâle.', en: 'Ice-crystal armor with pale blue highlights.' },
    armor: ['Dahaad Shardhelm β', 'Dahaad Shardmail β', 'Dahaad Shardbraces β', 'Dahaad Shardcoil β', 'Dahaad Shardgreaves β'],
    colors: { head: { p: '#b8dcec', s: '#3e6e8e' }, chest: { p: '#e8f2f6', s: '#5a8ab0' }, arms: { p: '#8ec0d8', s: '#e8f2f6' }, waist: { p: '#3e6e8e', s: '#e8f2f6' }, legs: { p: '#8ec0d8', s: '#3e6e8e' } }
  },
  {
    id: 'black-eclipse', name: { fr: 'Éclipse noire', en: 'Black Eclipse' },
    desc: { fr: 'Ailes sombres et touches violettes, pour les chasseurs de l’ombre.', en: 'Dark wings and violet accents for shadow hunters.' },
    armor: ['Gore Helm β', 'Gore Mail β', 'Gore Vambraces β', 'Gore Coil β', 'Gore Greaves β'],
    colors: { head: { p: '#2c2329', s: '#7e5ab0' }, chest: { p: '#43354d', s: '#b23a3a' }, arms: { p: '#2c2329', s: '#7e5ab0' }, waist: { p: '#1e1e24', s: '#b23a3a' }, legs: { p: '#43354d', s: '#7e5ab0' } }
  },
  {
    id: 'numinous-oracle', name: { fr: 'Oracle immaculé', en: 'Numinous Oracle' },
    desc: { fr: 'Blanc nacré et or, inspiré du gardien de Wyveria.', en: 'Pearl white and gold, inspired by the guardian of Wyveria.' },
    armor: ['Numinous Crown β', 'Numinous Shroud β', 'Numinous Vambraces β', 'Numinous Overlay β', 'Numinous Greaves β'],
    colors: { head: { p: '#e9e3d1', s: '#c9a95a' }, chest: { p: '#f4efe6', s: '#c9a95a' }, arms: { p: '#e9e3d1', s: '#c9a95a' }, waist: { p: '#c9a95a', s: '#f4efe6' }, legs: { p: '#e9e3d1', s: '#c9a95a' } }
  },
  {
    id: 'sakura-festival', name: { fr: 'Festival des cerisiers', en: 'Cherry Blossom Festival' },
    desc: { fr: 'Kimono de fête rose tendre et ceinture prune.', en: 'Festive soft pink kimono with a plum sash.' },
    armor: ['Sakuratide Headgear α', 'Sakuratide Robe α', 'Sakuratide Bracers α', 'Sakuratide Obi α', 'Sakuratide Hakama α'],
    colors: { head: { p: '#e8b0c0', s: '#6a3a4a' }, chest: { p: '#f0c8d4', s: '#6a3a4a' }, arms: { p: '#e8b0c0', s: '#f4efe6' }, waist: { p: '#6a3a4a', s: '#e8b0c0' }, legs: { p: '#d48aa6', s: '#6a3a4a' } }
  },
  {
    id: 'forest-ranger', name: { fr: 'Rôdeur sylvestre', en: 'Forest Ranger' },
    desc: { fr: 'Feuillages et écorces pour se fondre dans la Forêt écarlate.', en: 'Leaves and bark to blend into the Scarlet Forest.' },
    armor: ['Melahoa Hat α', 'Melahoa Jacket α', 'Melahoa Branch α', 'Melahoa Folia α', 'Melahoa Roots α'],
    colors: { head: { p: '#5f7f3a', s: '#c9b06a' }, chest: { p: '#3a4a2a', s: '#c9b06a' }, arms: { p: '#6f8a5a', s: '#2a3a20' }, waist: { p: '#5f7f3a', s: '#c9b06a' }, legs: { p: '#3a4a2a', s: '#6f8a5a' } }
  },
  {
    id: 'azure-butterfly', name: { fr: 'Papillon azur', en: 'Azure Butterfly' },
    desc: { fr: 'Élytres bleu ciel et reflets dorés, légère et élégante.', en: 'Sky-blue elytra with golden glints, light and elegant.' },
    armor: ['Butterfly Vertex α', 'Butterfly Thorax α', 'Butterfly Brachia α', 'Butterfly Elytra α', 'Butterfly Crura α'],
    colors: { head: { p: '#6a9ac0', s: '#f0e0a0' }, chest: { p: '#4a7ab0', s: '#f0e0a0' }, arms: { p: '#6a9ac0', s: '#2e3a5a' }, waist: { p: '#2e3a5a', s: '#f0e0a0' }, legs: { p: '#6a9ac0', s: '#2e3a5a' } }
  }
];

module.exports.LOOKS = LOOKS;
