// GlucoDefense — Entity rendering (peasants, priests, knights, boats)

import { CONFIG } from './config.js';
import { gameState } from './gameState.js';
import { PeasantState } from './entities/Peasant.js';
import { PriestState } from './entities/Priest.js';
import { KnightState } from './entities/Knight.js';
import { drawSprite, setAnimKey } from './spriteAnimator.js';
import { getSprite } from './spriteLoader.js';

let ctx = null;

export function initEntityRenderer(context) {
  ctx = context;
}

export function renderEntities() {
  renderBoats();
  renderKnights();
  renderPriests();
  renderPeasants();
}

function renderBoats() {
  for (const boat of gameState.boats) {
    if (!boat.alive) continue;
    drawBoat(boat);
  }
}

function renderPeasants() {
  for (const p of gameState.peasants) {
    if (!p.alive) continue;
    // Workers are inside mines — don't render them
    if (p.state === PeasantState.WORKER) continue;
    drawPeasant(p);
  }
}

function renderPriests() {
  for (const pr of gameState.priests) {
    if (!pr.alive) continue;
    drawPriest(pr);
  }
}

function renderKnights() {
  for (const k of gameState.knights) {
    if (!k.alive) continue;
    drawKnight(k);
  }
}

function drawPeasant(p) {
  const isRebel = p.state === PeasantState.REBEL;
  const isWorker = p.state === PeasantState.WORKER;
  const size = CONFIG.SPRITE_SIZE_PEASANT;
  const half = size / 2;

  // Determine sprite key based on state + speed category
  let targetKey = 'pawn_red_run';
  let targetFps = CONFIG.SPRITE_FPS_DEFAULT;
  let outlineColor = null; // color tint for outline

  if (isRebel) {
    // Rebels attack with hammer
    targetKey = p.attackTarget ? 'pawn_black_interact' : 'pawn_black_run_hammer';
    targetFps = CONFIG.SPRITE_FPS_REBEL;
    outlineColor = '#E74C3C'; // red outline
  } else if (isWorker) {
    const exerciseActive = gameState.interventions.exercise.active;
    targetKey = 'pawn_purple_interact';
    targetFps = exerciseActive ? CONFIG.SPRITE_FPS_REBEL : CONFIG.SPRITE_FPS_WORKER;
    outlineColor = '#9B59B6'; // purple outline
  } else if (p.state === PeasantState.WALKING_TO_MINE || p.color === 'purple') {
    // Walking to mine — purple with pickaxe
    targetKey = 'pawn_purple_run_pickaxe';
    outlineColor = '#9B59B6';
  } else if (p.state === PeasantState.BEING_ESCORTED) {
    // Being escorted to liver — use color-appropriate run with pickaxe
    targetKey = p.speedCategory === 'slow' ? 'pawn_yellow_run_pickaxe' : 'pawn_red_run_pickaxe';
    outlineColor = p.speedCategory === 'slow' ? '#F39C12' : '#E74C3C';
  } else if (p.speedCategory === 'slow') {
    // Free slow glucose — empty hands run (orange)
    targetKey = 'pawn_yellow_run';
    outlineColor = '#F39C12'; // orange outline
  } else {
    // Free fast glucose — empty hands run (red)
    targetKey = 'pawn_red_run';
    outlineColor = '#E74C3C'; // red outline
  }

  // Update animation key if changed
  if (p.anim) {
    setAnimKey(p.anim, targetKey, targetFps);
  }

  // Draw position (rebels vibrate)
  let drawX = p.x;
  let drawY = p.y;
  if (isRebel) {
    const phase = p.x * 7 + p.y * 13;
    drawX += Math.sin(Date.now() / 40 + phase) * 1.5;
    drawY += Math.cos(Date.now() / 50 + phase) * 1.5;
  }

  // Color outline/shadow beneath sprite for visibility
  if (outlineColor) {
    ctx.save();
    ctx.fillStyle = outlineColor;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(drawX, drawY + half * 0.3, half * 0.45, half * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Try sprite rendering, fall back to circles
  const spriteDrawn = p.anim && drawSprite(ctx, p.anim, drawX, drawY, size);

  if (!spriteDrawn) {
    drawPeasantFallback(p, drawX, drawY);
    return;
  }

  // Filtering overlay (yellow pulse on top of sprite)
  if (p.state === PeasantState.FILTERING) {
    const pulse = 0.3 + 0.2 * Math.sin(Date.now() / 200 + p.x);
    ctx.fillStyle = `rgba(241, 196, 15, ${pulse})`;
    ctx.fillRect(drawX - half, drawY - half, size, size);
  }

  // HP bar for workers
  if (isWorker) {
    const pct = Math.max(0, p.workHp / CONFIG.WORKER_LIFETIME);
    const barW = size * 0.8;
    const barX = drawX - barW / 2;
    const barY = drawY - half - 4;
    ctx.fillStyle = '#2ECC71';
    ctx.fillRect(barX, barY, barW * pct, 2);
    ctx.strokeStyle = '#1E8449';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barW, 2);
  }

  // HP bar for rebels
  if (isRebel) {
    const pct = Math.max(0, p.hp / CONFIG.REBEL_HP);
    const barW = size * 0.8;
    const barX = drawX - barW / 2;
    const barY = drawY - half - 5;
    ctx.fillStyle = CONFIG.COLORS.RED;
    ctx.fillRect(barX, barY, barW * pct, 2);
  }
}

function drawPeasantFallback(p, drawX, drawY) {
  const C = CONFIG.COLORS;
  const isRebel = p.state === PeasantState.REBEL;
  let r = CONFIG.PEASANT_RADIUS;
  if (isRebel) r += 1;

  ctx.beginPath();
  ctx.arc(drawX, drawY, r, 0, Math.PI * 2);

  if (isRebel) {
    const flash = 0.5 + 0.5 * Math.sin(Date.now() / 150 + p.x);
    const red = Math.floor(180 + 75 * flash);
    ctx.fillStyle = `rgb(${red}, 50, 50)`;
    ctx.fill();
    ctx.strokeStyle = C.RED_DARK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (p.state === PeasantState.FILTERING) {
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200 + p.x);
    ctx.fillStyle = `rgba(241, 196, 15, ${pulse})`;
    ctx.fill();
    ctx.strokeStyle = '#D4AC0D';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    if (p.color === 'purple') {
      ctx.fillStyle = C.PURPLE;
      ctx.fill();
      ctx.strokeStyle = C.PURPLE_DARK;
    } else if (p.speedCategory === 'slow') {
      ctx.fillStyle = C.ORANGE;
      ctx.fill();
      ctx.strokeStyle = '#D68910';
    } else {
      ctx.fillStyle = C.RED;
      ctx.fill();
      ctx.strokeStyle = C.RED_DARK;
    }
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // HP bar for workers
  if (p.state === PeasantState.WORKER) {
    const pct = Math.max(0, p.workHp / CONFIG.WORKER_LIFETIME);
    ctx.fillStyle = '#2ECC71';
    ctx.fillRect(drawX - r, drawY - r - 4, r * 2 * pct, 2);
    ctx.strokeStyle = '#1E8449';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(drawX - r, drawY - r - 4, r * 2, 2);
  }

  if (isRebel) {
    const pct = Math.max(0, p.hp / CONFIG.REBEL_HP);
    ctx.fillStyle = C.RED;
    ctx.fillRect(drawX - r, drawY - r - 5, r * 2 * pct, 2);
  }
}

function drawPriest(pr) {
  const size = CONFIG.SPRITE_SIZE_PRIEST;

  // Determine sprite key based on state
  let targetKey = 'monk_idle';
  let targetFps = CONFIG.SPRITE_FPS_PRIEST;

  if (pr.state === PriestState.WALKING) {
    targetKey = 'monk_run';
  }

  // Update animation key + facing
  if (pr.anim) {
    setAnimKey(pr.anim, targetKey, targetFps);
    if (pr.target && pr.state === PriestState.WALKING) {
      pr.anim.facingRight = pr.target.x > pr.x;
    }
  }

  const spriteDrawn = pr.anim && drawSprite(ctx, pr.anim, pr.x, pr.y, size);

  if (!spriteDrawn) {
    drawPriestFallback(pr);
  }
}

function drawPriestFallback(pr) {
  const C = CONFIG.COLORS;
  const r = CONFIG.PRIEST_RADIUS;

  ctx.beginPath();
  ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
  ctx.fillStyle = C.BLUE;
  ctx.fill();
  ctx.strokeStyle = C.BLUE_DARK;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = C.WHITE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pr.x - 2, pr.y);
  ctx.lineTo(pr.x + 2, pr.y);
  ctx.moveTo(pr.x, pr.y - 2);
  ctx.lineTo(pr.x, pr.y + 2);
  ctx.stroke();
}

function drawKnight(k) {
  const size = CONFIG.SPRITE_SIZE_PRIEST;

  // Determine sprite key based on state
  let targetKey = 'warrior_idle';
  if (k.state === KnightState.WALKING_TO_PEASANT ||
      k.state === KnightState.ESCORTING ||
      k.state === KnightState.RETURNING) {
    targetKey = 'warrior_run';
  }

  // Update animation key + facing
  if (k.anim) {
    setAnimKey(k.anim, targetKey);
    if (k.state === KnightState.WALKING_TO_PEASANT && k.target) {
      k.anim.facingRight = k.target.x > k.x;
    } else if (k.state === KnightState.ESCORTING) {
      k.anim.facingRight = CONFIG.LIVER_POS.x > k.x;
    } else if (k.state === KnightState.RETURNING) {
      k.anim.facingRight = k.homeX > k.x;
    }
  }

  const spriteDrawn = k.anim && drawSprite(ctx, k.anim, k.x, k.y, size);

  if (!spriteDrawn) {
    drawKnightFallback(k);
  }
}

function drawKnightFallback(k) {
  const C = CONFIG.COLORS;
  const r = CONFIG.PRIEST_RADIUS;

  ctx.beginPath();
  ctx.arc(k.x, k.y, r, 0, Math.PI * 2);
  ctx.fillStyle = C.GREEN;
  ctx.fill();
  ctx.strokeStyle = C.GREEN_DARK;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = C.WHITE;
  ctx.beginPath();
  ctx.moveTo(k.x, k.y - 2);
  ctx.lineTo(k.x + 2, k.y);
  ctx.lineTo(k.x, k.y + 2);
  ctx.lineTo(k.x - 2, k.y);
  ctx.closePath();
  ctx.fill();
}

function drawBoat(boat) {
  const C = CONFIG.COLORS;
  // Boat size scales with food count: 1 food = small, 2 = medium, 3+ = large
  const foodCount = boat.foods ? boat.foods.length : 1;
  const boatSize = foodCount <= 1 ? 180 : foodCount <= 2 ? 240 : 300;

  // Try animated sprite
  const spriteDrawn = boat.anim && drawSprite(ctx, boat.anim, boat.x, boat.y, boatSize);

  if (!spriteDrawn) {
    // Fallback: simple hull (scaled)
    const hw = boatSize * 0.4;
    const hh = boatSize * 0.2;
    const bx = boat.x - hw;
    const by = boat.y - hh;
    ctx.fillStyle = '#8B4513';
    ctx.strokeStyle = '#5D3A1A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + hw * 2, by);
    ctx.lineTo(bx + hw * 1.8, by + hh * 2);
    ctx.lineTo(bx + hw * 0.2, by + hh * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Food emoji sitting ON the boat deck (center of boat sprite)
  if (boat.emoji) {
    const emojiSize = Math.round(boatSize * 0.14);
    ctx.font = `${emojiSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(boat.emoji, boat.x, boat.y + boatSize * 0.02 - 20);
    ctx.textBaseline = 'alphabetic';
  }

  // Unload progress bar
  if (boat.state === 'unloading' && boat.totalPeasants > 0) {
    const pct = boat.unloadedCount / boat.totalPeasants;
    const barW = boatSize * 0.5;
    const barX = boat.x - barW / 2;
    const barY = boat.y + boatSize * 0.25;
    ctx.fillStyle = C.GOLD;
    ctx.fillRect(barX, barY, barW * pct, 5);
    ctx.strokeStyle = C.GOLD_DARK;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, 5);
  }
}
