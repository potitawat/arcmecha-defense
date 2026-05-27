# ArcMecha-Defense

Portrait-first static tower defense prototype set in a grim steampunk magic apocalypse. A technomantic fortress holds back mechanized zombies, transforms into a combat mech to assault captured nests, and eventually faces the Zombie King.

## Included Gameplay

- Ten-stage campaign with locked progression, replayable defense missions, wave countdowns, and early-wave gold bonuses.
- Whole-screen portrait battlefield with fixed zombie routes and free tower placement on non-route grid cells.
- Mechanical towers upgraded with field gold to five stars.
- Magical towers with global stacking phenomena and unlimited automatic stars, including Golden Rite, Empowerment Glyph, Storm Invocation, and Frost Tempest.
- Permanent research, configurable fortress weapon slots, armor/plasma/critical systems, and three biosample-gated special-module slots reserved for later ability designs.
- Automatic boss assaults after defense victories: the fortress transformation sequence leads into a loadout-driven duel.
- Captured nests converted into Research Centers or Biosample Laboratories, with uncapped offline production stored through `localStorage`.
- Survival unlocked after the Stage 10 Zombie King assault, starting from Wave 1 each run and awarding Research Points based on survival time.
- PWA/offline cache suitable for GitHub Pages.

## Tune The Game

Gameplay parameters live in [`balance.js`](./balance.js). Change this file to tune:

- Tower damage, range, attack/effect interval, build price, upgrades and research unlock costs.
- Magical automatic-star interval (`starInterval`, initially 300 seconds per star).
- Enemy HP, speed, damage, armor, shields and rewards.
- Stage paths, wave counts, enemy lineups and random material drop tables.
- Fortress systems, weapon stats, bosses and offline production rates.

## Run Locally

From `/Users/potitawat/Documents/ArcMecha-Defense`:

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173/`.

## GitHub Pages

This repository is a static app. GitHub Actions publishes the repository root to GitHub Pages on every push to `main`.

```text
https://potitawat.github.io/arcmecha-defense/
```

## Artwork

The command-deck fortress hero and Zombie King confrontation artworks were generated specifically for this prototype in the grim steampunk magic direction and optimized as mobile JPEG assets in `assets/`.
