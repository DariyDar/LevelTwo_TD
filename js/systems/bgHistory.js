// GlucoDefense — BG history tracking for graph and results screen

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { calculateBG } from './bgSystem.js';
import { getVirtualHour } from './waveManager.js';

const SAMPLE_INTERVAL = 2.0; // real seconds between BG samples (~154 samples for full day)

export function initBGHistory() {
  gameState.bgHistory = [];
  gameState.bgEventLog = [];
  gameState.bgSampleTimer = 0;
}

export function updateBGHistory(dt) {
  gameState.bgSampleTimer += dt;

  if (gameState.bgSampleTimer >= SAMPLE_INTERVAL) {
    gameState.bgSampleTimer -= SAMPLE_INTERVAL;

    const hour = getVirtualHour();
    const bg = calculateBG();
    gameState.bgHistory.push({ hour, bg });
  }
}

export function recordEvent(type, label) {
  const hour = getVirtualHour();
  gameState.bgEventLog.push({ hour, type, label });
}

export function getTimeInRange() {
  const history = gameState.bgHistory;
  let low = 0;
  let normal = 0;
  let high = 0;

  for (const s of history) {
    if (s.bg < CONFIG.BG_HYPO) {
      low++;
    } else if (s.bg <= CONFIG.BG_NORMAL_HIGH) {
      normal++;
    } else {
      high++;
    }
  }

  const total = history.length || 1;
  return {
    low: Math.round(100 * low / total),
    normal: Math.round(100 * normal / total),
    high: Math.round(100 * high / total),
  };
}
