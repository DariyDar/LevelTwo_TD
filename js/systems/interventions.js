// GlucoDefense — Core actions + intervention effects

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { Priest } from '../entities/Priest.js';
import { PeasantState } from '../entities/Peasant.js';
import { spendEnergy } from './energySystem.js';
import { findLeastFilledMine } from '../buildings/Mine.js';
import { recordEvent } from './bgHistory.js';

export function updateInterventions(dt) {
  const iv = gameState.interventions;
  const cd = gameState.manualCooldowns;

  // Manual core action cooldowns (vortex uses building cooldown directly)
  if (cd.priest > 0) cd.priest -= dt;
  if (cd.knight > 0) cd.knight -= dt;
  if (cd.release > 0) cd.release -= dt;
  if (iv.walk.cooldown > 0) iv.walk.cooldown -= dt;

  // Intervention cooldowns
  if (iv.exercise.cooldown > 0) iv.exercise.cooldown -= dt;

  // Active timers
  if (iv.exercise.active) {
    iv.exercise.timer -= dt;
    if (iv.exercise.timer <= 0) {
      iv.exercise.active = false;
    }
  }

  if (iv.metformin.active) {
    iv.metformin.timer -= dt;
    if (iv.metformin.timer <= 0) {
      iv.metformin.active = false;
    }
  }

  // Semaglutide mines
  updateSemaglutideMines(dt);
}

// === SEMAGLUTIDE MINES UPDATE ===
function updateSemaglutideMines(dt) {
  const mines = gameState.semaglutideMines;
  if (mines.length === 0) return;

  for (let i = mines.length - 1; i >= 0; i--) {
    const mine = mines[i];
    mine.timer -= dt;
    if (mine.timer <= 0) {
      mines.splice(i, 1);
      continue;
    }

    // Check collision with glucose peasants
    for (const p of gameState.peasants) {
      if (!p.alive) continue;
      if (p.state === PeasantState.WORKER ||
          p.state === PeasantState.BEING_ESCORTED) continue;

      const dx = p.x - mine.x;
      const dy = p.y - mine.y;
      const dist = dx * dx + dy * dy;

      if (dist < 15 * 15) {
        // Mine explodes, glucose dies
        p.alive = false;
        mines.splice(i, 1);

        gameState.effects.push({
          type: 'semaglutide_explosion',
          x: mine.x,
          y: mine.y,
          timer: 0.5,
          maxTimer: 0.5,
          particles: Array.from({ length: 8 }, () => ({
            dx: (Math.random() - 0.5) * 120,
            dy: (Math.random() - 0.5) * 120,
          })),
        });
        break;
      }
    }
  }
}

// === CORE ACTIONS (always available, player-activated) ===

// Spawn Bonus Priests — extra insulin burst (dose = number of units)
// Pancreas secretion is autonomous — no ATP cost to the player
// Type 1 patients: limited insulin charges (injections)
export function activateSpawnPriest(dose = CONFIG.PANCREAS_BONUS_COUNT) {
  const cd = gameState.manualCooldowns;
  if (cd.priest > 0) return false;

  // Validate insulin charges available (don't spend yet)
  if (gameState._insulinCharges != null) {
    if (gameState._insulinCharges <= 0) return false;
  }

  if (!gameState.pancreas) return false;
  if (!gameState.pancreas.spawnBonusPriests(dose)) return false;

  // Spend charge only after successful spawn
  if (gameState._insulinCharges != null) {
    gameState._insulinCharges--;
  }

  cd.priest = CONFIG.MANUAL_PRIEST_COOLDOWN;
  return true;
}

// Spawn Knight Bonus — spawns knights at once
export function activateSpawnKnight() {
  const cd = gameState.manualCooldowns;
  if (cd.knight > 0) return false;

  if (!gameState.liverTower) return false;
  if (!gameState.liverTower.spawnKnightBonus()) return false;

  cd.knight = CONFIG.MANUAL_KNIGHT_COOLDOWN;
  return true;
}

// Kidney Vortex — manual filtration circle (captures any free glucose)
export function activateKidneyVortex() {
  if (!gameState.kidneys) return false;
  if (gameState.kidneys.cooldown > 0) return false;

  // Check if there's any glucose the circle could capture
  const filterable = gameState.peasants.some(
    p => p.alive &&
         p.state !== PeasantState.WORKER &&
         p.state !== PeasantState.BEING_ESCORTED &&
         p.state !== PeasantState.WALKING_TO_MINE &&
         p.state !== PeasantState.FILTERING
  );
  if (!filterable) return false;

  return gameState.kidneys.castVortex([], false);
}

