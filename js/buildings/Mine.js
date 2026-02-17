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
  }

  get maxSlots() {
    const exerciseActive = gameState.interventions.exercise.active;
    return exerciseActive ? CONFIG.MINE_EXERCISE_WORKERS : CONFIG.MINE_MAX_WORKERS;
  }

  get freeSlots() {
    return this.maxSlots - this.workers.length;
  }

  get isOperational() {
    return !this.destroyed && this.hp > 0;
  }

  update(dt) {
    if (this.destroyed) {
      this.repairTimer -= dt;
      if (this.repairTimer <= 0) {
        this.destroyed = false;
        this.hp = this.maxHp;
        this.repairTimer = 0;
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

// Find least-filled operational mine (spreads glucose evenly across all cells)
export function findLeastFilledMine(mines) {
  let best = null;
  let mostFree = 0;

  for (const mine of mines) {
    if (!mine.isOperational || mine.freeSlots <= 0) continue;
    if (mine.freeSlots > mostFree) {
      mostFree = mine.freeSlots;
      best = mine;
    }
  }

  return best;
}
