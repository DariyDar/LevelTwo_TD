// GlucoDefense — Kidney Tower building (player-activated filtration circle)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { spendEnergy } from '../systems/energySystem.js';
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
