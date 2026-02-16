// GlucoDefense — Boat entity (Food delivery)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { Peasant } from './Peasant.js';
import { createAnimState } from '../spriteAnimator.js';

export class Boat {
  constructor(foods) {
    this.x = CONFIG.BOAT_SPAWN.x;
    this.y = CONFIG.BOAT_SPAWN.y;
    this.speed = CONFIG.BOAT_SPEED;
    this.alive = true;

    // Food info (array of food items for this boat)
    this.foods = foods;
    this.emoji = foods.map(f => f.emoji).join('');

    // Calculate totals
    this.totalPeasants = foods.reduce((sum, f) => sum + f.count, 0);
    const firstSpeed = foods.length > 0 ? foods[0].speed : 'medium';
    this.peasantSpeed = this._getSpeed(firstSpeed);
    this.speedCategory = this._getSpeedCategory(firstSpeed);

    // Determine boat size and unload time
    this.boatSize = this._getBoatSize(this.totalPeasants);
    this.unloadTime = this._getUnloadTime(this.boatSize);

    // Sprite animation
    this.anim = createAnimState('boat_idle', 4);

    // State
    this.state = 'sailing'; // sailing | unloading | done
    this.unloadedCount = 0;
    this.unloadTimer = 0;
    this.unloadInterval = this.totalPeasants > 0 ? this.unloadTime / this.totalPeasants : 1;
  }

  _getSpeed(speedKey) {
    switch (speedKey) {
      case 'very_fast': return CONFIG.SPEED_VERY_FAST;
      case 'fast': return CONFIG.SPEED_FAST;
      case 'medium': return CONFIG.SPEED_MEDIUM;
      case 'slow': return CONFIG.SPEED_SLOW;
      default: return CONFIG.SPEED_MEDIUM;
    }
  }

  _getSpeedCategory(speedKey) {
    if (speedKey === 'slow') return 'slow';
    return 'fast';
  }

  _getBoatSize(count) {
    if (count <= 50) return 'S';
    if (count <= 120) return 'M';
    return 'L';
  }

  _getUnloadTime(size) {
    switch (size) {
      case 'S': return CONFIG.UNLOAD_TIME_S;
      case 'M': return CONFIG.UNLOAD_TIME_M;
      case 'L': return CONFIG.UNLOAD_TIME_L;
      default: return CONFIG.UNLOAD_TIME_M;
    }
  }

  update(dt) {
    if (!this.alive) return;

    switch (this.state) {
      case 'sailing':
        this._updateSailing(dt);
        break;
      case 'unloading':
        this._updateUnloading(dt);
        break;
    }
  }

  _updateSailing(dt) {
    const destX = CONFIG.BOAT_DEST.x;
    const dx = destX - this.x;

    if (Math.abs(dx) < 2) {
      this.x = destX;
      this.state = 'unloading';
      this.unloadTimer = 0;
      return;
    }

    this.x += Math.sign(dx) * this.speed * dt;
  }

  _updateUnloading(dt) {
    if (this.unloadedCount >= this.totalPeasants) {
      this.alive = false;
      return;
    }

    this.unloadTimer += dt;

    while (this.unloadTimer >= this.unloadInterval && this.unloadedCount < this.totalPeasants) {
      this.unloadTimer -= this.unloadInterval;
      this._spawnPeasant();
      this.unloadedCount++;
    }
  }

  _spawnPeasant() {
    // Spread spawn across a wider area to avoid traffic jams
    const x = this.x + Math.random() * 40;
    const y = this.y + (Math.random() - 0.5) * 80;
    const peasant = new Peasant(x, y, this.peasantSpeed);
    peasant.speedCategory = this.speedCategory;
    gameState.peasants.push(peasant);
  }
}
