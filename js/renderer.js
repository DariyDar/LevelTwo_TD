// GlucoDefense — Main renderer (map, background, buildings)

import { CONFIG } from './config.js';
import { gameState } from './gameState.js';

let ctx = null;
let canvas = null;

export function initRenderer(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  canvas.width = CONFIG.CANVAS_WIDTH;
  canvas.height = CONFIG.CANVAS_HEIGHT;
}

export function getCtx() {
  return ctx;
}

export function render() {
  ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  drawBackground();
  drawRoad();
  drawBuildings();
  drawMines();
  drawTrainingEffect();
  drawBuildingHighlights();
  drawBuildingHoverInfo();
  drawNextWaveCountdown();
}

function drawBackground() {
  const C = CONFIG.COLORS;

  // Sea
  ctx.fillStyle = C.SEA;
  ctx.fillRect(0, 0, CONFIG.SEA_X_END, CONFIG.CANVAS_HEIGHT);

  // Shore
  ctx.fillStyle = C.SAND;
  ctx.fillRect(CONFIG.SEA_X_END, 0, CONFIG.SHORE_X_END - CONFIG.SEA_X_END, CONFIG.CANVAS_HEIGHT);

  // Main ground (between shore and village)
  ctx.fillStyle = '#A8D5A2';
  ctx.fillRect(CONFIG.SHORE_X_END, 0, CONFIG.VILLAGE_X_END - CONFIG.SHORE_X_END, CONFIG.CANVAS_HEIGHT);

  // Village
  ctx.fillStyle = C.GRASS;
  ctx.fillRect(650, 0, CONFIG.VILLAGE_X_END - 650, CONFIG.CANVAS_HEIGHT);

  // Shore waves (decorative lines)
  ctx.strokeStyle = '#5DADE2';
  ctx.lineWidth = 2;
  for (let y = 50; y < CONFIG.CANVAS_HEIGHT; y += 80) {
    ctx.beginPath();
    ctx.moveTo(180, y);
    ctx.quadraticCurveTo(190, y - 10, 200, y);
    ctx.stroke();
  }
}

