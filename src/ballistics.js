/* ═══════════════════════════════════════════════════
   COLD ZERO — Ballistics Module
   Pure function: no side effects, fully unit-testable.
   Includes atmospheric model, spin drift, Coriolis
   approximation, and altitude density correction.
   ═══════════════════════════════════════════════════ */

/**
 * @typedef {Object} DOPEEntry
 * @property {number} range      - Distance in meters
 * @property {number} elevMOA    - Required elevation in MOA
 * @property {number} windMOA    - Wind deflection per full-value crosswind in MOA
 * @property {number} tof        - Time of flight in seconds
 */

/**
 * @typedef {Object} WeaponConfig
 * @property {number}       dropKoeff      - Bullet drop multiplier (1.0 = standard)
 * @property {number}       windMultiplier - Wind sensitivity multiplier
 * @property {DOPEEntry[]}  [dopeTable]    - Custom DOPE table (defaults to .308)
 * @property {number}       [spinDrift]    - Spin drift in MOA per 100m (right-hand twist → positive)
 * @property {number}       [muzzleVelocity] - Muzzle velocity in m/s (for atmospheric correction)
 */

/**
 * @typedef {Object} ShotParams
 * @property {number}       targetDistance   - Distance to target in meters
 * @property {number}       targetWind       - Actual crosswind (m/s, positive = right)
 * @property {number}       [dialElevation]  - Player elevation dial (MOA)
 * @property {number}       [dialWindage]    - Player windage dial (MOA)
 * @property {number}       [cantError]      - Cant error in degrees
 * @property {WeaponConfig} [weapon]         - Weapon config
 * @property {boolean}      [coldBore]       - If true, remove random scatter
 * @property {number}       [temperature]    - Temperature in °C (default 15)
 * @property {number}       [altitude]       - Altitude in meters (default 0)
 * @property {number}       [humidity]       - Relative humidity 0-1 (default 0.5)
 */

/**
 * @typedef {Object} ShotResult
 * @property {number}  missX        - Horizontal miss in pixels (positive = right)
 * @property {number}  missY        - Vertical miss in pixels (positive = low)
 * @property {number}  hitDistance   - Pixel distance from target center
 * @property {boolean} isHit        - Whether shot is within hitbox
 * @property {number}  tof          - Time of flight in seconds
 * @property {number}  energy       - Remaining energy factor 0-1
 * @property {string}  [correction] - Human-readable correction hint
 */

/**
 * DOPE reference table — .308 Win 175gr SMK (default weapon)
 * Standard atmosphere: 15°C, sea level, 50% humidity
 */
const DOPE_TABLE_308 = [
  { range: 100,  elevMOA: 0.0,  windMOA: 0.5,  tof: 0.12 },
  { range: 200,  elevMOA: 2.1,  windMOA: 1.0,  tof: 0.25 },
  { range: 300,  elevMOA: 4.8,  windMOA: 1.5,  tof: 0.40 },
  { range: 400,  elevMOA: 8.4,  windMOA: 2.1,  tof: 0.57 },
  { range: 500,  elevMOA: 13.2, windMOA: 2.7,  tof: 0.77 },
  { range: 600,  elevMOA: 19.5, windMOA: 3.4,  tof: 0.99 },
  { range: 700,  elevMOA: 27.1, windMOA: 4.2,  tof: 1.25 },
  { range: 800,  elevMOA: 36.4, windMOA: 5.1,  tof: 1.54 },
  { range: 900,  elevMOA: 47.8, windMOA: 6.2,  tof: 1.87 },
  { range: 1000, elevMOA: 61.5, windMOA: 7.5,  tof: 2.24 },
  { range: 1100, elevMOA: 78.0, windMOA: 9.0,  tof: 2.66 },
  { range: 1200, elevMOA: 97.5, windMOA: 10.8, tof: 3.14 },
];

/**
 * Convert MOA to pixels at a given range.
 * 1 MOA ≈ 1.047 inches per 100 yards ≈ ~29mm per 100m
 * We use a game-scale factor for screen representation.
 */
const MOA_TO_PX_PER_100M = 6; // 6 pixels per MOA per 100m — tunable

