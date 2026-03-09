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
