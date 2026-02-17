// GlucoDefense — All constants and balancing numbers
// Units scaled to mg/dL: 1 peasant ≈ 1 mg/dL glucose

export const CONFIG = {
  // Canvas
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,

  // Map zones (road removed — glucose spreads along full shore height)
  SEA_X_END: 200,
  SHORE_X_END: 300,
  VILLAGE_X_END: 1100,

  // Shore spawn range (glucose spreads along full height)
  SHORE_SPAWN_Y_MIN: 60,
  SHORE_SPAWN_Y_MAX: 660,

  // Colors
  COLORS: {
    RED: '#E74C3C',
    RED_DARK: '#C0392B',
    BLUE: '#3498DB',
    BLUE_DARK: '#2980B9',
    GOLD: '#F1C40F',
    GOLD_DARK: '#D4AC0D',
    GREEN: '#27AE60',
    GREEN_DARK: '#1E8449',
    PURPLE: '#9B59B6',
    PURPLE_DARK: '#7D3C98',
    TEAL: '#1ABC9C',
    TEAL_DARK: '#16A085',
    ORANGE: '#F39C12',
    SEA: '#2980B9',
    SAND: '#F5CBA7',
    GRASS: '#82E0AA',
    DARK_BG: '#2C3E50',
    DARK_BG2: '#34495E',
    GRAY: '#7F8C8D',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
  },

  // Building positions (repositioned per medical accuracy layout)
  LIVER_POS: { x: 700, y: 650 },
  LIVER_SIZE: { w: 200, h: 200 },
  CASTLE_ROOF: { x: 620, y: 560, w: 160, h: 50 },

  PANCREAS_POS: { x: 750, y: 100 },
  PANCREAS_SIZE: { w: 120, h: 100 },

  KIDNEYS_POS: { x: 1050, y: 430 },
  KIDNEYS_RADIUS: 60,

  // Mines grid (3 cols × 3 rows = 9 mines, centered)
  MINES_GRID: {
    startX: 500,
    startY: 260,
    cols: 3,
    rows: 3,
    gapX: 110,
    gapY: 100,
  },
  MINE_SIZE: { w: 80, h: 60 },
  MINE_MAX_WORKERS: 5,
  MINE_EXERCISE_WORKERS: 10,
  MINE_TOTAL_COUNT: 9,
  MINE_HP: 80,
  MINE_REPAIR_TIME: 12,
  MINE_ENERGY_PER_WORKER: 0.50,

  // Speeds (px/sec)
  SPEED_VERY_FAST: 120,
  SPEED_FAST: 90,
  SPEED_MEDIUM: 60,
  SPEED_SLOW: 40,
  BOAT_SPEED: 80,

  // Peasant
  PEASANT_RADIUS: 4,
  REBEL_HP: 80,
  REBEL_HP_DECAY: 1.0,
  REBEL_BUILDING_DPS: 5,
  WORKER_LIFETIME: 30,

  // Priest
  PRIEST_CAST_TIME: 2,
  PRIEST_CAST_RADIUS: 50,
  PRIEST_RADIUS: 5,
  PRIEST_WAIT_TIMEOUT: 24,

  // Resistance by degradation level (0-4)
  RESISTANCE_BY_DEGRADATION: [0.95, 0.55, 0.40, 0.30, 0.20],

  // Pancreas (insulin — consumed on successful merge with glucose)
  PANCREAS_HP: 600,
  PANCREAS_AUTO_SPAWN_INTERVAL: [1.5, 2, 3, 5, 10],
  PANCREAS_MAX_PRIESTS: [35, 20, 12, 6, 3],
  // GSIS: glucose-stimulated insulin secretion (BG zones → spawn speed multiplier)
  PANCREAS_BG_STIM_ZONES: [
    { threshold: 0,   multiplier: 1.0 },
    { threshold: 140, multiplier: 1.4 },
    { threshold: 180, multiplier: 1.8 },
    { threshold: 250, multiplier: 2.2 },
  ],
  PANCREAS_BONUS_COST: 20,
  PANCREAS_BONUS_COUNT: 8,

  // Liver
  LIVER_MAX_KNIGHTS: 10,
  LIVER_KNIGHT_COST: 20,
  LIVER_AUTO_SPAWN_INTERVAL: 3,
  LIVER_BONUS_KNIGHT_COUNT: 8,
  LIVER_STORAGE: [200, 160, 120, 80, 50, 20],
  LIVER_RELEASE_THRESHOLD: 0.4,
  LIVER_RELEASE_RATE: 2,
  LIVER_OVERFLOW_THRESHOLD: 0.90,
  LIVER_RELEASE_THRESHOLD_BG: 100,
  LIVER_AUTO_RELEASE_INTERVAL: 2,
  LIVER_HGP_SENSITIVITY_CUTOFF: 0.85,  // if _insulinSensitivity < this → hepatic leak
  LIVER_HGP_RELEASE_CHANCE: 0.3,        // 30% chance per tick

  // Knight spawn positions (around liver at bottom)
  KNIGHT_POSITIONS: [
    { x: 600, y: 600 }, { x: 800, y: 600 },
    { x: 600, y: 650 }, { x: 800, y: 650 },
    { x: 600, y: 700 }, { x: 800, y: 700 },
    { x: 650, y: 580 }, { x: 750, y: 580 },
    { x: 650, y: 720 }, { x: 750, y: 720 },
    { x: 700, y: 560 }, { x: 700, y: 740 },
    { x: 560, y: 640 }, { x: 840, y: 640 },
    { x: 700, y: 680 },
  ],
  KNIGHT_SPEED: 30,
  KNIGHT_SCAN_RANGE: 500,
  KNIGHT_INTERCEPT_CHANCE: 0.35,

  // Kidneys
  KIDNEY_COOLDOWN: 20,
  KIDNEY_COST: 10,
  KIDNEY_VORTEX_MIN: 15,
  KIDNEY_VORTEX_MAX: 30,
  KIDNEY_ACTIVATION_THRESHOLD: 40,
  KIDNEY_CIRCLE_EXPAND_SPEED: 120,
  KIDNEY_CIRCLE_CONTRACT_SPEED: 150,
  KIDNEY_CIRCLE_ORIGIN: { x: 950, y: 430 },
  KIDNEY_EJECT_SPEED: 400,

  // Kidney auto-filtration (game-time based cooldown)
  KIDNEY_AUTO_COOLDOWN_HOURS: 3,         // 3 game hours between auto-flushes
  KIDNEY_AUTO_THRESHOLD: 180,            // BG threshold for auto-flush
  KIDNEY_MANUAL_FLUSH_COUNT: 10,         // BG units removed per manual click

  // Dapagliflozin (SGLT2 inhibitor)
  DAPAGLIFLOZIN_THRESHOLD: 120,          // lowered kidney threshold
  DAPAGLIFLOZIN_DURATION_HOURS: 2,       // 2 game hours
  DAPAGLIFLOZIN_COOLDOWN_SPEEDUP: 0.5,   // remaining cooldown × 0.5

  // Building HP
  LIVER_HP: 200,
  KIDNEY_HP: 150,
  BUILDING_REPAIR_TIME: 15,

  // Camera
  CAMERA_DEFAULT_ZOOM: 1.5,
  CAMERA_MIN_ZOOM: 1.0,
  CAMERA_MAX_ZOOM: 3.0,
  CAMERA_START_X: 200,
  CAMERA_START_Y: 50,

  // Sprite rendering
  SPRITE_SIZE_PEASANT: 32,
  SPRITE_SIZE_PRIEST: 36,
  SPRITE_FPS_DEFAULT: 8,
  SPRITE_FPS_WORKER: 5,
  SPRITE_FPS_REBEL: 10,
  SPRITE_FPS_PRIEST: 6,

  // Energy
  ENERGY_MAX: 300,
  ENERGY_START: 130,
  STARTING_WORKERS: 80,

  // Degradation thresholds
  REBELS_ATTACK_MINES: 20,
  REBELS_ATTACK_PANCREAS: 80,

  // Basal energy drain
  ENERGY_BASAL_DRAIN: 10,

  // Interventions
  FAST_INSULIN_COST: 60,
  FAST_INSULIN_COOLDOWN: 45,
  FAST_INSULIN_PRIESTS: 15,
  FAST_INSULIN_DURATION: 20,

  EXERCISE_COST: 70,
  EXERCISE_COOLDOWN: 60,
  EXERCISE_DURATION: 25,

  SEMAGLUTIDE_COST: 30,
  SEMAGLUTIDE_MINE_COUNT: 18,
  SEMAGLUTIDE_MINE_DURATION: 20,
  SEMAGLUTIDE_MINE_X_MIN: 300,
  SEMAGLUTIDE_MINE_X_MAX: 1200,
  SEMAGLUTIDE_MINE_Y_MIN: 50,
  SEMAGLUTIDE_MINE_Y_MAX: 700,

  DAPAGLIFLOZIN_COST: 20,
  DAPAGLIFLOZIN_VORTEX_COUNT: 40,

  METFORMIN_COST: 20,
  METFORMIN_DURATION: 40,
  METFORMIN_SPEED_BOOST: 0.3,

  WALK_COST: 20,
  WALK_COOLDOWN: 25,
  WALK_REBELS_MIN: 15,
  WALK_REBELS_MAX: 40,

  // Manual core actions (player-activated)
  MANUAL_PRIEST_COOLDOWN: 4,
  MANUAL_KNIGHT_COOLDOWN: 10,
  MANUAL_VORTEX_COOLDOWN: 20,
  MANUAL_RELEASE_COOLDOWN: 1.5,
  MANUAL_RELEASE_COUNT: 3,

  // Snack (replaces juice)
  SNACK_COOLDOWN: 30,
  SNACK_CHOCOLATE_FAST: 60,
  SNACK_CHOCOLATE_SLOW: 60,

  // BG zones (real mg/dL thresholds)
  BG_HYPO_DANGER: 54,
  BG_HYPO: 70,
  BG_NORMAL_LOW: 80,
  BG_NORMAL_HIGH: 140,
  BG_ELEVATED: 180,
  BG_HIGH: 250,
  BG_VERY_HIGH: 400,

  // Wave timing
  WAVE_INTERVAL: 60,

  // Day cycle: 7:00 to 24:00 (17 virtual hours)
  DAY_START_HOUR: 7,
  DAY_END_HOUR: 24,
  DAY_SPEED: 3.5,

  // Boat unload times
  UNLOAD_TIME_S: 5,
  UNLOAD_TIME_M: 10,
  UNLOAD_TIME_L: 15,

  // Muscle zone (whole green area — priests & knights hunt here)
  MUSCLE_ZONE: { x1: 300, y1: 50, x2: 1200, y2: 700 },

  // Waypoints (simplified — no road, just shore → advance → muscle)
  WAYPOINTS: {
    SHORE_X: 260,
    ADVANCE_X: 400,
  },

  // Boat
  BOAT_SPAWN: { x: -50, y: 380 },
  BOAT_DEST: { x: 250, y: 380 },
};
