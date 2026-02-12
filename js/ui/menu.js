// GlucoDefense — Main menu UI

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';
import { LEVELS } from '../levels/index.js';
import {
  initBalancePanel,
  isBalancePanelVisible,
  showBalancePanel,
  renderBalancePanel,
} from './balancePanel.js';

let ctx = null;
let canvas = null;
let onStartLevel = null;
let buttonRects = [];
let balanceBtnRect = { x: 0, y: 0, w: 0, h: 0 };

// Load progress from localStorage
function loadProgress() {
  try {
    const saved = localStorage.getItem('glucodefense_progress');
    if (saved) {
      const data = JSON.parse(saved);
      gameState.unlockedLevel = data.unlockedLevel || 1;
    }
  } catch (_) {
    // ignore
  }
}

export function saveProgress() {
  try {
    localStorage.setItem('glucodefense_progress', JSON.stringify({
      unlockedLevel: gameState.unlockedLevel,
    }));
  } catch (_) {
    // ignore
  }
}

export function initMenu(canvasEl, context, startLevelCallback) {
  canvas = canvasEl;
  ctx = context;
  onStartLevel = startLevelCallback;
  loadProgress();
  initBalancePanel(canvasEl, context);

  canvas.addEventListener('click', handleClick);
}

export function renderMenu() {
  if (gameState.phase !== GamePhase.MENU) return;

  const C = CONFIG.COLORS;
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;

  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GlucoDefense', W / 2, 120);

  // Subtitle
  ctx.font = '18px Arial';
  ctx.fillStyle = '#95A5A6';
  ctx.fillText('A tower defense game about Type 2 Diabetes', W / 2, 155);

  // Level buttons
  buttonRects = [];
  const btnW = 200;
  const btnH = 100;
  const btnGap = 20;
  const totalW = LEVELS.length * btnW + (LEVELS.length - 1) * btnGap;
  const startX = (W - totalW) / 2;
  const btnY = 250;

  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i];
    const x = startX + i * (btnW + btnGap);
    const unlocked = level.id <= gameState.unlockedLevel;

    drawLevelButton(level, x, btnY, btnW, btnH, unlocked);

    buttonRects.push({
      x, y: btnY, w: btnW, h: btnH,
      levelId: level.id,
      unlocked,
    });
  }

  // Instructions
  ctx.font = '14px Arial';
  ctx.fillStyle = '#7F8C8D';
  ctx.textAlign = 'center';
  ctx.fillText('Click a level to start. Degradation carries between levels!', W / 2, 420);

  // Legend
  drawLegend(W / 2, 470);

  // Balance button (bottom-right)
  const balBtnW = 140;
  const balBtnH = 40;
  balanceBtnRect = {
    x: W - balBtnW - 30,
    y: H - balBtnH - 30,
    w: balBtnW,
    h: balBtnH,
  };
  ctx.fillStyle = '#4A6274';
  ctx.strokeStyle = '#5D7A8C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(balanceBtnRect.x, balanceBtnRect.y, balanceBtnRect.w, balanceBtnRect.h, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Balance', balanceBtnRect.x + balanceBtnRect.w / 2, balanceBtnRect.y + 26);

  // Render balance panel on top if visible
  renderBalancePanel();
}

function drawLevelButton(level, x, y, w, h, unlocked) {
  const C = CONFIG.COLORS;

  // Background
  ctx.fillStyle = unlocked ? '#4A6274' : '#2C3E50';
  ctx.strokeStyle = unlocked ? '#5D7A8C' : '#3D5060';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  // Lock overlay
  if (!unlocked) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
  }

  // Level number
  ctx.fillStyle = unlocked ? C.GOLD : C.GRAY;
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Level ${level.id}`, x + w / 2, y + 35);

  // Level name
  ctx.fillStyle = unlocked ? C.WHITE : C.GRAY;
  ctx.font = '14px Arial';
  ctx.fillText(level.name, x + w / 2, y + 58);

  // Mine count
  ctx.font = '11px Arial';
  ctx.fillStyle = '#95A5A6';
  ctx.fillText(`${level.mineCount} mines \u00B7 ${level.waves.length} meals`, x + w / 2, y + 80);

  // Lock icon
  if (!unlocked) {
    ctx.font = '24px serif';
    ctx.fillText('\u{1F512}', x + w / 2, y + h / 2 + 8);
  }
}

function drawLegend(cx, y) {
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';

  const items = [
    { color: '#E74C3C', label: '\u{1F534} Fast/Unhealthy' },
    { color: '#F1C40F', label: '\u{1F7E1} Medium/Neutral' },
    { color: '#2ECC71', label: '\u{1F7E2} Slow/Healthy' },
  ];

  const gap = 180;
  const startX = cx - gap;

  for (let i = 0; i < items.length; i++) {
    ctx.fillStyle = items[i].color;
    ctx.fillText(items[i].label, startX + i * gap, y);
  }
}

function handleClick(e) {
  if (gameState.phase !== GamePhase.MENU) return;

  // If balance panel is visible, don't handle menu clicks
  if (isBalancePanelVisible()) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  // Balance button
  if (mx >= balanceBtnRect.x && mx <= balanceBtnRect.x + balanceBtnRect.w &&
      my >= balanceBtnRect.y && my <= balanceBtnRect.y + balanceBtnRect.h) {
    showBalancePanel();
    return;
  }

  // Level buttons
  for (const btn of buttonRects) {
    if (btn.unlocked &&
        mx >= btn.x && mx <= btn.x + btn.w &&
        my >= btn.y && my <= btn.y + btn.h) {
      onStartLevel(btn.levelId);
      break;
    }
  }
}
