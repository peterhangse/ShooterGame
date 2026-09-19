# CONTEXT.md — ShooterGame ("COLD ZERO")

**"COLD ZERO"** — precisions-sniper-simulator i webbläsaren: ett skott per uppdrag,
full ballistik-simulering (DOPE-tabeller, atmosfär, spinn-drift). Phaser 3 + Tone.js,
**ingen build, ingen backend** — serveras statiskt från reporoten. Live:
https://cold-zero-game.web.app — UI-språk: engelska (operatörsfiktion, FM 23-10).

## Teknik (verifierat)

- Phaser 3.80 + Tone 15.0.4 laddas **från CDN** (`<script>`-taggar), ej npm-baserat.
- **Inget byggsteg**; index.html laddar `window`-globaler i ordning (lastcache
  `?v=5`). `npm`-dev: bara jest. Zero bild-/ljudfiler — allt är Phaser-Graphics +
  syntat ljud (Tone.js). Google Fonts.
- `firebase.json`: public `.` (hela repot), säkerhetsheaders, SPA-rewrite.
  `.firebaserc` = projekt `cold-zero-game`.

## Struktur

| Sökväg | Roll |
|---|---|
| `src/main.js` | Entry: Phaser 1280×720 (FIT), 8 scener, felhanterare, FPS/debug via `?debug=1` |
| `src/ballistics.js` | **Hjärtat**: ren ballistiklösare (DOPE-interpolation, atmosfärisk densitet, spinn-drift, energikadens, `calculateShot()`/`checkHit()`). CommonJS-export → kan testas i Node |
| `src/state.js` | `GameState`-singleton: meta-progression, KV-valuta, uppgraderingar, save `coldZero_state` (format v4, migreringar, export/import) |
| `src/weapons.js` | 4 vapen med egna DOPE-tabeller (.308, .50 BMG, 12GA slug, 6.5 Creedmoor) |
| `src/missions.js` | `MissionGenerator`: procerudella 5-uppdragskampanjer, väder/lokaler/briefings, KV |
| `src/data/missions.json` | **Duplicerar** innehåll som redan ligger i missions.js — laddas inte av någon kod (driftrisk) |
| `src/scenes/` | 8 scener: Boot, Menu, **ScopeScene (1814 r, kärnan)**, TracerScene (kulflyg-slow-mo), RunEnd, UpgradeShop (ARMORY), Settings, + **FieldManualScene = aldrig startad (död)** |
| `tests/ballistics.test.js` | 63 jest-tester — enda testsviten, bara ballistik |

## Mekanik

- Ett skott per uppdrag på 100–800 m (upp till 1200 m med .50 BMG), tvärvind,
  atmosfär, tidsgräns, rörligt mål och/eller civilpersoner. Miss = uppdraget
  misslyckas; **2 raka missar avslutar körningen i förtid** ("walk away").
- Kontroller: WASD panorama, ↑↓ elevation (0–40 MOA), ←→ vindinställning,
  Q/E kantning, SHIFT håll-andan, SPACE avfyra.
- Ballistik: `interpolateDOPE()` (linjär mellan tabellposter), atmosfärskorrigering
  (höjd/temp/fukt), `spinDriftMOA` (≈ kvadrisk), energikadens exp. Omslag till
  pixel-miss: `MOA_TO_PX_PER_100M = 6 px/MOA/100 m`.
- **KV ("Kronor")** per träff (bas 80 + avstånd × svårighet + precision ±30% +
  natt/moving) → köps i ARMORY (4 permanenta uppgraderingar, 4 vapen).
- 5-uppdragskörningar med svårighetsklasser per uppdragsindex; väder typ 7;
  natt-mission var 5:e körning; kampanjer graderas S–F; 10 achievements.
- Tutorial (första kampanjuppdraget) **hårdkodar .308 DOPE** oavsett valt vapen
  (medvetet, undviker 55 MOA-bugg med hagelbössa).

## Gotchas

- **FieldManualScene registrerad men aldrig startad** — ingen menyknapp når den.
- Elevation-dialen toppar på 40 MOA men .50 BMG kräver upp till 47 MOA på 1200 m
  (delvis kompenserat av dess flatare dropKoeff 0.6 → ~28 MOA; latent gräns).
- Bara ballistik är testad — scener, state, vapen och missions har inga tester.
- `missions.js` använder `Phaser.Math` vid runtime → kraschar i Node (bara
  ballistics är require-bar).
- Versionen finns dubblerad (package.json / `main.js` GAME_VERSION / index.html).
- Inga `assets/` — trots att äldre beskrivningar och firebase.json ignorerar en
  sådan mapp. Allt är procedurellt.
- Achievement "ironWill" bygger förenklat på `perfectRuns`, inte verkliga walk-aways.

## Köra / deploya

- `npm test` (63 tester) · `npm run serve` (http-server :8080) ·
  `python3 -m http.server 8000` (via .fabrik) · `?debug=1` för FPS/error-overlay.
- `npm run deploy` = `firebase deploy --only hosting` → cold-zero-game.web.app.
- .fabrik-rad: `git add -A && git commit -m 'uppdatering' && git push origin main && firebase deploy`.