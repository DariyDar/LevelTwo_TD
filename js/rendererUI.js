// GlucoDefense — UI rendering (top bar, overlays, restart button)

import { CONFIG } from './config.js';
import { gameState, GamePhase } from './gameState.js';
import { getEnergyPercent } from './systems/energySystem.js';
import { calculateBG, getBGColor, getBGLabel } from './systems/bgSystem.js';
import { PeasantState } from './entities/Peasant.js';
import { getVirtualHour, formatVirtualTime } from './systems/waveManager.js';

let ctx = null;

// Restart button rect for click detection
export const restartButtonRect = { x: 1180, y: 8, w: 80, h: 36 };

export function initUIRenderer(context) {
  ctx = context;
}

export function renderUI() {
  drawTopBar();
  drawHypoglycemiaOverlay();
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

  // Restart button (top-right)
  if (gameState.phase === GamePhase.PLAYING || gameState.phase === GamePhase.BETWEEN_WAVES) {
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
