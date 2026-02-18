// GlucoDefense — Main renderer (map, background, buildings)

import { CONFIG } from './config.js';
import { gameState } from './gameState.js';
import { drawStaticSprite, getSprite } from './spriteLoader.js';
import { drawSprite } from './spriteAnimator.js';
import { calculateBG } from './systems/bgSystem.js';

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
  drawBackground();
  drawTrainingEffect();
  drawBuildingHighlights();
  drawNextWaveCountdown();
}

// All buildings rendered as overlay ABOVE entities for z-order
export function renderBuildingsOverlay() {
  drawBuildings();
  drawMines();
  drawBuildingHoverInfo();
}

// Legacy alias
export function renderMinesOverlay() {
  renderBuildingsOverlay();
}

function drawBackground() {
  const C = CONFIG.COLORS;
  const pad = 400;
  const left = -pad;
  const top = -pad;
  const right = CONFIG.CANVAS_WIDTH + pad;
  const bottom = CONFIG.CANVAS_HEIGHT + pad;
  const fullH = bottom - top;

  // Water — tiled texture or fallback
  const waterSprite = getSprite('terrain_water');
  if (waterSprite) {
    const pattern = ctx.createPattern(waterSprite.img, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(left, top, CONFIG.SEA_X_END - left, fullH);
  } else {
    ctx.fillStyle = C.SEA;
    ctx.fillRect(left, top, CONFIG.SEA_X_END - left, fullH);
  }

  // Shore — sand color (no good sand tile available)
  ctx.fillStyle = C.SAND;
  ctx.fillRect(CONFIG.SEA_X_END, top, CONFIG.SHORE_X_END - CONFIG.SEA_X_END, fullH);

  // Grass — extract a grass tile from Tilemap_color1 (top-left 64x64 patch)
  const grassSprite = getSprite('terrain_grass');
  if (grassSprite) {
    // Create offscreen canvas with a 64x64 grass tile from tilemap
    if (!drawBackground._grassPattern) {
      const tile = document.createElement('canvas');
      tile.width = 64;
      tile.height = 64;
      const tc = tile.getContext('2d');
      // Top-left corner of tilemap is a full grass tile
      tc.drawImage(grassSprite.img, 64, 64, 64, 64, 0, 0, 64, 64);
      drawBackground._grassPattern = ctx.createPattern(tile, 'repeat');
    }
    ctx.fillStyle = drawBackground._grassPattern;
    ctx.fillRect(CONFIG.SHORE_X_END, top, right - CONFIG.SHORE_X_END, fullH);
  } else {
    ctx.fillStyle = '#A8D5A2';
    ctx.fillRect(CONFIG.SHORE_X_END, top, CONFIG.VILLAGE_X_END - CONFIG.SHORE_X_END, fullH);
    ctx.fillStyle = C.GRASS;
    ctx.fillRect(CONFIG.VILLAGE_X_END, top, right - CONFIG.VILLAGE_X_END, fullH);
  }

  // Shore waves (water foam sprites)
  const foamSprite = getSprite('terrain_foam');
  if (foamSprite) {
    const foamFrame = Math.floor(Date.now() / 200) % foamSprite.frameCount;
    const fw = foamSprite.frameW;
    const fh = foamSprite.frameH;
    const sx = foamFrame * fw;
    const foamSize = 48;
    for (let y = -20; y < CONFIG.CANVAS_HEIGHT + 40; y += foamSize - 4) {
      ctx.drawImage(foamSprite.img, sx, 0, fw, fh,
        CONFIG.SEA_X_END - foamSize / 2, y, foamSize, foamSize);
    }
  } else {
    ctx.strokeStyle = '#5DADE2';
    ctx.lineWidth = 2;
    for (let y = 50; y < CONFIG.CANVAS_HEIGHT; y += 80) {
      ctx.beginPath();
      ctx.moveTo(180, y);
      ctx.quadraticCurveTo(190, y - 10, 200, y);
      ctx.stroke();
    }
  }
}

function drawBuildings() {
  drawCastle();
  drawPancreas();
  drawKidneys();
}

// --- Castle (former Liver Tower) ---

function drawCastle() {
  const C = CONFIG.COLORS;
  const pos = CONFIG.LIVER_POS;
  const size = CONFIG.LIVER_SIZE;
  const liver = gameState.liverTower;
  const isDestroyed = liver && liver.destroyed;

  // Castle sprite is 320x256 — scale proportionally
  const sprW = size.w;
  const sprH = sprW * (256 / 320);
  const sprX = pos.x - sprW / 2;
  const sprY = pos.y - sprH / 2 + 10;

  // Fallback rect position
  const x = pos.x - size.w / 2;
  const y = pos.y - size.h / 2;

  if (isDestroyed) {
    ctx.globalAlpha = 0.4;
    if (!drawStaticSprite(ctx, 'bld_castle', sprX, sprY, sprW, sprH)) {
      ctx.fillStyle = '#3A3A3A';
      ctx.strokeStyle = '#2A2A2A';
      ctx.lineWidth = 2;
      roundRect(x, y, size.w, size.h, 8);
    }
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = C.RED;
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DAMAGED', pos.x, pos.y);

    if (liver.repairTimer > 0) {
      const repairPct = 1 - liver.repairTimer / CONFIG.BUILDING_REPAIR_TIME;
      ctx.fillStyle = '#2ECC71';
      ctx.fillRect(x, sprY - 8, size.w * repairPct, 4);
    }

    // Label below
    ctx.fillStyle = C.WHITE;
    ctx.font = 'bold 13px Arial';
    ctx.fillText('Liver', pos.x, sprY + sprH + 8);
    return;
  }

  // Building sprite — Castle asset
  if (!drawStaticSprite(ctx, 'bld_castle', sprX, sprY, sprW, sprH)) {
    ctx.fillStyle = C.GREEN;
    ctx.strokeStyle = C.GREEN_DARK;
    ctx.lineWidth = 2;
    roundRect(x, y, size.w, size.h, 8);
  }

  // Under attack flash
  if (liver && liver.hp < liver.maxHp) {
    const flash = 0.2 + 0.3 * Math.sin(Date.now() / 120);
    ctx.fillStyle = `rgba(231, 76, 60, ${flash})`;
    ctx.fillRect(sprX + 4, sprY + 4, sprW - 8, sprH - 8);
  }

  // Roof glucose sprites (visible on top of castle)
  if (liver && liver.roofGlucose.length > 0) {
    const roof = CONFIG.CASTLE_ROOF;
    const roofSpriteSize = 48;
    for (const g of liver.roofGlucose) {
      const sprKey = g.speedCategory === 'slow' ? 'pawn_yellow_run' : 'pawn_red_run';
      if (!drawStaticSprite(ctx, sprKey, g.x - roofSpriteSize / 2, g.y - roofSpriteSize / 2, roofSpriteSize, roofSpriteSize)) {
        const color = g.speedCategory === 'slow' ? C.ORANGE : C.RED;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Overflow flash
    const storage = liver.storage;
    const maxStorage = liver.maxStorage;
    if (storage / maxStorage >= 0.85) {
      const flash = 0.3 + 0.4 * Math.sin(Date.now() / 200);
      ctx.strokeStyle = `rgba(231, 76, 60, ${flash})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(sprX, sprY, sprW, sprH, 4);
      ctx.stroke();
    }
  }

  // HP bar ABOVE
  if (liver && liver.hp < liver.maxHp) {
    const hpPct = liver.hp / liver.maxHp;
    ctx.fillStyle = '#555';
    ctx.fillRect(x, sprY - 8, size.w, 4);
    ctx.fillStyle = hpPct > 0.5 ? '#2ECC71' : hpPct > 0.25 ? '#F39C12' : '#E74C3C';
    ctx.fillRect(x, sprY - 8, size.w * hpPct, 4);
  }

  // Label BELOW
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Liver', pos.x, sprY + sprH + 8);

  // Storage counter (display in mg/dL equivalents)
  const storage = liver ? liver.storage : 0;
  const maxStorage = liver ? liver.maxStorage : 100;
  const gpu = CONFIG.GLUCOSE_PER_UNIT;
  ctx.font = '11px Arial';
  ctx.fillText(`${storage * gpu}/${maxStorage * gpu}`, pos.x, sprY + sprH + 22);
}

// --- Pancreas ---

function drawPancreas() {
  const C = CONFIG.COLORS;
  const pos = CONFIG.PANCREAS_POS;
  const size = CONFIG.PANCREAS_SIZE;
  const deg = gameState.degradation;

  // Sprite: Monastery is 192x320
  const sprW = size.w;
  const sprH = sprW * (320 / 192);
  const sprX = pos.x - sprW / 2;
  const sprY = pos.y - sprH / 2 + 20;

  // Fallback rect
  const x = pos.x - size.w / 2;
  const y = pos.y - size.h / 2;

  // Shake at deg 3+
  let shakeX = 0;
  let shakeY = 0;
  if (deg >= 3) {
    const intensity = (deg - 2) * 2;
    shakeX = (Math.random() - 0.5) * intensity;
    shakeY = (Math.random() - 0.5) * intensity;
  }

  // Darken at higher degradation
  if (deg >= 2) {
    const darken = Math.min(0.6, deg * 0.12);
    ctx.globalAlpha = 1.0 - darken;
  }

  if (!drawStaticSprite(ctx, 'bld_pancreas', sprX + shakeX, sprY + shakeY, sprW, sprH)) {
    const colors = [C.PURPLE, '#8E44AD', '#7D3C98', '#6C3483', '#4A235A', '#333333'];
    ctx.fillStyle = colors[Math.min(deg, 5)];
    ctx.strokeStyle = C.PURPLE_DARK;
    ctx.lineWidth = 2;
    roundRect(x + shakeX, y + shakeY, size.w, size.h, 8);
  }
  ctx.globalAlpha = 1.0;

  // Flash red when under attack
  const pancreas = gameState.pancreas;
  if (pancreas && pancreas.hp < CONFIG.PANCREAS_HP) {
    const flash = 0.2 + 0.3 * Math.sin(Date.now() / 120);
    ctx.fillStyle = `rgba(231, 76, 60, ${flash})`;
    ctx.fillRect(sprX + shakeX + 4, sprY + shakeY + 4, sprW - 8, sprH - 8);
  }

  // Label BELOW
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Pancreas', pos.x + shakeX, sprY + sprH + 8 + shakeY);

  // Degradation level with descriptive label
  const degLabels = [
    'Healthy \u03B2-cells',
    'Mild IR',
    'Moderate IR',
    'Severe IR \u2014 liver leaks',
    'Critical \u2014 near failure',
  ];
  ctx.font = '10px Arial';
  ctx.fillStyle = deg >= 3 ? C.RED : deg >= 1 ? '#F39C12' : '#2ECC71';
  ctx.fillText(degLabels[Math.min(deg, 4)], pos.x + shakeX, sprY + sprH + 22 + shakeY);
}

// --- Kidneys ---

function drawKidneys() {
  const C = CONFIG.COLORS;
  const pos = CONFIG.KIDNEYS_POS;
  const r = CONFIG.KIDNEYS_RADIUS;
  const kidneys = gameState.kidneys;
  const isDestroyed = kidneys && kidneys.destroyed;

  // Sprite: Tower is 128x256
  const sprW = r * 2 + 20;
  const sprH = sprW * (256 / 128);
  const sprX = pos.x - sprW / 2;
  const sprY = pos.y - sprH / 2 + 10;

  if (isDestroyed) {
    ctx.globalAlpha = 0.4;
    if (!drawStaticSprite(ctx, 'bld_kidneys', sprX, sprY, sprW, sprH)) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#3A3A3A';
      ctx.fill();
      ctx.strokeStyle = '#2A2A2A';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = C.RED;
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DAMAGED', pos.x, pos.y + 3);

    if (kidneys.repairTimer > 0) {
      const repairPct = 1 - kidneys.repairTimer / CONFIG.BUILDING_REPAIR_TIME;
      ctx.fillStyle = '#2ECC71';
      ctx.fillRect(pos.x - r, sprY - 8, r * 2 * repairPct, 4);
    }

    // Label BELOW
    ctx.fillStyle = C.WHITE;
    ctx.font = 'bold 13px Arial';
    ctx.fillText('Kidneys', pos.x, sprY + sprH + 8);
    return;
  }

  // Building sprite
  if (!drawStaticSprite(ctx, 'bld_kidneys', sprX, sprY, sprW, sprH)) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = C.TEAL;
    ctx.fill();
    ctx.strokeStyle = C.TEAL_DARK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Under attack flash
  if (kidneys && kidneys.hp < kidneys.maxHp) {
    const flash = 0.2 + 0.3 * Math.sin(Date.now() / 120);
    ctx.fillStyle = `rgba(231, 76, 60, ${flash})`;
    ctx.fillRect(sprX + 4, sprY + 4, sprW - 8, sprH - 8);

    // HP bar ABOVE
    const hpPct = kidneys.hp / kidneys.maxHp;
    ctx.fillStyle = '#555';
    ctx.fillRect(pos.x - r, sprY - 8, r * 2, 4);
    ctx.fillStyle = hpPct > 0.5 ? '#2ECC71' : hpPct > 0.25 ? '#F39C12' : '#E74C3C';
    ctx.fillRect(pos.x - r, sprY - 8, r * 2 * hpPct, 4);
  }

  // Label BELOW
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Kidneys', pos.x, sprY + sprH + 8);

  // Kidney status plaque ON the building
  if (kidneys && !kidneys.destroyed) {
    ctx.textAlign = 'center';

    // Dapagliflozin pulsing glow around tower
    if (kidneys.dapagliflozinActive) {
      const pulse = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 300));
      ctx.save();
      ctx.strokeStyle = `rgba(46, 204, 113, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, sprW / 2 + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Dark plaque overlay on the building
    const plaqueW = sprW - 4;
    const plaqueH = kidneys.dapagliflozinActive ? 42 : 30;
    const plaqueX = pos.x - plaqueW / 2;
    const plaqueY = pos.y - plaqueH / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(plaqueX, plaqueY, plaqueW, plaqueH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(plaqueX, plaqueY, plaqueW, plaqueH);

    // Line 1: Cooldown
    const isReady = kidneys.cooldownRemaining <= 0;
    const line1Y = plaqueY + 12;
    ctx.font = 'bold 11px Arial';
    if (isReady) {
      const readyPulse = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 400));
      ctx.fillStyle = `rgba(46, 204, 113, ${readyPulse})`;
      ctx.fillText('READY', pos.x, line1Y);
    } else {
      ctx.fillStyle = '#F39C12';
      const secs = Math.ceil(kidneys.cooldownRemaining);
      ctx.fillText(`CD ${secs}s`, pos.x, line1Y);
    }

    // Line 2: BG / threshold
    const bg = Math.round(calculateBG());
    const threshold = Math.round(gameState._kidneyAutoThreshold ?? CONFIG.KIDNEY_AUTO_THRESHOLD);
    ctx.font = 'bold 10px Arial';
    const fullText = `BG ${bg}/${threshold}`;
    if (kidneys.dapagliflozinActive) {
      ctx.fillStyle = '#2ECC71';
    } else {
      ctx.fillStyle = bg > threshold ? '#E74C3C' : '#FFFFFF';
    }
    ctx.fillText(fullText, pos.x, line1Y + 14);

    // Line 3: Dapagliflozin active indicator
    if (kidneys.dapagliflozinActive) {
      const dapaSecs = Math.ceil(kidneys.dapagliflozinTimer);
      ctx.font = 'bold 9px Arial';
      ctx.fillStyle = '#2ECC71';
      ctx.fillText(`SGLT2i ${dapaSecs}s`, pos.x, line1Y + 27);
    }
  }
}

// --- Mines (9 mines with visual slots) ---

function drawMines() {
  const C = CONFIG.COLORS;
  const size = CONFIG.MINE_SIZE;
  const hw = size.w / 2;
  const hh = size.h / 2;

  // Mine sprite is 192x128; scale to fit new larger size
  const sprW = size.w;
  const sprH = sprW * (128 / 192);

  const iv = gameState.interventions;
  const exerciseActive = iv.exercise.active;
  const walkActive = iv.walk.active;
  const maxSlots = exerciseActive ? CONFIG.MINE_EXERCISE_WORKERS
    : walkActive ? CONFIG.MINE_WALK_WORKERS
    : CONFIG.MINE_MAX_WORKERS;

  for (const mine of gameState.mines) {
    const { x, y } = mine;
    const isDestroyed = mine.destroyed;
    const isDamaged = !isDestroyed && mine.hp < CONFIG.MINE_HP;
    const workerCount = mine.workers.length;

    const sprX = x - sprW / 2;
    const sprY = y - sprH / 2;

    if (isDestroyed) {
      if (!drawStaticSprite(ctx, 'bld_mine_destroyed', sprX, sprY, sprW, sprH)) {
        ctx.fillStyle = '#3A3A3A';
        ctx.strokeStyle = '#2A2A2A';
        ctx.lineWidth = 1;
        ctx.fillRect(x - hw, y - hh, size.w, size.h);
        ctx.strokeRect(x - hw, y - hh, size.w, size.h);
      }

      ctx.fillStyle = C.RED;
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Damaged', x, y - 2);

      if (mine.repairTimer > 0) {
        const repairPct = 1 - mine.repairTimer / CONFIG.MINE_REPAIR_TIME;
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(x - hw, y - hh - 4, size.w * repairPct, 3);
      }
    } else {
      // Activity glow (exercise or walk)
      if ((exerciseActive || walkActive) && workerCount > 0) {
        const pulse = 6 + 3 * Math.sin(Date.now() / 300);
        ctx.save();
        ctx.shadowColor = '#F39C12';
        ctx.shadowBlur = pulse;
        ctx.fillStyle = 'rgba(243, 156, 18, 0.15)';
        ctx.fillRect(sprX - 2, sprY - 2, sprW + 4, sprH + 4);
        ctx.restore();
      }

      // Entry pulse glow
      if (mine.pulseTimer > 0) {
        const t = mine.pulseTimer / 0.4;
        ctx.save();
        ctx.shadowColor = '#2ECC71';
        ctx.shadowBlur = 12 * t;
        ctx.fillStyle = `rgba(46, 204, 113, ${0.25 * t})`;
        ctx.fillRect(sprX - 3, sprY - 3, sprW + 6, sprH + 6);
        ctx.restore();
      }

      // Mine sprite (active or inactive)
      const mineKey = workerCount > 0 ? 'bld_mine_active' : 'bld_mine_inactive';
      if (!drawStaticSprite(ctx, mineKey, sprX, sprY, sprW, sprH)) {
        ctx.fillStyle = C.ORANGE;
        ctx.strokeStyle = exerciseActive ? '#F39C12' : '#E67E22';
        ctx.lineWidth = exerciseActive ? (1 + Math.sin(Date.now() / 300)) : 1;
        ctx.fillRect(x - hw, y - hh, size.w, size.h);
        ctx.strokeRect(x - hw, y - hh, size.w, size.h);
      }

      // Under attack flash
      if (isDamaged) {
        const flash = 0.3 + 0.3 * Math.sin(Date.now() / 150);
        ctx.fillStyle = `rgba(231, 76, 60, ${flash})`;
        ctx.fillRect(sprX, sprY, sprW, sprH);
      }

      // Visual slots (circles below mine)
      _drawMineSlots(x, y + hh + 6, maxSlots, workerCount, exerciseActive);
    }
  }
}

function _drawMineSlots(cx, startY, maxSlots, filledCount, exerciseActive) {
  const barW = CONFIG.MINE_SIZE.w * 0.8;
  const barH = 4;
  const barX = cx - barW / 2;
  const pct = maxSlots > 0 ? filledCount / maxSlots : 0;

  // Background
  ctx.fillStyle = 'rgba(155, 89, 182, 0.2)';
  ctx.fillRect(barX, startY - barH / 2, barW, barH);

  // Filled portion
  if (filledCount > 0) {
    ctx.fillStyle = exerciseActive ? '#F39C12' : CONFIG.COLORS.PURPLE;
    ctx.fillRect(barX, startY - barH / 2, barW * pct, barH);
  }

  // Border
  ctx.strokeStyle = exerciseActive ? '#F39C12' : '#7D3C98';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(barX, startY - barH / 2, barW, barH);

  // Count text
  ctx.font = '8px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = filledCount > 0 ? CONFIG.COLORS.PURPLE : '#7F8C8D';
  ctx.fillText(`${filledCount}/${maxSlots}`, cx, startY + barH / 2 + 9);
}

// --- Building highlights ---

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
      hovered === 'metformin' ? 'Suppresses hepatic glucose output' : 'Intercepts glucose for liver storage');
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
      'Beta Cells (Insulin)', 'Releases insulin to convert free glucose');
  }

  if (hovered === 'kidneyVortex' || hovered === 'dapagliflozin') {
    const pos = CONFIG.KIDNEYS_POS;
    const r = CONFIG.KIDNEYS_RADIUS;
    const kSprW = r * 2 + 20;
    const kSprH = kSprW * (256 / 128);
    ctx.fillStyle = `rgba(241, 196, 15, ${pulse * 0.35})`;
    ctx.strokeStyle = `rgba(241, 196, 15, ${pulse})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(pos.x - kSprW / 2 - 8, pos.y + 10 - kSprH / 2 - 8, kSprW + 16, kSprH + 16, 12);
    ctx.fill();
    ctx.stroke();
    _drawHighlightLabel(pos.x, pos.y + 10 - kSprH / 2 - 18,
      'Nephrons (Filtration)',
      hovered === 'dapagliflozin' ? 'SGLT2 inhibitor blocks glucose reabsorption' : 'Increases glomerular filtration rate');
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
      'Myocytes (GLUT4)', 'Muscle cells absorb glucose via GLUT4 translocation');
  }

  if (hovered === 'semaglutide') {
    const xMin = CONFIG.SEMAGLUTIDE_MINE_X_MIN;
    const xMax = CONFIG.SEMAGLUTIDE_MINE_X_MAX;
    const yMin = CONFIG.SEMAGLUTIDE_MINE_Y_MIN;
    const yMax = CONFIG.SEMAGLUTIDE_MINE_Y_MAX;
    ctx.fillStyle = `rgba(230, 126, 34, ${pulse * 0.25})`;
    ctx.strokeStyle = `rgba(230, 126, 34, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.roundRect(xMin - 8, yMin - 8, xMax - xMin + 16, yMax - yMin + 16, 8);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    _drawHighlightLabel((xMin + xMax) / 2, yMin - 16,
      'GI Tract (GLP-1)', 'Slows gastric emptying, reduces appetite');
  }
}

function _drawHighlightLabel(x, y, title, desc) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px Arial';

  const titleW = ctx.measureText(title).width;
  ctx.font = '11px Arial';
  const descW = ctx.measureText(desc).width;
  const boxW = Math.max(titleW, descW) + 20;
  const boxH = 34;
  const boxX = x - boxW / 2;
  const boxY = y - 14;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(241, 196, 15, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = 'bold 13px Arial';
  ctx.fillStyle = '#F1C40F';
  ctx.fillText(title, x, y);

  ctx.font = '11px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(desc, x, y + 15);

  ctx.restore();
}

// --- Training effect ---

function drawTrainingEffect() {
  if (!gameState.interventions.exercise.active) return;

  const zone = CONFIG.MUSCLE_ZONE;

  const pulse = 0.3 + 0.15 * Math.sin(Date.now() / 400);
  ctx.fillStyle = `rgba(243, 156, 18, ${pulse * 0.12})`;
  ctx.fillRect(zone.x1, zone.y1, zone.x2 - zone.x1, zone.y2 - zone.y1);

  const bounce = Math.sin(Date.now() / 500) * 3;
  ctx.fillStyle = '#F39C12';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('x2 ATP', (zone.x1 + zone.x2) / 2, zone.y1 - 10 + bounce);

  const remaining = Math.ceil(gameState.interventions.exercise.timer);
  ctx.font = '12px Arial';
  ctx.fillText(`${remaining}s`, (zone.x1 + zone.x2) / 2, zone.y1 - 28);
}

// --- Building hover info ---

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
    const maxStorage = liver.maxStorage;
    const knightCount = gameState.knights.filter(k => k.alive).length;
    lines = [
      'Castle (Hepatocytes)',
      'Stores glucose as glycogen.',
      'Auto-releases when BG drops.',
      `Glycogen: ${liver.storage * CONFIG.GLUCOSE_PER_UNIT}/${maxStorage * CONFIG.GLUCOSE_PER_UNIT}`,
      `GLUT2: ${knightCount}/${CONFIG.LIVER_MAX_KNIGHTS}`,
      `HP: ${Math.round(liver.hp)}/${liver.maxHp}`,
    ];
    if (liver.destroyed) lines.push('Necrosis - repairing...');
    if (gameState._insulinSensitivity < CONFIG.LIVER_HGP_SENSITIVITY_CUTOFF) {
      lines.push('Hepatic IR: liver leaks glucose');
    }
    if (gameState.interventions.metformin.active) {
      lines.push('Metformin: suppressing liver output');
    }
  } else if (building === 'pancreas') {
    const panc = gameState.pancreas;
    if (!panc) return;
    const deg = gameState.degradation;
    const activePriests = gameState.priests.filter(p => p.alive).length;
    const maxPriests = CONFIG.PANCREAS_MAX_PRIESTS[Math.min(deg, 4)];
    const resistance = CONFIG.RESISTANCE_BY_DEGRADATION[Math.min(deg, 4)];
    const bgStim = panc._lastBgStim || 1.0;
    lines = [
      'Pancreas (Beta Cells)',
      'Secretes insulin for glucose uptake.',
      `Active Insulin: ${activePriests}/${maxPriests}`,
      `IR Stage: ${deg}`,
      `Uptake Efficacy: ${Math.round(resistance * 100)}%`,
      `GSIS: x${bgStim.toFixed(1)}`,
      `Beta Cell HP: ${Math.round(panc.hp)}/${panc.maxHp}`,
    ];
  } else if (building === 'kidneys') {
    const kid = gameState.kidneys;
    if (!kid) return;
    const threshold = Math.round(gameState._kidneyAutoThreshold ?? CONFIG.KIDNEY_AUTO_THRESHOLD);
    const bg = Math.round(calculateBG());
    lines = [
      'Kidneys (Nephrons)',
      'Filter excess glucose when BG > threshold.',
      `Auto-flush threshold: ${threshold} mg/dL`,
      `Current BG: ${bg} mg/dL`,
      `Cooldown: ${kid.getCooldownDisplay()}`,
      `HP: ${Math.round(kid.hp)}/${kid.maxHp}`,
    ];
    if (kid.dapagliflozinActive) {
      lines.push(`SGLT2i active: threshold lowered (${kid.getDapagliflozinDisplay()} left)`);
    }
    if (kid.destroyed) lines.push('Nephropathy - repairing...');
    if (kid.cooldownRemaining <= 0 && !kid.destroyed) {
      lines.push('Click to flush manually');
    }
  } else if (building === 'mines') {
    const totalWorkers = gameState.mines.reduce((sum, m) => sum + m.workers.length, 0);
    const mineIv = gameState.interventions;
    const slotsPerMine = mineIv.exercise.active ? CONFIG.MINE_EXERCISE_WORKERS
      : mineIv.walk.active ? CONFIG.MINE_WALK_WORKERS
      : CONFIG.MINE_MAX_WORKERS;
    const totalSlots = gameState.mines.length * slotsPerMine;
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

// --- Next wave countdown (no juice button — snack moved to bottom bar) ---

export const nextMealBtnRect = { x: 0, y: 0, w: 0, h: 0, visible: false };

function drawNextWaveCountdown() {
  nextMealBtnRect.visible = false;

  if (gameState.phase !== 'playing' && gameState.phase !== 'between_waves') return;

  const cx = CONFIG.SEA_X_END / 2;
  const hasNextWave = !gameState.allWavesSent &&
    gameState.currentWaveIndex < gameState.waves.length;

  if (hasNextWave && gameState.nextWaveCountdown > 0) {
    const countdown = gameState.nextWaveCountdown;
    const nextWave = gameState.waves[gameState.currentWaveIndex];
    const mealTime = nextWave.time || '';
    const cy = 120;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(cx - 70, cy - 30, 140, 70, 6);
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
}

// --- Utility ---

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
