'use strict';

/**
 * Hunter Rank (HR) estimates.
 *
 * Monster Hunter Wilds does not gate each piece of gear behind an explicit
 * Hunter Rank: gear unlocks with story progress and with the monsters you can
 * hunt. These tables translate rarity and monster access into an estimated
 * minimum HR so builds can show a clear requirement.
 */

// Minimum HR by gear rarity.
const HR_BY_RARITY = {
  1: 1, 2: 1, 3: 3, 4: 6,     // Low Rank (story chapters 1-3)
  5: 10, 6: 16, 7: 21, 8: 41  // High Rank (8 = post-campaign, HR cap lifted at 41)
};

// High Rank unlock per monster (English names from the source data).
const MONSTER_HR = {
  'Gore Magala': 16,
  'Arkveld': 21,
  'Mizutsune': 21,
  'Lagiacrus': 31,
  'Seregios': 31,
  'Zoh Shia': 41,
  'Omega Planetes': 41,
  'Gogmazios': 41
};
const DEFAULT_MONSTER_HR = 10;

function hrForRarity(rarity) {
  return HR_BY_RARITY[rarity] || 1;
}

function hrForMonster(nameEn) {
  return MONSTER_HR[nameEn] || DEFAULT_MONSTER_HR;
}

module.exports = { HR_BY_RARITY, hrForRarity, hrForMonster };
