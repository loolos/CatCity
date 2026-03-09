# Cat City Technical Plan (Static Frontend MVP)

Version: 0.3  
Status: Pre-coding documentation  
Scope: Browser-only static MVP (no backend)

## 1. Confirmed Decisions

This technical plan incorporates the latest product decisions:

1. **Rendering starts with DOM + CSS Grid** (not Canvas for MVP).
2. **Deterministic Seed support is mandatory** for reproducible simulations.
3. **Simulation logic is turn-based** (discrete turns), while cat movement is presented with **smooth visual interpolation** between tiles.

These decisions are now baseline requirements for implementation.

---

## 2. Product Goal and MVP Boundary

Build a playable single-player web MVP of Cat City with:

- 7x7 grid map
- Build -> Simulation -> Result phases
- Four facility types:
  - Fish Bowl
  - Cat Bed
  - Laser Pointer (directional influence)
  - Cardboard Tunnel (paired teleport)
- Cat needs system:
  - Hunger
  - Sleepiness
- Loop bonus mechanic:
  - Eat -> Sleep or Sleep -> Eat inside a time/turn window

Out of scope for this phase:

- Backend services and APIs
- Multiplayer or leaderboard integration
- Account systems and persistence beyond local storage

---

## 3. Frontend Technology Stack

Recommended stack:

- **React + TypeScript + Vite**
- **DOM + CSS Grid** for board rendering
- **Zustand** for state management
- `requestAnimationFrame` for smooth interpolation and visual updates
- Static deployment target: Vercel / Netlify / GitHub Pages

Rationale:

- Fast iteration speed for MVP
- Strong type safety for simulation model
- Easy debugging versus an early Canvas renderer

---

## 4. Architecture Overview

```text
src/
  app/
    App.tsx
  game/
    model/
      types.ts
      constants.ts
      initialState.ts
    core/
      simulation.ts
      turnResolver.ts
      pathfinding.ts
      scoring.ts
      rng.ts
    state/
      gameStore.ts
      selectors.ts
    ui/
      GridBoard.tsx
      FacilityPalette.tsx
      TopHUD.tsx
      SpeedControl.tsx
      ResultPanel.tsx
      CatSprite.tsx
```

### Layer responsibilities

