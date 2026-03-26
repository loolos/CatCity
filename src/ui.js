import { CAT_FOOTPRINT_TURNS, GRID_SIZE, GAME_TURNS, MAX_FACILITY_COUNTS, NEED_THRESHOLD, SATISFIED_EMOJI_TURNS } from './config.js';
import { getSpriteMeta, applySpriteFrame, FISH_BOWL_SPRITE_ID } from './data/sprites.js';

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
    turnProgressEl: document.querySelector('#turn-progress'),
    scoreEl: document.querySelector('#score'),
    catCountEl: document.querySelector('#cat-count'),
    statusEl: document.querySelector('#status'),
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
    } else if (tool.id === 'fish') {
      const icon = document.createElement('span');
      icon.className = 'tool-btn-icon facility-icon-fish-bowl';
      const meta = getSpriteMeta(FISH_BOWL_SPRITE_ID);
      const lastFrame = meta ? meta.frameCount - 1 : 0;
      applySpriteFrame(icon, FISH_BOWL_SPRITE_ID, lastFrame, assetUrl);
      icon.setAttribute('aria-hidden', 'true');
      iconWrap.append(icon);
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
    tip.textContent = 'Tunnels are directional: horizontal (left→right), vertical (top↕bottom). Click to toggle orientation.';
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

export function renderBuildNote({ buildNoteEl, facilities, selectedTool }) {
  const counts = ['fish', 'bed', 'laser', 'tunnel']
    .map((t) => `${t}: ${facilities.filter((f) => f.type === t).length}/${MAX_FACILITY_COUNTS[t]}`)
    .join(' | ');
  if (selectedTool === 'tunnel') {
    buildNoteEl.textContent = `${counts} | Single-tile directional tunnel: horizontal allows left→right only, vertical allows up/down only.`;
    return;
  }
  if (selectedTool === 'laser') {
    buildNoteEl.textContent = `${counts} | Place a laser, then click it again to rotate direction.`;
    return;
  }
  if (selectedTool === 'fish' || selectedTool === 'bed') {
    buildNoteEl.textContent = `${counts} | Click the same fish bowl/cat bed again to remove it.`;
    return;
  }
  buildNoteEl.textContent = counts;
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

const FISH_BOWL_SERVICE_TURNS = 2;

function fishBowlFrameIndex(remaining) {
  if (remaining == null || remaining >= FISH_BOWL_SERVICE_TURNS) return 0;
  if (remaining >= 1) return 1;
  return 3;
}

function fishBowlDisplayFrame(remaining) {
  const meta = getSpriteMeta(FISH_BOWL_SPRITE_ID);
  const frameCount = meta?.frameCount ?? 4;
  const frame = fishBowlFrameIndex(remaining);
  return (frameCount - 1) - frame;
}

export function renderBoardStatic({ boardEl, facilities, obstacles = [], bushes = [], facilityUsage = null, onTileClick }) {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${GRID_SIZE}, 1fr)`;

  const laserTargetTiles = new Set();
  const obstacleSet = new Set(obstacles.map((o) => `${o.x},${o.y}`));
  const bushSet = new Set(bushes.map((b) => `${b.x},${b.y}`));
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

      if (obstacleSet.has(`${x},${y}`)) {
        tile.classList.add('has-obstacle');
        const rock = document.createElement('img');
        rock.className = 'facility-icon obstacle-icon';
        rock.src = assetUrl('sprites/facilities/rock.svg');
        rock.alt = 'rock obstacle';
        tile.append(rock);
      } else if (bushSet.has(`${x},${y}`)) {
        tile.classList.add('has-obstacle');
        const bush = document.createElement('img');
        bush.className = 'facility-icon obstacle-icon';
        bush.src = assetUrl('sprites/facilities/bush.svg');
        bush.alt = 'bush obstacle';
        tile.append(bush);
      }

      const blocked = obstacleSet.has(`${x},${y}`) || bushSet.has(`${x},${y}`);
      const facility = blocked ? null : facilities.find((f) => f.pos.x === x && f.pos.y === y);
      if (facility) {
        tile.classList.add('has-facility', `facility-${facility.type}`);
        if (facility.type === 'fish') {
          const usage = facilityUsage?.get(facility.id);
          const displayFrame = fishBowlDisplayFrame(usage?.remaining);
          const icon = document.createElement('span');
          icon.className = 'facility-icon facility-icon-fish-bowl';
          applySpriteFrame(icon, FISH_BOWL_SPRITE_ID, displayFrame, assetUrl);
          icon.setAttribute('aria-label', facility.type);
          tile.dataset.facilityId = facility.id;
          tile.append(icon);
        } else {
          const icon = document.createElement('img');
          icon.className = 'facility-icon';
          icon.src = assetUrl(`sprites/facilities/${facilityIconName(facility.type)}.svg`);
          icon.alt = facility.type;
          if (facility.type === 'tunnel') {
            icon.classList.add(`facility-tunnel-${tunnelOrientationOf(facility)}`);
            icon.alt = `tunnel-${tunnelOrientationOf(facility)}`;
          }
          tile.append(icon);
        }

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


function setFootprintPosition(footprintEl, pos) {
  footprintEl.style.left = `calc((100% / ${GRID_SIZE}) * ${pos.x})`;
  footprintEl.style.top = `calc((100% / ${GRID_SIZE}) * ${pos.y})`;
}

function renderFootprints(catLayerEl, sim) {
  const existing = new Map(
    [...catLayerEl.querySelectorAll('.cat-footprint')].map((el) => [el.dataset.footprintId, el])
  );

  for (const footprint of sim.footprints ?? []) {
    let footprintEl = existing.get(footprint.id);
    if (!footprintEl) {
      footprintEl = document.createElement('span');
      footprintEl.className = 'cat-footprint';
      footprintEl.dataset.footprintId = footprint.id;
      footprintEl.setAttribute('aria-hidden', 'true');
      footprintEl.textContent = '🐾';
      catLayerEl.append(footprintEl);
    }

    footprintEl.style.opacity = String(Math.max(0.08, (footprint.ttl / CAT_FOOTPRINT_TURNS) * 0.6));
    setFootprintPosition(footprintEl, footprint.pos);
    existing.delete(footprint.id);
  }

  for (const stale of existing.values()) stale.remove();
}

function scoreTier(points) {
  if (points >= 20) return 'epic';
  if (points >= 15) return 'high';
  if (points >= 10) return 'mid';
  return 'low';
}

function setPopupPosition(popupEl, pos) {
  popupEl.style.left = `calc((100% / ${GRID_SIZE}) * ${pos.x} + (100% / ${GRID_SIZE}) * 0.5)`;
  popupEl.style.top = `calc((100% / ${GRID_SIZE}) * ${pos.y} + (100% / ${GRID_SIZE}) * 0.24)`;
}

function renderScorePopups(catLayerEl, sim) {
  const existing = new Map(
    [...catLayerEl.querySelectorAll('.cat-score-popup')].map((el) => [Number(el.dataset.popupId), el])
  );

  for (const popup of sim.scorePopups ?? []) {
    let popupEl = existing.get(popup.id);
    if (!popupEl) {
      popupEl = document.createElement('span');
      popupEl.className = 'cat-score-popup';
      popupEl.dataset.popupId = String(popup.id);
      catLayerEl.append(popupEl);
    }

    popupEl.dataset.tier = scoreTier(popup.points);
    popupEl.textContent = `+${popup.points}`;
    setPopupPosition(popupEl, popup.pos);
    existing.delete(popup.id);
  }

  for (const stale of existing.values()) stale.remove();
}

function happinessOf(cat) {
  return Math.max(0, Math.min(100, 100 - Math.round((cat.hunger + cat.sleepiness) / 2)));
}

function catIconByNeeds(cat) {
  if (cat.hunger >= NEED_THRESHOLD) return 'cat-hungry';
  if (happinessOf(cat) <= 40) return 'cat-unhappy';
  return 'cat-default';
}

function satisfiedEmojiFor(cat, currentTurn) {
  if ((cat.blockedTurns ?? 0) > 0) return '💭';
  if (cat.detourState === 'sunbath' && (cat.detourTurns ?? 0) > 0) return '🌤️';
  if (!cat.lastSatisfiedNeed || currentTurn - cat.lastSatisfiedTurn > SATISFIED_EMOJI_TURNS) return null;
  if (cat.lastSatisfiedNeed === 'hunger') return '🐟';
  if (cat.lastSatisfiedNeed === 'sleepiness') return '💤';
  return null;
}

export function renderCats({ catLayerEl, sim, animated = true }) {
  if (!sim) {
    catLayerEl.innerHTML = '';
    return;
  }

  const existing = new Map(
    [...catLayerEl.querySelectorAll('.cat-wrapper')].map((el) => [Number(el.dataset.id), el])
  );

  for (const cat of sim.cats) {
    let wrapperEl = existing.get(cat.id);
    const iconName = catIconByNeeds(cat);
    const satisfiedEmoji = satisfiedEmojiFor(cat, sim.turn);

    if (!wrapperEl) {
      wrapperEl = document.createElement('div');
      wrapperEl.className = 'cat-wrapper';
      wrapperEl.dataset.id = String(cat.id);

      const catImg = document.createElement('img');
      catImg.src = assetUrl(`sprites/cats/${iconName}.svg`);
      catImg.className = 'cat';
      catImg.dataset.icon = iconName;
      catImg.alt = 'cat';
      wrapperEl.append(catImg);

      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'cat-satisfied-emoji';
      emojiSpan.setAttribute('aria-hidden', 'true');
      if (satisfiedEmoji) {
        emojiSpan.textContent = satisfiedEmoji;
        emojiSpan.classList.add('visible');
      }
      wrapperEl.append(emojiSpan);

      catLayerEl.append(wrapperEl);
      existing.delete(cat.id);

      setCatPosition(wrapperEl, cat.prevPos);
      setCatFacing(wrapperEl.querySelector('.cat'), cat.facing);
      requestAnimationFrame(() => setCatPosition(wrapperEl, cat.pos));
    }

    existing.delete(cat.id);

    const catImg = wrapperEl.querySelector('.cat');
    const emojiSpan = wrapperEl.querySelector('.cat-satisfied-emoji');

    if (catImg.dataset.icon !== iconName) {
      catImg.src = assetUrl(`sprites/cats/${iconName}.svg`);
      catImg.dataset.icon = iconName;
    }

    if (satisfiedEmoji) {
      emojiSpan.textContent = satisfiedEmoji;
      emojiSpan.classList.add('visible');
    } else {
      emojiSpan.textContent = '';
      emojiSpan.classList.remove('visible');
    }

    if (!animated) {
      wrapperEl.style.transition = 'none';
      setCatPosition(wrapperEl, cat.pos);
      setCatFacing(catImg, cat.facing);
      requestAnimationFrame(() => {
        wrapperEl.style.transition = '';
      });
      continue;
    }

    setCatFacing(catImg, cat.facing);
    setCatPosition(wrapperEl, cat.pos);
  }

  for (const stale of existing.values()) stale.remove();
  renderFootprints(catLayerEl, sim);
  renderScorePopups(catLayerEl, sim);
}

export function updateFishBowlFrames(boardEl, facilityUsage) {
  if (!boardEl || !facilityUsage) return;
  for (const tile of boardEl.querySelectorAll('.tile[data-facility-id]')) {
    const icon = tile.querySelector('.facility-icon-fish-bowl');
    if (!icon) continue;
    const usage = facilityUsage.get(tile.dataset.facilityId);
    const displayFrame = fishBowlDisplayFrame(usage?.remaining);
    applySpriteFrame(icon, FISH_BOWL_SPRITE_ID, displayFrame, assetUrl);
  }
}

export function updateHud({ turnEl, turnProgressEl, scoreEl, catCountEl, statusEl, sim, status }) {
  const turn = sim?.turn ?? 0;
  turnEl.textContent = String(turn);
  if (turnProgressEl) {
    const pct = Math.min(100, (turn / GAME_TURNS) * 100);
    turnProgressEl.style.width = `${pct}%`;
  }
  scoreEl.textContent = String(sim?.score ?? 0);
  catCountEl.textContent = String(sim?.cats.length ?? 0);
  statusEl.textContent = status;
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
