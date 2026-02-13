// GlucoDefense — Priest entity (Insulin)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { PeasantState } from './Peasant.js';
import { findLeastFilledMine } from '../buildings/Mine.js';
import { playCastSuccess, playCastFail } from '../audio.js';

export const PriestState = {
  IDLE: 'idle',
  WALKING: 'walking',
};

export class Priest {
  constructor(x, y, enhanced = false) {
    this.x = x;
    this.y = y;
    this.speed = enhanced ? 140 : 110;
    this.alive = true;
    this.state = PriestState.IDLE;
    this.target = null;

    // Enhanced (from Fast Insulin intervention)
    this.enhanced = enhanced;
    this.successOverride = enhanced ? 1.0 : null;

    // Lifetime for enhanced priests
    this.lifetime = enhanced ? CONFIG.FAST_INSULIN_DURATION : Infinity;
  }

  update(dt) {
    if (!this.alive) return;

    // Enhanced lifetime
    if (this.enhanced) {
      this.lifetime -= dt;
      if (this.lifetime <= 0) {
        this.alive = false;
        return;
      }
    }

    switch (this.state) {
      case PriestState.IDLE:
        this._findTarget();
        break;
      case PriestState.WALKING:
        this._updateWalking(dt);
        break;
    }
  }

  _findTarget() {
    // Prioritize waiting glucose, then try rebels (insulin still works on free glucose)
    let nearest = null;
    let nearestDist = Infinity;
    let nearestRebel = null;
    let nearestRebelDist = Infinity;

    for (const p of gameState.peasants) {
      if (!p.alive) continue;
      if (p.assignedPriest) continue;

      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const dist = dx * dx + dy * dy;

      if (p.state === PeasantState.WAITING_FOR_PRIEST) {
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = p;
        }
      } else if (p.state === PeasantState.REBEL) {
        if (dist < nearestRebelDist) {
          nearestRebelDist = dist;
          nearestRebel = p;
        }
      }
    }

    // Prefer waiting glucose; fall back to rebels
    const chosen = nearest || nearestRebel;
    if (chosen) {
      this.target = chosen;
      chosen.assignedPriest = this;
      this.state = PriestState.WALKING;
    }
  }

  _updateWalking(dt) {
    if (!this.target || !this.target.alive) {
      this._resetToIdle();
      return;
    }

    // If target was already converted by another priest or walk, find new target
    if (this.target.state !== PeasantState.WAITING_FOR_PRIEST &&
        this.target.state !== PeasantState.REBEL) {
      this._resetToIdle();
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Merge on contact (touch distance)
    if (dist < 10) {
      this._merge();
      return;
    }

    // Hypoglycemia slows priests (low BG impairs all processes)
    const hypoMult = gameState.hypoDuration > 10 ? 0.5 :
                     gameState.hypoDuration > 0 ? 0.8 : 1.0;

    this.x += (dx / dist) * this.speed * hypoMult * dt;
    this.y += (dy / dist) * this.speed * hypoMult * dt;
  }

  _merge() {
    const deg = gameState.degradation;
    const baseChance = this.successOverride !== null
      ? this.successOverride
      : CONFIG.RESISTANCE_BY_DEGRADATION[Math.min(deg, CONFIG.RESISTANCE_BY_DEGRADATION.length - 1)];
    // Insulin sensitivity multiplier (patient physiology)
    const sensitivity = gameState._insulinSensitivity ?? 1.0;
    const successChance = Math.min(1.0, baseChance * sensitivity);

    const roll = Math.random();

    if (roll < successChance) {
      // SUCCESS — insulin merges with glucose, priest consumed
      playCastSuccess();

      // Particle burst at merge point
      gameState.effects.push({
        type: 'priest_convert',
        x: this.target.x,
        y: this.target.y,
        timer: 0.6,
        maxTimer: 0.6,
        particles: Array.from({ length: 10 }, () => ({
          dx: (Math.random() - 0.5) * 100,
          dy: (Math.random() - 0.5) * 100,
        })),
      });

      // Clear rebel state if targeting a rebel
      this.target.attackTarget = null;

      // Glucose converts and independently finds a mine
      this.target.convertToWorker(null);
      const mine = findLeastFilledMine(gameState.mines);
      if (mine) {
        mine.addWorker(this.target);
      }

      gameState.stats.totalWorkers++;

      this.target.assignedPriest = null;
      this.target = null;

      // Priest is consumed on successful merge
      this.alive = false;
    } else {
      // FAIL — insulin resistance, priest consumed regardless
      playCastFail();

      gameState.effects.push({
        type: 'cast_fail',
        x: this.target.x,
        y: this.target.y,
        timer: 0.8,
        text: 'Resistance',
      });

      if (this.target.state !== PeasantState.REBEL) {
        this.target.becomeRebel();
        gameState.stats.totalRebels++;
      }

      this.target.assignedPriest = null;
      this.target = null;
      this.alive = false;
    }
  }

  _resetToIdle() {
    if (this.target) {
      this.target.assignedPriest = null;
    }
    this.target = null;
    this.state = PriestState.IDLE;
  }
}
