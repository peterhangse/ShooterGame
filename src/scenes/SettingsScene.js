/* ═══════════════════════════════════════════════════
   COLD ZERO — SettingsScene
   Volume sliders, performance toggle, gameplay
   options, export/import save, keyboard layout,
   achievement viewer, data reset.
   ═══════════════════════════════════════════════════ */

class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this._transitioning = false;

    this.cameras.main.setBackgroundColor('#080808');
    this.cameras.main.fadeIn(300, 8, 8, 8);

    // ── Header ──
    this.add.text(W / 2, 35, 'SETTINGS', {
      fontFamily: 'JetBrains Mono', fontSize: '36px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 8,
    }).setOrigin(0.5);

    // TWO-COLUMN LAYOUT
    const colL = W * 0.25;  // left column center
    const colR = W * 0.72;  // right column center

    // ════════════ LEFT COLUMN: Audio & Gameplay ════════════

    // ── Volume sliders ──
    let y = 80;
    this.add.text(colL, y, 'AUDIO', {
      fontFamily: 'JetBrains Mono', fontSize: '13px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 4,
    }).setOrigin(0.5);
    y += 25;

    const sliderX = colL - 100;
    const sliderW = 200;

    const sliders = [
      { key: 'volMaster',  label: 'MASTER',  color: '#C8A84B' },
      { key: 'volSFX',     label: 'SFX',     color: '#78808A' },
      { key: 'volWeapon',  label: 'WEAPON',  color: '#78808A' },
      { key: 'volAmbient', label: 'AMBIENT', color: '#78808A' },
    ];

    sliders.forEach((s) => {
      this._createSlider(sliderX, y, sliderW, s.key, s.label, s.color);
      y += 50;
    });

    // ── Gameplay options ──
    y += 10;
    this.add.text(colL, y, 'GAMEPLAY', {
      fontFamily: 'JetBrains Mono', fontSize: '13px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 4,
    }).setOrigin(0.5);
    y += 25;

    // Performance mode toggle
    this._createToggle(sliderX, y, 'PERFORMANCE MODE', 'performanceMode');
    y += 35;

    // Screen shake toggle
    this._createToggle(sliderX, y, 'SCREEN SHAKE', 'screenShake');
    y += 35;

    // Correction hints toggle
    this._createToggle(sliderX, y, 'CORRECTION HINTS', 'showCorrectionHints');
    y += 45;

    // ── Export / Import save ──
    this.add.text(colL, y, 'SAVE DATA', {
      fontFamily: 'JetBrains Mono', fontSize: '13px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 4,
    }).setOrigin(0.5);
    y += 20;

    const exportBtn = this.add.text(colL - 60, y, '[ EXPORT ]', {
      fontFamily: 'JetBrains Mono', fontSize: '15px', color: '#78808A', letterSpacing: 2,
    }).setInteractive({ useHandCursor: true });
    exportBtn.on('pointerdown', () => {
      if (typeof GameState.exportSave === 'function') {
        const data = GameState.exportSave();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(data);
          this._flashMessage(colL, y + 20, 'Copied to clipboard!', '#3DFF6E');
        }
      }
    });
    exportBtn.on('pointerover', () => exportBtn.setColor('#F4F4EF'));
    exportBtn.on('pointerout', () => exportBtn.setColor('#78808A'));

    const importBtn = this.add.text(colL + 60, y, '[ IMPORT ]', {
      fontFamily: 'JetBrains Mono', fontSize: '15px', color: '#78808A', letterSpacing: 2,
    }).setInteractive({ useHandCursor: true });
    importBtn.on('pointerdown', () => {
      const input = prompt('Paste save data:');
      if (input && typeof GameState.importSave === 'function') {
        try {
          GameState.importSave(input);
          this._flashMessage(colL, y + 20, 'Save imported!', '#3DFF6E');
          this.time.delayedCall(800, () => this.scene.restart());
        } catch (e) {
          this._flashMessage(colL, y + 20, 'Invalid save data.', '#CC2200');
        }
      }
    });
    importBtn.on('pointerover', () => importBtn.setColor('#F4F4EF'));
    importBtn.on('pointerout', () => importBtn.setColor('#78808A'));

    // ════════════ RIGHT COLUMN: Controls & Achievements ════════════

    let ry = 80;
    this.add.text(colR, ry, 'CONTROLS', {
      fontFamily: 'JetBrains Mono', fontSize: '13px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 4,
    }).setOrigin(0.5);
    ry += 20;

    const controls = [
      'W A S D         Move scope',
      '↑ ↓             Adjust elevation',
      '← →             Adjust windage',
      'Q E             Tilt rifle (level)',
      'SHIFT            Hold breath',
      'SPACE / ENTER   Fire / Confirm',
      'ESC              Back',
    ];

    controls.forEach((line, i) => {
      this.add.text(colR, ry + 5 + i * 18, line, {
        fontFamily: 'Courier Prime', fontSize: '15px', color: '#5A5A5A',
      }).setOrigin(0.5);
    });

    // ── Achievements ──
    ry += controls.length * 18 + 30;
    this.add.text(colR, ry, 'ACHIEVEMENTS', {
      fontFamily: 'JetBrains Mono', fontSize: '13px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 4,
    }).setOrigin(0.5);
    ry += 20;

    if (typeof GameState.getUnlockedAchievements === 'function') {
      const unlocked = GameState.getUnlockedAchievements();
      const allAchievements = GameState.achievements || {};
      const achKeys = Object.keys(allAchievements);

      if (achKeys.length > 0) {
        achKeys.forEach((key, i) => {
          const isUnlocked = allAchievements[key];
          const achInfo = unlocked.find(a => a.name.toLowerCase().replace(/\s+/g,'') === key.toLowerCase()) || { name: key, desc: '' };
          const achNames = {
            firstBlood: 'FIRST BLOOD', sharpshooter: 'SHARPSHOOTER', ghostOperator: 'GHOST OPERATOR',
            veteranSniper: 'VETERAN SNIPER', eliteMarksman: 'ELITE MARKSMAN', bigSpender: 'BIG SPENDER',
            longShot: 'LONG SHOT', speedDemon: 'SPEED DEMON', nightOwl: 'NIGHT OWL', ironWill: 'IRON WILL',
          };

          const name = achNames[key] || key;
          const color = isUnlocked ? '#C8A84B' : '#2A2A2A';
          const icon = isUnlocked ? '★' : '☆';

          this.add.text(colR - 100, ry + i * 16, `${icon} ${name}`, {
            fontFamily: 'JetBrains Mono', fontSize: '12px', color, letterSpacing: 1,
          });
        });
      } else {
        this.add.text(colR, ry, 'No achievements yet.', {
          fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#404040',
        }).setOrigin(0.5);
      }
    }

    // ════════════ BOTTOM: Reset & Back ════════════

    // ── Data reset ──
    const resetY = H - 90;
    this._resetConfirm = false;

    const resetBtn = this.add.text(W / 2, resetY, '[ RESET ALL DATA ]', {
      fontFamily: 'JetBrains Mono', fontSize: '15px',
      color: '#CC2200', letterSpacing: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const resetWarning = this.add.text(W / 2, resetY + 18, '', {
      fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#CC2200',
    }).setOrigin(0.5);

    resetBtn.on('pointerdown', () => {
      if (!this._resetConfirm) {
        this._resetConfirm = true;
        resetWarning.setText('Click again to confirm. This cannot be undone.');
        resetBtn.setText('[ CONFIRM RESET ]');
      } else {
        GameState.reset();
        resetWarning.setText('Data cleared.');
        resetBtn.setText('[ DONE ]');
        resetBtn.disableInteractive();
      }
    });

    // ── Back button ──
    const backBtn = this.add.text(W / 2, H - 35, '[ BACK ]', {
      fontFamily: 'JetBrains Mono', fontSize: '18px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#F4F4EF'));
    backBtn.on('pointerout', () => backBtn.setColor('#C8A84B'));
    backBtn.on('pointerdown', () => this._goBack());
    this.input.keyboard.once('keydown-ESC', () => this._goBack());
  }

  // ── Toggle helper ──
  _createToggle(x, y, label, settingsKey) {
    this.add.text(x, y, label, {
      fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#78808A', letterSpacing: 2,
    });

    const state = GameState.settings[settingsKey] !== false;  // default true
    const btn = this.add.text(x + 200, y, state ? '[ ON ]' : '[ OFF ]', {
      fontFamily: 'JetBrains Mono', fontSize: '16px', fontStyle: 'bold',
      color: state ? '#3DFF6E' : '#404040', letterSpacing: 2,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      GameState.settings[settingsKey] = !GameState.settings[settingsKey];
      btn.setText(GameState.settings[settingsKey] ? '[ ON ]' : '[ OFF ]');
      btn.setColor(GameState.settings[settingsKey] ? '#3DFF6E' : '#404040');
      GameState.save();
    });
  }

  // ── Flash message helper ──
  _flashMessage(x, y, msg, color) {
    const txt = this.add.text(x, y, msg, {
      fontFamily: 'JetBrains Mono', fontSize: '13px', color, letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: txt, alpha: 1, duration: 200 });
    this.tweens.add({ targets: txt, alpha: 0, duration: 400, delay: 1500, onComplete: () => txt.destroy() });
  }

  _createSlider(x, y, w, key, label, color) {
    const val = GameState.settings[key];

    // Label
    this.add.text(x, y, label, {
      fontFamily: 'JetBrains Mono', fontSize: '13px', color, letterSpacing: 2,
    });

    // Track
    const g = this.add.graphics();
    g.fillStyle(0x252525, 1);
    g.fillRect(x, y + 20, w, 4);

    // Fill
    const fillG = this.add.graphics();
    const fillColor = Phaser.Display.Color.HexStringToColor(color).color;
    fillG.fillStyle(fillColor, 0.6);
    fillG.fillRect(x, y + 20, w * val, 4);

    // Value text
    const valText = this.add.text(x + w + 15, y + 18, `${Math.round(val * 100)}%`, {
      fontFamily: 'JetBrains Mono', fontSize: '15px', color: '#F4F4EF',
    });

    // Thumb / interactive zone
    const zone = this.add.zone(x + w / 2, y + 22, w + 20, 24)
      .setInteractive({ useHandCursor: true, draggable: false });

    zone.on('pointerdown', (pointer) => {
      const ratio = Phaser.Math.Clamp((pointer.x - x) / w, 0, 1);
      GameState.settings[key] = Math.round(ratio * 20) / 20; // 5% steps
      fillG.clear();
      fillG.fillStyle(fillColor, 0.6);
      fillG.fillRect(x, y + 20, w * GameState.settings[key], 4);
      valText.setText(`${Math.round(GameState.settings[key] * 100)}%`);
      GameState.save();
    });

    zone.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;
      const ratio = Phaser.Math.Clamp((pointer.x - x) / w, 0, 1);
      GameState.settings[key] = Math.round(ratio * 20) / 20;
      fillG.clear();
      fillG.fillStyle(fillColor, 0.6);
      fillG.fillRect(x, y + 20, w * GameState.settings[key], 4);
      valText.setText(`${Math.round(GameState.settings[key] * 100)}%`);
      GameState.save();
    });
  }

  _goBack() {
    if (this._transitioning) return;
    this._transitioning = true;
    this.cameras.main.fadeOut(300, 8, 8, 8);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MenuScene');
    });
  }
}
