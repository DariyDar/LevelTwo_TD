// GlucoDefense — Plan executor (auto-executes planned meals and interventions)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { Boat } from '../entities/Boat.js';
import { food } from '../levels/foodData.js';
import { getVirtualHour } from './waveManager.js';
import { recordEvent } from './bgHistory.js';
import {
  activateWalk,
  activateExercise,
  activateSpawnPriest,
  activateSemaglutide,
  activateDapagliflozin,
  activateMetformin,
} from './interventions.js';
import { playFoodSelect } from '../audio.js';

export function initPlanExecutor() {
  const plan = gameState.currentPlan;
  if (!plan) return;

  // Reset executed flags
  for (const meal of plan.meals) {
    meal.executed = false;
  }
  for (const iv of plan.interventions) {
    iv.executed = false;
  }
}

export function updatePlanExecutor(dt) {
  const plan = gameState.currentPlan;
  if (!plan) return;

  const currentHour = getVirtualHour();

  // Execute meals when their scheduled hour arrives
  for (const meal of plan.meals) {
    if (meal.executed) continue;
    if (currentHour >= meal.hour) {
      meal.executed = true;
      executeMeal(meal);
    }
  }

  // Execute interventions when their scheduled hour arrives
  for (const iv of plan.interventions) {
    if (iv.executed) continue;
    if (currentHour >= iv.hour) {
      iv.executed = true;
      executeIntervention(iv);
    }
  }

  // Check if all waves sent (all meals executed)
  const allMealsExecuted = plan.meals.every(m => m.executed);
  if (allMealsExecuted) {
    gameState.allWavesSent = true;
    gameState.currentWaveIndex = plan.meals.length;
  }
}

function executeMeal(meal) {
  const foods = meal.foodKeys
    .map(key => { try { return food(key); } catch (_) { return null; } })
    .filter(f => f !== null);
  if (foods.length === 0) return;

  playFoodSelect();
  const boat = new Boat(foods);
  gameState.boats.push(boat);

  const foodLabel = foods.map(f => f.emoji).join(' ');
  recordEvent('food', foodLabel);
}

function executeIntervention(iv) {
  switch (iv.type) {
    case 'walk': activateWalk(); break;
    case 'exercise': activateExercise(); break;
    case 'insulin': activateSpawnPriest(iv.dose || CONFIG.PANCREAS_BONUS_COUNT); break;
    case 'semaglutide': activateSemaglutide(); break;
    case 'dapagliflozin': activateDapagliflozin(); break;
    case 'metformin': activateMetformin(); break;
  }
}
