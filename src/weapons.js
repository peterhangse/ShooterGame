/* ═══════════════════════════════════════════════════
   COLD ZERO — Weapons Configuration
   Full weapon profiles with DOPE tables, ballistic
   characteristics, and stat breakdowns.
   ═══════════════════════════════════════════════════ */

/** Dedicated DOPE table for .50 BMG (flatter trajectory, longer range) */
const DOPE_TABLE_50BMG = [
  { range: 100,  elevMOA: 0.0,  windMOA: 0.6,  tof: 0.10 },
  { range: 200,  elevMOA: 1.1,  windMOA: 1.2,  tof: 0.21 },
  { range: 300,  elevMOA: 2.5,  windMOA: 1.9,  tof: 0.33 },
  { range: 400,  elevMOA: 4.5,  windMOA: 2.7,  tof: 0.46 },
  { range: 500,  elevMOA: 7.0,  windMOA: 3.5,  tof: 0.60 },
  { range: 600,  elevMOA: 10.2, windMOA: 4.5,  tof: 0.76 },
  { range: 700,  elevMOA: 14.0, windMOA: 5.6,  tof: 0.93 },
  { range: 800,  elevMOA: 18.6, windMOA: 6.9,  tof: 1.12 },
  { range: 900,  elevMOA: 24.0, windMOA: 8.4,  tof: 1.34 },
  { range: 1000, elevMOA: 30.5, windMOA: 10.1, tof: 1.58 },
  { range: 1100, elevMOA: 38.0, windMOA: 12.0, tof: 1.85 },
  { range: 1200, elevMOA: 47.0, windMOA: 14.2, tof: 2.15 },
];

/** Dedicated DOPE table for 12GA slug (extreme drop, short range) */
const DOPE_TABLE_12GA = [
  { range: 25,  elevMOA: 0.0,  windMOA: 0.1, tof: 0.06 },
  { range: 50,  elevMOA: 1.5,  windMOA: 0.2, tof: 0.13 },
  { range: 75,  elevMOA: 4.2,  windMOA: 0.3, tof: 0.21 },
  { range: 100, elevMOA: 8.5,  windMOA: 0.4, tof: 0.30 },
  { range: 125, elevMOA: 14.5, windMOA: 0.5, tof: 0.41 },
  { range: 150, elevMOA: 22.0, windMOA: 0.6, tof: 0.54 },
];

/** Dedicated DOPE table for 6.5 Creedmoor DMR */
const DOPE_TABLE_65CM = [
  { range: 100,  elevMOA: 0.0,  windMOA: 0.4,  tof: 0.11 },
  { range: 200,  elevMOA: 1.8,  windMOA: 0.8,  tof: 0.23 },
  { range: 300,  elevMOA: 4.2,  windMOA: 1.3,  tof: 0.36 },
  { range: 400,  elevMOA: 7.2,  windMOA: 1.8,  tof: 0.51 },
  { range: 500,  elevMOA: 11.0, windMOA: 2.4,  tof: 0.68 },
  { range: 600,  elevMOA: 15.8, windMOA: 3.0,  tof: 0.87 },
  { range: 700,  elevMOA: 21.8, windMOA: 3.7,  tof: 1.09 },
  { range: 800,  elevMOA: 29.2, windMOA: 4.5,  tof: 1.34 },
  { range: 900,  elevMOA: 38.0, windMOA: 5.5,  tof: 1.62 },
  { range: 1000, elevMOA: 48.5, windMOA: 6.6,  tof: 1.94 },
];

const WEAPONS = {
  bolt308: {
    name: '.308 WIN BOLT-ACTION',
    shortName: '.308',
    caliber: '.308 Win',
    grains: '175gr SMK',
    dropKoeff: 1.0,
    windMultiplier: 1.0,
    maxRange: 800,
    clicksPerMOA: 4,       // 0.25 MOA per click
    unlockCost: 0,          // Default weapon
    muzzleVelocity: 790,   // m/s
    spinDrift: 0.01,        // MOA per 100m
    recoilIntensity: 0.5,  // Camera shake multiplier
    description: 'Reliable workhorse. Balanced drop and wind.\nGood out to 800m in trained hands.',
    dopeTable: null,        // Uses DOPE_TABLE_308 default
  },

  antiMat50: {
    name: '.50 CAL ANTI-MATERIEL',
    shortName: '.50 CAL',
    caliber: '.50 BMG',
    grains: '660gr AMAX',
    dropKoeff: 0.6,
    windMultiplier: 1.4,
    maxRange: 1200,
    clicksPerMOA: 4,
    unlockCost: 1500,
    muzzleVelocity: 900,
    spinDrift: 0.015,
    recoilIntensity: 1.0,
    description: 'Heavy anti-materiel rifle. Flat trajectory\nbut more wind-sensitive at range.\nEffective out to 1200m.',
    dopeTable: DOPE_TABLE_50BMG,
  },

  shotgun: {
    name: '12GA TACTICAL',
    shortName: '12GA',
    caliber: '12 GA',
    grains: '1oz SLUG',
    dropKoeff: 2.5,
    windMultiplier: 0.4,
    maxRange: 150,
    clicksPerMOA: 2,
    unlockCost: 800,
    muzzleVelocity: 460,
    spinDrift: 0.0,
    recoilIntensity: 0.8,
    description: 'Massive slug. Extreme drop but nearly\nimmune to wind. CQB range only.\nMax effective range: 150m.',
    dopeTable: DOPE_TABLE_12GA,
  },

  dmr65: {
    name: '6.5 CREEDMOOR DMR',
    shortName: '6.5 CM',
    caliber: '6.5 Creedmoor',
    grains: '140gr ELD-M',
    dropKoeff: 0.85,
    windMultiplier: 0.75,
    maxRange: 1000,
    clicksPerMOA: 4,
    unlockCost: 2000,
    muzzleVelocity: 860,
    spinDrift: 0.008,
    recoilIntensity: 0.3,
    description: 'Precision DMR with superior ballistic\ncoefficient. Less drop and less wind drift.\nThe surgeon\'s choice.',
    dopeTable: DOPE_TABLE_65CM,
  },
};

/**
 * Get a weapon config by ID.
 * @param {string} id - Weapon key (e.g. 'bolt308')
 * @returns {Object} Weapon configuration
 */
function getWeapon(id) {
  return WEAPONS[id] || WEAPONS.bolt308;
}

/**
 * Get the currently active weapon based on GameState.
 * @returns {Object} Active weapon configuration
 */
function getActiveWeapon() {
  return getWeapon(GameState.metaProgression.activeWeapon);
}

/**
 * Get all weapons sorted by unlock cost.
 * @returns {Array} Array of [key, weapon] pairs
 */
function getAllWeapons() {
  return Object.entries(WEAPONS).sort((a, b) => a[1].unlockCost - b[1].unlockCost);
}