function drawRoad() {
  const C = CONFIG.COLORS;
  const roadY = CONFIG.ROAD_Y_CENTER - CONFIG.ROAD_HEIGHT / 2;

  // Main road
  ctx.fillStyle = C.ROAD;
  ctx.fillRect(CONFIG.SEA_X_END, roadY, 650 - CONFIG.SEA_X_END, CONFIG.ROAD_HEIGHT);

  // Road border lines
  ctx.strokeStyle = '#95A5A6';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(CONFIG.SHORE_X_END, CONFIG.ROAD_Y_CENTER);
  ctx.lineTo(650, CONFIG.ROAD_Y_CENTER);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBuildings() {
  drawLiverTower();
  drawPancreas();
  drawKidneys();
}

function drawLiverTower() {
  const C = CONFIG.COLORS;
  const pos = CONFIG.LIVER_POS;
  const size = CONFIG.LIVER_SIZE;
  const x = pos.x - size.w / 2;
  const y = pos.y - size.h / 2;
  const liver = gameState.liverTower;
  const isDestroyed = liver && liver.destroyed;

  if (isDestroyed) {
    // Destroyed state — dark with repair bar
    ctx.fillStyle = '#3A3A3A';
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 2;
    roundRect(x, y, size.w, size.h, 8);

    ctx.fillStyle = C.RED;
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DAMAGED', pos.x, pos.y);

    // Repair bar
    if (liver.repairTimer > 0) {
      const repairPct = 1 - liver.repairTimer / CONFIG.BUILDING_REPAIR_TIME;
      ctx.fillStyle = '#2ECC71';
      ctx.fillRect(x, y - 6, size.w * repairPct, 3);
    }

    ctx.fillStyle = C.WHITE;
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Liver', pos.x, pos.y - size.h / 2 - 6);
    return;
  }

  // Building body
  ctx.fillStyle = C.GREEN;
  ctx.strokeStyle = C.GREEN_DARK;
  ctx.lineWidth = 2;
  roundRect(x, y, size.w, size.h, 8);

  // Under attack flash
  if (liver && liver.hp < liver.maxHp) {
    const flash = 0.2 + 0.3 * Math.sin(Date.now() / 120);
    ctx.fillStyle = `rgba(231, 76, 60, ${flash})`;
    ctx.fillRect(x + 2, y + 2, size.w - 4, size.h - 4);
  }

  // Draw stored glucose as a fill level inside the liver
  const storage = liver ? liver.storage : 0;
  const maxStorage = CONFIG.LIVER_STORAGE[gameState.degradation] || 100;

  if (storage > 0) {
    const padding = 4;
    const dotR = 2.5;
    const dotGap = 7;
    const innerW = size.w - padding * 2;
    const innerH = size.h - padding * 2;
    const cols = Math.floor(innerW / dotGap);
    const rows = Math.floor(innerH / dotGap);
    const maxDots = cols * rows;
    const dotCount = Math.min(storage, maxDots);

    ctx.fillStyle = CONFIG.COLORS.RED;
    for (let d = 0; d < dotCount; d++) {
      const col = d % cols;
      const row = Math.floor(d / cols);
      const dotX = x + padding + col * dotGap + dotGap / 2;
      const dotY = y + padding + row * dotGap + dotGap / 2;
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Full warning: flash border red when near capacity
    if (storage / maxStorage >= 0.85) {
      const flash = 0.3 + 0.4 * Math.sin(Date.now() / 200);
      ctx.strokeStyle = `rgba(231, 76, 60, ${flash})`;
      ctx.lineWidth = 3;
      roundRect(x, y, size.w, size.h, 8);
    }
  }

  // HP bar (if damaged)
  if (liver && liver.hp < liver.maxHp) {
    const hpPct = liver.hp / liver.maxHp;
    ctx.fillStyle = '#555';
    ctx.fillRect(x, y - 6, size.w, 3);
    ctx.fillStyle = hpPct > 0.5 ? '#2ECC71' : hpPct > 0.25 ? '#F39C12' : '#E74C3C';
    ctx.fillRect(x, y - 6, size.w * hpPct, 3);
  }

  // Label
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Liver', pos.x, pos.y - size.h / 2 - 6);

  // Storage counter
  ctx.font = '10px Arial';
  ctx.fillText(`${storage}/${maxStorage}`, pos.x, pos.y + size.h / 2 + 12);
}

function drawPancreas() {
  const C = CONFIG.COLORS;
  const pos = CONFIG.PANCREAS_POS;
  const size = CONFIG.PANCREAS_SIZE;
  const deg = gameState.degradation;
  const x = pos.x - size.w / 2;
  const y = pos.y - size.h / 2;

  // Color based on degradation
  const colors = [C.PURPLE, '#8E44AD', '#7D3C98', '#6C3483', '#4A235A', '#333333'];
  ctx.fillStyle = colors[Math.min(deg, 5)];
  ctx.strokeStyle = C.PURPLE_DARK;
  ctx.lineWidth = 2;

  // Shake at deg 3+
  let shakeX = 0;
  let shakeY = 0;
  if (deg >= 3) {
    const intensity = (deg - 2) * 2;
    shakeX = (Math.random() - 0.5) * intensity;
    shakeY = (Math.random() - 0.5) * intensity;
  }

  roundRect(x + shakeX, y + shakeY, size.w, size.h, 8);

  // Flash red when under attack (hp below max)
  const pancreas = gameState.pancreas;
  if (pancreas && pancreas.hp < CONFIG.PANCREAS_HP) {
    const flash = 0.2 + 0.3 * Math.sin(Date.now() / 120);
    ctx.fillStyle = `rgba(231, 76, 60, ${flash})`;
    ctx.fillRect(x + shakeX + 2, y + shakeY + 2, size.w - 4, size.h - 4);
  }

  // Label
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Pancreas', pos.x + shakeX, pos.y - 10 + shakeY);

  // Degradation level
  ctx.font = '10px Arial';
  ctx.fillStyle = deg >= 3 ? C.RED : C.WHITE;
  ctx.fillText(`IR: ${deg}`, pos.x + shakeX, pos.y + 8 + shakeY);
}

function drawKidneys() {
  const C = CONFIG.COLORS;
  const pos = CONFIG.KIDNEYS_POS;
  const r = CONFIG.KIDNEYS_RADIUS;
  const kidneys = gameState.kidneys;
  const isDestroyed = kidneys && kidneys.destroyed;

  if (isDestroyed) {
    // Destroyed state
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#3A3A3A';
    ctx.fill();
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = C.RED;
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DAMAGED', pos.x, pos.y + 3);

    // Repair bar
    if (kidneys.repairTimer > 0) {
      const repairPct = 1 - kidneys.repairTimer / CONFIG.BUILDING_REPAIR_TIME;
      ctx.fillStyle = '#2ECC71';
      ctx.fillRect(pos.x - r, pos.y - r - 6, r * 2 * repairPct, 3);
    }

    ctx.fillStyle = C.WHITE;
    ctx.font = 'bold 11px Arial';
    ctx.fillText('Kidneys', pos.x, pos.y - r - 8);
    return;
  }

  // Circle
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fillStyle = C.TEAL;
  ctx.fill();
  ctx.strokeStyle = C.TEAL_DARK;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Under attack flash
  if (kidneys && kidneys.hp < kidneys.maxHp) {
    const flash = 0.2 + 0.3 * Math.sin(Date.now() / 120);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r - 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(231, 76, 60, ${flash})`;
    ctx.fill();

    // HP bar
    const hpPct = kidneys.hp / kidneys.maxHp;
    ctx.fillStyle = '#555';
    ctx.fillRect(pos.x - r, pos.y - r - 6, r * 2, 3);
    ctx.fillStyle = hpPct > 0.5 ? '#2ECC71' : hpPct > 0.25 ? '#F39C12' : '#E74C3C';
    ctx.fillRect(pos.x - r, pos.y - r - 6, r * 2 * hpPct, 3);
  }

  // Label
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Kidneys', pos.x, pos.y + 4);
}

function drawMines() {
  const C = CONFIG.COLORS;
  const size = CONFIG.MINE_SIZE;
  const hw = size.w / 2;
  const hh = size.h / 2;

  for (const mine of gameState.mines) {
    const { x, y } = mine;
    const isDestroyed = mine.destroyed;
    const isDamaged = !isDestroyed && mine.hp < CONFIG.MINE_HP;
    const workerCount = mine.workers.length;

    if (isDestroyed) {
      // Destroyed: dark gray with cracks
      ctx.fillStyle = '#3A3A3A';
      ctx.strokeStyle = '#2A2A2A';
      ctx.lineWidth = 1;
      ctx.fillRect(x - hw, y - hh, size.w, size.h);
      ctx.strokeRect(x - hw, y - hh, size.w, size.h);

      // Crack lines
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - hw + 5, y - hh + 3);
      ctx.lineTo(x + 2, y + 4);
      ctx.lineTo(x + hw - 4, y + hh - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + hw - 6, y - hh + 5);
      ctx.lineTo(x - 3, y - 2);
      ctx.stroke();

      // Rubble dots
      ctx.fillStyle = '#555';
      ctx.fillRect(x - 8, y + hh - 4, 3, 3);
      ctx.fillRect(x + 3, y + hh - 3, 2, 2);
      ctx.fillRect(x - 2, y + hh - 5, 2, 3);

      // Label
      ctx.fillStyle = C.RED;
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Damaged', x, y - 2);

      // Repair bar
      if (mine.repairTimer > 0) {
        const repairPct = 1 - mine.repairTimer / CONFIG.MINE_REPAIR_TIME;
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(x - hw, y - hh - 4, size.w * repairPct, 3);
      }
    } else {
      // Normal or under attack
      ctx.fillStyle = C.ORANGE;
      ctx.strokeStyle = '#E67E22';
      ctx.lineWidth = 1;
      ctx.fillRect(x - hw, y - hh, size.w, size.h);
      ctx.strokeRect(x - hw, y - hh, size.w, size.h);

      // Under attack: red flash overlay
      if (isDamaged) {
        const flash = 0.3 + 0.3 * Math.sin(Date.now() / 150);
        ctx.fillStyle = `rgba(231, 76, 60, ${flash})`;
        ctx.fillRect(x - hw, y - hh, size.w, size.h);
      }

      // Worker count inside mine
      ctx.fillStyle = C.WHITE;
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${workerCount}/${CONFIG.MINE_MAX_WORKERS}`, x, y + 4);
    }
  }
}

