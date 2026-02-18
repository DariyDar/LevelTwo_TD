// GlucoDefense — Balance Settings Panel (tabbed: Global + Patient tabs with embedded day settings)

import { CONFIG } from '../config.js';
import { PATIENTS } from '../patients/index.js';
import { LEVELS } from '../levels/index.js';
import {
  PATIENT_PARAMS, getPatientParamValue, setPatientParamValue,
  getPatientDefault, savePatientBalance, resetPatientBalance, copyPatientBalance,
  initPatientBalances,
} from './balancePanelPatient.js';
import {
  DAY_PARAMS, getDayParamValue, setDayParamValue,
  getDayDefault, saveDayBalance, resetDayBalance, copyDayBalance,
  initDayBalances,
} from './balancePanelDay.js';
import { unlockAllLevels, resetAllProgress } from './menu.js';

const STORAGE_KEY = 'glucodefense_balance';

// Global params (CONFIG-level)
const BALANCE_PARAMS = [
  { key: 'STARTING_WORKERS', label: 'Starting Glycogen Pool', desc: 'Initial glucose stored in muscle cells', min: 2, max: 40, step: 1 },
  { key: 'ENERGY_START', label: 'Starting ATP', desc: 'Initial energy reserves', min: 50, max: 500, step: 10 },
  { key: 'ENERGY_BASAL_DRAIN', label: 'Basal Metabolic Rate', desc: 'Resting energy consumption per second', min: 4, max: 30, step: 1 },
  { key: 'WORKER_LIFETIME', label: 'Cellular Glucose Uptake Duration', desc: 'Seconds before a muscle cell consumes its glucose', min: 3, max: 60, step: 1 },
  { key: 'MINE_ENERGY_PER_WORKER', label: 'ATP per Glycolysis', desc: 'Energy produced per active muscle cell per second', min: 0.1, max: 1.0, step: 0.05 },
  { key: 'KNIGHT_SPEED', label: 'GLUT Transporter Speed', desc: 'Movement speed of liver GLUT2 transporters (px/s)', min: 10, max: 1000, step: 10 },
  { key: 'LIVER_MAX_KNIGHTS', label: 'Max GLUT Transporters', desc: 'Maximum number of liver GLUT2 transporters', min: 1, max: 10, step: 1 },
  { key: 'LIVER_AUTO_SPAWN_INTERVAL', label: 'GLUT Synthesis Rate', desc: 'Seconds between auto-spawning new transporters', min: 1, max: 15, step: 0.5 },
  { key: 'LIVER_BONUS_KNIGHT_COUNT', label: 'Metformin GLUT Boost', desc: 'Extra transporters spawned by Metformin', min: 1, max: 20, step: 1 },
  { key: 'KNIGHT_INTERCEPT_CHANCE', label: 'GLUT Intercept Probability', desc: 'Chance a transporter successfully captures glucose', min: 0.1, max: 1.0, step: 0.05 },
  { key: 'PANCREAS_AUTO_SPAWN_INTERVAL_0', label: 'Insulin Secretion Rate (IR 0)', desc: 'Seconds between insulin auto-release at IR 0', min: 0.5, max: 10, step: 0.25, configPath: ['PANCREAS_AUTO_SPAWN_INTERVAL', 0] },
  { key: 'PANCREAS_MAX_PRIESTS_0', label: 'Max Insulin Units (IR 0)', desc: 'Maximum circulating insulin at IR 0', min: 1, max: 15, step: 1, configPath: ['PANCREAS_MAX_PRIESTS', 0] },
  { key: 'RESISTANCE_0', label: 'Insulin Sensitivity (IR 0)', desc: 'Probability of successful glucose uptake at IR 0', min: 0.1, max: 1.0, step: 0.05, configPath: ['RESISTANCE_BY_DEGRADATION', 0] },
  { key: 'REBEL_HP', label: 'Free Glucose HP', desc: 'Health of unconverted glucose', min: 20, max: 200, step: 10 },
  { key: 'REBEL_BUILDING_DPS', label: 'Hyperglycemia Organ Damage', desc: 'DPS dealt by free glucose to organs', min: 1, max: 20, step: 1 },
  { key: 'DAY_SPEED', label: 'Day Speed', desc: 'Virtual minutes per real second', min: 1, max: 10, step: 0.5 },
  { key: 'WALK_COST', label: 'Walk Energy Cost', desc: 'ATP spent for light walk', min: 0, max: 50, step: 5 },
  { key: 'EXERCISE_COST', label: 'Training Energy Cost', desc: 'ATP spent for exercise', min: 0, max: 100, step: 5 },
  { key: 'PRIEST_WAIT_TIMEOUT', label: 'Glucose Aggro Timer', desc: 'Seconds before free glucose becomes hostile', min: 5, max: 60, step: 1 },
];

