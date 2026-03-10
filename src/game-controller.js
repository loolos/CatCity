import { MAX_FACILITY_COUNTS } from './config.js';
import { createRng } from './rng.js';
import { Simulation } from './simulation.js';
import { TOOLS, createInitialState } from './app-state.js';
import {
  applySpeedVisual,
  getDomRefs,
  renderBoardStatic,
  renderBuildNote,
  renderCats,
  renderTools,
  updateHud,
} from './ui.js';

function posKey(x, y) {
  return `${x},${y}`;
}

function countType(facilities, type) {
  return facilities.filter((f) => f.type === type).length;
}

function nextDirection(direction) {
  const order = ['up', 'right', 'down', 'left'];
  const idx = order.indexOf(direction);
  if (idx < 0) return 'up';
  return order[(idx + 1) % order.length];
}

function removeFacilityAt(state, x, y) {
  const idx = state.facilities.findIndex((f) => posKey(f.pos.x, f.pos.y) === posKey(x, y));
  if (idx < 0) return;
  const target = state.facilities[idx];
  state.facilities.splice(idx, 1);

  if (target.type === 'tunnel' && target.pairId) {
    const pair = state.facilities.find((f) => f.id === target.pairId);
    if (pair) {
      pair.pairId = null;
    }
  }

  if (state.tunnelBuffer === target.id) state.tunnelBuffer = null;
}

function collectTunnelPairs(facilities) {
  const tunnels = facilities.filter((f) => f.type === 'tunnel' && f.pairId);
  const tunnelPairs = [];
  const used = new Set();

  for (const t of tunnels) {
    if (used.has(t.id)) continue;
    const pair = facilities.find((f) => f.id === t.pairId);
    if (!pair) continue;
    const horizontal = t.pos.y === pair.pos.y;
    const vertical = t.pos.x === pair.pos.x;
    if (!horizontal && !vertical) continue;
    tunnelPairs.push([t.pos, pair.pos]);
    used.add(t.id);
    used.add(pair.id);
  }

  return tunnelPairs;
}

export class GameController {
  constructor() {
    this.state = createInitialState();
    this.dom = getDomRefs();
  }

  setSpeedFromInput() {
    this.state.tickMs = Number(this.dom.speedRangeEl.value);
    applySpeedVisual(this.state.tickMs, this.dom.speedValueEl);
  }

  rerenderStatic() {
    renderTools({
      toolsEl: this.dom.toolsEl,
      tools: TOOLS,
      selectedTool: this.state.selectedTool,
      selectedTunnelOrientation: this.state.selectedTunnelOrientation,
      onToolSelected: (tool) => {
        this.state.selectedTool = tool;
        this.rerenderStatic();
      },
      onTunnelOrientationSelected: (orientation) => {
        this.state.selectedTunnelOrientation = orientation;
        this.rerenderStatic();
      },
    });

    renderBuildNote({
      buildNoteEl: this.dom.buildNoteEl,
      facilities: this.state.facilities,
      selectedTool: this.state.selectedTool,
      tunnelBuffer: this.state.tunnelBuffer,
    });

    renderBoardStatic({
      boardEl: this.dom.boardEl,
      facilities: this.state.facilities,
      onTileClick: (x, y) => this.onTileClick(x, y),
    });
  }

  rerenderDynamic(animated = true) {
    renderCats({ catLayerEl: this.dom.catLayerEl, sim: this.state.sim, animated });
    updateHud({
      turnEl: this.dom.turnEl,
      scoreEl: this.dom.scoreEl,
      catCountEl: this.dom.catCountEl,
      statusEl: this.dom.statusEl,
      spawnInfoEl: this.dom.spawnInfoEl,
      sim: this.state.sim,
      status: this.state.phase === 'sim' ? (this.state.sim?.finished ? 'Simulation Finished' : 'Simulation Running') : 'Build Phase',
    });
  }