function drawBuildingHighlights() {
  const hovered = gameState.hoveredAction;
  if (!hovered) return;

  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 250);

  if (hovered === 'spawnKnight' || hovered === 'metformin') {
    const pos = CONFIG.LIVER_POS;
    const size = CONFIG.LIVER_SIZE;
    const x = pos.x - size.w / 2 - 8;
    const y = pos.y - size.h / 2 - 8;
    const w = size.w + 16;
    const h = size.h + 16;
    ctx.fillStyle = `rgba(241, 196, 15, ${pulse * 0.35})`;
    ctx.strokeStyle = `rgba(241, 196, 15, ${pulse})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();
    _drawHighlightLabel(pos.x, pos.y - size.h / 2 - 16,
      'Hepatocytes (GLUT2)',
      hovered === 'metformin' ? 'Suppresses hepatic glucose output' : 'Intercepts glucose for liver storage',
      pulse);
  }

  if (hovered === 'spawnPriest') {
    const pos = CONFIG.PANCREAS_POS;
    const size = CONFIG.PANCREAS_SIZE;
    const x = pos.x - size.w / 2 - 8;
    const y = pos.y - size.h / 2 - 8;
    const w = size.w + 16;
    const h = size.h + 16;
    ctx.fillStyle = `rgba(241, 196, 15, ${pulse * 0.35})`;
    ctx.strokeStyle = `rgba(241, 196, 15, ${pulse})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();
    _drawHighlightLabel(pos.x, pos.y - size.h / 2 - 16,
      'Beta Cells (Insulin)', 'Releases insulin to convert free glucose', pulse);
  }

  if (hovered === 'kidneyVortex' || hovered === 'dapagliflozin') {
    const pos = CONFIG.KIDNEYS_POS;
    const r = CONFIG.KIDNEYS_RADIUS;
    ctx.fillStyle = `rgba(241, 196, 15, ${pulse * 0.35})`;
    ctx.strokeStyle = `rgba(241, 196, 15, ${pulse})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    _drawHighlightLabel(pos.x, pos.y - r - 18,
      'Nephrons (Filtration)',
      hovered === 'dapagliflozin' ? 'SGLT2 inhibitor blocks glucose reabsorption' : 'Increases glomerular filtration rate',
      pulse);
  }

  if (hovered === 'walk' || hovered === 'exercise' || hovered === 'physicalActivity') {
    const zone = CONFIG.MUSCLE_ZONE;
    ctx.fillStyle = `rgba(241, 196, 15, ${pulse * 0.25})`;
    ctx.strokeStyle = `rgba(241, 196, 15, ${pulse})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(zone.x1 - 8, zone.y1 - 8, zone.x2 - zone.x1 + 16, zone.y2 - zone.y1 + 16, 10);
    ctx.fill();
    ctx.stroke();
    _drawHighlightLabel((zone.x1 + zone.x2) / 2, zone.y1 - 16,
      'Myocytes (GLUT4)', 'Muscle cells absorb glucose via GLUT4 translocation', pulse);
  }

  if (hovered === 'semaglutide') {
    const roadY = CONFIG.ROAD_Y_CENTER;
    const xMin = CONFIG.SEMAGLUTIDE_MINE_X_MIN;
    const xMax = CONFIG.SEMAGLUTIDE_MINE_X_MAX;
    const ySpread = CONFIG.SEMAGLUTIDE_MINE_Y_SPREAD;
    ctx.fillStyle = `rgba(230, 126, 34, ${pulse * 0.25})`;
    ctx.strokeStyle = `rgba(230, 126, 34, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.roundRect(xMin - 8, roadY - ySpread - 8, xMax - xMin + 16, ySpread * 2 + 16, 8);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    _drawHighlightLabel((xMin + xMax) / 2, roadY - ySpread - 16,
      'GI Tract (GLP-1)', 'Slows gastric emptying, reduces appetite', pulse);
  }
}

function _drawHighlightLabel(x, y, title, desc, pulse) {
  ctx.save();
  ctx.textAlign = 'center';

  // Title
  ctx.font = 'bold 13px Arial';
  ctx.fillStyle = `rgba(241, 196, 15, ${pulse})`;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.lineWidth = 3;
  ctx.strokeText(title, x, y);
  ctx.fillText(title, x, y);

  // Description
  ctx.font = '11px Arial';
  ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.9})`;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.lineWidth = 3;
  ctx.strokeText(desc, x, y + 15);
  ctx.fillText(desc, x, y + 15);

  ctx.restore();
}

