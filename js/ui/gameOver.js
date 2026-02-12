// GlucoDefense — Game over screen (victory, defeat, blackout)

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';
import { saveProgress } from './menu.js';

let ctx = null;
let canvas = null;
let onAction = null;
let buttonRects = [];

export function initGameOver(canvasEl, context, actionCallback) {
  canvas = canvasEl;
  ctx = context;
  onAction = actionCallback;

  canvas.addEventListener('click', handleClick);
}

export function renderGameOver() {
  if (gameState.phase !== GamePhase.GAME_OVER) return;

  const reason = gameState.gameOverReason;

  if (reason === 'victory') {
    renderVictory();
  } else if (reason === 'blackout') {
    renderBlackout();
  } else {
    renderDefeat();
  }
}

function renderVictory() {
  const C = CONFIG.COLORS;
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;

  // Green overlay
  ctx.fillStyle = 'rgba(39, 174, 96, 0.7)';
  ctx.fillRect(0, 0, W, H);

  // Stars based on degradation
  const stars = getStarRating(gameState.degradation);

  // Unlock next level
  if (gameState.level < 5) {
    gameState.unlockedLevel = Math.max(gameState.unlockedLevel, gameState.level + 1);
    saveProgress();
  }

  // Title
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('VICTORY!', W / 2, 180);

  // Stars
  ctx.font = '48px serif';
  const starStr = '\u2B50'.repeat(stars) + '\u2606'.repeat(3 - stars);
  ctx.fillText(starStr, W / 2, 240);

  // Rating text
  const ratingTexts = ['', 'Decent', 'Good', 'Excellent!'];
  ctx.font = '20px Arial';
  ctx.fillStyle = C.GOLD;
  ctx.fillText(ratingTexts[stars] || '', W / 2, 280);

  // Stats
  ctx.font = '14px Arial';
  ctx.fillStyle = C.WHITE;
  ctx.fillText(`Degradation: ${gameState.degradation}/5`, W / 2, 320);
  ctx.fillText(`Peak BG: ${gameState.stats.peakBG}`, W / 2, 340);
  ctx.fillText(`Total Rebels: ${gameState.stats.totalRebels}`, W / 2, 360);

  // Buttons
  buttonRects = [];

  if (gameState.level < 5) {
    drawButton('Next Level', W / 2 - 110, 400, 100, 40, 'next');
    drawButton('Menu', W / 2 + 10, 400, 100, 40, 'menu');
  } else {
    drawButton('Menu', W / 2 - 50, 400, 100, 40, 'menu');
  }
}

function renderBlackout() {
  const C = CONFIG.COLORS;
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;

  // Black overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.fillRect(0, 0, W, H);

  // Pulsing BLACKOUT text
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
  ctx.globalAlpha = 0.5 + pulse * 0.5;
  ctx.fillStyle = C.RED;
  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('BLACKOUT', W / 2, H / 2 - 40);
  ctx.globalAlpha = 1;

  // Subtitle
  ctx.fillStyle = C.WHITE;
  ctx.font = '18px Arial';
  ctx.fillText('Hypoglycemic coma — energy dropped to zero', W / 2, H / 2 + 10);

  // Buttons
  buttonRects = [];
  drawButton('Retry', W / 2 - 110, H / 2 + 50, 100, 40, 'retry');
  drawButton('Menu', W / 2 + 10, H / 2 + 50, 100, 40, 'menu');
}

function renderDefeat() {
  const C = CONFIG.COLORS;
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;

  // Dark red overlay
  ctx.fillStyle = 'rgba(192, 57, 43, 0.7)';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('DEFEAT', W / 2, H / 2 - 40);

  // Subtitle
  ctx.font = '18px Arial';
  ctx.fillText(`Pancreas degradation: ${gameState.degradation}/5`, W / 2, H / 2 + 10);

  // Buttons
  buttonRects = [];
  drawButton('Retry', W / 2 - 110, H / 2 + 50, 100, 40, 'retry');
  drawButton('Menu', W / 2 + 10, H / 2 + 50, 100, 40, 'menu');
}

function drawButton(label, x, y, w, h, action) {
  const C = CONFIG.COLORS;

  ctx.fillStyle = '#4A6274';
  ctx.strokeStyle = '#5D7A8C';
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
      onAction(btn.action);
      break;
    }
  }
}
