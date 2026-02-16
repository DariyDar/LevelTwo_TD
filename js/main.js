// GlucoDefense — Entry point: init, game loop, state machine

import { CONFIG } from './config.js';
import { gameState, GamePhase, resetGameState, fullReset } from './gameState.js';
import { Peasant, PeasantState } from './entities/Peasant.js';
import { findLeastFilledMine } from './buildings/Mine.js';
import { initRenderer, render as renderMap, nextMealBtnRect, juiceBtnRect } from './renderer.js';
import { initEntityRenderer, renderEntities } from './rendererEntities.js';
import { initUIRenderer, renderUI, renderPausedOverlay, renderBottomPanel, restartButtonRect, speedButtonRects } from './rendererUI.js';
import { initEffectsRenderer, renderEffects } from './rendererEffects.js';
import { updateWaveManager, loadLevel, triggerNextWave, triggerEarlyWave, spawnJuice, formatVirtualTime } from './systems/waveManager.js';
import { updateEnergy } from './systems/energySystem.js';
import { calculateBG } from './systems/bgSystem.js';
import { playBlackout } from './audio.js';
import { Mine } from './buildings/Mine.js';
import { Pancreas } from './buildings/Pancreas.js';
import { LiverTower } from './buildings/LiverTower.js';
import { KidneyTower } from './buildings/KidneyTower.js';
import { updateCombat } from './systems/combatSystem.js';
import { initFoodChoiceUI, renderFoodChoice } from './ui/foodChoice.js';
import {
  updateInterventions,
  activateSpawnKnight,
  activateWalk,
  activateSpawnPriest,
  activateKidneyVortex,
} from './systems/interventions.js';
import { initBottomBar, renderBottomBar } from './ui/bottomBar.js';
import { initMenu, renderMenu, unlockNextDay } from './ui/menu.js';
import { getPatient } from './patients/index.js';
import { initGameOver, renderGameOver } from './ui/gameOver.js';
import { initWavePreview, renderWavePreview } from './ui/wavePreview.js';
import { initMealPlan, renderMealPlan } from './ui/mealPlan.js';
import { updateKidneyFiltration } from './systems/kidneyFiltration.js';
import { initBGHistory, updateBGHistory } from './systems/bgHistory.js';
import { initPlanningMode, renderPlanningMode } from './ui/planningMode.js';
import { initPlanExecutor, updatePlanExecutor } from './systems/planExecutor.js';
import { initWelcome, renderWelcome } from './ui/welcome.js';
import { initTutorial, initTutorialForDay, updateTutorial, renderTutorial, advanceTutorial, isTutorialActive } from './ui/tutorial.js';

let lastTime = 0;
let canvas = null;
let ctx = null;

function init() {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    return;
  }

  ctx = canvas.getContext('2d');
  initRenderer(canvas);
  initEntityRenderer(ctx);
  initUIRenderer(ctx);
  initEffectsRenderer(ctx);
  initFoodChoiceUI(canvas, ctx);
  initBottomBar(canvas, ctx);
  initMenu(canvas, ctx, startDay);
  initGameOver(canvas, ctx, handleGameOverAction);
  initWavePreview(ctx);
  initMealPlan(canvas, ctx, startPlayingAfterMealPlan);
  initPlanningMode(canvas, ctx, startPlayingAfterPlanning);
  initWelcome(canvas, ctx);
  initTutorial(canvas, ctx);

  // Keyboard shortcuts for core actions
  document.addEventListener('keydown', handleKeyboard);

  // Restart button click + mouse tracking for building hover
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mousemove', handleCanvasMouseMove);

  // Show welcome screen
  gameState.phase = GamePhase.WELCOME;

  // Start game loop
  requestAnimationFrame(gameLoop);
}

