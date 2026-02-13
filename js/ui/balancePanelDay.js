// GlucoDefense — Balance panel per-day (level) tab definitions

import { LEVELS, getLevel } from '../levels/index.js';

// Adjustable per-day/level parameters
export const DAY_PARAMS = [
  { key: 'mineCount', label: 'Muscle Cells', min: 10, max: 30, step: 1 },
];

const STORAGE_PREFIX = 'glucodefense_balance_day_';

// Store original level defaults for reset
const dayDefaults = {};
for (const level of LEVELS) {
  dayDefaults[level.id] = { mineCount: level.mineCount };
}

export function getDayParamValue(dayId, key) {
  const level = getLevel(dayId);
  if (!level) return 0;
  return level[key] ?? 0;
}

export function setDayParamValue(dayId, key, val) {
  const level = getLevel(dayId);
  if (!level) return;
  level[key] = val;
}

export function getDayDefault(dayId, key) {
  const def = dayDefaults[dayId];
  if (!def) return 0;
  return def[key] ?? 0;
}

export function saveDayBalance(dayId) {
  const data = {};
  for (const param of DAY_PARAMS) {
    data[param.key] = getDayParamValue(dayId, param.key);
  }
  try {
    localStorage.setItem(STORAGE_PREFIX + dayId, JSON.stringify(data));
  } catch (_) { /* ignore */ }
}

export function loadDayBalance(dayId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + dayId);
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const param of DAY_PARAMS) {
      const val = data[param.key];
      if (typeof val === 'number' && !isNaN(val) && val >= param.min && val <= param.max) {
        setDayParamValue(dayId, param.key, val);
      }
    }
  } catch (_) { /* ignore */ }
}

export function resetDayBalance(dayId) {
  const def = dayDefaults[dayId];
  if (!def) return;
  const level = getLevel(dayId);
  if (!level) return;
  for (const key of Object.keys(def)) {
    level[key] = def[key];
  }
  try {
    localStorage.removeItem(STORAGE_PREFIX + dayId);
  } catch (_) { /* ignore */ }
}

export function copyDayBalance(dayId) {
  const level = getLevel(dayId);
  if (!level) return '';
  const lines = DAY_PARAMS.map(param => {
    const val = getDayParamValue(dayId, param.key);
    return `${param.label}: ${val}`;
  });
  return `GlucoDefense Balance \u2014 Day ${dayId}:\n${lines.join('\n')}`;
}

export function initDayBalances() {
  for (const level of LEVELS) {
    loadDayBalance(level.id);
  }
}
