import { MAX_FACILITY_COUNTS } from './config.js';
import { createRng } from './rng.js';
import { planMapLayout, Simulation } from './simulation.js';
import { TOOLS, createInitialState } from './app-state.js';
import {
  applySpeedVisual,
  getDomRefs,
  renderBoardStatic,
  renderBuildNote,
  renderCats,
  renderEntryExitMarkers,
  renderTools,
  updateFishBowlFrames,
  updateFlowInfo,
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

function nextTunnelOrientation(orientation) {
  return orientation === 'vertical' ? 'horizontal' : 'vertical';
}

function isPlacementOnlyFacility(type) {
  return type === 'fish' || type === 'bed';
}

function removeFacilityAt(state, x, y) {
  const idx = state.facilities.findIndex((f) => posKey(f.pos.x, f.pos.y) === posKey(x, y));
  if (idx < 0) return;
  state.facilities.splice(idx, 1);
}

const BASE_TICK_MS = 450;

export class GameController {
  constructor() {
    this.state = createInitialState();
    this.dom = getDomRefs();
    this.planBuildEntryExit();
  }

  planBuildEntryExit() {
    const seed = this.dom.seedInputEl?.value?.trim() || 'default-seed';
    const plannedFlow = planMapLayout(createRng(seed));
    this.state.plannedFlow = plannedFlow;
    this.state.obstacles = plannedFlow.obstacles;
    this.state.bushes = plannedFlow.bushes ?? [];
  }

  setSpeedFromInput() {
    this.state.speedMultiplier = Number(this.dom.speedRangeEl.value);
    this.state.tickMs = Math.max(45, Math.round(BASE_TICK_MS / this.state.speedMultiplier));
    applySpeedVisual(this.state.speedMultiplier, this.state.tickMs, this.dom.speedValueEl);
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
    });

    renderBoardStatic({
      boardEl: this.dom.boardEl,
      facilities: this.state.facilities,
      obstacles: this.state.obstacles,
      bushes: this.state.bushes,
      facilityUsage: this.state.sim?.facilityUsage ?? null,
      onTileClick: (x, y) => this.onTileClick(x, y),
    });

    const markerSim = this.state.sim ?? this.state.plannedFlow;
    renderEntryExitMarkers({ boardEl: this.dom.boardEl, sim: markerSim });
  }

  rerenderDynamic(animated = true) {
    updateFishBowlFrames(this.dom.boardEl, this.state.sim?.facilityUsage ?? null);
    renderCats({ catLayerEl: this.dom.catLayerEl, sim: this.state.sim, animated });
    const flowView = this.state.sim ?? this.state.plannedFlow;

    updateFlowInfo({
      flowEntryEl: this.dom.flowEntryEl,
      flowExitEl: this.dom.flowExitEl,
      flowRuleEl: this.dom.flowRuleEl,
      flowPenaltyEl: this.dom.flowPenaltyEl,
      flowLatestEl: this.dom.flowLatestEl,
      sim: flowView,
    });
    updateHud({
      turnEl: this.dom.turnEl,
      turnProgressEl: this.dom.turnProgressEl,
      scoreEl: this.dom.scoreEl,
      catCountEl: this.dom.catCountEl,
      statusEl: this.dom.statusEl,
      sim: flowView,
      status: this.state.phase === 'sim' ? (this.state.sim?.finished ? 'Simulation Finished' : 'Simulation Running') : 'Build Phase',
    });
  }

  addFacility(type, x, y) {
    if (countType(this.state.facilities, type) >= MAX_FACILITY_COUNTS[type]) return;

    if (type === 'tunnel') {
      this.state.facilities.push({
        id: `tunnel-${Date.now()}-${Math.random()}`,
        type,
        pos: { x, y },
        orientation: this.state.selectedTunnelOrientation,
      });
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
    if (this.state.obstacles.some((o) => o.x === x && o.y === y)) return;
    if (this.state.bushes.some((b) => b.x === x && b.y === y)) return;

    const idx = this.state.facilities.findIndex((f) => posKey(f.pos.x, f.pos.y) === posKey(x, y));
    if (this.state.selectedTool === 'erase') {
      removeFacilityAt(this.state, x, y);
      this.rerenderStatic();
      return;
    }

    if (idx >= 0) {
      const existing = this.state.facilities[idx];
      if (isPlacementOnlyFacility(existing.type) && this.state.selectedTool === existing.type) {
        removeFacilityAt(this.state, x, y);
      } else if (existing.type === 'laser' && this.state.selectedTool !== 'erase') {
        existing.direction = nextDirection(existing.direction);
      } else if (existing.type === 'tunnel' && this.state.selectedTool !== 'erase') {
        existing.orientation = nextTunnelOrientation(existing.orientation);
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
    const canStartFromBuild = this.state.phase === 'build';
    const canRestartFinishedRun = this.state.phase === 'sim' && this.state.sim?.finished;
    if (!canStartFromBuild && !canRestartFinishedRun) return;

    this.setSpeedFromInput();
    this.state.phase = 'sim';
    clearInterval(this.state.loopHandle);
    this.dom.resultEl.innerHTML = '';
    this.state.sim = new Simulation({
      facilities: this.state.facilities,
      obstacles: this.state.obstacles,
      bushes: this.state.bushes,
      rng: createRng(this.dom.seedInputEl.value.trim() || 'default-seed'),
    });

    this.rerenderStatic();
    this.rerenderDynamic(false);
    this.restartLoopInterval();
  }

  resetBuild() {
    clearInterval(this.state.loopHandle);
    this.state = createInitialState();
    this.planBuildEntryExit();
    this.dom.resultEl.innerHTML = '';
    this.dom.speedRangeEl.value = String(this.state.speedMultiplier);
    this.setSpeedFromInput();
    this.rerenderStatic();
    this.rerenderDynamic(false);
  }

  mount() {
    this.dom.startBtnEl.addEventListener('click', () => this.startSimulation());
    this.dom.resetBtnEl.addEventListener('click', () => this.resetBuild());
    this.dom.seedInputEl.addEventListener('change', () => {
      if (this.state.phase !== 'build') return;
      this.planBuildEntryExit();
      this.rerenderStatic();
      this.rerenderDynamic(false);
    });

    this.dom.speedRangeEl.addEventListener('input', () => {
      this.setSpeedFromInput();
      if (this.state.phase === 'sim') this.restartLoopInterval();
    });

    this.setSpeedFromInput();
    this.rerenderStatic();
    this.rerenderDynamic(false);
  }
}
