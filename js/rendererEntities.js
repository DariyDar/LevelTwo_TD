// GlucoDefense — Entity rendering (peasants, priests, knights, boats)

import { CONFIG } from './config.js';
import { gameState } from './gameState.js';
import { PeasantState } from './entities/Peasant.js';

let ctx = null;

export function initEntityRenderer(context) {
  ctx = context;
}

export function renderEntities() {
  renderBoats();
  renderPeasants();
  renderPriests();
  renderKnights();
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
  const C = CONFIG.COLORS;
  const isRebel = p.state === PeasantState.REBEL;
  let r = CONFIG.PEASANT_RADIUS;
  let drawX = p.x;
  let drawY = p.y;

  // Rebel effects: vibrate + flash + larger
  if (isRebel) {
    r = CONFIG.PEASANT_RADIUS + 1;
    const phase = p.x * 7 + p.y * 13;
    drawX += Math.sin(Date.now() / 40 + phase) * 1.5;
    drawY += Math.cos(Date.now() / 50 + phase) * 1.5;
  }

  // Body circle
  ctx.beginPath();
  ctx.arc(drawX, drawY, r, 0, Math.PI * 2);

  if (isRebel) {
    // Flashing red: pulse between bright and dark
    const flash = 0.5 + 0.5 * Math.sin(Date.now() / 150 + p.x);
    const red = Math.floor(180 + 75 * flash);
    ctx.fillStyle = `rgb(${red}, 50, 50)`;
    ctx.fill();
    ctx.strokeStyle = C.RED_DARK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (p.state === PeasantState.FILTERING) {
    // Yellow pulsing (being captured by kidneys)
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
    } else if (p.color === 'red') {
      // Speed-based coloring: fast=orange, medium=red, slow=dark red
      if (p.speedCategory === 'fast') {
        ctx.fillStyle = C.ORANGE;
        ctx.fill();
        ctx.strokeStyle = '#D68910';
      } else if (p.speedCategory === 'slow') {
        ctx.fillStyle = '#A93226';
        ctx.fill();
        ctx.strokeStyle = '#7B241C';
      } else {
        ctx.fillStyle = C.RED;
        ctx.fill();
        ctx.strokeStyle = C.RED_DARK;
      }
    } else {
      ctx.fillStyle = C.BLUE;
      ctx.fill();
      ctx.strokeStyle = C.BLUE_DARK;
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

  // HP bar for rebels
  if (isRebel) {
    const pct = Math.max(0, p.hp / CONFIG.REBEL_HP);
    ctx.fillStyle = C.RED;
    ctx.fillRect(drawX - r, drawY - r - 5, r * 2 * pct, 2);
  }
}

function drawPriest(pr) {
  const C = CONFIG.COLORS;
  const r = CONFIG.PRIEST_RADIUS;

  ctx.beginPath();
  ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
  ctx.fillStyle = C.BLUE;
  ctx.fill();
  ctx.strokeStyle = C.BLUE_DARK;
  ctx.lineWidth = 1;
  ctx.stroke();

  // White cross in center
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
  const C = CONFIG.COLORS;
  const r = CONFIG.PRIEST_RADIUS; // same size as priest

  ctx.beginPath();
  ctx.arc(k.x, k.y, r, 0, Math.PI * 2);
  ctx.fillStyle = C.GREEN;
  ctx.fill();
  ctx.strokeStyle = C.GREEN_DARK;
  ctx.lineWidth = 1;
  ctx.stroke();

  // White diamond in center
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

  // Hull
  ctx.fillStyle = '#8B4513';
  ctx.strokeStyle = '#5D3A1A';
  ctx.lineWidth = 1;

  const bx = boat.x - 20;
  const by = boat.y - 10;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + 40, by);
  ctx.lineTo(bx + 35, by + 20);
  ctx.lineTo(bx + 5, by + 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Food emoji above
  if (boat.emoji) {
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText(boat.emoji, boat.x, boat.y - 18);
  }

  // Unload progress bar
  if (boat.state === 'unloading' && boat.totalPeasants > 0) {
    const pct = boat.unloadedCount / boat.totalPeasants;
    ctx.fillStyle = C.GOLD;
    ctx.fillRect(bx + 5, by + 22, 30 * pct, 3);
    ctx.strokeStyle = C.GOLD_DARK;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx + 5, by + 22, 30, 3);
  }
}
