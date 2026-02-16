// GlucoDefense — Kidney filtration circle mechanic

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { PeasantState } from '../entities/Peasant.js';
import { calculateBG } from './bgSystem.js';

export function updateKidneyFiltration(dt) {
  const circle = gameState.kidneyCircle;
  if (!circle) return;

  switch (circle.phase) {
    case 'expand':
      updateExpand(circle, dt);
      break;
    case 'contract':
      updateContract(circle, dt);
      break;
    case 'eject':
      updateEject(circle, dt);
      break;
  }
}

function updateExpand(circle, dt) {
  circle.radius += CONFIG.KIDNEY_CIRCLE_EXPAND_SPEED * dt;

  // Only capture excess glucose — stop when BG reaches normal
  const bg = calculateBG();
  if (bg <= CONFIG.BG_NORMAL_HIGH) {
    circle.phase = 'contract';
    return;
  }

  if (circle.radius > 500) {
    circle.phase = 'contract';
    return;
  }

  // Capture glucose that the circle touches (only the excess above normal)
  let captured = circle.capturedCount || 0;
  const excess = Math.max(0, bg - CONFIG.BG_NORMAL_HIGH);

  for (const p of gameState.peasants) {
    if (captured >= excess) break; // Don't capture more than the excess
    if (!p.alive) continue;
    if (p.state === PeasantState.WORKER ||
        p.state === PeasantState.BEING_ESCORTED ||
        p.state === PeasantState.WALKING_TO_MINE ||
        p.state === PeasantState.FILTERING) continue;

    const dx = p.x - circle.cx;
    const dy = p.y - circle.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= circle.radius) {
      p.state = PeasantState.FILTERING;
      p.color = 'yellow';
      p.attackTarget = null;
      if (p.assignedPriest) {
        p.assignedPriest._resetToIdle();
        p.assignedPriest = null;
      }
      captured++;
    }
  }
  circle.capturedCount = captured;
}

function updateContract(circle, dt) {
  // Move circle center toward kidneys
  const kidneyX = CONFIG.KIDNEYS_POS.x;
  const kidneyY = CONFIG.KIDNEYS_POS.y;
  const dx = kidneyX - circle.cx;
  const dy = kidneyY - circle.cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 5) {
    const speed = CONFIG.KIDNEY_CIRCLE_CONTRACT_SPEED;
    circle.cx += (dx / dist) * speed * dt;
    circle.cy += (dy / dist) * speed * dt;
  }

  // Shrink radius
  circle.radius = Math.max(10, circle.radius - CONFIG.KIDNEY_CIRCLE_EXPAND_SPEED * 0.5 * dt);

  // Pull all filtering peasants toward circle center
  for (const p of gameState.peasants) {
    if (!p.alive || p.state !== PeasantState.FILTERING) continue;

    const px = circle.cx - p.x;
    const py = circle.cy - p.y;
    const pDist = Math.sqrt(px * px + py * py);

    if (pDist > 3) {
      const pullSpeed = 180;
      p.x += (px / pDist) * pullSpeed * dt;
      p.y += (py / pDist) * pullSpeed * dt;
    }
  }

  // When circle reaches kidneys, eject
  if (dist <= 20) {
    circle.phase = 'eject';
  }
}

function updateEject(circle, dt) {
  // Shoot all filtering peasants to the right
  let anyAlive = false;

  for (const p of gameState.peasants) {
    if (!p.alive || p.state !== PeasantState.FILTERING) continue;
    anyAlive = true;

    p.x += CONFIG.KIDNEY_EJECT_SPEED * dt;

    // Off-screen: die
    if (p.x > CONFIG.CANVAS_WIDTH + 20) {
      p.alive = false;

      gameState.effects.push({
        type: 'kidney_eject',
        x: CONFIG.CANVAS_WIDTH,
        y: p.y,
        timer: 0.3,
      });
    }
  }

  // When all filtering peasants are gone, end circle
  if (!anyAlive) {
    gameState.kidneyCircle = null;
  }
}
