// GlucoDefense — Welcome/splash screen

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';

let ctx = null;
let canvas = null;
let startTime = 0;

export function initWelcome(canvasEl, context) {
  canvas = canvasEl;
  ctx = context;
  startTime = Date.now();

  canvas.addEventListener('click', handleClick);
}

export function renderWelcome() {
  if (gameState.phase !== GamePhase.WELCOME) return;

  const C = CONFIG.COLORS;
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;
  const elapsed = (Date.now() - startTime) / 1000;

  // Dark gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(0.5, '#1a1a3e');
  grad.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative floating circles (glucose molecules)
  drawDecorations(W, H, elapsed);

  // Main title: "Level Two"
  ctx.textAlign = 'center';
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 64px Arial';
  ctx.fillText('Level Two', W / 2, H / 2 - 40);

  // Subtitle
  ctx.font = '20px Arial';
  ctx.fillStyle = '#95A5A6';
  ctx.fillText('GlucoDefense', W / 2, H / 2 + 10);

  // Pulsing "Click to Start"
  const pulse = 0.4 + 0.6 * Math.abs(Math.sin(elapsed * 1.5));
  ctx.font = '18px Arial';
  ctx.fillStyle = `rgba(241, 196, 15, ${pulse})`;
  ctx.fillText('Click to Start', W / 2, H / 2 + 70);

  // Version / credit
  ctx.font = '11px Arial';
  ctx.fillStyle = '#4A5568';
  ctx.fillText('A tower defense game about glucose metabolism', W / 2, H - 30);
}

function drawDecorations(W, H, t) {
  // Floating circles that slowly drift (representing glucose molecules)
  const circles = [
    { x: 0.15, y: 0.3, r: 40, speed: 0.3 },
    { x: 0.8, y: 0.25, r: 30, speed: 0.4 },
    { x: 0.25, y: 0.7, r: 35, speed: 0.25 },
    { x: 0.7, y: 0.75, r: 25, speed: 0.35 },
    { x: 0.5, y: 0.15, r: 20, speed: 0.5 },
    { x: 0.9, y: 0.55, r: 28, speed: 0.3 },
    { x: 0.1, y: 0.55, r: 22, speed: 0.45 },
  ];

  for (const c of circles) {
    const cx = c.x * W + Math.sin(t * c.speed) * 20;
    const cy = c.y * H + Math.cos(t * c.speed * 0.7) * 15;

    ctx.beginPath();
    ctx.arc(cx, cy, c.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(241, 196, 15, 0.04)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function handleClick() {
  if (gameState.phase !== GamePhase.WELCOME) return;
  gameState.phase = GamePhase.MENU;
}
