// GlucoDefense — Tutorial overlay system (spotlight + text + pointer)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { PeasantState } from '../entities/Peasant.js';
import { calculateBG } from '../systems/bgSystem.js';

let ctx = null;
let canvas = null;

// Tutorial step definitions per patient+day key
const TUTORIAL_STEPS = {
  healthy_1: [
    {
      id: 'welcome',
      trigger: (gs) => gs.dayClock < 2,
      spotlight: null,
      text: 'Welcome! This is your bloodstream. Food arrives as glucose from the sea on the left and travels through your body.',
      pointer: { x: 200, y: 360, dir: 'left' },
      pauseGame: true,
    },
    {
      id: 'boat_arrives',
      trigger: (gs) => gs.boats.length > 0 && gs.boats[0].x > 80,
      spotlight: { x: 30, y: 280, w: 270, h: 160 },
      text: 'A meal arrives by boat! It unloads glucose (colored circles) onto the shore. They walk toward your organs.',
      pointer: { x: 250, y: 360, dir: 'right' },
      pauseGame: true,
    },
    {
      id: 'liver_explained',
      trigger: (gs) => gs.peasants.some(p => p.alive && p.x > 400 && p.x < 600),
      spotlight: { x: 420, y: 290, w: 160, h: 140 },
      text: 'The Liver stores excess glucose as glycogen. Green knights intercept passing glucose and escort it to storage.',
      pointer: { x: 500, y: 360 },
      pauseGame: true,
    },
    {
      id: 'pancreas_explained',
      trigger: (gs) => gs.priests.length > 3,
      spotlight: { x: 820, y: 150, w: 120, h: 110 },
      text: 'The Pancreas produces insulin (gold circles). Insulin converts free glucose into purple workers that produce energy.',
      pointer: { x: 875, y: 200 },
      pauseGame: true,
    },
    {
      id: 'muscles_explained',
      trigger: (gs) => gs.stats.totalWorkers > 85,
      spotlight: { x: 640, y: 230, w: 380, h: 280 },
      text: 'Muscle cells (orange rectangles) use glucose workers to produce energy (ATP). Keep them supplied to stay alive!',
      pointer: { x: 800, y: 370 },
      pauseGame: true,
    },
    {
      id: 'energy_explained',
      trigger: (gs) => gs.energy < 260,
      spotlight: { x: 0, y: 0, w: 230, h: 55 },
      text: 'Energy bar (top-left) drains constantly. Workers in mines replenish it. If energy hits zero: blackout! But don\'t worry — a healthy body manages this easily.',
      pointer: { x: 100, y: 30 },
      pauseGame: true,
    },
  ],

  healthy_2: [
    {
      id: 'fast_vs_slow',
      trigger: (gs) => gs.boats.length > 0,
      spotlight: { x: 30, y: 280, w: 270, h: 160 },
      text: 'Notice the glucose colors: RED = fast absorption (spikes BG quickly), ORANGE = slow absorption (gentle rise). Today you\'ll see both!',
      pauseGame: true,
    },
    {
      id: 'bg_bar',
      trigger: (gs) => calculateBG() > 110,
      spotlight: { x: 240, y: 0, w: 230, h: 55 },
      text: 'Watch the Blood Glucose bar! Green zone (80-140 mg/dL) is healthy. Yellow means elevated, red means danger. Even healthy people benefit from steady BG.',
      pauseGame: true,
    },
  ],

  healthy_3: [
    {
      id: 'challenge_intro',
      trigger: (gs) => gs.dayClock < 2,
      spotlight: null,
      text: 'Challenge! Only unhealthy food today. Your body can handle it, but watch how BG behaves. Walking and exercise are pre-scheduled to help.',
      pauseGame: true,
    },
    {
      id: 'walk_hint',
      trigger: (gs) => gs.peasants.filter(p => p.alive && p.state === PeasantState.REBEL).length > 8,
      spotlight: null,
      text: 'Lots of free glucose! Walking helps muscles absorb glucose faster. Exercise doubles energy production. These tools keep you balanced.',
      pauseGame: true,
    },
  ],

  type1_1: [
    {
      id: 'type1_intro',
      trigger: (gs) => gs.dayClock < 2,
      spotlight: null,
      text: 'Type 1 Diabetes: Your pancreas produces almost no insulin. You must rely on injections (pre-scheduled). Watch your insulin charges!',
      pauseGame: true,
    },
    {
      id: 'insulin_charges',
      trigger: (gs) => gs._insulinCharges != null && gs._insulinCharges < 14,
      spotlight: { x: 450, y: 25, w: 130, h: 22 },
      text: 'Insulin charges are limited! Each injection uses charges shown at top. Too much insulin causes dangerous lows. Timing is everything.',
      pauseGame: true,
    },
  ],

  type2_1: [
    {
      id: 'type2_intro',
      trigger: (gs) => gs.dayClock < 2,
      spotlight: null,
      text: 'Type 2 Diabetes: Your body produces insulin, but cells are becoming resistant. The IR number shows how resistant they are. Keep BG in range!',
      pauseGame: true,
    },
    {
      id: 'ir_explained',
      trigger: (gs) => gs.degradation > 0,
      spotlight: { x: 680, y: 0, w: 100, h: 55 },
      text: 'Insulin Resistance increased! High BG damages organs over time. When IR rises, insulin works worse. Medications and exercise help control it.',
      pauseGame: true,
    },
    {
      id: 'medications',
      trigger: (gs) => gs.dayClock > 40,
      spotlight: null,
      text: 'You have medications: Metformin improves liver function, Semaglutide slows glucose absorption, Dapagliflozin helps kidneys filter glucose.',
      pauseGame: true,
    },
  ],
};

