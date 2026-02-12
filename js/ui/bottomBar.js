// GlucoDefense — Bottom bar UI (core action + intervention buttons)

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';
import {
  getInterventionStatus,
  activateSpawnPriest,
  activateWalk,
  activateExercise,
} from '../systems/interventions.js';

let ctx = null;
let canvas = null;
let buttonRects = [];

// Sub-menu state
let subMenu = { type: null, timer: 0, rects: [] };
const SUB_MENU_TIMEOUT = 3;

const TOOLTIPS = {
  spawnKnight: 'Liver activates GLUT2 transporters for hepatic glucose uptake.',
  physicalActivity: 'Physical activity increases GLUT4 translocation in muscle cells.',
  spawnPriest: 'Pancreas releases insulin bolus to facilitate cellular glucose uptake.',
  kidneyVortex: 'Kidneys increase glomerular filtration rate (GFR) to excrete glucose.',
  semaglutide: 'GLP-1 receptor agonist: slows gastric emptying, reduces appetite.',
  dapagliflozin: 'SGLT2 inhibitor: blocks renal glucose reabsorption in proximal tubule.',
  metformin: 'Biguanide: suppresses hepatic glucose output, improves insulin sensitivity.',
};

const INSULIN_DOSES = [5, 10, 20, 30];

export function initBottomBar(canvasEl, context) {
  canvas = canvasEl;
  ctx = context;

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
}

export function renderBottomBar() {
  if (gameState.phase === GamePhase.MENU || gameState.phase === GamePhase.GAME_OVER) return;

  // Tick sub-menu timer
  if (subMenu.type) {
    subMenu.timer -= 0.016;
    if (subMenu.timer <= 0) subMenu.type = null;
  }

  const C = CONFIG.COLORS;
  const barY = 625;
  const barH = 95;

  // Background
  ctx.fillStyle = C.DARK_BG2;
  ctx.fillRect(0, barY, CONFIG.CANVAS_WIDTH, barH);

  const actions = getInterventionStatus();
  const btnH = 75;
  const btnGap = 6;

  // Dynamic button width based on count
  const maxTotalW = CONFIG.CANVAS_WIDTH - 40;
  const btnW = Math.min(140, (maxTotalW - (actions.length - 1) * btnGap) / actions.length);

  const totalW = actions.length * btnW + (actions.length - 1) * btnGap;
  const startX = (CONFIG.CANVAS_WIDTH - totalW) / 2;
  const btnY = barY + 10;

  buttonRects = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const x = startX + i * (btnW + btnGap);
    const isHovered = gameState.hoveredAction === action.key;

    drawButton(action, x, btnY, btnW, btnH, isHovered);

    buttonRects.push({
      x, y: btnY, w: btnW, h: btnH,
      intervention: action,
    });
  }

  drawSubMenu();
  drawTooltip();
}

function drawButton(iv, x, y, w, h, isHovered) {
  const C = CONFIG.COLORS;
  const canAfford = iv.cost === 0 || gameState.energy >= iv.cost;
  const hasCharges = !iv.hasCharges || iv.charges > 0;
  const onCooldown = iv.cooldown > 0;
  const isAvailable = canAfford && hasCharges && !onCooldown && !iv.active;

  // Core action buttons have a slightly different color
  const bgAvailable = iv.isCoreAction ? '#3D5A6E' : '#4A6274';
  const bgDisabled = '#2C3E50';

  // Hover: brighter background
  if (isHovered) {
    ctx.fillStyle = iv.isCoreAction ? '#4D7A8E' : '#5A7A8C';
  } else {
    ctx.fillStyle = isAvailable ? bgAvailable : bgDisabled;
  }

  // Hover: pulsing border
  if (isHovered) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    ctx.strokeStyle = `rgba(241, 196, 15, ${0.4 + pulse * 0.6})`;
    ctx.lineWidth = 2;
  } else {
    ctx.strokeStyle = iv.isCoreAction ? '#4A90A4' : '#5D7A8C';
    ctx.lineWidth = 1;
  }

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Cooldown overlay (bottom-up fill)
  if (onCooldown && iv.maxCooldown > 0) {
    const pct = iv.cooldown / iv.maxCooldown;
    ctx.fillStyle = 'rgba(127, 140, 141, 0.5)';
    ctx.fillRect(x, y + h * (1 - pct), w, h * pct);
  }

  // Active glow
  if (iv.active) {
    ctx.strokeStyle = '#F1C40F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.stroke();
  }

  // Disabled alpha (skip if hovered to keep highlight visible)
  if (!isAvailable && !iv.active && !isHovered) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x, y, w, h);
  }

  // Emoji + name
  ctx.font = '13px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = C.WHITE;
  ctx.fillText(`${iv.emoji} ${iv.name}`, x + w / 2, y + 20);

  // Cost + charges/extra info
  ctx.font = '11px Arial';
  let infoText = '';
  if (iv.hasCharges) {
    infoText += `x${iv.charges}  `;
  }
  if (iv.extraInfo) {
    infoText += `[${iv.extraInfo}]  `;
  }
  if (iv.cost > 0) {
    infoText += `${iv.cost}\u26A1`;
  } else if (iv.key === 'spawnPriest' || iv.key === 'physicalActivity') {
    infoText += 'click to choose';
  } else {
    infoText += 'FREE';
  }
  ctx.fillText(infoText, x + w / 2, y + 38);

  // Cooldown timer or status
  if (onCooldown) {
    ctx.font = '10px Arial';
    ctx.fillStyle = '#E74C3C';
    const cdText = iv.cooldown >= 1 ? `${Math.ceil(iv.cooldown)}s` : 'ready...';
    ctx.fillText(cdText, x + w / 2, y + 55);
  } else if (iv.active) {
    ctx.font = '10px Arial';
    ctx.fillStyle = '#F1C40F';
    ctx.fillText('ACTIVE', x + w / 2, y + 55);
  }

  // Hotkey hint for core actions (bottom of button)
  if (iv.isCoreAction) {
    ctx.font = '9px Arial';
    ctx.fillStyle = '#7F8C8D';
    const hints = { spawnKnight: '1', physicalActivity: '2', spawnPriest: '3', kidneyVortex: '4' };
    if (hints[iv.key]) {
      ctx.fillText(`[${hints[iv.key]}]`, x + w / 2, y + h - 5);
    }
  }
}

