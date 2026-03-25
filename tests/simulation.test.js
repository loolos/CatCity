import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/rng.js';
import { GRID_SIZE, POINTS } from '../src/config.js';
import { shortestPath } from '../src/pathfinding.js';
import { planEntryExit, planMapLayout, Simulation } from '../src/simulation.js';

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


test('planEntryExit is deterministic for a given seed and produces opposite edges', () => {
  const makePlan = () => planEntryExit(createRng('seed-plan-preview'));
  const first = makePlan();
  const second = makePlan();

  assert.deepEqual(first, second);
  assert.ok(['top', 'right', 'bottom', 'left'].includes(first.spawnPoint.edge));
  assert.ok(['top', 'right', 'bottom', 'left'].includes(first.exitPoint.edge));

  const opposite = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right',
  };
  assert.equal(first.exitPoint.edge, opposite[first.spawnPoint.edge]);
});

test('entry and exit fixed coordinates keep a minimum gap on opposite edges', () => {
  for (let i = 0; i < 20; i += 1) {
    const plan = planEntryExit(createRng(`seed-gap-${i}`));
    const gap = Math.abs(plan.spawnPoint.pos.x - plan.exitPoint.pos.x) + Math.abs(plan.spawnPoint.pos.y - plan.exitPoint.pos.y);
    assert.ok(gap >= Math.floor(GRID_SIZE / 2));
  }
});

test('planned obstacles and bushes never occupy entry/exit and keep a walkable path', () => {
  for (let i = 0; i < 30; i += 1) {
    const plan = planMapLayout(createRng(`seed-obstacles-${i}`));
    const obstacleSet = new Set(plan.obstacles.map((o) => `${o.x},${o.y}`));
    const bushSet = new Set((plan.bushes ?? []).map((b) => `${b.x},${b.y}`));

    assert.equal(obstacleSet.has(`${plan.spawnPoint.pos.x},${plan.spawnPoint.pos.y}`), false);
    assert.equal(obstacleSet.has(`${plan.exitPoint.pos.x},${plan.exitPoint.pos.y}`), false);
    assert.equal(bushSet.has(`${plan.spawnPoint.pos.x},${plan.spawnPoint.pos.y}`), false);
    assert.equal(bushSet.has(`${plan.exitPoint.pos.x},${plan.exitPoint.pos.y}`), false);

    const path = shortestPath(
      plan.spawnPoint.pos,
      plan.exitPoint.pos,
      GRID_SIZE,
      (_from, to) => !obstacleSet.has(`${to.x},${to.y}`) && !bushSet.has(`${to.x},${to.y}`)
    );
    assert.ok(path?.length);
  }
});


test('single-tile horizontal tunnel only allows moving left to right', () => {
  const sim = new Simulation({
    facilities: [{ id: 't1', type: 'tunnel', pos: { x: 2, y: 2 }, orientation: 'horizontal' }],
    rng: createRng('seed-b'),
  });

  assert.equal(sim.canMoveBetween({ x: 1, y: 2 }, { x: 2, y: 2 }), true);
  assert.equal(sim.canMoveBetween({ x: 2, y: 2 }, { x: 3, y: 2 }), true);
  assert.equal(sim.canMoveBetween({ x: 3, y: 2 }, { x: 2, y: 2 }), false);
  assert.equal(sim.canMoveBetween({ x: 2, y: 1 }, { x: 2, y: 2 }), false);
  assert.equal(sim.canMoveBetween({ x: 2, y: 2 }, { x: 2, y: 3 }), false);
});

test('bushes are fixed blockers and cats cannot move through them', () => {
  const sim = new Simulation({
    facilities: [],
    obstacles: [],
    bushes: [{ x: 1, y: 1 }],
    rng: createRng('seed-bush-block'),
  });
  assert.equal(sim.canMoveBetween({ x: 1, y: 0 }, { x: 1, y: 1 }), false);
  assert.equal(sim.canMoveBetween({ x: 0, y: 1 }, { x: 1, y: 1 }), false);
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
    cat.prevPos.x >= GRID_SIZE ||
    cat.prevPos.y >= GRID_SIZE;
  assert.equal(isOutside, true);
});

test('spawn and exit points are fixed within one simulation', () => {
  const sim = new Simulation({ facilities: [], tunnelPairs: [], rng: createRng('seed-fixed-points') });
  const firstSpawn = { ...sim.spawnPoint.pos };
  const firstExit = { ...sim.exitPoint.pos };

  sim.spawnCat();
  sim.spawnCat();
  sim.spawnCat();

  assert.deepEqual(sim.cats.map((cat) => cat.pos), [firstSpawn, firstSpawn, firstSpawn]);
  assert.deepEqual(sim.spawnPoint.pos, firstSpawn);
  assert.deepEqual(sim.exitPoint.pos, firstExit);
});

