// GlucoDefense — Tutorial overlay system (spotlight + text + pointer)

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { PeasantState } from '../entities/Peasant.js';
import { KnightState } from '../entities/Knight.js';
import { calculateBG } from '../systems/bgSystem.js';
import { getVirtualHour } from '../systems/waveManager.js';
import { speedButtonRects } from '../rendererUI.js';

let ctx = null;
let canvas = null;

// Tutorial step definitions per patient+day key
// Each step has:
//   phase: 'planning' | 'playing' — which game phase triggers this step
//   trigger: (gs) => boolean — when to show
//   spotlight: { x, y, w, h } | null — highlighted zone (null = full dim)
//   text: string — display text
//   pointer: { x, y, dir? } | null — finger pointer (ONLY for button-pointing steps)
//   pauseGame: boolean — whether to pause the game when shown (playing phase only)
//   minDelay: number — minimum real-time seconds after previous step before this can trigger (default 0)
const TUTORIAL_STEPS = {
  healthy_1: [
    // Step 0 (PLANNING): Introduce the planning screen
    {
      id: 'planning_intro',
      phase: 'planning',
      trigger: () => true,
      spotlight: { x: 50, y: 90, w: 1180, h: 120 },
      text: 'Meals are pre-set for this day. See them on the timeline above. Each meal will deliver glucose to your bloodstream at the scheduled time.',
      pointer: null,
      pauseGame: false,
    },
    // Step 1 (PLANNING): Point at Start Day button
    {
      id: 'planning_start',
      phase: 'planning',
      trigger: () => true,
      spotlight: null,
      text: 'Click "Start Day" to begin!',
      pointer: { x: 640, y: 640, dir: 'down' },
      pauseGame: false,
    },
    // Step 2 (PLAYING): Show timeline at top
    {
      id: 'timeline_intro',
      phase: 'playing',
      trigger: (gs) => gs.dayClock < 2,
      spotlight: { x: 0, y: 56, w: 1280, h: 22 },
      text: 'This timeline shows your planned meals throughout the day. The gold marker shows the current time.',
      pointer: null,
      pauseGame: true,
    },
    // Step 3 (PLAYING): Comfort message — things look confusing at first
    {
      id: 'early_comfort',
      phase: 'playing',
      trigger: () => getVirtualHour() >= 7.5,
      spotlight: null,
      text: 'Everything looks quiet now, but don\'t worry — at 8:00 AM breakfast will arrive and things will start making sense!',
      pointer: null,
      pauseGame: true,
    },
    // Step 4 (PLAYING): Boat arrival — when glucose from boat starts walking
    {
      id: 'boat_arrival',
      phase: 'playing',
      trigger: (gs) => gs.peasants.some(p => p.alive && p.state === PeasantState.WALKING_TO_VILLAGE),
      spotlight: { x: 0, y: 250, w: 300, h: 200 },
      text: 'Food has arrived! Glucose units are walking from shore into your body. Watch them travel through your bloodstream.',
      pointer: null,
      pauseGame: true,
    },
    // Step 4 (PLAYING): BG counter — when first glucose actually raises BG
    {
      id: 'bg_counter',
      phase: 'playing',
      trigger: () => calculateBG() > 95,
      spotlight: { x: 240, y: 0, w: 230, h: 55 },
      text: 'Watch the BG (Blood Glucose) meter — it shows how much sugar is in your blood. Green zone (80-140 mg/dL) is healthy!',
      pointer: null,
      pauseGame: true,
    },
    // Step 6 (PLAYING): Liver — when knight grabs glucose
    {
      id: 'liver_intro',
      phase: 'playing',
      trigger: (gs) => gs.knights.some(k => k.state === KnightState.ESCORTING),
      spotlight: { x: 600, y: 470, w: 200, h: 220 },
      text: 'The Liver stores excess glucose. Green knights intercept glucose and escort it to storage for later use.',
      pointer: null,
      pauseGame: true,
    },
    // Step 7 (PLAYING): Muscles — glucose reaches mine field (delay after liver)
    {
      id: 'muscles_intro',
      phase: 'playing',
      trigger: (gs) => gs.peasants.some(p => p.alive && p.state === PeasantState.WAITING_FOR_PRIEST && p.x > 400),
      spotlight: { x: 440, y: 180, w: 380, h: 360 },
      text: 'Muscle cells need glucose workers to produce energy (ATP). Free glucose waits here for insulin to convert it.',
      pointer: null,
      pauseGame: true,
      minDelay: 5,
    },
    // Step 8 (PLAYING): Insulin in action — conversion happened (delay after muscles)
    {
      id: 'insulin_action',
      phase: 'playing',
      trigger: (gs) => gs.stats.totalWorkers > 82,
      spotlight: { x: 440, y: 180, w: 380, h: 360 },
      text: 'Insulin converts free glucose into workers (purple). Workers enter muscle cells and produce energy. This is how your body turns food into fuel!',
      pointer: null,
      pauseGame: true,
      minDelay: 5,
    },
    // Step 9 (PLAYING): Pancreas — immediately after insulin (no delay)
    {
      id: 'pancreas_intro',
      phase: 'playing',
      trigger: (gs) => gs.priests.length > 0,
      spotlight: { x: 760, y: 90, w: 140, h: 140 },
      text: 'The Pancreas produces insulin (gold circles). Insulin is the key that lets glucose enter muscle cells!',
      pointer: null,
      pauseGame: true,
      minDelay: 0,
    },
    // Step 10 (PLAYING): Rebel glucose — triggers when a rebel attacks a building
    {
      id: 'rebel_intro',
      phase: 'playing',
      trigger: (gs) => gs.peasants.some(p => p.alive && p.state === PeasantState.REBEL && p.attackTarget),
      spotlight: { x: 400, y: 150, w: 500, h: 400 },
      text: 'When glucose waits too long without insulin, it becomes "angry" (red flashing). Rebels can attack your organs! In a healthy body this is rare.',
      pointer: null,
      pauseGame: true,
      minDelay: 5,
    },
    // Step 11 (PLAYING): Speed tutorial at ~10:00
    {
      id: 'speed_tutorial',
      phase: 'playing',
      trigger: () => getVirtualHour() >= 10,
      spotlight: null,
      text: 'You can speed up time! Click the speed buttons to fast-forward through quiet periods. Try x10 for maximum speed!',
      pointer: { x: 0, y: 52, dir: 'speed_10x' },
      pauseGame: true,
      minDelay: 5,
    },
  ],

  healthy_2: [
    {
      id: 'fast_vs_slow',
      phase: 'playing',
      trigger: (gs) => gs.boats.length > 0,
      spotlight: { x: 30, y: 280, w: 270, h: 160 },
      text: 'Notice the glucose colors: RED = fast absorption (spikes BG quickly), ORANGE = slow absorption (gentle rise). Today you\'ll see both!',
      pointer: null,
      pauseGame: true,
    },
    {
      id: 'bg_bar',
      phase: 'playing',
      trigger: () => calculateBG() > 110,
      spotlight: { x: 240, y: 0, w: 230, h: 55 },
      text: 'Watch the Blood Glucose bar! Green zone (80-140 mg/dL) is healthy. Yellow means elevated, red means danger.',
      pointer: null,
      pauseGame: true,
    },
  ],

  healthy_3: [
    {
      id: 'challenge_intro',
      phase: 'playing',
      trigger: (gs) => gs.dayClock < 2,
      spotlight: null,
      text: 'Challenge! Only unhealthy food today. Your body can handle it, but watch how BG behaves. Walking and exercise are pre-scheduled to help.',
      pointer: null,
      pauseGame: true,
    },
    {
      id: 'walk_hint',
      phase: 'playing',
      trigger: (gs) => gs.peasants.filter(p => p.alive && p.state === PeasantState.REBEL).length > 8,
      spotlight: null,
      text: 'Lots of free glucose! Walking helps muscles absorb glucose faster. Exercise doubles energy production. These tools keep you balanced.',
      pointer: null,
      pauseGame: true,
    },
  ],

  type1_1: [
    {
      id: 'type1_intro',
      phase: 'playing',
      trigger: (gs) => gs.dayClock < 2,
      spotlight: null,
      text: 'Type 1 Diabetes: Your pancreas produces almost no insulin. You must rely on injections (pre-scheduled). Watch your insulin charges!',
      pointer: null,
      pauseGame: true,
    },
    {
      id: 'insulin_charges',
      phase: 'playing',
      trigger: (gs) => gs._insulinCharges != null && gs._insulinCharges < 14,
      spotlight: { x: 450, y: 25, w: 130, h: 22 },
      text: 'Insulin charges are limited! Each injection uses charges shown at top. Too much insulin causes dangerous lows. Timing is everything.',
      pointer: null,
      pauseGame: true,
    },
  ],

  type2_1: [
    {
      id: 'type2_intro',
      phase: 'playing',
      trigger: (gs) => gs.dayClock < 2,
      spotlight: null,
      text: 'Type 2 Diabetes: Your body produces insulin, but cells are becoming resistant. The IR number shows how resistant they are. Keep BG in range!',
      pointer: null,
      pauseGame: true,
    },
    {
      id: 'ir_explained',
      phase: 'playing',
      trigger: (gs) => gs.degradation > 0,
      spotlight: { x: 680, y: 0, w: 100, h: 55 },
      text: 'Insulin Resistance increased! High BG damages organs over time. When IR rises, insulin works worse. Medications and exercise help control it.',
      pointer: null,
      pauseGame: true,
    },
    {
      id: 'medications',
      phase: 'playing',
      trigger: (gs) => gs.dayClock > 40,
      spotlight: null,
      text: 'You have medications: Metformin improves liver function, Semaglutide slows glucose absorption, Dapagliflozin helps kidneys filter glucose.',
      pointer: null,
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

// Called during PLAYING phase update loop
export function updateTutorial() {
  if (!gameState.tutorialDayKey) return;
  if (gameState.tutorialActive) return;

  const steps = TUTORIAL_STEPS[gameState.tutorialDayKey];
  if (!steps || gameState.tutorialStepIndex >= steps.length) return;

  const step = steps[gameState.tutorialStepIndex];
  // Only trigger playing-phase steps here
  if (step.phase === 'planning') return;

  // Enforce minimum delay between steps (real-time seconds)
  const minDelay = step.minDelay || 0;
  if (minDelay > 0 && gameState.tutorialDismissedAt > 0) {
    const elapsed = (Date.now() - gameState.tutorialDismissedAt) / 1000;
    if (elapsed < minDelay) return;
  }

  if (step.trigger(gameState)) {
    gameState.tutorialActive = true;
    if (step.pauseGame) {
      gameState.paused = true;
    }
  }
}

// Called during PLANNING phase render
export function updatePlanningTutorial() {
  if (!gameState.tutorialDayKey) return;
  if (gameState.tutorialActive) return;

  const steps = TUTORIAL_STEPS[gameState.tutorialDayKey];
  if (!steps || gameState.tutorialStepIndex >= steps.length) return;

  const step = steps[gameState.tutorialStepIndex];
  // Only trigger planning-phase steps here
  if (step.phase !== 'planning') return;

  if (step.trigger(gameState)) {
    gameState.tutorialActive = true;
  }
}

export function advanceTutorial() {
  if (!gameState.tutorialActive) return;
  gameState.tutorialActive = false;
  gameState.paused = false;
  gameState.tutorialDismissedAt = Date.now();
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
  _renderOverlay(step);
}

// Alias for planning mode — same rendering logic
export function renderPlanningTutorial() {
  renderTutorial();
}

function _renderOverlay(step) {
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;

  ctx.save();

  // Dark overlay with spotlight cutout
  if (step.spotlight) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';

    const s = step.spotlight;
    // Draw 4 dark rectangles around the spotlight zone
    ctx.fillRect(0, 0, W, s.y);
    ctx.fillRect(0, s.y + s.h, W, H - s.y - s.h);
    ctx.fillRect(0, s.y, s.x, s.h);
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

  // Pointing finger emoji at pointer location (only for button-pointing steps)
  if (step.pointer) {
    const px = step.pointer.x;
    const py = step.pointer.y;
    ctx.font = '28px serif';
    ctx.textAlign = 'center';

    if (step.pointer.dir === 'speed_10x') {
      // Find the actual x10 button from rendered speedButtonRects
      const btn10x = speedButtonRects.find(b => b.speed === 10.0);
      const approxX = btn10x ? btn10x.x + btn10x.w / 2 : 1041;
      const btnBottom = btn10x ? btn10x.y + btn10x.h : 40;
      const bounce = 6 * Math.sin(Date.now() / 300);
      ctx.fillText('\u{1F446}', approxX, btnBottom + 30 + bounce);
    } else if (step.pointer.dir === 'down') {
      const bounce = 6 * Math.sin(Date.now() / 300);
      ctx.fillText('\u{1F447}', px, py + bounce);
    } else if (step.pointer.dir === 'left') {
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
