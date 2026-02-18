// GlucoDefense — Results screen (shown for all outcomes: victory, defeat, blackout)

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';
import { getBGColor } from '../systems/bgSystem.js';
import { getTimeInRange } from '../systems/bgHistory.js';
import { unlockNextDay } from './menu.js';
import { getPatient } from '../patients/index.js';

let ctx = null;
let canvas = null;
let onAction = null;
let buttonRects = [];
let progressSaved = false;

export function initGameOver(canvasEl, context, actionCallback) {
  canvas = canvasEl;
  ctx = context;
  onAction = actionCallback;

  canvas.addEventListener('click', handleClick);
}

export function renderGameOver() {
  if (gameState.phase !== GamePhase.GAME_OVER) return;

  const reason = gameState.gameOverReason;
  const C = CONFIG.COLORS;
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;

  // Full overlay background
  if (reason === 'victory') {
    ctx.fillStyle = 'rgba(20, 40, 30, 0.92)';
  } else if (reason === 'blackout') {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
  } else {
    ctx.fillStyle = 'rgba(40, 20, 20, 0.92)';
  }
  ctx.fillRect(0, 0, W, H);

  // Unlock on victory (per-patient progress) — save only once
  if (reason === 'victory' && gameState.currentPatientId && !progressSaved) {
    progressSaved = true;
    const stars = getStarRating(gameState.degradation);
    unlockNextDay(gameState.currentPatientId, gameState.currentDay, stars);
  }

  // === HEADER: Title + Stars/Reason ===
  const headerY = 50;
  drawHeader(reason, C, W, headerY);

  // === BG GRAPH (main area) ===
  const graphX = 80;
  const graphY = 130;
  const graphW = W - 160;
  const graphH = 250;
  drawResultsGraph(graphX, graphY, graphW, graphH, C);

  // === STATS ROW ===
  const statsY = graphY + graphH + 25;
  drawStatsRow(C, W, statsY);

  // === RECOMMENDATIONS ===
  const recs = getRecommendations(reason);
  const recsY = statsY + 40;
  drawRecommendations(recs, C, W, recsY);

  // === BUTTONS ===
  buttonRects = [];
  const btnY = recsY + recs.length * 18 + 20;
  const btnW = 120;
  const btnH = 44;

  const patient = getPatient(gameState.currentPatientId);
  const maxDays = patient ? patient.days.length : 5;
  if (reason === 'victory' && gameState.currentDay < maxDays) {
    drawButton('Retry', W / 2 - btnW * 1.5 - 15, btnY, btnW, btnH, 'retry');
    drawButton('Next Day', W / 2 - btnW / 2, btnY, btnW, btnH, 'next');
    drawButton('Menu', W / 2 + btnW / 2 + 15, btnY, btnW, btnH, 'menu');
  } else {
    drawButton('Retry', W / 2 - btnW - 10, btnY, btnW, btnH, 'retry');
    drawButton('Menu', W / 2 + 10, btnY, btnW, btnH, 'menu');
  }
}

function drawHeader(reason, C, W, y) {
  ctx.textAlign = 'center';

  if (reason === 'victory') {
    const stars = getStarRating(gameState.degradation);

    ctx.fillStyle = '#2ECC71';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('VICTORY!', W / 2, y);

    // Stars
    ctx.font = '32px serif';
    const starStr = '\u2B50'.repeat(stars) + '\u2606'.repeat(3 - stars);
    ctx.fillText(starStr, W / 2, y + 40);

    const ratingTexts = ['', 'Decent', 'Good', 'Excellent!'];
    ctx.font = '16px Arial';
    ctx.fillStyle = C.GOLD;
    ctx.fillText(ratingTexts[stars] || '', W / 2, y + 62);
  } else if (reason === 'blackout') {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    ctx.fillStyle = `rgba(231, 76, 60, ${0.5 + pulse * 0.5})`;
    ctx.font = 'bold 36px Arial';
    ctx.fillText('BLACKOUT', W / 2, y);

    ctx.fillStyle = C.WHITE;
    ctx.font = '14px Arial';
    ctx.fillText('Hypoglycemic coma — blood glucose dropped too low', W / 2, y + 30);
  } else if (reason === 'pancreas_destroyed') {
    ctx.fillStyle = C.RED;
    ctx.font = 'bold 36px Arial';
    ctx.fillText('DEFEAT', W / 2, y);

    ctx.fillStyle = C.WHITE;
    ctx.font = '14px Arial';
    ctx.fillText('Pancreatic beta cells destroyed — insulin production failed', W / 2, y + 30);
  } else {
    ctx.fillStyle = C.RED;
    ctx.font = 'bold 36px Arial';
    ctx.fillText('DEFEAT', W / 2, y);

    ctx.fillStyle = C.WHITE;
    ctx.font = '14px Arial';
    ctx.fillText(`Organ damage too severe — IR level: ${gameState.degradation}`, W / 2, y + 30);
  }
}

