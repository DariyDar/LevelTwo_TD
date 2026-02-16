// GlucoDefense — Planning mode UI (full-screen timeline editor)

import { CONFIG } from '../config.js';
import { gameState, GamePhase, fullReset } from '../gameState.js';
import { FOODS } from '../levels/foodData.js';
import { formatVirtualTime } from '../systems/waveManager.js';
import { getPatient } from '../patients/index.js';
import { updatePlanningTutorial, renderPlanningTutorial, isTutorialActive, advanceTutorial } from './tutorial.js';

let ctx = null;
let canvas = null;
let onStartDay = null;

// UI state
let selectedItem = null; // { type: 'food'|'intervention', key: string, dose?: number }
let dragItem = null;     // { type, index, startX }
let hoveredSlot = null;  // hour float or null
let scrollOffset = 0;    // food palette scroll

// Layout constants
const TIMELINE_Y = 100;
const TIMELINE_H = 90;
const FOOD_PALETTE_Y = 220;
const FOOD_ITEM_W = 76;
const FOOD_ITEM_H = 68;
const FOOD_GAP = 5;
const FOOD_COLS = 14; // items per row
const IV_PALETTE_Y = 560;
const START_HOUR = CONFIG.DAY_START_HOUR;
const END_HOUR = CONFIG.DAY_END_HOUR;
const MARGIN_L = 60;
const MARGIN_R = 60;

