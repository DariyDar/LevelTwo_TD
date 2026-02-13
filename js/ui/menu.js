// GlucoDefense — Main menu UI (patient rows × day buttons)

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';
import { PATIENTS } from '../patients/index.js';
import {
  initBalancePanel,
  isBalancePanelVisible,
  showBalancePanel,
  renderBalancePanel,
} from './balancePanel.js';

let ctx = null;
let canvas = null;
let onStartDay = null;
let dayButtonRects = [];
let balanceBtnRect = { x: 0, y: 0, w: 0, h: 0 };

// Per-patient progress: { patientId: { unlockedDay: number, stars: number[] } }
let progress = {};

function loadProgress() {
  try {
    const saved = localStorage.getItem('glucodefense_progress_v2');
    if (saved) {
      progress = JSON.parse(saved);
    }
  } catch (_) {
    // ignore
  }
  // Ensure all patients have progress entries
  for (const patient of PATIENTS) {
    if (!progress[patient.id]) {
      progress[patient.id] = { unlockedDay: 1, stars: [0, 0, 0, 0, 0] };
    }
  }
  // Migrate legacy progress (old single-patient system)
  try {
    const legacy = localStorage.getItem('glucodefense_progress');
    if (legacy && !localStorage.getItem('glucodefense_progress_v2_migrated')) {
      const data = JSON.parse(legacy);
      if (data.unlockedLevel && progress.type2) {
        progress.type2.unlockedDay = Math.max(progress.type2.unlockedDay, data.unlockedLevel);
      }
      localStorage.setItem('glucodefense_progress_v2_migrated', '1');
      saveProgress();
    }
  } catch (_) {
    // ignore
  }
}

export function saveProgress() {
  try {
    localStorage.setItem('glucodefense_progress_v2', JSON.stringify(progress));
  } catch (_) {
    // ignore
  }
}

export function getPatientProgress(patientId) {
  if (!progress[patientId]) {
    progress[patientId] = { unlockedDay: 1, stars: [0, 0, 0, 0, 0] };
  }
  return progress[patientId];
}

export function unlockNextDay(patientId, dayId, stars) {
  const p = getPatientProgress(patientId);
  // Update stars for completed day (keep best)
  if (dayId >= 1 && dayId <= 5) {
    p.stars[dayId - 1] = Math.max(p.stars[dayId - 1], stars);
  }
  // Unlock next day
  if (dayId < 5) {
    p.unlockedDay = Math.max(p.unlockedDay, dayId + 1);
  }
  saveProgress();
}

