/* ═══════════════════════════════════════════════════
   COLD ZERO — FieldManualScene
   8-page military field manual / classified dossier.
   Covers every game concept in operator-style notes.
   Accessible from main menu & auto-shown first run.
   ═══════════════════════════════════════════════════ */

class FieldManualScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FieldManualScene' });
  }

  init(data) {
    // Where to go after the manual is dismissed
    this._returnTo = data.returnTo || 'MenuScene';
    this._returnData = data.returnData || null;
    this._currentPage = 0;
    this._transitioning = false;
    this._pageObjects = [];
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#0A0A0A');
    this.cameras.main.fadeIn(300, 10, 10, 10);

    // Page definitions
    this._pages = this._buildPages();

    // ── Paper texture background ──
    this._paperBg = this.add.graphics().setDepth(0);
    this._drawPaperTexture(W, H);

    // ── Classified stamp (top-right, every page) ──
    this._stampText = this.add.text(W - 60, 38, 'CLASSIFIED', {
      fontFamily: 'JetBrains Mono', fontSize: '21px', fontStyle: 'bold',
      color: '#882222', letterSpacing: 3,
    }).setOrigin(0.5).setAngle(-12).setAlpha(0.18).setDepth(1);

    // ── Document border ──
    this._border = this.add.graphics().setDepth(1);
    this._border.lineStyle(1, 0xC8A84B, 0.15);
    this._border.strokeRect(30, 20, W - 60, H - 50);
    this._border.lineStyle(1, 0xC8A84B, 0.07);
    this._border.strokeRect(34, 24, W - 68, H - 58);

    // ── Header bar ──
    this._headerLine = this.add.graphics().setDepth(2);
    this._headerLine.fillStyle(0xC8A84B, 0.08);
    this._headerLine.fillRect(40, 40, W - 80, 32);
    this._headerLine.lineStyle(1, 0xC8A84B, 0.25);
    this._headerLine.lineBetween(40, 72, W - 40, 72);

    this._docTitle = this.add.text(50, 47, 'FM 23-10  ·  COLD ZERO FIELD MANUAL', {
      fontFamily: 'JetBrains Mono', fontSize: '15px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 4,
    }).setDepth(3).setAlpha(0.7);

    // ── Footer ──
    this._footerText = this.add.text(W / 2, H - 18, '', {
      fontFamily: 'JetBrains Mono', fontSize: '12px',
      color: '#404040', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(3);

    // ── Navigation hint ──
    this._navHint = this.add.text(W / 2, H - 35, '← →  or  A / D  TO NAVIGATE   ·   ESC: DISMISS', {
      fontFamily: 'JetBrains Mono', fontSize: '10px',
      color: '#252525', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(3);

    // ── Render first page ──
    this._renderPage(0);

    // ── Input ──
    this.input.keyboard.on('keydown-RIGHT', () => this._nextPage());
    this.input.keyboard.on('keydown-D', () => this._nextPage());
    this.input.keyboard.on('keydown-LEFT', () => this._prevPage());
    this.input.keyboard.on('keydown-A', () => this._prevPage());
    this.input.keyboard.on('keydown-ESC', () => this._dismiss());
    this.input.keyboard.on('keydown-ENTER', () => this._nextPage());
    this.input.keyboard.on('keydown-SPACE', () => this._nextPage());

    // Click zones for arrow navigation
    const leftZone = this.add.zone(60, H / 2, 80, H - 100).setInteractive({ useHandCursor: true }).setDepth(50);
    leftZone.on('pointerdown', () => this._prevPage());
    const rightZone = this.add.zone(W - 60, H / 2, 80, H - 100).setInteractive({ useHandCursor: true }).setDepth(50);
    rightZone.on('pointerdown', () => this._nextPage());

    // Arrow indicators
    this._leftArrow = this.add.text(44, H / 2, '◀', {
      fontFamily: 'JetBrains Mono', fontSize: '27px', color: '#C8A84B',
    }).setOrigin(0.5).setAlpha(0).setDepth(51);
    this._rightArrow = this.add.text(W - 44, H / 2, '▶', {
      fontFamily: 'JetBrains Mono', fontSize: '27px', color: '#C8A84B',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(51);
  }

  // ═══════════════════════════════════════════════════
  //  PAGE DEFINITIONS
  // ═══════════════════════════════════════════════════
  _buildPages() {
    return [
      // ── PAGE 1: WELCOME ──
      {
        title: 'WELCOME, OPERATOR',
        render: (g, x, y, W) => {
          const s = 11, lh = 18, col = '#D0D0D0';
          const t = (txt, dy, opts = {}) => this._pageText(x, y + dy, txt, { fontSize: `${opts.size || s}px`, color: opts.color || col, ...opts });

          t('You have been assigned to COLD ZERO — a long-range precision', 0);
          t('engagement program. Your task: neutralize targets at distance', lh);
          t('with a single round. No second chances.', lh * 2);

          t('MISSION STRUCTURE', lh * 4, { color: '#C8A84B', size: 12, bold: true });
          t('Each campaign consists of 5 missions with escalating difficulty.', lh * 5.5);
          t('Distances increase, wind gets stronger, time limits tighten.', lh * 6.5);
          t('You earn KV (Kill Value) for successful hits to use in the Armory.', lh * 7.5);

          t('THE FLOW', lh * 9.5, { color: '#C8A84B', size: 12, bold: true });

          // Flow diagram
          const flowY = y + lh * 11;
          const boxes = ['BRIEFING', 'SCOPE', 'FIRE', 'RESULT'];
          const bw = 110, bh = 24, gap = 20;
          const totalW = boxes.length * bw + (boxes.length - 1) * gap;
          const flowX = x + (W - 80) / 2 - totalW / 2;

          boxes.forEach((label, i) => {
            const bx = flowX + i * (bw + gap);
            g.lineStyle(1, 0xC8A84B, 0.5);
            g.strokeRect(bx, flowY, bw, bh);
            this._pageText(bx + bw / 2, flowY + bh / 2, label, {
              size: 9, color: '#C8A84B', origin: [0.5, 0.5], bold: true,
            });
            if (i < boxes.length - 1) {
              g.lineStyle(1, 0x78808A, 0.4);
              g.lineBetween(bx + bw + 2, flowY + bh / 2, bx + bw + gap - 2, flowY + bh / 2);
              // arrowhead
              g.lineBetween(bx + bw + gap - 7, flowY + bh / 2 - 3, bx + bw + gap - 2, flowY + bh / 2);
              g.lineBetween(bx + bw + gap - 7, flowY + bh / 2 + 3, bx + bw + gap - 2, flowY + bh / 2);
            }
          });

          t('1. Read the briefing — it tells you range, wind, conditions.', lh * 14.5);
          t('2. Adjust your scope dials to match the required corrections.', lh * 15.5);
          t('3. Take the shot when ready (SPACE or click FIRE).', lh * 16.5);
          t('4. Review results — learn from misses, earn KV from hits.', lh * 17.5);

          t('Two consecutive misses end the campaign early.', lh * 19.5, { color: '#CC4444', size: 10 });
        },
      },

      // ── PAGE 2: THE SCOPE VIEW ──
      {
        title: 'THE SCOPE VIEW',
        render: (g, x, y, W) => {
          const s = 10, lh = 16, col = '#D0D0D0';
          const t = (txt, dy, opts = {}) => this._pageText(x, y + dy, txt, { fontSize: `${opts.size || s}px`, color: opts.color || col, ...opts });

          t('Your primary view is split into two zones:', 0);

          // Scope diagram
          const diaX = x + 40, diaY = y + 30, diaW = W - 160, diaH = 240;
          // Top zone (scope)
          g.lineStyle(1, 0x3DFF6E, 0.3);
          g.strokeRect(diaX, diaY, diaW, diaH * 0.6);
          g.fillStyle(0x030A03, 0.6);
          g.fillRect(diaX, diaY, diaW, diaH * 0.6);

          // Scope circle
          const scopeCX = diaX + diaW / 2, scopeCY = diaY + diaH * 0.3;
          const scopeR = diaH * 0.22;
          g.lineStyle(1, 0x3DFF6E, 0.5);
          g.strokeCircle(scopeCX, scopeCY, scopeR);

          // Crosshair inside circle
          g.lineStyle(1, 0x3DFF6E, 0.6);
          g.lineBetween(scopeCX - scopeR * 0.7, scopeCY, scopeCX - 6, scopeCY);
          g.lineBetween(scopeCX + 6, scopeCY, scopeCX + scopeR * 0.7, scopeCY);
          g.lineBetween(scopeCX, scopeCY - scopeR * 0.7, scopeCX, scopeCY - 6);
          g.lineBetween(scopeCX, scopeCY + 6, scopeCX, scopeCY + scopeR * 0.7);
          // Mil dots
          for (let i = 1; i <= 3; i++) {
            g.fillStyle(0x3DFF6E, 0.4);
            g.fillCircle(scopeCX + i * 10, scopeCY, 1.5);
            g.fillCircle(scopeCX - i * 10, scopeCY, 1.5);
            g.fillCircle(scopeCX, scopeCY + i * 10, 1.5);
          }

          // Target silhouette
          g.fillStyle(0xFFFFFF, 0.25);
          g.fillCircle(scopeCX + 20, scopeCY - 8, 4); // head
          g.fillRect(scopeCX + 17, scopeCY - 4, 6, 14); // torso

          // Bottom zone (control panel)
          g.fillStyle(0x111111, 0.8);
          g.fillRect(diaX, diaY + diaH * 0.6, diaW, diaH * 0.4);
          g.lineStyle(1, 0xC8A84B, 0.3);
          g.lineBetween(diaX, diaY + diaH * 0.6, diaX + diaW, diaY + diaH * 0.6);

          // Labels inside control panel
          const cpY = diaY + diaH * 0.6 + 10;
          this._pageText(diaX + 30, cpY + 5, 'ELEV', { size: 7, color: '#C8A84B', bold: true });
          this._pageText(diaX + 80, cpY + 5, 'WIND', { size: 7, color: '#C8A84B', bold: true });
          this._pageText(diaX + 140, cpY + 5, 'FIRE', { size: 7, color: '#C8A84B', bold: true });
          this._pageText(diaX + diaW - 130, cpY + 5, 'KESTREL', { size: 7, color: '#1E6A1E', bold: true });
          this._pageText(diaX + diaW - 40, cpY + 5, 'WIND ◎', { size: 7, color: '#78808A', bold: true });

          // Annotation arrows
          const annStyle = { size: 8, color: '#C8A84B' };

          // Scope label
          this._pageText(diaX + diaW + 10, scopeCY - 20, 'SCOPE VIEW', { ...annStyle, bold: true });
          this._pageText(diaX + diaW + 10, scopeCY - 6, 'Move with W/A/S/D', annStyle);
          this._pageText(diaX + diaW + 10, scopeCY + 8, 'Find your target here', annStyle);
          g.lineStyle(1, 0xC8A84B, 0.3);
          g.lineBetween(diaX + diaW + 6, scopeCY, diaX + diaW, scopeCY);

          // Control panel label
          this._pageText(diaX + diaW + 10, cpY + 20, 'CONTROL PANEL', { ...annStyle, bold: true });
          this._pageText(diaX + diaW + 10, cpY + 34, 'Turrets, instruments,', annStyle);
          this._pageText(diaX + diaW + 10, cpY + 46, 'fire button', annStyle);

          // Bottom explanation
          const bY = diaY + diaH + 20;
          t('TOP 60%  — Scope with circular vignette. Your world view.', bY - y);
          t('BOTTOM 40% — Control panel with turret dials, Kestrel meter,', bY - y + lh);
          t('             wind compass, DOPE strip, and FIRE button.', bY - y + lh * 2);
          t('The crosshair has mil-dots for range estimation.', bY - y + lh * 3.5);
          t('A breathing sway moves the scope — hold SHIFT to steady aim.', bY - y + lh * 4.5);
        },
      },

      // ── PAGE 3: THE DOPE STRIP ──
      {
        title: 'READING THE DOPE STRIP',
        render: (g, x, y, W) => {
          const s = 10, lh = 16, col = '#D0D0D0';
          const t = (txt, dy, opts = {}) => this._pageText(x, y + dy, txt, { fontSize: `${opts.size || s}px`, color: opts.color || col, ...opts });

          t('DOPE = "Data On Previous Engagements"', 0, { color: '#C8A84B', size: 11 });
          t('A reference table that tells you exactly how much to dial', lh * 1.5);
          t('for each range. This is your most important tool.', lh * 2.5);

          // Draw a DOPE strip example
          const stripX = x + 20, stripY = y + lh * 4.5, stripW = W - 120, stripH = 50;
          g.fillStyle(0x111111, 0.9);
          g.fillRect(stripX, stripY, stripW, stripH);
          g.lineStyle(1, 0x252525, 0.6);
          g.strokeRect(stripX, stripY, stripW, stripH);

          // DOPE entries
          const entries = [
            { range: 200, elev: '2.1', wind: '1.0' },
            { range: 300, elev: '4.8', wind: '1.5' },
            { range: 400, elev: '8.4', wind: '2.1', active: true },
            { range: 500, elev: '13.2', wind: '2.7' },
            { range: 600, elev: '19.5', wind: '3.4' },
          ];

          const entryW = stripW / entries.length;
          entries.forEach((e, i) => {
            const ex = stripX + i * entryW;
            if (e.active) {
              g.fillStyle(0xC8A84B, 0.15);
              g.fillRect(ex, stripY, entryW, stripH);
              g.lineStyle(1, 0xC8A84B, 0.5);
              g.strokeRect(ex, stripY, entryW, stripH);
            }
            const col2 = e.active ? '#C8A84B' : '#78808A';
            this._pageText(ex + entryW / 2, stripY + 10, `${e.range}m`, {
              size: 9, color: col2, bold: true, origin: [0.5, 0],
            });
            this._pageText(ex + entryW / 2, stripY + 25, `↑${e.elev}`, {
              size: 8, color: col2, origin: [0.5, 0],
            });
            this._pageText(ex + entryW / 2, stripY + 37, `→${e.wind}`, {
              size: 8, color: e.active ? '#5a9a5a' : '#555555', origin: [0.5, 0],
            });
          });

          // Annotation arrow pointing to 400m
          const activeX = stripX + 2 * entryW + entryW / 2;
          g.lineStyle(1, 0xC8A84B, 0.6);
          g.lineBetween(activeX, stripY + stripH + 5, activeX, stripY + stripH + 25);
          this._pageText(activeX, stripY + stripH + 30, 'YOUR TARGET RANGE', {
            size: 8, color: '#C8A84B', bold: true, origin: [0.5, 0],
          });

          const noteY = lh * 10;
          t('HOW TO READ IT:', noteY, { color: '#C8A84B', size: 11, bold: true });
          t('  1. Find the row matching your target distance (shown in HUD).', noteY + lh * 1.5);
          t('  2. The ↑ number = elevation in MOA. Dial this with ↑/↓ keys.', noteY + lh * 2.5);
          t('  3. The → number = wind correction at full crosswind (4.5 m/s).', noteY + lh * 3.5);
          t('     If wind is less, proportionally reduce the windage dial.', noteY + lh * 4.5);

          t('EXAMPLE:', noteY + lh * 6.5, { color: '#C8A84B', size: 11, bold: true });
          t('  Target at 400m. DOPE says ↑8.4 MOA. Wind is 4.5 m/s →.', noteY + lh * 8);
          t('  Dial elevation to 8.4 (press ↑ 34 times from zero).', noteY + lh * 9);
          t('  Dial windage to 2.1 (press → 8-9 times from zero).', noteY + lh * 10);
          t('  Fire. Hit.', noteY + lh * 11, { color: '#3DFF6E' });

          t('Each weapon has its own DOPE table — heavier bullets drop less!', noteY + lh * 13, { color: '#78808A', size: 9 });
        },
      },

      // ── PAGE 4: ELEVATION & WINDAGE ──
      {
        title: 'ELEVATION & WINDAGE TURRETS',
        render: (g, x, y, W) => {
          const s = 10, lh = 16, col = '#D0D0D0';
          const t = (txt, dy, opts = {}) => this._pageText(x, y + dy, txt, { fontSize: `${opts.size || s}px`, color: opts.color || col, ...opts });

          t('Your scope has two turret dials — your primary instruments.', 0);

          // Draw two turret diagrams side by side
          const turretY = y + 35;
          const turretR = 45;

          // ELEVATION turret (left)
          const leftCX = x + 120;
          g.lineStyle(2, 0xC8A84B, 0.5);
          g.strokeCircle(leftCX, turretY + turretR, turretR);
          // Knurling marks
          for (let a = 0; a < 360; a += 15) {
            const rad = (a * Math.PI) / 180;
            const ix = leftCX + Math.cos(rad) * (turretR - 4);
            const iy = turretY + turretR + Math.sin(rad) * (turretR - 4);
            const ox = leftCX + Math.cos(rad) * (turretR + 1);
            const oy = turretY + turretR + Math.sin(rad) * (turretR + 1);
            g.lineStyle(1, 0xC8A84B, 0.2);
            g.lineBetween(ix, iy, ox, oy);
          }
          this._pageText(leftCX, turretY + turretR - 5, '8.4', {
            size: 16, color: '#C8A84B', bold: true, origin: [0.5, 0.5],
          });
          this._pageText(leftCX, turretY + turretR + 12, 'MOA', {
            size: 7, color: '#78808A', origin: [0.5, 0.5],
          });
          this._pageText(leftCX, turretY - 10, 'ELEVATION', {
            size: 9, color: '#C8A84B', bold: true, origin: [0.5, 0.5],
          });
          this._pageText(leftCX, turretY + turretR * 2 + 15, '↑ ↓  KEYS', {
            size: 8, color: '#78808A', origin: [0.5, 0.5],
          });

          // WINDAGE turret (right)
          const rightCX = x + 320;
          g.lineStyle(2, 0xC8A84B, 0.5);
          g.strokeCircle(rightCX, turretY + turretR, turretR);
          for (let a = 0; a < 360; a += 15) {
            const rad = (a * Math.PI) / 180;
            const ix = rightCX + Math.cos(rad) * (turretR - 4);
            const iy = turretY + turretR + Math.sin(rad) * (turretR - 4);
            const ox = rightCX + Math.cos(rad) * (turretR + 1);
            const oy = turretY + turretR + Math.sin(rad) * (turretR + 1);
            g.lineStyle(1, 0xC8A84B, 0.2);
            g.lineBetween(ix, iy, ox, oy);
          }
          this._pageText(rightCX, turretY + turretR - 5, '2.1', {
            size: 16, color: '#C8A84B', bold: true, origin: [0.5, 0.5],
          });
          this._pageText(rightCX, turretY + turretR + 12, 'MOA', {
            size: 7, color: '#78808A', origin: [0.5, 0.5],
          });
          this._pageText(rightCX, turretY - 10, 'WINDAGE', {
            size: 9, color: '#C8A84B', bold: true, origin: [0.5, 0.5],
          });
          this._pageText(rightCX, turretY + turretR * 2 + 15, '← →  KEYS', {
            size: 8, color: '#78808A', origin: [0.5, 0.5],
          });

          // Explanation text
          const ey = turretR * 2 + 50;
          t('MOA = Minute of Angle. Each click = 0.25 MOA adjustment.', ey);
          t('At 400m, 1 MOA error ≈ 24 pixels of miss on target.', ey + lh * 1.3, { color: '#CC4444', size: 9 });

          t('ELEVATION (↑↓)', ey + lh * 3, { color: '#C8A84B', bold: true });
          t('Compensates for bullet drop over distance. The further the', ey + lh * 4.2);
          t('target, the more elevation you need. Look at the DOPE strip.', ey + lh * 5.2);
          t('Dial LOW  = bullet hits below target (short)', ey + lh * 6.7, { color: '#CC4444', size: 9 });
          t('Dial HIGH = bullet hits above target (over)', ey + lh * 7.7, { color: '#CC4444', size: 9 });

          t('WINDAGE (←→)', ey + lh * 9.5, { color: '#C8A84B', bold: true });
          t('Compensates for crosswind pushing the bullet sideways.', ey + lh * 10.7);
          t('If wind blows RIGHT, dial RIGHT to offset it.', ey + lh * 11.7);
          t('If wind blows LEFT, dial LEFT (negative values).', ey + lh * 12.7);

          t('TIP: The Kestrel display shows the CORRECT elevation — match it!', ey + lh * 14.5, { color: '#3DFF6E', size: 9 });
        },
      },

      // ── PAGE 5: WIND & KESTREL ──
      {
        title: 'WIND & THE KESTREL 5700',
        render: (g, x, y, W) => {
          const s = 10, lh = 16, col = '#D0D0D0';
          const t = (txt, dy, opts = {}) => this._pageText(x, y + dy, txt, { fontSize: `${opts.size || s}px`, color: opts.color || col, ...opts });

          // Draw Kestrel device
          const kx = x + W - 220, ky = y + 10, kw = 100, kh = 160;
          g.fillStyle(0x111111, 1);
          g.fillRoundedRect(kx, ky, kw, kh, 6);
          g.lineStyle(1, 0x1E6A1E, 0.6);
          g.strokeRoundedRect(kx, ky, kw, kh, 6);

          // Screen
          g.fillStyle(0x0A1A0A, 1);
          g.fillRect(kx + 10, ky + 15, kw - 20, kh - 45);
          g.lineStyle(1, 0x1E6A1E, 0.3);

          // CRT content
          this._pageText(kx + 15, ky + 22, 'KESTREL 5700', { size: 6, color: '#1E6A1E' });
          this._pageText(kx + 15, ky + 36, 'RNG: 400 m', { size: 7, color: '#1E5A1E' });
          this._pageText(kx + 15, ky + 50, 'WND: 3.2 m/s', { size: 7, color: '#1E5A1E' });
          this._pageText(kx + 15, ky + 64, 'TMP: 22°C', { size: 7, color: '#1E5A1E' });
          this._pageText(kx + 15, ky + 82, 'ELEV: 8.4', { size: 8, color: '#3DFF6E', bold: true });

          // Annotation arrow to ELEV
          g.lineStyle(1, 0x3DFF6E, 0.5);
          g.lineBetween(kx - 5, ky + 86, kx + 13, ky + 86);
          this._pageText(kx - 10, ky + 82, '← CORRECT', { size: 7, color: '#3DFF6E', origin: [1, 0] });
          this._pageText(kx - 10, ky + 92, '   ELEVATION', { size: 7, color: '#3DFF6E', origin: [1, 0] });

          this._pageText(kx + kw / 2, ky + kh + 8, 'THE KESTREL', {
            size: 8, color: '#1E6A1E', bold: true, origin: [0.5, 0],
          });

          // Left side text
          t('The Kestrel 5700 is your environmental meter.', 0);
          t('It shows range, wind speed, temperature, and', lh);
          t('the CORRECT ELEVATION to dial for the current', lh * 2);
          t('engagement.', lh * 3);

          t('WIND READING', lh * 5, { color: '#C8A84B', bold: true, size: 11 });
          t('Wind is shown as actual speed in m/s.', lh * 6.2);
          t('The ± value is uncertainty — how much the', lh * 7.2);
          t('wind might deviate from the displayed value.', lh * 8.2);

          t('WIND CORRECTION FORMULA', lh * 10, { color: '#C8A84B', bold: true, size: 11 });

          // Formula box
          const fby = y + lh * 11.5;
          g.fillStyle(0x111111, 0.8);
          g.fillRect(x, fby, 380, 50);
          g.lineStyle(1, 0xC8A84B, 0.3);
          g.strokeRect(x, fby, 380, 50);
          this._pageText(x + 10, fby + 8, 'DOPE wind correction × (actual wind / 4.5)', {
            size: 10, color: '#C8A84B', bold: true,
          });
          this._pageText(x + 10, fby + 28, 'Example: DOPE says 2.1 → wind is 2.25 m/s', { size: 9, color: '#78808A' });
          this._pageText(x + 10, fby + 40, '         2.1 × (2.25 / 4.5) = 1.05 MOA → dial ~1.0', { size: 9, color: '#78808A' });

          t('WIND COMPASS', lh * 16, { color: '#C8A84B', bold: true, size: 11 });
          t('The compass on the right shows wind direction.', lh * 17.2);
          t('Arrow points the way the wind blows.', lh * 18.2);
          t('Full crosswind (90°) = full DOPE correction.', lh * 19.2);
          t('Headwind/tailwind (0°/180°) = minimal effect.', lh * 20.2);

          t('UPGRADE: Kestrel MK2 reduces wind uncertainty by 60%.', lh * 22, { color: '#3DFF6E', size: 9 });
        },
      },

      // ── PAGE 6: ADVANCED MECHANICS ──
      {
        title: 'CANT, BREATH & WEATHER',
        render: (g, x, y, W) => {
          const s = 10, lh = 16, col = '#D0D0D0';
          const t = (txt, dy, opts = {}) => this._pageText(x, y + dy, txt, { fontSize: `${opts.size || s}px`, color: opts.color || col, ...opts });

          t('BUBBLE LEVEL & CANT  (Q / E keys)', 0, { color: '#C8A84B', bold: true, size: 11 });

          // Draw bubble level
          const blx = x + 20, bly = y + 25, blw = 100, blh = 16;
          g.fillStyle(0x111111, 1);
          g.fillRect(blx, bly, blw, blh);
          g.lineStyle(1, 0xC8A84B, 0.4);
          g.strokeRect(blx, bly, blw, blh);
          // Center marker
          g.lineStyle(1, 0x3DFF6E, 0.5);
          g.lineBetween(blx + blw / 2, bly, blx + blw / 2, bly + blh);
          // Bubble (slightly off center)
          g.fillStyle(0x3DFF6E, 0.7);
          g.fillCircle(blx + blw / 2 + 8, bly + blh / 2, 5);

          this._pageText(blx + blw + 15, bly + 2, '← Canted 2° right', { size: 9, color: '#CC4444' });
          this._pageText(blx + blw + 15, bly + 14, '   Keep bubble centered!', { size: 8, color: '#78808A' });

          t('If the rifle is tilted (canted), your shot shifts sideways.', lh * 3.5);
          t('Use Q and E to level the bubble in the center line.', lh * 4.5);
          t('Even 3° of cant can shift your shot several MOA at range.', lh * 5.5);

          t('HOLD BREATH  (SHIFT key)', lh * 7.5, { color: '#C8A84B', bold: true, size: 11 });
          t('Your scope naturally sways from breathing. Hold SHIFT to', lh * 9);
          t('reduce sway by ~80%. Release when you need to readjust.', lh * 10);
          t('Best technique: breathe naturally, hold at bottom of exhale,', lh * 11);
          t('then fire during the steady moment.', lh * 12);

          t('WEATHER & ATMOSPHERE', lh * 14, { color: '#C8A84B', bold: true, size: 11 });
          t('Weather affects bullet flight:', lh * 15.2);

          // Weather effects table
          const tableY = y + lh * 16.5;
          const rows = [
            ['CONDITION', 'EFFECT'],
            ['Hot temperature', 'Thinner air → less drop needed'],
            ['Cold temperature', 'Denser air → more drop needed'],
            ['High altitude', 'Thinner air → less drop needed'],
            ['Fog / Rain', 'May reduce visibility'],
            ['Wind (storm)', 'Strong gusts, harder correction'],
          ];
          rows.forEach((row, i) => {
            const ry = tableY + i * 15;
            const isHeader = i === 0;
            if (isHeader) {
              g.fillStyle(0xC8A84B, 0.08);
              g.fillRect(x, ry - 2, 480, 15);
            }
            this._pageText(x + 5, ry, row[0], {
              size: 8, color: isHeader ? '#C8A84B' : '#D0D0D0', bold: isHeader,
            });
            this._pageText(x + 180, ry, row[1], {
              size: 8, color: isHeader ? '#C8A84B' : '#78808A', bold: isHeader,
            });
          });

          t('NIGHT MODE', lh * 23.5, { color: '#C8A84B', bold: true, size: 11 });
          t('Some missions occur at night. Targets appear as heat', lh * 25);
          t('signatures (thermal). Scope view is darker with more grain.', lh * 26);
        },
      },

      // ── PAGE 7: THE ARMORY ──
      {
        title: 'THE ARMORY',
        render: (g, x, y, W) => {
          const s = 10, lh = 16, col = '#D0D0D0';
          const t = (txt, dy, opts = {}) => this._pageText(x, y + dy, txt, { fontSize: `${opts.size || s}px`, color: opts.color || col, ...opts });

          t('Spend KV earned in campaigns to buy upgrades and weapons.', 0);

          t('UPGRADES', lh * 2, { color: '#C8A84B', bold: true, size: 11 });

          // Upgrade grid
          const upgrades = [
            { name: 'STABILIZED SCOPE', cost: 200, desc: 'Less scope sway drift' },
            { name: 'KESTREL MK2', cost: 350, desc: 'Wind uncertainty -60%' },
            { name: 'BALLISTIC TAPE', cost: 500, desc: 'Drop curve in scope view' },
            { name: 'COLD BORE KIT', cost: 800, desc: 'No random shot scatter' },
          ];
          const ugY = y + lh * 3.5;
          upgrades.forEach((u, i) => {
            const uy = ugY + i * 28;
            g.fillStyle(0x111111, 0.6);
            g.fillRect(x, uy, 480, 24);
            g.lineStyle(1, 0xC8A84B, 0.2);
            g.strokeRect(x, uy, 480, 24);

            this._pageText(x + 10, uy + 5, u.name, { size: 9, color: '#F4F4EF', bold: true });
            this._pageText(x + 200, uy + 5, u.desc, { size: 8, color: '#78808A' });
            this._pageText(x + 450, uy + 5, `${u.cost} KV`, { size: 9, color: '#C8A84B', bold: true });
          });

          t('WEAPONS', lh * 11, { color: '#C8A84B', bold: true, size: 11 });

          const weapons = [
            { name: '.308 WIN BOLT-ACTION', range: '800m', trait: 'Balanced. Default weapon.', cost: 'FREE' },
            { name: '12GA TACTICAL', range: '150m', trait: 'Close range. Heavy drop.', cost: '800 KV' },
            { name: '.50 CAL ANTI-MATERIEL', range: '1200m', trait: 'Long range. High recoil.', cost: '1500 KV' },
            { name: '6.5 CREEDMOOR DMR', range: '1000m', trait: 'Precision. Low recoil.', cost: '2000 KV' },
          ];
          const wpY = y + lh * 12.5;
          weapons.forEach((w, i) => {
            const wy = wpY + i * 28;
            g.fillStyle(0x111111, 0.6);
            g.fillRect(x, wy, 480, 24);
            g.lineStyle(1, 0x78808A, 0.15);
            g.strokeRect(x, wy, 480, 24);

            this._pageText(x + 10, wy + 5, w.name, { size: 9, color: '#F4F4EF', bold: true });
            this._pageText(x + 230, wy + 5, `${w.range}  ${w.trait}`, { size: 8, color: '#78808A' });
            this._pageText(x + 450, wy + 5, w.cost, { size: 9, color: '#C8A84B', bold: true });
          });

          t('Each weapon has unique DOPE tables, recoil intensity,', lh * 20.5);
          t('bullet drop coefficient, and wind sensitivity.', lh * 21.5);
          t('Choose your weapon based on the mission range.', lh * 22.5);

          t('TIP: The shotgun is devastating at close range but useless', lh * 24.5, { color: '#3DFF6E', size: 9 });
          t('past 150m. The .50 Cal reaches 1200m but kicks like a mule.', lh * 25.5, { color: '#3DFF6E', size: 9 });
        },
      },

      // ── PAGE 8: MISSION & DISMISS ──
      {
        title: 'MISSION BRIEFING',
        render: (g, x, y, W) => {
          const s = 10, lh = 16, col = '#D0D0D0';
          const t = (txt, dy, opts = {}) => this._pageText(x, y + dy, txt, { fontSize: `${opts.size || s}px`, color: opts.color || col, ...opts });

          t('Before each mission, you receive a briefing via typewriter.', 0);
          t('It contains critical intelligence:', lh);

          // Briefing elements
          const items = [
            { label: 'RANGE', desc: 'Distance to target in meters. Used with DOPE strip.' },
            { label: 'WIND', desc: 'Speed (m/s) and uncertainty (±). Direction on compass.' },
            { label: 'MODIFIERS', desc: 'Civilian present? Moving target? Night operation?' },
            { label: 'TIME LIMIT', desc: 'Some missions are timed — watch the countdown.' },
            { label: 'DIFFICULTY', desc: 'EASY → MODERATE → HARD → EXPERT → EXTREME.' },
          ];
          const itemY = y + lh * 2.5;
          items.forEach((item, i) => {
            const iy = itemY + i * 34;
            // Gold label
            this._pageText(x + 10, iy, item.label, {
              size: 10, color: '#C8A84B', bold: true,
            });
            // Description
            this._pageText(x + 10, iy + 14, item.desc, {
              size: 9, color: '#78808A',
            });
            // Separator
            g.lineStyle(1, 0x252525, 0.3);
            g.lineBetween(x, iy + 30, x + 480, iy + 30);
          });

          t('KEY REMINDERS', lh * 14, { color: '#C8A84B', bold: true, size: 11 });

          // Key summary grid
          const keyY = y + lh * 15.5;
          const keys = [
            ['W A S D', 'Move scope view'],
            ['↑ ↓', 'Adjust elevation (0.25 MOA per click)'],
            ['← →', 'Adjust windage (0.25 MOA per click)'],
            ['Q  E', 'Tilt rifle (cant / bubble level)'],
            ['SHIFT', 'Hold breath (reduce sway)'],
            ['SPACE', 'Fire weapon'],
          ];
          keys.forEach((k, i) => {
            const ky2 = keyY + i * 18;
            g.fillStyle(0x1a1a1a, 0.8);
            g.fillRect(x + 5, ky2 - 1, 80, 15);
            this._pageText(x + 45, ky2 + 1, k[0], {
              size: 9, color: '#F4F4EF', bold: true, origin: [0.5, 0],
            });
            this._pageText(x + 100, ky2 + 1, k[1], { size: 9, color: '#78808A' });
          });

          // Dismiss box
          const dby = y + lh * 23;
          g.fillStyle(0xC8A84B, 0.06);
          g.fillRoundedRect(x + 40, dby, W - 160, 50, 4);
          g.lineStyle(1, 0xC8A84B, 0.3);
          g.strokeRoundedRect(x + 40, dby, W - 160, 50, 4);

          this._pageText(x + (W - 80) / 2, dby + 12, 'DISMISSED, OPERATOR.', {
            size: 13, color: '#C8A84B', bold: true, origin: [0.5, 0],
          });
          this._pageText(x + (W - 80) / 2, dby + 30, 'Good hunting. Press → or ENTER to begin.', {
            size: 9, color: '#78808A', origin: [0.5, 0],
          });
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════════
  //  RENDER ENGINE
  // ═══════════════════════════════════════════════════
  _renderPage(idx) {
    // Destroy previous page objects
    this._pageObjects.forEach(obj => obj.destroy());
    this._pageObjects = [];

    const page = this._pages[idx];
    const W = this.scale.width;
    const H = this.scale.height;

    // Page title
    this._pageObjects.push(
      this.add.text(W / 2, 52, page.title, {
        fontFamily: 'JetBrains Mono', fontSize: '27px', fontStyle: 'bold',
        color: '#C8A84B', letterSpacing: 6,
      }).setOrigin(0.5).setDepth(5)
    );

    // Title underline
    const ug = this.add.graphics().setDepth(4);
    ug.lineStyle(1, 0xC8A84B, 0.3);
    ug.lineBetween(W / 2 - 120, 72, W / 2 + 120, 72);
    this._pageObjects.push(ug);

    // Content area
    const contentG = this.add.graphics().setDepth(4);
    this._pageObjects.push(contentG);

    const contentX = 60;
    const contentY = 90;

    page.render(contentG, contentX, contentY, W);

    // Update footer
    this._footerText.setText(`PAGE ${idx + 1} / ${this._pages.length}`);

    // Update arrow visibility
    this._leftArrow.setAlpha(idx > 0 ? 0.5 : 0.1);
    this._rightArrow.setAlpha(idx < this._pages.length - 1 ? 0.5 : 0.1);

    // If last page, change right arrow to checkmark
    if (idx === this._pages.length - 1) {
      this._rightArrow.setText('✓');
      this._rightArrow.setAlpha(0.7);
      this._rightArrow.setColor('#3DFF6E');
    } else {
      this._rightArrow.setText('▶');
      this._rightArrow.setColor('#C8A84B');
    }
  }

  _pageText(x, y, text, opts = {}) {
    const t = this.add.text(x, y, text, {
      fontFamily: opts.monospace ? 'JetBrains Mono' : 'Courier Prime',
      fontSize: opts.fontSize || opts.size + 'px' || '10px',
      fontStyle: opts.bold ? 'bold' : (opts.italic ? 'italic' : 'normal'),
      color: opts.color || '#D0D0D0',
      letterSpacing: opts.letterSpacing || 0,
      wordWrap: opts.wordWrap ? { width: opts.wordWrap } : undefined,
      lineSpacing: opts.lineSpacing || 0,
    }).setDepth(5);

    if (opts.origin) t.setOrigin(opts.origin[0], opts.origin[1]);
    this._pageObjects.push(t);
    return t;
  }

  _drawPaperTexture(W, H) {
    // Subtle dot stipple for paper texture
    this._paperBg.fillStyle(0x151515, 0.3);
    for (let i = 0; i < 200; i++) {
      const px = Phaser.Math.Between(30, W - 30);
      const py = Phaser.Math.Between(20, H - 30);
      this._paperBg.fillRect(px, py, 1, 1);
    }
    // Horizontal rule lines (notebook style)
    for (let ly = 90; ly < H - 40; ly += 60) {
      this._paperBg.lineStyle(1, 0x1a1a1a, 0.15);
      this._paperBg.lineBetween(50, ly, W - 50, ly);
    }
  }

  // ═══════════════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════════════
  _nextPage() {
    if (this._transitioning) return;
    if (this._currentPage < this._pages.length - 1) {
      this._currentPage++;
      this._renderPage(this._currentPage);
    } else {
      // Last page → dismiss
      this._dismiss();
    }
  }

  _prevPage() {
    if (this._transitioning) return;
    if (this._currentPage > 0) {
      this._currentPage--;
      this._renderPage(this._currentPage);
    }
  }

  _dismiss() {
    if (this._transitioning) return;
    this._transitioning = true;

    // Mark tutorial as completed
    GameState.settings.tutorialCompleted = true;
    GameState.save();

    this.cameras.main.fadeOut(400, 10, 10, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this._returnData) {
        this.scene.start(this._returnTo, this._returnData);
      } else {
        this.scene.start(this._returnTo);
      }
    });
  }
}
