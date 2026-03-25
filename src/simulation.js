import {
  CAT_FOOTPRINT_TURNS,
  CAT_SPAWN_INTERVAL,
  FACILITY_SERVICE_TURNS,
  GAME_TURNS,
  GRID_SIZE,
  LOOP_WINDOW_TURNS,
  MAX_CATS,
  NEED_GAIN_PER_TURN,
  NEED_GAIN_WANDER_BONUS,
  NEED_THRESHOLD,
  OBSTACLE_COUNT_RANGE,
  BUSH_COUNT_RANGE,
  POINTS,
  DETOUR_CONFIG,
} from './config.js';
import { shortestPath, keyOf } from './pathfinding.js';

const EXIT_HAPPINESS_THRESHOLD = 35;

function clampNeed(v) {
  return Math.max(0, Math.min(100, v));
}

function facilityNeedType(type) {
  if (type === 'fish') return 'hunger';
  if (type === 'bed') return 'sleepiness';
  return null;
}

function catNeedsFacility(cat, facilityType) {
  const need = facilityNeedType(facilityType);
  if (!need) return false;
  return cat[need] >= NEED_THRESHOLD;
}

function guidanceFromLaser(laserDirection) {
  const map = {
    up: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
  };
  return map[laserDirection] ?? null;
}

function spawnData(edge, fixed) {
  if (edge === 0) return { pos: { x: fixed, y: 0 }, prevPos: { x: fixed, y: -1 }, edge: 'top' };
  if (edge === 1) return { pos: { x: GRID_SIZE - 1, y: fixed }, prevPos: { x: GRID_SIZE, y: fixed }, edge: 'right' };
  if (edge === 2) return { pos: { x: fixed, y: GRID_SIZE - 1 }, prevPos: { x: fixed, y: GRID_SIZE }, edge: 'bottom' };
  return { pos: { x: 0, y: fixed }, prevPos: { x: -1, y: fixed }, edge: 'left' };
}

function pickFarFixed(spawnFixed, rng) {
  const minGap = Math.max(1, Math.floor(GRID_SIZE / 2));
  const candidates = [];
  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (Math.abs(i - spawnFixed) >= minGap) candidates.push(i);
  }
  if (!candidates.length) return (spawnFixed + minGap) % GRID_SIZE;
  return candidates[Math.floor(rng() * candidates.length)];
}

export function planEntryExit(rng) {
  const spawnEdge = Math.floor(rng() * 4);
  const spawnFixed = Math.floor(rng() * GRID_SIZE);
  const exitEdge = (spawnEdge + 2) % 4;
  const exitFixed = pickFarFixed(spawnFixed, rng);
  return {
    spawnPoint: spawnData(spawnEdge, spawnFixed),
    exitPoint: spawnData(exitEdge, exitFixed),
  };
}

function randomIntInRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function planStaticBlockers(rng, spawnPoint, exitPoint, countRange, fixedBlockedKeys = new Set()) {
  const blockedKeys = new Set([keyOf(spawnPoint.pos), keyOf(exitPoint.pos), ...fixedBlockedKeys]);
  const candidates = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const k = keyOf({ x, y });
      if (!blockedKeys.has(k)) candidates.push({ x, y });
    }
  }

  const targetCount = randomIntInRange(rng, countRange.min, countRange.max);
  const obstacles = [];
  const obstacleSet = new Set(fixedBlockedKeys);

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const pos of candidates) {
    if (obstacles.length >= targetCount) break;
    obstacleSet.add(keyOf(pos));
    const hasPath = shortestPath(spawnPoint.pos, exitPoint.pos, GRID_SIZE, (_from, to) => !obstacleSet.has(keyOf(to)));
    if (hasPath?.length) {
      obstacles.push(pos);
    } else {
      obstacleSet.delete(keyOf(pos));
    }
  }

  return obstacles;
}

export function planObstacles(rng, spawnPoint, exitPoint) {
  return planStaticBlockers(rng, spawnPoint, exitPoint, OBSTACLE_COUNT_RANGE);
}

