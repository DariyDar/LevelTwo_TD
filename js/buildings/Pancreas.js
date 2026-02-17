// GlucoDefense — Pancreas building (auto-spawns priests, bonus on click)

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';
import { Priest } from '../entities/Priest.js';
import { playDegradation, playDefeat } from '../audio.js';
import { calculateBG } from '../systems/bgSystem.js';

export class Pancreas {
  constructor() {
    this.x = CONFIG.PANCREAS_POS.x;
    this.y = CONFIG.PANCREAS_POS.y;
    this.hp = CONFIG.PANCREAS_HP;
    this.maxHp = CONFIG.PANCREAS_HP;
    this.spawnTimer = 0;
  }

  update(dt) {
    const deg = gameState.degradation;
    if (deg >= 5) return;

    // Auto-spawn priests on a timer
    // insulinProductionRate < 1.0 → longer intervals (less insulin)
    const baseInterval = CONFIG.PANCREAS_AUTO_SPAWN_INTERVAL[Math.min(deg, 4)];
    const rate = gameState._insulinProductionRate ?? 1.0;

    // GSIS: higher BG → faster insulin production (beta cells sense glucose)
    const bg = calculateBG();
    let bgStim = 1.0;
    for (const zone of CONFIG.PANCREAS_BG_STIM_ZONES) {
      if (bg >= zone.threshold) bgStim = zone.multiplier;
    }
    this._lastBgStim = bgStim; // exposed for UI tooltip

    const interval = rate > 0 ? baseInterval / (rate * bgStim) : 999;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = interval;
      this._autoSpawnPriest();
    }
  }

  _autoSpawnPriest() {
    const deg = gameState.degradation;
    const maxPriests = CONFIG.PANCREAS_MAX_PRIESTS[Math.min(deg, 4)];
    const activePriests = gameState.priests.filter(p => p.alive).length;
    if (activePriests >= maxPriests) return;

    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 30;
    const priest = new Priest(this.x + offsetX, this.y + offsetY + 40);
    gameState.priests.push(priest);
  }

  // Called from manual "Bonus Priests" button — spawns insulin burst
  spawnBonusPriests(count) {
    const deg = gameState.degradation;
    if (deg >= 5) return false;

    const maxPriests = CONFIG.PANCREAS_MAX_PRIESTS[Math.min(deg, 4)];
    let activePriests = gameState.priests.filter(p => p.alive).length;
    let spawned = 0;

    for (let i = 0; i < count; i++) {
      if (activePriests >= maxPriests) break;

      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 30;
      const priest = new Priest(this.x + offsetX, this.y + offsetY + 40);
      gameState.priests.push(priest);
      activePriests++;
      spawned++;
    }

    return spawned > 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = this.maxHp;

      // Skip degradation if disabled for this patient (e.g., Healthy)
      if (gameState._degradationDisabled) return;

      gameState.degradation++;
      playDegradation();

      if (gameState.degradation >= 5) {
        playDefeat();
        gameState.phase = GamePhase.GAME_OVER;
        gameState.gameOverReason = 'pancreas_destroyed';
      }
    }
  }
}
