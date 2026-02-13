// GlucoDefense — Planning mode UI (full-screen timeline editor)

import { CONFIG } from '../config.js';
import { gameState, GamePhase } from '../gameState.js';
import { FOODS } from '../levels/foodData.js';
import { formatVirtualTime } from '../systems/waveManager.js';
import { getPatient } from '../patients/index.js';

let ctx = null;
let canvas = null;
let onStartDay = null;

// UI state
let selectedItem = null; // { type: 'food'|'intervention', key: string, dose?: number }
let dragItem = null;     // { type, index, startX }
let hoveredSlot = null;  // hour float or null
let scrollOffset = 0;    // food palette scroll

// Layout constants
const TIMELINE_Y = 160;
const TIMELINE_H = 100;
const FOOD_PALETTE_Y = 300;
const IV_PALETTE_Y = 440;
const START_HOUR = CONFIG.DAY_START_HOUR;
const END_HOUR = CONFIG.DAY_END_HOUR;
const MARGIN_L = 60;
const MARGIN_R = 60;

// Food categories for palette display
const FOOD_CATEGORIES = [
  { label: 'Unhealthy (Fast)', keys: ['burger', 'pizza', 'fries', 'muffin', 'cola', 'juice', 'chocolate', 'donut', 'iceCream', 'cookie', 'chips'] },
  { label: 'Medium', keys: ['rice', 'pasta', 'oatmeal', 'cereal', 'sandwich', 'banana', 'bread', 'apple', 'fruitSalad', 'milk', 'yogurt'] },
  { label: 'Healthy (Slow)', keys: ['stew', 'veggies', 'turkey', 'chicken', 'fish', 'salad', 'cheese', 'broccoli', 'eggs'] },
];

// All intervention types (filtered by patient's availableInterventions)
const ALL_INTERVENTION_TYPES = [
  { key: 'walk', label: 'Walk', emoji: '\u{1F6B6}' },
  { key: 'exercise', label: 'Training', emoji: '\u{1F3CB}' },
  { key: 'insulin', label: 'Insulin 10u', emoji: '\u{1F489}', dose: 10 },
  { key: 'semaglutide', label: 'Semaglutide', emoji: '\u{1F48A}' },
  { key: 'metformin', label: 'Metformin', emoji: '\u{1F48A}' },
  { key: 'dapagliflozin', label: 'SGLT2', emoji: '\u{1F9EA}' },
];

function getAvailableInterventions() {
  const patient = getPatient(gameState.currentPatientId);
  if (!patient) return ALL_INTERVENTION_TYPES;
  return ALL_INTERVENTION_TYPES.filter(iv => patient.availableInterventions.includes(iv.key));
}

export function initPlanningMode(canvasEl, context, startDayCallback) {
  canvas = canvasEl;
  ctx = context;
  onStartDay = startDayCallback;

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('contextmenu', handleRightClick);
}

export function renderPlanningMode() {
  if (gameState.phase !== GamePhase.PLANNING) return;

  const C = CONFIG.COLORS;
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;

  // Full screen background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  // Title with patient info
  const patient = getPatient(gameState.currentPatientId);
  const patientLabel = patient ? `${patient.emoji} ${patient.name} — Day ${gameState.currentDay}` : '';
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PLAN YOUR DAY', W / 2, 40);

  if (patientLabel) {
    ctx.font = '15px Arial';
    ctx.fillStyle = patient ? patient.color : '#95A5A6';
    ctx.fillText(patientLabel, W / 2, 65);
  }

  ctx.font = '13px Arial';
  ctx.fillStyle = '#95A5A6';
  ctx.fillText('Click a food/intervention below, then click on the timeline to place it. Right-click to remove.', W / 2, 85);

  drawTimeline(C, W);
  drawFoodPalette(C, W);
  drawInterventionPalette(C, W);
  drawStartButton(C, W, H);

  // Selected item cursor indicator
  if (selectedItem) {
    drawSelectedIndicator(C, W);
  }
}

function hourToX(hour) {
  const graphW = CONFIG.CANVAS_WIDTH - MARGIN_L - MARGIN_R;
  return MARGIN_L + ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * graphW;
}

