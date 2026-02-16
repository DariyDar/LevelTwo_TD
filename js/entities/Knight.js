// GlucoDefense — Knight entity (Liver transporter / GLUT2)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { PeasantState } from './Peasant.js';

export const KnightState = {
  IDLE: 'idle',
  WALKING_TO_PEASANT: 'walking_to_peasant',
  ESCORTING: 'escorting',
  RETURNING: 'returning',
};

export class Knight {
  constructor(homeX, homeY) {
    this.homeX = homeX;
    this.homeY = homeY;
    this.x = homeX;
    this.y = homeY;
    this.speed = CONFIG.KNIGHT_SPEED;
    this.alive = true;
    this.state = KnightState.IDLE;
    this.target = null;

    // Track which peasants this knight already evaluated (roll once per peasant)
    this._evaluatedPeasants = new Set();
  }

  update(dt) {
    if (!this.alive) return;

    switch (this.state) {
      case KnightState.IDLE:
        this._findTarget();
        break;
      case KnightState.WALKING_TO_PEASANT:
        this._walkToPeasant(dt);
        break;
      case KnightState.ESCORTING:
        this._escort(dt);
        break;
      case KnightState.RETURNING:
        this._updateReturning(dt);
        break;
    }
  }

  _findTarget() {
    const liver = gameState.liverTower;
    if (!liver || liver.destroyed) return;

    // Prune dead peasants from evaluated set to prevent memory leaks
    for (const p of this._evaluatedPeasants) {
      if (!p.alive) this._evaluatedPeasants.delete(p);
    }

    // Don't grab if overflow
    const maxStorage = CONFIG.LIVER_STORAGE[Math.min(gameState.degradation, 5)];
    if (liver.storage >= maxStorage * CONFIG.LIVER_OVERFLOW_THRESHOLD) return;

    // Knights scan the road near liver for passing peasants
    const scanRange = CONFIG.KNIGHT_SCAN_RANGE;
    const roadY = CONFIG.ROAD_Y_CENTER;
    const liverX = CONFIG.LIVER_POS.x;
    let nearest = null;
    let nearestDist = Infinity;

    for (const p of gameState.peasants) {
      if (!p.alive) continue;
      if (p.state !== PeasantState.WALKING_TO_VILLAGE) continue;
      if (p.assignedKnight) continue;
      if (p.color !== 'red') continue;

      // Roll once per peasant per knight idle cycle (not per frame)
      if (this._evaluatedPeasants.has(p)) continue;

      const dx = p.x - liverX;
      const dy = p.y - roadY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < scanRange) {
        this._evaluatedPeasants.add(p);

        // Probabilistic intercept — only catch some peasants
        if (Math.random() > CONFIG.KNIGHT_INTERCEPT_CHANCE) continue;

        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = p;
        }
      }
    }

    if (nearest) {
      this.target = nearest;
      nearest.assignedKnight = this;
      this.state = KnightState.WALKING_TO_PEASANT;
    }
  }

  _getHypoSpeedMult() {
    if (gameState.hypoDuration > 10) return 0.5;
    if (gameState.hypoDuration > 0) return 0.8;
    return 1.0;
  }

  _walkToPeasant(dt) {
    if (!this.target || !this.target.alive) {
      this._returnHome();
      return;
    }

    // Lose interest if target moved too far from liver
    const liverDx = this.target.x - CONFIG.LIVER_POS.x;
    const liverDy = this.target.y - CONFIG.LIVER_POS.y;
    const liverDist = Math.sqrt(liverDx * liverDx + liverDy * liverDy);
    if (liverDist > CONFIG.KNIGHT_SCAN_RANGE * 1.5) {
      this._returnHome();
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 15) {
      this.target.state = PeasantState.BEING_ESCORTED;
      this.state = KnightState.ESCORTING;
      return;
    }

    const hypoMult = this._getHypoSpeedMult();
    this.x += (dx / dist) * this.speed * hypoMult * dt;
    this.y += (dy / dist) * this.speed * hypoMult * dt;
  }

  _escort(dt) {
    if (!this.target || !this.target.alive) {
      this._returnHome();
      return;
    }

    const liver = gameState.liverTower;
    if (!liver || liver.destroyed) {
      // Liver destroyed mid-escort — release peasant
      if (this.target) {
        this.target.state = PeasantState.WALKING_TO_VILLAGE;
        this.target.assignedKnight = null;
        this.target = null;
      }
      this.state = KnightState.RETURNING;
      return;
    }

    // Move toward liver tower
    const dx = liver.x - this.x;
    const dy = liver.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Metformin speed boost + hypoglycemia slowdown
    const speedMult = gameState.interventions.metformin.active
      ? 1 + CONFIG.METFORMIN_SPEED_BOOST
      : 1;
    const hypoMult = this._getHypoSpeedMult();

    if (dist > 10) {
      this.x += (dx / dist) * this.speed * speedMult * hypoMult * dt;
      this.y += (dy / dist) * this.speed * speedMult * hypoMult * dt;
    }

    // Move peasant with knight
    this.target.x = this.x + 8;
    this.target.y = this.y;

    // Absorb when at liver — knight survives and returns home
    if (dist <= 10) {
      if (this.target.speedCategory === 'slow') {
        liver.slowStorage++;
      }
      this.target.alive = false;
      this.target.assignedKnight = null;
      this.target = null;
      liver.storage++;

      // Knight returns home (NOT consumed — transporters are reusable)
      this.state = KnightState.RETURNING;
    }
  }

  _updateReturning(dt) {
    // On the way home, try to intercept passing glucose
    this._scanWhileReturning();

    const dx = this.homeX - this.x;
    const dy = this.homeY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      this.state = KnightState.IDLE;
      this._evaluatedPeasants.clear();
      return;
    }

    const hypoMult = this._getHypoSpeedMult();
    this.x += (dx / dist) * this.speed * hypoMult * dt;
    this.y += (dy / dist) * this.speed * hypoMult * dt;
  }

  _scanWhileReturning() {
    const liver = gameState.liverTower;
    if (!liver || liver.destroyed) return;

    const maxStorage = CONFIG.LIVER_STORAGE[Math.min(gameState.degradation, 5)];
    if (liver.storage >= maxStorage * CONFIG.LIVER_OVERFLOW_THRESHOLD) return;

    const scanRange = CONFIG.KNIGHT_SCAN_RANGE * 0.5;

    for (const p of gameState.peasants) {
      if (!p.alive) continue;
      if (p.state !== PeasantState.WALKING_TO_VILLAGE) continue;
      if (p.assignedKnight) continue;
      if (p.color !== 'red') continue;

      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < scanRange) {
        if (Math.random() > CONFIG.KNIGHT_INTERCEPT_CHANCE) continue;

        this.target = p;
        p.assignedKnight = this;
        this.state = KnightState.WALKING_TO_PEASANT;
        return;
      }
    }
  }

  _returnHome() {
    if (this.target) {
      this.target.assignedKnight = null;
    }
    this.target = null;
    this.state = KnightState.RETURNING;
  }
}