export function planBushes(rng, spawnPoint, exitPoint, obstacles = []) {
  const obstacleKeys = new Set(obstacles.map((pos) => keyOf(pos)));
  return planStaticBlockers(rng, spawnPoint, exitPoint, BUSH_COUNT_RANGE, obstacleKeys);
}

export function planMapLayout(rng) {
  const { spawnPoint, exitPoint } = planEntryExit(rng);
  const obstacles = planObstacles(rng, spawnPoint, exitPoint);
  const bushes = planBushes(rng, spawnPoint, exitPoint, obstacles);
  return { spawnPoint, exitPoint, obstacles, bushes };
}

function pathToEdgePoint(fromPos, edgePoint, canTraverse = null) {
  const path = shortestPath(fromPos, edgePoint.pos, GRID_SIZE, canTraverse);
  if (!path?.length) return null;
  return path;
}

function facingFromSpawnEdge(edge) {
  if (edge === 'top') return 'down';
  if (edge === 'right') return 'left';
  if (edge === 'bottom') return 'up';
  return 'right';
}

function facingFromStep(from, to, fallback) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx > 0) return 'right';
  if (dx < 0) return 'left';
  if (dy > 0) return 'down';
  if (dy < 0) return 'up';
  return fallback;
}

function happinessOf(cat) {
  return clampNeed(100 - Math.round((cat.hunger + cat.sleepiness) / 2));
}

function createTraits(rng) {
  return {
    obedience: 0.4 + rng() * 0.6,
    curiosity: 0.4 + rng() * 0.6,
  };
}

export class Simulation {
  constructor({ facilities, tunnelPairs = [], obstacles = [], bushes = [], rng }) {
    this.turn = 0;
    this.score = 0;
    this.cats = [];
    this.facilities = facilities;
    this.rng = rng;
    this.finished = false;
    this.tunnelMap = new Map();
    const plannedFlow = planEntryExit(this.rng);
    this.spawnPoint = plannedFlow.spawnPoint;
    this.exitPoint = plannedFlow.exitPoint;
    this.obstacles = obstacles;
    this.bushes = bushes;
    this.obstacleSet = new Set([...this.obstacles, ...this.bushes].map((pos) => keyOf(pos)));
    this.latestSpawnEdge = this.spawnPoint.edge;
    this.spawnBlocked = false;
    this.spawnedCats = 0;
    this.exitStats = {
      exitedCats: 0,
      poorExitCats: 0,
      totalPenalty: 0,
      latest: 'No cat has exited yet.',
    };

    for (const tunnel of facilities.filter((f) => f.type === 'tunnel')) {
      this.tunnelMap.set(keyOf(tunnel.pos), tunnel.orientation === 'vertical' ? 'vertical' : 'horizontal');
    }

    for (const [a, b] of tunnelPairs) {
      const orientation = a.y === b.y ? 'horizontal' : a.x === b.x ? 'vertical' : null;
      if (!orientation) continue;
      this.tunnelMap.set(keyOf(a), orientation);
      this.tunnelMap.set(keyOf(b), orientation);
    }

    this.facilityUsage = new Map();
    this.lastCatId = 0;
    this.lastScorePopupId = 0;
    this.scorePopups = [];
    this.footprints = [];
  }

  isSpawnTile(pos) {
    return pos.x === this.spawnPoint.pos.x && pos.y === this.spawnPoint.pos.y;
  }

  isExitTile(pos) {
    return pos.x === this.exitPoint.pos.x && pos.y === this.exitPoint.pos.y;
  }