// Release Reserves — manual glycogenolysis (auto-triggered by liver, not a button)
export function activateReleaseReserves() {
  const cd = gameState.manualCooldowns;
  if (cd.release > 0) return false;

  if (!gameState.liverTower) return false;
  if (gameState.liverTower.storage <= 0) return false;
  if (!gameState.liverTower.releaseReserves()) return false;

  cd.release = CONFIG.MANUAL_RELEASE_COOLDOWN;
  return true;
}

// Light Walk — muscles absorb glucose directly (non-insulin-dependent uptake)
export function activateWalk() {
  const iv = gameState.interventions.walk;
  if (iv.cooldown > 0) return false;
  if (!spendEnergy(CONFIG.WALK_COST)) return false;

  iv.cooldown = CONFIG.WALK_COOLDOWN;
  recordEvent('intervention', '\u{1F6B6} Walk');

  // Collect convertible glucose: waiting, rebels, walking
  const targets = gameState.peasants.filter(
    p => p.alive && (
      p.state === PeasantState.WAITING_FOR_PRIEST ||
      p.state === PeasantState.REBEL ||
      p.state === PeasantState.WALKING_TO_VILLAGE
    )
  );

  const count = CONFIG.WALK_REBELS_MIN +
    Math.floor(Math.random() * (CONFIG.WALK_REBELS_MAX - CONFIG.WALK_REBELS_MIN + 1));

  // Fisher-Yates shuffle
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  const toConvert = targets.slice(0, Math.min(count, targets.length));

  for (const peasant of toConvert) {
    // Clear any combat/priest assignments
    peasant.attackTarget = null;
    if (peasant.assignedPriest) {
      peasant.assignedPriest._resetToIdle();
      peasant.assignedPriest = null;
    }

    // Direct conversion — muscle absorbs glucose without insulin
    peasant.convertToWorker(null);
    const mine = findLeastFilledMine(gameState.mines);
    if (mine) {
      mine.addWorker(peasant);
    }
    gameState.stats.totalWorkers++;

    // Green particle burst (exercise-driven uptake)
    gameState.effects.push({
      type: 'priest_convert',
      x: peasant.x,
      y: peasant.y,
      timer: 0.4,
      maxTimer: 0.4,
      particles: Array.from({ length: 6 }, () => ({
        dx: (Math.random() - 0.5) * 60,
        dy: (Math.random() - 0.5) * 60,
      })),
    });
  }

  return true;
}

// === INTERVENTIONS (level-dependent, limited charges) ===

// Exercise — workers produce more, die faster
export function activateExercise() {
  const iv = gameState.interventions.exercise;
  if (iv.active || iv.cooldown > 0) return false;
  if (!spendEnergy(CONFIG.EXERCISE_COST)) return false;

  iv.active = true;
  iv.timer = CONFIG.EXERCISE_DURATION;
  iv.cooldown = CONFIG.EXERCISE_COOLDOWN;
  recordEvent('intervention', '\u{1F3CB} Exercise');

  return true;
}

// Semaglutide (GLP-1 agonist) — places minefield on road
export function activateSemaglutide() {
  const iv = gameState.interventions.semaglutide;
  if (iv.charges <= 0) return false;

  iv.charges--;
  recordEvent('intervention', '\u{1F48A} Semaglutide');

  const roadY = CONFIG.ROAD_Y_CENTER;
  const xMin = CONFIG.SEMAGLUTIDE_MINE_X_MIN;
  const xMax = CONFIG.SEMAGLUTIDE_MINE_X_MAX;
  const ySpread = CONFIG.SEMAGLUTIDE_MINE_Y_SPREAD;

  for (let i = 0; i < CONFIG.SEMAGLUTIDE_MINE_COUNT; i++) {
    gameState.semaglutideMines.push({
      x: xMin + Math.random() * (xMax - xMin),
      y: roadY + (Math.random() - 0.5) * 2 * ySpread,
      timer: CONFIG.SEMAGLUTIDE_MINE_DURATION,
      maxTimer: CONFIG.SEMAGLUTIDE_MINE_DURATION,
    });
  }

  return true;
}

// Dapagliflozin — boosted kidney filtration circle
export function activateDapagliflozin() {
  const iv = gameState.interventions.dapagliflozin;
  if (iv.charges <= 0) return false;

  // Check if there's any glucose the circle could capture
  const filterable = gameState.peasants.some(
    p => p.alive &&
         p.state !== PeasantState.WORKER &&
         p.state !== PeasantState.BEING_ESCORTED &&
         p.state !== PeasantState.WALKING_TO_MINE &&
         p.state !== PeasantState.FILTERING
  );
  if (!filterable) return false;

  iv.charges--;
  recordEvent('intervention', '\u{1F9EA} SGLT2');

  if (gameState.kidneys) {
    gameState.kidneys.castVortex([], true);
  }

  return true;
}

