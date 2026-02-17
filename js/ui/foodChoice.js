// GlucoDefense — Food Choice UI overlay

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';
import { selectFood } from '../systems/waveManager.js';

let ctx = null;
let canvas = null;

export function initFoodChoiceUI(canvasEl, context) {
  canvas = canvasEl;
  ctx = context;

  canvas.addEventListener('click', handleClick);
}

export function renderFoodChoice() {
  if (gameState.phase !== GamePhase.FOOD_CHOICE || !gameState.foodChoices) return;

  const choices = gameState.foodChoices;
  const C = CONFIG.COLORS;

  // Darken background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  // Modal box
  const cardCount = choices.length;
  const cardW = 160;
  const cardH = 200;
  const cardGap = 20;
  const modalW = cardCount * cardW + (cardCount - 1) * cardGap + 60;
  const modalH = 300;
  const modalX = (CONFIG.CANVAS_WIDTH - modalW) / 2;
  const modalY = (CONFIG.CANVAS_HEIGHT - modalH) / 2;

  // Modal background
  ctx.fillStyle = C.DARK_BG;
  ctx.strokeStyle = '#5D7A8C';
  ctx.lineWidth = 2;
  drawRoundRect(modalX, modalY, modalW, modalH, 12);

  // Title
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Meal time! Choose your food:', CONFIG.CANVAS_WIDTH / 2, modalY + 35);

  // Wave time label
  if (gameState.waves[gameState.currentWaveIndex]) {
    const wave = gameState.waves[gameState.currentWaveIndex];
    ctx.font = '14px Arial';
    ctx.fillStyle = '#95A5A6';
    ctx.fillText(wave.time || '', CONFIG.CANVAS_WIDTH / 2, modalY + 55);
  }

  // Cards
  const cardsStartX = modalX + 30;
  const cardsStartY = modalY + 70;

  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    const cardX = cardsStartX + i * (cardW + cardGap);
    const cardY = cardsStartY;

    drawFoodCard(choice, cardX, cardY, cardW, cardH, i);
  }

  // Store card positions for click detection
  gameState._foodCardRects = choices.map((_, i) => ({
    x: cardsStartX + i * (cardW + cardGap),
    y: cardsStartY,
    w: cardW,
    h: cardH,
    index: i,
  }));
}

function drawFoodCard(choice, x, y, w, h, index) {
  const C = CONFIG.COLORS;
  const foods = choice.foods;

  // Card background
  ctx.fillStyle = '#4A6274';
  ctx.strokeStyle = '#5D7A8C';
  ctx.lineWidth = 1;
  drawRoundRect(x, y, w, h, 8);

  // Food emojis
  const emojis = foods.map(f => f.emoji).join(' ');
  ctx.font = '36px serif';
  ctx.textAlign = 'center';
  ctx.fillText(emojis, x + w / 2, y + 50);

  // Food names
  ctx.font = '13px Arial';
  ctx.fillStyle = C.WHITE;
  const names = foods.map(f => f.name).join(' + ');
  ctx.fillText(names, x + w / 2, y + 80);

  // Total glucose (display in mg/dL equivalents)
  const totalCount = foods.reduce((sum, f) => sum + f.count, 0);
  const gpu = CONFIG.GLUCOSE_PER_UNIT;
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`${totalCount * gpu} mg/dL`, x + w / 2, y + 110);

  // Speed indicator
  const speed = foods[0].speed;
  const speedInfo = getSpeedInfo(speed);
  ctx.fillStyle = speedInfo.color;
  ctx.font = '14px Arial';
  ctx.fillText(`${speedInfo.dot} ${speedInfo.label}`, x + w / 2, y + 135);

  // Individual foods list (if multiple)
  if (foods.length > 1) {
    ctx.font = '10px Arial';
    ctx.fillStyle = '#95A5A6';
    let listY = y + 155;
    for (const f of foods) {
      ctx.fillText(`${f.emoji} ${f.name} (${f.count * gpu})`, x + w / 2, listY);
      listY += 14;
    }
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
  if (gameState.phase !== GamePhase.FOOD_CHOICE || !gameState._foodCardRects) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  for (const card of gameState._foodCardRects) {
    if (mx >= card.x && mx <= card.x + card.w &&
        my >= card.y && my <= card.y + card.h) {
      selectFood(card.index);
      gameState._foodCardRects = null;
      break;
    }
  }
}

function drawRoundRect(x, y, w, h, r) {
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