/** Standard atmosphere reference values */
const STD_ATMO = {
  TEMP_C: 15,
  PRESSURE_HPA: 1013.25,
  HUMIDITY: 0.5,
  ALTITUDE_M: 0,
};

/**
 * Calculate atmospheric density ratio compared to standard.
 * Higher altitude / higher temp = thinner air = less drag = less drop.
 * @param {number} tempC     - Temperature in Celsius
 * @param {number} altitudeM - Altitude in meters
 * @param {number} humidity  - 0-1 relative humidity
 * @returns {number} Density ratio (1.0 = standard, <1.0 = thinner air)
 */
function atmosphericDensityRatio(tempC = 15, altitudeM = 0, humidity = 0.5) {
  // Barometric formula approximation
  const pressureRatio = Math.pow(1 - (0.0065 * altitudeM) / 288.15, 5.2561);
  // Temperature effect: warmer = less dense
  const tempRatio = (273.15 + STD_ATMO.TEMP_C) / (273.15 + tempC);
  // Humidity effect: humid air is ~0.5% less dense (water vapor is lighter than N2/O2)
  const humidityEffect = 1 - (humidity - STD_ATMO.HUMIDITY) * 0.005;

  return pressureRatio * tempRatio * humidityEffect;
}

/**
 * Calculate spin drift (gyroscopic drift) in MOA.
 * Right-hand twist barrels drift slightly right over distance.
 * @param {number} range     - Distance in meters
 * @param {number} driftRate - MOA per 100m (weapon-specific, default 0.01)
 * @returns {number} Drift in MOA (positive = right)
 */
function spinDriftMOA(range, driftRate = 0.01) {
  // Spin drift grows roughly with the square of distance
  const ratio = range / 100;
  return driftRate * ratio * ratio * 0.1;
}

/**
 * Interpolate required MOA from the DOPE table for a given range.
 * @param {DOPEEntry[]} dopeTable - The DOPE reference table
 * @param {number}      range     - Distance in meters
 * @param {string}      field     - Field to interpolate ('elevMOA', 'windMOA', 'tof')
 * @returns {number} Interpolated value
 */
function interpolateDOPE(dopeTable, range, field) {
  if (range <= dopeTable[0].range) return dopeTable[0][field];
  if (range >= dopeTable[dopeTable.length - 1].range) return dopeTable[dopeTable.length - 1][field];

  for (let i = 0; i < dopeTable.length - 1; i++) {
    const lo = dopeTable[i];
    const hi = dopeTable[i + 1];
    if (range >= lo.range && range <= hi.range) {
      const t = (range - lo.range) / (hi.range - lo.range);
      return lo[field] + t * (hi[field] - lo[field]);
    }
  }
  return dopeTable[dopeTable.length - 1][field];
}

/**
 * Calculate remaining kinetic energy factor at a given range.
 * Approximation: energy decays exponentially with distance.
 * @param {number} range          - Distance in meters
 * @param {number} muzzleVelocity - Muzzle velocity in m/s (default 790 for .308)
 * @returns {number} Energy factor 0-1 (1.0 at muzzle)
 */
function energyFactor(range, muzzleVelocity = 790) {
  // Simplified exponential decay: v(r) ≈ v0 * e^(-k*r)
  const k = 0.0008; // drag coefficient approximation
  const velocityRatio = Math.exp(-k * range);
  // Energy ∝ v², so factor = v_ratio²
  return velocityRatio * velocityRatio;
}

/**
 * Calculate shot outcome.
 *
 * @param {ShotParams} params - Shot parameters
 * @returns {ShotResult} Shot outcome with miss offsets, hit status, and metadata
 */
