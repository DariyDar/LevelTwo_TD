// GlucoDefense — Kidney Tower building (auto-filtration + manual flush + dapagliflozin)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { spendEnergy } from '../systems/energySystem.js';
import { calculateBG } from '../systems/bgSystem.js';
import { playVortex } from '../audio.js';

export class KidneyTower {
  constructor() {
    this.x = CONFIG.KIDNEYS_POS.x;
    this.y = CONFIG.KIDNEYS_POS.y;
    this.cooldown = 0;          // manual vortex cooldown (seconds)

    // HP for rebel attacks
    this.hp = CONFIG.KIDNEY_HP;
    this.maxHp = CONFIG.KIDNEY_HP;
    this.destroyed = false;
    this.repairTimer = 0;

    // Game-time based auto-filtration cooldown (real seconds)
    this.cooldownRemaining = 0;

    // Dapagliflozin state
    this.dapagliflozinTimer = 0;
    this.dapagliflozinActive = false;
  }

  update(dt) {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      if (this.cooldown < 0) this.cooldown = 0;
    }

    // Handle repair
    if (this.destroyed) {
      this.repairTimer -= dt;
      if (this.repairTimer <= 0) {
        this.destroyed = false;
        this.hp = this.maxHp;
      }
      return;
    }

    // Dapagliflozin timer
    if (this.dapagliflozinActive) {
      this.dapagliflozinTimer -= dt;
      if (this.dapagliflozinTimer <= 0) {
        this.dapagliflozinActive = false;
        // Restore original threshold
        gameState._kidneyAutoThreshold = gameState._kidneyBaseThreshold ?? CONFIG.KIDNEY_AUTO_THRESHOLD;
      }
    }

    // Auto-filtration cooldown countdown
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining -= dt;
      if (this.cooldownRemaining < 0) this.cooldownRemaining = 0;
    }

    // Auto-flush: when ready AND BG > threshold
    if (this.cooldownRemaining <= 0) {
      const bg = calculateBG();
      const threshold = gameState._kidneyAutoThreshold ?? CONFIG.KIDNEY_AUTO_THRESHOLD;
      if (bg > threshold) {
        this._autoFlush();
      }
    }
  }

  takeDamage(dmg) {
    if (this.destroyed) return;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.hp = 0;
      this.destroyed = true;
      this.repairTimer = CONFIG.BUILDING_REPAIR_TIME;
    }
  }

  _autoFlush() {
    this.castVortex(null, true);
    this._startCooldown();
  }

  // Manual flush by clicking on the kidney building (when ready)
  manualFlush() {
    if (this.cooldownRemaining > 0) return false;
    if (this.destroyed) return false;
    this.castVortex(null, true);
    this._startCooldown();
    return true;
  }

  _startCooldown() {
    const baseHours = gameState._kidneyAutoCooldown ?? CONFIG.KIDNEY_AUTO_COOLDOWN_HOURS;
    // Convert game hours to real seconds: hours * 60 minutes / DAY_SPEED
    this.cooldownRemaining = (baseHours * 60) / CONFIG.DAY_SPEED;
  }

  // Get cooldown display as game hours:minutes string
  getCooldownDisplay() {
    if (this.cooldownRemaining <= 0) return 'READY';
    const gameMinutesLeft = this.cooldownRemaining * CONFIG.DAY_SPEED;
    const h = Math.floor(gameMinutesLeft / 60);
    const m = Math.floor(gameMinutesLeft % 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  }

  // Get dapagliflozin remaining time display
  getDapagliflozinDisplay() {
    if (!this.dapagliflozinActive) return null;
    const gameMinutesLeft = this.dapagliflozinTimer * CONFIG.DAY_SPEED;
    const h = Math.floor(gameMinutesLeft / 60);
    const m = Math.floor(gameMinutesLeft % 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  }

  castVortex(rebels, boosted = false) {
    if (this.destroyed) return false;

    const cost = boosted ? 0 : CONFIG.KIDNEY_COST;
    if (!boosted && !spendEnergy(cost)) return false;

    // If circle already active, don't start another
    if (gameState.kidneyCircle) return false;

    // Start the yellow circle mechanic
    const origin = CONFIG.KIDNEY_CIRCLE_ORIGIN;
    gameState.kidneyCircle = {
      phase: 'expand',
      cx: origin.x,
      cy: origin.y,
      radius: 10,
      boosted,
    };

    if (!boosted) {
      this.cooldown = CONFIG.KIDNEY_COOLDOWN;
    }

    playVortex();
    return true;
  }
}
