// GlucoDefense — Wave manager (scheduling, meal plan, boat spawning)

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';
import { Boat } from '../entities/Boat.js';
import { PeasantState } from '../entities/Peasant.js';
import { getLevel } from '../levels/index.js';
import { playWaveStart, playFoodSelect, playVictory } from '../audio.js';
import { food } from '../levels/foodData.js';
import { recordEvent } from './bgHistory.js';

// Convert dayClock (real seconds) to virtual hour (float, e.g. 13.5 = 13:30)
export function getVirtualHour() {
  const elapsedMinutes = gameState.dayClock * CONFIG.DAY_SPEED;
  return CONFIG.DAY_START_HOUR + elapsedMinutes / 60;
}

// Format virtual hour to HH:MM string
export function formatVirtualTime(hour) {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Parse "HH:MM" string to float hour
function parseTimeToHour(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':').map(Number);
  const h = parts[0];
  const m = parts[1] || 0;
  if (isNaN(h) || isNaN(m)) return 0;
  return h + m / 60;
}

export function updateWaveManager(dt) {
  if (gameState.phase !== GamePhase.PLAYING && gameState.phase !== GamePhase.BETWEEN_WAVES) return;

  // Day clock (real seconds elapsed since start)
  gameState.dayClock += dt;

  // Juice cooldown
  if (gameState.juiceCooldown > 0) gameState.juiceCooldown -= dt;

  // Time-based wave scheduling (skipped when plan executor handles meals)
  if (!gameState.allWavesSent && !gameState.currentPlan) {
    const currentHour = getVirtualHour();
    const nextIdx = gameState.currentWaveIndex;

    if (nextIdx < gameState.waves.length) {
      const nextWave = gameState.waves[nextIdx];
      const waveHour = parseTimeToHour(nextWave.time);

      // Calculate countdown in real seconds for UI
      const minutesUntil = (waveHour - currentHour) * 60;
      const realSecondsUntil = minutesUntil / CONFIG.DAY_SPEED;
      gameState.nextWaveCountdown = Math.max(0, realSecondsUntil);

      if (currentHour >= waveHour) {
        sendNextWave();
      }
    }
  }

  // Victory check: day ended (24:00) AND battlefield clear
  const hour = getVirtualHour();
  if (hour >= CONFIG.DAY_END_HOUR && gameState.allWavesSent) {
    checkVictory();
  }
}

function sendNextWave() {
  if (gameState.currentWaveIndex >= gameState.waves.length) {
    gameState.allWavesSent = true;
    return;
  }

  const choiceIndex = gameState.mealPlan[gameState.currentWaveIndex] || 0;
  const wave = gameState.waves[gameState.currentWaveIndex];
  const choice = wave.choices[choiceIndex];

  const foods = choice.foods.map(f => ({ ...f }));

  // Create boat
  playFoodSelect();
  const boat = new Boat(foods);
  gameState.boats.push(boat);

  // Log food event for BG graph
  const foodLabel = foods.map(f => f.emoji || f.name).join(' ');
  recordEvent('food', foodLabel);

  // Advance wave index
  gameState.currentWaveIndex++;

  // Check if more waves remain
  if (gameState.currentWaveIndex >= gameState.waves.length) {
    gameState.allWavesSent = true;
  }

  gameState.phase = GamePhase.PLAYING;
}

export function triggerNextWave() {
  // Called to kick off the first wave after meal plan
  // Don't auto-send — the day clock will handle it
  gameState.phase = GamePhase.PLAYING;
}

export function triggerEarlyWave() {
  if (gameState.allWavesSent) return false;
  if (gameState.currentWaveIndex >= gameState.waves.length) return false;

  // Send the meal NOW — don't fast-forward clock
  // Simulates eating early; day continues normally
  sendNextWave();
  return true;
}

function checkVictory() {
  const activeNonWorkers = gameState.peasants.filter(
    p => p.alive && p.state !== PeasantState.WORKER
  ).length;
  const activeBoats = gameState.boats.filter(b => b.alive).length;

  if (activeNonWorkers === 0 && activeBoats === 0) {
    playVictory();
    gameState.phase = GamePhase.GAME_OVER;
    gameState.gameOverReason = 'victory';
  }
}

export function startBetweenWaves(delay) {
  gameState.phase = GamePhase.BETWEEN_WAVES;
  gameState.betweenWaveTimer = delay;
}

// Legacy: still used if FOOD_CHOICE phase is active
export function selectFood(choiceIndex) {
  if (!gameState.foodChoices || choiceIndex >= gameState.foodChoices.length) return;
}

// Load a level by ID
export function loadLevel(levelId) {
  const level = getLevel(levelId);
  if (!level) return false;

  gameState.level = levelId;
  gameState.waves = level.waves;
  gameState.currentWaveIndex = 0;
  gameState.allWavesSent = false;
  gameState.nextWaveCountdown = 0;
  gameState.dayClock = 0;
  gameState.juiceCooldown = 0;

  // Set up interventions from level config
  const iv = gameState.interventions;
  const cfg = level.interventions;

  iv.exercise.active = false;
  iv.exercise.cooldown = 0;
  iv.exercise.timer = 0;

  iv.semaglutide.charges = cfg.semaglutide ? cfg.semaglutide.charges : 0;

  iv.dapagliflozin.charges = cfg.dapagliflozin ? cfg.dapagliflozin.charges : 0;

  iv.metformin.charges = cfg.metformin ? cfg.metformin.charges : 0;
  iv.metformin.active = false;
  iv.metformin.timer = 0;

  iv.walk.cooldown = 0;

  gameState.levelConfig = level;

  return true;
}

// Spawn an unplanned juice/snack boat (fast glucose spike)
export function spawnJuice() {
  if (gameState.phase !== GamePhase.PLAYING && gameState.phase !== GamePhase.BETWEEN_WAVES) return false;

  const juiceCd = gameState.juiceCooldown || 0;
  if (juiceCd > 0) return false;

  let juiceFood;
  try {
    juiceFood = food('juice');
  } catch (_) {
    return false;
  }

  playFoodSelect();
  const boat = new Boat([juiceFood]);
  gameState.boats.push(boat);
  gameState.juiceCooldown = CONFIG.JUICE_COOLDOWN;
  recordEvent('food', '\u{1F9C3} Juice');

  return true;
}

export function createTestWaves() {
  loadLevel(1);
}
