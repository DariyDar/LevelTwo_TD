// GlucoDefense — Balance Settings Panel (adjustable gameplay variables)

import { CONFIG } from '../config.js';

const STORAGE_KEY = 'glucodefense_balance';

// Define all adjustable parameters with medical names
const BALANCE_PARAMS = [
  {
    key: 'STARTING_WORKERS',
    label: 'Starting Glycogen Pool',
    desc: 'Initial glucose stored in muscle cells',
    min: 10, max: 200, step: 5,
  },
  {
    key: 'ENERGY_START',
    label: 'Starting ATP',
    desc: 'Initial energy reserves',
    min: 50, max: 500, step: 10,
  },
  {
    key: 'ENERGY_BASAL_DRAIN',
    label: 'Basal Metabolic Rate',
    desc: 'Resting energy consumption per second',
    min: 4, max: 30, step: 1,
  },
  {
    key: 'WORKER_LIFETIME',
    label: 'Cellular Glucose Uptake Duration',
    desc: 'Seconds before a muscle cell consumes its glucose',
    min: 3, max: 60, step: 1,
  },
  {
    key: 'MINE_ENERGY_PER_WORKER',
    label: 'ATP per Glycolysis',
    desc: 'Energy produced per active muscle cell per second',
    min: 0.1, max: 1.0, step: 0.05,
  },
  {
    key: 'KNIGHT_SPEED',
    label: 'GLUT Transporter Speed',
    desc: 'Movement speed of liver GLUT2 transporters (px/s)',
    min: 10, max: 150, step: 5,
  },
  {
    key: 'LIVER_MAX_KNIGHTS',
    label: 'Max GLUT Transporters',
    desc: 'Maximum number of liver GLUT2 transporters',
    min: 3, max: 30, step: 1,
  },
  {
    key: 'LIVER_AUTO_SPAWN_INTERVAL',
    label: 'GLUT Transporter Synthesis Rate',
    desc: 'Seconds between auto-spawning new transporters',
    min: 1, max: 15, step: 0.5,
  },
  {
    key: 'LIVER_BONUS_KNIGHT_COUNT',
    label: 'Metformin GLUT Boost Count',
    desc: 'Extra transporters spawned by Metformin activation',
    min: 1, max: 20, step: 1,
  },
  {
    key: 'KNIGHT_INTERCEPT_CHANCE',
    label: 'GLUT Intercept Probability',
    desc: 'Chance a transporter successfully captures glucose',
    min: 0.1, max: 1.0, step: 0.05,
  },
  {
    key: 'PANCREAS_AUTO_SPAWN_INTERVAL_0',
    label: 'Insulin Secretion Rate (IR 0)',
    desc: 'Seconds between insulin auto-release at degradation 0',
    min: 0.5, max: 10, step: 0.25,
    configPath: ['PANCREAS_AUTO_SPAWN_INTERVAL', 0],
  },
  {
    key: 'PANCREAS_MAX_PRIESTS_0',
    label: 'Max Insulin Units (IR 0)',
    desc: 'Maximum circulating insulin at degradation 0',
    min: 3, max: 50, step: 1,
    configPath: ['PANCREAS_MAX_PRIESTS', 0],
  },
  {
    key: 'RESISTANCE_0',
    label: 'Insulin Sensitivity (IR 0)',
    desc: 'Probability of successful glucose uptake at degradation 0',
    min: 0.1, max: 1.0, step: 0.05,
    configPath: ['RESISTANCE_BY_DEGRADATION', 0],
  },
  {
    key: 'REBEL_HP',
    label: 'Free Glucose HP',
    desc: 'Health of unconverted glucose (rebel durability)',
    min: 20, max: 200, step: 10,
  },
  {
    key: 'REBEL_HP_DECAY',
    label: 'Free Glucose Decay Rate',
    desc: 'HP lost per second by unconverted glucose',
    min: 0.2, max: 5.0, step: 0.2,
  },
  {
    key: 'REBEL_BUILDING_DPS',
    label: 'Hyperglycemia Organ Damage',
    desc: 'Damage per second dealt by free glucose to organs',
    min: 1, max: 20, step: 1,
  },
  {
    key: 'REBELS_ATTACK_MINES',
    label: 'Organ Damage Threshold',
    desc: 'Free glucose count needed to start attacking organs',
    min: 5, max: 50, step: 5,
  },
  {
    key: 'DAY_SPEED',
    label: 'Day Speed',
    desc: 'Virtual minutes per real second (higher = faster day)',
    min: 1, max: 10, step: 0.5,
  },
  {
    key: 'LIVER_RELEASE_THRESHOLD_BG',
    label: 'Liver Auto-Release BG',
    desc: 'BG below this triggers hepatic glycogenolysis',
    min: 60, max: 150, step: 5,
  },
  {
    key: 'WALK_COST',
    label: 'Walk Energy Cost',
    desc: 'ATP spent for light walk (non-insulin glucose uptake)',
    min: 0, max: 50, step: 5,
  },
  {
    key: 'EXERCISE_COST',
    label: 'Training Energy Cost',
    desc: 'ATP spent for intense exercise (doubles worker output)',
    min: 0, max: 100, step: 5,
  },
  {
    key: 'PRIEST_WAIT_TIMEOUT',
    label: 'Glucose Aggro Timer',
    desc: 'Base seconds before free glucose becomes hostile (\u00B150% random)',
    min: 5, max: 60, step: 1,
  },
];