test('cat returning to spawn tile blocks future spawns', () => {
  const sim = new Simulation({ facilities: [], tunnelPairs: [], rng: () => 0 });
  sim.spawnPoint = { pos: { x: 0, y: 0 }, prevPos: { x: -1, y: 0 }, edge: 'left' };

  const cat = {
    id: 1,
    pos: { x: 0, y: 1 },
    prevPos: { x: 0, y: 1 },
    facing: 'left',
    spawnEdge: 'left',
    hunger: 0,
    sleepiness: 0,
    waitingTurns: 0,
    serving: null,
    inTunnel: null,
    lastSatisfiedNeed: null,
    lastSatisfiedTurn: -999,
    satisfiedCount: 0,
    exiting: false,
    hasLeftSpawn: true,
  };
  sim.cats = [cat];

  sim.moveCat(cat, new Set());

  assert.deepEqual(cat.pos, { x: 0, y: 0 });
  assert.equal(sim.spawnBlocked, true);

  sim.spawnedCats = 0;
  sim.spawnCat();
  assert.equal(sim.cats.length, 1);
});

test('any cat disappears when reaching exit and poor condition applies penalty', () => {
  const sim = new Simulation({ facilities: [], tunnelPairs: [], rng: () => 0 });
  sim.spawnPoint = { pos: { x: 0, y: 0 }, prevPos: { x: -1, y: 0 }, edge: 'left' };
  sim.exitPoint = { pos: { x: 2, y: 0 }, prevPos: { x: 3, y: 0 }, edge: 'right' };

  sim.spawnedCats = 10;
  sim.cats = [
    {
      id: 1,
      pos: { x: 1, y: 0 },
      prevPos: { x: 1, y: 0 },
      facing: 'right',
      spawnEdge: 'left',
      hunger: 95,
      sleepiness: 95,
      waitingTurns: 0,
      serving: null,
      inTunnel: null,
      lastSatisfiedNeed: null,
      lastSatisfiedTurn: -999,
      satisfiedCount: 0,
      exiting: false,
    },
  ];

  sim.tick();

  assert.equal(sim.cats.length, 0);
  assert.equal(sim.score, -POINTS.badExitPenalty);
  assert.equal(sim.exitStats.exitedCats, 1);
  assert.equal(sim.exitStats.poorExitCats, 1);
});

test('cats do not move into a tile occupied by another cat', () => {
  const sim = new Simulation({
    facilities: [{ id: 'f1', type: 'fish', pos: { x: 1, y: 0 } }],
    tunnelPairs: [],
    rng: () => 0,
  });

  sim.spawnedCats = 10;
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
      satisfiedCount: 0,
      exiting: false,
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
      satisfiedCount: 0,
      exiting: false,
    },
  ];

  const occupiedTiles = new Set(sim.cats.map((cat) => `${cat.pos.x},${cat.pos.y}`));
  occupiedTiles.delete('0,0');
  sim.moveCat(sim.cats[0], occupiedTiles);

  assert.deepEqual(sim.cats[0].pos, { x: 0, y: 0 });
});

test('curious cat can trigger sunbath detour when no urgent needs', () => {
  const sim = new Simulation({ facilities: [], tunnelPairs: [], rng: () => 0 });
  sim.cats = [
    {
      id: 1,
      pos: { x: 2, y: 2 },
      prevPos: { x: 2, y: 2 },
      facing: 'right',
      spawnEdge: 'left',
      hunger: 10,
      sleepiness: 10,
      waitingTurns: 0,
      serving: null,
      inTunnel: null,
      lastSatisfiedNeed: null,
      lastSatisfiedTurn: -999,
      satisfiedCount: 0,
      exiting: false,
      hasLeftSpawn: true,
      traits: { obedience: 0.5, curiosity: 1 },
      detourState: null,
      detourTurns: 0,
    },
  ];

  const cat = sim.cats[0];
  sim.moveCat(cat, new Set());

  assert.equal(cat.detourState, 'sunbath');
  assert.deepEqual(cat.pos, { x: 2, y: 2 });
  assert.ok(cat.recentDecisionReason.includes('Sunbath detour'));
});


