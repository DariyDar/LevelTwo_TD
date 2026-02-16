# GlucoDefense — Project Context

## Overview

Educational tower defense game about glucose metabolism and diabetes.
Players manage blood glucose by choosing meals and using interventions (medications/exercise).

**Tech Stack:** HTML5 Canvas + Vanilla JS (ES modules, no bundler)
**Canvas:** 1280x720 internal, responsive scaling
**Entry:** `index.html` loads `js/main.js` as module

## Architecture

- **Single source of truth:** `gameState.js` — central state object, reset via `Object.assign()`
- **All constants:** `config.js` — ~250 entries for balancing
- **Rendering:** Split into 4 files (renderer.js, rendererEntities.js, rendererUI.js, rendererEffects.js)
- **No bundler:** Browser-native ES module imports with `.js` extensions

## Game Metaphor

| Game | Biology |
|------|---------|
| Peasants (red/purple) | Glucose molecules |
| Priests (gold) | Insulin |
| Knights (green) | GLUT2 liver transporters |
| Mines | Muscle cells (ATP production) |
| Liver Tower | Glycogen storage |
| Pancreas | Beta cells (insulin production) |
| Kidneys | Renal glucose filtration |
| Energy | ATP |

## Patient System (4 patients x 5 days each)

Patients defined in `patients/index.js`. Each has physiology multipliers applied via `_`-prefixed gameState fields.

| Patient | Key Trait |
|---------|-----------|
| Healthy (🏃) | High production, no degradation, weak rebels |
| Type 1 (💉) | Near-zero insulin production, limited injection charges |
| Type 2 (🦵) | Degradation enabled, insulin resistance develops |
| Type 2 Advanced (⚠️) | Starts degraded, weak organs, strong rebels |

## Glucose Types (Visual)

