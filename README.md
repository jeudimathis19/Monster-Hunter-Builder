# [Monster-Hunter-Builder](https://jeudimathis19.github.io/Monster-Hunter-Builder/)

**Wilds Forge**: a build planner for Monster Hunter Wilds, in French and English, with light and dark themes.

## Features

- **Playstyle builds**: pick a weapon type, Low Rank or High Rank, your Hunter Rank and a playstyle
  (aggressive, defensive, technical, support, status, balanced, beginner), optionally a target monster.
  The generator assembles real gear available at that rank and returns an optimal, an alternative and a budget build.
- **Recommended builds** compiled from community guides (Game8, mhwildsbuild.com), split by rank.
- **Custom builder**: every weapon, armor piece, charm and decoration, with search, rank, HR and skill filters.
  Skills, set and group bonuses, stats, required Hunter Rank, total cost (full upgrade path) and materials update live.
- **Shopping list**: aggregated materials with drop rates, method (carve, broken part, wound...) and the locales
  of the monsters to hunt, or the maps where they can be gathered. Progress is saved per build.
- **Discover**: publish your builds, browse, filter, like and copy the community's.
- **Cosmetics**: outfit ideas and an outfit editor (appearance pieces, primary and secondary color per piece),
  publishable like builds.
- **Encyclopedia**: weapons, armor, sets, decorations, charms, skills, materials (with drop tables) and monsters.
- **3D render** of the hunter (WebGL, no library) shaped and colored by the armor families, plus a 2D view.
- Favorites, share links, JSON export/import and build comparison.

## Running

```bash
npm install
npm start          # http://localhost:3000
```

`npm run dev` restarts on changes and disables caching.

The site also works as a static site (GitHub Pages): everything except publishing to Discover, which needs the
Node server. The server enables it automatically.

## Data

Game data lives in `monster_hunter.db` (SQLite) and is exported to `data/*.json` for the front-end.

| Command | What it does |
| --- | --- |
| `npm run seed` | Rebuilds the game tables from the MHDB Wilds API (community builds are kept) |
| `npm run gathering` | Refreshes gathering locales and other sources from the community wiki |
| `npm run export` | Writes the FR/EN data bundles in `data/` |
| `npm run featured` | Resolves recommended builds and outfit ideas |
| `npm run data` | `seed` + `export` + `featured` |

Hunter Rank requirements are estimates based on gear rarity and the monsters to hunt.

Fan-made project, not affiliated with Capcom. Monster Hunter Wilds is a trademark of Capcom Co., Ltd.

Last updated: November 2026
