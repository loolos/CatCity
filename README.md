# Cat City MVP Prototype

This repository contains a static frontend MVP focused on deterministic turn-based simulation.

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
- Cats spawn from random map edges and move one tile per turn in simulation logic.
- The frontend animates each turn so movement is displayed smoothly between tiles.
- Laser placement supports direction selection.
- Tunnels must be placed as pairs.
- Use **Turn Demo Speed** slider to control turn playback speed at runtime.
- Click **Start Simulation** to run a full match.
- Click **Reset Build** to return to build phase.
