import { GRID_SIZE, MAX_FACILITY_COUNTS } from './config.js';
import { createRng } from './rng.js';
import { Simulation } from './simulation.js';

const state = {
  selectedTool: 'fish',
  selectedDirection: 'up',
  phase: 'build',
  facilities: [],
  tunnelBuffer: null,
  sim: null,
  loopHandle: null,
  tickMs: 450,
};

const boardEl = document.querySelector('#board');
const catLayerEl = document.querySelector('#cat-layer');
const toolsEl = document.querySelector('#tools');
const turnEl = document.querySelector('#turn');
const scoreEl = document.querySelector('#score');
const catCountEl = document.querySelector('#cat-count');
const statusEl = document.querySelector('#status');
const spawnInfoEl = document.querySelector('#spawn-info');
const resultEl = document.querySelector('#result');
const buildNoteEl = document.querySelector('#build-note');
const seedInputEl = document.querySelector('#seed-input');
const speedRangeEl = document.querySelector('#speed-range');
const speedValueEl = document.querySelector('#speed-value');
const startBtnEl = document.querySelector('#start-btn');
const resetBtnEl = document.querySelector('#reset-btn');

const TOOLS = [
  { id: 'fish', label: 'Fish Bowl' },
  { id: 'bed', label: 'Cat Bed' },
  { id: 'laser', label: 'Laser Pointer' },
  { id: 'tunnel', label: 'Cardboard Tunnel' },
  { id: 'erase', label: 'Erase' },
];

function posKey(x, y) {
  return `${x},${y}`;
}

function applySpeedFromControl() {
  state.tickMs = Number(speedRangeEl.value);
  speedValueEl.textContent = `${state.tickMs}ms`;
  document.documentElement.style.setProperty('--cat-move-ms', `${Math.max(80, state.tickMs - 70)}ms`);
}

function renderTools() {
  toolsEl.innerHTML = '';
  for (const tool of TOOLS) {
    const btn = document.createElement('button');
    btn.textContent = tool.label;
    btn.className = state.selectedTool === tool.id ? 'active' : '';
    btn.addEventListener('click', () => {
      state.selectedTool = tool.id;
      renderTools();
      renderBuildNote();
    });
    toolsEl.append(btn);
  }

  if (state.selectedTool === 'laser') {
    const dirSelect = document.createElement('select');
    ['up', 'right', 'down', 'left'].forEach((dir) => {
      const op = document.createElement('option');
      op.value = dir;
      op.textContent = dir.toUpperCase();
      if (dir === state.selectedDirection) op.selected = true;
      dirSelect.append(op);
    });
    dirSelect.addEventListener('change', (e) => {
      state.selectedDirection = e.target.value;
    });
    toolsEl.append(dirSelect);
  }
}

function countType(type) {
  return state.facilities.filter((f) => f.type === type).length;
}

function renderBuildNote() {
  const counts = ['fish', 'bed', 'laser', 'tunnel']
    .map((t) => `${t}: ${countType(t)}/${MAX_FACILITY_COUNTS[t]}`)
    .join(' | ');
  const spawnHint = 'Cats spawn from random map edges and move one tile per turn.';
  if (state.selectedTool === 'tunnel' && state.tunnelBuffer) {
    buildNoteEl.textContent = `${counts} | Select second tunnel endpoint. ${spawnHint}`;
  } else {
    buildNoteEl.textContent = `${counts} | ${spawnHint}`;
  }
}

function createTile(x, y) {
  const tile = document.createElement('button');
  tile.className = 'tile';
  tile.dataset.x = x;
  tile.dataset.y = y;
  tile.addEventListener('click', () => onTileClick(x, y));
  return tile;
}

function facilityIconName(type) {
  if (type === 'fish') return 'fish-bowl';
  if (type === 'bed') return 'cat-bed';
  if (type === 'laser') return 'laser-pointer';
  return 'tunnel';
}

function renderBoardStatic() {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const tile = createTile(x, y);
      const facility = state.facilities.find((f) => f.pos.x === x && f.pos.y === y);
      if (facility) {
        const icon = document.createElement('img');
        icon.className = 'facility-icon';
        icon.src = `/assets/sprites/facilities/${facilityIconName(facility.type)}.svg`;
        icon.alt = facility.type;
        tile.append(icon);

        if (facility.type === 'laser') {
          const arrow = document.createElement('div');
          arrow.className = `laser-arrow ${facility.direction}`;
          arrow.textContent = '▲';
          tile.append(arrow);
        }
      }
      boardEl.append(tile);
    }
  }
}

function renderCats(animated = true) {
  if (!state.sim) {
    catLayerEl.innerHTML = '';
    return;
  }

  const existing = new Map(
    [...catLayerEl.querySelectorAll('.cat')].map((el) => [Number(el.dataset.id), el]),
  );

  for (const cat of state.sim.cats) {
    let catEl = existing.get(cat.id);
    if (!catEl) {
      catEl = document.createElement('img');
      catEl.src = '/assets/sprites/cats/cat-default.svg';
      catEl.className = 'cat';
      catEl.dataset.id = String(cat.id);
      catLayerEl.append(catEl);
      existing.delete(cat.id);

      catEl.style.transform = `translate(${(cat.prevPos.x * 100) / GRID_SIZE}%, ${(cat.prevPos.y * 100) / GRID_SIZE}%)`;
      requestAnimationFrame(() => {
        catEl.style.transform = `translate(${(cat.pos.x * 100) / GRID_SIZE}%, ${(cat.pos.y * 100) / GRID_SIZE}%)`;
      });
      continue;
    }

    existing.delete(cat.id);
    if (animated) {
      catEl.style.transform = `translate(${(cat.pos.x * 100) / GRID_SIZE}%, ${(cat.pos.y * 100) / GRID_SIZE}%)`;
    } else {
      catEl.style.transition = 'none';
      catEl.style.transform = `translate(${(cat.pos.x * 100) / GRID_SIZE}%, ${(cat.pos.y * 100) / GRID_SIZE}%)`;
      requestAnimationFrame(() => {
        catEl.style.transition = '';
      });
    }
  }

  for (const stale of existing.values()) stale.remove();
}