export function initTutorial(canvasEl, context) {
  canvas = canvasEl;
  ctx = context;
}

export function initTutorialForDay(patientId, dayId) {
  const key = `${patientId}_${dayId}`;
  if (TUTORIAL_STEPS[key]) {
    gameState.tutorialDayKey = key;
    gameState.tutorialStepIndex = 0;
    gameState.tutorialActive = false;
  } else {
    gameState.tutorialDayKey = null;
    gameState.tutorialStepIndex = 0;
    gameState.tutorialActive = false;
  }
}

export function updateTutorial() {
  if (!gameState.tutorialDayKey) return;
  if (gameState.tutorialActive) return;

  const steps = TUTORIAL_STEPS[gameState.tutorialDayKey];
  if (!steps || gameState.tutorialStepIndex >= steps.length) return;

  const step = steps[gameState.tutorialStepIndex];
  if (step.trigger(gameState)) {
    gameState.tutorialActive = true;
    if (step.pauseGame) {
      gameState.paused = true;
    }
  }
}

export function advanceTutorial() {
  if (!gameState.tutorialActive) return;
  gameState.tutorialActive = false;
  gameState.paused = false;
  gameState.tutorialStepIndex++;
}

export function isTutorialActive() {
  return gameState.tutorialActive;
}

export function renderTutorial() {
  if (!gameState.tutorialActive || !gameState.tutorialDayKey) return;

  const steps = TUTORIAL_STEPS[gameState.tutorialDayKey];
  if (!steps || gameState.tutorialStepIndex >= steps.length) return;

  const step = steps[gameState.tutorialStepIndex];
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;

  ctx.save();

  // Dark overlay with spotlight cutout
  if (step.spotlight) {
    // Draw dark overlay using off-screen technique
    // First: fill everything dark
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';

    const s = step.spotlight;
    // Draw 4 dark rectangles around the spotlight zone
    // Top
    ctx.fillRect(0, 0, W, s.y);
    // Bottom
    ctx.fillRect(0, s.y + s.h, W, H - s.y - s.h);
    // Left
    ctx.fillRect(0, s.y, s.x, s.h);
    // Right
    ctx.fillRect(s.x + s.w, s.y, W - s.x - s.w, s.h);

    // Bright border around spotlight
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.setLineDash([]);
  } else {
    // Full screen dim
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, W, H);
  }

  // Text box
  const textBoxW = Math.min(600, W - 80);
  const textBoxH = 90;
  const textBoxX = (W - textBoxW) / 2;
  const textBoxY = H / 2 + 80;

  // Box background
  ctx.fillStyle = 'rgba(20, 25, 40, 0.95)';
  ctx.beginPath();
  ctx.roundRect(textBoxX, textBoxY, textBoxW, textBoxH, 10);
  ctx.fill();

  // Box border
  ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Text (word-wrapped)
  ctx.font = '14px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';

  const lines = wrapText(step.text, textBoxW - 30);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textBoxX + 15, textBoxY + 25 + i * 20);
  }

  // Pointing finger emoji at pointer location
  if (step.pointer) {
    const px = step.pointer.x;
    const py = step.pointer.y;
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    // Finger pointing right by default, rotate for other directions
    if (step.pointer.dir === 'left') {
      ctx.fillText('\u{1F448}', px, py);
    } else {
      ctx.fillText('\u{1F449}', px, py);
    }
  }

  // "Click to continue" pulsing text
  const pulse = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 600));
  ctx.fillStyle = `rgba(241, 196, 15, ${pulse})`;
  ctx.font = '13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Click anywhere to continue', W / 2, textBoxY + textBoxH + 20);

  ctx.restore();
}

function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
