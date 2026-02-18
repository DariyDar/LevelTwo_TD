// GlucoDefense — All constants and balancing numbers
// Units scaled: 1 peasant = 5 mg/dL glucose (GLUCOSE_PER_UNIT)

export const CONFIG = {
  // Glucose scaling: each peasant entity represents this many mg/dL
  GLUCOSE_PER_UNIT: 5,

  // Canvas
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,

  // Map zones (road removed — glucose spreads along full shore height)
  SEA_X_END: 200,
  SHORE_X_END: 300,
  VILLAGE_X_END: 1100,

  // Shore spawn range (glucose spreads along full height, below graph)
  SHORE_SPAWN_Y_MIN: 160,
  SHORE_SPAWN_Y_MAX: 700,

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

  // Building positions — right column layout (pancreas top, kidney mid, liver bottom)
  // Pancreas sprite: 192x320 → sprH = w*(320/192). Kidney tower: 128x256 → sprH = sprW*(256/128)
  // Liver castle: 320x256 → sprH = w*(256/320). All shifted below BG graph (y>150)
  PANCREAS_POS: { x: 1100, y: 190 },
  PANCREAS_SIZE: { w: 96, h: 96 },

  KIDNEYS_POS: { x: 1100, y: 350 },
  KIDNEYS_RADIUS: 27,

  LIVER_POS: { x: 1020, y: 540 },
  LIVER_SIZE: { w: 280, h: 224 },
  CASTLE_ROOF: { x: 920, y: 510, w: 180, h: 40 },

  // Mines grid (2 cols × 5 rows = 10 mines, center area)
  MINES_GRID: {
    startX: 560,
    startY: 240,
    cols: 2,
    rows: 5,
    gapX: 130,
    gapY: 95,
  },
  MINE_SIZE: { w: 90, h: 65 },
  MINE_MAX_WORKERS: 10,
  MINE_WALK_WORKERS: 12,
  MINE_EXERCISE_WORKERS: 20,
  MINE_TOTAL_COUNT: 10,
  MINE_HP: 80,
  MINE_REPAIR_TIME: 12,
  MINE_ENERGY_PER_WORKER: 0.75,

  // Speeds (px/sec)
  SPEED_VERY_FAST: 120,
  SPEED_FAST: 90,
  SPEED_MEDIUM: 60,
  SPEED_SLOW: 40,
  BOAT_SPEED: 80,

  // Peasant
  PEASANT_RADIUS: 8,
  REBEL_HP: 80,
  REBEL_HP_DECAY: 1.0,
  REBEL_BUILDING_DPS: 5,
  WORKER_LIFETIME: 30,

  // Priest
  PRIEST_CAST_TIME: 2,
  PRIEST_CAST_RADIUS: 50,
  PRIEST_RADIUS: 10,
  PRIEST_WAIT_TIMEOUT: 24,

  // Resistance by degradation level (0-4)
  RESISTANCE_BY_DEGRADATION: [0.95, 0.55, 0.40, 0.30, 0.20],

  // Pancreas (insulin — consumed on successful merge with glucose)
  PANCREAS_HP: 600,
  PANCREAS_AUTO_SPAWN_INTERVAL: [1.5, 2, 3, 5, 10],
  PANCREAS_MAX_PRIESTS: [6, 4, 3, 2, 1],
  // GSIS: glucose-stimulated insulin secretion (BG zones → spawn speed multiplier)
  PANCREAS_BG_STIM_ZONES: [
    { threshold: 0,   multiplier: 1.0 },
    { threshold: 140, multiplier: 1.4 },
    { threshold: 180, multiplier: 1.8 },
    { threshold: 250, multiplier: 2.2 },
  ],
  PANCREAS_BONUS_COST: 20,
  PANCREAS_BONUS_COUNT: 3,

  // Liver
  LIVER_MAX_KNIGHTS: 3,
  LIVER_KNIGHT_COST: 20,
  LIVER_AUTO_SPAWN_INTERVAL: 3,
  LIVER_BONUS_KNIGHT_COUNT: 3,
  LIVER_STORAGE: [40, 32, 24, 16, 10, 4],
  LIVER_RELEASE_THRESHOLD: 0.4,
  LIVER_RELEASE_RATE: 1,
  LIVER_OVERFLOW_THRESHOLD: 0.90,
  LIVER_RELEASE_THRESHOLD_BG: 100,
  LIVER_AUTO_RELEASE_INTERVAL: 2,
  LIVER_HGP_SENSITIVITY_CUTOFF: 0.85,  // if _insulinSensitivity < this → hepatic leak
  LIVER_HGP_RELEASE_CHANCE: 0.3,        // 30% chance per tick

  // Knight spawn positions (patrol area left of liver castle)
  KNIGHT_POSITIONS: [
    { x: 800, y: 460 }, { x: 800, y: 520 },
    { x: 800, y: 580 }, { x: 820, y: 480 },
    { x: 820, y: 550 }, { x: 780, y: 490 },
    { x: 780, y: 560 }, { x: 760, y: 520 },
    { x: 830, y: 440 }, { x: 830, y: 600 },
    { x: 770, y: 470 }, { x: 770, y: 580 },
    { x: 750, y: 520 }, { x: 810, y: 520 },
    { x: 790, y: 500 },
  ],
  KNIGHT_SPEED: 360,
  KNIGHT_SCAN_RANGE: 500,
  KNIGHT_INTERCEPT_CHANCE: 0.35,

  // Kidneys
  KIDNEY_COOLDOWN: 20,
  KIDNEY_COST: 10,
  KIDNEY_VORTEX_MIN: 3,
  KIDNEY_VORTEX_MAX: 6,
  KIDNEY_ACTIVATION_THRESHOLD: 8,
  KIDNEY_CIRCLE_EXPAND_SPEED: 120,
  KIDNEY_CIRCLE_CONTRACT_SPEED: 150,
  KIDNEY_CIRCLE_ORIGIN: { x: 1000, y: 350 },
  KIDNEY_EJECT_SPEED: 400,

  // Kidney auto-filtration (game-time based cooldown)
  KIDNEY_AUTO_COOLDOWN_HOURS: 3,         // 3 game hours between auto-flushes
  KIDNEY_AUTO_THRESHOLD: 180,            // BG threshold for auto-flush
  KIDNEY_MANUAL_FLUSH_COUNT: 2,          // peasant units removed per manual click

  // Dapagliflozin (SGLT2 inhibitor)
  DAPAGLIFLOZIN_THRESHOLD: 120,          // lowered kidney threshold
  DAPAGLIFLOZIN_DURATION_HOURS: 2,       // 2 game hours
  DAPAGLIFLOZIN_COOLDOWN_SPEEDUP: 0.5,   // remaining cooldown × 0.5

  // Building HP
  LIVER_HP: 200,
  KIDNEY_HP: 150,
  BUILDING_REPAIR_TIME: 15,

  // Camera
  CAMERA_DEFAULT_ZOOM: 1.0,
  CAMERA_MIN_ZOOM: 1.0,
  CAMERA_MAX_ZOOM: 3.0,
  CAMERA_START_X: 0,
  CAMERA_START_Y: 0,

  // Sprite rendering
  SPRITE_SIZE_PEASANT: 80,
  SPRITE_SIZE_PRIEST: 72,
  SPRITE_SIZE_KNIGHT: 94,
  SPRITE_FPS_DEFAULT: 8,
  SPRITE_FPS_WORKER: 5,
  SPRITE_FPS_REBEL: 10,
  SPRITE_FPS_PRIEST: 6,

  // Energy
  ENERGY_MAX: 300,
  ENERGY_START: 130,
  STARTING_WORKERS: 16,

  // Degradation thresholds
  REBELS_ATTACK_MINES: 4,
  REBELS_ATTACK_PANCREAS: 16,

  // Basal energy drain
  ENERGY_BASAL_DRAIN: 10,

  // Interventions
  FAST_INSULIN_COST: 60,
  FAST_INSULIN_COOLDOWN: 45,
  FAST_INSULIN_PRIESTS: 3,
  FAST_INSULIN_DURATION: 20,

  EXERCISE_COST: 70,
  EXERCISE_COOLDOWN: 60,
  EXERCISE_DURATION_HOURS: 1,   // 1 game hour

  SEMAGLUTIDE_COST: 30,
  SEMAGLUTIDE_MINE_COUNT: 6,
  SEMAGLUTIDE_MINE_DURATION: 20,
  SEMAGLUTIDE_MINE_X_MIN: 300,
  SEMAGLUTIDE_MINE_X_MAX: 900,
  SEMAGLUTIDE_MINE_Y_MIN: 160,
  SEMAGLUTIDE_MINE_Y_MAX: 700,

  DAPAGLIFLOZIN_COST: 20,
  DAPAGLIFLOZIN_VORTEX_COUNT: 8,

  METFORMIN_COST: 20,
  METFORMIN_DURATION: 40,
  METFORMIN_SPEED_BOOST: 0.3,

  WALK_COST: 20,
  WALK_COOLDOWN: 25,
  WALK_DURATION_HOURS: 2,       // 2 game hours
  WALK_REBELS_MIN: 3,
  WALK_REBELS_MAX: 8,

  // Manual core actions (player-activated)
  MANUAL_PRIEST_COOLDOWN: 4,
  MANUAL_KNIGHT_COOLDOWN: 10,
  MANUAL_VORTEX_COOLDOWN: 20,
  MANUAL_RELEASE_COOLDOWN: 1.5,
  MANUAL_RELEASE_COUNT: 1,

  // Snack (replaces juice)
  SNACK_COOLDOWN: 30,
  SNACK_CHOCOLATE_FAST: 12,
  SNACK_CHOCOLATE_SLOW: 12,

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
  MUSCLE_ZONE: { x1: 300, y1: 180, x2: 900, y2: 700 },

  // Waypoints (simplified — no road, just shore → advance → muscle)
  WAYPOINTS: {
    SHORE_X: 260,
    ADVANCE_X: 400,
  },

  // Boat
  BOAT_SIZE: 300,
  BOAT_SPAWN: { x: -80, y: 350 },
  BOAT_DEST: { x: 200, y: 350 },
};