// Metformin — liver holds + knights faster
export function activateMetformin() {
  const iv = gameState.interventions.metformin;
  if (iv.charges <= 0 || iv.active) return false;

  iv.charges--;
  iv.active = true;
  iv.timer = CONFIG.METFORMIN_DURATION;
  recordEvent('intervention', '\u{1F48A} Metformin');

  return true;
}

// Get all action/intervention status for UI
export function getInterventionStatus() {
  const iv = gameState.interventions;
  const cd = gameState.manualCooldowns;
  const cfg = gameState.levelConfig ? gameState.levelConfig.interventions : null;

  // Shortest cooldown between walk and exercise for physical activity button
  const walkCd = Math.max(0, iv.walk.cooldown);
  const exCd = Math.max(0, iv.exercise.cooldown);
  const physCd = Math.min(walkCd, exCd);

  // Core actions — ALWAYS available, ordered: GLUT4 → PhysActivity → Insulin → Filtration
  const coreActions = [
    {
      key: 'spawnKnight',
      name: `GLUT4 x${CONFIG.LIVER_BONUS_KNIGHT_COUNT}`,
      emoji: '\u{1F6E1}',
      cost: CONFIG.LIVER_KNIGHT_COST,
      charges: null,
      cooldown: Math.max(0, cd.knight),
      maxCooldown: CONFIG.MANUAL_KNIGHT_COOLDOWN,
      active: false,
      hasCharges: false,
      isCoreAction: true,
      activate: activateSpawnKnight,
    },
    {
      key: 'physicalActivity',
      name: 'Activity',
      emoji: '\u{1F3C3}',
      cost: 0,
      charges: null,
      cooldown: 0,
      maxCooldown: 0,
      active: iv.exercise.active,
      hasCharges: false,
      isCoreAction: true,
      activate: () => {}, // handled by sub-menu in bottomBar
    },
    {
      key: 'spawnPriest',
      name: 'Insulin',
      emoji: '\u{1F489}',
      cost: 0,
      charges: gameState._insulinCharges,
      cooldown: Math.max(0, cd.priest),
      maxCooldown: CONFIG.MANUAL_PRIEST_COOLDOWN,
      active: false,
      hasCharges: gameState._insulinCharges != null,
      isCoreAction: true,
      activate: () => {}, // handled by sub-menu in bottomBar
    },
    {
      key: 'kidneyVortex',
      name: 'Filtration',
      emoji: '\u{1F300}',
      cost: CONFIG.KIDNEY_COST,
      charges: null,
      cooldown: gameState.kidneys ? Math.max(0, gameState.kidneys.cooldown) : 0,
      maxCooldown: CONFIG.KIDNEY_COOLDOWN,
      active: false,
      hasCharges: false,
      isCoreAction: true,
      activate: activateKidneyVortex,
    },
  ];

  // Level interventions — medications only (exercise moved to Physical Activity sub-menu)
  const levelInterventions = [
    {
      key: 'semaglutide',
      name: 'Semaglutide',
      emoji: '\u{1F48A}',
      cost: 0,
      charges: iv.semaglutide.charges,
      cooldown: 0,
      maxCooldown: 0,
      active: false,
      hasCharges: true,
      activate: activateSemaglutide,
    },
    {
      key: 'dapagliflozin',
      name: 'SGLT2',
      emoji: '\u{1F9EA}',
      cost: 0,
      charges: iv.dapagliflozin.charges,
      cooldown: 0,
      maxCooldown: 0,
      active: false,
      hasCharges: true,
      activate: activateDapagliflozin,
    },
    {
      key: 'metformin',
      name: 'Metformin',
      emoji: '\u{1F48A}',
      cost: 0,
      charges: iv.metformin.charges,
      cooldown: 0,
      maxCooldown: 0,
      active: iv.metformin.active,
      hasCharges: true,
      activate: activateMetformin,
    },
  ];

  // Filter level interventions by availability
  let filtered = levelInterventions;
  if (cfg) {
    filtered = levelInterventions.filter(item => {
      const levelCfg = cfg[item.key];
      if (levelCfg === false || levelCfg === undefined) return false;
      if (levelCfg === true) return true;
      if (typeof levelCfg === 'object' && levelCfg.charges > 0) return true;
      return false;
    });
  }

  // Level interventions (medications) first, then core actions
  return [...filtered, ...coreActions];
}
