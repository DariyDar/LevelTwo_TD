// GlucoDefense — Central game state (single source of truth)

import { CONFIG } from './config.js';

export const GamePhase = {
  WELCOME: 'welcome',
  MENU: 'menu',
  MEAL_PLAN: 'meal_plan',
  FOOD_CHOICE: 'food_choice',
  PLANNING: 'planning',
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

    // BG history for graph
    bgHistory: [],       // Array of {hour: float, bg: number}
    bgEventLog: [],      // Array of {hour: float, type: string, label: string}
    bgSampleTimer: 0,

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

    // Patient system
    currentPatientId: null,
    currentDay: 0,

    // Patient physiology modifiers (applied by startDay)
    _insulinProductionRate: 1.0,
    _insulinSensitivity: 1.0,
    _degradationDisabled: false,
    _liverStorageMultiplier: 1.0,
    _insulinCharges: null,
    _insulinChargesMax: null,
    _energyDrainMultiplier: 1.0,
    _rebelDamageMultiplier: 1.0,
    _kidneyAutoFilterRate: 2.0,
    _kidneyAutoThreshold: null,   // per-patient override (null = use CONFIG)
    _kidneyAutoCooldown: null,    // per-patient override (null = use CONFIG)
    _liverReleaseRate: 1.0,
    _liverInitialStorage: 0,
    _priestWaitMultiplier: 1.0,

    // Progress (localStorage backed)
    unlockedLevel: 1,

    // Hypoglycemia tracking
    hypoDuration: 0,

    // Juice/snack cooldown
    juiceCooldown: 0,

    // Day clock (seconds elapsed since 6:00)
    dayClock: 0,

    // Speed control
    speedMultiplier: 1.0,
    paused: false,

    // Current plan (persists across restarts)
    currentPlan: null,

    // Tutorial overlay
    tutorialStepIndex: 0,
    tutorialActive: false,
    tutorialDayKey: null,
    tutorialDismissedAt: 0, // Date.now() when last step was dismissed

    // Game over
    gameOverReason: null,
  };
}

export let gameState = createGameState();

export function resetGameState() {
  // degradation intentionally NOT preserved — applyPatientPhysiology sets it
  const prevUnlocked = gameState.unlockedLevel;
  const prevPlan = gameState.currentPlan;
  const prevPatientId = gameState.currentPatientId;
  const prevDay = gameState.currentDay;
  Object.assign(gameState, createGameState());
  gameState.unlockedLevel = prevUnlocked;
  gameState.currentPlan = prevPlan;
  gameState.currentPatientId = prevPatientId;
  gameState.currentDay = prevDay;
}

export function fullReset() {
  const prevUnlocked = gameState.unlockedLevel;
  Object.assign(gameState, createGameState());
  gameState.unlockedLevel = prevUnlocked;
}
