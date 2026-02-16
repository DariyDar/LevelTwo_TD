// GlucoDefense — Kidney Tower building (player-activated + auto filtration circle)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { spendEnergy } from '../systems/energySystem.js';
import { calculateBG } from '../systems/bgSystem.js';
import { playVortex } from '../audio.js';

export class KidneyTower {
  constructor() {
    this.x = CONFIG.KIDNEYS_POS.x;
    this.y = CONFIG.KIDNEYS_POS.y;
    this.cooldown = 0;

    // HP for rebel attacks
    this.hp = CONFIG.KIDNEY_HP;
    this.maxHp = CONFIG.KIDNEY_HP;
    this.destroyed = false;
    this.repairTimer = 0;

    // Auto-filtration (fills when BG > threshold, fires at 100%)
    this.autoFilterProgress = 0;   // 0–100
    this.autoFilterCooldown = 0;   // seconds remaining before refill can start
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
      return; // Don't process auto-filter while destroyed
    }

    // Auto-filtration cooldown
    if (this.autoFilterCooldown > 0) {
      this.autoFilterCooldown -= dt;
      if (this.autoFilterCooldown < 0) this.autoFilterCooldown = 0;
      return; // Don't fill during cooldown
    }

    // Auto-filtration progress: fill when BG > threshold
    const bg = calculateBG();
    const threshold = gameState._kidneyAutoThreshold ?? CONFIG.KIDNEY_AUTO_THRESHOLD;
    if (bg > threshold) {
      const fillRate = Math.max(0, gameState._kidneyAutoFilterRate ?? CONFIG.KIDNEY_AUTO_FILL_RATE);
      this.autoFilterProgress = Math.min(100, this.autoFilterProgress + fillRate * dt);

      if (this.autoFilterProgress >= 100) {
        this.autoFilterProgress = 0;
        this.autoFilterCooldown = gameState._kidneyAutoCooldown ?? CONFIG.KIDNEY_AUTO_COOLDOWN;
        // Auto-fire filtration (free, no energy cost)
        this.castVortex(null, true);
      }
    }
    // BG below threshold: progress pauses (doesn't reset)
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