function drawResultsGraph(gx, gy, gw, gh, C) {
  const startHour = CONFIG.DAY_START_HOUR;
  const endHour = CONFIG.DAY_END_HOUR;
  const hourRange = endHour - startHour;
  const bgMax = CONFIG.BG_VERY_HIGH;

  const hourToX = (h) => gx + ((h - startHour) / hourRange) * gw;
  const bgToY = (bg) => {
    const clamped = Math.max(0, Math.min(bg, bgMax));
    return gy + (1 - clamped / bgMax) * gh;
  };

  // Graph background
  ctx.fillStyle = 'rgba(20, 25, 35, 0.8)';
  ctx.beginPath();
  ctx.roundRect(gx - 5, gy - 5, gw + 10, gh + 10, 6);
  ctx.fill();

  // Zone color backgrounds
  const zones = [
    { from: bgMax,                to: CONFIG.BG_HIGH,         color: 'rgba(231,76,60,0.12)' },
    { from: CONFIG.BG_HIGH,       to: CONFIG.BG_ELEVATED,     color: 'rgba(230,126,34,0.10)' },
    { from: CONFIG.BG_ELEVATED,   to: CONFIG.BG_NORMAL_HIGH,  color: 'rgba(241,196,15,0.08)' },
    { from: CONFIG.BG_NORMAL_HIGH, to: CONFIG.BG_NORMAL_LOW,  color: 'rgba(46,204,113,0.15)' },
    { from: CONFIG.BG_NORMAL_LOW, to: CONFIG.BG_HYPO,         color: 'rgba(241,196,15,0.08)' },
    { from: CONFIG.BG_HYPO,       to: 0,                      color: 'rgba(231,76,60,0.12)' },
  ];

  for (const zone of zones) {
    const yTop = bgToY(zone.from);
    const yBot = bgToY(zone.to);
    ctx.fillStyle = zone.color;
    ctx.fillRect(gx, yTop, gw, yBot - yTop);
  }

  // Normal range guide lines
  ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(gx, bgToY(CONFIG.BG_NORMAL_LOW));
  ctx.lineTo(gx + gw, bgToY(CONFIG.BG_NORMAL_LOW));
  ctx.moveTo(gx, bgToY(CONFIG.BG_NORMAL_HIGH));
  ctx.lineTo(gx + gw, bgToY(CONFIG.BG_NORMAL_HIGH));
  ctx.stroke();
  ctx.setLineDash([]);

  // BG trace
  const history = gameState.bgHistory;
  if (history.length > 1) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const px = hourToX(history[i].hour);
      const py = bgToY(history[i].bg);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  }

  // Hour labels along bottom
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7F8C8D';
  for (let h = startHour; h <= endHour; h += 2) {
    const tx = hourToX(h);
    ctx.beginPath();
    ctx.moveTo(tx, gy + gh);
    ctx.lineTo(tx, gy + gh + 4);
    ctx.strokeStyle = '#4A5568';
    ctx.stroke();
    ctx.fillText(`${h}:00`, tx, gy + gh + 14);
  }

  // BG scale labels (left side)
  ctx.font = '9px Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7F8C8D';
  const scaleValues = [400, 250, 180, 140, 80, 70, 0];
  for (const v of scaleValues) {
    const ly = bgToY(v);
    if (ly > gy + 5 && ly < gy + gh - 5) {
      ctx.fillText(`${v}`, gx - 8, ly + 3);
    }
  }

  // Event markers (food above graph, interventions below)
  for (const evt of gameState.bgEventLog) {
    const ex = hourToX(evt.hour);
    if (ex < gx || ex > gx + gw) continue;

    if (evt.type === 'food') {
      // Food emoji above graph
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = C.WHITE;
      ctx.fillText(evt.label, ex, gy - 10);

      // Vertical marker line
      ctx.strokeStyle = 'rgba(241, 196, 15, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(ex, gy);
      ctx.lineTo(ex, gy + gh);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (evt.type === 'intervention') {
      // Intervention label below graph
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#3498DB';
      ctx.fillText(evt.label, ex, gy + gh + 26);
    }
  }

  // Energy graph overlay (gold line, right Y-axis)
  const energyHistory = gameState.energyHistory;
  if (energyHistory && energyHistory.length > 1) {
    const eMax = CONFIG.ENERGY_MAX;
    const energyToY = (e) => {
      const clamped = Math.max(0, Math.min(e, eMax));
      return gy + (1 - clamped / eMax) * gh;
    };

    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let i = 0; i < energyHistory.length; i++) {
      const px = hourToX(energyHistory[i].hour);
      const py = energyToY(energyHistory[i].energy);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#F1C40F';
    ctx.stroke();
    ctx.setLineDash([]);

    // Energy scale labels (right side)
    ctx.font = '9px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#F1C40F';
    const eScaleValues = [300, 200, 100, 0];
    for (const v of eScaleValues) {
      const ly = energyToY(v);
      if (ly > gy + 5 && ly < gy + gh - 5) {
        ctx.fillText(`${v}E`, gx + gw + 8, ly + 3);
      }
    }

    // Legend
    ctx.font = '9px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#F1C40F';
    ctx.fillText('--- Energy (ATP)', gx + gw - 100, gy - 10);
  }

  // Graph border
  ctx.strokeStyle = '#3D5A6E';
  ctx.lineWidth = 1;
  ctx.strokeRect(gx, gy, gw, gh);
}