// Store global defaults
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

function getGlobalValue(param) {
  if (param.configPath) {
    const [arr, idx] = param.configPath;
    return CONFIG[arr][idx];
  }
  return CONFIG[param.key];
}

function setGlobalValue(param, val) {
  if (param.configPath) {
    const [arr, idx] = param.configPath;
    CONFIG[arr][idx] = val;
  } else {
    CONFIG[param.key] = val;
  }
}

function saveGlobalBalance() {
  const data = {};
  for (const param of BALANCE_PARAMS) {
    data[param.key] = getGlobalValue(param);
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) { /* ignore */ }
}

function loadGlobalBalance() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const param of BALANCE_PARAMS) {
      const val = data[param.key];
      if (typeof val === 'number' && !isNaN(val) && val >= param.min && val <= param.max) {
        setGlobalValue(param, val);
      }
    }
  } catch (_) { /* ignore */ }
}

function resetGlobalBalance() {
  for (const param of BALANCE_PARAMS) {
    setGlobalValue(param, DEFAULTS[param.key]);
  }
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
}

function copyGlobalBalance() {
  const lines = BALANCE_PARAMS.map(param => {
    const val = getGlobalValue(param);
    return `${param.label}: ${param.step < 1 ? val.toFixed(2) : val}`;
  });
  return 'GlucoDefense Balance \u2014 Global:\n' + lines.join('\n');
}

// --- Tab system ---

// Tab IDs: 'global', 'patient_healthy', 'patient_type1', ...
// Day settings are embedded inside each patient tab (no standalone day tabs)
const TABS = [
  { id: 'global', label: 'Global' },
  ...PATIENTS.map(p => ({ id: `patient_${p.id}`, label: p.emoji + ' ' + p.name.split(' ')[0] })),
];

let currentTab = 'global';

// Build combined params: patient physiology + day-specific settings for each level
function buildPatientDayParams() {
  const combined = [...PATIENT_PARAMS];
  for (const level of LEVELS) {
    combined.push({ isHeader: true, label: `\u2014 Day ${level.id} \u2014` });
    for (const dp of DAY_PARAMS) {
      combined.push({ ...dp, dayId: level.id });
    }
  }
  return combined;
}

function getActiveParams() {
  if (currentTab === 'global') return BALANCE_PARAMS;
  if (currentTab.startsWith('patient_')) return buildPatientDayParams();
  return [];
}

function getActiveParamValue(param) {
  if (param.isHeader) return 0;
  if (currentTab === 'global') return getGlobalValue(param);
  if (currentTab.startsWith('patient_')) {
    const patientId = currentTab.replace('patient_', '');
    if (param.dayId) return getDayParamValue(param.dayId, param.key);
    return getPatientParamValue(patientId, param.key);
  }
  return 0;
}

function setActiveParamValue(param, val) {
  if (param.isHeader) return;
  if (currentTab === 'global') { setGlobalValue(param, val); return; }
  if (currentTab.startsWith('patient_')) {
    if (param.dayId) {
      setDayParamValue(param.dayId, param.key, val);
    } else {
      const patientId = currentTab.replace('patient_', '');
      setPatientParamValue(patientId, param.key, val);
    }
    return;
  }
}