export function initMenu(canvasEl, context, startDayCallback) {
  canvas = canvasEl;
  ctx = context;
  onStartDay = startDayCallback;
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
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GlucoDefense', W / 2, 70);

  // Subtitle
  ctx.font = '16px Arial';
  ctx.fillStyle = '#95A5A6';
  ctx.fillText('A tower defense game about glucose metabolism', W / 2, 95);

  // Patient rows
  dayButtonRects = [];
  const rowH = 120;
  const startY = 130;
  const cardX = 60;
  const cardW = 280;
  const dayBtnW = 110;
  const dayBtnH = 40;
  const dayBtnGap = 12;
  const dayBtnStartX = cardX + cardW + 30;

  for (let pi = 0; pi < PATIENTS.length; pi++) {
    const patient = PATIENTS[pi];
    const rowY = startY + pi * rowH;
    const prog = getPatientProgress(patient.id);

    drawPatientCard(patient, cardX, rowY, cardW, rowH - 10);
    drawDayButtons(patient, prog, dayBtnStartX, rowY, dayBtnW, dayBtnH, dayBtnGap);
  }

  // Instructions
  ctx.font = '13px Arial';
  ctx.fillStyle = '#7F8C8D';
  ctx.textAlign = 'center';
  ctx.fillText('Select a patient and day to begin. Each patient has unique physiology and challenges.', W / 2, startY + PATIENTS.length * rowH + 10);

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

function drawPatientCard(patient, x, y, w, h) {
  const C = CONFIG.COLORS;

  // Card background
  ctx.fillStyle = 'rgba(30, 40, 55, 0.8)';
  ctx.strokeStyle = patient.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  // Emoji + name
  ctx.textAlign = 'left';
  ctx.font = '28px serif';
  ctx.fillText(patient.emoji, x + 15, y + 38);

  ctx.font = 'bold 18px Arial';
  ctx.fillStyle = patient.color;
  ctx.fillText(patient.name, x + 55, y + 35);

  // Description
  ctx.font = '12px Arial';
  ctx.fillStyle = '#95A5A6';
  ctx.fillText(patient.description, x + 55, y + 55);

  // Key physiology info
  ctx.font = '11px Arial';
  ctx.fillStyle = '#6B7C8A';
  const phys = patient.physiology;
  const infoItems = [];
  if (phys.insulinCharges !== null) {
    infoItems.push(`Insulin: ${phys.insulinCharges} charges`);
  } else if (phys.insulinProductionRate < 1.0) {
    infoItems.push(`Insulin: ${Math.round(phys.insulinProductionRate * 100)}%`);
  }
  if (phys.degradationEnabled) {
    infoItems.push('IR: active');
  }
  if (phys.startingDegradation > 0) {
    infoItems.push(`Start IR: ${phys.startingDegradation}`);
  }
  if (infoItems.length > 0) {
    ctx.fillText(infoItems.join('  \u00B7  '), x + 55, y + 75);
  }

  // Available interventions (icons)
  ctx.font = '11px Arial';
  ctx.fillStyle = '#5D7A8C';
  const ivText = patient.availableInterventions.join(', ');
  ctx.fillText(ivText, x + 15, y + 98);
}

function drawDayButtons(patient, prog, startX, rowY, btnW, btnH, gap) {
  const C = CONFIG.COLORS;
  const days = patient.days;
  const btnY = rowY + 20;

  for (let di = 0; di < days.length; di++) {
    const day = days[di];
    const x = startX + di * (btnW + gap);
    const unlocked = day.dayId <= prog.unlockedDay;
    const stars = prog.stars[di] || 0;

    // Button background
    if (unlocked) {
      ctx.fillStyle = stars > 0 ? '#3A5A4A' : '#4A6274';
      ctx.strokeStyle = stars > 0 ? '#4CAF50' : '#5D7A8C';
    } else {
      ctx.fillStyle = '#2C3E50';
      ctx.strokeStyle = '#3D5060';
    }
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, btnY, btnW, btnH, 6);
    ctx.fill();
    ctx.stroke();

    // Lock overlay
    if (!unlocked) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(x, btnY, btnW, btnH, 6);
      ctx.fill();
    }

    ctx.textAlign = 'center';

    if (unlocked) {
      // Day label
      ctx.font = 'bold 13px Arial';
      ctx.fillStyle = C.WHITE;
      ctx.fillText(`Day ${day.dayId}`, x + btnW / 2, btnY + 16);

      // Stars
      if (stars > 0) {
        ctx.font = '13px serif';
        const starStr = '\u2B50'.repeat(stars) + '\u2606'.repeat(3 - stars);
        ctx.fillText(starStr, x + btnW / 2, btnY + 33);
      } else {
        ctx.font = '10px Arial';
        ctx.fillStyle = '#7F8C8D';
        ctx.fillText('Not played', x + btnW / 2, btnY + 33);
      }
    } else {
      // Lock icon
      ctx.font = '18px serif';
      ctx.fillStyle = '#7F8C8D';
      ctx.fillText('\u{1F512}', x + btnW / 2, btnY + 20);
      ctx.font = '10px Arial';
      ctx.fillText(`Day ${day.dayId}`, x + btnW / 2, btnY + 35);
    }

    // Second row: day name
    ctx.font = '9px Arial';
    ctx.fillStyle = unlocked ? '#7F8C8D' : '#4A5568';
    const shortName = day.name.replace(/^Day \d+: /, '');
    ctx.fillText(shortName, x + btnW / 2, btnY + btnH + 12);

    dayButtonRects.push({
      x, y: btnY, w: btnW, h: btnH,
      patientId: patient.id,
      dayId: day.dayId,
      levelRef: day.levelRef,
      unlocked,
    });
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

  // Day buttons
  for (const btn of dayButtonRects) {
    if (btn.unlocked &&
        mx >= btn.x && mx <= btn.x + btn.w &&
        my >= btn.y && my <= btn.y + btn.h) {
      onStartDay(btn.patientId, btn.dayId, btn.levelRef);
      break;
    }
  }
}
