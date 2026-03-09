import {
  CAT_SPAWN_INTERVAL,
  FACILITY_SERVICE_TURNS,
  GAME_TURNS,
  GRID_SIZE,
  LOOP_WINDOW_TURNS,
  MAX_CATS,
  NEED_GAIN_PER_TURN,
  NEED_GAIN_WANDER_BONUS,
  NEED_THRESHOLD,
  POINTS,
} from './config.js';
import { shortestPath, keyOf } from './pathfinding.js';

function clampNeed(v) {
  return Math.max(0, Math.min(100, v));
}

function facilityNeedType(type) {
  if (type === 'fish') return 'hunger';
  if (type === 'bed') return 'sleepiness';
  return null;
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

export class Simulation {
  constructor({ facilities, tunnelPairs, rng }) {
    this.turn = 0;
    this.score = 0;
    this.cats = [];
    this.facilities = facilities;
    this.rng = rng;
    this.finished = false;
    this.tunnelMap = new Map();
    this.latestSpawnEdge = null;

    for (const [a, b] of tunnelPairs) {
      const horizontal = a.y === b.y;
      const vertical = a.x === b.x;
      if (!horizontal && !vertical) continue;
      this.tunnelMap.set(keyOf(a), b);
      this.tunnelMap.set(keyOf(b), a);
    }

    this.facilityUsage = new Map();
    this.lastCatId = 0;
  }

  spawnCat() {
    if (this.cats.length >= MAX_CATS) return;

    const edge = Math.floor(this.rng() * 4);
    const fixed = Math.floor(this.rng() * GRID_SIZE);
    const spawn = spawnData(edge, fixed);

    this.lastCatId += 1;
    this.latestSpawnEdge = spawn.edge;
    this.cats.push({
      id: this.lastCatId,
      pos: spawn.pos,
      prevPos: spawn.prevPos,
      spawnEdge: spawn.edge,
      hunger: 20 + Math.floor(this.rng() * 25),
      sleepiness: 20 + Math.floor(this.rng() * 25),
      waitingTurns: 0,
      serving: null,
      inTunnel: null,
      lastSatisfiedNeed: null,
      lastSatisfiedTurn: -999,
    });
  }

  getFacilitiesByType(type) {
    return this.facilities.filter((f) => f.type === type);
  }

  findTarget(cat) {
    const urgentNeed = cat.hunger >= NEED_THRESHOLD ? 'hunger' : cat.sleepiness >= NEED_THRESHOLD ? 'sleepiness' : null;
    const targetType = urgentNeed === 'hunger' ? 'fish' : urgentNeed === 'sleepiness' ? 'bed' : null;
    if (!targetType) return null;

    const candidates = this.getFacilitiesByType(targetType);
    if (!candidates.length) return null;

    let best = null;
    for (const facility of candidates) {
      const usage = this.facilityUsage.get(facility.id);
      const busyPenalty = usage ? usage.remaining : 0;
      const path = shortestPath(cat.pos, facility.pos, GRID_SIZE);
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

  tryUseFacility(cat) {
    const facility = this.facilities.find((f) => f.pos.x === cat.pos.x && f.pos.y === cat.pos.y && (f.type === 'fish' || f.type === 'bed'));
    if (!facility) return;

    const usage = this.facilityUsage.get(facility.id);
    if (usage && usage.catId !== cat.id) {
      cat.waitingTurns += 1;
      return;
    }

    if (!usage) {
      this.facilityUsage.set(facility.id, { catId: cat.id, remaining: FACILITY_SERVICE_TURNS[facility.type] });
      cat.serving = facility.id;
      cat.waitingTurns = 0;
    }
  }

  completeServices() {
    for (const [facilityId, usage] of [...this.facilityUsage.entries()]) {
      usage.remaining -= 1;
      if (usage.remaining > 0) continue;
      const cat = this.cats.find((c) => c.id === usage.catId);
      const facility = this.facilities.find((f) => f.id === facilityId);
      if (cat && facility) {
        const need = facilityNeedType(facility.type);
        cat[need] = 0;
        this.score += POINTS.satisfyNeed;

        if (cat.lastSatisfiedNeed && cat.lastSatisfiedNeed !== need && this.turn - cat.lastSatisfiedTurn <= LOOP_WINDOW_TURNS) {
          this.score += POINTS.loopBonus;
        }

        cat.lastSatisfiedNeed = need;
        cat.lastSatisfiedTurn = this.turn;
        cat.serving = null;
      }
      this.facilityUsage.delete(facilityId);
    }
  }

  moveCat(cat) {
    if (cat.inTunnel) {
      cat.prevPos = { ...cat.pos };
      cat.pos = cat.inTunnel.exitPos;
      cat.inTunnel = null;
      this.tryUseFacility(cat);
      return;
    }

    if (cat.serving) return;

    const target = this.findTarget(cat);
    cat.prevPos = { ...cat.pos };

    if (target && target.path.length) {
      const planned = target.path[0];
      cat.pos = this.maybeApplyLaser(cat, planned);
    } else {
      const neighbors = [
        { x: cat.pos.x, y: cat.pos.y - 1 },
        { x: cat.pos.x + 1, y: cat.pos.y },
        { x: cat.pos.x, y: cat.pos.y + 1 },
        { x: cat.pos.x - 1, y: cat.pos.y },
      ].filter((n) => n.x >= 0 && n.y >= 0 && n.x < GRID_SIZE && n.y < GRID_SIZE);
      const selected = neighbors[Math.floor(this.rng() * neighbors.length)] ?? cat.pos;
      cat.pos = this.maybeApplyLaser(cat, selected);
      cat.hunger = clampNeed(cat.hunger + NEED_GAIN_WANDER_BONUS);
      cat.sleepiness = clampNeed(cat.sleepiness + NEED_GAIN_WANDER_BONUS);
    }

    const tunnelExit = this.tunnelMap.get(keyOf(cat.pos));
    if (tunnelExit) {
      cat.inTunnel = { exitPos: tunnelExit };
    } else {
      this.tryUseFacility(cat);
    }
  }

  tick() {
    if (this.finished) return;
    this.turn += 1;

    if (this.turn === 1 || this.turn % CAT_SPAWN_INTERVAL === 0) this.spawnCat();

    for (const cat of this.cats) {
      cat.hunger = clampNeed(cat.hunger + NEED_GAIN_PER_TURN.hunger);
      cat.sleepiness = clampNeed(cat.sleepiness + NEED_GAIN_PER_TURN.sleepiness);
    }

    this.completeServices();

    for (const cat of this.cats) this.moveCat(cat);

    if (this.turn >= GAME_TURNS) this.finished = true;
  }
}
