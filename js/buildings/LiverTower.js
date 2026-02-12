// GlucoDefense — Liver Tower building (auto-spawns knights, stores glucose)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { Knight } from '../entities/Knight.js';
import { Peasant, PeasantState } from '../entities/Peasant.js';
import { spendEnergy } from '../systems/energySystem.js';
import { calculateBG } from '../systems/bgSystem.js';

export class LiverTower {
  constructor() {
    this.x = CONFIG.LIVER_POS.x;
    this.y = CONFIG.LIVER_POS.y;
    this.storage = 0;
    this.spawnTimer = CONFIG.LIVER_AUTO_SPAWN_INTERVAL;
    this.releaseTimer = 0; // auto-glycogenolysis cooldown

    // HP for rebel attacks
    this.hp = CONFIG.LIVER_HP;
    this.maxHp = CONFIG.LIVER_HP;
    this.destroyed = false;
    this.repairTimer = 0;
  }

  get maxStorage() {
    return CONFIG.LIVER_STORAGE[Math.min(gameState.degradation, 5)];
  }

  update(dt) {
    // Handle repair
    if (this.destroyed) {
      this.repairTimer -= dt;
      if (this.repairTimer <= 0) {
        this.destroyed = false;
        this.hp = this.maxHp;
      }
      return;
    }

    // Auto-spawn knights on a timer
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = CONFIG.LIVER_AUTO_SPAWN_INTERVAL;
      this._autoSpawnKnight();
    }

    // Auto-glycogenolysis: liver releases stored glucose when BG drops low
    // Biologically: glucagon signals liver to convert glycogen → glucose
    // Only check BG on timer expiry to avoid per-frame calculateBG() calls
    if (this.releaseTimer > 0) this.releaseTimer -= dt;
    if (this.storage > 0 && this.releaseTimer <= 0) {
      this.releaseTimer = CONFIG.LIVER_AUTO_RELEASE_INTERVAL;
      const bg = calculateBG();
      if (bg < CONFIG.LIVER_RELEASE_THRESHOLD_BG && !gameState.interventions.metformin.active) {
        const count = Math.min(CONFIG.LIVER_RELEASE_RATE, this.storage);
        for (let i = 0; i < count; i++) {
          this._releasePeasant();
        }
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

  _autoSpawnKnight() {
    if (this.destroyed) return;

    const activeKnights = gameState.knights.filter(k => k.alive).length;
    if (activeKnights >= CONFIG.LIVER_MAX_KNIGHTS) return;

    const maxStorage = CONFIG.LIVER_STORAGE[Math.min(gameState.degradation, 5)];
    if (this.storage >= maxStorage * CONFIG.LIVER_OVERFLOW_THRESHOLD) return;

    const pos = CONFIG.KNIGHT_POSITIONS[activeKnights % CONFIG.KNIGHT_POSITIONS.length];
    const knight = new Knight(pos.x, pos.y);
    gameState.knights.push(knight);
  }

  // Called from manual "Spawn Knight" bonus — spawns multiple knights at once
  spawnKnightBonus() {
    if (this.destroyed) return false;
    if (!spendEnergy(CONFIG.LIVER_KNIGHT_COST)) return false;

    const count = CONFIG.LIVER_BONUS_KNIGHT_COUNT;
    for (let i = 0; i < count; i++) {
      const activeKnights = gameState.knights.filter(k => k.alive).length;
      if (activeKnights >= CONFIG.LIVER_MAX_KNIGHTS) break;

      const pos = CONFIG.KNIGHT_POSITIONS[activeKnights % CONFIG.KNIGHT_POSITIONS.length];
      const knight = new Knight(pos.x, pos.y);
      gameState.knights.push(knight);
    }

    return true;
  }

  // Called from manual "Release Reserves" button
  releaseReserves() {
    if (this.destroyed) return false;
    if (this.storage <= 0) return false;
    if (gameState.interventions.metformin.active) return false;

    const count = Math.min(CONFIG.MANUAL_RELEASE_COUNT, this.storage);
    let released = 0;
    for (let i = 0; i < count; i++) {
      if (!this._releasePeasant()) break;
      released++;
    }

    return released > 0;
  }

  _releasePeasant() {
    if (this.storage <= 0) return false;

    this.storage--;

    // Released glucose goes to muscle zone as red — needs priest to convert
    const zone = CONFIG.MUSCLE_ZONE;
    const peasant = new Peasant(this.x + 50, this.y + (Math.random() - 0.5) * 30, CONFIG.SPEED_MEDIUM);
    peasant.color = 'red';
    peasant.state = PeasantState.WAITING_FOR_PRIEST;
    peasant.waitTimer = 0;
    peasant.waypointIndex = 999;
    peasant.roamTargetX = zone.x1 + Math.random() * (zone.x2 - zone.x1);
    peasant.roamTargetY = zone.y1 + Math.random() * (zone.y2 - zone.y1);

    gameState.peasants.push(peasant);
    return true;
  }
}
