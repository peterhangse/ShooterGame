/* ═══════════════════════════════════════════════════
   COLD ZERO — Mission Generator
   Creates 5-mission runs with escalating difficulty.
   Each mission has range, wind, time limit, hitbox,
   briefing text, civilian flag, night mode, weather
   system, location, temperature, and optional modifiers.
   ═══════════════════════════════════════════════════ */

const MissionGenerator = {
  // ── Difficulty brackets (by mission index 0-4) ──
  BRACKETS: [
    { rangeMin: 200, rangeMax: 300, windMax: 1.5, timeLimit: 0,  hitbox: 90,  moving: false, label: 'EASY',     kvMultiplier: 1.0 },
    { rangeMin: 250, rangeMax: 400, windMax: 3.0, timeLimit: 45, hitbox: 80,  moving: false, label: 'MODERATE', kvMultiplier: 1.2 },
    { rangeMin: 350, rangeMax: 550, windMax: 4.5, timeLimit: 35, hitbox: 65,  moving: false, label: 'HARD',     kvMultiplier: 1.5 },
    { rangeMin: 450, rangeMax: 650, windMax: 6.0, timeLimit: 30, hitbox: 55,  moving: true,  label: 'EXPERT',   kvMultiplier: 1.8 },
    { rangeMin: 550, rangeMax: 800, windMax: 8.0, timeLimit: 25, hitbox: 45,  moving: true,  label: 'EXTREME',  kvMultiplier: 2.2 },
  ],

  // ── Weather conditions ──
  WEATHER: [
    { type: 'clear',     windMod: 1.0, visMod: 1.0,  label: 'CLEAR',        tempRange: [5, 25]  },
    { type: 'overcast',  windMod: 1.0, visMod: 0.85, label: 'OVERCAST',     tempRange: [2, 18]  },
    { type: 'fog',       windMod: 0.6, visMod: 0.5,  label: 'FOG',          tempRange: [-2, 12] },
    { type: 'rain',      windMod: 1.3, visMod: 0.7,  label: 'LIGHT RAIN',   tempRange: [3, 15]  },
    { type: 'snow',      windMod: 1.1, visMod: 0.6,  label: 'SNOW',         tempRange: [-15, 2] },
    { type: 'dust',      windMod: 1.5, visMod: 0.55, label: 'DUST STORM',   tempRange: [25, 45] },
    { type: 'windy',     windMod: 1.8, visMod: 0.95, label: 'HIGH WINDS',   tempRange: [0, 20]  },
  ],

  // ── Locations ──
  LOCATIONS: [
    'NORTHERN RIDGE', 'INDUSTRIAL DISTRICT', 'PORT AUTHORITY',
    'EMBASSY ROW', 'RIVERSIDE OVERWATCH', 'ROOFTOP DELTA-6',
    'RAILWAY JUNCTION', 'AIRFIELD PERIMETER', 'MOUNTAIN PASS',
    'COASTAL OUTPOST', 'ABANDONED WAREHOUSE', 'CITY CENTER',
    'BRIDGE APPROACH', 'FOREST CLEARING', 'DESERT COMPOUND',
    'HARBOUR CRANE', 'HOTEL ROOFTOP', 'CONSTRUCTION SITE',
    'HIGHWAY OVERPASS', 'CHURCH TOWER',
  ],

  // ── 15 atmospheric briefing templates ──
  BRIEFINGS: [
    'Target is a logistics coordinator.\nRange: %%RANGE%%m. Wind: %%WIND%% m/s %%WINDDIR%%.\n%%MODIFIER%%\n\nLocation: %%LOCATION%%\nConditions: %%WEATHER%%, %%TEMP%%°C\nBuilding roof, third level. One round.',
    'OPERATION: %%NAME%%\n\nRange: %%RANGE%%m\nWind: %%WIND%% m/s %%WINDDIR%%\n%%MODIFIER%%\n\nLocation: %%LOCATION%%\nHigh-value target confirmed.\nOne round. Make it count.',
    'PRIORITY TARGET\n\n%%NAME%%\n\nDistance: %%RANGE%%m\nCrosswind: %%WIND%% m/s %%WINDDIR%%\n%%MODIFIER%%\n\nConditions: %%WEATHER%%\nWindow is closing. You have one shot.',
    'INTEL BRIEF\n\n%%NAME%%\n\nTarget at %%RANGE%%m.\nWind reading: %%WIND%% %%WINDDIR%%.\n%%MODIFIER%%\n\n%%LOCATION%% — %%WEATHER%%\nConfirm the kill.',
    'Overwatch position established.\n\n%%NAME%%\nRange: %%RANGE%%m. %%WINDDIR%% wind %%WIND%% m/s.\n%%MODIFIER%%\n\nTarget is stationary near vehicle.\nClear to engage.',
    'Relay from command:\n\nDesignation %%NAME%%.\n%%RANGE%%m. Wind %%WIND%% %%WINDDIR%%.\n%%MODIFIER%%\n\nNo extraction planned.\nMake it clean.',
    'Intel package received.\n\n%%NAME%%\nSubject last seen at %%RANGE%%m bearing northeast.\nWind: %%WIND%% m/s %%WINDDIR%%.\n%%MODIFIER%%\n\n%%LOCATION%%\nSingle opportunity.',
    'Forward observer confirms:\n\n%%NAME%%\nTarget in open ground. %%RANGE%%m.\nCrosswind %%WIND%% %%WINDDIR%%.\n%%MODIFIER%%\n\nAtmospherics: %%WEATHER%%, %%TEMP%%°C\nYou are weapons free.',
    'Surveillance log #%%LOGNUM%%\n\n%%NAME%%\nSubject stationary. Distance %%RANGE%%m.\nWind %%WIND%% m/s from %%WINDDIR_LONG%%.\n%%MODIFIER%%\n\nConditions: %%WEATHER%%\nEngage at discretion.',
    'FLASH PRIORITY\n\n%%NAME%%\n%%RANGE%%m. %%WINDDIR%% %%WIND%%.\n%%MODIFIER%%\n\nTarget is armed. Collateral risk minimal.\nOne shot authorized.',
    '%%NAME%%\n\nLong gun solution required.\nDistance: %%RANGE%%m.\nWind: %%WIND%% m/s %%WINDDIR%%.\n%%MODIFIER%%\n\n%%LOCATION%% sector\nDo not miss.',
    'Spotters report:\n\n%%NAME%%\nTarget moving between structures.\nCurrent position %%RANGE%%m.\nWind %%WIND%% %%WINDDIR%%.\n%%MODIFIER%%\n\nNext exposure window is final.',
    'Contract %%NAME%%\n\nApproved. Fee on confirmation.\nRange %%RANGE%%m. Wind %%WIND%% m/s %%WINDDIR%%.\n%%MODIFIER%%\n\n%%LOCATION%%\nNo questions after.',
    'Thermal imaging confirms one subject.\n\n%%NAME%%\nRange %%RANGE%%m\nAtmospherics: %%WIND%% m/s %%WINDDIR%%, %%TEMP%%°C\n%%MODIFIER%%\n\nSend it.',
    '%%NAME%%\n\nSubject is the one on the left.\nRange: %%RANGE%%m.\nWind: %%WIND%% m/s %%WINDDIR%%.\n%%MODIFIER%%\n\n%%LOCATION%%\nDo not confuse them.',
  ],

  OPERATION_NAMES: [
    'SILENT VIPER', 'IRON DUSK', 'BLACK HORIZON', 'GHOST WIND',
    'PALE SHADOW', 'COLD EMBER', 'STEEL RAIN', 'NIGHT ORACLE',
    'DEAD RECKONING', 'BROKEN ARROW', 'FROST BITE', 'DARK REACH',
    'WOLF TRACK', 'RED DAWN', 'HOLLOW POINT', 'PAPER TRAIL',
    'GRAY MIRAGE', 'THIN ICE', 'SALT WIND', 'DEAD DROP',
    'STONE ECHO', 'BLIND MERIDIAN', 'COPPER VEIN', 'ZERO LINE',
    'SILVER THREAD', 'IRON CURTAIN', 'COLD FRONT', 'DARK WATER',
    'SMOKE SIGNAL', 'NIGHT HAMMER', 'GHOST PROTOCOL', 'BLOOD MERIDIAN',
  ],

  // ── Modifier text pools ──
  MODIFIER_CIVILIAN: [
    'Civilian presence reported. Identify target.',
    'Bystanders in the area. Positive ID required.',
    'Non-combatants near the target. Careful.',
  ],
  MODIFIER_MOVING: [
    'Target is mobile. Lead accordingly.',
    'Subject moving between positions. Time the shot.',
    'Target in transit. Wait for pause.',
  ],
  MODIFIER_TIMED: [
    'Time window: %%TIME%%s.',
    'Extraction window closes in %%TIME%%s.',
    '%%TIME%%s before the target moves inside.',
  ],
  MODIFIER_CALM: [
    'No time pressure. Breathe.',
    'Steady conditions. Take your time.',
    'Clear shot. No rush.',
    'Perfect conditions. Make it clean.',
  ],

  /**
   * Generate a full 5-mission run.
   * @param {number} runIndex - the current run number (used for night missions)
   * @returns {Object[]} Array of 5 mission objects
   */
  generateRun(runIndex) {
    const missions = [];
    const usedNames = new Set();
    const usedLocations = new Set();

    // Pick a single weather condition for the run (shared across missions)
    const weatherIdx = Math.floor(Math.random() * this.WEATHER.length);
    const runWeather = this.WEATHER[weatherIdx];

    // Night mission: every 5th run, one random mission is night
    const isNightRun = runIndex > 0 && runIndex % 5 === 0;
    const nightMissionIdx = isNightRun ? Phaser.Math.Between(1, 4) : -1;

    for (let i = 0; i < 5; i++) {
      const m = this.generateMission(i, usedNames, usedLocations, runWeather, runIndex);
      if (i === nightMissionIdx) m.nightMode = true;

      // First-ever mission: pure elevation exercise (no wind, no distractions)
      if (i === 0 && GameState.metaProgression.totalRuns === 0) {
        m.targetWind = 0;
        m.windUncertainty = 0;
        m.targetMoving = false;
        m.civilianPresent = false;
        m.timeLimit = 0;
        m.hitboxRadius = 110;
        m.briefing = 'FIRST OPERATION\n\nRange: ' + m.targetDistance + 'm\nWind: CALM — 0.0 m/s\n\nZero crosswind. Focus on elevation only.\nRead your DOPE strip, set the dial, take the shot.\n\nLocation: ' + m.location + '\nConditions: ' + m.weatherLabel + ', ' + m.temperature + '°C';
      }

      missions.push(m);
    }
    return missions;
  },

  /**
   * Generate a single mission at the given difficulty index.
   */
  generateMission(difficultyIndex, usedNames, usedLocations, weather, runIndex) {
    const bracket = this.BRACKETS[Math.min(difficultyIndex, this.BRACKETS.length - 1)];
    weather = weather || this.WEATHER[0];

    // Range (round to nearest 25m), capped by active weapon
    const weaponMaxRange = getActiveWeapon().maxRange || 800;
    const capRange = Math.min(bracket.rangeMax, weaponMaxRange);
    const range = Math.round(
      (bracket.rangeMin + Math.random() * (Math.max(capRange - bracket.rangeMin, 50))) / 25
    ) * 25;

    // Wind (can be left or right) — modified by weather
    const windSpeed = Math.round(Math.random() * bracket.windMax * weather.windMod * 10) / 10;
    const windSign = Math.random() > 0.5 ? 1 : -1;
    const wind = windSpeed * windSign;

    // Wind uncertainty (reduced by Kestrel MK2 upgrade)
    let windUncertainty = difficultyIndex >= 2
      ? Math.round(Math.random() * 2 * 10) / 10
      : 0;
    if (GameState.metaProgression.upgrades.windMeterMk2) {
      windUncertainty = Math.round(windUncertainty * 0.4 * 10) / 10; // 60% reduction
    }

    // Time limit (0 = unlimited for first mission)
    const timeLimit = bracket.timeLimit;

    // Hitbox (smaller = harder)
    const hitbox = bracket.hitbox;

    // Correct elevation from weapon's DOPE table
    const weapon = getActiveWeapon();
    const dopeTable = weapon.dopeTable || DOPE_TABLE_308;
    const correctElevation = interpolateDOPE(dopeTable, range, 'elevMOA') * weapon.dropKoeff;

    // Moving target
    const targetMoving = bracket.moving && Math.random() > 0.4;

    // Civilian presence (difficulty 3+ has 30% chance)
    const civilianPresent = difficultyIndex >= 3 && Math.random() < 0.3;

    // Temperature from weather
    const [tempMin, tempMax] = weather.tempRange;
    const temperature = Math.round(tempMin + Math.random() * (tempMax - tempMin));

    // Location (unique per run)
    let location;
    do {
      location = this.LOCATIONS[Math.floor(Math.random() * this.LOCATIONS.length)];
    } while (usedLocations && usedLocations.has(location) && usedLocations.size < this.LOCATIONS.length);
    if (usedLocations) usedLocations.add(location);

    // Operation name (unique per run)
    let opName;
    do {
      opName = this.OPERATION_NAMES[Math.floor(Math.random() * this.OPERATION_NAMES.length)];
    } while (usedNames && usedNames.has(opName));
    if (usedNames) usedNames.add(opName);

    // Modifier text
    let modifierText = '';
    if (civilianPresent) {
      modifierText = this.MODIFIER_CIVILIAN[Math.floor(Math.random() * this.MODIFIER_CIVILIAN.length)];
    } else if (targetMoving) {
      modifierText = this.MODIFIER_MOVING[Math.floor(Math.random() * this.MODIFIER_MOVING.length)];
    } else if (timeLimit > 0) {
      const tmpl = this.MODIFIER_TIMED[Math.floor(Math.random() * this.MODIFIER_TIMED.length)];
      modifierText = tmpl.replace('%%TIME%%', String(timeLimit));
    } else {
      modifierText = this.MODIFIER_CALM[Math.floor(Math.random() * this.MODIFIER_CALM.length)];
    }

    // Briefing
    const template = this.BRIEFINGS[Math.floor(Math.random() * this.BRIEFINGS.length)];
    const windDir = wind >= 0 ? '→' : '←';
    const windDirLong = wind >= 0 ? 'east' : 'west';
    const logNum = Math.floor(Math.random() * 900) + 100;
    const briefing = template
      .replace('%%NAME%%', opName)
      .replace('%%RANGE%%', String(range))
      .replace('%%WIND%%', Math.abs(wind).toFixed(1))
      .replace('%%WINDDIR%%', windDir)
      .replace('%%WINDDIR_LONG%%', windDirLong)
      .replace('%%LOGNUM%%', String(logNum))
      .replace('%%MODIFIER%%', modifierText)
      .replace('%%LOCATION%%', location)
      .replace('%%WEATHER%%', weather.label)
      .replace(/%%TEMP%%/g, String(temperature));

    // KV calculation: base + range bonus, scaled by difficulty multiplier
    const baseKV = 80;
    const rangeBonus = Math.round(range / 8);
    const maxKV = Math.round((baseKV + rangeBonus) * bracket.kvMultiplier);

    return {
      targetDistance: range,
      targetWind: wind,
      correctElevation,
      windUncertainty,
      timeLimit,
      targetMoving,
      hitboxRadius: hitbox,
      civilianPresent,
      nightMode: false,
      briefing,
      isTraining: false,
      opName,
      difficultyLabel: bracket.label,
      missionIndex: difficultyIndex,
      kvMultiplier: bracket.kvMultiplier,
      maxKV,
      weather: weather.type,
      weatherLabel: weather.label,
      location,
      temperature,
    };
  },

  /**
   * Calculate KV earned for a hit based on mission parameters and shot quality.
   * @param {Object} mission    - The mission object
   * @param {Object} shotResult - The shot result from ballistics
   * @returns {number} KV earned
   */
  calculateKV(mission, shotResult) {
    if (!shotResult.isHit) return 0;

    const baseKV = 80;
    const rangeBonus = Math.round(mission.targetDistance / 8);
    let kv = (baseKV + rangeBonus) * (mission.kvMultiplier || 1.0);

    // Precision bonus: closer to center = more KV (up to +30%)
    const precision = 1 - Math.min(shotResult.hitDistance / mission.hitboxRadius, 1);
    kv *= (1 + precision * 0.3);

    // Night bonus (+15%)
    if (mission.nightMode) kv *= 1.15;

    // Moving target bonus (+10%)
    if (mission.targetMoving) kv *= 1.10;

    return Math.round(kv);
  },

  /**
   * Generate the training round mission.
   */
  trainingMission() {
    return {
      targetDistance: 250,
      targetWind: 0,
      correctElevation: interpolateDOPE(DOPE_TABLE_308, 250, 'elevMOA'),
      windUncertainty: 0,
      timeLimit: 0,
      targetMoving: false,
      hitboxRadius: 90,
      civilianPresent: false,
      nightMode: false,
      briefing: 'TRAINING ROUND\n\nRange: 250m\nWind: 0.0 m/s\nSingle target. No hostiles.\n\nAdjust elevation: ↑↓\nAdjust windage: ← →\nLevel rifle: Q / E\nConsult the DOPE card.\nTake the shot with SPACE.',
      isTraining: true,
      opName: 'TRAINING',
      difficultyLabel: 'TRAINING',
      missionIndex: 0,
      kvMultiplier: 1.0,
      maxKV: 0,
      weather: 'clear',
      weatherLabel: 'CLEAR',
      location: 'TRAINING RANGE',
      temperature: 15,
    };
  },
};