test('cat movement leaves fading footprints for five turns', () => {
  const sim = new Simulation({ facilities: [], tunnelPairs: [], rng: () => 0 });
  sim.spawnPoint = { pos: { x: 0, y: 0 }, prevPos: { x: -1, y: 0 }, edge: 'left' };
  sim.exitPoint = { pos: { x: 4, y: 4 }, prevPos: { x: 5, y: 4 }, edge: 'right' };

  sim.spawnedCats = 10;
  sim.cats = [
    {
      id: 1,
      pos: { x: 1, y: 1 },
      prevPos: { x: 1, y: 1 },
      facing: 'right',
      spawnEdge: 'left',
      hunger: 0,
      sleepiness: 0,
      waitingTurns: 0,
      serving: null,
      inTunnel: null,
      lastSatisfiedNeed: null,
      lastSatisfiedTurn: -999,
      satisfiedCount: 0,
      exiting: false,
    },
  ];

  sim.moveCat(sim.cats[0], new Set());
  assert.equal(sim.footprints.length, 1);
  assert.deepEqual(sim.footprints[0].pos, { x: 1, y: 1 });
  assert.equal(sim.footprints[0].ttl, 5);

  for (let i = 0; i < 4; i += 1) sim.ageFootprints();
  assert.equal(sim.footprints.length, 1);
  assert.equal(sim.footprints[0].ttl, 1);

  sim.ageFootprints();
  assert.equal(sim.footprints.length, 0);
});


test('resting cat stays on bed for at least two turns before service can complete', () => {
  const sim = new Simulation({
    facilities: [{ id: 'b1', type: 'bed', pos: { x: 1, y: 1 } }],
    tunnelPairs: [],
    rng: () => 0,
  });

  sim.spawnedCats = 10;
  sim.cats = [
    {
      id: 1,
      pos: { x: 1, y: 1 },
      prevPos: { x: 1, y: 1 },
      facing: 'right',
      spawnEdge: 'left',
      hunger: 0,
      sleepiness: 95,
      waitingTurns: 0,
      serving: null,
      servingTurns: 0,
      justFinishedService: false,
      inTunnel: null,
      lastSatisfiedNeed: null,
      lastSatisfiedTurn: -999,
      satisfiedCount: 0,
      exiting: false,
    },
  ];

  sim.tryUseFacility(sim.cats[0]);
  assert.equal(sim.cats[0].serving, 'b1');

  sim.turn = 1;
  sim.completeServices();
  assert.equal(sim.cats[0].serving, 'b1');
  assert.equal(sim.cats[0].sleepiness, 95);

  sim.turn = 2;
  sim.completeServices();
  assert.equal(sim.cats[0].serving, 'b1');
  assert.equal(sim.cats[0].sleepiness, 95);

  sim.turn = 3;
  sim.completeServices();
  assert.equal(sim.cats[0].serving, 'b1');
  assert.equal(sim.cats[0].sleepiness, 95);

  sim.turn = 4;
  sim.completeServices();
  assert.equal(sim.cats[0].serving, null);
  assert.equal(sim.cats[0].sleepiness, 0);
  assert.equal(sim.cats[0].justFinishedService, true);

  const occupied = new Set(['1,1']);
  occupied.delete('1,1');
  sim.moveCat(sim.cats[0], occupied);
  assert.deepEqual(sim.cats[0].pos, { x: 1, y: 1 });
});

test('cat leaves after being satisfied once and will not keep using facilities when full', () => {
  const sim = new Simulation({
    facilities: [
      { id: 'f1', type: 'fish', pos: { x: 1, y: 1 } },
      { id: 'b1', type: 'bed', pos: { x: 1, y: 1 } },
    ],
    tunnelPairs: [],
    rng: () => 0,
  });

  sim.spawnedCats = 10;
  sim.cats = [
    {
      id: 1,
      pos: { x: 1, y: 1 },
      prevPos: { x: 1, y: 1 },
      facing: 'right',
      spawnEdge: 'left',
      hunger: 95,
      sleepiness: 0,
      waitingTurns: 0,
      serving: null,
      servingTurns: 0,
      justFinishedService: false,
      inTunnel: null,
      lastSatisfiedNeed: null,
      lastSatisfiedTurn: -999,
      satisfiedCount: 0,
      exiting: false,
    },
  ];

  sim.tryUseFacility(sim.cats[0]);
  assert.equal(sim.cats[0].serving, 'f1');

  sim.turn = 1;
  sim.completeServices();
  sim.turn = 2;
  sim.completeServices();

  assert.equal(sim.cats[0].hunger, 0);
  assert.equal(sim.cats[0].exiting, true);

  sim.cats[0].justFinishedService = false;
  sim.tryUseFacility(sim.cats[0]);
  assert.equal(sim.cats[0].serving, null);
});
