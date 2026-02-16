// GlucoDefense — All constants and balancing numbers
// Units scaled to mg/dL: 1 peasant ≈ 1 mg/dL glucose

export const CONFIG = {
  // Canvas
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,

  // Map zones
  SEA_X_END: 200,
  SHORE_X_END: 300,
  ROAD_X_END: 650,
  VILLAGE_X_END: 1100,
  ROAD_Y_CENTER: 360,
  ROAD_HEIGHT: 60,

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
    ROAD: '#BDC3C7',
    GRASS: '#82E0AA',
    DARK_BG: '#2C3E50',
    DARK_BG2: '#34495E',
    GRAY: '#7F8C8D',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
  },

  // Building positions
  LIVER_POS: { x: 500, y: 360 },
  LIVER_SIZE: { w: 80, h: 60 },
  PANCREAS_POS: { x: 875, y: 200 },
  PANCREAS_SIZE: { w: 90, h: 70 },
  KIDNEYS_POS: { x: 1050, y: 500 },
  KIDNEYS_RADIUS: 30,

  // Mines grid (6 cols × 5 rows = 30 mines)
  MINES_GRID: {
    startX: 670,
    startY: 265,
    cols: 6,
    rows: 5,
    gapX: 48,
    gapY: 42,
  },
  MINE_SIZE: { w: 36, h: 26 },
  MINE_MAX_WORKERS: 8,
  MINE_HP: 80,
  MINE_REPAIR_TIME: 12,
  MINE_ENERGY_PER_WORKER: 0.50,

  // Worker positions (arc below mine, up to 8)
  WORKER_OFFSETS: [
    { dx: -14, dy: 16 },
    { dx: -8, dy: 18 },
    { dx: -2, dy: 19 },
    { dx: 4, dy: 19 },
    { dx: 10, dy: 18 },
    { dx: 16, dy: 16 },
    { dx: -11, dy: 22 },
    { dx: 5, dy: 22 },
  ],

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
  LIVER_RELEASE_THRESHOLD_BG: 100, // BG below this triggers auto-glycogenolysis
  LIVER_AUTO_RELEASE_INTERVAL: 2,  // seconds between auto-releases

  // Knight spawn positions (around liver building)
  KNIGHT_POSITIONS: [
    { x: 455, y: 340 },
    { x: 545, y: 340 },
    { x: 455, y: 380 },
    { x: 545, y: 380 },
    { x: 470, y: 325 },
    { x: 530, y: 325 },
    { x: 470, y: 395 },
    { x: 530, y: 395 },
    { x: 460, y: 360 },
    { x: 540, y: 360 },
    { x: 485, y: 320 },
    { x: 515, y: 320 },
    { x: 485, y: 400 },
    { x: 515, y: 400 },
    { x: 500, y: 410 },
  ],
  KNIGHT_SPEED: 20,
  KNIGHT_SCAN_RANGE: 140,
  KNIGHT_INTERCEPT_CHANCE: 0.35,

  // Kidneys
  KIDNEY_COOLDOWN: 20,
  KIDNEY_COST: 10,
  KIDNEY_VORTEX_MIN: 15,
  KIDNEY_VORTEX_MAX: 30,
  KIDNEY_ACTIVATION_THRESHOLD: 40,
  KIDNEY_CIRCLE_EXPAND_SPEED: 120,
  KIDNEY_CIRCLE_CONTRACT_SPEED: 150,
  KIDNEY_CIRCLE_ORIGIN: { x: 850, y: 400 },
  KIDNEY_EJECT_SPEED: 400,

  // Kidney auto-filtration (fires automatically when BG stays above threshold)
  KIDNEY_AUTO_FILL_RATE: 2,        // % per second when BG > threshold
  KIDNEY_AUTO_COOLDOWN: 50,        // seconds after auto-fire before refill starts
  KIDNEY_AUTO_THRESHOLD: 180,      // BG mg/dL threshold to start filling

  // Building HP (liver + kidneys can be attacked by rebels)
  LIVER_HP: 200,
  KIDNEY_HP: 150,
  BUILDING_REPAIR_TIME: 15,

  // Energy
  ENERGY_MAX: 300,
  ENERGY_START: 130,
  STARTING_WORKERS: 80,

  // Degradation thresholds
  REBELS_ATTACK_MINES: 20,
  REBELS_ATTACK_PANCREAS: 80,

  // Basal energy drain (metabolism uses energy even without rebels)
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
  SEMAGLUTIDE_MINE_X_MIN: 310,
  SEMAGLUTIDE_MINE_X_MAX: 600,
  SEMAGLUTIDE_MINE_Y_SPREAD: 40,

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

  // BG zones (real mg/dL thresholds)
  BG_HYPO_DANGER: 54,     // severe hypoglycemia — red
  BG_HYPO: 70,            // hypoglycemia — yellow/orange
  BG_NORMAL_LOW: 80,      // low-normal — green
  BG_NORMAL_HIGH: 140,    // normal postprandial — green
  BG_ELEVATED: 180,       // elevated — yellow
  BG_HIGH: 250,           // high — orange
  BG_VERY_HIGH: 400,      // very high — red

  // Wave timing (seconds between meals)
  WAVE_INTERVAL: 60,
  JUICE_COOLDOWN: 30, // seconds between juice/snack boats

  // Day cycle: 7:00 to 24:00 (17 virtual hours)
  DAY_START_HOUR: 7,  // 7:00 AM
  DAY_END_HOUR: 24,   // midnight
  DAY_SPEED: 3.5,     // virtual minutes per real second (17h = 1020min / 3.5 ≈ 97s real)

  // Boat unload times (longer for bigger loads)
  UNLOAD_TIME_S: 5,
  UNLOAD_TIME_M: 10,
  UNLOAD_TIME_L: 15,

  // Muscle zone (where glucose roams waiting for priests)
  MUSCLE_ZONE: { x1: 660, y1: 250, x2: 1100, y2: 570 },

  // Waypoints
  WAYPOINTS: {
    SHORE: { x: 250, y: 360 },
    BEFORE_LIVER: { x: 430, y: 360 },
    AFTER_LIVER: { x: 570, y: 360 },
    VILLAGE_SQUARE: { x: 850, y: 400 },
  },

  // Boat
  BOAT_SPAWN: { x: -50, y: 360 },
  BOAT_DEST: { x: 250, y: 360 },
};
