// GlucoDefense — Effects rendering (cast lines, vortex, particles)

import { CONFIG } from './config.js';
import { gameState } from './gameState.js';
import { PriestState } from './entities/Priest.js';
import { getSprite } from './spriteLoader.js';

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
      case 'energy_drain_minus':
        drawEnergyDrainMinus(effect);
        break;
      case 'poof':
        drawPoof(effect);
        break;
    }
  }
}

// Screen-space fly icons (rendered after resetCamera)
export function renderFlyIcons() {
  for (const effect of gameState.effects) {
    if (effect.type === 'fly_icon') drawFlyIcon(effect);
  }
}

function drawFlyIcon(effect) {
  const progress = 1 - effect.timer / effect.maxTimer;
  // Ease-out curve for smooth deceleration
  const t = 1 - (1 - progress) * (1 - progress);
  const x = effect.startX + (effect.endX - effect.startX) * t;
  const y = effect.startY + (effect.endY - effect.startY) * t;

  ctx.save();
  ctx.globalAlpha = 1 - progress * 0.3;
  const scale = 1 + 0.3 * Math.sin(progress * Math.PI);
  ctx.font = `${Math.round(20 * scale)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(effect.emoji, x, y);
  ctx.restore();
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
  const sprite = getSprite('fx_explosion2') || getSprite('fx_explosion');
  const progress = 1 - effect.timer / effect.maxTimer;

  if (sprite) {
    const frameIdx = Math.min(
      sprite.frameCount - 1,
      Math.floor(progress * sprite.frameCount)
    );
    const sx = frameIdx * sprite.frameW;
    const size = 72;
    const half = size / 2;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress * 0.5);
    ctx.drawImage(sprite.img, sx, 0, sprite.frameW, sprite.frameH,
      effect.x - half, effect.y - half, size, size);
    ctx.restore();
  } else {
    // Fallback: orange particles
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
}

function renderSemaglutideMines() {
  const rockSprite = getSprite('fx_rock');

  for (const mine of gameState.semaglutideMines) {
    const size = 36;
    const half = size / 2;

    if (rockSprite) {
      ctx.drawImage(rockSprite.img, 0, 0, rockSprite.frameW, rockSprite.frameH,
        mine.x - half, mine.y - half, size, size);
    } else {
      // Fallback: gray rock circle
      ctx.beginPath();
      ctx.arc(mine.x, mine.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120, 120, 120, 1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(80, 80, 80, 1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Subtle danger radius indicator
    const pulse = 0.15 + 0.1 * Math.sin(Date.now() / 400 + mine.x);
    ctx.beginPath();
    ctx.arc(mine.x, mine.y, 15, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(230, 126, 34, ${pulse})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
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
  const yOffset = progress * 25;

  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
  ctx.fillText('+', effect.x, effect.y - yOffset);
}

function drawEnergyDrainMinus(effect) {
  const progress = 1 - effect.timer / effect.maxTimer;
  const alpha = 1 - progress;
  const yOffset = progress * 20;

  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(231, 76, 60, ${alpha * 0.8})`;
  ctx.fillText('-', effect.x, effect.y + yOffset);
}

function drawPoof(effect) {
  const sprite = getSprite('fx_poof');
  const progress = 1 - effect.timer / effect.maxTimer;

  if (sprite) {
    const frameIdx = Math.min(
      sprite.frameCount - 1,
      Math.floor(progress * sprite.frameCount)
    );
    const sx = frameIdx * sprite.frameW;
    const size = 120;
    const half = size / 2;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress * 0.5);
    ctx.drawImage(sprite.img, sx, 0, sprite.frameW, sprite.frameH,
      effect.x - half, effect.y - half, size, size);
    ctx.restore();
  } else {
    // Fallback: white expanding ring
    const radius = 10 + 40 * progress;
    const alpha = 1 - progress;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
