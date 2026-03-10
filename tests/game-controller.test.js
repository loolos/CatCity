import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_TURNS } from '../src/config.js';
import { GameController } from '../src/game-controller.js';

function createFakeElement(initial = {}) {
  return {
    value: initial.value ?? '',
    innerHTML: '',
    textContent: '',
    style: { setProperty() {} },
    dataset: {},
    addEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    append() {},
    appendChild() {},
    remove() {},
  };
}

function makeControllerHarness(seed = 'seed-restart') {
  const prevDocument = globalThis.document;
  const elements = {
    '#board': createFakeElement(),
    '#cat-layer': createFakeElement(),
    '#tools': createFakeElement(),
    '#turn': createFakeElement(),
    '#turn-progress': createFakeElement(),
    '#score': createFakeElement(),
    '#cat-count': createFakeElement(),
    '#status': createFakeElement(),
    '#result': createFakeElement(),
    '#build-note': createFakeElement(),
    '#seed-input': createFakeElement({ value: seed }),
    '#speed-range': createFakeElement({ value: '1' }),
    '#speed-value': createFakeElement(),
    '#flow-entry': createFakeElement(),
    '#flow-exit': createFakeElement(),
    '#flow-rule': createFakeElement(),
    '#flow-penalty': createFakeElement(),
    '#flow-latest': createFakeElement(),
    '#start-btn': createFakeElement(),
    '#reset-btn': createFakeElement(),
  };

  globalThis.document = {
    querySelector(selector) {
      return elements[selector] ?? null;
    },
    documentElement: { style: { setProperty() {} } },
  };

  const controller = new GameController();
  controller.rerenderStatic = () => {};
  controller.rerenderDynamic = () => {};
  controller.restartLoopInterval = () => {};

  return {
    controller,
    restore() {
      globalThis.document = prevDocument;
    },
  };
}

function runToFinished(sim) {
  for (let i = 0; i < GAME_TURNS + 5 && !sim.finished; i += 1) sim.tick();
  assert.equal(sim.finished, true);
}

test('start simulation can restart a finished run and clears cats', () => {
  const { controller, restore } = makeControllerHarness('seed-restart-clear');
  try {
    controller.startSimulation();
    const firstSim = controller.state.sim;

    firstSim.cats.push({
      id: 999,
      pos: { x: 0, y: 0 },
      prevPos: { x: 0, y: 0 },
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
    });
    firstSim.finished = true;

    controller.startSimulation();

    assert.notEqual(controller.state.sim, firstSim);
    assert.equal(controller.state.sim.turn, 0);
    assert.equal(controller.state.sim.cats.length, 0);
  } finally {
    restore();
  }
});

test('restarting finished simulation with same seed yields same final score', () => {
  const { controller, restore } = makeControllerHarness('seed-restart-score');
  try {
    controller.startSimulation();
    runToFinished(controller.state.sim);
    const firstScore = controller.state.sim.score;

    controller.startSimulation();
    runToFinished(controller.state.sim);
    const secondScore = controller.state.sim.score;

    assert.equal(secondScore, firstScore);
  } finally {
    restore();
  }
});
