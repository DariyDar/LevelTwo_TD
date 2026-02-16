// GlucoDefense — Wave preview panel (right side)

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';

let ctx = null;

export function initWavePreview(context) {
  ctx = context;
}

export function renderWavePreview() {
  if (gameState.phase === GamePhase.MENU || gameState.phase === GamePhase.GAME_OVER) return;
  if (!gameState.waves || gameState.waves.length === 0) return;

  const C = CONFIG.COLORS;
  const panelX = 1100;
  const panelY = 55;
  const panelW = 175;
  const panelH = 320;

  // Panel background
  ctx.fillStyle = 'rgba(44, 62, 80, 0.85)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 8);
  ctx.fill();

  ctx.strokeStyle = '#5D7A8C';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 8);
  ctx.stroke();

  const cx = panelX + panelW / 2;
  let y = panelY + 20;

  const waveIdx = gameState.currentWaveIndex;
  const totalWaves = gameState.waves.length;

  ctx.textAlign = 'center';

  // Current meal time
  if (waveIdx > 0 && waveIdx <= totalWaves) {
    const prevWave = gameState.waves[waveIdx - 1];
    if (prevWave && prevWave.time) {
      ctx.font = '11px Arial';
      ctx.fillStyle = '#95A5A6';
      ctx.fillText(`Current: ${prevWave.time}`, cx, y);
      y += 18;
    }
  }

  // Next wave countdown timer
  if (gameState.nextWaveCountdown > 0 && !gameState.allWavesSent) {
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = C.GOLD;
    ctx.fillText(`Next in ${Math.ceil(gameState.nextWaveCountdown)}s`, cx, y);
    y += 20;
  }

  // Next wave preview
  if (waveIdx < totalWaves) {
    const nextWave = gameState.waves[waveIdx];

    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = C.WHITE;
    y += 5;
    ctx.fillText('Next meal:', cx, y);
    y += 5;

    // Time
    if (nextWave.time) {
      y += 15;
      ctx.font = '11px Arial';
      ctx.fillStyle = '#95A5A6';
      ctx.fillText(nextWave.time, cx, y);
    }

    // Preview each choice
    y += 18;
    for (let i = 0; i < nextWave.choices.length; i++) {
      const choice = nextWave.choices[i];
      const emojis = choice.foods.map(f => f.emoji).join(' ');
      const totalCount = choice.foods.reduce((sum, f) => sum + f.count, 0);
      const speed = choice.foods[0].speed;
      const speedColor = getSpeedColor(speed);

      // Choice card (compact)
      ctx.font = '18px serif';
      ctx.fillText(emojis, cx, y);
      y += 16;

      ctx.font = '10px Arial';
      ctx.fillStyle = speedColor;
      ctx.fillText(`${totalCount} units`, cx, y);
      y += 14;
    }
  } else {
    // All waves done
    y += 20;
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = C.GREEN;
    ctx.fillText('Final wave!', cx, y);
    y += 16;
    ctx.font = '11px Arial';
    ctx.fillStyle = '#95A5A6';
    ctx.fillText('Clear remaining', cx, y);
    y += 12;
    ctx.fillText('enemies to win', cx, y);
  }

}

function getSpeedColor(speed) {
  switch (speed) {
    case 'very_fast':
    case 'fast':
      return '#E74C3C';
    case 'medium':
      return '#F1C40F';
    case 'slow':
      return '#2ECC71';
    default:
      return '#F1C40F';
  }
}
