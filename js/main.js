// GlucoDefense — Entry point: init, game loop, state machine

import { CONFIG } from './config.js';
import { gameState, GamePhase, resetGameState, fullReset } from './gameState.js';
import { Peasant, PeasantState } from './entities/Peasant.js';
import { findLeastFilledMine } from './buildings/Mine.js';
import { initRenderer, render as renderMap, nextMealBtnRect, juiceBtnRect } from './renderer.js';
import { initEntityRenderer, renderEntities } from './rendererEntities.js';
import { initUIRenderer, renderUI, restartButtonRect } from './rendererUI.js';
import { initEffectsRenderer, renderEffects } from './rendererEffects.js';
import { updateWaveManager, loadLevel, triggerNextWave, triggerEarlyWave, spawnJuice } from './systems/waveManager.js';
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
import { initMenu, renderMenu } from './ui/menu.js';
import { initGameOver, renderGameOver } from './ui/gameOver.js';
import { initWavePreview, renderWavePreview } from './ui/wavePreview.js';
import { initMealPlan, renderMealPlan } from './ui/mealPlan.js';
import { updateKidneyFiltration } from './systems/kidneyFiltration.js';

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
  initMenu(canvas, ctx, startLevel);
  initGameOver(canvas, ctx, handleGameOverAction);
  initWavePreview(ctx);
  initMealPlan(canvas, ctx, startPlayingAfterMealPlan);

  // Keyboard shortcuts for core actions
  document.addEventListener('keydown', handleKeyboard);

  // Restart button click + mouse tracking for building hover
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mousemove', handleCanvasMouseMove);

  // Show menu
  gameState.phase = GamePhase.MENU;

  // Start game loop
  requestAnimationFrame(gameLoop);
}

export function startLevel(levelId) {
  resetGameState();

  // Load level data (waves, interventions)
  loadLevel(levelId);

  // Initialize buildings
  const mineCount = gameState.levelConfig ? gameState.levelConfig.mineCount : 20;
  initMines(mineCount);
  gameState.pancreas = new Pancreas();
  gameState.liverTower = new LiverTower();
  gameState.kidneys = new KidneyTower();

  // Spawn starting workers (baseline glucose pool)
  spawnStartingWorkers();

  // Show meal plan selection UI
  gameState.phase = GamePhase.MEAL_PLAN;
}

// Called after player finishes meal plan selection
function startPlayingAfterMealPlan() {
  gameState.phase = GamePhase.PLAYING;
  triggerNextWave();
}

function handleGameOverAction(action) {
  if (action === 'retry') {
    startLevel(gameState.level);
  } else if (action === 'menu') {
    fullReset();
    gameState.phase = GamePhase.MENU;
  } else if (action === 'next') {
    const nextLevel = gameState.level + 1;
    if (nextLevel <= 5) {
      startLevel(nextLevel);
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

  if (gameState.phase === GamePhase.PLAYING || gameState.phase === GamePhase.BETWEEN_WAVES) {
    update(cappedDt);
  }

  // Render
  renderMap();

  if (gameState.phase === GamePhase.MENU) {
    renderMenu();
  } else if (gameState.phase === GamePhase.MEAL_PLAN) {
    renderMealPlan();
  } else if (gameState.phase === GamePhase.GAME_OVER) {
    renderEntities();
    renderEffects();
    renderUI();
    renderBottomBar();
    renderGameOver();
  } else {
    renderEntities();
    renderEffects();
    renderUI();
    renderBottomBar();
    renderWavePreview();
    renderFoodChoice();
  }

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  updateWaveManager(dt);
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
  updateEffects(dt);
  cleanupDead();
}

function updateHypoglycemia(dt) {
  const bg = calculateBG();
  if (bg < CONFIG.BG_HYPO) {
    gameState.hypoDuration += dt;

    // Tier 3: 20+ seconds of hypoglycemia → blackout (coma)
    if (gameState.hypoDuration >= 20) {
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

function handleKeyboard(e) {
  if (gameState.phase !== GamePhase.PLAYING && gameState.phase !== GamePhase.BETWEEN_WAVES) return;

  switch (e.key) {
    case '1': activateSpawnKnight(); break;
    case '2': activateWalk(); break;
    case '3': activateSpawnPriest(); break;
    case '4': activateKidneyVortex(); break;
    case 'r':
    case 'R':
      startLevel(gameState.level);
      break;
  }
}

function handleCanvasClick(e) {
  if (gameState.phase !== GamePhase.PLAYING && gameState.phase !== GamePhase.BETWEEN_WAVES) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

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
    startLevel(gameState.level);
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
