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
    case 'dissolve':
      updateDissolve(circle, dt);
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
  const excessMgDl = Math.max(0, bg - CONFIG.BG_NORMAL_HIGH);
  const excess = Math.ceil(excessMgDl / CONFIG.GLUCOSE_PER_UNIT);

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
  // Move circle center toward kidney tower
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

  // Pull all filtering peasants toward kidney tower (not circle center)
  for (const p of gameState.peasants) {
    if (!p.alive || p.state !== PeasantState.FILTERING) continue;

    const px = kidneyX - p.x;
    const py = kidneyY - p.y;
    const pDist = Math.sqrt(px * px + py * py);

    if (pDist > 3) {
      const pullSpeed = 180;
      p.x += (px / pDist) * pullSpeed * dt;
      p.y += (py / pDist) * pullSpeed * dt;
    }
  }

  // When circle reaches kidneys, dissolve glucose at tower
  if (dist <= 20) {
    circle.phase = 'dissolve';
    circle.dissolveTimer = 3.0;
  }
}

function updateEject(circle, dt) {
  // Legacy — redirect to dissolve
  circle.phase = 'dissolve';
  circle.dissolveTimer = 3.0;
}

function updateDissolve(circle, dt) {
  // Glucose stays at kidney tower and fades out over 3 seconds
  circle.dissolveTimer -= dt;

  const kidneyX = CONFIG.KIDNEYS_POS.x;
  const kidneyY = CONFIG.KIDNEYS_POS.y;

  // Keep pulling any stray filtering peasants to the tower
  for (const p of gameState.peasants) {
    if (!p.alive || p.state !== PeasantState.FILTERING) continue;

    const px = kidneyX - p.x;
    const py = kidneyY - p.y;
    const pDist = Math.sqrt(px * px + py * py);
    if (pDist > 5) {
      p.x += (px / pDist) * 200 * dt;
      p.y += (py / pDist) * 200 * dt;
    }
  }

  // When timer expires, kill all filtering peasants
  if (circle.dissolveTimer <= 0) {
    for (const p of gameState.peasants) {
      if (!p.alive || p.state !== PeasantState.FILTERING) continue;
      p.alive = false;
      gameState.effects.push({
        type: 'poof',
        x: p.x,
        y: p.y,
        timer: 0.6,
        maxTimer: 0.6,
      });
    }
    gameState.kidneyCircle = null;
  }
}