// Store defaults once on load
const DEFAULTS = {};
function captureDefaults() {
  for (const param of BALANCE_PARAMS) {
    if (param.configPath) {
      const [arr, idx] = param.configPath;
      DEFAULTS[param.key] = CONFIG[arr][idx];
    } else {
      DEFAULTS[param.key] = CONFIG[param.key];
    }
  }
}

function getValue(param) {
  if (param.configPath) {
    const [arr, idx] = param.configPath;
    return CONFIG[arr][idx];
  }
  return CONFIG[param.key];
}

function setValue(param, val) {
  if (param.configPath) {
    const [arr, idx] = param.configPath;
    CONFIG[arr][idx] = val;
  } else {
    CONFIG[param.key] = val;
  }
}

// Persistence
function saveBalance() {
  const data = {};
  for (const param of BALANCE_PARAMS) {
    data[param.key] = getValue(param);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) { /* ignore */ }
}

function loadBalance() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const param of BALANCE_PARAMS) {
      const val = data[param.key];
      if (typeof val === 'number' && !isNaN(val) &&
          val >= param.min && val <= param.max) {
        setValue(param, val);
      }
    }
  } catch (_) { /* ignore */ }
}

function resetToDefaults() {
  for (const param of BALANCE_PARAMS) {
    setValue(param, DEFAULTS[param.key]);
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) { /* ignore */ }
}

function copyBalance() {
  const lines = BALANCE_PARAMS.map(param => {
    const val = getValue(param);
    const def = DEFAULTS[param.key];
    const marker = val !== def ? ' *' : '';
    return `${param.label}: ${param.step < 1 ? val.toFixed(2) : val}${marker}`;
  });
  const text = 'GlucoDefense Balance:\n' + lines.join('\n');
  navigator.clipboard.writeText(text).catch(() => {});
  copyFlashTimer = 1.5;
}

// --- UI rendering and interaction ---

let ctx = null;
let canvas = null;
let visible = false;
let scrollY = 0;
let draggingSlider = null;
let sliderRects = [];

const PANEL_X = 140;
const PANEL_Y = 40;
const PANEL_W = 1000;
const PANEL_H = 640;
const ROW_H = 48;
const SLIDER_W = 280;
const SLIDER_H = 8;
const HEADER_H = 60;
const FOOTER_H = 50;
const CONTENT_H = PANEL_H - HEADER_H - FOOTER_H;

// Buttons
let resetBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let copyBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let closeBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let copyFlashTimer = 0;

export function initBalancePanel(canvasEl, context) {
  canvas = canvasEl;
  ctx = context;
  captureDefaults();
  loadBalance();

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
}

export function isBalancePanelVisible() {
  return visible;
}

