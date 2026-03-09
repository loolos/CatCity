import { GRID_SIZE, MAX_FACILITY_COUNTS } from './config.js';

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
    startBtnEl: document.querySelector('#start-btn'),
    resetBtnEl: document.querySelector('#reset-btn'),
  };
}

export function applySpeedVisual(tickMs, speedValueEl) {
  speedValueEl.textContent = `${tickMs}ms`;
  document.documentElement.style.setProperty('--cat-move-ms', `${Math.max(80, tickMs - 70)}ms`);
}

export function renderTools({
  toolsEl,
  tools,
  selectedTool,
  selectedDirection,
  selectedTunnelOrientation = 'horizontal',
  onToolSelected,
  onDirectionSelected,
  onTunnelOrientationSelected,
}) {
  toolsEl.innerHTML = '';
  for (const tool of tools) {
    const btn = document.createElement('button');
    btn.textContent = tool.label;
    btn.className = selectedTool === tool.id ? 'active' : '';
    btn.addEventListener('click', () => onToolSelected(tool.id));
    toolsEl.append(btn);
  }

  if (selectedTool === 'laser') {
    const dirSelect = document.createElement('select');
    ['up', 'right', 'down', 'left'].forEach((dir) => {
      const op = document.createElement('option');
      op.value = dir;
      op.textContent = dir.toUpperCase();
      op.selected = dir === selectedDirection;
      dirSelect.append(op);
    });
    dirSelect.addEventListener('change', (e) => onDirectionSelected(e.target.value));
    toolsEl.append(dirSelect);
  }

  if (selectedTool === 'tunnel') {
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
  const spawnHint = 'Cats spawn from random map edges and move one tile per turn.';
  if (selectedTool === 'tunnel' && tunnelBuffer) {
    buildNoteEl.textContent = `${counts} | Select second tunnel endpoint (same row=horizontal, same col=vertical). ${spawnHint}`;
    return;
  }
  buildNoteEl.textContent = `${counts} | ${spawnHint}`;
}

function facilityIconName(type) {
  if (type === 'fish') return 'fish-bowl';
  if (type === 'bed') return 'cat-bed';
  if (type === 'laser') return 'laser-pointer';
  return 'tunnel';
}

export function renderBoardStatic({ boardEl, facilities, onTileClick }) {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.dataset.x = String(x);
      tile.dataset.y = String(y);
      tile.addEventListener('click', () => onTileClick(x, y));

      const facility = facilities.find((f) => f.pos.x === x && f.pos.y === y);
      if (facility) {
        const icon = document.createElement('img');
        icon.className = 'facility-icon';
        icon.src = assetUrl(`sprites/facilities/${facilityIconName(facility.type)}.svg`);
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

function setCatPosition(catEl, pos) {
  catEl.style.left = `calc((100% / ${GRID_SIZE}) * ${pos.x})`;
  catEl.style.top = `calc((100% / ${GRID_SIZE}) * ${pos.y})`;
}

export function renderCats({ catLayerEl, sim, animated = true }) {
  if (!sim) {
    catLayerEl.innerHTML = '';
    return;
  }

  const existing = new Map([...catLayerEl.querySelectorAll('.cat')].map((el) => [Number(el.dataset.id), el]));

  for (const cat of sim.cats) {
    let catEl = existing.get(cat.id);
    if (!catEl) {
      catEl = document.createElement('img');
      catEl.src = assetUrl('sprites/cats/cat-default.svg');
      catEl.className = 'cat';
      catEl.dataset.id = String(cat.id);
      catLayerEl.append(catEl);
      existing.delete(cat.id);

      setCatPosition(catEl, cat.prevPos);
      requestAnimationFrame(() => setCatPosition(catEl, cat.pos));
      continue;
    }

    existing.delete(cat.id);
    if (!animated) {
      catEl.style.transition = 'none';
      setCatPosition(catEl, cat.pos);
      requestAnimationFrame(() => {
        catEl.style.transition = '';
      });
      continue;
    }

    setCatPosition(catEl, cat.pos);
  }

  for (const stale of existing.values()) stale.remove();
}

export function updateHud({ turnEl, scoreEl, catCountEl, statusEl, spawnInfoEl, sim, status }) {
  turnEl.textContent = String(sim?.turn ?? 0);
  scoreEl.textContent = String(sim?.score ?? 0);
  catCountEl.textContent = String(sim?.cats.length ?? 0);
  statusEl.textContent = status;
  if (sim?.latestSpawnEdge) {
    spawnInfoEl.textContent = `Edge random spawn (${sim.latestSpawnEdge})`;
  } else {
    spawnInfoEl.textContent = 'Edge random spawn';
  }
}
