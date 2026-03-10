import { GRID_SIZE, MAX_FACILITY_COUNTS, NEED_THRESHOLD } from './config.js';

const ASSET_BASE_URL = new URL('../public/assets/', import.meta.url);

function assetUrl(relativePath) {
  return new URL(relativePath, ASSET_BASE_URL).href;
}

export function getDomRefs() {
  return {
    boardEl: document.querySelector('#board'),
    catLayerEl: document.querySelector('#cat-layer'),
    toolsEl: document.querySelector('#tools'),
    turnEl: document.querySelector('#turn'),
    scoreEl: document.querySelector('#score'),
    catCountEl: document.querySelector('#cat-count'),
    statusEl: document.querySelector('#status'),
    spawnInfoEl: document.querySelector('#spawn-info'),
    resultEl: document.querySelector('#result'),
    buildNoteEl: document.querySelector('#build-note'),
    seedInputEl: document.querySelector('#seed-input'),
    speedRangeEl: document.querySelector('#speed-range'),
    speedValueEl: document.querySelector('#speed-value'),
    flowEntryEl: document.querySelector('#flow-entry'),
    flowExitEl: document.querySelector('#flow-exit'),
    flowRuleEl: document.querySelector('#flow-rule'),
    flowPenaltyEl: document.querySelector('#flow-penalty'),
    flowLatestEl: document.querySelector('#flow-latest'),
    startBtnEl: document.querySelector('#start-btn'),
    resetBtnEl: document.querySelector('#reset-btn'),
  };
}

export function applySpeedVisual(speedMultiplier, tickMs, speedValueEl) {
  speedValueEl.textContent = `${speedMultiplier}x`;
  document.documentElement.style.setProperty('--cat-move-ms', `${Math.max(30, Math.round(tickMs * 0.75))}ms`);
}

export function renderTools({
  toolsEl,
  tools,
  selectedTool,
  selectedTunnelOrientation = 'horizontal',
  onToolSelected,
  onTunnelOrientationSelected,
}) {
  toolsEl.innerHTML = '';
  for (const tool of tools) {
    const btn = document.createElement('button');
    btn.className = `tool-btn${selectedTool === tool.id ? ' active' : ''}`;
    btn.dataset.tool = tool.id;
    btn.title = tool.label;

    const iconWrap = document.createElement('span');
    iconWrap.className = 'tool-btn-icon-wrap';

    if (tool.id === 'erase') {
      const eraseIcon = document.createElement('span');
      eraseIcon.className = 'tool-btn-icon tool-btn-icon-erase';
      eraseIcon.textContent = '✕';
      iconWrap.append(eraseIcon);
    } else {
      const icon = document.createElement('img');
      icon.className = 'tool-btn-icon';
      icon.src = assetUrl(`sprites/facilities/${facilityIconName(tool.id)}.svg`);
      icon.alt = tool.label;
      if (tool.id === 'tunnel') {
        icon.classList.add(`facility-tunnel-${selectedTunnelOrientation}`);
      }
      iconWrap.append(icon);
    }

    const label = document.createElement('span');
    label.className = 'tool-btn-label';
    label.textContent = tool.label;

    btn.append(iconWrap, label);
    btn.addEventListener('click', () => onToolSelected(tool.id));
    toolsEl.append(btn);
  }

  if (selectedTool === 'laser') {
    const tip = document.createElement('span');
    tip.className = 'tool-inline-hint';
    tip.textContent = 'Click a placed laser to rotate direction';
    toolsEl.append(tip);
  }

  if (selectedTool === 'tunnel') {
    const tip = document.createElement('span');
    tip.className = 'tool-inline-hint';
    tip.textContent = 'Click a placed tunnel to toggle horizontal / vertical direction';
    toolsEl.append(tip);

    const orientSelect = document.createElement('select');
    [
      { value: 'horizontal', text: 'Horizontal' },
      { value: 'vertical', text: 'Vertical' },
    ].forEach((opt) => {
      const op = document.createElement('option');
      op.value = opt.value;
      op.textContent = opt.text;
      op.selected = opt.value === selectedTunnelOrientation;
      orientSelect.append(op);
    });
    orientSelect.addEventListener('change', (e) => onTunnelOrientationSelected?.(e.target.value));
    toolsEl.append(orientSelect);
  }
}

