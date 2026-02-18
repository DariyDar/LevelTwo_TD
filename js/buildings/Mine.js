// GlucoDefense — Mine building (Muscles)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';

export class Mine {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.workers = [];
    this.hp = CONFIG.MINE_HP;
    this.maxHp = CONFIG.MINE_HP;
    this.repairTimer = 0;
    this.destroyed = false;
    this.plusTimer = 0; // timer for energy plus effects
    this.pulseTimer = 0; // brief glow when glucose enters
  }

  get maxSlots() {
    const iv = gameState.interventions;
    if (iv.exercise.active) return CONFIG.MINE_EXERCISE_WORKERS;
    if (iv.walk.active) return CONFIG.MINE_WALK_WORKERS;
    return CONFIG.MINE_MAX_WORKERS;
  }

  get freeSlots() {
    return this.maxSlots - this.workers.length;
  }

  get isOperational() {
    return !this.destroyed && this.hp > 0;
  }

  update(dt) {
    if (this.pulseTimer > 0) this.pulseTimer -= dt;
    if (this.destroyed) {
      this.repairTimer -= dt;
      if (this.repairTimer <= 0) {
        this.destroyed = false;
        this.hp = this.maxHp;
        this.repairTimer = 0;
      }
      return;
    }

    // Energy plus effects — one yellow + per worker every 2 seconds
    if (this.workers.length > 0) {
      this.plusTimer -= dt;
      if (this.plusTimer <= 0) {
        this.plusTimer = 2.0;
        for (const w of this.workers) {
          if (!w.alive) continue;
          gameState.effects.push({
            type: 'mine_energy_plus',
            x: this.x + (Math.random() - 0.5) * 40,
            y: this.y - 20,
            timer: 0.8,
            maxTimer: 0.8,
          });
        }
      }
    }
  }

  takeDamage(amount) {
    if (this.destroyed) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.destroyed = true;
      this.repairTimer = CONFIG.MINE_REPAIR_TIME;
      this._evictWorkers();
    }
  }

  addWorker(peasant) {
    if (this.freeSlots <= 0 || !this.isOperational) return false;
    this.workers.push(peasant);
    peasant.assignToMine(this);
    this.pulseTimer = 0.6; // scale pulse when glucose enters
    return true;
  }

  removeWorker(peasant) {
    const idx = this.workers.indexOf(peasant);
    if (idx !== -1) {
      this.workers.splice(idx, 1);
    }
  }

  _evictWorkers() {
    for (const worker of [...this.workers]) {
      worker.die();
    }
    this.workers = [];
  }
}

// Find the mine with the most free slots; ties broken randomly for even distribution
export function findLeastFilledMine(mines) {
  let bestSlots = 0;
  const candidates = [];
  for (const mine of mines) {
    if (!mine.isOperational || mine.freeSlots <= 0) continue;
    if (mine.freeSlots > bestSlots) {
      bestSlots = mine.freeSlots;
      candidates.length = 0;
      candidates.push(mine);
    } else if (mine.freeSlots === bestSlots) {
      candidates.push(mine);
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
