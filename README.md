# ⦿ COLD ZERO

> **One shot. No second chances.**

A precision sniper browser game with realistic ballistics simulation. Adjust your elevation, read the wind, and take the shot — you only get one.

🌐 **Play now:** [cold-zero-game.web.app](https://cold-zero-game.web.app)

---

## Gameplay

Each run consists of **5 missions** with escalating difficulty. You are given a target at a specific range, a wind reading, and a mission briefing. Your job is to dial in the correct elevation and windage before taking a single shot.

### Controls

| Key | Action |
|-----|--------|
| `↑` / `↓` | Adjust elevation |
| `←` / `→` | Adjust windage |
| `Q` / `E` | Level the rifle (cant correction) |
| `SPACE` | Take the shot |

### Difficulty Brackets

| Level | Range | Wind | Time Limit |
|-------|-------|------|------------|
| Easy | 200–300 m | up to 1.5 m/s | Unlimited |
| Moderate | 250–400 m | up to 3.0 m/s | 45 s |
| Hard | 350–550 m | up to 4.5 m/s | 35 s |
| Expert | 450–650 m | up to 6.0 m/s | 30 s |
| Extreme | 550–800 m | up to 8.0 m/s | 25 s |

### Weapons

| Weapon | Caliber | Max Range | Notes |
|--------|---------|-----------|-------|
| .308 WIN Bolt-Action | .308 Win | 800 m | Default. Balanced drop and wind. |
| .50 Cal Anti-Materiel | .50 BMG | 1200 m | Flat trajectory, more wind-sensitive. |
| 12GA Tactical | 12 GA | 150 m | Extreme drop, nearly wind-immune. |
| 6.5 Creedmoor DMR | 6.5 CM | 1000 m | Surgeon's choice — less drop and drift. |

Weapons are unlocked using **KV** (Kilo-Valor), earned by completing missions. Precision shots and harder conditions yield more KV.

### Weather & Conditions

Missions take place under dynamic weather conditions — clear, overcast, fog, rain, snow, dust storms, and high winds — each affecting visibility and wind strength.

---

## Features

- **Realistic ballistics** — elevation and windage calculated from actual DOPE tables per weapon and range
- **Wind uncertainty** — at higher difficulties, wind readings carry uncertainty; upgradeable with a Kestrel MK2
- **Moving targets** — Expert/Extreme missions may feature mobile targets
- **Civilian presence** — positive ID required on some missions; shooting a civilian fails the run
- **Night missions** — reduced visibility every 5th run
- **Meta-progression** — spend KV on weapon unlocks and equipment upgrades between runs
- **PWA support** — installable as a mobile app

---

## Tech Stack

- **[Phaser 3](https://phaser.io/)** — game framework (canvas rendering, scenes, input)
- **[Tone.js](https://tonejs.github.io/)** — audio synthesis for atmospheric sound
- **[Firebase Hosting](https://firebase.google.com/products/hosting)** — deployment
- Vanilla JavaScript, no build step required

---

## Development

### Prerequisites

- Node.js ≥ 18
- npm

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run serve
# Opens http://localhost:8080
```

### Run tests

```bash
npm test
```

### Run tests with coverage

```bash
npm run test:coverage
```

### Deploy to Firebase

```bash
npm run deploy
```

---

## Project Structure

```
├── index.html          # Entry point
├── manifest.json       # PWA manifest
├── firebase.json       # Firebase hosting config
├── src/
│   ├── main.js         # Phaser game bootstrap
│   ├── ballistics.js   # DOPE table lookups & shot calculation
│   ├── weapons.js      # Weapon profiles & DOPE tables
│   ├── missions.js     # Mission generator (5-mission runs)
│   ├── state.js        # Game state & meta-progression
│   └── scenes/         # Phaser scenes
│       ├── BootScene.js
│       ├── MenuScene.js
│       ├── FieldManualScene.js
│       ├── ScopeScene.js
│       ├── TracerScene.js
│       ├── RunEndScene.js
│       ├── UpgradeShopScene.js
│       └── SettingsScene.js
└── tests/
    └── ballistics.test.js
```

---

## License

MIT