function drawStatsRow(C, W, y) {
  ctx.font = '13px Arial';
  ctx.textAlign = 'center';

  // Time in range (only if we have enough data)
  const hasData = gameState.bgHistory.length >= 5;
  if (hasData) {
    const tir = getTimeInRange();
    const tirColor = tir.normal >= 70 ? '#2ECC71' : tir.normal >= 50 ? C.GOLD : C.RED;
    ctx.fillStyle = C.WHITE;
    ctx.fillText('Time in Range:', W / 2 - 300, y);
    ctx.fillStyle = tirColor;
    ctx.fillText(`${tir.normal}%`, W / 2 - 210, y);

    // Low / High
    ctx.fillStyle = '#95A5A6';
    ctx.font = '11px Arial';
    ctx.fillText(`Low ${tir.low}%  |  High ${tir.high}%`, W / 2 - 255, y + 18);
    ctx.font = '13px Arial';
  } else {
    ctx.fillStyle = '#7F8C8D';
    ctx.fillText('Time in Range: —', W / 2 - 255, y);
  }

  // Peak BG
  ctx.font = '13px Arial';
  ctx.fillStyle = C.WHITE;
  ctx.fillText(`Peak BG: ${gameState.stats.peakBG}`, W / 2 - 50, y);

  // Total rebels
  ctx.fillText(`Rebels: ${gameState.stats.totalRebels}`, W / 2 + 100, y);

  // IR level
  const deg = gameState.degradation;
  ctx.fillText('IR:', W / 2 + 230, y);
  ctx.fillStyle = deg >= 3 ? C.RED : deg >= 1 ? C.GOLD : '#2ECC71';
  ctx.fillText(`${deg}`, W / 2 + 260, y);
}

function drawButton(label, x, y, w, h, action) {
  const C = CONFIG.COLORS;

  // Button background
  const isNextDay = action === 'next';
  ctx.fillStyle = isNextDay ? '#2E7D32' : '#4A6274';
  ctx.strokeStyle = isNextDay ? '#4CAF50' : '#5D7A8C';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 5);

  buttonRects.push({ x, y, w, h, action });
}

function getStarRating(degradation) {
  if (degradation === 0) return 3;
  if (degradation === 1) return 2;
  if (degradation <= 3) return 1;
  return 0;
}

function getRecommendations(reason) {
  const recs = [];
  const patientId = gameState.currentPatientId;
  if (!patientId) return recs;

  const hasData = gameState.bgHistory.length >= 5;
  const tir = hasData ? getTimeInRange() : null;

  if (reason === 'victory') {
    const stars = getStarRating(gameState.degradation);
    if (stars === 3) {
      recs.push('Excellent glucose control! You kept blood sugar in the healthy range.');
    } else if (stars >= 2) {
      recs.push('Good job! Some insulin resistance developed \u2014 try spacing meals further apart.');
    }
  }

  if (reason === 'blackout') {
    recs.push('Blood sugar dropped dangerously low. Eat more regularly or choose foods with more carbs.');
    if (patientId === 'type1') {
      recs.push('With Type 1, reduce insulin dose before exercise to prevent lows.');
    }
  }

  if (reason === 'pancreas_destroyed') {
    recs.push('Too many rebels damaged the pancreas. Use insulin or exercise to clear glucose faster.');
  }

  if (tir) {
    if (tir.high > 40) {
      recs.push('BG was high for too long. Choose slower-absorbing foods and use interventions after meals.');
    }
    if (tir.low > 15) {
      recs.push('BG dropped low frequently. Add snacks between meals or reduce medication timing.');
    }
  }

  if (gameState.degradation >= 2 && reason !== 'victory') {
    recs.push('Organ damage was significant. Keep BG in range (80\u2013140) to prevent insulin resistance.');
  }

  if (patientId === 'type1' && recs.length < 3) {
    recs.push('Type 1: Match insulin doses carefully to carb counts for best control.');
  }
  if (patientId === 'type2' && recs.length < 3) {
    recs.push('Type 2: Combine medications with exercise and healthy food choices.');
  }
  if (patientId === 'type2advanced' && recs.length < 3) {
    recs.push('Advanced Type 2: Every meal matters \u2014 prioritize slow-absorbing foods.');
  }

  return recs.slice(0, 3);
}

function drawRecommendations(recs, C, W, y) {
  if (recs.length === 0) return;

  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = C.GOLD;

  for (let i = 0; i < recs.length; i++) {
    ctx.fillText(recs[i], W / 2, y + i * 18);
  }
}

function handleClick(e) {
  if (gameState.phase !== GamePhase.GAME_OVER) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  for (const btn of buttonRects) {
    if (mx >= btn.x && mx <= btn.x + btn.w &&
        my >= btn.y && my <= btn.y + btn.h) {
      progressSaved = false;
      onAction(btn.action);
      break;
    }
  }
}
