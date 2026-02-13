// GlucoDefense — UI rendering (top bar, overlays, restart button)

import { CONFIG } from './config.js';
import { gameState, GamePhase } from './gameState.js';
import { getEnergyPercent } from './systems/energySystem.js';
import { calculateBG, getBGColor, getBGLabel } from './systems/bgSystem.js';
import { PeasantState } from './entities/Peasant.js';
import { getVirtualHour, formatVirtualTime } from './systems/waveManager.js';
import { FOODS } from './levels/foodData.js';

let ctx = null;

// Restart button rect for click detection
export const restartButtonRect = { x: 1180, y: 8, w: 80, h: 36 };

// Speed control button rects for click detection
// Populated each frame by drawSpeedControls()
export const speedButtonRects = [];

export function initUIRenderer(context) {
  ctx = context;
}

export function renderUI() {
  drawTopBar();
  drawGameTimeline();
  drawHypoglycemiaOverlay();
}

// Exported separately so main.js can call it AFTER all other rendering
export function renderPausedOverlay() {
  if (!gameState.paused) return;

  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 55, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - 55);

  // "PAUSED" text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);

  ctx.font = '16px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('Press Space to resume', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 35);
}

function drawTopBar() {
  const C = CONFIG.COLORS;

  // Background
  ctx.fillStyle = C.DARK_BG;
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 55);

  const y = 18;
  let x = 15;

  // Energy bar
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Energy:', x, y);
  x += 55;

  const energyPct = getEnergyPercent();
  const energyBarW = 150;
  const energyBarH = 16;

  // Bar background
  ctx.fillStyle = C.GRAY;
  ctx.fillRect(x, y - 12, energyBarW, energyBarH);
  // Bar fill
  ctx.fillStyle = C.GOLD;
  ctx.fillRect(x, y - 12, energyBarW * energyPct, energyBarH);

  // Border — flash red when low energy
  if (energyPct < 0.3) {
    const speed = energyPct < 0.15 ? 100 : 200;
    const flash = 0.5 + 0.5 * Math.sin(Date.now() / speed);
    ctx.strokeStyle = `rgba(231, 76, 60, ${flash})`;
    ctx.lineWidth = 2;
  } else {
    ctx.strokeStyle = '#5D6D7E';
    ctx.lineWidth = 1;
  }
  ctx.strokeRect(x, y - 12, energyBarW, energyBarH);

  // Value
  ctx.fillStyle = C.WHITE;
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(gameState.energy)}/${gameState.energyMax}`, x + energyBarW / 2, y);

  // "LOW!" warning text
  if (energyPct < 0.15) {
    const flash = 0.5 + 0.5 * Math.sin(Date.now() / 100);
    ctx.fillStyle = `rgba(231, 76, 60, ${flash})`;
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LOW!', x + energyBarW + 4, y);
  }

  x += energyBarW + 25;

  // BG bar with zone coloring
  const bg = calculateBG();
  const bgColor = getBGColor(bg);
  const bgLabel = getBGLabel(bg);
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('BG:', x, y);
  x += 28;

  const bgBarW = 200;
  const bgScale = CONFIG.BG_VERY_HIGH;

  // Draw zone-colored background strips
  const zones = [
    { from: 0,                       to: CONFIG.BG_HYPO_DANGER, color: 'rgba(231,76,60,0.4)' },
    { from: CONFIG.BG_HYPO_DANGER,   to: CONFIG.BG_HYPO,        color: 'rgba(230,126,34,0.35)' },
    { from: CONFIG.BG_HYPO,          to: CONFIG.BG_NORMAL_LOW,   color: 'rgba(241,196,15,0.3)' },
    { from: CONFIG.BG_NORMAL_LOW,    to: CONFIG.BG_NORMAL_HIGH,  color: 'rgba(46,204,113,0.35)' },
    { from: CONFIG.BG_NORMAL_HIGH,   to: CONFIG.BG_ELEVATED,     color: 'rgba(241,196,15,0.3)' },
    { from: CONFIG.BG_ELEVATED,      to: CONFIG.BG_HIGH,         color: 'rgba(230,126,34,0.35)' },
    { from: CONFIG.BG_HIGH,          to: bgScale,                color: 'rgba(231,76,60,0.4)' },
  ];

  for (const zone of zones) {
    const zx = x + (zone.from / bgScale) * bgBarW;
    const zw = ((zone.to - zone.from) / bgScale) * bgBarW;
    ctx.fillStyle = zone.color;
    ctx.fillRect(zx, y - 12, zw, energyBarH);
  }

  // Current BG indicator line
  const bgPx = x + Math.min(bg / bgScale, 1) * bgBarW;
  ctx.fillStyle = bgColor;
  ctx.fillRect(bgPx - 2, y - 13, 4, energyBarH + 2);

  // Border — flash if dangerous
  const isDanger = bg < CONFIG.BG_HYPO || bg > CONFIG.BG_HIGH;
  if (isDanger) {
    const flash = 0.5 + 0.5 * Math.sin(Date.now() / 150);
    ctx.strokeStyle = `rgba(231, 76, 60, ${flash})`;
    ctx.lineWidth = 2;
  } else {
    ctx.strokeStyle = '#5D6D7E';
    ctx.lineWidth = 1;
  }
  ctx.strokeRect(x, y - 12, bgBarW, energyBarH);

  // Value + label
  ctx.fillStyle = C.WHITE;
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${bg} mg/dL`, x + bgBarW / 2, y);

  // Zone label below bar
  ctx.font = '9px Arial';
  ctx.fillStyle = bgColor;
  ctx.fillText(bgLabel, x + bgBarW / 2, y + 12);

  x += bgBarW + 20;

  // Workers count
  let workerCount = 0;
  let totalSlots = 0;
  for (const mine of gameState.mines) {
    workerCount += mine.workers.length;
    if (mine.isOperational) {
      totalSlots += CONFIG.MINE_MAX_WORKERS;
    }
  }
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.fillStyle = C.WHITE;
  ctx.fillText('Cells: ', x, y);
  ctx.fillStyle = C.PURPLE;
  ctx.fillText(`${workerCount}/${totalSlots}`, x + 42, y);

  x += 105;

  // Free glucose (rebels) count
  const rebelCount = gameState.peasants.filter(p => p.alive && p.state === PeasantState.REBEL).length;
  ctx.fillStyle = C.WHITE;
  ctx.fillText('Free: ', x, y);
  ctx.fillStyle = C.RED;
  ctx.fillText(`${rebelCount}`, x + 38, y);

  x += 70;

  // Insulin Resistance (degradation)
  const deg = gameState.degradation;
  ctx.fillStyle = C.WHITE;
  ctx.fillText('IR: ', x, y);
  ctx.fillStyle = deg >= 3 ? C.RED : deg >= 1 ? C.GOLD : '#2ECC71';
  ctx.fillText(`${deg}`, x + 22, y);

  // Second row: clock + meal info
  const waveY = 42;
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';

  // Day clock
  const virtualHour = getVirtualHour();
  const timeStr = formatVirtualTime(virtualHour);
  const endHour = CONFIG.DAY_END_HOUR;
  const dayProgress = Math.min(1, (virtualHour - CONFIG.DAY_START_HOUR) / (endHour - CONFIG.DAY_START_HOUR));

  ctx.fillStyle = '#F1C40F';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`\u{1F552} ${timeStr}`, 15, waveY);

  // Day progress bar
  const dayBarX = 90;
  const dayBarW = 100;
  ctx.fillStyle = '#555';
  ctx.fillRect(dayBarX, waveY - 9, dayBarW, 8);
  ctx.fillStyle = dayProgress > 0.9 ? '#E74C3C' : '#2ECC71';
  ctx.fillRect(dayBarX, waveY - 9, dayBarW * dayProgress, 8);
  ctx.strokeStyle = '#5D6D7E';
  ctx.lineWidth = 1;
  ctx.strokeRect(dayBarX, waveY - 9, dayBarW, 8);

  ctx.fillStyle = '#95A5A6';
  ctx.font = '9px Arial';
  ctx.fillText(`Meals: ${gameState.currentWaveIndex}/${gameState.waves.length}`, 200, waveY);

  // Patient + day label
  if (gameState.currentPatientId) {
    ctx.font = '9px Arial';
    ctx.fillStyle = '#7F8C8D';
    ctx.textAlign = 'left';
    ctx.fillText(`Patient: ${gameState.currentPatientId} \u00B7 Day ${gameState.currentDay}`, 300, waveY);
  }

  // Insulin charges (Type 1)
  if (gameState._insulinCharges != null) {
    ctx.font = '9px Arial';
    ctx.fillStyle = gameState._insulinCharges > 0 ? '#3498DB' : '#E74C3C';
    ctx.textAlign = 'left';
    ctx.fillText(`\u{1F489} ${gameState._insulinCharges}/${gameState._insulinChargesMax || '?'}`, 480, waveY);
  }

  // Speed controls + Restart button (top-right)
  if (gameState.phase === GamePhase.PLAYING || gameState.phase === GamePhase.BETWEEN_WAVES) {
    drawSpeedControls(C);

    const btn = restartButtonRect;
    ctx.fillStyle = '#4A6274';
    ctx.strokeStyle = '#5D7A8C';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C.WHITE;
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Restart \u21BB', btn.x + btn.w / 2, btn.y + btn.h / 2 + 4);
  }
}