// Food categories for palette display
const FOOD_CATEGORIES = [
  { label: 'Fast (Unhealthy)', color: '#E74C3C', keys: ['burger', 'pizza', 'fries', 'muffin', 'cola', 'juice', 'chocolate', 'donut', 'iceCream', 'cookie', 'chips'] },
  { label: 'Medium', color: '#F1C40F', keys: ['rice', 'pasta', 'oatmeal', 'cereal', 'sandwich', 'banana', 'bread', 'apple', 'fruitSalad', 'milk', 'yogurt'] },
  { label: 'Slow (Healthy)', color: '#2ECC71', keys: ['stew', 'veggies', 'turkey', 'chicken', 'fish', 'salad', 'cheese', 'broccoli', 'eggs'] },
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

// Cached food item rects for click detection
let foodItemRects = [];
let ivItemRects = [];

// Returns true if the current day has hardcoded meals (read-only mode)
function isFixedMealsDay() {
  const patient = getPatient(gameState.currentPatientId);
  if (!patient) return false;
  const dayDef = patient.days.find(d => d.dayId === gameState.currentDay);
  return !!(dayDef && dayDef.fixedMeals);
}

// Pre-populate plan from fixedMeals when entering planning with fixed meals
function ensureFixedMealsPlan() {
  const patient = getPatient(gameState.currentPatientId);
  if (!patient) return;
  const dayDef = patient.days.find(d => d.dayId === gameState.currentDay);
  if (!dayDef || !dayDef.fixedMeals) return;

  const plan = ensurePlan();
  if (plan.meals.length === 0) {
    plan.meals = dayDef.fixedMeals.map(m => ({ ...m, executed: false }));
  }
  if (plan.interventions.length === 0 && dayDef.fixedInterventions) {
    plan.interventions = dayDef.fixedInterventions.map(iv => ({ ...iv, executed: false }));
  }
}

function getAvailableInterventions() {
  const patient = getPatient(gameState.currentPatientId);
  if (!patient) return ALL_INTERVENTION_TYPES;
  return ALL_INTERVENTION_TYPES.filter(iv => patient.availableInterventions.includes(iv.key));
}

function getUsedFoodKeys() {
  const plan = gameState.currentPlan;
  if (!plan) return new Set();
  const used = new Set();
  for (const meal of plan.meals) {
    for (const key of meal.foodKeys) {
      used.add(key);
    }
  }
  return used;
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
  const patientLabel = patient ? `${patient.emoji} ${patient.name} \u2014 Day ${gameState.currentDay}` : '';
  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PLAN YOUR DAY', W / 2, 35);

  if (patientLabel) {
    ctx.font = '14px Arial';
    ctx.fillStyle = patient ? patient.color : '#95A5A6';
    ctx.fillText(patientLabel, W / 2, 55);
  }

  // Day narrative (italic, below patient label)
  if (patient) {
    const dayDef = patient.days.find(d => d.dayId === gameState.currentDay);
    if (dayDef && dayDef.narrative) {
      ctx.font = 'italic 11px Arial';
      ctx.fillStyle = '#7F8C8D';
      ctx.fillText(dayDef.narrative.length > 120 ? dayDef.narrative.slice(0, 117) + '\u2026' : dayDef.narrative, W / 2, 72);
    }
  }

  const fixedMode = isFixedMealsDay();

  if (fixedMode) {
    ensureFixedMealsPlan();
    ctx.font = '12px Arial';
    ctx.fillStyle = '#7F8C8D';
    ctx.fillText('Meals are pre-set for this day. You can add interventions below.', W / 2, 90);
  } else {
    ctx.font = '12px Arial';
    ctx.fillStyle = '#95A5A6';
    ctx.fillText('Click food/intervention, then click timeline to place. Right-click timeline to remove.', W / 2, 90);
  }

  drawBackButton(C);
  drawTimeline(C, W);

  if (!fixedMode) {
    drawFoodPalette(C, W);
  }

  drawInterventionPalette(C, W);
  drawStartButton(C, W, H);

  // Selected item cursor indicator
  if (selectedItem) {
    drawSelectedIndicator(C, W);
  }

  // Tutorial overlay (planning-phase steps)
  updatePlanningTutorial();
  renderPlanningTutorial();
}

function drawBackButton(C) {
  const bb = backButtonRect;
  ctx.fillStyle = '#4A6274';
  ctx.strokeStyle = '#5D7A8C';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bb.x, bb.y, bb.w, bb.h, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('\u2190 Back', bb.x + bb.w / 2, bb.y + bb.h / 2 + 5);
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
  const mealRowY = TIMELINE_Y + 8;
  ctx.fillStyle = '#7F8C8D';
  ctx.font = '9px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Meals:', 10, mealRowY + 12);

  const fixedMeals = isFixedMealsDay();
  for (let i = 0; i < plan.meals.length; i++) {
    const meal = plan.meals[i];
    const mx = hourToX(meal.hour);
    const foods = meal.foodKeys.map(k => FOODS[k]).filter(Boolean);
    const emoji = foods.map(f => f.emoji).join('');
    const totalCount = foods.reduce((s, f) => s + f.count, 0);

    // Meal marker — fixed meals have a lock-style border
    ctx.fillStyle = fixedMeals ? 'rgba(241, 196, 15, 0.12)' : 'rgba(241, 196, 15, 0.2)';
    ctx.beginPath();
    ctx.roundRect(mx - 20, mealRowY, 40, 32, 4);
    ctx.fill();
    ctx.strokeStyle = fixedMeals ? '#8B7D3A' : '#F1C40F';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.WHITE;
    ctx.fillText(emoji, mx, mealRowY + 15);

    ctx.font = '8px Arial';
    ctx.fillStyle = '#F1C40F';
    ctx.fillText(`${totalCount}g`, mx, mealRowY + 26);

    ctx.fillStyle = '#7F8C8D';
    ctx.fillText(formatVirtualTime(meal.hour), mx, mealRowY - 2);
  }

  // Intervention row (lower half)
  const ivRowY = TIMELINE_Y + 48;
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
    ctx.roundRect(ix - 18, ivRowY, 36, 28, 4);
    ctx.fill();
    ctx.strokeStyle = '#3498DB';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.WHITE;
    ctx.fillText(def ? def.emoji : '?', ix, ivRowY + 14);

    ctx.font = '7px Arial';
    ctx.fillStyle = '#3498DB';
    ctx.fillText(def ? def.label : iv.type, ix, ivRowY + 23);
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
  const usedKeys = getUsedFoodKeys();
  foodItemRects = [];

  let curY = FOOD_PALETTE_Y;

  for (const category of FOOD_CATEGORIES) {
    // Category label
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = category.color;
    ctx.textAlign = 'left';
    ctx.fillText(category.label, 20, curY);
    curY += 6;

    let col = 0;
    for (const key of category.keys) {
      const f = FOODS[key];
      if (!f) continue;

      const cx = 20 + col * (FOOD_ITEM_W + FOOD_GAP);
      const isUsed = usedKeys.has(key);
      const isSelected = selectedItem && selectedItem.type === 'food' && selectedItem.key === key;

      // Item background
      if (isUsed) {
        ctx.fillStyle = 'rgba(30, 30, 40, 0.5)';
        ctx.strokeStyle = '#2C3E50';
      } else if (isSelected) {
        ctx.fillStyle = 'rgba(241, 196, 15, 0.3)';
        ctx.strokeStyle = '#F1C40F';
      } else {
        ctx.fillStyle = 'rgba(40, 50, 70, 0.8)';
        ctx.strokeStyle = '#3D5A6E';
      }
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(cx, curY, FOOD_ITEM_W, FOOD_ITEM_H, 5);
      ctx.fill();
      ctx.stroke();

      // Emoji
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = isUsed ? 'rgba(255,255,255,0.3)' : C.WHITE;
      ctx.fillText(f.emoji, cx + FOOD_ITEM_W / 2, curY + 25);

      // Name
      ctx.font = '9px Arial';
      ctx.fillStyle = isUsed ? '#4A5568' : '#BDC3C7';
      const shortName = f.name.length > 11 ? f.name.substring(0, 10) + '\u2026' : f.name;
      ctx.fillText(shortName, cx + FOOD_ITEM_W / 2, curY + 40);

      // Count + speed indicator
      ctx.font = '10px Arial';
      if (isUsed) {
        ctx.fillStyle = '#5D6D7E';
        ctx.fillText('Used', cx + FOOD_ITEM_W / 2, curY + 55);
      } else {
        ctx.fillStyle = f.speed === 'fast' || f.speed === 'very_fast' ? '#E74C3C' :
                        f.speed === 'slow' ? '#2ECC71' : '#F1C40F';
        ctx.fillText(`${f.count}g`, cx + FOOD_ITEM_W / 2, curY + 55);
      }

      foodItemRects.push({ x: cx, y: curY, w: FOOD_ITEM_W, h: FOOD_ITEM_H, key, used: isUsed });

      col++;
      if (col >= FOOD_COLS) {
        col = 0;
        curY += FOOD_ITEM_H + FOOD_GAP;
      }
    }

    // Move to next row after category
    if (col > 0) {
      curY += FOOD_ITEM_H + FOOD_GAP;
      col = 0;
    }
    curY += 4; // gap between categories
  }
}

