// GlucoDefense — Sprite asset loader

const spriteCache = new Map();
let loaded = false;

const SPRITE_MANIFEST = [
  // Pawn — glucose entities (multiple variants per color)
  // Red (fast glucose): run empty-hands, run pickaxe (walking to mine), interact hammer (rebel attack)
  { key: 'pawn_red_run',              src: 'assets/sprites/pawn/red/Run.png',              frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_red_run_pickaxe',      src: 'assets/sprites/pawn/red/Run_Pickaxe.png',      frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_red_interact_hammer',  src: 'assets/sprites/pawn/red/Interact_Hammer.png',  frameW: 192, frameH: 192, frameCount: 3 },

  // Yellow/orange (slow glucose): same variants
  { key: 'pawn_yellow_run',              src: 'assets/sprites/pawn/yellow/Run.png',              frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_yellow_run_pickaxe',      src: 'assets/sprites/pawn/yellow/Run_Pickaxe.png',      frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_yellow_interact_hammer',  src: 'assets/sprites/pawn/yellow/Interact_Hammer.png',  frameW: 192, frameH: 192, frameCount: 3 },

  // Purple (workers): run pickaxe (walking to mine), interact pickaxe (mining)
  { key: 'pawn_purple_run',      src: 'assets/sprites/pawn/purple/Run.png',          frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_purple_run_pickaxe', src: 'assets/sprites/pawn/purple/Run_Pickaxe.png', frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_purple_interact', src: 'assets/sprites/pawn/purple/Interact.png',     frameW: 192, frameH: 192, frameCount: 6 },

  // Black (rebels): run hammer, interact hammer (attacking buildings)
  { key: 'pawn_black_run',             src: 'assets/sprites/pawn/black/Run.png',             frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_black_run_hammer',      src: 'assets/sprites/pawn/black/Run_Hammer.png',      frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_black_interact',        src: 'assets/sprites/pawn/black/Interact_Hammer.png', frameW: 192, frameH: 192, frameCount: 3 },

  // Monk — insulin priests
  { key: 'monk_idle',        src: 'assets/sprites/monk/Idle.png',       frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'monk_run',         src: 'assets/sprites/monk/Run.png',        frameW: 192, frameH: 192, frameCount: 4 },
  { key: 'monk_heal',        src: 'assets/sprites/monk/Heal.png',       frameW: 192, frameH: 192, frameCount: 11 },
  { key: 'monk_heal_effect', src: 'assets/sprites/monk/HealEffect.png', frameW: 192, frameH: 192, frameCount: 11 },

  // Warrior — knights (GLUT4 transporters)
  { key: 'warrior_idle', src: 'assets/sprites/warrior/green/Idle.png', frameW: 192, frameH: 192, frameCount: 8 },
  { key: 'warrior_run',  src: 'assets/sprites/warrior/green/Run.png',  frameW: 192, frameH: 192, frameCount: 6 },

  // Buildings (static — single frame, full image)
  { key: 'bld_mine_active',    src: 'assets/sprites/buildings/GoldMine_Active.png',    frameW: 192, frameH: 128, frameCount: 1 },
  { key: 'bld_mine_inactive',  src: 'assets/sprites/buildings/GoldMine_Inactive.png',  frameW: 192, frameH: 128, frameCount: 1 },
  { key: 'bld_mine_destroyed', src: 'assets/sprites/buildings/GoldMine_Destroyed.png', frameW: 192, frameH: 128, frameCount: 1 },
  { key: 'bld_castle',         src: 'assets/sprites/buildings/Castle.png',             frameW: 320, frameH: 256, frameCount: 1 },
  { key: 'bld_liver',          src: 'assets/sprites/buildings/Liver.png',              frameW: 128, frameH: 192, frameCount: 1 },
  { key: 'bld_pancreas',       src: 'assets/sprites/buildings/Pancreas.png',           frameW: 192, frameH: 320, frameCount: 1 },
  { key: 'bld_kidneys',        src: 'assets/sprites/buildings/Kidneys.png',            frameW: 128, frameH: 256, frameCount: 1 },

  // Boat (animated)
  { key: 'boat_idle', src: 'assets/sprites/boat/Boat_Idle.png', frameW: 256, frameH: 256, frameCount: 8 },

  // Terrain textures (static tiling)
  { key: 'terrain_grass',  src: 'assets/sprites/terrain/Tilemap_color1.png',  frameW: 576, frameH: 384, frameCount: 1 },
  { key: 'terrain_water',  src: 'assets/sprites/terrain/Water_Background.png', frameW: 64,  frameH: 64,  frameCount: 1 },
  { key: 'terrain_foam',   src: 'assets/sprites/terrain/Water_Foam.png',       frameW: 192, frameH: 192, frameCount: 16 },

  // Effects
  { key: 'fx_poof',      src: 'assets/sprites/effects/Puf_effect.png',  frameW: 64,  frameH: 64,  frameCount: 10 },
  { key: 'fx_explosion', src: 'assets/sprites/effects/Explosions.png',  frameW: 192, frameH: 192, frameCount: 9 },
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export async function loadAllSprites() {
  const results = await Promise.allSettled(
    SPRITE_MANIFEST.map(async (entry) => {
      const img = await loadImage(entry.src);
      spriteCache.set(entry.key, {
        img,
        frameW: entry.frameW,
        frameH: entry.frameH,
        frameCount: entry.frameCount,
      });
    })
  );

  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    for (const f of failed) {
      console.warn('Sprite load failed:', f.reason.message);
    }
  }

  loaded = spriteCache.size > 0;
}

export function getSprite(key) {
  return spriteCache.get(key) || null;
}

export function isLoaded() {
  return loaded;
}

// Draw a static (single-frame) sprite image. Returns false if not loaded.
export function drawStaticSprite(ctx, key, x, y, w, h) {
  const sprite = spriteCache.get(key);
  if (!sprite) return false;
  ctx.drawImage(sprite.img, 0, 0, sprite.frameW, sprite.frameH, x, y, w, h);
  return true;
}
