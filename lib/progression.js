'use strict';

/**
 * Hunter Rank (HR) requirements.
 *
 * Monster Hunter Wilds gates gear behind story progress and the monsters you can hunt,
 * not behind an explicit HR per piece. These tables give the minimum HR at which each
 * monster (and its tempered / arch-tempered versions) can be hunted; gear inherits the
 * highest HR among the materials it needs (each material counted at its easiest source).
 *
 * Sources: Game8 Hunter Rank / Tempered / Arch-Tempered guides, Fextralife Title Update 4
 * (High Rank starts at HR 9, cap lifted at HR 41, 9-10★ content at HR 100).
 */

// Floor per gear rarity.
const HR_BY_RARITY = {
  1: 1, 2: 1, 3: 3, 4: 5,     // Low Rank (HR 1-8)
  5: 9, 6: 16, 7: 21, 8: 41   // High Rank (starts at HR 9, cap lifted at HR 41)
};

// Low Rank: HR reached when the monster is first hunted in the story.
const LOW_RANK_HR = {
  'Chatacabra': 1, 'Quematrice': 2, 'Doshaguma': 3, 'Balahara': 3, 'Lala Barina': 3,
  'Rey Dau': 4, 'Congalala': 4, 'Rompopolo': 4, 'Uth Duna': 4, 'Nu Udra': 5, 'Hirabami': 5,
  'Ajarakan': 5, 'Nerscylla': 4, 'Xu Wu': 5, 'Jin Dahaad': 6, 'Guardian Rathalos': 6, 'Guardian Ebony Odogaron': 6,
  'Guardian Doshaguma': 3, 'Guardian Fulgur Anjanath': 6, 'Guardian Arkveld': 7, 'Zoh Shia': 8
};

// High Rank version of each monster.
const HIGH_RANK_HR = {
  'Yian Kut-Ku': 9, 'Nerscylla': 16, 'Lala Barina': 20, 'Guardian Fulgur Anjanath': 20,
  'Mizutsune': 21, 'Gore Magala': 21, 'Lagiacrus': 31, 'Seregios': 31,
  'Arkveld': 41, 'Omega Planetes': 41, 'Zoh Shia': 50, 'Gogmazios': 100
};
const DEFAULT_HIGH_RANK_HR = 9;

// Tempered versions unlock in three tiers (Game8 Tempered Monsters guide).
const TEMPERED_TIER_HR = { 1: 16, 2: 32, 3: 40 };
const TEMPERED_TIER = {
  'Chatacabra': 1, 'Quematrice': 1, 'Lala Barina': 1, 'Congalala': 1, 'Balahara': 1, 'Rompopolo': 1,
  'Nerscylla': 1, 'Hirabami': 1, 'Yian Kut-Ku': 1, 'Gypceros': 1, 'Rathian': 1,
  'Doshaguma': 2, 'Guardian Doshaguma': 2, 'Ajarakan': 2, 'Rathalos': 2, 'Guardian Rathalos': 2,
  'Guardian Ebony Odogaron': 2, 'Guardian Fulgur Anjanath': 2, 'Gravios': 2, 'Blangonga': 2, 'Xu Wu': 2,
  'Rey Dau': 3, 'Uth Duna': 3, 'Nu Udra': 3, 'Jin Dahaad': 3, 'Arkveld': 3, 'Gore Magala': 3,
  'Mizutsune': 3, 'Lagiacrus': 3, 'Seregios': 3
};

// Arch-tempered monsters (γ armor). Arkveld's gate is not published: treated as HR 100 like Nu Udra.
const ARCH_TEMPERED_HR = { 'Rey Dau': 50, 'Uth Duna': 50, 'Nu Udra': 100, 'Jin Dahaad': 100, 'Arkveld': 100 };

const hrForRarity = rarity => HR_BY_RARITY[rarity] || 1;
// Monsters only hunted in High Rank (the source data lists a few of their materials as low rank).
const HIGH_RANK_ONLY = new Set(['Yian Kut-Ku', 'Gypceros', 'Rathian', 'Rathalos', 'Gravios', 'Blangonga']);

const hrForMonster = (name, rank = 'high') => (rank === 'low' && !HIGH_RANK_ONLY.has(name)
  ? LOW_RANK_HR[name] || 1
  : Math.max(HIGH_RANK_HR[name] || DEFAULT_HIGH_RANK_HR, DEFAULT_HIGH_RANK_HR));
const hrForTempered = name => TEMPERED_TIER_HR[TEMPERED_TIER[name] || 1];
const hrForArchTempered = name => ARCH_TEMPERED_HR[name] || 100;

module.exports = { HIGH_RANK_ONLY, HR_BY_RARITY, hrForRarity, hrForMonster, hrForTempered, hrForArchTempered };