// Start a day for a specific patient
export function startDay(patientId, dayId, levelRef) {
  const levelId = levelRef || dayId;

  // Clear plan if switching to a different level/patient
  if (gameState.currentPlan &&
      (gameState.currentPlan.levelId !== levelId || gameState.currentPatientId !== patientId)) {
    gameState.currentPlan = null;
  }

  resetGameState();

  // Store patient and day info
  gameState.currentPatientId = patientId;
  gameState.currentDay = dayId;

  // Apply patient physiology
  const patient = getPatient(patientId);
  if (patient) {
    applyPatientPhysiology(patient.physiology);
  }

  // Load level data (waves, interventions)
  loadLevel(levelId);

  // Initialize buildings
  const mineCount = gameState.levelConfig ? gameState.levelConfig.mineCount : 20;
  initMines(mineCount);
  gameState.pancreas = new Pancreas();
  gameState.liverTower = new LiverTower();
  gameState.kidneys = new KidneyTower();

  // Set initial liver glucose reserve
  if (gameState._liverInitialStorage > 0 && gameState.liverTower) {
    gameState.liverTower.storage = Math.min(
      gameState._liverInitialStorage,
      gameState.liverTower.maxStorage
    );
  }

  // Initialize BG history tracking
  initBGHistory();

  // Spawn starting workers (baseline glucose pool)
  spawnStartingWorkers();

  // Initialize tutorial for this patient+day (if tutorial steps exist)
  initTutorialForDay(patientId, dayId);

  // Check if this day has fixed meals (tutorial / narrative days)
  const dayDef = patient ? patient.days.find(d => d.dayId === dayId) : null;
  if (dayDef && dayDef.fixedMeals) {
    // Auto-create plan from fixed meals — skip planning mode
    gameState.currentPlan = {
      levelId,
      meals: dayDef.fixedMeals.map(m => ({ ...m, executed: false })),
      interventions: (dayDef.fixedInterventions || []).map(iv => ({ ...iv, executed: false })),
    };
    initPlanExecutor();
    gameState.waves = gameState.currentPlan.meals.map(m => ({
      time: formatVirtualTime(m.hour), choices: [],
    }));
    gameState.phase = GamePhase.PLAYING;
    return;
  }

  // Show planning mode for days without fixed meals
  gameState.phase = GamePhase.PLANNING;
}

// Legacy wrapper for backward compatibility (restart, etc.)
export function startLevel(levelId) {
  const patientId = gameState.currentPatientId || 'type2';
  const dayId = gameState.currentDay || levelId;
  startDay(patientId, dayId, levelId);
}

// Apply patient physiology to game CONFIG and gameState
function applyPatientPhysiology(phys) {
  gameState.degradation = phys.startingDegradation || 0;
  gameState._insulinProductionRate = phys.insulinProductionRate ?? 1.0;
  gameState._insulinSensitivity = phys.insulinSensitivity ?? 1.0;
  gameState._degradationDisabled = phys.degradationEnabled === false;
  gameState._liverStorageMultiplier = phys.liverStorageMultiplier ?? 1.0;
  gameState._energyDrainMultiplier = phys.energyDrainMultiplier ?? 1.0;
  gameState._rebelDamageMultiplier = phys.rebelDamageMultiplier ?? 1.0;
  gameState._kidneyAutoFilterRate = phys.kidneyAutoFilterRate ?? 2.0;
  gameState._liverReleaseRate = phys.liverReleaseRate ?? 1.0;
  gameState._liverInitialStorage = phys.liverInitialStorage ?? 0;

  // Energy start multiplier
  const energyMult = phys.energyStartMultiplier ?? 1.0;
  if (energyMult !== 1.0) {
    gameState.energy = Math.round(CONFIG.ENERGY_START * energyMult);
  }

  // Insulin charges (Type 1: limited injections; null = unlimited)
  if (phys.insulinCharges != null) {
    gameState._insulinCharges = phys.insulinCharges;
    gameState._insulinChargesMax = phys.insulinCharges;
  }
}

// Called after player finishes meal plan selection (legacy)
function startPlayingAfterMealPlan() {
  gameState.phase = GamePhase.PLAYING;
  triggerNextWave();
}