  spawnCat() {
    if (this.spawnedCats >= MAX_CATS || this.spawnBlocked) return;
    const spawn = this.spawnPoint;

    this.lastCatId += 1;
    this.spawnedCats += 1;
    this.latestSpawnEdge = spawn.edge;
    this.cats.push({
      id: this.lastCatId,
      pos: spawn.pos,
      prevPos: spawn.prevPos,
      facing: facingFromSpawnEdge(spawn.edge),
      spawnEdge: spawn.edge,
      hunger: 20 + Math.floor(this.rng() * 25),
      sleepiness: 20 + Math.floor(this.rng() * 25),
      waitingTurns: 0,
      serving: null,
      servingTurns: 0,
      justFinishedService: false,
      inTunnel: null,
      lastSatisfiedNeed: null,
      lastSatisfiedTurn: -999,
      satisfiedCount: 0,
      exiting: false,
      hasLeftSpawn: false,
      traits: createTraits(this.rng),
      detourState: null,
      detourTurns: 0,
      recentDecisionReason: 'Spawned',
    });
  }

  getFacilitiesByType(type) {
    return this.facilities.filter((f) => f.type === type);
  }

  tunnelAllowsMove(tunnelPos, fromPos, toPos) {
    const orientation = this.tunnelMap.get(keyOf(tunnelPos));
    if (!orientation) return true;
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    if (orientation === 'vertical') return dx === 0 && Math.abs(dy) === 1;
    return dx === 1 && dy === 0;
  }

  canMoveBetween(fromPos, toPos) {
    if (this.obstacleSet.has(keyOf(toPos))) return false;
    if (!this.tunnelAllowsMove(fromPos, fromPos, toPos)) return false;
    if (!this.tunnelAllowsMove(toPos, fromPos, toPos)) return false;
    return true;
  }

  findTarget(cat) {
    if (cat.exiting) {
      const exitPath = pathToEdgePoint(cat.pos, this.exitPoint, (from, to) => this.canMoveBetween(from, to));
      if (!exitPath) return null;
      return { facility: null, path: exitPath, value: exitPath.length };
    }

    const urgentNeed = cat.hunger >= NEED_THRESHOLD ? 'hunger' : cat.sleepiness >= NEED_THRESHOLD ? 'sleepiness' : null;
    const targetType = urgentNeed === 'hunger' ? 'fish' : urgentNeed === 'sleepiness' ? 'bed' : null;
    if (!targetType) return null;

    const candidates = this.getFacilitiesByType(targetType);
    if (!candidates.length) return null;

    let best = null;
    for (const facility of candidates) {
      const usage = this.facilityUsage.get(facility.id);
      const busyPenalty = usage ? usage.remaining : 0;
      const path = shortestPath(cat.pos, facility.pos, GRID_SIZE, (from, to) => this.canMoveBetween(from, to));
      if (!path) continue;
      const value = path.length + busyPenalty;
      if (!best || value < best.value) best = { facility, path, value };
    }
    return best;
  }

  maybeApplyLaser(cat, nextPos) {
    const facility = this.facilities.find((f) => f.pos.x === cat.pos.x && f.pos.y === cat.pos.y && f.type === 'laser');
    if (!facility) return nextPos;
    const direction = guidanceFromLaser(facility.direction);
    if (!direction) return nextPos;
    const guided = { x: cat.pos.x + direction.x, y: cat.pos.y + direction.y };
    const inside = guided.x >= 0 && guided.y >= 0 && guided.x < GRID_SIZE && guided.y < GRID_SIZE;
    if (!inside) return nextPos;
    if (this.rng() < 0.7) return guided;
    return nextPos;
  }

  resolveMoveTarget(cat, plannedPos, occupiedTiles) {
    const desired = this.maybeApplyLaser(cat, plannedPos);
    const blocked = occupiedTiles.has(keyOf(desired));
    if (blocked) return { ...cat.pos };
    if (this.obstacleSet.has(keyOf(desired))) return { ...cat.pos };
    return desired;
  }

  tryUseFacility(cat) {
    const facility = this.facilities.find((f) => f.pos.x === cat.pos.x && f.pos.y === cat.pos.y && (f.type === 'fish' || f.type === 'bed'));
    if (!facility) return;
    if (cat.exiting || !catNeedsFacility(cat, facility.type)) return;

    const usage = this.facilityUsage.get(facility.id);
    if (usage && usage.catId !== cat.id) {
      cat.waitingTurns += 1;
      return;
    }

    if (!usage) {
      this.facilityUsage.set(facility.id, { catId: cat.id, remaining: FACILITY_SERVICE_TURNS[facility.type] });
      cat.serving = facility.id;
      cat.servingTurns = 0;
      cat.waitingTurns = 0;
    }
  }