function xToHour(x) {
  const graphW = CONFIG.CANVAS_WIDTH - MARGIN_L - MARGIN_R;
  const pct = (x - MARGIN_L) / graphW;
  const hour = START_HOUR + pct * (END_HOUR - START_HOUR);
  // Snap to 15-minute intervals
  return Math.round(hour * 4) / 4;
}

function drawTimeline(C, W) {
  const plan = ensurePlan();
  const graphW = W - MARGIN_L - MARGIN_R;

  // Timeline background
  ctx.fillStyle = 'rgba(30, 35, 50, 0.8)';
  ctx.beginPath();
  ctx.roundRect(MARGIN_L - 10, TIMELINE_Y - 10, graphW + 20, TIMELINE_H + 20, 6);
  ctx.fill();

  // Hour grid lines + labels
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    const x = hourToX(h);
    const isMain = h % 2 === 0;

    ctx.strokeStyle = isMain ? '#3D5A6E' : '#2A3A4E';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, TIMELINE_Y);
    ctx.lineTo(x, TIMELINE_Y + TIMELINE_H);
    ctx.stroke();

    if (isMain) {
      ctx.fillStyle = '#95A5A6';
      ctx.fillText(`${h}:00`, x, TIMELINE_Y - 3);
    }
  }

  // Meal row (upper half)
  const mealRowY = TIMELINE_Y + 10;
  ctx.fillStyle = '#7F8C8D';
  ctx.font = '9px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Meals:', 10, mealRowY + 12);

  for (let i = 0; i < plan.meals.length; i++) {
    const meal = plan.meals[i];
    const mx = hourToX(meal.hour);
    const foods = meal.foodKeys.map(k => FOODS[k]);
    const emoji = foods.map(f => f.emoji).join('');
    const totalCount = foods.reduce((s, f) => s + f.count, 0);

    // Meal marker
    ctx.fillStyle = 'rgba(241, 196, 15, 0.2)';
    ctx.beginPath();
    ctx.roundRect(mx - 20, mealRowY, 40, 35, 4);
    ctx.fill();
    ctx.strokeStyle = '#F1C40F';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.WHITE;
    ctx.fillText(emoji, mx, mealRowY + 16);

    ctx.font = '8px Arial';
    ctx.fillStyle = '#F1C40F';
    ctx.fillText(`${totalCount}g`, mx, mealRowY + 28);

    ctx.fillStyle = '#7F8C8D';
    ctx.fillText(formatVirtualTime(meal.hour), mx, mealRowY - 2);
  }

  // Intervention row (lower half)
  const ivRowY = TIMELINE_Y + 55;
  ctx.fillStyle = '#7F8C8D';
  ctx.font = '9px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Actions:', 10, ivRowY + 12);

  for (let i = 0; i < plan.interventions.length; i++) {
    const iv = plan.interventions[i];
    const ix = hourToX(iv.hour);
    const def = ALL_INTERVENTION_TYPES.find(t => t.key === iv.type);

    ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
    ctx.beginPath();
    ctx.roundRect(ix - 18, ivRowY, 36, 30, 4);
    ctx.fill();
    ctx.strokeStyle = '#3498DB';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.WHITE;
    ctx.fillText(def ? def.emoji : '?', ix, ivRowY + 15);

    ctx.font = '7px Arial';
    ctx.fillStyle = '#3498DB';
    ctx.fillText(def ? def.label : iv.type, ix, ivRowY + 25);
  }

  // Hover indicator
  if (hoveredSlot !== null && selectedItem) {
    const hx = hourToX(hoveredSlot);
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(hx, TIMELINE_Y);
    ctx.lineTo(hx, TIMELINE_Y + TIMELINE_H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '10px Arial';
    ctx.fillStyle = '#F1C40F';
    ctx.textAlign = 'center';
    ctx.fillText(formatVirtualTime(hoveredSlot), hx, TIMELINE_Y + TIMELINE_H + 12);
  }
}