// Training visual feedback (exercise active)
function drawTrainingEffect() {
  if (!gameState.interventions.exercise.active) return;

  const zone = CONFIG.MUSCLE_ZONE;

  // Orange glow overlay on muscle zone
  const pulse = 0.3 + 0.15 * Math.sin(Date.now() / 400);
  ctx.fillStyle = `rgba(243, 156, 18, ${pulse * 0.12})`;
  ctx.fillRect(zone.x1, zone.y1, zone.x2 - zone.x1, zone.y2 - zone.y1);

  // "x2 ATP" floating text
  const bounce = Math.sin(Date.now() / 500) * 3;
  ctx.fillStyle = '#F39C12';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('x2 ATP', (zone.x1 + zone.x2) / 2, zone.y1 - 10 + bounce);

  // Timer countdown
  const remaining = Math.ceil(gameState.interventions.exercise.timer);
  ctx.font = '12px Arial';
  ctx.fillText(`${remaining}s`, (zone.x1 + zone.x2) / 2, zone.y1 - 28);
}

function drawBuildingHoverInfo() {
  const building = gameState.hoveredBuilding;
  if (!building) return;

  const C = CONFIG.COLORS;
  let lines = [];
  let panelX = gameState.mouseX + 15;
  let panelY = gameState.mouseY - 10;

  if (building === 'liver') {
    const liver = gameState.liverTower;
    if (!liver) return;
    const maxStorage = CONFIG.LIVER_STORAGE[Math.min(gameState.degradation, 5)];
    const knightCount = gameState.knights.filter(k => k.alive).length;
    lines = [
      'Liver (Hepatocytes)',
      'Stores glucose as glycogen.',
      'Auto-releases when BG drops.',
      `Glycogen: ${liver.storage}/${maxStorage}`,
      `GLUT2: ${knightCount}/${CONFIG.LIVER_MAX_KNIGHTS}`,
      `HP: ${Math.round(liver.hp)}/${liver.maxHp}`,
    ];
    if (liver.destroyed) lines.push('Necrosis - repairing...');
  } else if (building === 'pancreas') {
    const panc = gameState.pancreas;
    if (!panc) return;
    const deg = gameState.degradation;
    const activePriests = gameState.priests.filter(p => p.alive).length;
    const maxPriests = CONFIG.PANCREAS_MAX_PRIESTS[Math.min(deg, 4)];
    const resistance = CONFIG.RESISTANCE_BY_DEGRADATION[Math.min(deg, 4)];
    lines = [
      'Pancreas (Beta Cells)',
      'Secretes insulin for glucose uptake.',
      `Active Insulin: ${activePriests}/${maxPriests}`,
      `IR Stage: ${deg}`,
      `Uptake Efficacy: ${Math.round(resistance * 100)}%`,
      `Beta Cell HP: ${Math.round(panc.hp)}/${panc.maxHp}`,
    ];
  } else if (building === 'kidneys') {
    const kid = gameState.kidneys;
    if (!kid) return;
    lines = [
      'Kidneys (Nephrons)',
      'Filter excess glucose from blood.',
      `GFR Cooldown: ${kid.cooldown > 0 ? Math.ceil(kid.cooldown) + 's' : 'Ready'}`,
      `HP: ${Math.round(kid.hp)}/${kid.maxHp}`,
    ];
    if (kid.destroyed) lines.push('Nephropathy - repairing...');
  } else if (building === 'mines') {
    const totalWorkers = gameState.mines.reduce((sum, m) => sum + m.workers.length, 0);
    const totalSlots = gameState.mines.length * CONFIG.MINE_MAX_WORKERS;
    const destroyed = gameState.mines.filter(m => m.destroyed).length;
    lines = [
      'Skeletal Muscles (Myocytes)',
      'Consume glucose for ATP via glycolysis.',
      `Active Glucose: ${totalWorkers}/${totalSlots}`,
      `Damaged Cells: ${destroyed}/${gameState.mines.length}`,
    ];
  }

  if (lines.length === 0) return;

  const panelW = 240;
  const lineH = 16;
  const panelH = lines.length * lineH + 12;

  // Keep panel on screen
  if (panelX + panelW > CONFIG.CANVAS_WIDTH - 5) panelX = gameState.mouseX - panelW - 15;
  if (panelY + panelH > CONFIG.CANVAS_HEIGHT - 5) panelY = CONFIG.CANVAS_HEIGHT - panelH - 5;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = i === 0 ? C.GOLD : C.WHITE;
    ctx.font = i === 0 ? 'bold 12px Arial' : '11px Arial';
    ctx.fillText(lines[i], panelX + 8, panelY + 14 + i * lineH);
  }
}