function drawSubMenu() {
  if (!subMenu.type) return;

  const parentBtn = buttonRects.find(b => b.intervention.key === subMenu.type);
  if (!parentBtn) { subMenu.type = null; return; }

  subMenu.rects = [];

  if (subMenu.type === 'spawnPriest') {
    drawInsulinDoseMenu(parentBtn);
  } else if (subMenu.type === 'physicalActivity') {
    drawPhysActivityMenu(parentBtn);
  }
}

function drawInsulinDoseMenu(parentBtn) {
  const C = CONFIG.COLORS;
  const optW = 60;
  const optH = 36;
  const optGap = 4;
  const totalOptW = INSULIN_DOSES.length * optW + (INSULIN_DOSES.length - 1) * optGap;
  const startX = parentBtn.x + parentBtn.w / 2 - totalOptW / 2;
  const optY = parentBtn.y - optH - 8;

  for (let i = 0; i < INSULIN_DOSES.length; i++) {
    const dose = INSULIN_DOSES[i];
    const x = startX + i * (optW + optGap);

    const isHovered = gameState.mouseX >= x && gameState.mouseX <= x + optW &&
                      gameState.mouseY >= optY && gameState.mouseY <= optY + optH;

    ctx.fillStyle = isHovered ? '#4A90A4' : '#3D5A6E';
    ctx.strokeStyle = isHovered ? '#F1C40F' : '#5D7A8C';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, optY, optW, optH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C.WHITE;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`x${dose}`, x + optW / 2, optY + 16);

    ctx.font = '10px Arial';
    ctx.fillStyle = '#2ECC71';
    ctx.fillText('IU', x + optW / 2, optY + 30);

    subMenu.rects.push({ x, y: optY, w: optW, h: optH, dose });
  }
}