function getActiveDefault(param) {
  if (param.isHeader) return 0;
  if (currentTab === 'global') return DEFAULTS[param.key];
  if (currentTab.startsWith('patient_')) {
    if (param.dayId) return getDayDefault(param.dayId, param.key);
    const patientId = currentTab.replace('patient_', '');
    return getPatientDefault(patientId, param.key);
  }
  return 0;
}

function saveActiveBalance() {
  if (currentTab === 'global') { saveGlobalBalance(); return; }
  if (currentTab.startsWith('patient_')) {
    const patientId = currentTab.replace('patient_', '');
    savePatientBalance(patientId);
    for (const level of LEVELS) saveDayBalance(level.id);
    return;
  }
}

function resetActiveBalance() {
  if (currentTab === 'global') { resetGlobalBalance(); return; }
  if (currentTab.startsWith('patient_')) {
    const patientId = currentTab.replace('patient_', '');
    resetPatientBalance(patientId);
    for (const level of LEVELS) resetDayBalance(level.id);
    return;
  }
}

function copyActiveBalance() {
  let text = '';
  if (currentTab === 'global') {
    text = copyGlobalBalance();
  } else if (currentTab.startsWith('patient_')) {
    const patientId = currentTab.replace('patient_', '');
    text = copyPatientBalance(patientId);
    for (const level of LEVELS) {
      text += '\n\n' + copyDayBalance(level.id);
    }
  }
  navigator.clipboard.writeText(text).catch(() => {});
  copyFlashTimer = 1.5;
}

// --- UI rendering ---

let ctx = null;
let canvas = null;
let visible = false;
let scrollY = 0;
let draggingSlider = null;
let sliderRects = [];
let tabRects = [];

const PANEL_X = 100;
const PANEL_Y = 20;
const PANEL_W = 1080;
const PANEL_H = 680;
const TAB_H = 30;
const ROW_H = 48;
const SLIDER_W = 280;
const SLIDER_H = 8;
const HEADER_H = 60;
const FOOTER_H = 50;
const CONTENT_H = PANEL_H - HEADER_H - TAB_H - FOOTER_H;

let resetBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let copyBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let closeBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let unlockAllBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let resetProgressBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let copyFlashTimer = 0;

export function initBalancePanel(canvasEl, context) {
  canvas = canvasEl;
  ctx = context;
  captureDefaults();
  loadGlobalBalance();
  initPatientBalances();
  initDayBalances();

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
}

export function isBalancePanelVisible() { return visible; }

export function showBalancePanel() {
  visible = true;
  scrollY = 0;
  draggingSlider = null;
}