export const nextMealBtnRect = { x: 0, y: 0, w: 0, h: 0, visible: false };
export const juiceBtnRect = { x: 0, y: 0, w: 0, h: 0, visible: false };

function drawNextWaveCountdown() {
  nextMealBtnRect.visible = false;
  juiceBtnRect.visible = false;

  if (gameState.phase !== 'playing' && gameState.phase !== 'between_waves') return;

  const cx = CONFIG.SEA_X_END / 2;
  const hasNextWave = !gameState.allWavesSent &&
    gameState.currentWaveIndex < gameState.waves.length;

  // Next meal panel (when next meal is pending)
  if (hasNextWave && gameState.nextWaveCountdown > 0) {
    const countdown = gameState.nextWaveCountdown;
    const nextWave = gameState.waves[gameState.currentWaveIndex];
    const mealTime = nextWave.time || '';
    const cy = 120;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(cx - 70, cy - 30, 140, 95, 6);
    ctx.fill();

    ctx.fillStyle = CONFIG.COLORS.WHITE;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Next meal', cx, cy - 12);

    if (mealTime) {
      ctx.font = '11px Arial';
      ctx.fillStyle = CONFIG.COLORS.GOLD;
      ctx.fillText(mealTime, cx, cy + 4);
    }

    const secs = Math.ceil(countdown);
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = secs <= 10 ? CONFIG.COLORS.RED : CONFIG.COLORS.WHITE;
    ctx.fillText(`${secs}s`, cx, cy + 28);

    const btnW = 100;
    const btnH = 24;
    const btnX = cx - btnW / 2;
    const btnY = cy + 38;
    Object.assign(nextMealBtnRect, { x: btnX, y: btnY, w: btnW, h: btnH, visible: true });

    const isHovered = gameState.mouseX >= btnX && gameState.mouseX <= btnX + btnW &&
                      gameState.mouseY >= btnY && gameState.mouseY <= btnY + btnH;

    ctx.fillStyle = isHovered ? '#E67E22' : '#D4740D';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 4);
    ctx.fill();

    ctx.fillStyle = CONFIG.COLORS.WHITE;
    ctx.font = 'bold 11px Arial';
    ctx.fillText('Send Now', cx, btnY + 16);
  }

  // "Drink Juice" button (always visible during gameplay)
  drawJuiceButton(cx);
}

