// GlucoDefense — Mine building (Muscles)

import { CONFIG } from '../config.js';

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

  get freeSlots() {
    return CONFIG.MINE_MAX_WORKERS - this.workers.length;
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
    const slotIndex = this.workers.length;
    this.workers.push(peasant);
    peasant.assignToMine(this, slotIndex);
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

  getWorkerPosition(slotIndex) {
    const offset = CONFIG.WORKER_OFFSETS[slotIndex];
    if (!offset) return { x: this.x, y: this.y + 24 };
    return { x: this.x + offset.dx, y: this.y + offset.dy };
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
