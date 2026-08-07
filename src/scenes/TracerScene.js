/* ═══════════════════════════════════════════════════
   COLD ZERO — TracerScene
   Bullet tracer animation with wind streamlines,
   slow-mo camera follow, impact particles, hit/miss
   result, atmospheric shot report.
   ═══════════════════════════════════════════════════ */

class TracerScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TracerScene' });
  }

  init(data) {
    this.shotResult = data.shotResult;     // { missX, missY, hitDistance, isHit, tof }
    this.mission = data.mission;
    this.kvEarned = data.kvEarned;
    this.targetWorldX = data.targetX;
    this.targetWorldY = data.targetY;
    this._continuing = false;              // Reset transition guard
    this._transitioned = false;            // Reset scene-start guard
    this._panelReady = false;              // Panel not yet shown
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#030A03');
    this.cameras.main.fadeIn(200, 3, 10, 3);

    // ── Simplified side-view trajectory ──
    const startX = 40;
    const startY = H * 0.65;
    const endX = W - 60;
    const landY = this.shotResult.isHit ? H * 0.45 : H * 0.45 + this.shotResult.missY * 0.3;

    // Background
    this._drawBackground(W, H);

    // ── Wind streamlines (animated) ──
    this._windParticles = [];
    if (this.mission.targetWind !== 0) {
      this._createWindStreamlines(W, H);
    }

    // Target indicator (at destination)
    this._drawTargetIndicator(endX, H * 0.45);

    // ── Bullet sprite ──
    const bullet = this.add.graphics().setDepth(50);
    bullet.fillStyle(0xC8A84B, 1);
    bullet.fillCircle(0, 0, 3);

    const bulletContainer = this.add.container(startX, startY, [bullet]).setDepth(50);

    // ── Dashed tracer line (draws during flight) ──
    this._tracerLine = this.add.graphics().setDepth(40);

    // ── Flight time based on ToF ──
    const flightDuration = Math.max(800, this.shotResult.tof * 1000 * 3); // Slow-mo ×3

    // Drop arc control point
    const controlY = Math.min(startY, landY) - 30 - (this.mission.targetDistance / 20);

    this._drawPath = [];
    let lastDashX = startX;

    // Start tracer sweep sound
    this._startTracerSweep(flightDuration);

    // Animate bullet along arc
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: flightDuration,
      ease: 'Sine.easeIn',
      onUpdate: (tween) => {
        const t = tween.getValue();

        // Quadratic Bezier
        const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ((startX + endX) / 2) + t * t * endX;
        const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * landY;

        bulletContainer.setPosition(x, y);

        // Add wind drift
        if (this.shotResult.missX) {
          bulletContainer.y += this.shotResult.missX * t * 0.2;
        }

        // Draw tracer dashes
        if (x - lastDashX > 8) {
          this._drawPath.push({ x, y: bulletContainer.y });
          lastDashX = x;
          this._drawTracerDashes();
        }
      },
      onComplete: () => {
        this._stopTracerSweep();
        bulletContainer.destroy();
        this._showImpact(endX, landY);
      },
    });

    // ── Info overlay (top) ──
    this.add.text(W / 2, 30, `${this.mission.targetDistance}m`, {
      fontFamily: 'JetBrains Mono', fontSize: '30px', fontStyle: 'bold',
      color: '#78808A',
    }).setOrigin(0.5).setAlpha(0.4);

    // ── Weather & location label (top-left) ──
    const weatherInfo = [this.mission.location, this.mission.weatherLabel].filter(Boolean).join(' · ');
    if (weatherInfo) {
      this.add.text(30, 55, weatherInfo, {
        fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#404040', letterSpacing: 1,
      }).setAlpha(0.5);
    }

    // ── Slow-mo text ──
    this._slowmoText = this.add.text(30, H - 30, '▸ SLOW-MO', {
      fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#C8A84B',
      letterSpacing: 3,
    }).setAlpha(0.6);

    this.tweens.add({
      targets: this._slowmoText,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  update(time, delta) {
    // Animate wind streamlines
    if (this._windParticles && this._windParticles.length > 0) {
      const windDir = this.mission.targetWind > 0 ? 1 : -1;
      const windSpeed = Math.abs(this.mission.targetWind) * 0.5;
      this._windParticles.forEach(p => {
        p.x += windDir * windSpeed * (delta / 16);
        p.alpha = 0.1 + Math.sin(time * 0.002 + p.seed) * 0.08;
        if (p.x > this.scale.width + 20 || p.x < -20) {
          p.x = windDir > 0 ? -10 : this.scale.width + 10;
          p.y = Phaser.Math.Between(20, this.scale.height * 0.65);
        }
        p.gfx.setPosition(p.x, p.y).setAlpha(p.alpha);
      });
    }
  }

  _createWindStreamlines(W, H) {
    const count = Math.min(Math.round(Math.abs(this.mission.targetWind) * 4), 20);
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(20, H * 0.65);
      const lineLen = Phaser.Math.Between(15, 40);
      const g = this.add.graphics().setDepth(5);
      g.lineStyle(1, 0x2A3A2A, 0.12);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(lineLen * (this.mission.targetWind > 0 ? 1 : -1), Phaser.Math.Between(-3, 3));
      g.strokePath();
      g.setPosition(x, y);
      this._windParticles.push({ gfx: g, x, y, alpha: 0.1, seed: Math.random() * 100 });
    }
  }

  _drawBackground(W, H) {
    const bg = this.add.graphics().setDepth(0);

    // Ground
    bg.fillStyle(0x050E05, 1);
    bg.fillRect(0, H * 0.7, W, H * 0.3);

    // Gradient ground line
    bg.lineStyle(1, 0x1A2A1A, 0.5);
    bg.beginPath();
    bg.moveTo(0, H * 0.7);
    bg.lineTo(W, H * 0.7);
    bg.strokePath();

    // Distance markers
    const dist = this.mission.targetDistance;
    for (let d = 100; d <= dist; d += 100) {
      const ratio = d / dist;
      const x = 40 + (W - 100) * ratio;

      bg.lineStyle(1, 0x1A2A1A, 0.3);
      bg.beginPath();
      bg.moveTo(x, H * 0.7);
      bg.lineTo(x, H * 0.7 + 10);
      bg.strokePath();

      this.add.text(x, H * 0.7 + 14, `${d}m`, {
        fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#2A3A2A',
      }).setOrigin(0.5, 0);
    }
  }

  _drawTargetIndicator(x, y) {
    const tg = this.add.graphics().setDepth(10);

    // Silhouette
    tg.fillStyle(0x1A1A1A, 1);
    tg.fillCircle(x, y - 20, 6);       // head
    tg.fillRect(x - 5, y - 14, 10, 18); // body

    // Hitbox circle
    const hitRadius = this.mission.hitboxRadius / 3; // Scale for this view
    tg.lineStyle(1, 0x3DFF6E, 0.3);
    tg.strokeCircle(x, y - 8, hitRadius);
  }

  _drawTracerDashes() {
    this._tracerLine.clear();
    const pts = this._drawPath;
    if (pts.length < 2) return;

    this._tracerLine.lineStyle(1.5, 0xC8A84B, 0.7);

    for (let i = 0; i < pts.length - 1; i++) {
      // Dashed: draw every other segment
      if (i % 2 === 0) {
        this._tracerLine.beginPath();
        this._tracerLine.moveTo(pts[i].x, pts[i].y);
        this._tracerLine.lineTo(pts[i + 1].x, pts[i + 1].y);
        this._tracerLine.strokePath();
      }
    }

    // Tail fade
    if (pts.length > 4) {
      const tail = pts[pts.length - 1];
      this._tracerLine.fillStyle(0xC8A84B, 0.3);
      this._tracerLine.fillCircle(tail.x, tail.y, 5);
    }
  }

  _showImpact(x, y) {
    const W = this.scale.width;
    const H = this.scale.height;

    this._slowmoText.destroy();

    if (this.shotResult.isHit) {
      this._showHitEffect(x, y);
    } else {
      this._showMissEffect(x, y);
    }

    // ── Result panel (after delay) ──
    this.time.delayedCall(1200, () => {
      this._showResultPanel(W, H);
    });
  }

  _showHitEffect(x, y) {
    // Play hit sound — G-major chord, pp, 600ms
    this._playResultSound(true);

    // Green flash
    const flash = this.add.graphics().setDepth(60);
    flash.fillStyle(0x3DFF6E, 0.15);
    flash.fillCircle(x, y, 60);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 800,
      onComplete: () => flash.destroy(),
    });

    // Impact splash particles
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.4;
      const speed = Phaser.Math.Between(30, 80);
      const dx = x + Math.cos(angle) * 5;
      const dy = y + Math.sin(angle) * 5;
      const dot = this.add.graphics().setDepth(55);
      dot.fillStyle(i % 3 === 0 ? 0xC8A84B : 0x444444, 1);
      dot.fillCircle(0, 0, Phaser.Math.Between(1, 3));
      dot.setPosition(dx, dy);

      this.tweens.add({
        targets: dot,
        x: dx + Math.cos(angle) * speed,
        y: dy + Math.sin(angle) * speed,
        alpha: 0,
        duration: 400 + i * 40,
        ease: 'Power2',
        onComplete: () => dot.destroy(),
      });
    }

    // HIT text
    const hitText = this.add.text(x, y - 60, 'HIT', {
      fontFamily: 'JetBrains Mono', fontSize: '42px', fontStyle: 'bold',
      color: '#3DFF6E', letterSpacing: 8,
    }).setOrigin(0.5).setDepth(70).setAlpha(0);

    this.tweens.add({
      targets: hitText,
      alpha: 1,
      y: y - 80,
      duration: 600,
      ease: 'Power2',
    });

    // Camera shake
    this.cameras.main.shake(200, 0.005);

    // Bullet hole draw animation
    const hole = this.add.graphics().setDepth(65);
    hole.fillStyle(0x0A0A0A, 1);
    hole.setAlpha(0);
    hole.fillCircle(x, y - 8, 5);
    hole.fillStyle(0x1A1A1A, 0.6);
    hole.fillCircle(x + 2, y - 6, 7);
    this.tweens.add({ targets: hole, alpha: 1, duration: 400, ease: 'Power2' });
  }

  _showMissEffect(x, y) {
    // Play miss sound — low sine 120Hz
    this._playResultSound(false);

    // Dust splash
    const missX = x + (this.shotResult.missX || 0) * 0.5;
    const missY = y + (this.shotResult.missY || 0) * 0.5;

    const dust = this.add.graphics().setDepth(55);
    dust.fillStyle(0x3A3A3A, 0.6);
    dust.fillCircle(missX, missY, 4);

    this.tweens.add({
      targets: dust,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 500,
      onComplete: () => dust.destroy(),
    });

    // MISS text
    const missText = this.add.text(x, y - 60, 'MISS', {
      fontFamily: 'JetBrains Mono', fontSize: '36px', fontStyle: 'bold',
      color: '#CC2200', letterSpacing: 6,
    }).setOrigin(0.5).setDepth(70).setAlpha(0);

    this.tweens.add({
      targets: missText,
      alpha: 1,
      y: y - 80,
      duration: 600,
      ease: 'Power2',
    });

    // Miss distance indicator
    const totalMiss = Math.sqrt((this.shotResult.missX || 0) ** 2 + (this.shotResult.missY || 0) ** 2);
    this.add.text(x, y - 35, `${totalMiss.toFixed(1)} MOA off`, {
      fontFamily: 'JetBrains Mono', fontSize: '15px', color: '#78808A',
    }).setOrigin(0.5).setDepth(70);
  }

  _showResultPanel(W, H) {
    const panelW = 320;
    const panelH = 200;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2 + 40;

    // Panel background
    const panel = this.add.graphics().setDepth(100);
    panel.fillStyle(0x111111, 0.95);
    panel.fillRect(px, py, panelW, panelH);
    panel.lineStyle(1, 0xC8A84B, 0.6);
    panel.strokeRect(px, py, panelW, panelH);

    // Divider
    panel.lineStyle(1, 0x252525, 1);
    panel.beginPath();
    panel.moveTo(px + 20, py + 45);
    panel.lineTo(px + panelW - 20, py + 45);
    panel.strokePath();

    // Title
    this.add.text(px + panelW / 2, py + 22, 'SHOT REPORT', {
      fontFamily: 'JetBrains Mono', fontSize: '16px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 4,
    }).setOrigin(0.5).setDepth(101);

    // Stats
    const labelStyle = { fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#78808A', letterSpacing: 1 };
    const valueStyle = { fontFamily: 'JetBrains Mono', fontSize: '16px', fontStyle: 'bold', color: '#F4F4EF' };

    const rows = [
      { label: 'RANGE', value: `${this.mission.targetDistance}m` },
      { label: 'YOUR ELEV', value: `${GameState.dialValues.elevation.toFixed(1)} MOA` },
      { label: 'CORRECT ELEV', value: `${this.mission.correctElevation.toFixed(1)} MOA` },
      { label: 'WIND', value: `${this.mission.targetWind >= 0 ? '→' : '←'} ${Math.abs(this.mission.targetWind).toFixed(1)} m/s` },
      { label: 'RESULT', value: this.shotResult.isHit ? 'CONFIRMED KILL' : 'NO EFFECT' },
    ];

    // Show energy factor if available
    if (this.shotResult.energy != null) {
      rows.push({ label: 'ENERGY', value: `${Math.round(this.shotResult.energy * 100)}%` });
    }

    // Show correction hint if available
    if (this.shotResult.correction && !this.shotResult.isHit) {
      rows.push({ label: 'HINT', value: this.shotResult.correction });
    }

    if (this.kvEarned > 0) {
      rows.push({ label: 'KV EARNED', value: `+ ${this.kvEarned} KV` });
    }

    rows.forEach((row, i) => {
      const ry = py + 60 + i * 22;
      this.add.text(px + 25, ry, row.label, labelStyle).setDepth(101);
      const color = row.label === 'RESULT'
        ? (this.shotResult.isHit ? '#3DFF6E' : '#CC2200')
        : row.label === 'KV EARNED' ? '#C8A84B' : '#F4F4EF';
      this.add.text(px + panelW - 25, ry, row.value, { ...valueStyle, color }).setOrigin(1, 0).setDepth(101);
    });

    // Continue button — text + zone both interactive for maximum reliability
    const btnY = py + panelH + 15;
    const btnText = this.add.text(W / 2, btnY, '[ CONTINUE ]', {
      fontFamily: 'JetBrains Mono', fontSize: '16px', color: '#C8A84B', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(101)
      .setInteractive({ useHandCursor: true });

    // Large transparent hit zone layered on top
    const btnZone = this.add.zone(W / 2, btnY, 300, 50)
      .setDepth(102).setInteractive({ useHandCursor: true });

    const hoverIn = () => btnText.setColor('#F4F4EF');
    const hoverOut = () => btnText.setColor('#C8A84B');
    const doClick = () => this._continue();

    // Both zone and text respond to pointer
    [btnZone, btnText].forEach(obj => {
      obj.on('pointerover', hoverIn);
      obj.on('pointerout', hoverOut);
      obj.on('pointerdown', doClick);
      obj.on('pointerup', doClick);   // fallback: some browsers prefer pointerup
    });

    // Keyboard
    this.input.keyboard.once('keydown-SPACE', doClick);
    this.input.keyboard.once('keydown-ENTER', doClick);

    // Fallback: click anywhere on screen to continue (after short delay)
    this._panelReady = true;
    this.time.delayedCall(600, () => {
      this.input.on('pointerdown', doClick);
    });
  }

  _continue() {
    // Prevent double-firing
    if (this._continuing) return;
    this._continuing = true;

    // Determine destination once
    const go = () => {
      if (this._transitioned) return;   // guard against double scene-start
      this._transitioned = true;

      if (this.mission.isTraining) {
        this.scene.start('MenuScene');
        return;
      }

      const run = GameState.currentRun;
      const queue = run._missionQueue || [];
      const nextIndex = run.missionIndex;

      if (nextIndex >= queue.length || run.consecutiveFails >= 2) {
        run.walkAway = run.consecutiveFails >= 2 && nextIndex < queue.length;
        this.scene.start('RunEndScene');
      } else {
        this.scene.start('ScopeScene', { mission: queue[nextIndex] });
      }
    };

    // Try graceful fade-out
    try {
      this.cameras.main.fadeOut(400, 8, 8, 8);
      this.cameras.main.once('camerafadeoutcomplete', go);
    } catch (e) {
      // If camera fade fails for any reason, go immediately
      go();
      return;
    }

    // Fallback: if camerafadeoutcomplete never fires, force transition
    this.time.delayedCall(800, go);
  }

  // ══════════════════════════════════════════════
  //  AUDIO
  // ══════════════════════════════════════════════

  _startTracerSweep(duration) {
    try {
      const vol = GameState.settings.volSFX * GameState.settings.volMaster;
      this._sweepNoise = new Tone.Noise('brown');
      this._sweepFilter = new Tone.Filter({ frequency: 200, type: 'bandpass', Q: 6 });
      this._sweepGain = new Tone.Gain(vol * 0.15);
      this._sweepNoise.connect(this._sweepFilter);
      this._sweepFilter.connect(this._sweepGain);
      this._sweepGain.toDestination();
      this._sweepNoise.start();

      // Sweep filter frequency up during flight
      this._sweepFilter.frequency.rampTo(2000, duration / 1000);
      this._sweepGain.gain.rampTo(vol * 0.4, duration / 1000);
    } catch (e) { /* Audio unavailable */ }
  }

  _stopTracerSweep() {
    try {
      if (this._sweepNoise) {
        this._sweepGain.gain.rampTo(0, 0.1);
        setTimeout(() => {
          this._sweepNoise.stop();
          this._sweepNoise.dispose();
          this._sweepFilter.dispose();
          this._sweepGain.dispose();
        }, 150);
      }
    } catch (e) { /* silent */ }
  }

  _playResultSound(isHit) {
    try {
      const vol = GameState.settings.volSFX * GameState.settings.volMaster;
      if (isHit) {
        // G-major chord (330+440+550 Hz), pianissimo, 600ms
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.1, decay: 0.3, sustain: 0.2, release: 0.3 }
        });
        const gain = new Tone.Gain(vol * 0.1);
        synth.connect(gain);
        gain.toDestination();
        synth.triggerAttackRelease(['G4', 'B4', 'D5'], '0.6');
        setTimeout(() => { synth.dispose(); gain.dispose(); }, 2000);
      } else {
        // Low sine 120Hz, 400ms fade-out
        const synth = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 }
        });
        const gain = new Tone.Gain(vol * 0.15);
        synth.connect(gain);
        gain.toDestination();
        synth.triggerAttackRelease(120, '0.4');
        setTimeout(() => { synth.dispose(); gain.dispose(); }, 1500);
      }
    } catch (e) { /* Audio unavailable */ }
  }
}