  awardScore(cat, points) {
    if (!points || points <= 0) return;
    this.score += points;
    this.lastScorePopupId += 1;
    this.scorePopups.push({
      id: this.lastScorePopupId,
      catId: cat.id,
      pos: { ...cat.pos },
      points,
      ttl: 4,
    });
  }

  ageScorePopups() {
    this.scorePopups = this.scorePopups
      .map((popup) => ({ ...popup, ttl: popup.ttl - 1 }))
      .filter((popup) => popup.ttl > 0);
  }

  addFootprint(pos) {
    this.footprints.push({
      id: `${this.turn}-${this.lastCatId}-${this.footprints.length + 1}`,
      pos: { ...pos },
      ttl: CAT_FOOTPRINT_TURNS,
    });
  }

  ageFootprints() {
    this.footprints = this.footprints
      .map((footprint) => ({ ...footprint, ttl: footprint.ttl - 1 }))
      .filter((footprint) => footprint.ttl > 0);
  }

  completeServices() {
    for (const [facilityId, usage] of [...this.facilityUsage.entries()]) {
      const cat = this.cats.find((c) => c.id === usage.catId);
      const facility = this.facilities.find((f) => f.id === facilityId);

      if (!cat || !facility) {
        this.facilityUsage.delete(facilityId);
        continue;
      }

      cat.servingTurns = (cat.servingTurns ?? 0) + 1;
      const minRequiredTurns = facility.type === 'bed' ? 2 : 1;
      if (cat.servingTurns < minRequiredTurns) continue;

      usage.remaining -= 1;
      if (usage.remaining > 0) continue;

      if (cat && facility) {
        const need = facilityNeedType(facility.type);
        cat[need] = 0;
        this.awardScore(cat, POINTS.satisfyNeed);

        if (cat.lastSatisfiedNeed && cat.lastSatisfiedNeed !== need && this.turn - cat.lastSatisfiedTurn <= LOOP_WINDOW_TURNS) {
          this.awardScore(cat, POINTS.loopBonus);
        }

        cat.lastSatisfiedNeed = need;
        cat.lastSatisfiedTurn = this.turn;
        cat.satisfiedCount += 1;
        cat.exiting = true;
        cat.serving = null;
        cat.servingTurns = 0;
        cat.justFinishedService = true;
      }
      this.facilityUsage.delete(facilityId);
    }
  }

  moveCat(cat, occupiedTiles) {
    if (cat.justFinishedService) return;
    if (cat.serving) return;

    const urgentNeed = cat.hunger >= NEED_THRESHOLD || cat.sleepiness >= NEED_THRESHOLD;
    if (this.shouldSunbathDetour(cat, urgentNeed)) {
      cat.prevPos = { ...cat.pos };
      cat.detourTurns -= 1;
      cat.recentDecisionReason = `Sunbath detour (${cat.detourTurns} turn left)`;
      return;
    }

    const target = this.findTarget(cat);
    const from = { ...cat.pos };
    cat.prevPos = from;

    if (target && target.path.length) {
      const planned = target.path[0];
      cat.pos = this.resolveMoveTarget(cat, planned, occupiedTiles);
      cat.recentDecisionReason = target.facility
        ? `Heading to ${target.facility.type}`
        : 'Heading to exit';
    } else {
      const neighbors = [
        { x: cat.pos.x, y: cat.pos.y - 1 },
        { x: cat.pos.x + 1, y: cat.pos.y },
        { x: cat.pos.x, y: cat.pos.y + 1 },
        { x: cat.pos.x - 1, y: cat.pos.y },
      ]
        .filter((n) => n.x >= 0 && n.y >= 0 && n.x < GRID_SIZE && n.y < GRID_SIZE)
        .filter((n) => this.canMoveBetween(cat.pos, n));
      const selected = neighbors[Math.floor(this.rng() * neighbors.length)] ?? cat.pos;
      cat.pos = this.resolveMoveTarget(cat, selected, occupiedTiles);
      cat.hunger = clampNeed(cat.hunger + NEED_GAIN_WANDER_BONUS);
      cat.sleepiness = clampNeed(cat.sleepiness + NEED_GAIN_WANDER_BONUS);
      cat.recentDecisionReason = 'Wandering';
    }
    cat.facing = facingFromStep(from, cat.pos, cat.facing);
    if (cat.pos.x !== from.x || cat.pos.y !== from.y) this.addFootprint(from);
    if (!cat.hasLeftSpawn && !this.isSpawnTile(cat.pos)) cat.hasLeftSpawn = true;
    if (cat.hasLeftSpawn && this.isSpawnTile(cat.pos)) this.spawnBlocked = true;

    this.tryUseFacility(cat);
  }