export function renderBuildNote({ buildNoteEl, facilities, selectedTool, tunnelBuffer }) {
  const counts = ['fish', 'bed', 'laser', 'tunnel']
    .map((t) => `${t}: ${facilities.filter((f) => f.type === t).length}/${MAX_FACILITY_COUNTS[t]}`)
    .join(' | ');
  const spawnHint = 'Cats spawn only from fixed IN. Other cats cannot step onto IN. Any cat reaching OUT disappears.';
  if (selectedTool === 'tunnel' && tunnelBuffer) {
    buildNoteEl.textContent = `${counts} | Select second tunnel endpoint (same row=horizontal, same col=vertical). ${spawnHint}`;
    return;
  }
  if (selectedTool === 'tunnel') {
    buildNoteEl.textContent = `${counts} | Place tunnel endpoints in one row/col. Click a tunnel to toggle horizontal/vertical display. ${spawnHint}`;
    return;
  }
  if (selectedTool === 'laser') {
    buildNoteEl.textContent = `${counts} | Place a laser, then click it again to rotate direction. ${spawnHint}`;
    return;
  }
  buildNoteEl.textContent = `${counts} | ${spawnHint}`;
}

function laserTargetForFacility(facility) {
  const directionOffsets = {
    up: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
  };
  const offset = directionOffsets[facility.direction];
  if (!offset) return null;
  const target = { x: facility.pos.x + offset.x, y: facility.pos.y + offset.y };
  const inside = target.x >= 0 && target.y >= 0 && target.x < GRID_SIZE && target.y < GRID_SIZE;
  return inside ? target : null;
}

function facilityIconName(type) {
  if (type === 'fish') return 'fish-bowl';
  if (type === 'bed') return 'cat-bed';
  if (type === 'laser') return 'laser-pointer';
  return 'tunnel';
}

function tunnelOrientationOf(facility) {
  return facility.orientation === 'vertical' ? 'vertical' : 'horizontal';
}

