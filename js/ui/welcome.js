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
  ctx.font = 'bold 56px Arial';
  ctx.fillText('Level Two', W / 2, H / 2 - 80);

  // Subtitle in gold
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#F1C40F';
  ctx.fillText('GlucoDefense', W / 2, H / 2 - 40);

  // Educational tagline
  ctx.font = '16px Arial';
  ctx.fillStyle = '#BDC3C7';
  ctx.fillText('Learn how your body manages glucose', W / 2, H / 2);

  // Brief explanation (2-3 lines)
  ctx.font = '13px Arial';
  ctx.fillStyle = '#7F8C8D';
  ctx.fillText('Food becomes glucose. Insulin helps cells absorb it.', W / 2, H / 2 + 30);
  ctx.fillText('See what happens when this system breaks down in diabetes.', W / 2, H / 2 + 48);

  // Pulsing "Click anywhere to start"
  const pulse = 0.4 + 0.6 * Math.abs(Math.sin(elapsed * 1.5));
  ctx.font = '18px Arial';
  ctx.fillStyle = `rgba(241, 196, 15, ${pulse})`;
  ctx.fillText('Click anywhere to start', W / 2, H / 2 + 100);

  // Version / credit
  ctx.font = '11px Arial';
  ctx.fillStyle = '#4A5568';
  ctx.fillText('An educational tower defense game about glucose metabolism & diabetes', W / 2, H - 30);
}

function drawDecorations(W, H, t) {
  // Floating circles representing game entities (glucose, insulin, cells)
  const circles = [
    { x: 0.12, y: 0.3, r: 12, speed: 0.5, color: '231,76,60' },    // fast glucose (red)
    { x: 0.88, y: 0.2, r: 10, speed: 0.6, color: '231,76,60' },    // fast glucose
    { x: 0.2, y: 0.75, r: 11, speed: 0.4, color: '243,156,18' },   // slow glucose (orange)
    { x: 0.75, y: 0.8, r: 9, speed: 0.55, color: '243,156,18' },   // slow glucose
    { x: 0.5, y: 0.12, r: 8, speed: 0.7, color: '241,196,15' },    // insulin (gold)
    { x: 0.92, y: 0.5, r: 10, speed: 0.45, color: '241,196,15' },  // insulin
    { x: 0.08, y: 0.6, r: 13, speed: 0.35, color: '155,89,182' },  // worker (purple)
    { x: 0.82, y: 0.65, r: 11, speed: 0.4, color: '155,89,182' },  // worker
    { x: 0.35, y: 0.15, r: 9, speed: 0.6, color: '39,174,96' },    // knight (green)
    { x: 0.65, y: 0.85, r: 10, speed: 0.5, color: '39,174,96' },   // knight
    // Larger background orbs
    { x: 0.3, y: 0.4, r: 50, speed: 0.15, color: '241,196,15' },   // big glow
    { x: 0.7, y: 0.35, r: 40, speed: 0.2, color: '155,89,182' },   // big glow
  ];

  for (const c of circles) {
    const cx = c.x * W + Math.sin(t * c.speed + c.x * 10) * 25;
    const cy = c.y * H + Math.cos(t * c.speed * 0.7 + c.y * 10) * 20;
    const isBig = c.r > 30;

    ctx.beginPath();
    ctx.arc(cx, cy, c.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${c.color}, ${isBig ? 0.03 : 0.08})`;
    ctx.fill();
    if (!isBig) {
      ctx.strokeStyle = `rgba(${c.color}, 0.15)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function handleClick() {
  if (gameState.phase !== GamePhase.WELCOME) return;
  gameState.phase = GamePhase.MENU;
}