function drawFoodPalette(C, W) {
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Food Palette:', 20, FOOD_PALETTE_Y - 10);

  let cx = 20;
  const itemW = 52;
  const itemH = 55;
  const gap = 4;

  for (const category of FOOD_CATEGORIES) {
    // Category label
    ctx.font = '8px Arial';
    ctx.fillStyle = '#7F8C8D';
    ctx.textAlign = 'left';

    for (const key of category.keys) {
      const f = FOODS[key];
      if (!f) continue;
      if (cx + itemW > W - 20) {
        cx = 20;
      }

      const isSelected = selectedItem && selectedItem.type === 'food' && selectedItem.key === key;

      ctx.fillStyle = isSelected ? 'rgba(241, 196, 15, 0.3)' : 'rgba(40, 50, 70, 0.8)';
      ctx.strokeStyle = isSelected ? '#F1C40F' : '#3D5A6E';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx, FOOD_PALETTE_Y, itemW, itemH, 4);
      ctx.fill();
      ctx.stroke();

      // Emoji
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = C.WHITE;
      ctx.fillText(f.emoji, cx + itemW / 2, FOOD_PALETTE_Y + 22);

      // Name
      ctx.font = '7px Arial';
      ctx.fillStyle = '#BDC3C7';
      ctx.fillText(f.name.substring(0, 10), cx + itemW / 2, FOOD_PALETTE_Y + 35);

      // Count
      ctx.font = '8px Arial';
      ctx.fillStyle = f.speed === 'fast' || f.speed === 'very_fast' ? '#E74C3C' :
                      f.speed === 'slow' ? '#2ECC71' : '#F1C40F';
      ctx.fillText(`${f.count}g`, cx + itemW / 2, FOOD_PALETTE_Y + 47);

      cx += itemW + gap;
    }

    cx += gap * 3; // Extra gap between categories
  }
}

function drawInterventionPalette(C, W) {
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Interventions:', 20, IV_PALETTE_Y - 10);

  const itemW = 90;
  const itemH = 40;
  const gap = 6;
  let cx = 20;

  const availableIVs = getAvailableInterventions();
  for (const iv of availableIVs) {
    const isSelected = selectedItem && selectedItem.type === 'intervention' && selectedItem.key === iv.key;

    ctx.fillStyle = isSelected ? 'rgba(52, 152, 219, 0.3)' : 'rgba(40, 50, 70, 0.8)';
    ctx.strokeStyle = isSelected ? '#3498DB' : '#3D5A6E';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx, IV_PALETTE_Y, itemW, itemH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.WHITE;
    ctx.fillText(`${iv.emoji} ${iv.label}`, cx + itemW / 2, IV_PALETTE_Y + 25);

    cx += itemW + gap;
  }
}

function drawStartButton(C, W, H) {
  const plan = ensurePlan();
  const btnW = 180;
  const btnH = 44;
  const btnX = W / 2 - btnW / 2;
  const btnY = H - 60;

  const hasMeals = plan.meals.length > 0;

  ctx.fillStyle = hasMeals ? '#2E7D32' : '#4A6274';
  ctx.strokeStyle = hasMeals ? '#4CAF50' : '#5D7A8C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Start Day \u25B6', btnX + btnW / 2, btnY + btnH / 2 + 6);

  // Store rect for click detection
  startButtonRect.x = btnX;
  startButtonRect.y = btnY;
  startButtonRect.w = btnW;
  startButtonRect.h = btnH;
}

const startButtonRect = { x: 0, y: 0, w: 0, h: 0 };

function drawSelectedIndicator(C, W) {
  const text = selectedItem.type === 'food'
    ? `Selected: ${FOODS[selectedItem.key]?.emoji || ''} — click timeline to place`
    : `Selected: ${selectedItem.key} — click timeline to place`;

  ctx.font = '12px Arial';
  ctx.fillStyle = '#F1C40F';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, TIMELINE_Y + TIMELINE_H + 28);
}

function ensurePlan() {
  if (!gameState.currentPlan) {
    gameState.currentPlan = {
      levelId: gameState.level,
      meals: [],
      interventions: [],
    };
  }
  return gameState.currentPlan;
}