function drawInterventionPalette(C, W) {
  ivItemRects = [];

  // Move intervention palette up if food palette is hidden (fixed meals mode)
  const palY = isFixedMealsDay() ? 240 : IV_PALETTE_Y;

  ctx.fillStyle = C.WHITE;
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Interventions:', 20, palY - 8);

  const itemW = 100;
  const itemH = 42;
  const gap = 6;
  let cx = 20;

  const availableIVs = getAvailableInterventions();
  for (const iv of availableIVs) {
    const isSelected = selectedItem && selectedItem.type === 'intervention' && selectedItem.key === iv.key;

    ctx.fillStyle = isSelected ? 'rgba(52, 152, 219, 0.3)' : 'rgba(40, 50, 70, 0.8)';
    ctx.strokeStyle = isSelected ? '#3498DB' : '#3D5A6E';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(cx, palY, itemW, itemH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.font = '15px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.WHITE;
    ctx.fillText(`${iv.emoji} ${iv.label}`, cx + itemW / 2, palY + 27);

    ivItemRects.push({ x: cx, y: palY, w: itemW, h: itemH, iv });

    cx += itemW + gap;
  }
}

function drawStartButton(C, W, H) {
  const plan = ensurePlan();
  const btnW = 180;
  const btnH = 44;
  const btnX = W / 2 - btnW / 2;
  const btnY = H - 55;

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
const backButtonRect = { x: 20, y: 10, w: 80, h: 36 };

function drawSelectedIndicator(C, W) {
  const text = selectedItem.type === 'food'
    ? `Selected: ${FOODS[selectedItem.key]?.emoji || ''} ${FOODS[selectedItem.key]?.name || ''} \u2014 click timeline to place`
    : `Selected: ${selectedItem.key} \u2014 click timeline to place`;

  ctx.font = '12px Arial';
  ctx.fillStyle = '#F1C40F';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, TIMELINE_Y + TIMELINE_H + 15);
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

  // Tutorial overlay consumes clicks while active
  if (isTutorialActive()) {
    advanceTutorial();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
  const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  // Check back button
  const bb = backButtonRect;
  if (mx >= bb.x && mx <= bb.x + bb.w && my >= bb.y && my <= bb.y + bb.h) {
    fullReset();
    gameState.phase = GamePhase.MENU;
    selectedItem = null;
    hoveredSlot = null;
    dragItem = null;
    scrollOffset = 0;
    return;
  }

  const plan = ensurePlan();

  // Check start button
  const sb = startButtonRect;
  if (mx >= sb.x && mx <= sb.x + sb.w && my >= sb.y && my <= sb.y + sb.h) {
    if (onStartDay) onStartDay();
    return;
  }

  const fixedMode = isFixedMealsDay();

  // Check timeline click (place selected item)
  if (selectedItem && my >= TIMELINE_Y && my <= TIMELINE_Y + TIMELINE_H && mx >= MARGIN_L && mx <= CONFIG.CANVAS_WIDTH - MARGIN_R) {
    const hour = xToHour(mx);
    if (hour >= START_HOUR && hour <= END_HOUR) {
      if (selectedItem.type === 'food') {
        // Block food placement in fixed meals mode
        if (fixedMode) return;

        // Single-use check: skip if already used in plan
        const usedKeys = getUsedFoodKeys();
        if (usedKeys.has(selectedItem.key)) return;

        // Add food to an existing meal at this time, or create new meal
        const existingMeal = plan.meals.find(m => Math.abs(m.hour - hour) < 0.25);
        if (existingMeal) {
          existingMeal.foodKeys.push(selectedItem.key);
        } else {
          plan.meals.push({ foodKeys: [selectedItem.key], hour, executed: false });
          plan.meals.sort((a, b) => a.hour - b.hour);
        }
        // Deselect after placing (since it's single-use)
        selectedItem = null;
      } else if (selectedItem.type === 'intervention') {
        plan.interventions.push({
          type: selectedItem.key,
          hour,
          dose: selectedItem.dose,
          executed: false,
        });
        plan.interventions.sort((a, b) => a.hour - b.hour);
        // Keep selected for rapid placement (interventions can repeat)
      }
      return;
    }
  }

  // Check food palette click (hidden in fixed meals mode, but guard anyway)
  if (!fixedMode) {
    for (const fr of foodItemRects) {
      if (fr.used) continue; // Can't select used foods
      if (mx >= fr.x && mx <= fr.x + fr.w && my >= fr.y && my <= fr.y + fr.h) {
        selectedItem = { type: 'food', key: fr.key };
        return;
      }
    }
  }

  // Check intervention palette click
  for (const ir of ivItemRects) {
    if (mx >= ir.x && mx <= ir.x + ir.w && my >= ir.y && my <= ir.y + ir.h) {
      selectedItem = { type: 'intervention', key: ir.iv.key, dose: ir.iv.dose };
      return;
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
    const ivRowY = TIMELINE_Y + 48;

    if (my < ivRowY) {
      // Block meal removal in fixed meals mode
      if (isFixedMealsDay()) return;

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
