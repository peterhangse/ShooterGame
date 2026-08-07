/* ═══════════════════════════════════════════════════
   COLD ZERO — MenuScene
   Main menu: CAMPAIGN · TRAINING · ARMORY · SETTINGS
   Animated intro, ambient wind, highscores,
   keyboard navigation, achievements display.
   ═══════════════════════════════════════════════════ */

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#080808');
    this.cameras.main.fadeIn(300, 8, 8, 8);

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Start ambient wind ──
    this._startAmbientWind();

    // ── Symbol: ⦿ — gentle pulse ──
    const symbol = this.add.text(cx, cy - 110, '⦿', {
      fontFamily: 'JetBrains Mono', fontSize: '60px', color: '#C8A84B',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: symbol,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 1200,
    });

    // ── Title: COLD ZERO ──
    const title = this.add.text(cx, cy - 55, 'COLD ZERO', {
      fontFamily: 'JetBrains Mono', fontSize: '63px', fontStyle: 'bold',
      color: '#F4F4EF', letterSpacing: 12,
    }).setOrigin(0.5).setAlpha(0);

    // ── Tagline ──
    const tagline = this.add.text(cx, cy - 10, 'One shot. No second chances.', {
      fontFamily: 'Courier Prime', fontSize: '19px', fontStyle: 'italic',
      color: '#78808A', letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0);

    // ── Menu buttons ──
    const btnStyle = (color) => ({
      fontFamily: 'JetBrains Mono', fontSize: '21px', fontStyle: 'bold',
      color, letterSpacing: 6,
    });

    const campaignBtn = this.add.text(cx, cy + 50, 'CAMPAIGN', btnStyle('#C8A84B'))
      .setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    const trainingBtn = this.add.text(cx, cy + 90, 'TRAINING', btnStyle('#78808A'))
      .setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    const armoryBtn = this.add.text(cx, cy + 130, 'ARMORY', btnStyle('#78808A'))
      .setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    const settingsBtn = this.add.text(cx, cy + 170, 'SETTINGS', btnStyle('#404040'))
      .setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    const menuButtons = [campaignBtn, trainingBtn, armoryBtn, settingsBtn];
    const menuActions = [];  // filled after action definitions

    // Hover states with smooth opacity transition
    menuButtons.forEach(btn => {
      const orig = btn.style.color;
      btn.on('pointerover', () => { btn.setColor('#F4F4EF'); this._selectButton(menuButtons, menuButtons.indexOf(btn)); });
      btn.on('pointerout', () => btn.setColor(orig));
    });

    // ── Campaign: start 5-mission run ──
    const startCampaign = () => {
      this._stopAmbientWind();
      GameState.newRun();
      const missions = MissionGenerator.generateRun(GameState.currentRun.runIndex);
      GameState.currentRun.missions = [];
      GameState.currentRun._missionQueue = missions;
      GameState.currentRun.active = true;

      this.cameras.main.fadeOut(300, 8, 8, 8);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('ScopeScene', { mission: missions[0] });
      });
    };
    campaignBtn.on('pointerdown', startCampaign);
    menuActions.push(startCampaign);

    // ── Training round ──
    const startTraining = () => {
      this._stopAmbientWind();
      GameState.newRun();

      this.cameras.main.fadeOut(300, 8, 8, 8);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('ScopeScene', { mission: MissionGenerator.trainingMission() });
      });
    };
    trainingBtn.on('pointerdown', startTraining);
    menuActions.push(startTraining);

    // ── Armory ──
    const openArmory = () => {
      this._stopAmbientWind();
      this.cameras.main.fadeOut(300, 8, 8, 8);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('UpgradeShopScene');
      });
    };
    armoryBtn.on('pointerdown', openArmory);
    menuActions.push(openArmory);

    // ── Settings ──
    const openSettings = () => {
      this._stopAmbientWind();
      this.cameras.main.fadeOut(300, 8, 8, 8);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('SettingsScene');
      });
    };
    settingsBtn.on('pointerdown', openSettings);
    menuActions.push(openSettings);

    // ── Keyboard navigation ──
    this._selectedIdx = 0;
    this._menuButtons = menuButtons;
    this._menuActions = menuActions;
    this._kbActive = false;

    this.input.keyboard.on('keydown-UP', () => this._moveSelection(-1));
    this.input.keyboard.on('keydown-DOWN', () => this._moveSelection(1));
    this.input.keyboard.on('keydown-W', () => this._moveSelection(-1));
    this.input.keyboard.on('keydown-S', () => this._moveSelection(1));
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this._kbActive) menuActions[this._selectedIdx]();
    });
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this._kbActive) menuActions[this._selectedIdx]();
    });

    // ── KV balance (top-right) ──
    if (GameState.metaProgression.totalKV > 0) {
      this.add.text(W - 30, 25, `${GameState.metaProgression.totalKV} KV`, {
        fontFamily: 'JetBrains Mono', fontSize: '18px', fontStyle: 'bold', color: '#C8A84B',
      }).setOrigin(1, 0.5).setAlpha(0.6);
    }

    // ── Achievements badge (top-left) ──
    if (typeof GameState.getUnlockedAchievements === 'function') {
      const unlocked = GameState.getUnlockedAchievements();
      if (unlocked.length > 0) {
        this.add.text(30, 25, `★ ${unlocked.length} ACHIEVEMENT${unlocked.length !== 1 ? 'S' : ''}`, {
          fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#C8A84B', letterSpacing: 2,
        }).setOrigin(0, 0.5).setAlpha(0.5);
      }
    }

    // ── Records ──
    const highscores = GameState.stats.highscores;
    if (highscores.length > 0) {
      const recordsTitle = this.add.text(cx, cy + 220, 'RECORDS', {
        fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#404040', letterSpacing: 4,
      }).setOrigin(0.5).setAlpha(0);

      const recordLines = highscores.slice(0, 5).map((r, i) => {
        const marker = i === 0 ? ' ◆' : '';
        const grade = r.grade ? ` [${r.grade}]` : '';
        return `${i + 1}. ${String(r.kv).padStart(5)} KV  ${r.precision}%${grade}  ${r.date}${marker}`;
      }).join('\n');

      const records = this.add.text(cx, cy + 255, recordLines, {
        fontFamily: 'JetBrains Mono', fontSize: '15px', color: '#404040',
        align: 'center', lineSpacing: 4,
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({ targets: [recordsTitle, records], alpha: 1, duration: 600, delay: 3400 });
    }

    // ── Stats (bottom-left) ──
    if (GameState.stats.totalMissions > 0) {
      const streak = GameState.stats.longestStreak || 0;
      const statsText = `Runs: ${GameState.metaProgression.totalRuns}  Hits: ${GameState.stats.totalHits}/${GameState.stats.totalMissions}  Best: ${GameState.stats.bestPrecision}%  Streak: ${streak}`;
      this.add.text(30, H - 25, statsText, {
        fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#252525', letterSpacing: 1,
      });
    }

    // ── Version (bottom-right) ──
    const ver = typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '0.9.0';
    this.add.text(W - 10, H - 10, `v${ver}`, {
      fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#1a1a1a',
    }).setOrigin(1, 1);

    // ── Fade-in sequence ──
    this.tweens.add({ targets: symbol, alpha: 1, duration: 600, delay: 200 });
    this.tweens.add({ targets: title, alpha: 1, duration: 600, delay: 800 });
    this.tweens.add({ targets: tagline, alpha: 1, duration: 600, delay: 1400 });
    this.tweens.add({ targets: campaignBtn, alpha: 1, duration: 600, delay: 2000 });
    this.tweens.add({ targets: trainingBtn, alpha: 1, duration: 400, delay: 2200 });
    this.tweens.add({ targets: armoryBtn, alpha: 1, duration: 400, delay: 2400 });
    this.tweens.add({ targets: settingsBtn, alpha: 1, duration: 400, delay: 2600 });
  }

  // ── Keyboard navigation helpers ──
  _moveSelection(dir) {
    this._kbActive = true;
    const len = this._menuButtons.length;
    this._selectedIdx = (this._selectedIdx + dir + len) % len;
    this._selectButton(this._menuButtons, this._selectedIdx);
  }

  _selectButton(buttons, idx) {
    buttons.forEach((btn, i) => {
      if (i === idx) {
        btn.setColor('#F4F4EF');
        btn.setScale(1.05);
      } else {
        // Restore original colors
        const colors = ['#C8A84B', '#78808A', '#78808A', '#404040', '#404040'];
        btn.setColor(colors[i]);
        btn.setScale(1);
      }
    });
  }

  // ── Ambient Wind (Tone.js) ──
  _startAmbientWind() {
    try {
      if (GameState._audioUnavailable) return;
      this._windNoise = new Tone.Noise('pink');
      this._windFilter = new Tone.Filter(400, 'lowpass');
      this._windGain = new Tone.Gain(0.12);
      this._windNoise.connect(this._windFilter);
      this._windFilter.connect(this._windGain);
      this._windGain.toDestination();
      this._windNoise.start();
    } catch (e) {
      console.warn('[COLD ZERO] Ambient wind failed:', e.message);
    }
  }

  _stopAmbientWind() {
    try {
      if (this._windNoise) {
        this._windNoise.stop();
        this._windNoise.dispose();
        this._windFilter.dispose();
        this._windGain.dispose();
        this._windNoise = null;
      }
    } catch (e) { /* silent */ }
  }
}