  shouldSunbathDetour(cat, urgentNeed) {
    if (!DETOUR_CONFIG.enableSunbath) return false;
    if (cat.exiting || urgentNeed) return false;
    if ((cat.detourTurns ?? 0) > 0 && cat.detourState === 'sunbath') return true;
    if (!cat.hasLeftSpawn) return false;
    if (!cat.traits) return false;
    const curiosity = cat.traits?.curiosity ?? 0.5;
    const chance = DETOUR_CONFIG.baseChance + curiosity * DETOUR_CONFIG.curiosityWeight;
    if (this.rng() >= chance) return false;
    const span = Math.max(1, DETOUR_CONFIG.maxTurns - DETOUR_CONFIG.minTurns + 1);
    cat.detourState = 'sunbath';
    cat.detourTurns = DETOUR_CONFIG.minTurns + Math.floor(this.rng() * span);
    return true;
  }

  processExit(cat) {
    const happiness = happinessOf(cat);
    const poor = cat.hunger >= NEED_THRESHOLD || cat.sleepiness >= NEED_THRESHOLD || happiness <= EXIT_HAPPINESS_THRESHOLD;
    const satisfiedExitReward = !poor && cat.exiting ? POINTS.satisfiedExitReward : 0;
    const penalty = poor ? POINTS.badExitPenalty : 0;
    this.score -= penalty;
    if (satisfiedExitReward) this.awardScore(cat, satisfiedExitReward);

    this.exitStats.exitedCats += 1;
    this.exitStats.totalPenalty += penalty;
    if (poor) this.exitStats.poorExitCats += 1;
    this.exitStats.latest = `Cat #${cat.id} exited | Hunger ${cat.hunger} | Sleepiness ${cat.sleepiness} | Happiness ${happiness}${satisfiedExitReward ? ` | Reward +${satisfiedExitReward}` : ''}${penalty ? ` | Penalty -${penalty}` : ''}`;
  }

  tick() {
    if (this.finished) return;
    this.turn += 1;
    this.ageScorePopups();
    this.ageFootprints();

    if (this.turn === 1 || this.turn % CAT_SPAWN_INTERVAL === 0) this.spawnCat();

    for (const cat of this.cats) {
      cat.justFinishedService = false;
      cat.hunger = clampNeed(cat.hunger + NEED_GAIN_PER_TURN.hunger);
      cat.sleepiness = clampNeed(cat.sleepiness + NEED_GAIN_PER_TURN.sleepiness);
    }

    this.completeServices();

    const occupiedTiles = new Set(this.cats.map((cat) => keyOf(cat.pos)));
    for (const cat of this.cats) {
      occupiedTiles.delete(keyOf(cat.pos));
      this.moveCat(cat, occupiedTiles);
      occupiedTiles.add(keyOf(cat.pos));
    }

    const remainingCats = [];
    for (const cat of this.cats) {
      if (this.isExitTile(cat.pos)) {
        this.processExit(cat);
      } else {
        remainingCats.push(cat);
      }
    }
    this.cats = remainingCats;

    if (this.turn >= GAME_TURNS) this.finished = true;
  }
}
