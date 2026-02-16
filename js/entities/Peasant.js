// GlucoDefense — Peasant entity (Glucose molecule)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { createAnimState } from '../spriteAnimator.js';

export const PeasantState = {
  WALKING_TO_VILLAGE: 'walking_to_village',
  BEING_ESCORTED: 'being_escorted',
  WAITING_FOR_PRIEST: 'waiting_for_priest',
  BEING_CONVERTED: 'being_converted',
  WALKING_TO_MINE: 'walking_to_mine',
  WORKER: 'worker',
  REBEL: 'rebel',
  LEAVING: 'leaving',
  FILTERING: 'filtering',
};

export class Peasant {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.state = PeasantState.WALKING_TO_VILLAGE;
    this.color = 'red';
    this.speedCategory = 'fast'; // 'fast' (red) or 'slow' (orange)
    this.alive = true;

    // Rebel stats
    this.hp = CONFIG.REBEL_HP;

    // Worker stats
    this.workHp = CONFIG.WORKER_LIFETIME;

    // Movement
    this.waypointIndex = 0;
    this.waypoints = this._buildWaypoints();
    this.targetX = this.waypoints[0].x;
    this.targetY = this.waypoints[0].y;

    // Assignments
    this.assignedMine = null;
    this.assignedPriest = null;
    this.assignedKnight = null;

    // Timers
    this.waitTimer = 0;
    this.rebelThreshold = 0; // set when entering WAITING_FOR_PRIEST

    // Attack
    this.attackTarget = null;
    this.roamTargetX = 0;
    this.roamTargetY = 0;
    this.roamTimer = 0;