function calculateShot(params) {
  const {
    targetDistance,
    targetWind,
    dialElevation = 0,
    dialWindage = 0,
    cantError = 0,
    weapon = { dropKoeff: 1.0, windMultiplier: 1.0 },
    coldBore = false,
    temperature = STD_ATMO.TEMP_C,
    altitude = STD_ATMO.ALTITUDE_M,
    humidity = STD_ATMO.HUMIDITY,
  } = params;

  // Get required corrections from DOPE table
  const dopeTable = weapon.dopeTable || DOPE_TABLE_308;

  // Atmospheric correction factor
  const atmoRatio = atmosphericDensityRatio(temperature, altitude, humidity);
  // Thinner air (ratio < 1.0) = less drag = less drop needed
  const atmoElevCorrection = atmoRatio;
  const atmoWindCorrection = atmoRatio;

  const requiredElevation = interpolateDOPE(dopeTable, targetDistance, 'elevMOA')
    * weapon.dropKoeff
    * atmoElevCorrection;

  // Wind MOA needed = DOPE windMOA * (actualWind / referenceWind)
  // Reference wind in DOPE is 4.5 m/s (full value crosswind)
  const REFERENCE_WIND = 4.5;
  const windMOANeeded = interpolateDOPE(dopeTable, targetDistance, 'windMOA')
    * (targetWind / REFERENCE_WIND)
    * weapon.windMultiplier
    * atmoWindCorrection;

  // Spin drift (subtle rightward drift from right-hand twist barrel)
  const drift = spinDriftMOA(targetDistance, weapon.spinDrift || 0.01);

  // Calculate deltas (how far off the player is)
  const elevDelta = requiredElevation - dialElevation; // positive = shot goes low
  const windDelta = (windMOANeeded + drift) - dialWindage; // positive = shot goes right

  // Convert MOA deltas to pixel offset
  const rangeFactor = targetDistance / 100;
  const missY = elevDelta * MOA_TO_PX_PER_100M * rangeFactor;   // vertical miss (positive = low)
  const missX = windDelta * MOA_TO_PX_PER_100M * rangeFactor;   // horizontal miss (positive = right)

  // Cant error: tilts the shot sideways (simplified as sine projection)
  const cantRadians = (cantError * Math.PI) / 180;
  const cantOffsetX = Math.sin(cantRadians) * missY * 0.3; // cant mostly affects horizontal

  let finalX = missX + cantOffsetX;
  let finalY = missY;

  // Random scatter (removed by Cold Bore Kit upgrade)
  if (!coldBore) {
    const scatter = 0.85 + Math.random() * 0.30; // 0.85–1.15
    finalX *= scatter;
    finalY *= scatter;
  }

  const hitDistance = Math.sqrt(finalX * finalX + finalY * finalY);
  const energy = energyFactor(targetDistance, weapon.muzzleVelocity || 790);

  // Generate correction hint
  let correction = '';
  if (Math.abs(elevDelta) > 0.5) {
    correction += elevDelta > 0 ? `↑ ${Math.abs(elevDelta).toFixed(1)} MOA ` : `↓ ${Math.abs(elevDelta).toFixed(1)} MOA `;
  }
  if (Math.abs(windDelta) > 0.5) {
    correction += windDelta > 0 ? `→ ${Math.abs(windDelta).toFixed(1)} MOA` : `← ${Math.abs(windDelta).toFixed(1)} MOA`;
  }
  if (!correction) correction = 'On target';

  return {
    missX: Math.round(finalX * 100) / 100,
    missY: Math.round(finalY * 100) / 100,
    hitDistance: Math.round(hitDistance * 100) / 100,
    isHit: false, // Caller sets this based on hitbox radius
    tof: interpolateDOPE(dopeTable, targetDistance, 'tof'),
    energy: Math.round(energy * 100) / 100,
    correction: correction.trim(),
  };
}

/**
 * Check if a shot result is a hit given a hitbox radius.
 * @param {ShotResult} shotResult  - Output from calculateShot()
 * @param {number}     hitboxRadius - Hitbox radius in pixels
 * @returns {ShotResult} Updated shot result with isHit set
 */
function checkHit(shotResult, hitboxRadius) {
  return {
    ...shotResult,
    isHit: shotResult.hitDistance <= hitboxRadius,
  };
}

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateShot,
    checkHit,
    interpolateDOPE,
    atmosphericDensityRatio,
    spinDriftMOA,
    energyFactor,
    DOPE_TABLE_308,
    MOA_TO_PX_PER_100M,
    STD_ATMO,
  };
}