function addFacility(type, x, y) {
  if (countType(type) >= MAX_FACILITY_COUNTS[type]) return;

  if (type === 'tunnel') {
    if (!state.tunnelBuffer) {
      const id = `tunnel-${Date.now()}-${Math.random()}`;
      state.tunnelBuffer = id;
      state.facilities.push({ id, type, pos: { x, y }, pairId: null });
      return;
    }
    const first = state.facilities.find((f) => f.id === state.tunnelBuffer);
    if (first && !(first.pos.x === x && first.pos.y === y)) {
      const secondId = `tunnel-${Date.now()}-${Math.random()}`;
      state.facilities.push({ id: secondId, type, pos: { x, y }, pairId: first.id });
      first.pairId = secondId;
      state.tunnelBuffer = null;
    }
    return;
  }

  state.facilities.push({
    id: `${type}-${Date.now()}-${Math.random()}`,
    type,
    pos: { x, y },
    direction: type === 'laser' ? state.selectedDirection : undefined,
  });
}

function onTileClick(x, y) {
  if (state.phase !== 'build') return;

  const idx = state.facilities.findIndex((f) => posKey(f.pos.x, f.pos.y) === posKey(x, y));
  if (state.selectedTool === 'erase') {
    if (idx >= 0) state.facilities.splice(idx, 1);
    renderBuildNote();
    renderBoardStatic();
    return;
  }

  if (idx >= 0) {
    const existing = state.facilities[idx];
    if (existing.type === 'laser' && state.selectedTool === 'laser') {
      existing.direction = state.selectedDirection;
    }
  } else {
    addFacility(state.selectedTool, x, y);
  }

  renderBuildNote();
  renderBoardStatic();
}

function collectTunnelPairs() {
  const tunnels = state.facilities.filter((f) => f.type === 'tunnel' && f.pairId);
  const tunnelPairs = [];
  const used = new Set();
  for (const t of tunnels) {
    if (used.has(t.id)) continue;
    const pair = state.facilities.find((f) => f.id === t.pairId);
    if (pair) {
      tunnelPairs.push([t.pos, pair.pos]);
      used.add(t.id);
      used.add(pair.id);
    }
  }
  return tunnelPairs;
}

function restartLoopInterval() {
  if (!state.sim) return;
  clearInterval(state.loopHandle);
  state.loopHandle = setInterval(runSingleTurn, state.tickMs);
}

function runSingleTurn() {
  state.sim.tick();
  turnEl.textContent = String(state.sim.turn);
  scoreEl.textContent = String(state.sim.score);
  catCountEl.textContent = String(state.sim.cats.length);
  if (state.sim.latestSpawnEdge) spawnInfoEl.textContent = `Edge random spawn (${state.sim.latestSpawnEdge})`;
  renderCats(true);

  if (state.sim.finished) {
    clearInterval(state.loopHandle);
    statusEl.textContent = 'Simulation Finished';
    resultEl.innerHTML = `<h3>Run Complete</h3><p>Final score: <strong>${state.sim.score}</strong></p><p>Total cats: ${state.sim.cats.length}</p>`;
  }
}

function startSimulation() {
  if (state.phase !== 'build') return;
  applySpeedFromControl();
  state.phase = 'sim';
  statusEl.textContent = 'Simulation Running';
  spawnInfoEl.textContent = 'Edge random spawn';

  state.sim = new Simulation({
    facilities: state.facilities.filter((f) => f.type !== 'tunnel' || f.pairId),
    tunnelPairs: collectTunnelPairs(),
    rng: createRng(seedInputEl.value.trim() || 'default-seed'),
  });

  renderBoardStatic();
  renderCats(false);
  restartLoopInterval();
}

function resetBuild() {
  clearInterval(state.loopHandle);
  state.phase = 'build';
  state.sim = null;
  state.facilities = [];
  state.tunnelBuffer = null;
  turnEl.textContent = '0';
  scoreEl.textContent = '0';
  catCountEl.textContent = '0';
  statusEl.textContent = 'Build Phase';
  spawnInfoEl.textContent = 'Edge random spawn';
  resultEl.innerHTML = '';
  renderBuildNote();
  renderBoardStatic();
  renderCats(false);
}

speedRangeEl.addEventListener('input', () => {
  applySpeedFromControl();
  if (state.phase === 'sim') restartLoopInterval();
});
startBtnEl.addEventListener('click', startSimulation);
resetBtnEl.addEventListener('click', resetBuild);

applySpeedFromControl();
renderTools();
renderBuildNote();
renderBoardStatic();
renderCats(false);
