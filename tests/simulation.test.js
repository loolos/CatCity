import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/rng.js';
import { Simulation } from '../src/simulation.js';

test('deterministic seed yields deterministic score', () => {
  const baseFacilities = [
    { id: 'f1', type: 'fish', pos: { x: 1, y: 1 } },
    { id: 'b1', type: 'bed', pos: { x: 4, y: 4 } },
    { id: 'l1', type: 'laser', pos: { x: 2, y: 1 }, direction: 'right' },
  ];

  const run = () => {
    const sim = new Simulation({ facilities: baseFacilities, tunnelPairs: [], rng: createRng('seed-a') });
    while (!sim.finished) sim.tick();
    return { score: sim.score, cats: sim.cats.length };
  };

  assert.deepEqual(run(), run());
});

test('simulation can use tunnel pairs (horizontal or vertical only)', () => {
  const sim = new Simulation({
    facilities: [{ id: 'f1', type: 'fish', pos: { x: 6, y: 3 } }],
    tunnelPairs: [[{ x: 0, y: 3 }, { x: 5, y: 3 }]],
    rng: createRng('seed-b'),
  });

  for (let i = 0; i < 20; i += 1) sim.tick();
  assert.equal(sim.turn, 20);
  assert.ok(sim.cats.length > 0);
});

test('spawn metadata exposes edge and off-board previous position', () => {
  const sim = new Simulation({ facilities: [], tunnelPairs: [], rng: createRng('seed-c') });
  sim.spawnCat();

  const cat = sim.cats[0];
  assert.ok(['top', 'right', 'bottom', 'left'].includes(cat.spawnEdge));
  assert.equal(sim.latestSpawnEdge, cat.spawnEdge);

  const isOutside =
    cat.prevPos.x < 0 ||
    cat.prevPos.y < 0 ||
    cat.prevPos.x > 6 ||
    cat.prevPos.y > 6;
  assert.equal(isOutside, true);
});


test('cats do not move into a tile occupied by another cat', () => {
  const sim = new Simulation({
    facilities: [{ id: 'f1', type: 'fish', pos: { x: 1, y: 0 } }],
    tunnelPairs: [],
    rng: () => 0,
  });

  sim.cats = [
    {
      id: 1,
      pos: { x: 0, y: 0 },
      prevPos: { x: 0, y: 0 },
      facing: 'right',
      spawnEdge: 'left',
      hunger: 100,
      sleepiness: 0,
      waitingTurns: 0,
      serving: null,
      inTunnel: null,
      lastSatisfiedNeed: null,
      lastSatisfiedTurn: -999,
    },
    {
      id: 2,
      pos: { x: 1, y: 0 },
      prevPos: { x: 1, y: 0 },
      facing: 'left',
      spawnEdge: 'top',
      hunger: 0,
      sleepiness: 0,
      waitingTurns: 0,
      serving: 'f1',
      inTunnel: null,
      lastSatisfiedNeed: null,
      lastSatisfiedTurn: -999,
    },
  ];

  const occupiedTiles = new Set(sim.cats.map((cat) => `${cat.pos.x},${cat.pos.y}`));
  occupiedTiles.delete('0,0');
  sim.moveCat(sim.cats[0], occupiedTiles);

  assert.deepEqual(sim.cats[0].pos, { x: 0, y: 0 });
});