Two speed categories with distinct colors:
- **Fast glucose** = RED (#E74C3C) — dangerous, from junk food
- **Slow glucose** = ORANGE (#F39C12) — safer, from healthy food

## Key Config Values (actual code)

```
RESISTANCE_BY_DEGRADATION: [0.95, 0.55, 0.40, 0.30, 0.20]
PANCREAS_MAX_PRIESTS: [35, 20, 12, 6, 3]
PANCREAS_AUTO_SPAWN_INTERVAL: [1.5, 2, 3, 5, 10]
PANCREAS_HP: 600
ENERGY_MAX: 300, ENERGY_START: 130
MINE_MAX_WORKERS: 8, MINE_HP: 80
REBEL_HP: 80, REBEL_HP_DECAY: 1.0, REBEL_BUILDING_DPS: 5
WORKER_LIFETIME: 30
LIVER_STORAGE: [200, 160, 120, 80, 50, 20]
LIVER_MAX_KNIGHTS: 10
MINES_GRID: 6 cols x 5 rows = 30 mines
```

## File Structure

```
glucodefense/
├── index.html
├── css/style.css
├── js/
│   ├── main.js                    # Game loop, state machine, init
│   ├── config.js                  # All constants
│   ├── gameState.js               # Central state (GamePhase enum)
│   ├── renderer.js                # Map/background drawing
│   ├── rendererEntities.js        # Entity rendering (peasants, priests, knights, boats)
│   ├── rendererUI.js              # HUD, timeline, buttons
│   ├── rendererEffects.js         # Particles, cast lines, vortex
│   ├── audio.js                   # Sound effects
│   ├── entities/
│   │   ├── Peasant.js             # Glucose (states: walking, worker, rebel, etc.)
│   │   ├── Priest.js              # Insulin unit
│   │   ├── Knight.js              # Liver transporter
│   │   └── Boat.js                # Food delivery (speed categories)
│   ├── buildings/
│   │   ├── Mine.js                # Muscle cell (8 workers max)
│   │   ├── Pancreas.js            # Insulin generation + degradation
│   │   ├── LiverTower.js          # Storage + auto-glycogenolysis
│   │   └── KidneyTower.js         # Vortex filtration (manual + auto)
│   ├── systems/
│   │   ├── waveManager.js         # Day cycle, meal scheduling
│   │   ├── energySystem.js        # ATP production/consumption
│   │   ├── bgSystem.js            # Blood glucose calculation
│   │   ├── combatSystem.js        # Rebel attacks on buildings
│   │   ├── degradation.js         # Pancreas health decline
│   │   ├── interventions.js       # 6 medication/activity effects
│   │   ├── kidneyFiltration.js    # Auto-kidney logic
│   │   ├── bgHistory.js           # BG tracking for graph
│   │   └── planExecutor.js        # Meal plan automation
│   ├── ui/
│   │   ├── menu.js                # Patient/day selection with cards
│   │   ├── bottomBar.js           # Speed controls, action buttons
│   │   ├── foodChoice.js          # Meal selection overlay
│   │   ├── gameOver.js            # End screen
│   │   ├── wavePreview.js         # Next wave panel
│   │   ├── mealPlan.js            # Meal plan UI
│   │   ├── planningMode.js        # Pre-game intervention planning
│   │   ├── welcome.js             # Welcome/intro screen
│   │   ├── balancePanel.js        # Balance adjustment panel (global)
│   │   ├── balancePanelPatient.js # Per-patient physiology sliders
│   │   └── balancePanelDay.js     # Per-day wave/intervention settings
│   ├── levels/
│   │   ├── index.js               # Level registry
│   │   ├── foodData.js            # 30+ food items database
│   │   ├── level1.js - level5.js  # Wave definitions per level
│   └── patients/
│       └── index.js               # 4 patient profiles
```

## Liver Auto-Glycogenolysis

LiverTower releases stored glucose when BG drops below threshold:
- `_liverReleaseRate` multiplier per patient (healthy=1.5, type2advanced=0.6)
- `_liverInitialStorage` set at game start per patient (healthy=100, type2advanced=20)
- Triggers at BG < `LIVER_RELEASE_THRESHOLD_BG` (100 mg/dL)

## Balance Panel

Accessible via UI, saves to localStorage. Three tab types:
- **Global:** game-wide constants (speeds, building stats)
- **Patient:** per-patient physiology multipliers (insulin rate, sensitivity, etc.)
- **Day:** per-day wave timing and intervention availability

## Game Phases

```
WELCOME → MENU → MEAL_PLAN → PLANNING → PLAYING → BETWEEN_WAVES → GAME_OVER
```

## Interventions (actual values in config.js)

| Intervention | Cost | Cooldown | Effect |
|---|---|---|---|
| Walk 🚶 | 20 | 25s | Remove 15-40 rebels |
| Exercise 🏃 | 70 | 60s | 2x worker ATP for 25s |
| Fast Insulin 💉 | 60 | 45s | 15 super-priests for 20s |
| Semaglutide 💊 | 30 | — | 18 road mines for 20s |
| Metformin 💊 | 20 | — | Block liver + 30% knight speed for 40s |
| Dapagliflozin 🧪 | 20 | — | 40 kidney vortex particles |

## Recent Changes (latest commits)

1. **f852044** - Simplified glucose to 2 types (fast=red, slow=orange), fixed healthy patient balance
2. **554475f** - Added glucose speed types, liver reserves, release speed per patient, timeline & card fixes
3. **0773c1a** - 13 gameplay and UX improvements
4. **0b262ed** - Healthy patient never loses + balance panel with days inside patient tabs
5. **0992841** - 7 major features for full educational game

## Documentation

Design docs in `../docs/`:
- `01_GDD_v2.md` — Full GDD (Russian)
- `02_TECH_ARCHITECTURE.md` — Technical architecture
- `03_IMPLEMENTATION_PLAN.md` — 18-step implementation plan
- `04_VISUAL_REFERENCE.md` — Canvas rendering specs
- `buildings/`, `entities/`, `systems/`, `interventions/`, `levels/`, `ui/`, `visual/` — Subsystem docs

**Note:** Some doc values are outdated vs actual code. Always trust `config.js` and source code over docs.

## Git

- **Repo:** `glucodefense/` subdirectory (NOT parent `Level Two TD/`)
- **Branch:** main
- **Remote:** https://github.com/DariyDar/LevelTwo_TD.git