// Called when player clicks "Start Day" in planning mode
function startPlayingAfterPlanning() {
  // Initialize plan executor (resets executed flags)
  initPlanExecutor();

  // Set wave count from plan for UI
  const plan = gameState.currentPlan;
  if (plan) {
    gameState.waves = plan.meals.map(m => ({ time: formatVirtualTime(m.hour), choices: [] }));
  }

  gameState.phase = GamePhase.PLAYING;
}

function handleGameOverAction(action) {
  if (action === 'retry') {
    startDay(gameState.currentPatientId, gameState.currentDay, gameState.level);
  } else if (action === 'menu') {
    fullReset();
    gameState.phase = GamePhase.MENU;
  } else if (action === 'next') {
    const nextDay = gameState.currentDay + 1;
    const patient = getPatient(gameState.currentPatientId);
    if (patient && nextDay <= patient.days.length) {
      const dayDef = patient.days.find(d => d.dayId === nextDay);
      const levelRef = dayDef ? dayDef.levelRef : nextDay;
      startDay(gameState.currentPatientId, nextDay, levelRef);
    } else {
      fullReset();
      gameState.phase = GamePhase.MENU;
    }
  }
}

function initMines(count) {
  const grid = CONFIG.MINES_GRID;
  gameState.mines = [];

  for (let i = 0; i < count; i++) {
    const col = i % grid.cols;
    const row = Math.floor(i / grid.cols);
    const x = grid.startX + col * grid.gapX;
    const y = grid.startY + row * grid.gapY;
    gameState.mines.push(new Mine(x, y));
  }
}

function separatePeasants() {
  const minDist = CONFIG.PEASANT_RADIUS * 2.2;
  const minDistSq = minDist * minDist;
  const cellSize = minDist * 2;
  const grid = new Map();

  // Build spatial hash — only for movable peasants
  const movable = [];
  for (const p of gameState.peasants) {
    if (!p.alive) continue;
    if (p.state === PeasantState.WORKER || p.state === PeasantState.BEING_ESCORTED) continue;
    movable.push(p);
    const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(p);
  }

  // Check only neighboring cells
  for (const a of movable) {
    const cx = Math.floor(a.x / cellSize);
    const cy = Math.floor(a.y / cellSize);

    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const cell = grid.get(`${gx},${gy}`);
        if (!cell) continue;

        for (const b of cell) {
          if (b === a) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < minDistSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            a.x -= nx * overlap * 0.15;
            a.y -= ny * overlap * 0.15;
            b.x += nx * overlap * 0.15;
            b.y += ny * overlap * 0.15;
          }
        }
      }
    }

    // Clamp to canvas bounds
    a.x = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH, a.x));
    a.y = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT, a.y));
  }
}

function spawnStartingWorkers() {
  const count = CONFIG.STARTING_WORKERS;
  for (let i = 0; i < count; i++) {
    const mine = findLeastFilledMine(gameState.mines);
    if (!mine) break;

    const peasant = new Peasant(mine.x, mine.y, CONFIG.SPEED_MEDIUM);
    peasant.color = 'purple';
    peasant.state = PeasantState.WORKER;
    peasant.workHp = CONFIG.WORKER_LIFETIME;
    peasant.waypointIndex = 999;
    mine.addWorker(peasant);
    gameState.peasants.push(peasant);
    gameState.stats.totalWorkers++;
  }
}