export function showBalancePanel() {
  visible = true;
  scrollY = 0;
  draggingSlider = null;
}

export function hideBalancePanel() {
  visible = false;
  draggingSlider = null;
  saveBalance();
}

export function renderBalancePanel() {
  if (!visible) return;

  const C = CONFIG.COLORS;

  // Dimmed backdrop
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  // Panel background
  ctx.fillStyle = '#1C2833';
  ctx.strokeStyle = '#5D7A8C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 10);
  ctx.fill();
  ctx.stroke();

  // Header
  ctx.fillStyle = '#2C3E50';
  ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, HEADER_H);

  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Balance Settings', PANEL_X + PANEL_W / 2, PANEL_Y + 38);

  // Close button (top-right)
  closeBtnRect = { x: PANEL_X + PANEL_W - 50, y: PANEL_Y + 10, w: 36, h: 36 };
  ctx.fillStyle = '#4A6274';
  ctx.beginPath();
  ctx.roundRect(closeBtnRect.x, closeBtnRect.y, closeBtnRect.w, closeBtnRect.h, 4);
  ctx.fill();
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('\u2715', closeBtnRect.x + closeBtnRect.w / 2, closeBtnRect.y + 26);

  // Content area with clipping
  ctx.save();
  ctx.beginPath();
  ctx.rect(PANEL_X, PANEL_Y + HEADER_H, PANEL_W, CONTENT_H);
  ctx.clip();

  sliderRects = [];
  const contentStartY = PANEL_Y + HEADER_H + 10 - scrollY;

  for (let i = 0; i < BALANCE_PARAMS.length; i++) {
    const param = BALANCE_PARAMS[i];
    const rowY = contentStartY + i * ROW_H;

    // Skip if outside visible area
    if (rowY + ROW_H < PANEL_Y + HEADER_H || rowY > PANEL_Y + HEADER_H + CONTENT_H) {
      sliderRects.push(null);
      continue;
    }

    // Alternating row background
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(PANEL_X + 5, rowY, PANEL_W - 10, ROW_H);
    }

    // Label
    ctx.fillStyle = C.WHITE;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(param.label, PANEL_X + 20, rowY + 18);

    // Description
    ctx.fillStyle = '#7F8C8D';
    ctx.font = '10px Arial';
    ctx.fillText(param.desc, PANEL_X + 20, rowY + 34);

    // Slider track
    const sliderX = PANEL_X + PANEL_W - SLIDER_W - 100;
    const sliderCenterY = rowY + ROW_H / 2;

    ctx.fillStyle = '#4A6274';
    ctx.fillRect(sliderX, sliderCenterY - SLIDER_H / 2, SLIDER_W, SLIDER_H);

    // Slider fill
    const currentVal = getValue(param);
    const pct = (currentVal - param.min) / (param.max - param.min);
    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(sliderX, sliderCenterY - SLIDER_H / 2, SLIDER_W * pct, SLIDER_H);

    // Slider thumb
    const thumbX = sliderX + SLIDER_W * pct;
    ctx.beginPath();
    ctx.arc(thumbX, sliderCenterY, 8, 0, Math.PI * 2);
    ctx.fillStyle = draggingSlider === i ? '#FFFFFF' : '#F1C40F';
    ctx.fill();
    ctx.strokeStyle = '#D4AC0D';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Value display
    const displayVal = param.step < 1 ? currentVal.toFixed(2) : String(currentVal);
    const isDefault = currentVal === DEFAULTS[param.key];
    ctx.fillStyle = isDefault ? C.WHITE : '#F1C40F';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(displayVal, PANEL_X + PANEL_W - 50, rowY + 28);

    sliderRects.push({
      x: sliderX, y: sliderCenterY - 14,
      w: SLIDER_W, h: 28,
      paramIndex: i,
    });
  }

  ctx.restore();

  // Footer
  const footerY = PANEL_Y + PANEL_H - FOOTER_H;
  ctx.fillStyle = '#2C3E50';
  ctx.fillRect(PANEL_X, footerY, PANEL_W, FOOTER_H);

  // Reset to Defaults button (left side of footer)
  resetBtnRect = { x: PANEL_X + PANEL_W / 2 - 200, y: footerY + 10, w: 180, h: 30 };
  ctx.fillStyle = '#7D3C98';
  ctx.beginPath();
  ctx.roundRect(resetBtnRect.x, resetBtnRect.y, resetBtnRect.w, resetBtnRect.h, 4);
  ctx.fill();
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Reset to Defaults', resetBtnRect.x + resetBtnRect.w / 2, resetBtnRect.y + 20);

  // Copy Settings button (right side of footer)
  copyBtnRect = { x: PANEL_X + PANEL_W / 2 + 20, y: footerY + 10, w: 180, h: 30 };
  ctx.fillStyle = copyFlashTimer > 0 ? '#27AE60' : '#2C6E8C';
  ctx.beginPath();
  ctx.roundRect(copyBtnRect.x, copyBtnRect.y, copyBtnRect.w, copyBtnRect.h, 4);
  ctx.fill();
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(copyFlashTimer > 0 ? 'Copied!' : 'Copy Settings', copyBtnRect.x + copyBtnRect.w / 2, copyBtnRect.y + 20);
  if (copyFlashTimer > 0) copyFlashTimer -= 0.016;

  // Scrollbar
  const totalContentH = BALANCE_PARAMS.length * ROW_H + 20;
  if (totalContentH > CONTENT_H) {
    const scrollPct = scrollY / (totalContentH - CONTENT_H);
    const scrollbarH = Math.max(30, CONTENT_H * (CONTENT_H / totalContentH));
    const scrollbarY = PANEL_Y + HEADER_H + scrollPct * (CONTENT_H - scrollbarH);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(PANEL_X + PANEL_W - 8, scrollbarY, 4, scrollbarH);
  }
}

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function isInsideRect(mx, my, r) {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}

