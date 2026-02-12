// GlucoDefense — Energy system (ATP production/consumption)

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';
import { PeasantState } from '../entities/Peasant.js';
import { playBlackout } from '../audio.js';

export function updateEnergy(dt) {
  if (gameState.phase === GamePhase.GAME_OVER) return;

  // Income: workers on mines
  let workerCount = 0;
  for (const mine of gameState.mines) {
    workerCount += mine.workers.length;
  }

  const ratePerWorker = gameState.interventions.exercise.active
    ? CONFIG.MINE_ENERGY_PER_WORKER * 2
    : CONFIG.MINE_ENERGY_PER_WORKER;

  gameState.energy += workerCount * ratePerWorker * dt;

  // Basal metabolism drain — cells always consume ATP
  // Hypoglycemia multiplier: brain demands more energy when BG is low
  let drainMult = 1;
  if (gameState.hypoDuration > 10) {
    drainMult = 3;
  } else if (gameState.hypoDuration > 0) {
    drainMult = 2;
  }
  gameState.energy -= CONFIG.ENERGY_BASAL_DRAIN * drainMult * dt;

  // Cap energy
  gameState.energy = Math.min(gameState.energy, gameState.energyMax);

  // Blackout check
  if (gameState.energy <= 0) {
    gameState.energy = 0;
    playBlackout();
    gameState.phase = GamePhase.GAME_OVER;
    gameState.gameOverReason = 'blackout';
  }

  // Track stats
  if (gameState.energy < gameState.energyMax * 0.3) {
    gameState.stats.energyLowPoints++;
  }
}

export function spendEnergy(amount) {
  if (gameState.energy < amount) return false;
  gameState.energy -= amount;
  return true;
}

export function getEnergyPercent() {
  return gameState.energy / gameState.energyMax;
}

export function isHypoglycemic() {
  return getEnergyPercent() < 0.3;
}

export function isCriticalHypoglycemia() {
  return getEnergyPercent() < 0.1;
}