// Intervention type → emoji map (matches planningMode.js)
const IV_EMOJI = {
  walk: '\u{1F6B6}',
  exercise: '\u{1F3CB}',
  insulin: '\u{1F489}',
  semaglutide: '\u{1F48A}',
  metformin: '\u{1F48A}',
  dapagliflozin: '\u{1F9EA}',
};

function drawGameTimeline() {
  if (gameState.phase !== GamePhase.PLAYING &&
      gameState.phase !== GamePhase.BETWEEN_WAVES) return;

  const plan = gameState.currentPlan;
  if (!plan) return;
  if (plan.meals.length === 0 && plan.interventions.length === 0) return;

  ctx.save();

  const C = CONFIG.COLORS;
  const startHour = CONFIG.DAY_START_HOUR;
  const endHour = CONFIG.DAY_END_HOUR;
  const hourRange = endHour - startHour;

  // Strip position: just below the top bar
  const stripY = 56;
  const stripH = 22;
  const marginL = 50;
  const marginR = 10;
  const stripW = CONFIG.CANVAS_WIDTH - marginL - marginR;

  const hourToX = (h) => marginL + ((h - startHour) / hourRange) * stripW;

  // Background
  ctx.fillStyle = 'rgba(20, 25, 40, 0.85)';
  ctx.fillRect(0, stripY, CONFIG.CANVAS_WIDTH, stripH);

  // Thin track line
  ctx.strokeStyle = '#3D5A6E';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginL, stripY + stripH / 2);
  ctx.lineTo(marginL + stripW, stripY + stripH / 2);
  ctx.stroke();

  // Hour tick marks (every 3 hours)
  ctx.font = '7px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5D6D7E';
  for (let h = startHour; h <= endHour; h += 3) {
    const tx = hourToX(h);
    ctx.beginPath();
    ctx.moveTo(tx, stripY + stripH / 2 - 3);
    ctx.lineTo(tx, stripY + stripH / 2 + 3);
    ctx.stroke();
    ctx.fillText(`${h}`, tx, stripY + stripH - 2);
  }

  // Draw planned meals
  for (const meal of plan.meals) {
    const mx = hourToX(meal.hour);
    const emojis = (meal.foodKeys || [])
      .map(k => FOODS[k]?.emoji || '?')
      .slice(0, 3)
      .join('');

    ctx.globalAlpha = meal.executed ? 1.0 : 0.5;
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.WHITE;
    ctx.fillText(emojis, mx, stripY + 13);

    if (meal.executed) {
      ctx.fillStyle = '#2ECC71';
      ctx.font = 'bold 8px Arial';
      ctx.fillText('\u2713', mx + 12, stripY + 8);
    }
    ctx.globalAlpha = 1.0;
  }

  // Draw planned interventions
  for (const iv of plan.interventions) {
    const ix = hourToX(iv.hour);
    const emoji = IV_EMOJI[iv.type] || '\u2699';

    ctx.globalAlpha = iv.executed ? 1.0 : 0.5;
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3498DB';
    ctx.fillText(emoji, ix, stripY + 20);

    if (iv.executed) {
      ctx.fillStyle = '#2ECC71';
      ctx.font = 'bold 7px Arial';
      ctx.fillText('\u2713', ix + 8, stripY + 15);
    }
    ctx.globalAlpha = 1.0;
  }

  // Current time marker (gold vertical line)
  const currentHour = getVirtualHour();
  if (currentHour >= startHour && currentHour <= endHour) {
    const nowX = hourToX(currentHour);
    ctx.strokeStyle = C.GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nowX, stripY);
    ctx.lineTo(nowX, stripY + stripH);
    ctx.stroke();

    // Small triangle marker at top
    ctx.fillStyle = C.GOLD;
    ctx.beginPath();
    ctx.moveTo(nowX - 3, stripY);
    ctx.lineTo(nowX + 3, stripY);
    ctx.lineTo(nowX, stripY + 4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

const SPEED_BUTTONS = [
  { label: '0.25x', speed: 0.25 },
  { label: '0.5x', speed: 0.5 },
  { label: '1x', speed: 1.0 },
  { label: '2x', speed: 2.0 },
];

function drawSpeedControls(C) {
  // Clear previous rects
  speedButtonRects.length = 0;

  const btnW = 36;
  const btnH = 28;
  const gap = 3;
  const pauseW = 30;
  // Position: left of Restart button
  const totalW = SPEED_BUTTONS.length * (btnW + gap) + pauseW + gap;
  const startX = restartButtonRect.x - totalW - 8;
  const startY = 12;

  let cx = startX;

  // Speed buttons
  for (const sb of SPEED_BUTTONS) {
    const isActive = !gameState.paused && gameState.speedMultiplier === sb.speed;

    ctx.fillStyle = isActive ? '#D4A017' : '#3A5068';
    ctx.strokeStyle = isActive ? '#F1C40F' : '#5D7A8C';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx, startY, btnW, btnH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isActive ? '#1a1a2e' : C.WHITE;
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(sb.label, cx + btnW / 2, startY + btnH / 2 + 4);

    speedButtonRects.push({ x: cx, y: startY, w: btnW, h: btnH, speed: sb.speed, action: 'speed' });
    cx += btnW + gap;
  }

  // Pause button
  const isPaused = gameState.paused;
  ctx.fillStyle = isPaused ? '#C0392B' : '#3A5068';
  ctx.strokeStyle = isPaused ? '#E74C3C' : '#5D7A8C';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cx, startY, pauseW, btnH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(isPaused ? '\u25B6' : '\u23F8', cx + pauseW / 2, startY + btnH / 2 + 4);

  speedButtonRects.push({ x: cx, y: startY, w: pauseW, h: btnH, speed: 0, action: 'pause' });
}

// Bottom panel: BG graph (40px) + plan timeline (40px) = 80px total
export function renderBottomPanel() {
  if (gameState.phase !== GamePhase.PLAYING &&
      gameState.phase !== GamePhase.BETWEEN_WAVES &&
      gameState.phase !== GamePhase.GAME_OVER) return;

  const C = CONFIG.COLORS;
  const panelH = 80;
  const panelY = CONFIG.CANVAS_HEIGHT - panelH;
  const graphH = 40;
  const timelineH = 40;
  const margin = 50; // left margin for hour labels
  const rightMargin = 10;
  const graphW = CONFIG.CANVAS_WIDTH - margin - rightMargin;

  // Panel background
  ctx.fillStyle = 'rgba(30, 30, 50, 0.92)';
  ctx.fillRect(0, panelY, CONFIG.CANVAS_WIDTH, panelH);

  // Separator line
  ctx.strokeStyle = '#3D5A6E';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, panelY);
  ctx.lineTo(CONFIG.CANVAS_WIDTH, panelY);
  ctx.stroke();

  const startHour = CONFIG.DAY_START_HOUR;
  const endHour = CONFIG.DAY_END_HOUR;
  const hourRange = endHour - startHour;

  // Helper: hour → X pixel
  const hourToX = (h) => margin + ((h - startHour) / hourRange) * graphW;

  // === BG GRAPH (upper 40px) ===
  const gY = panelY;
  const bgMin = 0;
  const bgMax = CONFIG.BG_VERY_HIGH;

  // Zone color backgrounds (horizontal bands)
  const zones = [
    { from: bgMax,              to: CONFIG.BG_HIGH,       color: 'rgba(231,76,60,0.15)' },
    { from: CONFIG.BG_HIGH,     to: CONFIG.BG_ELEVATED,   color: 'rgba(230,126,34,0.12)' },
    { from: CONFIG.BG_ELEVATED, to: CONFIG.BG_NORMAL_HIGH, color: 'rgba(241,196,15,0.10)' },
    { from: CONFIG.BG_NORMAL_HIGH, to: CONFIG.BG_NORMAL_LOW, color: 'rgba(46,204,113,0.15)' },
    { from: CONFIG.BG_NORMAL_LOW, to: CONFIG.BG_HYPO,     color: 'rgba(241,196,15,0.10)' },
    { from: CONFIG.BG_HYPO,    to: bgMin,                 color: 'rgba(231,76,60,0.15)' },
  ];

  for (const zone of zones) {
    const yTop = gY + (1 - zone.from / bgMax) * graphH;
    const yBot = gY + (1 - zone.to / bgMax) * graphH;
    ctx.fillStyle = zone.color;
    ctx.fillRect(margin, yTop, graphW, yBot - yTop);
  }

  // Normal range horizontal guide lines
  ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  const normalLowY = gY + (1 - CONFIG.BG_NORMAL_LOW / bgMax) * graphH;
  const normalHighY = gY + (1 - CONFIG.BG_NORMAL_HIGH / bgMax) * graphH;
  ctx.beginPath();
  ctx.moveTo(margin, normalLowY);
  ctx.lineTo(margin + graphW, normalLowY);
  ctx.moveTo(margin, normalHighY);
  ctx.lineTo(margin + graphW, normalHighY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Helper: clamp BG to valid graph range
  const bgToY = (bg) => {
    const clamped = Math.max(0, Math.min(bg, bgMax));
    return gY + (1 - clamped / bgMax) * graphH;
  };

  // BG trace polyline
  const history = gameState.bgHistory;
  if (history.length >= 1) {
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const px = hourToX(history[i].hour);
      const py = bgToY(history[i].bg);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    if (history.length > 1) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }
  }

  // Current BG dot
  if (history.length > 0) {
    const last = history[history.length - 1];
    const dotX = hourToX(last.hour);
    const dotY = bgToY(last.bg);
    ctx.fillStyle = getBGColor(last.bg);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // BG scale labels (left margin)
  ctx.font = '8px Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7F8C8D';
  ctx.fillText('400', margin - 4, gY + 8);
  ctx.fillText('140', margin - 4, normalHighY + 3);
  ctx.fillText('80', margin - 4, normalLowY + 3);

  // === TIMELINE (lower 40px) ===
  const tY = panelY + graphH;

  // Separator between graph and timeline
  ctx.strokeStyle = '#3D5A6E';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, tY);
  ctx.lineTo(margin + graphW, tY);
  ctx.stroke();

  // Hour tick marks + labels (shared X-axis)
  ctx.font = '9px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#95A5A6';
  for (let h = startHour; h <= endHour; h += 2) {
    const tx = hourToX(h);
    // Tick mark
    ctx.strokeStyle = '#4A5568';
    ctx.beginPath();
    ctx.moveTo(tx, tY);
    ctx.lineTo(tx, tY + 6);
    ctx.stroke();
    // Label
    ctx.fillStyle = '#95A5A6';
    ctx.fillText(`${h}:00`, tx, tY + 15);
  }

  // Food event markers on timeline
  for (const evt of gameState.bgEventLog) {
    const ex = hourToX(evt.hour);
    if (evt.type === 'food') {
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(evt.label, ex, tY + 30);
    } else if (evt.type === 'intervention') {
      ctx.font = '9px Arial';
      ctx.fillStyle = '#3498DB';
      ctx.textAlign = 'center';
      ctx.fillText(evt.label, ex, tY + 38);
    }
  }

  // Current time indicator (vertical gold dashed line spanning both graph + timeline)
  const currentHour = getVirtualHour();
  if (currentHour >= startHour && currentHour <= endHour) {
    const nowX = hourToX(currentHour);
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(nowX, panelY);
    ctx.lineTo(nowX, panelY + panelH);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawHypoglycemiaOverlay() {
  const hypo = gameState.hypoDuration;
  const energyPct = getEnergyPercent();

  // Energy-based darkening (existing)
  if (energyPct < 0.3) {
    const alpha = 0.3 * (1 - energyPct / 0.3);
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(alpha, 0.6)})`;
    ctx.fillRect(0, 55, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - 55);
  }

  // BG-based hypoglycemia effects
  if (hypo <= 0) return;

  const cx = CONFIG.CANVAS_WIDTH / 2;
  const cy = CONFIG.CANVAS_HEIGHT / 2;

  if (hypo > 10) {
    // Tier 2: Severe — dark overlay + red flashing + countdown
    const alpha = 0.15 + 0.1 * Math.sin(Date.now() / 200);
    ctx.fillStyle = `rgba(30, 0, 0, ${alpha})`;
    ctx.fillRect(0, 55, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - 55);

    // Vignette from edges
    const grad = ctx.createRadialGradient(cx, cy, 200, cx, cy, 600);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 55, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - 55);

    // "SEVERE HYPOGLYCEMIA" text
    const flash = 0.5 + 0.5 * Math.sin(Date.now() / 150);
    ctx.fillStyle = `rgba(231, 76, 60, ${flash})`;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SEVERE HYPOGLYCEMIA', cx, cy - 30);

    // Countdown to blackout
    const remaining = Math.max(0, Math.ceil(20 - hypo));
    ctx.fillStyle = `rgba(231, 76, 60, ${flash})`;
    ctx.font = 'bold 22px Arial';
    ctx.fillText(`Blackout in ${remaining}s`, cx, cy + 10);
  } else {
    // Tier 1: Mild — yellow tint + warning text
    const alpha = 0.05 + 0.03 * Math.sin(Date.now() / 300);
    ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
    ctx.fillRect(0, 55, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - 55);

    // "HYPOGLYCEMIA" text
    const flash = 0.5 + 0.5 * Math.sin(Date.now() / 250);
    ctx.fillStyle = `rgba(241, 196, 15, ${flash})`;
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HYPOGLYCEMIA', cx, cy - 20);

    // Show drain multiplier hint
    ctx.font = '14px Arial';
    ctx.fillStyle = `rgba(241, 196, 15, ${flash * 0.8})`;
    ctx.fillText('Energy drain x2 | Speed reduced', cx, cy + 10);
  }
}
