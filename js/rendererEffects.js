// GlucoDefense — Effects rendering (cast lines, vortex, particles)

import { CONFIG } from './config.js';
import { gameState } from './gameState.js';
import { PriestState } from './entities/Priest.js';

let ctx = null;

export function initEffectsRenderer(context) {
  ctx = context;
}

export function renderEffects() {
  renderCastLines();
  renderEscortLines();
  renderSemaglutideMines();
  renderKidneyCircle();
  renderVisualEffects();
}

function renderCastLines() {
  // Priest walks to glucose and merges — show faint tracking line while approaching
  for (const pr of gameState.priests) {
    if (!pr.alive || !pr.target || !pr.target.alive) continue;
    if (pr.state !== PriestState.WALKING) continue;

    const alpha = 0.2 + 0.15 * Math.sin(Date.now() / 200);
    ctx.strokeStyle = `rgba(52, 152, 219, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y);
    ctx.lineTo(pr.target.x, pr.target.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function renderEscortLines() {
  // Will be used for knight escort lines (Step 8)
  for (const k of gameState.knights) {
    if (!k.alive || !k.target || !k.target.alive) continue;
    if (k.state !== 'escorting') continue;

    ctx.strokeStyle = CONFIG.COLORS.GREEN;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(k.x, k.y);
    ctx.lineTo(k.target.x, k.target.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function renderVisualEffects() {
  for (const effect of gameState.effects) {
    switch (effect.type) {
      case 'cast_fail':
        drawCastFail(effect);
        break;
      case 'kidney_vortex':
        drawKidneyVortex(effect);
        break;
      case 'energy_particle':
        drawEnergyParticle(effect);
        break;
      case 'priest_convert':
        drawPriestConvert(effect);
        break;
      case 'semaglutide_explosion':
        drawSemaglutideExplosion(effect);
        break;
      case 'kidney_eject':
        drawKidneyEject(effect);
        break;
      case 'mine_energy_plus':
        drawMineEnergyPlus(effect);
        break;
    }
  }
}

function drawCastFail(effect) {
  // Red "Resistance" text floating upward
  const maxTimer = 0.8;
  const progress = 1 - effect.timer / maxTimer;
  const alpha = 1 - progress;
  const yOffset = progress * 30;

  ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(effect.text || 'Resistance', effect.x, effect.y - yOffset);
}

function drawKidneyVortex(effect) {
  const maxRadius = 150;
  const progress = 1 - effect.timer / effect.maxTimer;
  const radius = 10 + (maxRadius - 10) * progress;
  const alpha = 1 - progress;

  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(155, 89, 182, ${alpha})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner glow
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(155, 89, 182, ${alpha * 0.5})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawEnergyParticle(effect) {
  const alpha = effect.timer / 1.0;
  ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPriestConvert(effect) {
  const progress = 1 - effect.timer / effect.maxTimer;
  const alpha = 1 - progress;

  for (const p of effect.particles) {
    const px = effect.x + p.dx * progress;
    const py = effect.y + p.dy * progress;
    const r = 3 * (1 - progress);

    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
    ctx.fill();
  }
}

function drawSemaglutideExplosion(effect) {
  const progress = 1 - effect.timer / effect.maxTimer;
  const alpha = 1 - progress;

  for (const p of effect.particles) {
    const px = effect.x + p.dx * progress;
    const py = effect.y + p.dy * progress;
    const r = 3 * (1 - progress);

    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(230, 126, 34, ${alpha})`;
    ctx.fill();
  }
}

function renderSemaglutideMines() {
  for (const mine of gameState.semaglutideMines) {
    const fadeAlpha = Math.min(1, mine.timer / 3);
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 300 + mine.x);

    ctx.beginPath();
    ctx.arc(mine.x, mine.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(230, 126, 34, ${fadeAlpha * pulse})`;
    ctx.fill();

    // Outer glow
    ctx.beginPath();
    ctx.arc(mine.x, mine.y, 8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(243, 156, 18, ${fadeAlpha * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function renderKidneyCircle() {
  const circle = gameState.kidneyCircle;
  if (!circle) return;

  const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 200);

  // Main circle outline
  ctx.beginPath();
  ctx.arc(circle.cx, circle.cy, circle.radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(241, 196, 15, ${pulse * 0.8})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Semi-transparent fill
  ctx.beginPath();
  ctx.arc(circle.cx, circle.cy, circle.radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(241, 196, 15, ${0.05 + pulse * 0.05})`;
  ctx.fill();

  // Inner glow ring
  if (circle.radius > 20) {
    ctx.beginPath();
    ctx.arc(circle.cx, circle.cy, circle.radius * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(241, 196, 15, ${pulse * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawKidneyEject(effect) {
  const alpha = effect.timer / 0.3;
  // Yellow streak
  ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
  ctx.fillRect(effect.x - 20, effect.y - 2, 20, 4);
}

function drawMineEnergyPlus(effect) {
  const progress = 1 - effect.timer / effect.maxTimer;
  const alpha = 1 - progress;
  const yOffset = progress * 18;

  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
  ctx.fillText('+', effect.x, effect.y - yOffset);
}