function handleClick(e) {
  if (gameState.phase !== GamePhase.PLANNING) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const plan = ensurePlan();

  // Check start button
  const sb = startButtonRect;
  if (mx >= sb.x && mx <= sb.x + sb.w && my >= sb.y && my <= sb.y + sb.h) {
    if (onStartDay) onStartDay();
    return;
  }

  // Check timeline click (place selected item)
  if (selectedItem && my >= TIMELINE_Y && my <= TIMELINE_Y + TIMELINE_H && mx >= MARGIN_L && mx <= CONFIG.CANVAS_WIDTH - MARGIN_R) {
    const hour = xToHour(mx);
    if (hour >= START_HOUR && hour <= END_HOUR) {
      if (selectedItem.type === 'food') {
        // Add food to an existing meal at this time, or create new meal
        const existingMeal = plan.meals.find(m => Math.abs(m.hour - hour) < 0.25);
        if (existingMeal) {
          existingMeal.foodKeys.push(selectedItem.key);
        } else {
          plan.meals.push({ foodKeys: [selectedItem.key], hour, executed: false });
          // Sort by time
          plan.meals.sort((a, b) => a.hour - b.hour);
        }
      } else if (selectedItem.type === 'intervention') {
        plan.interventions.push({
          type: selectedItem.key,
          hour,
          dose: selectedItem.dose,
          executed: false,
        });
        plan.interventions.sort((a, b) => a.hour - b.hour);
      }
      // Keep selected for rapid placement
      return;
    }
  }

  // Check food palette click
  if (my >= FOOD_PALETTE_Y && my <= FOOD_PALETTE_Y + 55) {
    const itemW = 52;
    const gap = 4;
    let cx = 20;

    for (const category of FOOD_CATEGORIES) {
      for (const key of category.keys) {
        if (!FOODS[key]) continue; // Skip missing foods (match rendering)
        if (mx >= cx && mx <= cx + itemW) {
          selectedItem = { type: 'food', key };
          return;
        }
        cx += itemW + gap;
      }
      cx += gap * 3;
    }
  }

  // Check intervention palette click
  if (my >= IV_PALETTE_Y && my <= IV_PALETTE_Y + 40) {
    const itemW = 90;
    const gap = 6;
    let cx = 20;

    const clickableIVs = getAvailableInterventions();
    for (const iv of clickableIVs) {
      if (mx >= cx && mx <= cx + itemW) {
        selectedItem = { type: 'intervention', key: iv.key, dose: iv.dose };
        return;
      }
      cx += itemW + gap;
    }
  }

  // Clicking elsewhere deselects
  selectedItem = null;
}

function handleMouseMove(e) {
  if (gameState.phase !== GamePhase.PLANNING) return;

  const rect = canvas.getBoundingClientRect();
  const sx = CONFIG.CANVAS_WIDTH / rect.width;
  const sy = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * sx;
  const my = (e.clientY - rect.top) * sy;

  gameState.mouseX = mx;
  gameState.mouseY = my;

  // Update hovered time slot
  if (my >= TIMELINE_Y && my <= TIMELINE_Y + TIMELINE_H && mx >= MARGIN_L && mx <= CONFIG.CANVAS_WIDTH - MARGIN_R) {
    hoveredSlot = xToHour(mx);
  } else {
    hoveredSlot = null;
  }
}

function handleRightClick(e) {
  if (gameState.phase !== GamePhase.PLANNING) return;
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleYVal = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleYVal;

  const plan = ensurePlan();

  // Right-click on timeline removes nearest item
  if (my >= TIMELINE_Y && my <= TIMELINE_Y + TIMELINE_H) {
    const hour = xToHour(mx);
    const mealRowY = TIMELINE_Y + 10;
    const ivRowY = TIMELINE_Y + 55;

    if (my < ivRowY) {
      // Remove nearest meal
      let closest = -1;
      let closestDist = Infinity;
      for (let i = 0; i < plan.meals.length; i++) {
        const dist = Math.abs(plan.meals[i].hour - hour);
        if (dist < closestDist && dist < 0.5) {
          closestDist = dist;
          closest = i;
        }
      }
      if (closest >= 0) {
        plan.meals.splice(closest, 1);
      }
    } else {
      // Remove nearest intervention
      let closest = -1;
      let closestDist = Infinity;
      for (let i = 0; i < plan.interventions.length; i++) {
        const dist = Math.abs(plan.interventions[i].hour - hour);
        if (dist < closestDist && dist < 0.5) {
          closestDist = dist;
          closest = i;
        }
      }
      if (closest >= 0) {
        plan.interventions.splice(closest, 1);
      }
    }
  }
}
