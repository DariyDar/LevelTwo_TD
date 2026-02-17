// GlucoDefense — Blood Glucose calculation

import { CONFIG } from '../config.js';
import { gameState } from '../gameState.js';
import { PeasantState } from '../entities/Peasant.js';

export function calculateBG() {
  let count = 0;

  for (const p of gameState.peasants) {
    if (!p.alive) continue;

    // Workers count with decaying contribution (glucose being consumed in cell)
    if (p.state === PeasantState.WORKER) {
      const fraction = p.workHp / CONFIG.WORKER_LIFETIME;
      count += Math.max(0, fraction);
      continue;
    }

    // FILTERING counts (still in bloodstream until excreted)
    if (p.state === PeasantState.FILTERING) {
      count++;
      continue;
    }

    // Count: rebels + peasants walking + waiting + being converted + walking to mine
    if (p.state === PeasantState.REBEL ||
        p.state === PeasantState.WALKING_TO_VILLAGE ||
        p.state === PeasantState.WAITING_FOR_PRIEST ||
        p.state === PeasantState.BEING_CONVERTED ||
        p.state === PeasantState.WALKING_TO_MINE) {
      count++;
    }
    // Do NOT count BEING_ESCORTED (in transit to liver) or LEAVING
  }

  // Liver storage adds a fraction to BG (hepatic glucose output)
  if (gameState.liverTower) {
    count += gameState.liverTower.storage * 0.15;
  }

  // Scale: each peasant unit represents GLUCOSE_PER_UNIT mg/dL
  count *= CONFIG.GLUCOSE_PER_UNIT;

  // Round to integer for display
  count = Math.round(count);

  // Track peak
  if (count > gameState.stats.peakBG) {
    gameState.stats.peakBG = count;
  }

  return count;
}

export function getBGColor(bg) {
  // Bidirectional: too low AND too high are both dangerous
  // Low side
  if (bg < CONFIG.BG_HYPO_DANGER) return CONFIG.COLORS.RED;       // <54 severe hypo
  if (bg < CONFIG.BG_HYPO) return '#E67E22';                       // 54-70 hypo (orange)
  if (bg < CONFIG.BG_NORMAL_LOW) return CONFIG.COLORS.GOLD;        // 70-80 low-normal (yellow)
  // Normal range
  if (bg <= CONFIG.BG_NORMAL_HIGH) return '#2ECC71';               // 80-140 normal (green)
  // High side
  if (bg <= CONFIG.BG_ELEVATED) return CONFIG.COLORS.GOLD;         // 140-180 elevated (yellow)
  if (bg <= CONFIG.BG_HIGH) return '#E67E22';                      // 180-250 high (orange)
  return CONFIG.COLORS.RED;                                         // >250 very high (red)
}

// Get BG zone label for display
export function getBGLabel(bg) {
  if (bg < CONFIG.BG_HYPO_DANGER) return 'SEVERE HYPO';
  if (bg < CONFIG.BG_HYPO) return 'Hypoglycemia';
  if (bg < CONFIG.BG_NORMAL_LOW) return 'Low';
  if (bg <= CONFIG.BG_NORMAL_HIGH) return 'Normal';
  if (bg <= CONFIG.BG_ELEVATED) return 'Elevated';
  if (bg <= CONFIG.BG_HIGH) return 'High';
  return 'DANGER';
}
