/* ═══════════════════════════════════════════════════
   COLD ZERO — main.js
   Phaser.Game configuration, scene registry,
   global error handling & debug utilities.
   ═══════════════════════════════════════════════════ */

/** @type {string} Game version — keep in sync with package.json */
const GAME_VERSION = '0.9.0';

/** @type {boolean} Debug mode — set via URL param ?debug=1 */
const DEBUG_MODE = new URLSearchParams(window.location.search).get('debug') === '1';

// ── Global error handler ──
window.addEventListener('error', (e) => {
  console.error('[COLD ZERO] Uncaught error:', e.message, e.filename, e.lineno);
  if (DEBUG_MODE) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1a0000;color:#ff4444;font:18px monospace;padding:8px;z-index:9999;max-height:25vh;overflow:auto';
    overlay.textContent = `${e.message} @ ${e.filename}:${e.lineno}`;
    document.body.appendChild(overlay);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[COLD ZERO] Unhandled promise rejection:', e.reason);
});

// ── Phaser config ──
const config = {
  type: Phaser.CANVAS,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#080808',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, FieldManualScene, ScopeScene, TracerScene, RunEndScene, UpgradeShopScene, SettingsScene],
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  audio: {
    disableWebAudio: false,
  },
  callbacks: {
    postBoot: (game) => {
      if (DEBUG_MODE) {
        console.log(`[COLD ZERO] v${GAME_VERSION} booted — ${game.scene.scenes.length} scenes`);
        // Expose game instance for console debugging
        window.__COLD_ZERO = { game, state: GameState, version: GAME_VERSION };
      }
    },
  },
};

const game = new Phaser.Game(config);

// ── Responsive resize — re-center on orientation or window change ──
window.addEventListener('resize', () => {
  if (game && game.scale) {
    game.scale.refresh();
  }
});

// ── Visibility change — pause/resume game when tab hidden ──
document.addEventListener('visibilitychange', () => {
  if (!game || !game.scene) return;
  if (document.hidden) {
    game.scene.scenes.forEach(s => { if (s.scene.isActive()) s.scene.pause(); });
  } else {
    game.scene.scenes.forEach(s => { if (s.scene.isPaused()) s.scene.resume(); });
  }
});

// ── FPS counter (debug only) ──
if (DEBUG_MODE) {
  const fpsEl = document.createElement('div');
  fpsEl.style.cssText = 'position:fixed;top:4px;right:4px;color:#0f0;font:16px monospace;z-index:9999;pointer-events:none;opacity:0.7';
  document.body.appendChild(fpsEl);
  setInterval(() => {
    if (game && game.loop) fpsEl.textContent = `FPS: ${Math.round(game.loop.actualFps)}`;
  }, 500);
}
