// GlucoDefense — Central game state (single source of truth)

import { CONFIG } from './config.js';

export const GamePhase = {
  MENU: 'menu',
  MEAL_PLAN: 'meal_plan',
  FOOD_CHOICE: 'food_choice',
  PLAYING: 'playing',
  BETWEEN_WAVES: 'between_waves',
  GAME_OVER: 'game_over',
};

export function createGameState() {
  return {
    phase: GamePhase.MENU,
    level: 1,
    degradation: 0,

    energy: CONFIG.ENERGY_START,
    energyMax: CONFIG.ENERGY_MAX,

    // Entity arrays
    peasants: [],
    priests: [],
    knights: [],
    boats: [],

    // Effects
    effects: [],

    // Semaglutide mines on the road
    semaglutideMines: [],

    // UI hover tracking
    hoveredAction: null,
    hoveredBuilding: null,
    mouseX: 0,
    mouseY: 0,

    // Kidney filtration circle
    kidneyCircle: null,

    // Buildings (initialized per level)
    liverTower: null,
    pancreas: null,
    kidneys: null,
    mines: [],

    // Wave management
    currentWaveIndex: 0,
    waves: [],
    waveTimer: 0,
    betweenWaveTimer: 0,
    nextWaveCountdown: 0,
    allWavesSent: false,
    foodChoices: null,
    mealPlan: [],

    // Manual core action cooldowns
    manualCooldowns: {
      priest: 0,
      knight: 0,
      vortex: 0,
      release: 0,
    },

    // Interventions
    interventions: {
      exercise: { active: false, cooldown: 0, timer: 0 },
      semaglutide: { charges: 0 },
      dapagliflozin: { charges: 0 },
      metformin: { active: false, charges: 0, timer: 0 },
      walk: { cooldown: 0 },
    },

    // Stats
    stats: {
      totalRebels: 0,
      totalWorkers: 0,
      peakBG: 0,
      energyLowPoints: 0,
    },

    // Level config reference
    levelConfig: null,

    // Progress (localStorage backed)
    unlockedLevel: 1,

    // Hypoglycemia tracking
    hypoDuration: 0,

    // Juice/snack cooldown
    juiceCooldown: 0,

    // Day clock (seconds elapsed since 6:00)
    dayClock: 0,

    // Game over
    gameOverReason: null,
  };
}

export let gameState = createGameState();

export function resetGameState() {
  const prevDeg = gameState.degradation;
  const prevUnlocked = gameState.unlockedLevel;
  Object.assign(gameState, createGameState());
  gameState.degradation = prevDeg;
  gameState.unlockedLevel = prevUnlocked;
}

export function fullReset() {
  const prevUnlocked = gameState.unlockedLevel;
  Object.assign(gameState, createGameState());
  gameState.unlockedLevel = prevUnlocked;
}
