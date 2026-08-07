/* ═══════════════════════════════════════════════════
   COLD ZERO — UpgradeShopScene
   Between-run meta-progression shop.
   Spend KV on permanent upgrades and weapons.
   Now with 4 weapons, descriptions, hover tooltips.
   ═══════════════════════════════════════════════════ */

class UpgradeShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeShopScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#080808');
    this.cameras.main.fadeIn(300, 8, 8, 8);

    // ── Header ──
    this.add.text(W / 2, 50, 'ARMORY', {
      fontFamily: 'JetBrains Mono', fontSize: '42px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 10,
    }).setOrigin(0.5);

    this.add.text(W / 2, 82, 'Upgrade your kit', {
      fontFamily: 'Courier Prime', fontSize: '18px', fontStyle: 'italic',
      color: '#78808A', letterSpacing: 2,
    }).setOrigin(0.5);

    // ── KV Balance ──
    this._kvText = this.add.text(W - 40, 50, `${GameState.metaProgression.totalKV} KV`, {
      fontFamily: 'JetBrains Mono', fontSize: '24px', fontStyle: 'bold',
      color: '#C8A84B',
    }).setOrigin(1, 0.5);

    this.add.text(W - 40, 70, 'AVAILABLE', {
      fontFamily: 'JetBrains Mono', fontSize: '10px',
      color: '#78808A', letterSpacing: 3,
    }).setOrigin(1, 0);

    // ── Upgrade Cards ──
    const upgrades = [
      {
        key: 'betterScope',
        name: 'STABILIZED SCOPE',
        desc: 'Reduces scope sway. Inertia coefficient\n0.08 → 0.14 (less drift).',
        cost: 200,
        icon: '◎',
      },
      {
        key: 'windMeterMk2',
        name: 'KESTREL MK2',
        desc: 'More accurate wind readings.\nUncertainty reduced by 60%.',
        cost: 350,
        icon: '≋',
      },
      {
        key: 'ballisticTape',
        name: 'BALLISTIC TAPE',
        desc: 'Drop curve overlay shown in scope.\nVisual aid for elevation.',
        cost: 500,
        icon: '▦',
      },
      {
        key: 'coldBoreKit',
        name: 'COLD BORE KIT',
        desc: 'Eliminates random shot scatter.\nPure skill-based shooting.',
        cost: 800,
        icon: '✧',
      },
    ];

    const cardW = 260;
    const cardH = 120;
    const gap = 20;
    const startX = (W - (cardW * 2 + gap)) / 2;
    const startY = 130;

    upgrades.forEach((upg, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = startX + col * (cardW + gap);
      const cy = startY + row * (cardH + gap);

      this._drawUpgradeCard(cx, cy, cardW, cardH, upg);
    });

    // ── Weapons section ──
    this.add.text(W / 2, startY + 2 * (cardH + gap) + 20, 'WEAPONS', {
      fontFamily: 'JetBrains Mono', fontSize: '18px', fontStyle: 'bold',
      color: '#78808A', letterSpacing: 6,
    }).setOrigin(0.5);

    const weapons = [
      { key: 'bolt308', data: WEAPONS.bolt308 },
      { key: 'antiMat50', data: WEAPONS.antiMat50 },
      { key: 'shotgun', data: WEAPONS.shotgun },
    ];

    // Add dmr65 if it exists
    if (WEAPONS.dmr65) {
      weapons.push({ key: 'dmr65', data: WEAPONS.dmr65 });
    }

    const weaponY = startY + 2 * (cardH + gap) + 50;
    const weaponW = (W - 80) / weapons.length;

    weapons.forEach((w, i) => {
      const wx = 40 + i * weaponW;
      this._drawWeaponCard(wx, weaponY, weaponW - 10, 150, w);
    });

    // ── Continue button ──
    const continueBtn = this.add.text(W / 2, H - 50, '[ CONTINUE TO MISSION ]', {
      fontFamily: 'JetBrains Mono', fontSize: '19px', fontStyle: 'bold',
      color: '#C8A84B', letterSpacing: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    continueBtn.on('pointerover', () => continueBtn.setColor('#F4F4EF'));
    continueBtn.on('pointerout', () => continueBtn.setColor('#C8A84B'));
    continueBtn.on('pointerdown', () => {
      if (this._transitioning) return;
      this._transitioning = true;
      GameState.save();
      this.cameras.main.fadeOut(300, 8, 8, 8);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });

    // Keyboard shortcut
    this.input.keyboard.once('keydown-ENTER', () => {
      if (this._transitioning) return;
      this._transitioning = true;
      GameState.save();
      this.cameras.main.fadeOut(300, 8, 8, 8);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });
  }

  _drawUpgradeCard(x, y, w, h, upg) {
    const owned = GameState.metaProgression.upgrades[upg.key];
    const canAfford = GameState.metaProgression.totalKV >= upg.cost;

    const g = this.add.graphics();

    // Card background
    g.fillStyle(owned ? 0x0A150A : 0x111111, 1);
    g.fillRect(x, y, w, h);

    // Border
    g.lineStyle(1, owned ? 0x3DFF6E : (canAfford ? 0xC8A84B : 0x252525), owned ? 0.6 : 0.4);
    g.strokeRect(x, y, w, h);

    // Pixel-art upgrade icon
    this._drawUpgradePixelArt(g, x + 10, y + 16, upg.key, owned, canAfford);

    // Name
    this.add.text(x + 50, y + 14, upg.name, {
      fontFamily: 'JetBrains Mono', fontSize: '16px', fontStyle: 'bold',
      color: owned ? '#3DFF6E' : '#F4F4EF', letterSpacing: 1,
    });

    // Description
    this.add.text(x + 50, y + 34, upg.desc, {
      fontFamily: 'Courier Prime', fontSize: '15px',
      color: '#78808A', lineSpacing: 3,
    });

    // Cost / Status
    if (owned) {
      this.add.text(x + w - 15, y + 14, 'OWNED', {
        fontFamily: 'JetBrains Mono', fontSize: '12px', fontStyle: 'bold',
        color: '#3DFF6E', letterSpacing: 2,
      }).setOrigin(1, 0);
    } else {
      const costText = this.add.text(x + w - 15, y + 14, `${upg.cost} KV`, {
        fontFamily: 'JetBrains Mono', fontSize: '16px', fontStyle: 'bold',
        color: canAfford ? '#C8A84B' : '#404040',
      }).setOrigin(1, 0);

      if (canAfford) {
        // Buy button
        const buyBtn = this.add.text(x + w - 15, y + h - 18, '[ BUY ]', {
          fontFamily: 'JetBrains Mono', fontSize: '15px', fontStyle: 'bold',
          color: '#C8A84B', letterSpacing: 2,
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

        buyBtn.on('pointerover', () => buyBtn.setColor('#F4F4EF'));
        buyBtn.on('pointerout', () => buyBtn.setColor('#C8A84B'));
        buyBtn.on('pointerdown', () => {
          GameState.metaProgression.totalKV -= upg.cost;
          GameState.metaProgression.upgrades[upg.key] = true;
          GameState.save();
          // Refresh scene
          this.scene.restart();
        });
      }
    }
  }

  _drawWeaponCard(x, y, w, h, weaponInfo) {
    const wd = weaponInfo.data;
    const key = weaponInfo.key;
    const unlocked = GameState.metaProgression.unlockedWeapons.includes(key);
    const active = GameState.metaProgression.activeWeapon === key;
    const canAfford = GameState.metaProgression.totalKV >= wd.unlockCost;

    const g = this.add.graphics();

    g.fillStyle(active ? 0x0A150A : 0x111111, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, active ? 0x3DFF6E : (unlocked ? 0xC8A84B : 0x252525), 0.5);
    g.strokeRect(x, y, w, h);

    // Pixel-art weapon silhouette
    this._drawWeaponPixelArt(g, x + w / 2, y + 8, key, active, unlocked);

    // Weapon name
    this.add.text(x + 12, y + 50, wd.shortName, {
      fontFamily: 'JetBrains Mono', fontSize: '21px', fontStyle: 'bold',
      color: active ? '#3DFF6E' : '#F4F4EF',
    });

    // Stats
    const statsLines = [
      `Drop: ×${wd.dropKoeff}  Wind: ×${wd.windMultiplier}`,
      `Range: ${wd.maxRange}m${wd.muzzleVelocity ? '  MV: ' + wd.muzzleVelocity + ' m/s' : ''}`,
    ];
    if (wd.recoilIntensity != null) {
      statsLines.push(`Recoil: ${'|▌'.repeat(Math.round(wd.recoilIntensity * 5))}${'  '.repeat(5 - Math.round(wd.recoilIntensity * 5))}`);
    }

    statsLines.forEach((line, li) => {
      this.add.text(x + 12, y + 72 + li * 14, line, {
        fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#78808A',
      });
    });

    // Description tooltip on hover
    if (wd.description) {
      const hoverZone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive();
      let tooltip = null;

      hoverZone.on('pointerover', () => {
        const desc = wd.description.replace(/\n/g, ' ');
        tooltip = this.add.text(x + w / 2, y - 10, desc, {
          fontFamily: 'Courier Prime', fontSize: '13px', color: '#C8A84B',
          backgroundColor: '#1a1a1a', padding: { x: 6, y: 4 },
          wordWrap: { width: 280 },
        }).setOrigin(0.5, 1).setDepth(200);
      });

      hoverZone.on('pointerout', () => {
        if (tooltip) { tooltip.destroy(); tooltip = null; }
      });
    }

    if (active) {
      this.add.text(x + w - 12, y + 50, 'ACTIVE', {
        fontFamily: 'JetBrains Mono', fontSize: '12px', fontStyle: 'bold', color: '#3DFF6E',
        letterSpacing: 2,
      }).setOrigin(1, 0);
    } else if (unlocked) {
      const selectBtn = this.add.text(x + w / 2, y + h - 15, '[ SELECT ]', {
        fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#C8A84B', letterSpacing: 2,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      selectBtn.on('pointerover', () => selectBtn.setColor('#F4F4EF'));
      selectBtn.on('pointerout', () => selectBtn.setColor('#C8A84B'));
      selectBtn.on('pointerdown', () => {
        GameState.metaProgression.activeWeapon = key;
        GameState.save();
        this.scene.restart();
      });
    } else if (wd.unlockCost > 0) {
      const color = canAfford ? '#C8A84B' : '#404040';
      const unlockBtn = this.add.text(x + w / 2, y + h - 15, `[ ${wd.unlockCost} KV ]`, {
        fontFamily: 'JetBrains Mono', fontSize: '13px', color, letterSpacing: 1,
      }).setOrigin(0.5).setInteractive({ useHandCursor: canAfford });

      if (canAfford) {
        unlockBtn.on('pointerover', () => unlockBtn.setColor('#F4F4EF'));
        unlockBtn.on('pointerout', () => unlockBtn.setColor('#C8A84B'));
        unlockBtn.on('pointerdown', () => {
          GameState.metaProgression.totalKV -= wd.unlockCost;
          GameState.metaProgression.unlockedWeapons.push(key);
          GameState.save();
          this.scene.restart();
        });
      }
    }
  }

  /* ── Procedural pixel-art: weapon silhouettes ─── */
  _drawWeaponPixelArt(g, centerX, topY, key, active, unlocked) {
    const P = 4;
    const arts = {
      bolt308: [
        '          SS',
        '    BBBBBBBBBBBB',
        'WWWWWBBBBBBBBBBBBB',
        '    BBM T',
        '         T',
      ],
      antiMat50: [
        '            SSS',
        '     BBBBBBBBBBBBBBBB',
        'WWWWWWBBBBBBBBBBBBBBBBDD',
        '      BBM T',
        '     LL  T',
        '     L L',
      ],
      shotgun: [
        '    BBBBBBBBB',
        'WWWWWBBBBBBBBB',
        '    BBB MT',
        '         T',
      ],
      dmr65: [
        '            SS',
        '     BBBBBBBBBBBBB',
        'PPPPPBBBBBBBBBBBBBB',
        '     BBM  T',
        '          T',
      ],
    };
    const colorMap = {
      B: 0x5a5a5a,  // body / barrel
      W: 0x8B6914,  // wood stock
      P: 0x333333,  // polymer stock
      S: 0x1a1a1a,  // scope
      T: 0x444444,  // trigger guard
      D: 0x777777,  // muzzle device
      L: 0x3a3a3a,  // bipod
      M: 0x4a4a4a,  // magazine well
    };
    const art = arts[key];
    if (!art) return;
    const artW = Math.max(...art.map(r => r.length));
    const ox = centerX - (artW * P) / 2;
    art.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const ch = row[rx];
        if (ch === ' ') continue;
        const base = colorMap[ch];
        if (base == null) continue;
        let c = base;
        if (active) {
          const r = ((c >> 16) & 0xFF) * 0.5;
          const gr = Math.min(255, ((c >> 8) & 0xFF) + 80);
          const b = (c & 0xFF) * 0.5;
          c = (Math.round(r) << 16) | (Math.round(gr) << 8) | Math.round(b);
        } else if (!unlocked) {
          const r = (c >> 16) & 0xFF;
          const gr = (c >> 8) & 0xFF;
          const b = c & 0xFF;
          const lum = Math.round((r + gr + b) / 3 * 0.3);
          c = (lum << 16) | (lum << 8) | lum;
        }
        g.fillStyle(c, 1);
        g.fillRect(ox + rx * P, topY + ry * P, P, P);
      }
    });
  }

  /* ── Procedural pixel-art: upgrade icons ─── */
  _drawUpgradePixelArt(g, x, y, key, owned, canAfford) {
    const P = 3;
    const arts = {
      betterScope: {
        art: [
          '  FFFF  ',
          ' FLLLLF ',
          'FLLLLLLF',
          'FLLLRLLF',
          'FLLLLLLF',
          ' FLLLLF ',
          '  FFFF  ',
        ],
        colors: { F: 0x555555, L: 0x2266AA, R: 0xFF4444 },
      },
      windMeterMk2: {
        art: [
          ' CCCCC ',
          ' CGGGC ',
          ' CGGGC ',
          ' CGGGC ',
          ' CCCCC ',
          '  CCC  ',
          '  CBC  ',
          '  CCC  ',
          '   C   ',
        ],
        colors: { C: 0x555555, G: 0x2a8a5a, B: 0xAA4444 },
      },
      ballisticTape: {
        art: [
          'GGGGGGGGG',
          'GxGGxGGxG',
          'GGGGGGGGG',
          'GGGGGGGGG',
          'GxGGxGGxG',
          'GGGGGGGGG',
        ],
        colors: { G: 0xB8984B, x: 0x786428 },
      },
      coldBoreKit: {
        art: [
          '  HHHH  ',
          '  HHHH  ',
          '   RR   ',
          '   RR   ',
          '   RR   ',
          '   RR   ',
          '   RR   ',
          '   RR   ',
          '   RR   ',
        ],
        colors: { H: 0xAA8844, R: 0x888888 },
      },
    };
    const def = arts[key];
    if (!def) return;
    def.art.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const ch = row[rx];
        if (ch === ' ') continue;
        const base = def.colors[ch];
        if (base == null) continue;
        let c = base;
        if (owned) {
          const r = ((c >> 16) & 0xFF) * 0.4;
          const gr = Math.min(255, ((c >> 8) & 0xFF) + 100);
          const b = (c & 0xFF) * 0.4;
          c = (Math.round(r) << 16) | (Math.round(gr) << 8) | Math.round(b);
        } else if (!canAfford) {
          const r = (c >> 16) & 0xFF;
          const gr = (c >> 8) & 0xFF;
          const b = c & 0xFF;
          const lum = Math.round((r + gr + b) / 3 * 0.3);
          c = (lum << 16) | (lum << 8) | lum;
        }
        g.fillStyle(c, 1);
        g.fillRect(x + rx * P, y + ry * P, P, P);
      }
    });
  }
}