- **model/**: immutable domain models and tuning constants
- **core/**: pure simulation rules and deterministic turn resolution
- **state/**: game lifecycle and runtime orchestration
- **ui/**: rendering and interaction only

---

## 5. Deterministic Seed Design

Seed support requirements:

- Every match starts from a known integer/string seed.
- Cat spawn randomness and wandering choices must use seeded RNG only.
- Re-running the same layout + seed + parameters should produce the same simulation outcome.

Implementation notes:

- Introduce a dedicated RNG module (e.g., `mulberry32` or equivalent deterministic PRNG).
- Prohibit direct use of `Math.random()` in simulation logic.
- Store active seed in game state and include it in result summary.

Future benefit:

- Replayability
- Debug reproducibility
- Potential daily challenge compatibility

---

## 6. Turn-Based Simulation with Smooth Movement

## 6.1 Logic model

Simulation is resolved in **discrete turns**.

Each turn may include:

1. Need growth updates
2. Target selection / re-evaluation
3. Pathfinding decision
4. Exactly one tile movement attempt per cat (or wait/use facility)
5. Facility interaction resolution
6. Scoring and loop checks

This guarantees deterministic and testable outcomes.

## 6.2 Visual model

Even though logic is turn-based, visuals should be smooth:

- Cat logical position updates tile-by-tile per turn.
- UI interpolates sprite transform from previous tile center to next tile center.
- Interpolation uses `requestAnimationFrame` over a configurable turn animation duration.

Result:

- Player perceives fluid movement
- Core simulation remains simple and auditable

---

## 7. Core Data Model

Example structure (final types may evolve):

- `GameState`
  - `phase: 'build' | 'sim' | 'result'`
  - `seed: string`
  - `turnIndex: number`
  - `score: number`
  - `grid: Tile[][]`
  - `cats: Cat[]`
  - `stats: MatchStats`
- `Cat`
  - `id`
  - `tilePos`
  - `prevTilePos` (for interpolation)
  - `hunger`
  - `sleepiness`
  - `state`
  - `targetFacilityId?`
  - `path: Coord[]`
  - `lastSatisfiedNeed?`
  - `lastSatisfiedTurn?`
- `Facility`
  - `type`
  - `direction?` (laser)
  - `pairId?` (tunnel)
  - `occupiedUntilTurn?`

---

## 8. Pathfinding and Facility Rules

- Grid movement: 4-directional only
- Pathfinder: BFS for MVP
- Tunnel behavior:
  - Entry tile connects to paired exit context
  - Add anti-bounce cooldown/guard rule
- Laser behavior:
  - Influence routing preference, not strict forced movement

Busy facility behavior:

- Cat may wait for a short turn budget
- Cat may re-plan to alternative target

---

## 9. Scoring and Loop Bonus

Score sources:

- Need satisfaction base points
- Loop bonus when opposite need is satisfied within loop turn window
- Optional chain multiplier for repeated uninterrupted loops
- Efficiency bonus (optional for MVP if time allows)

Loop definition (turn-based):

- Need A satisfied at turn `t1`
- Need B (`B != A`) satisfied at turn `t2`
- If `t2 - t1 <= LOOP_WINDOW_TURNS`, trigger loop bonus

---

## 10. UI/UX Plan

## 10.1 Build Phase

- Place facilities from palette
- Set laser direction
- Place tunnel pairs
- Display remaining placement budget

## 10.2 Simulation Phase

- HUD: turn/time remaining, score, speed control
- Animated cat movement with interpolation
- Facility status feedback (idle/busy)

## 10.3 Result Phase

- Total score
- Loops completed
- Best chain
- Seed shown for replay/debug

---

## 11. Milestones (Documentation-first workflow)

1. Documentation finalized (this file + policy docs)
2. Project scaffold and type definitions
3. Build-phase interactions
4. Turn engine + seeded RNG
5. Visual interpolation layer
6. Scoring + result summary
7. Tuning and polish

No coding starts before milestone 1 is accepted.

---

## 12. Future Backend Extension (Reserved)

Keep adapter interfaces ready, but unimplemented:

- `startGame(layout, seed)`
- `submitResult(payload)`
- `getLeaderboard()`

Current MVP uses local in-memory state and optional local storage only.


---

## 13. Language Requirements for Implementation and UI

- All source code, comments, and project documentation must be written in English.
- All default in-game UI text must be in English, including:
  - menu labels
  - button text
  - build/simulation/result phase labels
  - HUD labels and status text
  - tooltips and instructional prompts
- Localization can be added later, but English remains the default baseline for MVP assets and copy.


---

## 14. Pre-Implementation Clarification Checklist

Before implementation starts, the team should explicitly lock the following details:

### 14.1 Simulation semantics

- Turn budget definition: total turns vs. time-derived turns
- Conflict resolution order when multiple cats target the same tile/facility
- Repath cadence: every turn vs. conditional repath
- Wait behavior limits and fallback reroute thresholds

### 14.2 Balance and tuning constants

- Need growth rates for hunger/sleepiness
- Need trigger thresholds and critical thresholds
- Facility service duration and queue limits
- Spawn schedule (turn intervals, total cat count range)
- Loop window size and chain multiplier curve

### 14.3 Build-phase constraints

- Placement limits per facility type
- Tunnel pairing UX details (cancel, reset, validation)
- Laser placement direction default and rotation UX
- Whether edge tiles have special placement rules

### 14.4 Result metrics definition

- Exact formula for efficiency score
- Which statistics appear in result panel (minimum/optional sets)
- Whether seed is copyable and replayable from result view

### 14.5 Determinism guarantees

- Define tie-breakers for equal-score target choices
- Ensure stable iteration order for cats/facilities each turn
- Confirm no hidden non-determinism from animation layer

### 14.6 Asset and visual pipeline

- Confirm visual asset pipeline in `ASSET_PIPELINE_PLAN.md`
- Approve sprite style, palette, and readability targets
- Confirm fallback behavior if an asset is missing

### 14.7 UI language and terminology

- Lock canonical English terms for every UI label and tooltip
- Keep terminology consistent with `ENGLISH_ONLY_POLICY.md`