    // Sprite animation
    this.anim = createAnimState('pawn_red_run', CONFIG.SPRITE_FPS_DEFAULT);
  }

  _buildWaypoints() {
    const wp = CONFIG.WAYPOINTS;
    const randY = (base, spread) => base + (Math.random() - 0.5) * 2 * spread;

    return [
      { x: wp.SHORE.x, y: randY(wp.SHORE.y, 30) },
      { x: wp.BEFORE_LIVER.x, y: randY(wp.BEFORE_LIVER.y, 20) },
      { x: wp.AFTER_LIVER.x, y: randY(wp.AFTER_LIVER.y, 20) },
      { x: wp.VILLAGE_SQUARE.x, y: randY(wp.VILLAGE_SQUARE.y, 40) },
    ];
  }

  update(dt) {
    if (!this.alive) return;

    switch (this.state) {
      case PeasantState.WALKING_TO_VILLAGE:
        this._updateWalking(dt);
        break;
      case PeasantState.BEING_ESCORTED:
        // Movement handled by Knight
        break;
      case PeasantState.WAITING_FOR_PRIEST:
        this._updateWaiting(dt);
        break;
      case PeasantState.BEING_CONVERTED:
        // Wait for priest to finish cast
        break;
      case PeasantState.WALKING_TO_MINE:
        this._updateWalkingToMine(dt);
        break;
      case PeasantState.WORKER:
        this._updateWorker(dt);
        break;
      case PeasantState.REBEL:
        this._updateRebel(dt);
        break;
      case PeasantState.LEAVING:
        this._updateLeaving(dt);
        break;
      case PeasantState.FILTERING:
        // Movement handled by kidney filtration system
        break;
    }
  }

  _updateWalking(dt) {
    const arrived = this.moveToward(this.targetX, this.targetY, dt);

    if (arrived) {
      this.waypointIndex++;
      if (this.waypointIndex < this.waypoints.length) {
        this.targetX = this.waypoints[this.waypointIndex].x;
        this.targetY = this.waypoints[this.waypointIndex].y;
      } else {
        // Arrived at village square
        this.state = PeasantState.WAITING_FOR_PRIEST;
        this.waitTimer = 0;
        const priestMult = gameState._priestWaitMultiplier ?? 1.0;
        this.rebelThreshold = CONFIG.PRIEST_WAIT_TIMEOUT * priestMult * (0.5 + Math.random());
      }
    }
  }

  _updateWaiting(dt) {
    this.waitTimer += dt;
    const threshold = this.rebelThreshold || CONFIG.PRIEST_WAIT_TIMEOUT;
    if (this.waitTimer >= threshold) {
      this.becomeRebel();
      return;
    }
    // Roam in the muscle zone while waiting for priest
    this._roamMuscleZone(dt);
  }

  _updateWalkingToMine(dt) {
    if (!this.assignedMine) return;
    const arrived = this.moveToward(this.targetX, this.targetY, dt);
    if (arrived) {
      this.state = PeasantState.WORKER;
    }
  }

  _updateWorker(dt) {
    const exerciseActive = gameState.interventions.exercise.active;
    const multiplier = exerciseActive ? 2 : 1;
    this.workHp -= dt * multiplier;
    if (this.workHp <= 0) {
      this.die();
    }
  }

  _updateRebel(dt) {
    this.hp -= CONFIG.REBEL_HP_DECAY * dt;
    if (this.hp <= 0) {
      this.die();
      return;
    }
    // Only roam when not attacking (combat system handles movement when attacking)
    if (!this.attackTarget) {
      this._roam(dt);
    }
  }

  _updateLeaving(dt) {
    this.moveToward(-50, this.y, dt);
    if (this.x <= -40) {
      this.die();
    }
  }

  _roamMuscleZone(dt) {
    this.roamTimer -= dt;
    if (this.roamTimer <= 0) {
      const zone = CONFIG.MUSCLE_ZONE;
      this.roamTargetX = zone.x1 + Math.random() * (zone.x2 - zone.x1);
      this.roamTargetY = zone.y1 + Math.random() * (zone.y2 - zone.y1);
      this.roamTimer = 1.5 + Math.random() * 2;
    }
    this.moveToward(this.roamTargetX, this.roamTargetY, dt);
  }

  _roam(dt) {
    this.roamTimer -= dt;
    if (this.roamTimer <= 0) {
      const zone = CONFIG.MUSCLE_ZONE;
      this.roamTargetX = zone.x1 + Math.random() * (zone.x2 - zone.x1);
      this.roamTargetY = zone.y1 + Math.random() * (zone.y2 - zone.y1);
      this.roamTimer = 1 + Math.random() * 2;
    }
    this.moveToward(this.roamTargetX, this.roamTargetY, dt);
  }

  moveToward(tx, ty, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return true;

    // Update sprite facing direction
    if (this.anim && Math.abs(dx) > 0.5) {
      this.anim.facingRight = dx > 0;
    }

    const step = this.speed * dt;
    if (step >= dist) {
      this.x = tx;
      this.y = ty;
      return true;
    }

    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    return false;
  }

  becomeRebel() {
    this.state = PeasantState.REBEL;
    this.color = 'red';
    this.hp = CONFIG.REBEL_HP;
    this.roamTimer = 0;
  }

  convertToWorker(priest) {
    this.state = PeasantState.WALKING_TO_MINE;
    this.color = 'purple';
    this.assignedPriest = priest;
    this.workHp = CONFIG.WORKER_LIFETIME;
  }

  assignToMine(mine, slotIndex) {
    this.assignedMine = mine;
    const offset = CONFIG.WORKER_OFFSETS[slotIndex];
    this.targetX = mine.x + offset.dx;
    this.targetY = mine.y + offset.dy;
  }

  die() {
    this.alive = false;

    // Free mine slot
    if (this.assignedMine) {
      const idx = this.assignedMine.workers.indexOf(this);
      if (idx !== -1) this.assignedMine.workers.splice(idx, 1);
      this.assignedMine = null;
    }

    // Clear priest reference (priest is already consumed on conversion)
    if (this.assignedPriest) {
      this.assignedPriest = null;
    }
  }
}
