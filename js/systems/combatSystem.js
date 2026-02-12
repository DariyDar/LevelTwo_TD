// GlucoDefense — Combat system (rebel attacks on buildings)
// Rebels distribute evenly across all buildings (hyperglycemia damages all organs)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { PeasantState } from '../entities/Peasant.js';

export function updateCombat(dt) {
  const rebels = gameState.peasants.filter(p => p.alive && p.state === PeasantState.REBEL);
  const rebelCount = rebels.length;

  // Clear targets when rebel count drops below threshold
  if (rebelCount < CONFIG.REBELS_ATTACK_MINES) {
    for (const rebel of rebels) {
      rebel.attackTarget = null;
    }
    return;
  }

  // Process attacks
  for (const rebel of rebels) {
    if (rebel.attackTarget) {
      // Check if target is still valid
      if (_isTargetInvalid(rebel.attackTarget)) {
        rebel.attackTarget = null;
        continue;
      }

      const dx = rebel.attackTarget.x - rebel.x;
      const dy = rebel.attackTarget.y - rebel.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 25) {
        rebel.attackTarget.takeDamage(CONFIG.REBEL_BUILDING_DPS * dt);
      } else {
        rebel.moveToward(rebel.attackTarget.x, rebel.attackTarget.y, dt);
      }
    } else {
      rebel.attackTarget = findTarget(rebel, rebelCount);
    }
  }
}

function _isTargetInvalid(target) {
  if (!target) return true;
  if (target.destroyed) return true;
  if (target.hp !== undefined && target.hp <= 0) return true;
  return false;
}

function findTarget(rebel, rebelCount) {
  if (rebelCount < CONFIG.REBELS_ATTACK_MINES) return null;

  // Collect all valid targets: mines + liver + kidneys + pancreas
  const targets = [];

  for (const mine of gameState.mines) {
    if (!mine.destroyed) targets.push(mine);
  }

  if (gameState.liverTower && !gameState.liverTower.destroyed) {
    targets.push(gameState.liverTower);
  }

  if (gameState.kidneys && !gameState.kidneys.destroyed) {
    targets.push(gameState.kidneys);
  }

  if (gameState.pancreas && gameState.pancreas.hp > 0) {
    targets.push(gameState.pancreas);
  }

  if (targets.length === 0) return null;

  // Count current attackers per target
  const attackerCounts = new Map();
  for (const t of targets) attackerCounts.set(t, 0);

  for (const r of gameState.peasants) {
    if (!r.alive || r.state !== PeasantState.REBEL || !r.attackTarget) continue;
    const c = attackerCounts.get(r.attackTarget);
    if (c !== undefined) attackerCounts.set(r.attackTarget, c + 1);
  }

  // Pick target with fewest attackers (even distribution)
  let bestTarget = null;
  let minAttackers = Infinity;
  for (const [target, count] of attackerCounts) {
    if (count < minAttackers) {
      minAttackers = count;
      bestTarget = target;
    }
  }

  return bestTarget;
}

export function getRebelCount() {
  return gameState.peasants.filter(p => p.alive && p.state === PeasantState.REBEL).length;
}