function drawPhysActivityMenu(parentBtn) {
  const C = CONFIG.COLORS;
  const iv = gameState.interventions;

  const optW = 120;
  const optH = 48;
  const optGap = 4;
  const options = [
    {
      key: 'walk',
      label: '\u{1F6B6} Walk',
      desc: `${CONFIG.WALK_COST}\u26A1 GLUT4 uptake`,
      cost: CONFIG.WALK_COST,
      cooldown: iv.walk.cooldown,
      available: true,
    },
    {
      key: 'exercise',
      label: '\u{1F3CB} Training',
      desc: `${CONFIG.EXERCISE_COST}\u26A1 x2 ATP ${CONFIG.EXERCISE_DURATION}s`,
      cost: CONFIG.EXERCISE_COST,
      cooldown: iv.exercise.cooldown,
      available: !iv.exercise.active,
      active: iv.exercise.active,
    },
  ];

  const totalOptW = options.length * optW + (options.length - 1) * optGap;
  const startX = parentBtn.x + parentBtn.w / 2 - totalOptW / 2;
  const optY = parentBtn.y - optH - 8;

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const canAfford = gameState.energy >= opt.cost;
    const onCooldown = opt.cooldown > 0;
    const isReady = canAfford && !onCooldown && opt.available;
    const x = startX + i * (optW + optGap);

    const isHovered = gameState.mouseX >= x && gameState.mouseX <= x + optW &&
                      gameState.mouseY >= optY && gameState.mouseY <= optY + optH;

    ctx.fillStyle = isHovered && isReady ? '#4A90A4' : isReady ? '#3D5A6E' : '#2C3E50';
    ctx.strokeStyle = isHovered && isReady ? '#F1C40F' : opt.active ? '#F1C40F' : '#5D7A8C';
    ctx.lineWidth = opt.active ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x, optY, optW, optH, 4);
    ctx.fill();
    ctx.stroke();

    if (!isReady && !opt.active) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x, optY, optW, optH);
    }

    ctx.fillStyle = isReady || opt.active ? C.WHITE : C.GRAY;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(opt.label, x + optW / 2, optY + 18);

    ctx.font = '10px Arial';
    ctx.fillStyle = isReady ? C.GOLD : opt.active ? '#F1C40F' : C.GRAY;
    if (opt.active) {
      ctx.fillText('ACTIVE', x + optW / 2, optY + 33);
    } else if (onCooldown) {
      ctx.fillText(`${Math.ceil(opt.cooldown)}s`, x + optW / 2, optY + 33);
    } else {
      ctx.fillText(opt.desc, x + optW / 2, optY + 33);
    }

    subMenu.rects.push({ x, y: optY, w: optW, h: optH, actionKey: opt.key });
  }
}

function drawTooltip() {
  // Don't show tooltip if sub-menu is open
  if (subMenu.type) return;

  const hovered = gameState.hoveredAction;
  if (!hovered) return;
  const text = TOOLTIPS[hovered];
  if (!text) return;

  const btn = buttonRects.find(b => b.intervention.key === hovered);
  if (!btn) return;

  ctx.font = '11px Arial';
  const tipW = 300;
  const padding = 8;
  const lineH = 14;

  // Word-wrap text into lines
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = currentLine + ' ' + words[i];
    if (ctx.measureText(test).width < tipW - padding * 2) {
      currentLine = test;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);

  const tipH = padding * 2 + lines.length * lineH;
  const tipX = Math.max(5, Math.min(btn.x + btn.w / 2 - tipW / 2, CONFIG.CANVAS_WIDTH - tipW - 5));
  const tipY = btn.y - tipH - 6;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
  ctx.beginPath();
  ctx.roundRect(tipX, tipY, tipW, tipH, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], tipX + padding, tipY + padding + (i + 1) * lineH);
  }
}

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  let found = null;
  for (const btn of buttonRects) {
    if (mx >= btn.x && mx <= btn.x + btn.w &&
        my >= btn.y && my <= btn.y + btn.h) {
      found = btn.intervention.key;
      break;
    }
  }
  gameState.hoveredAction = found;

  // Reset sub-menu timer when hovering over sub-menu options
  if (subMenu.type && subMenu.rects.length > 0) {
    for (const sr of subMenu.rects) {
      if (mx >= sr.x && mx <= sr.x + sr.w && my >= sr.y && my <= sr.y + sr.h) {
        subMenu.timer = SUB_MENU_TIMEOUT;
        break;
      }
    }
  }
}

function handleMouseLeave() {
  gameState.hoveredAction = null;
}

function handleClick(e) {
  if (gameState.phase !== GamePhase.PLAYING && gameState.phase !== GamePhase.BETWEEN_WAVES) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  // Check sub-menu clicks first
  if (subMenu.type && subMenu.rects.length > 0) {
    for (const sr of subMenu.rects) {
      if (mx >= sr.x && mx <= sr.x + sr.w && my >= sr.y && my <= sr.y + sr.h) {
        if (subMenu.type === 'spawnPriest') {
          activateSpawnPriest(sr.dose);
        } else if (subMenu.type === 'physicalActivity') {
          if (sr.actionKey === 'walk') activateWalk();
          else if (sr.actionKey === 'exercise') activateExercise();
        }
        subMenu.type = null;
        return;
      }
    }
    // Clicked outside sub-menu — close it
    subMenu.type = null;
  }

  // Check main buttons
  for (const btn of buttonRects) {
    if (mx >= btn.x && mx <= btn.x + btn.w &&
        my >= btn.y && my <= btn.y + btn.h) {
      const key = btn.intervention.key;
      if (key === 'spawnPriest' || key === 'physicalActivity') {
        // Toggle sub-menu
        if (subMenu.type === key) {
          subMenu.type = null;
        } else {
          subMenu.type = key;
          subMenu.timer = SUB_MENU_TIMEOUT;
          subMenu.rects = [];
        }
      } else {
        btn.intervention.activate();
      }
      break;
    }
  }
}