function handleMouseDown(e) {
  if (!visible) return;
  const { x: mx, y: my } = getMousePos(e);

  // Close button
  if (isInsideRect(mx, my, closeBtnRect)) {
    hideBalancePanel();
    return;
  }

  // Reset button
  if (isInsideRect(mx, my, resetBtnRect)) {
    resetToDefaults();
    return;
  }

  // Copy button
  if (isInsideRect(mx, my, copyBtnRect)) {
    copyBalance();
    return;
  }

  // Check sliders
  for (const sr of sliderRects) {
    if (!sr) continue;
    if (isInsideRect(mx, my, sr)) {
      draggingSlider = sr.paramIndex;
      updateSliderValue(mx, sr);
      return;
    }
  }
}

function handleMouseMove(e) {
  if (!visible) return;
  if (draggingSlider === null) return;

  const { x: mx } = getMousePos(e);
  const sr = sliderRects[draggingSlider];
  if (sr) {
    updateSliderValue(mx, sr);
  }
}

function handleMouseUp() {
  if (draggingSlider !== null) {
    draggingSlider = null;
    saveBalance();
  }
}

function handleWheel(e) {
  if (!visible) return;

  const { x: mx, y: my } = getMousePos(e);
  if (mx >= PANEL_X && mx <= PANEL_X + PANEL_W &&
      my >= PANEL_Y && my <= PANEL_Y + PANEL_H) {
    e.preventDefault();
    const totalContentH = BALANCE_PARAMS.length * ROW_H + 20;
    const maxScroll = Math.max(0, totalContentH - CONTENT_H);
    scrollY = Math.max(0, Math.min(maxScroll, scrollY + e.deltaY * 0.5));
  }
}

function updateSliderValue(mx, sr) {
  const param = BALANCE_PARAMS[sr.paramIndex];
  const pct = Math.max(0, Math.min(1, (mx - sr.x) / sr.w));
  let val = param.min + pct * (param.max - param.min);

  // Snap to step
  val = Math.round(val / param.step) * param.step;
  val = Math.max(param.min, Math.min(param.max, val));

  // Round to avoid floating point noise
  if (param.step < 1) {
    val = parseFloat(val.toFixed(2));
  }

  setValue(param, val);
}
