# Cat City MVP Prototype

This repository contains a static frontend MVP focused on deterministic turn-based simulation.

- Try at here: https://loolos.github.io/CatCity/
## Implemented MVP Highlights

- 7x7 grid build phase.
- Four facility types: Fish Bowl, Cat Bed, Laser Pointer, Cardboard Tunnel.
- Seeded deterministic simulation.
- Turn-based cat behavior with hunger and sleepiness.
- Need satisfaction scoring and loop bonus.
- Basic CSS Grid rendering with simple sprite assets.

## Run Locally

```bash
npm test
npm run start
```

Then open `http://localhost:4173`.

## Controls

- Select a build tool and click tiles to place facilities.
- Each match picks one fixed map entry tile and one fixed exit tile for cats.
- Total spawned cats per match is fixed (up to the configured cap), and any cat that reaches the fixed exit tile disappears immediately.
- The IN tile is spawn-only: cats already on the board cannot move onto it.
- Poor exits (high hunger/sleepiness or low happiness) apply a score penalty, shown in a dedicated Cat Flow Info panel.
- The frontend animates each turn so movement is displayed smoothly between tiles.
- Laser placement supports direction selection.
- Tunnels must be placed as pairs.
- Use **Turn Demo Speed** slider to control turn playback speed at runtime.
- Click **Start Simulation** to run a full match.
- Click **Reset Build** to return to build phase.


## Project Structure

- `src/game-controller.js`: App orchestration (build phase, simulation lifecycle, interval loop).
- `src/ui.js`: DOM querying and rendering helpers (board, cats, HUD, speed label).
- `src/app-state.js`: Initial app state and tool definitions.
- `src/simulation.js`: Turn-based simulation core and deterministic game rules.
