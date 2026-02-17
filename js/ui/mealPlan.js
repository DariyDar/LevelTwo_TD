// GlucoDefense — Meal Plan UI (pick all meals before gameplay starts)

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';

let ctx = null;
let canvas = null;
let selections = [];
let cardRects = [];
let confirmRect = { x: 0, y: 0, w: 0, h: 0 };
let onConfirmCallback = null;

export function initMealPlan(canvasEl, context, onConfirm) {
  canvas = canvasEl;
  ctx = context;
  onConfirmCallback = onConfirm;
  canvas.addEventListener('click', handleClick);
}

export function renderMealPlan() {
  if (gameState.phase !== GamePhase.MEAL_PLAN) return;

  const waves = gameState.waves;
  if (!waves || waves.length === 0) return;

  // Initialize selections array if needed
  if (selections.length !== waves.length) {
    selections = new Array(waves.length).fill(0);
  }

  const C = CONFIG.COLORS;
  cardRects = [];

  // Darken background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  // Title
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Plan Your Day', CONFIG.CANVAS_WIDTH / 2, 45);

  ctx.font = '14px Arial';
  ctx.fillStyle = '#95A5A6';
  ctx.fillText('Choose a meal for each time of day, then press Start', CONFIG.CANVAS_WIDTH / 2, 70);

  // Layout: one row per wave, with cards side by side
  const startY = 90;
  const rowH = (CONFIG.CANVAS_HEIGHT - startY - 60) / waves.length;
  const cardH = Math.min(rowH - 10, 100);

  for (let wi = 0; wi < waves.length; wi++) {
    const wave = waves[wi];
    const choices = wave.choices;
    const y = startY + wi * rowH;

    // Time label
    ctx.fillStyle = C.GOLD;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(wave.time || `Meal ${wi + 1}`, 20, y + cardH / 2 + 5);

    // Cards for this wave
    const cardW = 130;
    const cardGap = 10;
    const cardsStartX = 100;

    for (let ci = 0; ci < choices.length; ci++) {
      const choice = choices[ci];
      const cx = cardsStartX + ci * (cardW + cardGap);
      const cy = y;
      const isSelected = selections[wi] === ci;

      drawMealCard(choice, cx, cy, cardW, cardH, isSelected);

      cardRects.push({
        x: cx, y: cy, w: cardW, h: cardH,
        waveIndex: wi,
        choiceIndex: ci,
      });
    }
  }

  // Confirm button
  const btnW = 200;
  const btnH = 40;
  const btnX = CONFIG.CANVAS_WIDTH / 2 - btnW / 2;
  const btnY = CONFIG.CANVAS_HEIGHT - 55;
  confirmRect = { x: btnX, y: btnY, w: btnW, h: btnH };

  ctx.fillStyle = '#27AE60';
  ctx.strokeStyle = '#1E8449';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Start Day \u25B6', btnX + btnW / 2, btnY + btnH / 2 + 6);
}

function drawMealCard(choice, x, y, w, h, isSelected) {
  const C = CONFIG.COLORS;
  const foods = choice.foods;

  // Card background
  ctx.fillStyle = isSelected ? '#2C5A3E' : '#4A6274';
  ctx.strokeStyle = isSelected ? '#27AE60' : '#5D7A8C';
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Food emojis
  const emojis = foods.map(f => f.emoji).join(' ');
  ctx.font = '20px serif';
  ctx.textAlign = 'center';
  ctx.fillText(emojis, x + w / 2, y + 26);

  // Food names
  ctx.font = '10px Arial';
  ctx.fillStyle = C.WHITE;
  const names = foods.map(f => f.name).join(' + ');
  ctx.fillText(names, x + w / 2, y + 44);

  // Count + speed
  const totalCount = foods.reduce((sum, f) => sum + f.count, 0);
  const speed = foods[0].speed;
  const speedInfo = getSpeedInfo(speed);

  ctx.font = 'bold 11px Arial';
  ctx.fillText(`${totalCount * CONFIG.GLUCOSE_PER_UNIT} mg/dL`, x + w / 2, y + 62);

  ctx.font = '10px Arial';
  ctx.fillStyle = speedInfo.color;
  ctx.fillText(`${speedInfo.dot} ${speedInfo.label}`, x + w / 2, y + 78);

  // Selected checkmark
  if (isSelected) {
    ctx.fillStyle = '#27AE60';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('\u2713', x + w - 6, y + 16);
  }
}

function getSpeedInfo(speed) {
  switch (speed) {
    case 'very_fast':
    case 'fast':
      return { dot: '\u{1F534}', label: 'Fast', color: '#E74C3C' };
    case 'medium':
      return { dot: '\u{1F7E1}', label: 'Medium', color: '#F1C40F' };
    case 'slow':
      return { dot: '\u{1F7E2}', label: 'Slow', color: '#2ECC71' };
    default:
      return { dot: '\u{1F7E1}', label: 'Medium', color: '#F1C40F' };
  }
}

function handleClick(e) {
  if (gameState.phase !== GamePhase.MEAL_PLAN) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  // Check card clicks
  for (const card of cardRects) {
    if (mx >= card.x && mx <= card.x + card.w &&
        my >= card.y && my <= card.y + card.h) {
      selections[card.waveIndex] = card.choiceIndex;
      return;
    }
  }

  // Check confirm button
  if (mx >= confirmRect.x && mx <= confirmRect.x + confirmRect.w &&
      my >= confirmRect.y && my <= confirmRect.y + confirmRect.h) {
    gameState.mealPlan = [...selections];
    selections = [];
    if (onConfirmCallback) onConfirmCallback();
  }
}