function drawJuiceButton(cx) {
  const juiceCd = gameState.juiceCooldown || 0;
  const onCooldown = juiceCd > 0;
  const btnW = 100;
  const btnH = 28;
  const btnX = cx - btnW / 2;
  const btnY = 260;

  Object.assign(juiceBtnRect, { x: btnX, y: btnY, w: btnW, h: btnH, visible: true });

  const isHovered = gameState.mouseX >= btnX && gameState.mouseX <= btnX + btnW &&
                    gameState.mouseY >= btnY && gameState.mouseY <= btnY + btnH;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.roundRect(btnX, btnY - 16, btnW, btnH + 20, 6);
  ctx.fill();

  // Label
  ctx.fillStyle = CONFIG.COLORS.WHITE;
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Unplanned snack', cx, btnY - 4);

  // Button
  if (onCooldown) {
    ctx.fillStyle = '#2C3E50';
  } else {
    ctx.fillStyle = isHovered ? '#8E44AD' : '#6C3483';
  }
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 4);
  ctx.fill();

  ctx.fillStyle = onCooldown ? '#7F8C8D' : CONFIG.COLORS.WHITE;
  ctx.font = 'bold 11px Arial';
  ctx.fillText('\u{1F9C3} Juice', cx, btnY + 12);

  if (onCooldown) {
    ctx.font = '9px Arial';
    ctx.fillStyle = '#E74C3C';
    ctx.fillText(`${Math.ceil(juiceCd)}s`, cx, btnY + 24);
  } else {
    ctx.font = '9px Arial';
    ctx.fillStyle = '#95A5A6';
    ctx.fillText('80 fast glucose', cx, btnY + 24);
  }
}

// Utility: rounded rectangle
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
