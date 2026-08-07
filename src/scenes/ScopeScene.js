/* ═══════════════════════════════════════════════════
   COLD ZERO — ScopeScene
   Scope view with breathing sway, target, turrets,
   instruments, FIRE button, ballistic coupling,
   weather system, atmospheric corrections, audio.
   ═══════════════════════════════════════════════════ */

class ScopeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ScopeScene' });
  }

  init(data) {
    this.mission = data.mission;
    this.fired = false;
    this.timeRemaining = this.mission.timeLimit || 0;
    this._startTime = Date.now();
    this._breathPhase = 0;       // breathing sway cycle
    this._breathHoldActive = false;
    GameState.resetDials();
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor(this.mission.nightMode ? '#010301' : '#030A03');
    this.cameras.main.fadeIn(300, 3, 10, 3);

    // ── World size (larger than viewport for scrolling) ──
    const WORLD_W = W * 3;
    const WORLD_H = H * 3;

    // Camera targets (for inertia)
    this._camTargetX = WORLD_W / 2;
    this._camTargetY = WORLD_H / 2;

    // Get inertia coefficient based on upgrade
    this._inertia = GameState.metaProgression.upgrades.betterScope ? 0.14 : 0.08;

    // ── Background (blurred terrain) ──
    this._createBackground(WORLD_W, WORLD_H);

    // ── Target ──
    this._createTarget(WORLD_W / 2 + Phaser.Math.Between(-100, 100), WORLD_H / 2 + Phaser.Math.Between(-50, 50));

    // ── Grain overlay (step 1.2) ── (increased for night mode)
    this._grainTexture = this.add.renderTexture(0, 0, W, H).setScrollFactor(0).setAlpha(this.mission.nightMode ? 0.12 : 0.06).setDepth(100);
    this._grainFrame = 0;

    // ── Scope mask (circular vignette) ──
    this._createScopeMask(W, H);

    // ── Crosshair (static, screen-space) ──
    this._createCrosshair(W, H);

    // ── Ballistic tape overlay (if upgrade owned) ──
    if (GameState.metaProgression.upgrades.ballisticTape) {
      this._createBallisticTape(W, H);
    }

    // ── HUD elements (screen-space) ──
    this._createHUD(W, H);

    // ── Control panel (bottom 40%) ──
    this._createControlPanel(W, H);

    // ── Ambient wind ──
    this._startAmbientWind();

    // ── Turret click sound ──
    this._initTurretSound();

    // ── Bubble level (in scope view) ──
    this._createBubbleLevel(W, H);

    // ── Weather/Location overlay (top-left of scope) ──
    if (this.mission.weatherLabel || this.mission.location) {
      const weatherStr = [this.mission.location, this.mission.weatherLabel, this.mission.temperature != null ? `${this.mission.temperature}°C` : ''].filter(Boolean).join(' · ');
      this.add.text(14, 14, weatherStr, {
        fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#404040', letterSpacing: 1,
      }).setScrollFactor(0).setDepth(96).setAlpha(0.5);
    }

    // ── Breath hold (Shift) ──
    this.input.keyboard.on('keydown-SHIFT', () => { this._breathHoldActive = true; });
    this.input.keyboard.on('keyup-SHIFT', () => { this._breathHoldActive = false; });

    // ── Timer ──
    if (this.mission.timeLimit > 0) {
      this._startTimer();
    }

    // ── Camera setup ──
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.scrollX = WORLD_W / 2 - W / 2;
    this.cameras.main.scrollY = WORLD_H / 2 - H / 2;

    // ── Input ──
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Turret keys
    this.elevKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
    });
    this.windKeys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    });

    // Cant keys (bubble level)
    this.cantKeys = this.input.keyboard.addKeys({
      tiltLeft: Phaser.Input.Keyboard.KeyCodes.Q,
      tiltRight: Phaser.Input.Keyboard.KeyCodes.E,
    });

    // FIRE key (routed through walkthrough when active)
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this._walkthroughActive) {
        const blocked = this._wtHandleInput('space');
        if (!blocked) this._fire(); // fire step: let it through
      } else {
        this._fire();
      }
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this._walkthroughActive) {
        const blocked = this._wtHandleInput('enter');
        if (!blocked) this._fire();
      } else {
        this._fire();
      }
    });

    // ── Briefing overlay (fades out) ──
    if (this.mission.briefing) {
      this._showBriefing(W, H);
    }

    // ── Interactive walkthrough (first campaign mission only) ──
    if (!GameState.settings.walkthroughCompleted && !this.mission.isTraining) {
      // Delay slightly so briefing overlay shows first
      this.time.delayedCall(this.mission.briefing ? 2500 : 500, () => {
        this._startWalkthrough(W, H);
      });
    } else {
      // ── Progressive tooltips (post-tutorial missions) ──
      const briefDelay = this.mission.briefing ? 3500 : 1000;
      this.time.delayedCall(briefDelay, () => this._showProgressiveTooltips(W, H));
    }
  }

  update(time, delta) {
    if (this.fired) return;

    // During walkthrough: only allow specific inputs based on step type
    const wtActive = this._walkthroughActive;
    const wtAllow = wtActive ? this._wtInputEnabled : false;

    const speed = 4;
    const W = this.scale.width;
    const H = this.scale.height;

    // ── WASD camera movement (allowed during fire step + normal play) ──
    if (!wtActive || wtAllow === 'fire') {
      if (this.cursors.up.isDown)    this._camTargetY -= speed;
      if (this.cursors.down.isDown)  this._camTargetY += speed;
      if (this.cursors.left.isDown)  this._camTargetX -= speed;
      if (this.cursors.right.isDown) this._camTargetX += speed;
    }

    // ── Breathing sway (sinusoidal drift) ──
    this._breathPhase += delta * 0.001 * (this._breathHoldActive ? 0.3 : 1.0);
    const breathAmp = this._breathHoldActive ? 0.4 : 1.8;
    const swayX = Math.sin(this._breathPhase * 1.2) * breathAmp;
    const swayY = Math.sin(this._breathPhase * 0.7) * breathAmp * 1.4 + Math.cos(this._breathPhase * 0.3) * breathAmp * 0.5;
    if (!wtActive || wtAllow === 'fire') {
      this._camTargetX += swayX * 0.3;
      this._camTargetY += swayY * 0.3;
    }

    // Inertia (step 1.2 / 1.4)
    this.cameras.main.scrollX += (this._camTargetX - W / 2 - this.cameras.main.scrollX) * this._inertia;
    this.cameras.main.scrollY += (this._camTargetY - H / 2 - this.cameras.main.scrollY) * this._inertia;

    // ── Turret keyboard controls (allowed during matching interactive steps) ──
    if (!wtActive || wtAllow === 'elevation' || wtAllow === 'fire') {
      if (Phaser.Input.Keyboard.JustDown(this.elevKeys.up)) {
        GameState.dialValues.elevation = Math.min(GameState.dialValues.elevation + 0.25, 40);
        this._updateElevDisplay();
        this._playTurretClick(1200);
      }
      if (Phaser.Input.Keyboard.JustDown(this.elevKeys.down)) {
        GameState.dialValues.elevation = Math.max(GameState.dialValues.elevation - 0.25, 0);
        this._updateElevDisplay();
        this._playTurretClick(1200);
      }
    }
    if (!wtActive || wtAllow === 'windage' || wtAllow === 'fire') {
      if (Phaser.Input.Keyboard.JustDown(this.windKeys.right)) {
        GameState.dialValues.windage = Math.min(GameState.dialValues.windage + 0.25, 10);
        this._updateWindDisplay();
        this._playTurretClick(900);
      }
      if (Phaser.Input.Keyboard.JustDown(this.windKeys.left)) {
        GameState.dialValues.windage = Math.max(GameState.dialValues.windage - 0.25, -10);
        this._updateWindDisplay();
        this._playTurretClick(900);
      }
    }

    // ── Grain overlay (update every 3rd frame) ──
    this._grainFrame++;
    if (this._grainFrame % 3 === 0 && !GameState.settings.performanceMode) {
      this._updateGrain();
    }

    // ── Moving target (step 2.9) ──
    if (this.mission.targetMoving && this._targetContainer) {
      const t = time / 1000;
      this._targetContainer.x = this._targetBaseX + Math.sin(t * (2 * Math.PI / 4)) * 80;
    }

    // ── Cant / Bubble Level (Q/E) ──
    if (!wtActive || wtAllow === 'fire') {
      if (Phaser.Input.Keyboard.JustDown(this.cantKeys.tiltLeft)) {
        GameState.dialValues.cant = Math.max(GameState.dialValues.cant - 1, -8);
      }
      if (Phaser.Input.Keyboard.JustDown(this.cantKeys.tiltRight)) {
        GameState.dialValues.cant = Math.min(GameState.dialValues.cant + 1, 8);
      }
    }
    this._updateBubbleLevel(delta);
  }

  // ══════════════════════════════════════════════
  //  CREATION METHODS
  // ══════════════════════════════════════════════

  _createBackground(ww, wh) {
    // Dark green gradient ground
    const bg = this.add.graphics();

    // Sky
    bg.fillStyle(0x030A03, 1);
    bg.fillRect(0, 0, ww, wh * 0.55);

    // Ground
    bg.fillStyle(0x040C04, 1);
    bg.fillRect(0, wh * 0.55, ww, wh * 0.45);

    // Treeline silhouette
    bg.fillStyle(0x020602, 1);
    for (let x = 0; x < ww; x += 60) {
      const h = 30 + Math.random() * 60;
      const w = 40 + Math.random() * 30;
      bg.fillRect(x, wh * 0.52 - h, w, h + 20);
    }

    // Distant hills
    bg.fillStyle(0x050E05, 0.5);
    for (let x = 0; x < ww; x += 2) {
      const y = wh * 0.5 + Math.sin(x * 0.005) * 30 + Math.sin(x * 0.013) * 15;
      bg.fillRect(x, y, 2, wh - y);
    }
  }

  _createTarget(tx, ty) {
    this._targetBaseX = tx;
    this._targetBaseY = ty;

    this._targetContainer = this.add.container(tx, ty);

    // Human silhouette using Phaser Graphics
    const silhouette = this.add.graphics();
    silhouette.fillStyle(0x0A0A0A, 1);

    // Head
    silhouette.fillCircle(0, -55, 8);
    // Torso
    silhouette.fillRect(-10, -47, 20, 30);
    // Arms
    silhouette.fillRect(-20, -45, 10, 24);
    silhouette.fillRect(10, -45, 10, 24);
    // Weapon (right arm extended)
    silhouette.fillRect(18, -38, 25, 3);
    // Legs
    silhouette.fillRect(-10, -17, 8, 28);
    silhouette.fillRect(2, -17, 8, 28);

    this._targetContainer.add(silhouette);

    // Night mode: warm heat-signature glow
    if (this.mission.nightMode) {
      const heat = this.add.graphics();
      heat.fillStyle(0x661111, 0.25);
      heat.fillCircle(0, -30, 35);
      heat.fillStyle(0x883322, 0.15);
      heat.fillCircle(0, -50, 18);
      this._targetContainer.addAt(heat, 0);
    }

    // Subtle glow around silhouette for visibility
    const glow = this.add.graphics();
    glow.fillStyle(0x1A1A1A, 0.3);
    glow.fillCircle(0, -25, 40);
    this._targetContainer.addAt(glow, 0);

    // Civilian silhouette (nearby, if mission has civilian)
    if (this.mission.civilianPresent) {
      this._createCivilian(tx, ty);
    }
  }

  _createCivilian(tx, ty) {
    const offsetX = Phaser.Math.Between(60, 120) * (Math.random() > 0.5 ? 1 : -1);
    const civContainer = this.add.container(tx + offsetX, ty + Phaser.Math.Between(-10, 10));

    const civ = this.add.graphics();
    civ.fillStyle(0x0A0A0A, 1);
    // Civilian: no weapon, slightly different pose
    civ.fillCircle(0, -52, 7);   // Head (slightly smaller)
    civ.fillRect(-8, -45, 16, 28);  // Torso
    civ.fillRect(-15, -42, 7, 20);  // Left arm
    civ.fillRect(8, -42, 7, 20);    // Right arm (no weapon)
    civ.fillRect(-8, -17, 7, 26);   // Left leg
    civ.fillRect(1, -17, 7, 26);    // Right leg

    civContainer.add(civ);

    // Fainter glow for civilian
    const civGlow = this.add.graphics();
    civGlow.fillStyle(0x1A1A1A, 0.2);
    civGlow.fillCircle(0, -25, 35);
    civContainer.addAt(civGlow, 0);

    this._civilianContainer = civContainer;
  }

  _createScopeMask(W, H) {
    // Scope view fills entire screen
    const scopeH = H;
    const scopeCY = H / 2;
    const scopeR = Math.min(W, H) * 0.44;

    const maskG = this.add.graphics().setScrollFactor(0).setDepth(90);

    // Black frame with circular cutout using path winding rule
    maskG.fillStyle(0x080808, 1);
    maskG.beginPath();
    // Outer rectangle (clockwise)
    maskG.moveTo(0, 0);
    maskG.lineTo(W, 0);
    maskG.lineTo(W, scopeH);
    maskG.lineTo(0, scopeH);
    maskG.closePath();
    // Inner circle (counter-clockwise = hole)
    maskG.moveTo(W / 2 + scopeR, scopeCY);
    maskG.arc(W / 2, scopeCY, scopeR, 0, Math.PI * 2, true);
    maskG.closePath();
    maskG.fillPath();

    // Scope rim
    maskG.lineStyle(3, 0x2A2A2A, 0.8);
    maskG.strokeCircle(W / 2, scopeCY, scopeR);
    maskG.lineStyle(1, 0x3A3A3A, 0.3);
    maskG.strokeCircle(W / 2, scopeCY, scopeR + 2);

    // Vignette inside scope (thin rings fading inward)
    for (let i = 0; i < 20; i++) {
      const r = scopeR - i;
      const alpha = i * 0.02;
      maskG.lineStyle(1, 0x000000, alpha);
      maskG.strokeCircle(W / 2, scopeCY, r);
    }

    this._scopeRadius = scopeR;
    this._scopeCenterY = scopeCY;
  }

  _createCrosshair(W, H) {
    const cx = W / 2;
    const cy = H * 0.5; // Center of scope area (full screen)
    const g = this.add.graphics().setScrollFactor(0).setDepth(95);

    const color = 0x3DFF6E;
    const gap = 12;
    const len = 80;
    const dotR = 2;

    g.lineStyle(1, color, 0.8);

    // Horizontal lines
    g.beginPath();
    g.moveTo(cx - len, cy);
    g.lineTo(cx - gap, cy);
    g.moveTo(cx + gap, cy);
    g.lineTo(cx + len, cy);
    g.strokePath();

    // Vertical lines
    g.beginPath();
    g.moveTo(cx, cy - len);
    g.lineTo(cx, cy - gap);
    g.moveTo(cx, cy + gap);
    g.lineTo(cx, cy + len);
    g.strokePath();

    // Mil-dots
    g.fillStyle(color, 0.7);
    for (let i = 1; i <= 5; i++) {
      const offset = gap + i * 12;
      g.fillCircle(cx + offset, cy, dotR);
      g.fillCircle(cx - offset, cy, dotR);
      g.fillCircle(cx, cy + offset, dotR);
      g.fillCircle(cx, cy - offset, dotR);
    }

    // Center dot
    g.fillStyle(color, 0.4);
    g.fillCircle(cx, cy, 1);
  }

  _createHUD(W, H) {
    const hudY = H - 40;

    // In-scope HUD (bottom of scope circle)
    const hudStyle = {
      fontFamily: 'JetBrains Mono',
      fontSize: '18px',
      color: '#3DFF6E',
      letterSpacing: 2,
    };

    this._hudRange = this.add.text(W * 0.25, hudY, `RNG ${this.mission.targetDistance}m`, hudStyle)
      .setScrollFactor(0).setDepth(96).setOrigin(0.5).setAlpha(0.7);

    const windDir = this.mission.targetWind >= 0 ? '→' : '←';
    const windVal = Math.abs(this.mission.targetWind).toFixed(1);
    const windUnc = this.mission.windUncertainty > 0 ? `±${this.mission.windUncertainty}` : '';
    this._hudWind = this.add.text(W * 0.5, hudY, `WND ${windDir} ${windVal} ${windUnc}`, hudStyle)
      .setScrollFactor(0).setDepth(96).setOrigin(0.5).setAlpha(0.7);

    this._hudElev = this.add.text(W * 0.75, hudY, `ELV ↑ ${GameState.dialValues.elevation.toFixed(1)}`, hudStyle)
      .setScrollFactor(0).setDepth(96).setOrigin(0.5).setAlpha(0.7);

    // Timer (top-right of scope, gold)
    if (this.mission.timeLimit > 0) {
      this._hudTimer = this.add.text(W - 30, 20, this._formatTime(this.mission.timeLimit), {
        fontFamily: 'JetBrains Mono',
        fontSize: '27px',
        fontStyle: 'bold',
        color: '#C8A84B',
        letterSpacing: 1,
      }).setScrollFactor(0).setDepth(96).setOrigin(1, 0);
    }

    // Training round label
    if (this.mission.isTraining) {
      this.add.text(W / 2, 20, 'TRAINING ROUND', {
        fontFamily: 'JetBrains Mono',
        fontSize: '16px',
        color: '#C8A84B',
        letterSpacing: 4,
      }).setScrollFactor(0).setDepth(96).setOrigin(0.5, 0).setAlpha(0.6);
    }
  }

  _createControlPanel(W, H) {
    const panelY = H * 0.60;
    const panelH = H * 0.40;

    // ── Semi-transparent panel background (depth 91 = above scope mask 90) ──
    const panelBg = this.add.graphics().setScrollFactor(0).setDepth(91);
    panelBg.fillStyle(0x111111, 0.88);
    panelBg.fillRect(0, panelY, W, panelH);
    // Gold divider line
    panelBg.lineStyle(1, 0xC8A84B, 0.3);
    panelBg.beginPath();
    panelBg.moveTo(0, panelY);
    panelBg.lineTo(W, panelY);
    panelBg.strokePath();

    // ── Status ──
    this._statusText = this.add.text(W * 0.5, panelY + 4, 'READY', {
      fontFamily: 'JetBrains Mono', fontSize: '15px', fontStyle: 'bold',
      color: '#3DFF6E', letterSpacing: 4,
    }).setScrollFactor(0).setDepth(92).setOrigin(0.5, 0);

    // ── Elevation turret (left) ──
    const dialY = panelY + 70;
    const dialR = 44;
    const elevG = this.add.graphics().setScrollFactor(0).setDepth(92);
    this._drawMiniTurret(elevG, W * 0.15, dialY, dialR);
    this.add.text(W * 0.15, dialY - dialR - 14, 'ELEVATION', {
      fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#5A5A5A', letterSpacing: 3,
    }).setScrollFactor(0).setDepth(92).setOrigin(0.5);
    this._elevText = this.add.text(W * 0.15, dialY, '0.0', {
      fontFamily: 'JetBrains Mono', fontSize: '36px', fontStyle: 'bold', color: '#F4F4EF',
    }).setScrollFactor(0).setDepth(93).setOrigin(0.5);
    this.add.text(W * 0.15, dialY + 22, 'MOA', {
      fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#5A5A5A', letterSpacing: 2,
    }).setScrollFactor(0).setDepth(92).setOrigin(0.5);

    // ── Windage turret (center-left) ──
    const windG = this.add.graphics().setScrollFactor(0).setDepth(92);
    this._drawMiniTurret(windG, W * 0.35, dialY, dialR);
    this.add.text(W * 0.35, dialY - dialR - 14, 'WINDAGE', {
      fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#5A5A5A', letterSpacing: 3,
    }).setScrollFactor(0).setDepth(92).setOrigin(0.5);
    this._windText = this.add.text(W * 0.35, dialY, '0.0', {
      fontFamily: 'JetBrains Mono', fontSize: '36px', fontStyle: 'bold', color: '#F4F4EF',
    }).setScrollFactor(0).setDepth(93).setOrigin(0.5);
    this.add.text(W * 0.35, dialY + 22, 'MOA', {
      fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#5A5A5A', letterSpacing: 2,
    }).setScrollFactor(0).setDepth(92).setOrigin(0.5);

    // ── FIRE button (center) ──
    this._createFireButton(W * 0.5, dialY);

    // ── Kestrel (center-right) ──
    const kx = W * 0.65;
    const ky = panelY + 14;
    const kw = 130;
    const kh = 120;
    this._createMiniRangeFinder(kx, ky, kw, kh);

    // ── Wind compass (right) ──
    this._createMiniWindIndicator(W * 0.87, dialY, 38);

    // ── Help button (bottom-left) ──
    this._createHelpButton(W, H);
  }

  _createHelpButton(W, H) {
    const btnX = 28;
    const btnY = H - 20;
    const btnR = 14;

    // Circle background
    const btnG = this.add.graphics().setScrollFactor(0).setDepth(92);
    btnG.fillStyle(0x1A1A1A, 0.9);
    btnG.fillCircle(btnX, btnY, btnR);
    btnG.lineStyle(1, 0xC8A84B, 0.5);
    btnG.strokeCircle(btnX, btnY, btnR);

    // "?" label
    const btnLabel = this.add.text(btnX, btnY, '?', {
      fontFamily: 'JetBrains Mono', fontSize: '24px', fontStyle: 'bold',
      color: '#C8A84B',
    }).setScrollFactor(0).setDepth(93).setOrigin(0.5);

    // Interactive zone
    const hitZone = this.add.zone(btnX, btnY, btnR * 2.5, btnR * 2.5)
      .setScrollFactor(0).setDepth(93).setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => {
      btnG.clear();
      btnG.fillStyle(0xC8A84B, 0.2);
      btnG.fillCircle(btnX, btnY, btnR);
      btnG.lineStyle(1, 0xC8A84B, 0.8);
      btnG.strokeCircle(btnX, btnY, btnR);
    });
    hitZone.on('pointerout', () => {
      btnG.clear();
      btnG.fillStyle(0x1A1A1A, 0.9);
      btnG.fillCircle(btnX, btnY, btnR);
      btnG.lineStyle(1, 0xC8A84B, 0.5);
      btnG.strokeCircle(btnX, btnY, btnR);
    });

    hitZone.on('pointerdown', () => this._showHelpPopup(W, H));
  }

  _showHelpPopup(W, H) {
    if (this._helpOpen) return;
    this._helpOpen = true;

    const popW = 320;
    const popH = 200;
    const px = W / 2 - popW / 2;
    const py = H / 2 - popH / 2;

    // Dim backdrop
    const dim = this.add.graphics().setScrollFactor(0).setDepth(180);
    dim.fillStyle(0x000000, 0.6);
    dim.fillRect(0, 0, W, H);

    // Popup background
    const popG = this.add.graphics().setScrollFactor(0).setDepth(181);
    popG.fillStyle(0x141414, 0.96);
    popG.fillRoundedRect(px, py, popW, popH, 8);
    popG.lineStyle(1, 0xC8A84B, 0.4);
    popG.strokeRoundedRect(px, py, popW, popH, 8);

    // Title
    const title = this.add.text(W / 2, py + 18, 'CONTROLS', {
      fontFamily: 'JetBrains Mono', fontSize: '18px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 4,
    }).setScrollFactor(0).setDepth(182).setOrigin(0.5);

    // Help lines
    const lines = [
      '↑ ↓          Adjust elevation',
      '← →          Adjust windage',
      'Q  E          Cant / level rifle',
      'W A S D       Pan scope view',
      'SHIFT         Hold breath (steady)',
      'SPACE         Fire',
    ];
    const body = this.add.text(W / 2, py + 46, lines.join('\n'), {
      fontFamily: 'JetBrains Mono', fontSize: '19px',
      color: '#E8E8E8', lineSpacing: 12,
    }).setScrollFactor(0).setDepth(182).setOrigin(0.5, 0);

    // Close "X" button (top-right of popup)
    const closeX = px + popW - 18;
    const closeY = py + 16;
    const closeText = this.add.text(closeX, closeY, '✕', {
      fontFamily: 'JetBrains Mono', fontSize: '21px', fontStyle: 'bold',
      color: '#5A5A5A',
    }).setScrollFactor(0).setDepth(182).setOrigin(0.5);

    const closeZone = this.add.zone(closeX, closeY, 30, 30)
      .setScrollFactor(0).setDepth(183).setInteractive({ useHandCursor: true });

    closeZone.on('pointerover', () => closeText.setColor('#F4F4EF'));
    closeZone.on('pointerout', () => closeText.setColor('#5A5A5A'));

    const cleanup = () => {
      [dim, popG, title, body, closeText, closeZone].forEach(o => o.destroy());
      this._helpOpen = false;
    };

    closeZone.on('pointerdown', cleanup);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains);
    dim.on('pointerdown', cleanup);
  }

  _drawMiniTurret(g, cx, cy, r) {
    // Outer ring
    g.lineStyle(3, 0x3A3A3A, 0.8);
    g.strokeCircle(cx, cy, r);
    // Inner ring
    g.lineStyle(2, 0x2E2E2E, 0.6);
    g.strokeCircle(cx, cy, r - 8);
    // Knurling
    for (let a = 0; a < 360; a += 10) {
      const rad = (a * Math.PI) / 180;
      const x1 = cx + Math.cos(rad) * (r - 2);
      const y1 = cy + Math.sin(rad) * (r - 2);
      const x2 = cx + Math.cos(rad) * r;
      const y2 = cy + Math.sin(rad) * r;
      g.lineStyle(1, a % 30 === 0 ? 0x787878 : 0x4A4A4A, 0.5);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
    }
    // Gold indicator
    g.fillStyle(0xC8A84B, 1);
    g.fillRect(cx - 1.5, cy - r - 6, 3, 8);
  }

  _createFireButton(cx, cy) {
    const size = 40;
    const btnG = this.add.graphics().setScrollFactor(0).setDepth(93);

    // Border
    btnG.lineStyle(2, 0xC8A84B, 1);
    btnG.strokeRect(cx - size, cy - size, size * 2, size * 2);

    // FIRE text
    this._fireText = this.add.text(cx, cy, 'FIRE', {
      fontFamily: 'JetBrains Mono', fontSize: '24px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 6,
    }).setScrollFactor(0).setDepth(94).setOrigin(0.5);

    // Interactive zone
    const hitZone = this.add.zone(cx, cy, size * 2, size * 2)
      .setScrollFactor(0).setDepth(94).setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => {
      if (!this.fired) {
        btnG.clear();
        btnG.fillStyle(0xC8A84B, 1);
        btnG.fillRect(cx - size, cy - size, size * 2, size * 2);
        btnG.lineStyle(2, 0xC8A84B, 1);
        btnG.strokeRect(cx - size, cy - size, size * 2, size * 2);
        this._fireText.setColor('#1C1C1C');
      }
    });

    hitZone.on('pointerout', () => {
      if (!this.fired) {
        btnG.clear();
        btnG.lineStyle(2, 0xC8A84B, 1);
        btnG.strokeRect(cx - size, cy - size, size * 2, size * 2);
        this._fireText.setColor('#C8A84B');
      }
    });

    hitZone.on('pointerdown', () => this._fire());

    this._fireBtnG = btnG;
    this._fireBtnSize = size;
    this._fireBtnX = cx;
    this._fireBtnY = cy;
  }

  _createMiniRangeFinder(x, y, w, h) {
    const g = this.add.graphics().setScrollFactor(0).setDepth(92);

    // Background
    g.fillStyle(0x0A0F0A, 1);
    g.fillRect(x - w / 2, y, w, h);
    g.lineStyle(1, 0x1A2A1A, 1);
    g.strokeRect(x - w / 2, y, w, h);

    // Header
    g.fillStyle(0x060F06, 1);
    g.fillRect(x - w / 2, y, w, 16);
    this.add.text(x, y + 8, 'KESTREL 5700', {
      fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#1A3A1A', letterSpacing: 3,
    }).setScrollFactor(0).setDepth(93).setOrigin(0.5);

    // Data rows
    const rowH = 22;
    const startY = y + 22;
    const rows = [
      { label: 'RANGE', value: `${this.mission.targetDistance}m`, color: '#3DFF6E' },
      { label: 'WIND', value: `${this.mission.targetWind >= 0 ? '→' : '←'} ${Math.abs(this.mission.targetWind).toFixed(1)}`, color: '#3DFF6E' },
      { label: 'TEMP', value: `${this.mission.temperature != null ? (this.mission.temperature >= 0 ? '+' : '') + this.mission.temperature : '+08'}°C`, color: '#1E6A1E' },
      { label: 'ELEV', value: `↑ ${this.mission.correctElevation.toFixed(1)}`, color: '#1E6A1E' },
    ];

    rows.forEach((row, i) => {
      const ry = startY + i * rowH;
      this.add.text(x - w / 2 + 8, ry, row.label, {
        fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#1E5A1E', letterSpacing: 2,
      }).setScrollFactor(0).setDepth(93);

      this.add.text(x + w / 2 - 8, ry, row.value, {
        fontFamily: 'JetBrains Mono', fontSize: '21px', fontStyle: 'bold', color: row.color,
      }).setScrollFactor(0).setDepth(93).setOrigin(1, 0);
    });

    // CRT scanlines
    for (let sy = y; sy < y + h; sy += 3) {
      g.fillStyle(0x000000, 0.15);
      g.fillRect(x - w / 2, sy, w, 1);
    }
  }

  _createMiniWindIndicator(cx, cy, r) {
    const g = this.add.graphics().setScrollFactor(0).setDepth(92);

    // Outer circle
    g.fillStyle(0x0A0A0A, 1);
    g.fillCircle(cx, cy, r);
    g.lineStyle(2, 0x2A2A2A, 1);
    g.strokeCircle(cx, cy, r);

    // Cardinal directions
    const dirs = [
      { label: 'N', angle: -90, color: '#C8A84B' },
      { label: 'S', angle: 90, color: '#5A5A5A' },
      { label: 'E', angle: 0, color: '#5A5A5A' },
      { label: 'W', angle: 180, color: '#5A5A5A' },
    ];
    dirs.forEach(d => {
      const rad = (d.angle * Math.PI) / 180;
      const dx = cx + Math.cos(rad) * (r - 10);
      const dy = cy + Math.sin(rad) * (r - 10);
      this.add.text(dx, dy, d.label, {
        fontFamily: 'JetBrains Mono', fontSize: '13px', fontStyle: 'bold', color: d.color,
      }).setScrollFactor(0).setDepth(93).setOrigin(0.5);
    });

    // Wind speed in center
    this.add.text(cx, cy - 4, Math.abs(this.mission.targetWind).toFixed(1), {
      fontFamily: 'JetBrains Mono', fontSize: '24px', fontStyle: 'bold', color: '#F4F4EF',
    }).setScrollFactor(0).setDepth(93).setOrigin(0.5);

    this.add.text(cx, cy + 12, 'M/S', {
      fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#78808A', letterSpacing: 1,
    }).setScrollFactor(0).setDepth(93).setOrigin(0.5);

    // Wind arrow
    if (this.mission.targetWind !== 0) {
      const windAngle = this.mission.targetWind > 0 ? 0 : 180; // right or left
      const arrowRad = ((windAngle - 90) * Math.PI) / 180;
      const arrowLen = r - 18;
      const ax = cx + Math.cos(arrowRad) * arrowLen;
      const ay = cy + Math.sin(arrowRad) * arrowLen;
      g.lineStyle(3, 0xC8A84B, 0.8);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(ax, ay);
      g.strokePath();

      // Arrowhead
      g.fillStyle(0xC8A84B, 1);
      g.fillCircle(ax, ay, 3);
    }

    // Pivot dot
    g.fillStyle(0xC8A84B, 1);
    g.fillCircle(cx, cy + 18, 2);
  }

  _createDOPEStrip(W, y, h) {
    const g = this.add.graphics().setScrollFactor(0).setDepth(92);
    g.fillStyle(0x0A0A0A, 0.5);
    g.fillRect(0, y, W, h);
    g.lineStyle(1, 0x252525, 0.5);
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath();

    // Show 3 nearest DOPE entries (weapon-specific)
    const dist = this.mission.targetDistance;
    const activeWeapon = getActiveWeapon();
    const dopeTable = activeWeapon.dopeTable || DOPE_TABLE_308;
    const entries = dopeTable.filter(e =>
      Math.abs(e.range - dist) <= 200
    ).slice(0, 3);

    const colW = W / (entries.length + 1);
    entries.forEach((entry, i) => {
      const ex = colW * (i + 1);
      const isActive = Math.abs(entry.range - dist) < 50;
      const color = isActive ? '#C8A84B' : '#404040';

      this.add.text(ex, y + 3, `${entry.range}m`, {
        fontFamily: 'Courier Prime', fontSize: '13px', fontStyle: 'bold', color,
      }).setScrollFactor(0).setDepth(93).setOrigin(0.5, 0);

      this.add.text(ex, y + 14, `↑${entry.elevMOA} →${entry.windMOA}`, {
        fontFamily: 'Courier Prime', fontSize: '12px', color: isActive ? '#78808A' : '#333',
      }).setScrollFactor(0).setDepth(93).setOrigin(0.5, 0);
    });
  }

  _showBriefing(W, H) {
    const overlay = this.add.graphics().setScrollFactor(0).setDepth(200);
    overlay.fillStyle(0x080808, 0.92);
    overlay.fillRect(0, 0, W, H);

    const briefingText = this.add.text(W / 2, H / 2, '', {
      fontFamily: 'Courier Prime',
      fontSize: '19px',
      color: '#F4F4EF',
      lineSpacing: 8,
      align: 'center',
      wordWrap: { width: 500 },
    }).setScrollFactor(0).setDepth(201).setOrigin(0.5);

    // Typewriter effect (step 2.4) with click sounds (step 4.5)
    const fullText = this.mission.briefing;
    let charIndex = 0;
    const typeClickPitches = [800, 900, 1100]; // 3 variants

    const typeTimer = this.time.addEvent({
      delay: 28,
      repeat: fullText.length - 1,
      callback: () => {
        charIndex++;
        briefingText.setText(fullText.substring(0, charIndex));
        // Typewriter click per visible character (not whitespace)
        if (fullText[charIndex - 1] && fullText[charIndex - 1].trim()) {
          this._playTypeClick(typeClickPitches[charIndex % 3]);
        }
      },
    });

    // Dismiss on click/key after typing
    const dismissBriefing = () => {
      if (charIndex < fullText.length) {
        // Skip to end
        typeTimer.remove();
        charIndex = fullText.length;
        briefingText.setText(fullText);
        return;
      }
      overlay.destroy();
      briefingText.destroy();
      this.input.off('pointerdown', dismissBriefing);
      this.input.keyboard.off('keydown', dismissBriefing);
    };

    this.time.delayedCall(500, () => {
      this.input.on('pointerdown', dismissBriefing);
      this.input.keyboard.on('keydown', dismissBriefing);
    });
  }

  // ══════════════════════════════════════════════
  //  AUDIO
  // ══════════════════════════════════════════════

  _startAmbientWind() {
    try {
      this._windNoise = new Tone.Noise('pink');
      this._windFilter = new Tone.Filter(400, 'lowpass');
      this._windGain = new Tone.Gain(GameState.settings.volAmbient * GameState.settings.volMaster * 0.15);
      this._windNoise.connect(this._windFilter);
      this._windFilter.connect(this._windGain);
      this._windGain.toDestination();
      this._windNoise.start();
    } catch (e) { /* Audio unavailable */ }
  }

  _initTurretSound() {
    try {
      this._metalSynth = new Tone.MetalSynth({
        frequency: 1200,
        envelope: { attack: 0.001, decay: 0.015, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 16,
        resonance: 4000,
        octaves: 0.5,
      });
      this._turretGain = new Tone.Gain(GameState.settings.volSFX * GameState.settings.volMaster * 0.3);
      this._metalSynth.connect(this._turretGain);
      this._turretGain.toDestination();
    } catch (e) { /* Audio unavailable */ }
  }

  _playTurretClick(freq) {
    try {
      if (this._metalSynth) {
        this._metalSynth.frequency = freq;
        this._metalSynth.triggerAttackRelease('16n');
      }
    } catch (e) { /* silent */ }
  }

  _playGunshot() {
    try {
      const vol = GameState.settings.volWeapon * GameState.settings.volMaster;

      // Crack — NoiseSynth
      const crack = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.01 },
      });
      const crackGain = new Tone.Gain(vol * 0.6);
      crack.connect(crackGain);
      crackGain.toDestination();
      crack.triggerAttackRelease('0.08');

      // Thump — MembraneSynth
      const thump = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
      });
      const reverb = new Tone.Reverb(0.8);
      const thumpGain = new Tone.Gain(vol * 0.8);
      thump.connect(reverb);
      reverb.connect(thumpGain);
      thumpGain.toDestination();
      thump.triggerAttackRelease('C1', '0.2');

      // Cleanup after silence
      setTimeout(() => {
        crack.dispose(); crackGain.dispose();
        thump.dispose(); reverb.dispose(); thumpGain.dispose();
      }, 3000);
    } catch (e) { /* Audio unavailable */ }
  }

  // ══════════════════════════════════════════════
  //  FIRE LOGIC (Steps 1.7, 1.8)
  // ══════════════════════════════════════════════

  _fire() {
    if (this.fired) return;
    // During walkthrough, only allow fire on the fire step
    if (this._walkthroughActive) {
      if (this._wtInputEnabled !== 'fire') return;
      this._endWalkthrough(); // clean up tutorial UI before firing
    }
    this.fired = true;

    // Stop timer
    if (this._timerEvent) this._timerEvent.remove();

    // Disable FIRE button
    this._fireText.setText('· · ·');
    this._fireText.setColor('#404040');
    this._statusText.setText('FIRED');

    // Play gunshot
    this._playGunshot();

    // Screen shake (if enabled)
    if (GameState.settings.screenShake !== false) {
      const weapon = getActiveWeapon();
      const intensity = (weapon.recoilIntensity || 0.5) * 0.008;
      this.cameras.main.shake(250, intensity);
    }

    // Stop wind
    this._stopAmbientWind();

    // Calculate shot (step 1.8) — with atmospheric corrections
    const weapon = getActiveWeapon();
    const shotResult = calculateShot({
      targetDistance: this.mission.targetDistance,
      targetWind: this.mission.targetWind,
      dialElevation: GameState.dialValues.elevation,
      dialWindage: GameState.dialValues.windage,
      cantError: GameState.dialValues.cant,
      weapon: {
        dropKoeff: weapon.dropKoeff,
        windMultiplier: weapon.windMultiplier,
        dopeTable: weapon.dopeTable || DOPE_TABLE_308,
        muzzleVelocity: weapon.muzzleVelocity,
        spinDrift: weapon.spinDrift,
      },
      coldBore: GameState.metaProgression.upgrades.coldBoreKit,
      temperature: this.mission.temperature,
      altitude: 0,
      humidity: 0.5,
    });

    const result = checkHit(shotResult, this.mission.hitboxRadius);

    // Response time tracking
    const responseTime = Math.round((Date.now() - this._startTime) / 1000);

    // Civilian detection: if scope is aimed closer to civilian than target
    if (this.mission.civilianPresent && this._civilianContainer && result.isHit) {
      const camCX = this.cameras.main.scrollX + this.scale.width / 2;
      const camCY = this.cameras.main.scrollY + this.scale.height * 0.3;
      const distToTarget = Phaser.Math.Distance.Between(camCX, camCY, this._targetContainer.x, this._targetContainer.y);
      const distToCivilian = Phaser.Math.Distance.Between(camCX, camCY, this._civilianContainer.x, this._civilianContainer.y);
      if (distToCivilian < distToTarget) {
        GameState.stats.civilianEvents++;
      }
    }

    // Calculate KV reward
    const kvEarned = typeof MissionGenerator.calculateKV === 'function'
      ? MissionGenerator.calculateKV(this.mission, result)
      : (result.isHit ? Math.round(100 + (this.mission.targetDistance / 10)) : 0);

    // Record mission & check achievements
    GameState.recordMission(result.isHit, kvEarned, responseTime);
    if (typeof GameState.checkMissionAchievements === 'function') {
      GameState.checkMissionAchievements(this.mission, result);
    }

    // Transition to TracerScene after 1.5s silence (step 1.10)
    this.time.delayedCall(1500, () => {
      this.scene.start('TracerScene', {
        shotResult: result,
        mission: this.mission,
        kvEarned,
        targetX: this._targetContainer ? this._targetContainer.x : this._targetBaseX,
        targetY: this._targetContainer ? this._targetContainer.y : this._targetBaseY,
      });
    });
  }

  // ══════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════

  _updateElevDisplay() {
    const val = GameState.dialValues.elevation;
    if (this._elevText) this._elevText.setText(val.toFixed(1));
    if (this._hudElev) this._hudElev.setText(`ELV ↑ ${val.toFixed(1)}`);
  }

  _updateWindDisplay() {
    const val = GameState.dialValues.windage;
    const dir = val >= 0 ? '→' : '←';
    if (this._windText) this._windText.setText(Math.abs(val).toFixed(1));
    if (this._hudElev) {
      // Update HUD wind display
      // (we reuse hudElev display position logic — but wind is separate)
    }
  }

  _updateGrain() {
    if (!this._grainTexture) return;
    this._grainTexture.clear();

    // Lazily create a reusable off-screen Graphics for grain dots
    if (!this._grainGfx) {
      this._grainGfx = this.add.graphics().setVisible(false);
    }
    const gfx = this._grainGfx;
    gfx.clear();

    const W = this.scale.width;
    const H = this.scale.height; // Full screen scope

    for (let i = 0; i < 600; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const b = Math.random();
      gfx.fillStyle(
        Phaser.Display.Color.GetColor(
          Math.floor(b * 40),
          Math.floor(b * 50 + 10),
          Math.floor(b * 30)
        ), 1
      );
      gfx.fillPoint(x, y, 1);
    }

    this._grainTexture.draw(gfx);
  }

  _startTimer() {
    this._timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: this.mission.timeLimit - 1,
      callback: () => {
        this.timeRemaining--;
        if (this._hudTimer) {
          this._hudTimer.setText(this._formatTime(this.timeRemaining));
          if (this.timeRemaining <= 10) {
            this._hudTimer.setColor('#C8A84B');
            this._playHeartbeat();
          }
          if (this.timeRemaining <= 5) {
            this._hudTimer.setColor('#CC2200');
          }
        }
        if (this.timeRemaining <= 0) {
          // Time's up — auto-fail
          this._fire();
        }
      },
    });
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  _stopAmbientWind() {
    try {
      if (this._windNoise) { this._windNoise.stop(); this._windNoise.dispose(); }
      if (this._windFilter) this._windFilter.dispose();
      if (this._windGain) this._windGain.dispose();
      if (this._metalSynth) this._metalSynth.dispose();
      if (this._turretGain) this._turretGain.dispose();
    } catch (e) { /* silent */ }
  }

  // ══════════════════════════════════════════════
  //  BUBBLE LEVEL (Step 2.7)
  // ══════════════════════════════════════════════

  _createBubbleLevel(W, H) {
    // Small bubble level in scope area, bottom-left
    const cx = W * 0.12;
    const cy = H * 0.82;
    const tubeW = 60;
    const tubeH = 12;

    this._bubbleBg = this.add.graphics().setScrollFactor(0).setDepth(96);
    this._bubbleBg.fillStyle(0x0A0F0A, 0.8);
    this._bubbleBg.fillRect(cx - tubeW / 2, cy - tubeH / 2, tubeW, tubeH);
    this._bubbleBg.lineStyle(1, 0x2A3A2A, 0.6);
    this._bubbleBg.strokeRect(cx - tubeW / 2, cy - tubeH / 2, tubeW, tubeH);

    // Center mark
    this._bubbleBg.lineStyle(1, 0x3DFF6E, 0.3);
    this._bubbleBg.beginPath();
    this._bubbleBg.moveTo(cx, cy - tubeH / 2 + 1);
    this._bubbleBg.lineTo(cx, cy + tubeH / 2 - 1);
    this._bubbleBg.strokePath();

    // Bubble (the moving circle)
    this._bubbleGfx = this.add.graphics().setScrollFactor(0).setDepth(97);
    this._bubbleCenterX = cx;
    this._bubbleCenterY = cy;
    this._bubbleTubeW = tubeW;
    this._bubbleX = 0; // offset from center
    this._bubbleVX = 0;

    // Label
    this.add.text(cx, cy + tubeH / 2 + 5, 'Q · LEVEL · E', {
      fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#404040', letterSpacing: 1,
    }).setScrollFactor(0).setDepth(96).setOrigin(0.5, 0);

    this._drawBubble();
  }

  _updateBubbleLevel(delta) {
    if (!this._bubbleGfx) return;
    const cant = GameState.dialValues.cant;
    const target = cant * 3; // pixels per degree of cant

    // Spring-damp physics: spring = (target - x) * 0.12, damp = -vx * 0.85
    const spring = (target - this._bubbleX) * 0.12;
    const damp = -this._bubbleVX * 0.85;
    this._bubbleVX += spring + damp;
    this._bubbleX += this._bubbleVX;

    // Clamp to tube bounds
    const halfLimit = this._bubbleTubeW / 2 - 6;
    this._bubbleX = Phaser.Math.Clamp(this._bubbleX, -halfLimit, halfLimit);

    this._drawBubble();
  }

  _drawBubble() {
    if (!this._bubbleGfx) return;
    this._bubbleGfx.clear();
    const bx = this._bubbleCenterX + this._bubbleX;
    const by = this._bubbleCenterY;
    const isCentered = Math.abs(this._bubbleX) < 2;

    this._bubbleGfx.fillStyle(isCentered ? 0x3DFF6E : 0xC8A84B, isCentered ? 0.8 : 0.6);
    this._bubbleGfx.fillCircle(bx, by, 4);

    // Green glow when centered
    if (isCentered) {
      this._bubbleGfx.fillStyle(0x3DFF6E, 0.15);
      this._bubbleGfx.fillCircle(bx, by, 8);
    }
  }

  // ══════════════════════════════════════════════
  //  BALLISTIC TAPE OVERLAY (Step 3.4)
  // ══════════════════════════════════════════════

  _createBallisticTape(W, H) {
    const g = this.add.graphics().setScrollFactor(0).setDepth(94);
    const cx = W / 2;
    const cy = H * 0.5; // scope center (full screen)
    const weapon = getActiveWeapon();
    const dropKoeff = weapon.dropKoeff || 1.0;
    const dopeTab = weapon.dopeTable || DOPE_TABLE_308;
    const dist = this.mission.targetDistance;

    // Draw dashed drop curve below crosshair center
    g.lineStyle(1, 0xC8A84B, 0.25);
    const steps = 20;
    const maxDropPx = interpolateDOPE(dopeTab, dist, 'elevMOA') * dropKoeff * 0.4;

    for (let i = 0; i < steps - 1; i++) {
      if (i % 2 !== 0) continue; // dashed
      const t1 = i / steps;
      const t2 = (i + 1) / steps;
      const x1 = cx - 30 + t1 * 60;
      const y1 = cy + t1 * t1 * maxDropPx;
      const x2 = cx - 30 + t2 * 60;
      const y2 = cy + t2 * t2 * maxDropPx;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
    }

    // Small label
    this.add.text(cx + 35, cy + maxDropPx * 0.5, 'DROP', {
      fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#C8A84B', letterSpacing: 1,
    }).setScrollFactor(0).setDepth(94).setOrigin(0, 0.5).setAlpha(0.3);
  }

  // ══════════════════════════════════════════════
  //  ADDITIONAL AUDIO
  // ══════════════════════════════════════════════

  _playHeartbeat() {
    try {
      const vol = GameState.settings.volSFX * GameState.settings.volMaster;
      const beat = new Tone.MembraneSynth({
        pitchDecay: 0.02,
        octaves: 3,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.05 },
      });
      const gain = new Tone.Gain(vol * 0.12);
      beat.connect(gain);
      gain.toDestination();
      // Double-beat: lub-dub
      beat.triggerAttackRelease('C2', '0.08');
      setTimeout(() => {
        try { beat.triggerAttackRelease('C2', '0.06'); } catch(e) {}
      }, 120);
      setTimeout(() => { beat.dispose(); gain.dispose(); }, 1000);
    } catch (e) { /* Audio unavailable */ }
  }

  _playTypeClick(freq) {
    try {
      if (!this._typeClickSynth) {
        this._typeClickSynth = new Tone.MetalSynth({
          frequency: 800,
          envelope: { attack: 0.001, decay: 0.008, release: 0.005 },
          harmonicity: 3,
          modulationIndex: 8,
          resonance: 3000,
          octaves: 0.5,
        });
        this._typeClickGain = new Tone.Gain(GameState.settings.volSFX * GameState.settings.volMaster * 0.06);
        this._typeClickSynth.connect(this._typeClickGain);
        this._typeClickGain.toDestination();
      }
      this._typeClickSynth.frequency = freq || 800;
      this._typeClickSynth.triggerAttackRelease('32n');
    } catch (e) { /* silent */ }
  }

  shutdown() {
    this._stopAmbientWind();
    try {
      if (this._typeClickSynth) { this._typeClickSynth.dispose(); }
      if (this._typeClickGain) { this._typeClickGain.dispose(); }
    } catch (e) { /* silent */ }
  }

  // ══════════════════════════════════════════════
  //  PROGRESSIVE TOOLTIPS (post-tutorial)
  //  Context-sensitive hints when new mechanics appear.
  // ══════════════════════════════════════════════

  _showProgressiveTooltips(W, H) {
    if (this.fired || this._walkthroughActive) return;

    const m = this.mission;
    const seen = GameState.settings._seenTooltips || {};
    const tips = [];

    // Tip: Wind introduced (first time wind > 0)
    if (m.targetWind > 0 && !seen.wind) {
      tips.push({
        key: 'wind',
        text: 'WIND DETECTED — Read the Kestrel and adjust\nwindage with  ← →  arrow keys.',
        y: H * 0.50,
      });
    }

    // Tip: Timer introduced (first timed mission)
    if (m.timeLimit > 0 && !seen.timer) {
      tips.push({
        key: 'timer',
        text: `TIME LIMIT: ${m.timeLimit}s — Work fast.\nSet your dials, then fire before time runs out.`,
        y: H * 0.46,
      });
    }

    // Tip: Moving target
    if (m.targetMoving && !seen.moving) {
      tips.push({
        key: 'moving',
        text: 'TARGET IS MOBILE — Lead your shot.\nWait for a pause, or fire during movement.',
        y: H * 0.42,
      });
    }

    // Tip: Civilian present
    if (m.civilianPresent && !seen.civilian) {
      tips.push({
        key: 'civilian',
        text: 'CIVILIAN NEAR TARGET — Check your backdrop.\nA missed shot could hit a bystander.',
        y: H * 0.38,
      });
    }

    // Tip: Night mode
    if (m.nightMode && !seen.night) {
      tips.push({
        key: 'night',
        text: 'NIGHT OP — Visibility is reduced.\nLook for the silhouette against the terrain.',
        y: H * 0.42,
      });
    }

    if (tips.length === 0) return;

    // Mark all as seen
    tips.forEach(t => { seen[t.key] = true; });
    GameState.settings._seenTooltips = seen;
    GameState.save();

    // Show all tips in a single stacked box at the top of the scope
    const allLines = tips.map(t => `⚠  ${t.text}`).join('\n\n');
    const badge = this.add.text(W / 2, 50, allLines, {
      fontFamily: 'JetBrains Mono',
      fontSize: '16px',
      color: '#F4E8C1',
      lineSpacing: 6,
      align: 'center',
      backgroundColor: '#111110',
      padding: { x: 18, y: 14 },
    }).setScrollFactor(0).setDepth(190).setOrigin(0.5, 0).setAlpha(0);

    // Fade in, hold, fade out
    this.tweens.add({ targets: badge, alpha: 0.95, duration: 600 });
    this.tweens.add({ targets: badge, alpha: 0, duration: 800, delay: 6000, onComplete: () => badge.destroy() });
  }

  // ══════════════════════════════════════════════
  //  CORRECTION HINT (shown after briefing fades)
  // ══════════════════════════════════════════════

  _showCorrectionHint() {
    if (!GameState.settings.showCorrectionHints) return;
    const weapon = getActiveWeapon();
    const dopeTab = weapon.dopeTable || DOPE_TABLE_308;
    const suggestedElev = interpolateDOPE(dopeTab, this.mission.targetDistance, 'elevMOA') * (weapon.dropKoeff || 1);
    const hint = `SUGGESTED ELEV: ${suggestedElev.toFixed(1)} MOA`;
    const hintText = this.add.text(this.scale.width / 2, this.scale.height * 0.35, hint, {
      fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#C8A84B', letterSpacing: 2,
    }).setScrollFactor(0).setDepth(96).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: hintText, alpha: 0.5, duration: 800, delay: 200 });
    this.tweens.add({ targets: hintText, alpha: 0, duration: 600, delay: 5000 });
  }

  // ══════════════════════════════════════════════════
  //  INTERACTIVE TUTORIAL (first mission only)
  //  Hands-on — player must perform each action.
  //  ESC to skip at any time.
  // ══════════════════════════════════════════════════

  _startWalkthrough(W, H) {
    this._walkthroughActive = true;
    this._wtStep = 0;
    this._wtObjects = [];          // destroyed each step
    this._wtPersistent = [];       // destroyed on end
    this._wtCheckTimer = null;     // polling timer for interactive steps
    this._wtInputEnabled = false;  // whether turret/fire keys are live

    // Panel / instrument positions (match _createControlPanel)
    const panelY = H * 0.60;
    const dialY = panelY + 70;
    const kx = W * 0.65;
    const ky = panelY + 14;
    const kw = 130;
    const kh = 120;
    // Bubble level position
    const bubX = W * 0.12;
    const bubY = H * 0.82;
    // HUD position
    const hudY = H - 40;

    // Pre-compute the correct elevation — always use .308 table for tutorial
    // (avoids 55 MOA bug when shotgun is equipped)
    const correctElev = interpolateDOPE(DOPE_TABLE_308, this.mission.targetDistance, 'elevMOA');
    this._wtCorrectElev = Math.round(correctElev * 4) / 4; // snap to 0.25

    /* ── Step definitions ──
       type: 'info'        → click/space to advance
       type: 'interactive' → player must perform action, validated by checkFn
       type: 'fire'        → unlocks fire button
    */
    this._wtSteps = [
      // 0 — Welcome
      {
        type: 'info',
        title: 'WELCOME, OPERATOR',
        body: 'You are about to take your first shot.\nThis tutorial will walk you through\neach step — hands on.\n\nYou will ACTUALLY set the dials.\nPress  SPACE  to begin.',
        highlight: null,
        notePos: { x: W / 2, y: H * 0.42, oX: 0.5, oY: 0.5 },
        arrowTo: null,
      },
      // 1 — Scope overview
      {
        type: 'info',
        title: 'STEP 1 · YOUR SCOPE',
        body: 'This is the scope view.\nThe green crosshair shows where\nyour bullet will impact.\n\nUse  W A S D  to pan around.\nThe target is the dark silhouette.',
        highlight: { x: W * 0.15, y: 10, w: W * 0.7, h: H * 0.75 },
        notePos: { x: W * 0.15, y: H * 0.15, oX: 0.5, oY: 0 },
        arrowTo: { x: W * 0.5, y: H * 0.5 },
      },
      // 2 — Kestrel (shows all mission data)
      {
        type: 'info',
        title: 'STEP 2 · THE KESTREL',
        body: 'This device shows your target data:\nrange, wind, temperature, and the\nsuggested elevation.\n\nELEV says  ' + this._wtCorrectElev.toFixed(1) + '  MOA — that is\nthe number to dial in next.',
        highlight: { x: kx - kw / 2 - 4, y: ky - 4, w: kw + 8, h: kh + 8 },
        notePos: { x: W * 0.45, y: H * 0.55, oX: 0.5, oY: 0 },
        arrowTo: { x: kx - kw / 2, y: ky + kh / 2 },
      },
      // 3 — HUD readout
      {
        type: 'info',
        title: 'STEP 3 · HUD READOUT',
        body: 'The green text at the bottom shows\nyour current settings in real-time:\nRNG (range), WND (wind), ELV (elevation).\n\nWatch the ELV value change as\nyou adjust the turret next.',
        highlight: { x: W * 0.10, y: hudY - 12, w: W * 0.80, h: 30 },
        notePos: { x: W / 2, y: H * 0.55, oX: 0.5, oY: 0 },
        arrowTo: { x: W * 0.5, y: hudY },
      },
      // 4 — INTERACTIVE: Set elevation
      {
        type: 'interactive',
        title: 'STEP 4 · SET ELEVATION',
        body: 'Press  ↑  to raise elevation to\n' + this._wtCorrectElev.toFixed(1) + '  MOA.\n\nWatch the ELV value at the bottom\nchange as you press the key.',
        highlight: { x: W * 0.65, y: hudY - 12, w: W * 0.25, h: 30 },
        notePos: { x: W * 0.5, y: H * 0.35, oX: 0.5, oY: 0 },
        arrowTo: { x: W * 0.75, y: hudY },
        allow: 'elevation',
        checkFn: () => {
          const diff = Math.abs(GameState.dialValues.elevation - this._wtCorrectElev);
          return diff < 0.3;
        },
        successMsg: '✓  ELEVATION SET',
      },
      // 5 — Wind (info only — wind is 0 on first mission)
      {
        type: 'info',
        title: 'STEP 5 · WIND',
        body: this.mission.targetWind === 0
          ? 'The Kestrel shows wind speed.\n\nToday: CALM — no wind correction\nneeded. Windage stays at 0.0.\n\nOn future missions you will use\n←  →  to compensate for wind.'
          : 'The Kestrel shows wind speed.\nUse ← → to adjust windage.',
        highlight: { x: kx - kw / 2 - 4, y: ky - 4, w: kw + 8, h: kh + 8 },
        notePos: { x: W * 0.35, y: H * 0.55, oX: 0.5, oY: 0 },
        arrowTo: { x: kx - kw / 2, y: ky + 40 },
      },
      // 6 — Bubble level (info)
      {
        type: 'info',
        title: 'STEP 6 · CANT LEVEL',
        body: 'This bubble indicator shows if your\nrifle is tilted. Keep it centered!\n\nUse  Q  and  E  to adjust.\nEven small tilts cause misses.',
        highlight: { x: bubX - 40, y: bubY - 12, w: 80, h: 36 },
        notePos: { x: W * 0.30, y: H * 0.55, oX: 0.5, oY: 0 },
        arrowTo: { x: bubX, y: bubY - 12 },
      },
      // 7 — FIRE (interactive: take the shot)
      {
        type: 'fire',
        title: 'STEP 7 · TAKE THE SHOT',
        body: 'Your dials are set. Now:\n① Hold  SHIFT  to steady aim\n② Press  SPACE  to fire\n\nOne round. Send it.',
        highlight: { x: W * 0.25, y: H * 0.25, w: W * 0.5, h: H * 0.5 },
        notePos: { x: W * 0.5, y: H * 0.1, oX: 0.5, oY: 0 },
        arrowTo: { x: W * 0.5, y: H * 0.5 },
      },
    ];

    // ── Persistent UI ──
    this._wtDim = this.add.graphics().setScrollFactor(0).setDepth(300);
    this._wtPersistent.push(this._wtDim);

    // Step counter (top-right)
    this._wtCounter = this.add.text(W - 20, 10, '', {
      fontFamily: 'JetBrains Mono', fontSize: '16px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 2,
    }).setScrollFactor(0).setDepth(310).setOrigin(1, 0);
    this._wtPersistent.push(this._wtCounter);

    // Skip hint (top-left)
    const skipText = this.add.text(20, 10, 'ESC  TO  SKIP', {
      fontFamily: 'JetBrains Mono', fontSize: '13px',
      color: '#404040', letterSpacing: 2,
    }).setScrollFactor(0).setDepth(310);
    this._wtPersistent.push(skipText);

    // Prompt (bottom-center) — changes per step type
    this._wtPrompt = this.add.text(W / 2, H - 14, '', {
      fontFamily: 'JetBrains Mono', fontSize: '16px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 4,
    }).setScrollFactor(0).setDepth(310).setOrigin(0.5);
    this._wtPersistent.push(this._wtPrompt);

    this._wtPromptTween = this.tweens.add({
      targets: this._wtPrompt, alpha: 0.3, duration: 700,
      yoyo: true, repeat: -1,
    });

    // Click zone for info steps (disabled during interactive)
    this._wtClickZone = this.add.zone(W / 2, H / 2, W, H)
      .setScrollFactor(0).setDepth(320).setInteractive();
    this._wtClickZone.on('pointerdown', () => this._wtAdvance());
    this._wtPersistent.push(this._wtClickZone);

    // ESC to skip
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._walkthroughActive) this._endWalkthrough();
    });

    this._renderWalkthroughStep();
  }

  /* ── Render one tutorial step ── */
  _renderWalkthroughStep() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Clean up previous step
    this._wtObjects.forEach(o => { if (o && o.destroy) o.destroy(); });
    this._wtObjects = [];
    if (this._wtCheckTimer) { this._wtCheckTimer.remove(); this._wtCheckTimer = null; }

    const step = this._wtSteps[this._wtStep];
    const hl = step.highlight;
    const g = this._wtDim;
    g.clear();

    // ── Dark overlay with cutout ──
    g.fillStyle(0x000000, 0.78);
    if (hl) {
      g.fillRect(0, 0, W, hl.y);
      g.fillRect(0, hl.y, hl.x, hl.h);
      g.fillRect(hl.x + hl.w, hl.y, W - hl.x - hl.w, hl.h);
      g.fillRect(0, hl.y + hl.h, W, H - hl.y - hl.h);
      g.lineStyle(2, 0xC8A84B, 0.9);
      g.strokeRect(hl.x - 2, hl.y - 2, hl.w + 4, hl.h + 4);
      g.lineStyle(1, 0xC8A84B, 0.25);
      g.strokeRect(hl.x - 6, hl.y - 6, hl.w + 12, hl.h + 12);
    } else {
      g.fillRect(0, 0, W, H);
    }

    // ── Build note card ──
    const np = step.notePos;
    const padX = 24, padTop = 16, padBot = 20, lineH = 18;
    const bodyLines = step.body.split('\n');
    const titleH = 24;
    const bodyH = bodyLines.length * lineH;
    const cardW = 300;
    const cardH = padTop + titleH + 8 + bodyH + padBot;
    let cardX = np.x - cardW * np.oX;
    let cardY = np.y - cardH * np.oY;
    cardX = Math.max(10, Math.min(W - cardW - 10, cardX));
    cardY = Math.max(10, Math.min(H - cardH - 40, cardY));

    const cardGfx = this.add.graphics().setScrollFactor(0).setDepth(305);
    this._wtObjects.push(cardGfx);

    // Shadow + card + accent
    cardGfx.fillStyle(0x000000, 0.5);
    cardGfx.fillRoundedRect(cardX + 4, cardY + 4, cardW, cardH, 6);
    cardGfx.fillStyle(0x0C0C0C, 0.97);
    cardGfx.fillRoundedRect(cardX, cardY, cardW, cardH, 6);
    cardGfx.fillStyle(step.type === 'interactive' ? 0x3DFF6E : (step.type === 'fire' ? 0xFF4444 : 0xC8A84B), 1);
    cardGfx.fillRect(cardX, cardY, cardW, 3);
    cardGfx.lineStyle(1, step.type === 'interactive' ? 0x3DFF6E : (step.type === 'fire' ? 0xFF4444 : 0xC8A84B), 0.6);
    cardGfx.strokeRoundedRect(cardX, cardY, cardW, cardH, 6);

    // Type badge
    if (step.type === 'interactive') {
      const badge = this.add.text(cardX + cardW - padX, cardY + padTop, 'HANDS-ON', {
        fontFamily: 'JetBrains Mono', fontSize: '12px', fontStyle: 'bold',
        color: '#3DFF6E', letterSpacing: 2,
      }).setScrollFactor(0).setDepth(306).setOrigin(1, 0);
      this._wtObjects.push(badge);
    }

    // Title
    const accentColor = step.type === 'interactive' ? '#3DFF6E' : (step.type === 'fire' ? '#FF6644' : '#C8A84B');
    const title = this.add.text(cardX + padX, cardY + padTop, step.title, {
      fontFamily: 'JetBrains Mono', fontSize: '22px', fontStyle: 'bold',
      color: accentColor, letterSpacing: 3,
    }).setScrollFactor(0).setDepth(306);
    this._wtObjects.push(title);

    // Separator
    const sepY = cardY + padTop + titleH + 2;
    cardGfx.lineStyle(1, 0xC8A84B, 0.2);
    cardGfx.lineBetween(cardX + padX, sepY, cardX + cardW - padX, sepY);

    // Body
    const body = this.add.text(cardX + padX, sepY + 8, step.body, {
      fontFamily: 'Courier Prime', fontSize: '19px',
      color: '#E0E0E0', lineSpacing: 5,
    }).setScrollFactor(0).setDepth(306);
    this._wtObjects.push(body);

    // ── Arrow ──
    if (step.arrowTo && hl) {
      const arrowGfx = this.add.graphics().setScrollFactor(0).setDepth(304);
      this._wtObjects.push(arrowGfx);
      const cardCX = cardX + cardW / 2, cardCY = cardY + cardH / 2;
      const tx = step.arrowTo.x, ty = step.arrowTo.y;
      const dx = tx - cardCX, dy = ty - cardCY;
      let sx, sy;
      if (Math.abs(dy) > Math.abs(dx)) {
        sy = dy > 0 ? cardY + cardH : cardY;
        sx = Math.max(cardX + 15, Math.min(cardX + cardW - 15, tx));
      } else {
        sx = dx > 0 ? cardX + cardW : cardX;
        sy = Math.max(cardY + 15, Math.min(cardY + cardH - 15, ty));
      }
      arrowGfx.lineStyle(3, 0xC8A84B, 0.9);
      arrowGfx.beginPath(); arrowGfx.moveTo(sx, sy); arrowGfx.lineTo(tx, ty); arrowGfx.strokePath();
      const angle = Math.atan2(ty - sy, tx - sx);
      arrowGfx.fillStyle(0xC8A84B, 0.9);
      arrowGfx.beginPath(); arrowGfx.moveTo(tx, ty);
      arrowGfx.lineTo(tx - 14 * Math.cos(angle - 0.45), ty - 14 * Math.sin(angle - 0.45));
      arrowGfx.lineTo(tx - 14 * Math.cos(angle + 0.45), ty - 14 * Math.sin(angle + 0.45));
      arrowGfx.closePath(); arrowGfx.fillPath();
    }

    // ── Step counter + progress dots ──
    const total = this._wtSteps.length;
    this._wtCounter.setText(`${this._wtStep + 1} / ${total}`);
    const dotsGfx = this.add.graphics().setScrollFactor(0).setDepth(310);
    this._wtObjects.push(dotsGfx);
    const dotSpacing = 18;
    const dotsX = W / 2 - (total * dotSpacing) / 2;
    for (let i = 0; i < total; i++) {
      const filled = i < this._wtStep;
      const current = i === this._wtStep;
      dotsGfx.fillStyle(filled ? 0xC8A84B : (current ? 0xC8A84B : 0x404040), current ? 1 : (filled ? 0.7 : 0.4));
      dotsGfx.fillCircle(dotsX + i * dotSpacing + 5, H - 34, current ? 5 : 3);
    }

    // ── Step-type-specific behavior ──
    if (step.type === 'info') {
      this._wtInputEnabled = false;
      this._wtClickZone.setInteractive();
      this._wtPrompt.setText('▶  CLICK  OR  PRESS  SPACE  ▶');
    } else if (step.type === 'interactive') {
      this._wtInputEnabled = step.allow;
      this._wtClickZone.disableInteractive(); // no click-to-skip
      this._wtPrompt.setText('↑ ↓  ADJUST  THE  DIAL  NOW');
      this._wtPrompt.setColor('#3DFF6E');

      // Poll for correct value every 200ms
      this._wtCheckTimer = this.time.addEvent({
        delay: 200, loop: true,
        callback: () => {
          if (step.checkFn && step.checkFn()) {
            this._wtCheckTimer.remove(); this._wtCheckTimer = null;
            // Show success flash
            this._wtPrompt.setText(step.successMsg || '✓  CORRECT');
            this._wtPrompt.setColor('#3DFF6E');
            this.time.delayedCall(800, () => {
              this._wtInputEnabled = false;
              this._wtStep++;
              if (this._wtStep >= this._wtSteps.length) this._endWalkthrough();
              else this._renderWalkthroughStep();
            });
          }
        },
      });
    } else if (step.type === 'fire') {
      this._wtInputEnabled = 'fire';
      this._wtClickZone.disableInteractive();
      this._wtPrompt.setText('HOLD  SHIFT  +  PRESS  SPACE');
      this._wtPrompt.setColor('#FF6644');
    }
  }

  /* Called from update() / key handlers when walkthrough is active */
  _wtHandleInput(key) {
    if (!this._walkthroughActive) return false;
    const step = this._wtSteps[this._wtStep];

    // ESC always works (handled globally)

    // Info steps: space/enter/click advance
    if (step.type === 'info') {
      if (key === 'space' || key === 'enter' || key === 'click') {
        this._wtAdvance();
        return true;
      }
    }

    // Interactive elevation: only allow ↑↓
    if (step.type === 'interactive' && step.allow === 'elevation') {
      if (key === 'arrowup' || key === 'arrowdown') return false; // let normal handler run
    }

    // Interactive windage: only allow ←→
    if (step.type === 'interactive' && step.allow === 'windage') {
      if (key === 'arrowleft' || key === 'arrowright') return false;
    }

    // Fire step: allow shift + space to fire
    if (step.type === 'fire') {
      if (key === 'space' || key === 'enter') return false; // let _fire() run
      if (key === 'shift') return false;
    }

    return true; // block all other input
  }

  _wtAdvance() {
    if (!this._walkthroughActive) return;
    const step = this._wtSteps[this._wtStep];
    if (step.type !== 'info') return; // only info steps advance on click
    this._wtStep++;
    if (this._wtStep >= this._wtSteps.length) {
      this._endWalkthrough();
    } else {
      this._renderWalkthroughStep();
    }
  }

  _endWalkthrough() {
    this._walkthroughActive = false;
    this._wtInputEnabled = false;
    GameState.settings.walkthroughCompleted = true;
    GameState.save();

    // Clean up
    if (this._wtCheckTimer) { this._wtCheckTimer.remove(); this._wtCheckTimer = null; }
    this._wtObjects.forEach(o => { if (o && o.destroy) o.destroy(); });
    this._wtPersistent.forEach(o => { if (o && o.destroy) o.destroy(); });
    this._wtObjects = [];
    this._wtPersistent = [];

    if (!this.fired) this._showCorrectionHint();
  }
}