export function renderBoardStatic({ boardEl, facilities, onTileClick }) {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${GRID_SIZE}, 1fr)`;

  const laserTargetTiles = new Set();
  for (const facility of facilities) {
    if (facility.type !== 'laser') continue;
    const target = laserTargetForFacility(facility);
    if (!target) continue;
    laserTargetTiles.add(`${target.x},${target.y}`);
  }

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.dataset.x = String(x);
      tile.dataset.y = String(y);
      tile.addEventListener('click', () => onTileClick(x, y));

      const facility = facilities.find((f) => f.pos.x === x && f.pos.y === y);
      if (facility) {
        tile.classList.add('has-facility', `facility-${facility.type}`);
        const icon = document.createElement('img');
        icon.className = 'facility-icon';
        icon.src = assetUrl(`sprites/facilities/${facilityIconName(facility.type)}.svg`);
        icon.alt = facility.type;
        if (facility.type === 'tunnel') {
          icon.classList.add(`facility-tunnel-${tunnelOrientationOf(facility)}`);
          icon.alt = `tunnel-${tunnelOrientationOf(facility)}`;
        }
        tile.append(icon);

        if (facility.type === 'laser') {
          const arrow = document.createElement('img');
          arrow.className = 'laser-arrow';
          arrow.src = assetUrl(`ui/arrow-${facility.direction}.svg`);
          arrow.alt = `Laser direction ${facility.direction}`;
          tile.append(arrow);
        }
      }

      if (laserTargetTiles.has(`${x},${y}`)) {
        const laserTarget = document.createElement('span');
        laserTarget.className = 'laser-target-dot';
        tile.append(laserTarget);
      }

      boardEl.append(tile);
    }
  }
}

export function renderEntryExitMarkers({ boardEl, sim }) {
  for (const marker of boardEl.querySelectorAll('.edge-marker')) marker.remove();
  if (!sim?.spawnPoint?.pos || !sim?.exitPoint?.pos) return;

  const points = [
    { type: 'entry', pos: sim.spawnPoint.pos, edge: sim.spawnPoint.edge },
    { type: 'exit', pos: sim.exitPoint.pos, edge: sim.exitPoint.edge },
  ];

  for (const point of points) {
    const tile = boardEl.querySelector(`[data-x="${point.pos.x}"][data-y="${point.pos.y}"]`);
    if (!tile) continue;

    const marker = document.createElement('span');
    marker.className = `edge-marker edge-marker-${point.type}`;
    marker.textContent = point.type === 'entry' ? 'IN' : 'OUT';
    marker.title = `${point.type === 'entry' ? 'Spawn' : 'Exit'} (${point.edge})`;
    tile.append(marker);
  }
}

function setCatPosition(catEl, pos) {
  catEl.style.left = `calc((100% / ${GRID_SIZE}) * ${pos.x})`;
  catEl.style.top = `calc((100% / ${GRID_SIZE}) * ${pos.y})`;
}

function setCatFacing(catEl, facing) {
  const angleByFacing = {
    up: -90,
    right: 0,
    down: 90,
    left: 180,
  };
  const angle = angleByFacing[facing] ?? 0;
  catEl.style.setProperty('--cat-facing-angle', `${angle}deg`);
}

function happinessOf(cat) {
  return Math.max(0, Math.min(100, 100 - Math.round((cat.hunger + cat.sleepiness) / 2)));
}

function catIconByNeeds(cat) {
  if (cat.hunger >= NEED_THRESHOLD) return 'cat-hungry';
  if (happinessOf(cat) <= 40) return 'cat-unhappy';
  return 'cat-default';
}

export function renderCats({ catLayerEl, sim, animated = true }) {
  if (!sim) {
    catLayerEl.innerHTML = '';
    return;
  }

  const existing = new Map([...catLayerEl.querySelectorAll('.cat')].map((el) => [Number(el.dataset.id), el]));

  for (const cat of sim.cats) {
    let catEl = existing.get(cat.id);
    const iconName = catIconByNeeds(cat);
    if (!catEl) {
      catEl = document.createElement('img');
      catEl.src = assetUrl(`sprites/cats/${iconName}.svg`);
      catEl.className = 'cat';
      catEl.dataset.id = String(cat.id);
      catEl.dataset.icon = iconName;
      catLayerEl.append(catEl);
      existing.delete(cat.id);

      setCatPosition(catEl, cat.prevPos);
      setCatFacing(catEl, cat.facing);
      requestAnimationFrame(() => setCatPosition(catEl, cat.pos));
      continue;
    }

    existing.delete(cat.id);
    if (catEl.dataset.icon !== iconName) {
      catEl.src = assetUrl(`sprites/cats/${iconName}.svg`);
      catEl.dataset.icon = iconName;
    }
    if (!animated) {
      catEl.style.transition = 'none';
      setCatPosition(catEl, cat.pos);
      setCatFacing(catEl, cat.facing);
      requestAnimationFrame(() => {
        catEl.style.transition = '';
      });
      continue;
    }

    setCatFacing(catEl, cat.facing);
    setCatPosition(catEl, cat.pos);
  }

  for (const stale of existing.values()) stale.remove();
}

export function updateHud({ turnEl, scoreEl, catCountEl, statusEl, spawnInfoEl, sim, status }) {
  turnEl.textContent = String(sim?.turn ?? 0);
  scoreEl.textContent = String(sim?.score ?? 0);
  catCountEl.textContent = String(sim?.cats.length ?? 0);
  statusEl.textContent = status;
  if (sim?.spawnPoint?.edge && sim?.exitPoint?.edge) {
    spawnInfoEl.textContent = `Entry ${sim.spawnPoint.edge} (${sim.spawnPoint.pos.x},${sim.spawnPoint.pos.y}) / Exit ${sim.exitPoint.edge} (${sim.exitPoint.pos.x},${sim.exitPoint.pos.y})`;
  } else {
    spawnInfoEl.textContent = 'Entry/Exit are not available';
  }
}

export function updateFlowInfo({ flowEntryEl, flowExitEl, flowRuleEl, flowPenaltyEl, flowLatestEl, sim }) {
  if (!sim?.spawnPoint?.edge || !sim?.exitPoint?.edge) {
    flowEntryEl.textContent = 'Entry: unavailable';
    flowExitEl.textContent = 'Exit: unavailable';
    flowRuleEl.textContent = 'Rule: only new cats can use IN tile.';
    flowPenaltyEl.textContent = 'Exit penalty: waiting for run.';
    flowLatestEl.textContent = 'Latest exit: none';
    return;
  }

  flowEntryEl.textContent = `Entry tile: ${sim.spawnPoint.edge} (${sim.spawnPoint.pos.x},${sim.spawnPoint.pos.y})`;
  flowExitEl.textContent = `Exit tile: ${sim.exitPoint.edge} (${sim.exitPoint.pos.x},${sim.exitPoint.pos.y})`;

  if (!sim.exitStats) {
    flowRuleEl.textContent = 'Rule: IN only spawns cats. Exited 0 cats.';
    flowPenaltyEl.textContent = 'Penalty summary: poor exits 0, total -0 score.';
    flowLatestEl.textContent = 'Latest exit: none';
    return;
  }

  flowRuleEl.textContent = `Rule: IN only spawns cats. Exited ${sim.exitStats.exitedCats} cats.`;
  flowPenaltyEl.textContent = `Penalty summary: poor exits ${sim.exitStats.poorExitCats}, total -${sim.exitStats.totalPenalty} score.`;
  flowLatestEl.textContent = `Latest exit: ${sim.exitStats.latest}`;
}
