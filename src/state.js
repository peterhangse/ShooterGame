/* ═══════════════════════════════════════════════════
   COLD ZERO — GameState Singleton
   Central state with localStorage persistence,
   versioned saves, import/export, and validation.
   ═══════════════════════════════════════════════════ */

/** Save format version — bump when schema changes */
const SAVE_VERSION = 4;

const GameState = {
  // ── Current run state ──
  currentRun: {
    runIndex: 0,
    missionIndex: 0,
    missions: [],
    consecutiveFails: 0,
    kv: 0,
    walkAway: false,
  },

  // ── Current mission dial values ──
  dialValues: {
    elevation: 0,
    windage: 0,
    cant: 0,
    rangeEstimate: 400,
  },

  // ── Meta-progression (persists across runs) ──
  metaProgression: {
    totalKV: 0,
    totalRuns: 0,
    upgrades: {
      betterScope: false,     // 200 KV — inertia 0.08 → 0.14
      windMeterMk2: false,    // 350 KV — windUncertainty 3 → 1
      ballisticTape: false,   // 500 KV — drop curve in scope
      coldBoreKit: false,     // 800 KV — removes random scatter
    },
    unlockedWeapons: ['bolt308'], // Start with .308
    activeWeapon: 'bolt308',
  },

  // ── Cumulative stats ──
  stats: {
    totalMissions: 0,
    totalHits: 0,
    totalMisses: 0,
    civilianEvents: 0,
    bestPrecision: 0,
    avgResponseTime: 0,
    totalResponseTime: 0,
    longestStreak: 0,
    currentStreak: 0,
    perfectRuns: 0,           // Runs with 100% accuracy
    nightMissionsCompleted: 0,
    highscores: [],           // Top 5: { kv, date, precision, runIndex, grade }
  },

  // ── Achievements ──
  achievements: {
    firstBlood:     false,    // First confirmed kill
    sharpshooter:   false,    // 5 hits in a row
    ghostOperator:  false,    // Perfect run (5/5)
    veteranSniper:  false,    // Complete 10 runs
    eliteMarksman:  false,    // 90%+ precision over 20+ missions
    bigSpender:     false,    // Buy all 4 upgrades
    longShot:       false,    // Hit at 700m+
    speedDemon:     false,    // Complete mission in under 10s
    nightOwl:       false,    // Complete 5 night missions
    ironWill:       false,    // 0 walk-aways in 10+ runs
  },

  // ── Settings ──
  settings: {
    volMaster: 0.8,
    volSFX: 0.8,
    volWeapon: 1.0,
    volAmbient: 0.5,
    performanceMode: false,
    showCorrectionHints: true,
    screenShake: true,
    tutorialCompleted: false,
    walkthroughCompleted: false,
    _seenTooltips: {},           // progressive hints: { wind, timer, moving, civilian, night }
  },

  // ── Methods ──

  /**
   * Reset dial values for a new mission.
   */
  resetDials() {
    this.dialValues.elevation = 0;
    this.dialValues.windage = 0;
    this.dialValues.cant = 0;
    this.dialValues.rangeEstimate = 400;
  },

  /**
   * Start a new run.
   */
  newRun() {
    this.currentRun = {
      runIndex: this.metaProgression.totalRuns,
      missionIndex: 0,
      missions: [],
      consecutiveFails: 0,
      kv: 0,
      walkAway: false,
    };
    this.resetDials();
  },

  /**
   * Record a mission result.
   */
  recordMission(hit, kvEarned, responseTime) {
    this.currentRun.missions.push({ hit, kvEarned, responseTime });
    this.currentRun.missionIndex++;
    this.stats.totalMissions++;

    // Response time tracking
    if (responseTime > 0) {
      this.stats.totalResponseTime += responseTime;
      this.stats.avgResponseTime = Math.round(this.stats.totalResponseTime / this.stats.totalMissions);
    }

    if (hit) {
      this.currentRun.kv += kvEarned;
      this.currentRun.consecutiveFails = 0;
      this.stats.totalHits++;
      this.stats.currentStreak++;

      // Track longest streak
      if (this.stats.currentStreak > this.stats.longestStreak) {
        this.stats.longestStreak = this.stats.currentStreak;
      }

      // Achievement: first blood
      if (!this.achievements.firstBlood) {
        this.achievements.firstBlood = true;
      }
      // Achievement: sharpshooter (5 in a row)
      if (this.stats.currentStreak >= 5 && !this.achievements.sharpshooter) {
        this.achievements.sharpshooter = true;
      }
      // Achievement: speed demon (under 10s)
      if (responseTime > 0 && responseTime < 10 && !this.achievements.speedDemon) {
        this.achievements.speedDemon = true;
      }
    } else {
      this.currentRun.consecutiveFails++;
      this.stats.totalMisses++;
      this.stats.currentStreak = 0;
    }
  },

  /**
   * End the current run and update meta-progression.
   */
  endRun() {
    const run = this.currentRun;
    this.metaProgression.totalKV += run.kv;
    this.metaProgression.totalRuns++;

    // Calculate precision for this run
    const hits = run.missions.filter(m => m.hit).length;
    const total = run.missions.length;
    const precision = total > 0 ? Math.round((hits / total) * 100) : 0;

    // Letter grade
    const grade = precision === 100 ? 'S'
      : precision >= 80 ? 'A'
      : precision >= 60 ? 'B'
      : precision >= 40 ? 'C'
      : precision >= 20 ? 'D'
      : 'F';

    // Perfect run tracking
    if (precision === 100 && total >= 5) {
      this.stats.perfectRuns++;
      if (!this.achievements.ghostOperator) this.achievements.ghostOperator = true;
    }

    // Veteran achievement
    if (this.metaProgression.totalRuns >= 10 && !this.achievements.veteranSniper) {
      this.achievements.veteranSniper = true;
    }

    // Elite marksman achievement
    if (this.stats.totalMissions >= 20) {
      const overallPrecision = Math.round((this.stats.totalHits / this.stats.totalMissions) * 100);
      if (overallPrecision >= 90 && !this.achievements.eliteMarksman) {
        this.achievements.eliteMarksman = true;
      }
    }

    // Big spender achievement
    const allUpgrades = Object.values(this.metaProgression.upgrades).every(v => v);
    if (allUpgrades && !this.achievements.bigSpender) {
      this.achievements.bigSpender = true;
    }

    // Iron will: no walk-aways in 10+ runs
    if (this.metaProgression.totalRuns >= 10 && !run.walkAway) {
      // Check by looking at whether walkAway was ever true - simplified: just track here
      if (!this.achievements.ironWill && this.stats.perfectRuns > 0) {
        this.achievements.ironWill = true;
      }
    }

    // Update highscores (top 5)
    this.stats.highscores.push({
      kv: run.kv,
      date: new Date().toISOString().split('T')[0],
      precision,
      runIndex: run.runIndex,
      grade,
    });
    this.stats.highscores.sort((a, b) => b.kv - a.kv);
    this.stats.highscores = this.stats.highscores.slice(0, 5);

    if (precision > this.stats.bestPrecision) {
      this.stats.bestPrecision = precision;
    }

    this.save();
  },

  /**
   * Check and award distance-based achievements.
   * Called from ScopeScene after a hit.
   */
  checkMissionAchievements(mission, shotResult) {
    if (shotResult.isHit && mission.targetDistance >= 700 && !this.achievements.longShot) {
      this.achievements.longShot = true;
    }
    if (mission.nightMode && shotResult.isHit) {
      this.stats.nightMissionsCompleted++;
      if (this.stats.nightMissionsCompleted >= 5 && !this.achievements.nightOwl) {
        this.achievements.nightOwl = true;
      }
    }
  },

  /**
   * Get list of unlocked achievements with metadata.
   */
  getUnlockedAchievements() {
    const NAMES = {
      firstBlood:     { name: 'FIRST BLOOD',      desc: 'First confirmed kill' },
      sharpshooter:   { name: 'SHARPSHOOTER',     desc: '5 consecutive hits' },
      ghostOperator:  { name: 'GHOST OPERATOR',   desc: 'Perfect run (5/5)' },
      veteranSniper:  { name: 'VETERAN SNIPER',   desc: 'Complete 10 campaigns' },
      eliteMarksman:  { name: 'ELITE MARKSMAN',   desc: '90%+ over 20 missions' },
      bigSpender:     { name: 'BIG SPENDER',      desc: 'Buy all upgrades' },
      longShot:       { name: 'LONG SHOT',        desc: 'Hit at 700m+' },
      speedDemon:     { name: 'SPEED DEMON',      desc: 'Mission under 10 seconds' },
      nightOwl:       { name: 'NIGHT OWL',        desc: '5 night missions completed' },
      ironWill:       { name: 'IRON WILL',        desc: 'Never walked away' },
    };
    return Object.entries(this.achievements)
      .filter(([_, unlocked]) => unlocked)
      .map(([key]) => ({ key, ...NAMES[key] }));
  },

  /**
   * Save state to localStorage with version tag.
   */
  save() {
    try {
      const data = {
        _version: SAVE_VERSION,
        _savedAt: new Date().toISOString(),
        metaProgression: this.metaProgression,
        stats: this.stats,
        achievements: this.achievements,
        settings: this.settings,
      };
      localStorage.setItem('coldZero_state', JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn('[COLD ZERO] Storage full. Progress will not persist.');
        this._storageError = true;
      } else {
        console.warn('[COLD ZERO] localStorage save failed:', e.message);
      }
    }
  },

  /**
   * Load state from localStorage with migration support.
   */
  load() {
    try {
      const raw = localStorage.getItem('coldZero_state');
      if (!raw) return false;

      const data = JSON.parse(raw);

      // Migrate from version 1 (no version field) to version 2
      if (!data._version || data._version < 2) {
        console.log('[COLD ZERO] Migrating save data v1 → v2');
        if (!data.achievements) data.achievements = {};
        if (!data.stats?.totalResponseTime) {
          if (data.stats) data.stats.totalResponseTime = 0;
        }
      }

      // Migrate from version 2 to version 3 (tutorial flags)
      if (data._version < 3) {
        console.log('[COLD ZERO] Migrating save data v2 → v3');
        if (data.settings) {
          if (data.settings.tutorialCompleted === undefined) data.settings.tutorialCompleted = false;
          if (data.settings.walkthroughCompleted === undefined) data.settings.walkthroughCompleted = false;
        }
      }

      // Migrate from version 3 to version 4 (interactive walkthrough replaces passive one)
      if (!data._version || data._version < 4) {
        console.log('[COLD ZERO] Migrating save data v3 → v4 (new interactive tutorial)');
        if (data.settings) {
          data.settings.walkthroughCompleted = false; // retrigger with new interactive system
          data.settings._seenTooltips = {};            // reset progressive tips
        }
      }

      if (data.metaProgression) Object.assign(this.metaProgression, data.metaProgression);
      if (data.stats) {
        // Merge carefully to preserve new fields
        Object.keys(data.stats).forEach(k => { this.stats[k] = data.stats[k]; });
      }
      if (data.achievements) {
        Object.keys(data.achievements).forEach(k => { this.achievements[k] = data.achievements[k]; });
      }
      if (data.settings) Object.assign(this.settings, data.settings);
      return true;
    } catch (e) {
      console.warn('[COLD ZERO] localStorage load failed:', e.message);
      return false;
    }
  },

  /**
   * Export save data as a JSON string (for sharing/backup).
   */
  exportSave() {
    return JSON.stringify({
      _version: SAVE_VERSION,
      _exportedAt: new Date().toISOString(),
      metaProgression: this.metaProgression,
      stats: this.stats,
      achievements: this.achievements,
      settings: this.settings,
    }, null, 2);
  },

  /**
   * Import save data from a JSON string.
   * @param {string} jsonStr - The JSON save data
   * @returns {boolean} True if import succeeded
   */
  importSave(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.metaProgression || !data.stats) {
        console.warn('[COLD ZERO] Invalid save data structure');
        return false;
      }
      Object.assign(this.metaProgression, data.metaProgression);
      Object.keys(data.stats).forEach(k => { this.stats[k] = data.stats[k]; });
      if (data.achievements) {
        Object.keys(data.achievements).forEach(k => { this.achievements[k] = data.achievements[k]; });
      }
      if (data.settings) Object.assign(this.settings, data.settings);
      this.save();
      return true;
    } catch (e) {
      console.warn('[COLD ZERO] Import failed:', e.message);
      return false;
    }
  },

  /**
   * Full reset — wipe all progress.
   */
  reset() {
    try {
      localStorage.removeItem('coldZero_state');
    } catch (e) {
      // Silently continue
    }
    this.metaProgression.totalKV = 0;
    this.metaProgression.totalRuns = 0;
    this.metaProgression.upgrades = {
      betterScope: false,
      windMeterMk2: false,
      ballisticTape: false,
      coldBoreKit: false,
    };
    this.metaProgression.unlockedWeapons = ['bolt308'];
    this.metaProgression.activeWeapon = 'bolt308';
    this.stats = {
      totalMissions: 0,
      totalHits: 0,
      totalMisses: 0,
      civilianEvents: 0,
      bestPrecision: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      longestStreak: 0,
      currentStreak: 0,
      perfectRuns: 0,
      nightMissionsCompleted: 0,
      highscores: [],
    };
    this.achievements = {
      firstBlood: false, sharpshooter: false, ghostOperator: false,
      veteranSniper: false, eliteMarksman: false, bigSpender: false,
      longShot: false, speedDemon: false, nightOwl: false, ironWill: false,
    };
    this.newRun();
  },
};
