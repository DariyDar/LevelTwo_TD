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
  const patientDrainMult = gameState._energyDrainMultiplier ?? 1.0;
  gameState.energy -= CONFIG.ENERGY_BASAL_DRAIN * drainMult * patientDrainMult * dt;

  // Cap energy
  gameState.energy = Math.min(gameState.energy, gameState.energyMax);

  // Blackout check
  // Healthy patients (degradation disabled) have fat reserves — energy never fully depletes
  if (gameState.energy <= 0) {
    if (gameState._degradationDisabled) {
      gameState.energy = 1; // clamp to minimum — body taps fat reserves
    } else {
      gameState.energy = 0;
      playBlackout();
      gameState.phase = GamePhase.GAME_OVER;
      gameState.gameOverReason = 'blackout';
    }
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
