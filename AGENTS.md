# AGENTS.md — ShooterGame ("COLD ZERO")

**Läs `CONTEXT.md` först.** Den beskriver scenarkitekturen, ballistikmodellen,
vapnen och kända gotchas.

## Kontrakt

- Ändrar du struktur, mekanik, ballistik eller deploy: **uppdatera `CONTEXT.md`
  i samma commit** som ändringen.
- **Inget byggsteg** — spelet serveras statiskt från reporoten; `index.html`
  laddar `window`-globaler i ordning. Lägg du till en ny scen: registrera den i
  `src/main.js` (och ladda filen i index.html) och starta den från en scen.
- `src/ballistics.js` ska alltid vara ren och Node-exporterbar (testas av jest —
  `npm test`, 63 tester). **Efter ballistikändring: kör `npm test`.**
- Ändra inte `src/data/missions.json` utan att kolla `src/missions.js` — JSON:en
  duplicerar innehåll som redan ligger i JS:en (laddas inte av någon kod).
- Rör inte död kod (`FieldManualScene` — registrerad men aldrig startad).