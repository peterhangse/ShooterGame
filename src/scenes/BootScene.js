/* ═══════════════════════════════════════════════════
   COLD ZERO — BootScene
   Initializes Web Audio, loads state, transitions to Menu.
   Shows animated boot sequence with loading tips.
   ═══════════════════════════════════════════════════ */

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  // ── Loading tips ──
  static TIPS = [
    'Consult the DOPE card before every shot.',
    'Wind meter shows live conditions. Trust it.',
    'Moving targets: lead by 1-2 MOA.',
    'Night missions pay double experience.',
    'The 6.5 Creedmoor excels at long range.',
    'Breathe out slowly before firing.',
    'Wind gusts can shift mid-shot.',
    'Upgrades persist between runs.',
    'Higher difficulty = higher KV rewards.',
    'First shot counts — there are no second chances.',
    'Check wind direction: ← left, → right.',
    'Elevation too high? Your round sails over.',
    'The .50 Cal has massive drop compensation.',
    'Civilian kills end the mission instantly.',
  ];

  create() {
    // Load saved state
    GameState.load();

    const ver = typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '0.9.0';
    console.log(`[COLD ZERO] v${ver} — Phaser ${Phaser.VERSION}`);
    console.log('[COLD ZERO] BootScene → waiting for user gesture to init audio');

    // Dark background
    this.cameras.main.setBackgroundColor('#080808');

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // ── Crosshair icon ──
    const crosshair = this.add.text(cx, cy - 50, '⦿', {
      fontFamily: 'JetBrains Mono',
      fontSize: '48px',
      color: '#C8A84B',
    }).setOrigin(0.5).setAlpha(0);

    // Fade in crosshair
    this.tweens.add({
      targets: crosshair,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
    });

    // ── Title text ──
    const title = this.add.text(cx, cy - 10, 'COLD ZERO', {
      fontFamily: 'JetBrains Mono',
      fontSize: '21px',
      letterSpacing: 6,
      color: '#C8A84B',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 600,
      delay: 200,
      ease: 'Power2',
    });

    // ── Click prompt ──
    const prompt = this.add.text(cx, cy + 30, 'CLICK TO BEGIN', {
      fontFamily: 'JetBrains Mono',
      fontSize: '16px',
      letterSpacing: 4,
      color: '#78808A',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: prompt,
      alpha: 1,
      duration: 400,
      delay: 500,
      onComplete: () => {
        // Blink after appearing
        this.tweens.add({
          targets: prompt,
          alpha: 0.3,
          duration: 800,
          yoyo: true,
          repeat: -1,
        });
      },
    });

    // ── Loading tip ──
    const tip = BootScene.TIPS[Math.floor(Math.random() * BootScene.TIPS.length)];
    const tipText = this.add.text(cx, cy + 70, `TIP: ${tip}`, {
      fontFamily: 'JetBrains Mono',
      fontSize: '13px',
      color: '#555',
      wordWrap: { width: 500 },
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: tipText,
      alpha: 0.7,
      duration: 800,
      delay: 800,
    });

    // ── Version display ──
    this.add.text(this.scale.width - 10, this.scale.height - 10, `v${ver}`, {
      fontFamily: 'JetBrains Mono',
      fontSize: '12px',
      color: '#333',
    }).setOrigin(1, 1);

    // ── Wait for click/key to start audio context ──
    const startAudio = async () => {
      try {
        await Tone.start();
        console.log('[COLD ZERO] Audio context started');
      } catch (e) {
        console.warn('[COLD ZERO] Audio unavailable:', e.message);
        GameState._audioUnavailable = true;
      }

      // Show storage warning if applicable
      if (GameState._storageError) {
        console.warn('[COLD ZERO] Storage unavailable — progress will not persist');
      }

      this.input.off('pointerdown', startAudio);
      this.input.keyboard.off('keydown', startAudio);

      // Quick "LOADING…" feedback
      prompt.setText('LOADING…');
      prompt.setAlpha(1);
      if (this.tweens) this.tweens.killTweensOf(prompt);

      this.cameras.main.fadeOut(400, 8, 8, 8);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    };

    this.input.on('pointerdown', startAudio);
    this.input.keyboard.on('keydown', startAudio);
  }
}