function gameLoop(timestamp) {
  const dt = lastTime === 0 ? 0 : (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  const cappedDt = Math.min(dt, 0.1);
  const effectiveDt = gameState.paused ? 0 : cappedDt * gameState.speedMultiplier;

  if (gameState.phase === GamePhase.PLAYING || gameState.phase === GamePhase.BETWEEN_WAVES) {
    update(effectiveDt);
  }

  // Render
  renderMap();

  if (gameState.phase === GamePhase.WELCOME) {
    renderWelcome();
  } else if (gameState.phase === GamePhase.MENU) {
    renderMenu();
  } else if (gameState.phase === GamePhase.PLANNING) {
    renderPlanningMode();
  } else if (gameState.phase === GamePhase.MEAL_PLAN) {
    renderMealPlan();
  } else if (gameState.phase === GamePhase.GAME_OVER) {
    renderEntities();
    renderEffects();
    renderUI();
    renderBottomPanel();
    renderGameOver();
  } else {
    renderEntities();
    renderEffects();
    renderUI();

    // Hide intervention bottom bar for tutorial (healthy) patient
    const currentPatient = getPatient(gameState.currentPatientId);
    const isTutorialDay = currentPatient && currentPatient.isTutorial;
    if (!isTutorialDay) {
      renderBottomBar();
    }

    renderBottomPanel();
    renderWavePreview();
    renderFoodChoice();
    renderPausedOverlay();
    renderTutorial();
  }

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  updateWaveManager(dt);
  updatePlanExecutor(dt);
  updateBoats(dt);
  updatePeasants(dt);
  separatePeasants();
  updatePriests(dt);
  updatePancreas(dt);
  updateMines(dt);
  updateKnights(dt);
  updateLiverTower(dt);
  updateKidneys(dt);
  updateKidneyFiltration(dt);
  updateCombat(dt);
  updateHypoglycemia(dt);
  updateEnergy(dt);
  updateInterventions(dt);
  updateBGHistory(dt);
  updateEffects(dt);
  cleanupDead();
  updateTutorial();
}

function updateHypoglycemia(dt) {
  const bg = calculateBG();
  if (bg < CONFIG.BG_HYPO) {
    gameState.hypoDuration += dt;

    // Prolonged hypoglycemia → blackout (coma)
    // Healthy patients (degradation disabled) have glucagon/epinephrine counter-regulation
    // that prevents consciousness loss — they effectively cannot blackout from hypo
    if (!gameState._degradationDisabled && gameState.hypoDuration >= 20) {
      gameState.energy = 0;
      playBlackout();
      gameState.phase = GamePhase.GAME_OVER;
      gameState.gameOverReason = 'blackout';
    }
  } else {
    gameState.hypoDuration = 0;
  }
}

function updateBoats(dt) {
  for (const boat of gameState.boats) {
    boat.update(dt);
  }
}

function updatePeasants(dt) {
  for (const p of gameState.peasants) {
    p.update(dt);
  }
}

function updatePriests(dt) {
  for (const pr of gameState.priests) {
    pr.update(dt);
  }
}

function updatePancreas(dt) {
  if (gameState.pancreas) {
    gameState.pancreas.update(dt);
  }
}

function updateMines(dt) {
  for (const mine of gameState.mines) {
    mine.update(dt);
  }
}

function updateKnights(dt) {
  for (const k of gameState.knights) {
    k.update(dt);
  }
}

function updateLiverTower(dt) {
  if (gameState.liverTower) {
    gameState.liverTower.update(dt);
  }
}

function updateKidneys(dt) {
  if (gameState.kidneys) {
    gameState.kidneys.update(dt);
  }
}

function updateEffects(dt) {
  for (const effect of gameState.effects) {
    effect.timer -= dt;
  }
  gameState.effects = gameState.effects.filter(e => e.timer > 0);
}

function cleanupDead() {
  gameState.peasants = gameState.peasants.filter(p => p.alive);
  gameState.priests = gameState.priests.filter(p => p.alive);
  gameState.knights = gameState.knights.filter(k => k.alive);
  gameState.boats = gameState.boats.filter(b => b.alive);
}

const SPEED_OPTIONS = [0.25, 0.5, 1.0, 2.0];

function cycleSpeed(direction) {
  let idx = SPEED_OPTIONS.indexOf(gameState.speedMultiplier);
  if (idx === -1) {
    // Find nearest valid speed
    idx = 0;
    for (let i = 1; i < SPEED_OPTIONS.length; i++) {
      if (Math.abs(SPEED_OPTIONS[i] - gameState.speedMultiplier) <
          Math.abs(SPEED_OPTIONS[idx] - gameState.speedMultiplier)) {
        idx = i;
      }
    }
  }
  const newIdx = Math.max(0, Math.min(SPEED_OPTIONS.length - 1, idx + direction));
  gameState.speedMultiplier = SPEED_OPTIONS[newIdx];
  gameState.paused = false;
}

function handleKeyboard(e) {
  if (gameState.phase !== GamePhase.PLAYING && gameState.phase !== GamePhase.BETWEEN_WAVES) return;

  switch (e.key) {
    case '1': activateSpawnKnight(); break;
    case '2': activateWalk(); break;
    case '3': activateSpawnPriest(); break;
    case '4': activateKidneyVortex(); break;
    case 'r':
    case 'R':
      startDay(gameState.currentPatientId, gameState.currentDay, gameState.level);
      break;
    case '[': cycleSpeed(-1); break;
    case ']': cycleSpeed(1); break;
    case ' ':
      e.preventDefault();
      gameState.paused = !gameState.paused;
      break;
  }
}

function handleCanvasClick(e) {
  // Tutorial click: advance overlay and consume the click
  if (isTutorialActive()) {
    advanceTutorial();
    return;
  }

  if (gameState.phase !== GamePhase.PLAYING && gameState.phase !== GamePhase.BETWEEN_WAVES) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  // Speed control buttons
  for (const sb of speedButtonRects) {
    if (mx >= sb.x && mx <= sb.x + sb.w && my >= sb.y && my <= sb.y + sb.h) {
      if (sb.action === 'pause') {
        gameState.paused = !gameState.paused;
      } else {
        gameState.speedMultiplier = sb.speed;
        gameState.paused = false;
      }
      return;
    }
  }

  // "Send Now" button (next meal)
  if (nextMealBtnRect.visible) {
    const nb = nextMealBtnRect;
    if (mx >= nb.x && mx <= nb.x + nb.w && my >= nb.y && my <= nb.y + nb.h) {
      triggerEarlyWave();
      return;
    }
  }

  // "Drink Juice" button
  if (juiceBtnRect.visible) {
    const jb = juiceBtnRect;
    if (mx >= jb.x && mx <= jb.x + jb.w && my >= jb.y && my <= jb.y + jb.h) {
      spawnJuice();
      return;
    }
  }

  const btn = restartButtonRect;
  if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
    startDay(gameState.currentPatientId, gameState.currentDay, gameState.level);
  }
}

function handleCanvasMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  gameState.mouseX = mx;
  gameState.mouseY = my;

  // Detect building hover
  gameState.hoveredBuilding = null;

  if (gameState.phase !== GamePhase.PLAYING && gameState.phase !== GamePhase.BETWEEN_WAVES) return;

  const liver = CONFIG.LIVER_POS;
  const liverS = CONFIG.LIVER_SIZE;
  if (mx >= liver.x - liverS.w / 2 && mx <= liver.x + liverS.w / 2 &&
      my >= liver.y - liverS.h / 2 && my <= liver.y + liverS.h / 2) {
    gameState.hoveredBuilding = 'liver';
    return;
  }

  const panc = CONFIG.PANCREAS_POS;
  const pancS = CONFIG.PANCREAS_SIZE;
  if (mx >= panc.x - pancS.w / 2 && mx <= panc.x + pancS.w / 2 &&
      my >= panc.y - pancS.h / 2 && my <= panc.y + pancS.h / 2) {
    gameState.hoveredBuilding = 'pancreas';
    return;
  }

  const kid = CONFIG.KIDNEYS_POS;
  const kidR = CONFIG.KIDNEYS_RADIUS;
  const kdx = mx - kid.x;
  const kdy = my - kid.y;
  if (kdx * kdx + kdy * kdy <= kidR * kidR) {
    gameState.hoveredBuilding = 'kidneys';
    return;
  }

  // Mine grid area
  const zone = CONFIG.MUSCLE_ZONE;
  if (mx >= zone.x1 && mx <= zone.x2 && my >= zone.y1 && my <= zone.y2) {
    gameState.hoveredBuilding = 'mines';
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
