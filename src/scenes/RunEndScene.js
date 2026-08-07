/* ═══════════════════════════════════════════════════
   COLD ZERO — RunEndScene
   End-of-run summary screen with letter grades,
   mission results, KV earned, precision stats,
   achievement notifications, and field report.
   ═══════════════════════════════════════════════════ */

class RunEndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RunEndScene' });
  }

  init(data) {
    this.runData = data || {};
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#080808');
    this.cameras.main.fadeIn(400, 8, 8, 8);
    this._transitioning = false;

    const run = GameState.currentRun;
    const hits = run.missions.filter(m => m.hit).length;
    const total = run.missions.length;
    const precision = total > 0 ? Math.round((hits / total) * 100) : 0;
    const kv = run.kv;
    const walkAway = run.walkAway || false;

    // Play radio static transient
    this._playRadioStatic();

    // End the run (updates meta-progression, assigns grade)
    const runResult = GameState.endRun();
    const grade = (runResult && runResult.grade) || '';

    // ── Header ──
    const title = walkAway ? 'CONTRACT TERMINATED EARLY'
      : (total > 0 && hits === total ? 'MISSION COMPLETE' : 'RUN OVER');
    const titleColor = walkAway ? '#CC2200'
      : (total > 0 && hits === total ? '#3DFF6E' : '#C8A84B');

    this.add.text(W / 2, 60, '⦿', {
      fontFamily: 'JetBrains Mono', fontSize: '36px', color: titleColor,
    }).setOrigin(0.5).setAlpha(0);

    const titleText = this.add.text(W / 2, 100, title, {
      fontFamily: 'JetBrains Mono', fontSize: '48px', fontStyle: 'bold',
      color: titleColor, letterSpacing: 8,
    }).setOrigin(0.5).setAlpha(0);

    // ── Letter grade (big, right side) ──
    let gradeText = null;
    if (grade) {
      const gradeColors = { S: '#FFD700', A: '#3DFF6E', B: '#C8A84B', C: '#78808A', D: '#CC6600', F: '#CC2200' };
      gradeText = this.add.text(W / 2 + 220, 90, grade, {
        fontFamily: 'JetBrains Mono', fontSize: '96px', fontStyle: 'bold',
        color: gradeColors[grade] || '#78808A',
      }).setOrigin(0.5).setAlpha(0);
    }

    // ── Stats panel ──
    const panelW = 400;
    const panelX = (W - panelW) / 2;
    const panelY = 160;

    const g = this.add.graphics().setAlpha(0);
    g.fillStyle(0x111111, 1);
    g.fillRect(panelX, panelY, panelW, 300);
    g.lineStyle(1, 0xC8A84B, 0.3);
    g.strokeRect(panelX, panelY, panelW, 300);

    // Divider
    g.lineStyle(1, 0x252525, 1);
    g.beginPath();
    g.moveTo(panelX + 30, panelY + 100);
    g.lineTo(panelX + panelW - 30, panelY + 100);
    g.strokePath();

    // Big KV number
    const kvText = this.add.text(W / 2, panelY + 50, `${kv}`, {
      fontFamily: 'JetBrains Mono', fontSize: '72px', fontStyle: 'bold', color: '#C8A84B',
    }).setOrigin(0.5).setAlpha(0);

    this.add.text(W / 2, panelY + 85, 'KRONOR EARNED', {
      fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#78808A', letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0);

    // Stats rows
    const statsContainer = this.add.container(0, 0).setAlpha(0);
    const rows = [
      { label: 'MISSIONS', value: `${total}` },
      { label: 'HITS', value: `${hits}`, color: '#3DFF6E' },
      { label: 'MISSES', value: `${total - hits}`, color: total - hits > 0 ? '#CC2200' : '#78808A' },
      { label: 'PRECISION', value: `${precision}%`, color: precision >= 80 ? '#3DFF6E' : '#F4F4EF' },
      { label: 'TOTAL KV BANKED', value: `${GameState.metaProgression.totalKV} KV`, color: '#C8A84B' },
    ];

    rows.forEach((row, i) => {
      const ry = panelY + 120 + i * 28;
      statsContainer.add(
        this.add.text(panelX + 40, ry, row.label, {
          fontFamily: 'JetBrains Mono', fontSize: '15px', color: '#78808A', letterSpacing: 2,
        })
      );
      statsContainer.add(
        this.add.text(panelX + panelW - 40, ry, row.value, {
          fontFamily: 'JetBrains Mono', fontSize: '19px', fontStyle: 'bold',
          color: row.color || '#F4F4EF',
        }).setOrigin(1, 0)
      );
    });

    // ── Mission ticker (mini results) ──
    const tickerY = panelY + 280;
    const tickerContainer = this.add.container(0, 0).setAlpha(0);
    const missionW = Math.min(50, (panelW - 60) / total);

    run.missions.forEach((m, i) => {
      const mx = panelX + 30 + i * missionW;
      const mIcon = m.hit ? '●' : '○';
      const mColor = m.hit ? '#3DFF6E' : '#CC2200';
      tickerContainer.add(
        this.add.text(mx + missionW / 2, tickerY, mIcon, {
          fontFamily: 'JetBrains Mono', fontSize: '21px', color: mColor,
        }).setOrigin(0.5)
      );
      tickerContainer.add(
        this.add.text(mx + missionW / 2, tickerY + 16, `${i + 1}`, {
          fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#404040',
        }).setOrigin(0.5)
      );
    });

    // ── Buttons ──
    const btnY = H - 80;

    const newRunBtn = this.add.text(W / 2 - 200, btnY, '[ NEW RUN ]', {
      fontFamily: 'JetBrains Mono', fontSize: '18px', fontStyle: 'bold',
      color: '#3DFF6E', letterSpacing: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);

    const shopBtn = this.add.text(W / 2, btnY, '[ ARMORY ]', {
      fontFamily: 'JetBrains Mono', fontSize: '18px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);

    const menuBtn = this.add.text(W / 2 + 200, btnY, '[ MAIN MENU ]', {
      fontFamily: 'JetBrains Mono', fontSize: '18px', fontStyle: 'bold',
      color: '#78808A', letterSpacing: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);

    newRunBtn.on('pointerover', () => newRunBtn.setColor('#F4F4EF'));
    newRunBtn.on('pointerout', () => newRunBtn.setColor('#3DFF6E'));
    newRunBtn.on('pointerdown', () => {
      GameState.newRun();
      const missions = MissionGenerator.generateRun(GameState.currentRun.runIndex);
      GameState.currentRun.missions = [];
      GameState.currentRun._missionQueue = missions;
      GameState.currentRun.active = true;
      this._transition('ScopeScene', { mission: missions[0] });
    });

    shopBtn.on('pointerover', () => shopBtn.setColor('#F4F4EF'));
    shopBtn.on('pointerout', () => shopBtn.setColor('#C8A84B'));
    shopBtn.on('pointerdown', () => this._transition('UpgradeShopScene'));

    menuBtn.on('pointerover', () => menuBtn.setColor('#F4F4EF'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#78808A'));
    menuBtn.on('pointerdown', () => this._transition('MenuScene'));

    // ── Achievement notifications ──
    if (typeof GameState.getUnlockedAchievements === 'function') {
      const unlocked = GameState.getUnlockedAchievements();
      if (unlocked.length > 0) {
        const achY = panelY + 310;
        const latestAch = unlocked[unlocked.length - 1];
        const achText = this.add.text(W / 2, achY, `★ ${latestAch.name}`, {
          fontFamily: 'JetBrains Mono', fontSize: '15px', fontStyle: 'bold',
          color: '#C8A84B', letterSpacing: 2,
        }).setOrigin(0.5).setAlpha(0);
        const achDesc = this.add.text(W / 2, achY + 16, latestAch.desc, {
          fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#78808A',
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: [achText, achDesc], alpha: 1, duration: 600, delay: 2600 });
      }
    }

    // ── Papers Please-style Field Report (after 5+ runs) ──
    if (GameState.metaProgression.totalRuns >= 5) {
      this._showFieldReport(W, H, panelY, panelW, shopBtn, menuBtn);
    }

    // ── Fade-in sequence ──
    this.tweens.add({ targets: titleText, alpha: 1, duration: 600, delay: 200 });
    if (gradeText) {
      this.tweens.add({ targets: gradeText, alpha: 1, duration: 400, delay: 400, ease: 'Back.easeOut' });
    }
    this.tweens.add({ targets: [g, kvText], alpha: 1, duration: 600, delay: 800 });
    this.tweens.add({ targets: statsContainer, alpha: 1, duration: 600, delay: 1200 });
    this.tweens.add({ targets: tickerContainer, alpha: 1, duration: 400, delay: 1600 });
    this.tweens.add({ targets: [shopBtn, menuBtn, newRunBtn], alpha: 1, duration: 400, delay: 2000 });

    // KV counter animation
    this.time.delayedCall(800, () => {
      let displayKv = 0;
      this.tweens.addCounter({
        from: 0,
        to: kv,
        duration: 1200,
        ease: 'Power2',
        onUpdate: (tween) => {
          displayKv = Math.round(tween.getValue());
          kvText.setText(`${displayKv}`);
        },
      });
    });
  }

  _transition(sceneKey, data) {
    if (this._transitioning) return;
    this._transitioning = true;
    this.cameras.main.fadeOut(300, 8, 8, 8);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(sceneKey, data);
    });
  }

  _playRadioStatic() {
    try {
      const vol = GameState.settings.volSFX * GameState.settings.volMaster;
      const noise = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 }
      });
      const filter = new Tone.Filter(3000, 'highpass');
      const gain = new Tone.Gain(vol * 0.12);
      noise.connect(filter);
      filter.connect(gain);
      gain.toDestination();
      noise.triggerAttackRelease('0.3');
      setTimeout(() => { noise.dispose(); filter.dispose(); gain.dispose(); }, 1500);
    } catch (e) { /* silent */ }
  }

  _showFieldReport(W, H, panelY, panelW, shopBtn, menuBtn) {
    const s = GameState.stats;
    const m = GameState.metaProgression;
    const reportX = (W - panelW) / 2;
    const reportY = panelY + 320;

    const rg = this.add.graphics().setAlpha(0);
    rg.lineStyle(1, 0x404040, 0.3);
    rg.strokeRect(reportX, reportY, panelW, 180);

    const headerText = this.add.text(reportX + 20, reportY + 12, 'FIELD REPORT ─── CLASSIFIED', {
      fontFamily: 'Courier Prime', fontSize: '15px', fontStyle: 'bold',
      color: '#78808A', letterSpacing: 2,
    }).setAlpha(0);

    const lines = [
      `CONTRACTS COMPLETED:  ${s.totalHits}/${s.totalMissions}`,
      `PRECISION RATING:     ${s.totalMissions > 0 ? Math.round(s.totalHits / s.totalMissions * 100) : 0}%`,
      `CIVILIAN INCIDENTS:   ${s.civilianEvents}`,
      `TOTAL COMPENSATION:   ${m.totalKV} KV`,
      `OPERATIONS DEPLOYED:  ${m.totalRuns}`,
      `BEST SINGLE-RUN:      ${s.bestPrecision}%`,
      `ACTIVE LOADOUT:       ${m.activeWeapon.toUpperCase()}`,
    ];

    const reportBody = this.add.text(reportX + 20, reportY + 35, lines.join('\n'), {
      fontFamily: 'Courier Prime', fontSize: '15px',
      color: '#5A5A5A', lineSpacing: 6,
    }).setAlpha(0);

    this.tweens.add({ targets: [rg, headerText, reportBody], alpha: 1, duration: 800, delay: 3000 });
  }
}
