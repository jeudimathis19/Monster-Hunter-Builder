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

## Using the site

Everything runs in the browser at https://jeudimathis19.github.io/Monster-Hunter-Builder/ : nothing to install
or launch. Community publishing (Discover and Cosmetics) uses an online Supabase database
(see [supabase/README.md](supabase/README.md)).

## Data updates

Game data lives in `monster_hunter.db` (SQLite) and is exported to `data/*.json` for the site.
A GitHub Action ([update-data.yml](.github/workflows/update-data.yml)) rebuilds it every Monday from the
MHDB Wilds API and the community wiki, and commits it when something changed. It can also be started by hand
from the repository's **Actions** tab (Update game data > Run workflow).

For development only: `npm install` then `npm run dev` serves the site locally; `npm run data` rebuilds the data.

Hunter Rank requirements are estimates based on gear rarity and the monsters to hunt.

Fan-made project, not affiliated with Capcom. Monster Hunter Wilds is a trademark of Capcom Co., Ltd.

Last updated: November 2026
