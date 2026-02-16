// GlucoDefense — Sprite asset loader

const spriteCache = new Map();
let loaded = false;

const SPRITE_MANIFEST = [
  // Pawn (Pickaxe) — glucose entities
  { key: 'pawn_red_run',         src: 'assets/sprites/pawn/red/Run.png',         frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_yellow_run',      src: 'assets/sprites/pawn/yellow/Run.png',      frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_purple_run',      src: 'assets/sprites/pawn/purple/Run.png',      frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_purple_interact', src: 'assets/sprites/pawn/purple/Interact.png', frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_black_run',       src: 'assets/sprites/pawn/black/Run.png',       frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'pawn_black_interact',  src: 'assets/sprites/pawn/black/Interact.png',  frameW: 192, frameH: 192, frameCount: 6 },

  // Monk — insulin priests
  { key: 'monk_idle',        src: 'assets/sprites/monk/Idle.png',       frameW: 192, frameH: 192, frameCount: 6 },
  { key: 'monk_run',         src: 'assets/sprites/monk/Run.png',        frameW: 192, frameH: 192, frameCount: 4 },
  { key: 'monk_heal',        src: 'assets/sprites/monk/Heal.png',       frameW: 192, frameH: 192, frameCount: 11 },
  { key: 'monk_heal_effect', src: 'assets/sprites/monk/HealEffect.png', frameW: 192, frameH: 192, frameCount: 11 },
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