  addFacility(type, x, y) {
    if (countType(this.state.facilities, type) >= MAX_FACILITY_COUNTS[type]) return;

    if (type === 'tunnel') {
      if (!this.state.tunnelBuffer) {
        const id = `tunnel-${Date.now()}-${Math.random()}`;
        this.state.tunnelBuffer = id;
        this.state.facilities.push({ id, type, pos: { x, y }, pairId: null });
        return;
      }

      const first = this.state.facilities.find((f) => f.id === this.state.tunnelBuffer);
      if (!first || (first.pos.x === x && first.pos.y === y)) return;

      const orient = this.state.selectedTunnelOrientation;
      const sameRow = first.pos.y === y;
      const sameCol = first.pos.x === x;
      const validHorizontal = orient === 'horizontal' && sameRow && first.pos.x !== x;
      const validVertical = orient === 'vertical' && sameCol && first.pos.y !== y;
      if (!validHorizontal && !validVertical) return;

      const secondId = `tunnel-${Date.now()}-${Math.random()}`;
      this.state.facilities.push({ id: secondId, type, pos: { x, y }, pairId: first.id });
      first.pairId = secondId;
      this.state.tunnelBuffer = null;
      return;
    }

    this.state.facilities.push({
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      pos: { x, y },
      direction: type === 'laser' ? 'up' : undefined,
    });
  }

  onTileClick(x, y) {
    if (this.state.phase !== 'build') return;

    const idx = this.state.facilities.findIndex((f) => posKey(f.pos.x, f.pos.y) === posKey(x, y));
    if (this.state.selectedTool === 'erase') {
      removeFacilityAt(this.state, x, y);
      this.rerenderStatic();
      return;
    }

    if (idx >= 0) {
      const existing = this.state.facilities[idx];
      if (existing.type === 'laser' && this.state.selectedTool !== 'erase') {
        existing.direction = nextDirection(existing.direction);
      }
    } else {
      this.addFacility(this.state.selectedTool, x, y);
    }

    this.rerenderStatic();
  }

  restartLoopInterval() {
    if (!this.state.sim) return;
    clearInterval(this.state.loopHandle);
    this.state.loopHandle = setInterval(() => {
      this.state.sim.tick();
      this.rerenderDynamic(true);

      if (this.state.sim.finished) {
        clearInterval(this.state.loopHandle);
        this.dom.resultEl.innerHTML = `<h3>Run Complete</h3><p>Final score: <strong>${this.state.sim.score}</strong></p><p>Total cats: ${this.state.sim.cats.length}</p>`;
      }
    }, this.state.tickMs);
  }

  startSimulation() {
    if (this.state.phase !== 'build') return;

    this.setSpeedFromInput();
    this.state.phase = 'sim';
    this.dom.resultEl.innerHTML = '';
    this.state.sim = new Simulation({
      facilities: this.state.facilities.filter((f) => f.type !== 'tunnel' || f.pairId),
      tunnelPairs: collectTunnelPairs(this.state.facilities),
      rng: createRng(this.dom.seedInputEl.value.trim() || 'default-seed'),
    });

    this.rerenderStatic();
    this.rerenderDynamic(false);
    this.restartLoopInterval();
  }

  resetBuild() {
    clearInterval(this.state.loopHandle);
    this.state = createInitialState();
    this.dom.resultEl.innerHTML = '';
    this.dom.speedRangeEl.value = String(this.state.tickMs);
    this.setSpeedFromInput();
    this.rerenderStatic();
    this.rerenderDynamic(false);
  }

  mount() {
    this.dom.startBtnEl.addEventListener('click', () => this.startSimulation());
    this.dom.resetBtnEl.addEventListener('click', () => this.resetBuild());
    this.dom.speedRangeEl.addEventListener('input', () => {
      this.setSpeedFromInput();
      if (this.state.phase === 'sim') this.restartLoopInterval();
    });

    this.setSpeedFromInput();
    this.rerenderStatic();
    this.rerenderDynamic(false);
  }
}