export function hideBalancePanel() {
  visible = false;
  draggingSlider = null;
  saveActiveBalance();
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

  // Close button
  closeBtnRect = { x: PANEL_X + PANEL_W - 50, y: PANEL_Y + 10, w: 36, h: 36 };
  ctx.fillStyle = '#4A6274';
  ctx.beginPath();
  ctx.roundRect(closeBtnRect.x, closeBtnRect.y, closeBtnRect.w, closeBtnRect.h, 4);
  ctx.fill();
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('\u2715', closeBtnRect.x + closeBtnRect.w / 2, closeBtnRect.y + 26);

  // Tabs
  drawTabs(C);

  // Content area with clipping
  const contentY = PANEL_Y + HEADER_H + TAB_H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(PANEL_X, contentY, PANEL_W, CONTENT_H);
  ctx.clip();

  const params = getActiveParams();
  sliderRects = [];
  const contentStartY = contentY + 10 - scrollY;

  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    const rowY = contentStartY + i * ROW_H;

    if (rowY + ROW_H < contentY || rowY > contentY + CONTENT_H) {
      sliderRects.push(null);
      continue;
    }

    // Section header (day dividers in patient tabs)
    if (param.isHeader) {
      ctx.fillStyle = 'rgba(241, 196, 15, 0.1)';
      ctx.fillRect(PANEL_X + 5, rowY, PANEL_W - 10, ROW_H);
      ctx.fillStyle = '#F1C40F';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(param.label, PANEL_X + PANEL_W / 2, rowY + ROW_H / 2 + 5);
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

    // Description (only for global params)
    if (param.desc) {
      ctx.fillStyle = '#7F8C8D';
      ctx.font = '10px Arial';
      ctx.fillText(param.desc, PANEL_X + 20, rowY + 34);
    }

    // Slider
    const sliderX = PANEL_X + PANEL_W - SLIDER_W - 100;
    const sliderCenterY = rowY + ROW_H / 2;

    ctx.fillStyle = '#4A6274';
    ctx.fillRect(sliderX, sliderCenterY - SLIDER_H / 2, SLIDER_W, SLIDER_H);

    const currentVal = getActiveParamValue(param);
    const pct = (currentVal - param.min) / (param.max - param.min);
    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(sliderX, sliderCenterY - SLIDER_H / 2, SLIDER_W * pct, SLIDER_H);

    // Thumb
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
    const defaultVal = getActiveDefault(param);
    const isDefault = currentVal === defaultVal;
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

  const btnW = 150;
  const btnH = 30;
  const btnGap = 10;
  const totalBtnsW = 4 * btnW + 3 * btnGap;
  const btnStartX = PANEL_X + (PANEL_W - totalBtnsW) / 2;

  // Reset to Defaults
  resetBtnRect = { x: btnStartX, y: footerY + 10, w: btnW, h: btnH };
  ctx.fillStyle = '#7D3C98';
  ctx.beginPath();
  ctx.roundRect(resetBtnRect.x, resetBtnRect.y, resetBtnRect.w, resetBtnRect.h, 4);
  ctx.fill();
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Reset Defaults', resetBtnRect.x + resetBtnRect.w / 2, resetBtnRect.y + 20);

  // Copy Settings
  copyBtnRect = { x: btnStartX + btnW + btnGap, y: footerY + 10, w: btnW, h: btnH };
  ctx.fillStyle = copyFlashTimer > 0 ? '#27AE60' : '#2C6E8C';
  ctx.beginPath();
  ctx.roundRect(copyBtnRect.x, copyBtnRect.y, copyBtnRect.w, copyBtnRect.h, 4);
  ctx.fill();
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(copyFlashTimer > 0 ? 'Copied!' : 'Copy Settings', copyBtnRect.x + copyBtnRect.w / 2, copyBtnRect.y + 20);
  if (copyFlashTimer > 0) copyFlashTimer -= 0.016;

  // Unlock All Levels
  unlockAllBtnRect = { x: btnStartX + 2 * (btnW + btnGap), y: footerY + 10, w: btnW, h: btnH };
  ctx.fillStyle = '#2874A6';
  ctx.beginPath();
  ctx.roundRect(unlockAllBtnRect.x, unlockAllBtnRect.y, unlockAllBtnRect.w, unlockAllBtnRect.h, 4);
  ctx.fill();
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Unlock All', unlockAllBtnRect.x + unlockAllBtnRect.w / 2, unlockAllBtnRect.y + 20);

  // Reset Progress
  resetProgressBtnRect = { x: btnStartX + 3 * (btnW + btnGap), y: footerY + 10, w: btnW, h: btnH };
  ctx.fillStyle = '#922B21';
  ctx.beginPath();
  ctx.roundRect(resetProgressBtnRect.x, resetProgressBtnRect.y, resetProgressBtnRect.w, resetProgressBtnRect.h, 4);
  ctx.fill();
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Reset Progress', resetProgressBtnRect.x + resetProgressBtnRect.w / 2, resetProgressBtnRect.y + 20);

  // Scrollbar
  const totalContentH = params.length * ROW_H + 20;
  if (totalContentH > CONTENT_H) {
    const scrollPct = scrollY / (totalContentH - CONTENT_H);
    const scrollbarH = Math.max(30, CONTENT_H * (CONTENT_H / totalContentH));
    const scrollbarY = PANEL_Y + HEADER_H + TAB_H + scrollPct * (CONTENT_H - scrollbarH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(PANEL_X + PANEL_W - 8, scrollbarY, 4, scrollbarH);
  }
}

function drawTabs(C) {
  tabRects = [];
  const tabY = PANEL_Y + HEADER_H;
  let tx = PANEL_X + 5;
  const tabH = TAB_H - 2;

  // Background strip
  ctx.fillStyle = '#1A2530';
  ctx.fillRect(PANEL_X, tabY, PANEL_W, TAB_H);

  for (const tab of TABS) {
    ctx.font = '10px Arial';
    const textW = ctx.measureText(tab.label).width;
    const tabW = Math.max(textW + 16, 50);

    const isActive = currentTab === tab.id;
    ctx.fillStyle = isActive ? '#2C3E50' : '#1C2833';
    ctx.beginPath();
    ctx.roundRect(tx, tabY + 1, tabW, tabH, [4, 4, 0, 0]);
    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = '#F1C40F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, tabY + tabH);
      ctx.lineTo(tx + tabW, tabY + tabH);
      ctx.stroke();
    }

    ctx.fillStyle = isActive ? C.WHITE : '#7F8C8D';
    ctx.font = isActive ? 'bold 10px Arial' : '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tab.label, tx + tabW / 2, tabY + tabH / 2 + 4);

    tabRects.push({ x: tx, y: tabY, w: tabW, h: TAB_H, id: tab.id });
    tx += tabW + 3;
  }
}

// --- Interaction ---

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

  if (isInsideRect(mx, my, closeBtnRect)) { hideBalancePanel(); return; }
  if (isInsideRect(mx, my, resetBtnRect)) { resetActiveBalance(); return; }
  if (isInsideRect(mx, my, copyBtnRect)) { copyActiveBalance(); return; }
  if (isInsideRect(mx, my, unlockAllBtnRect)) { unlockAllLevels(); return; }
  if (isInsideRect(mx, my, resetProgressBtnRect)) { resetAllProgress(); return; }

  // Tab clicks
  for (const tr of tabRects) {
    if (isInsideRect(mx, my, tr)) {
      saveActiveBalance();
      currentTab = tr.id;
      scrollY = 0;
      return;
    }
  }

  // Sliders
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
  if (!visible || draggingSlider === null) return;
  const { x: mx } = getMousePos(e);
  const sr = sliderRects[draggingSlider];
  if (sr) updateSliderValue(mx, sr);
}

function handleMouseUp() {
  if (draggingSlider !== null) {
    draggingSlider = null;
    saveActiveBalance();
  }
}

function handleWheel(e) {
  if (!visible) return;
  const { x: mx, y: my } = getMousePos(e);
  if (mx >= PANEL_X && mx <= PANEL_X + PANEL_W &&
      my >= PANEL_Y && my <= PANEL_Y + PANEL_H) {
    e.preventDefault();
    const params = getActiveParams();
    const totalContentH = params.length * ROW_H + 20;
    const maxScroll = Math.max(0, totalContentH - CONTENT_H);
    scrollY = Math.max(0, Math.min(maxScroll, scrollY + e.deltaY * 0.5));
  }
}

function updateSliderValue(mx, sr) {
  const params = getActiveParams();
  const param = params[sr.paramIndex];
  if (!param || param.isHeader) return;

  const pct = Math.max(0, Math.min(1, (mx - sr.x) / sr.w));
  let val = param.min + pct * (param.max - param.min);

  val = Math.round(val / param.step) * param.step;
  val = Math.max(param.min, Math.min(param.max, val));

  if (param.step < 1) {
    val = parseFloat(val.toFixed(2));
  }

  setActiveParamValue(param, val);
}
