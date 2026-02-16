// GlucoDefense — Sprite animation system

import { getSprite } from './spriteLoader.js';

export function createAnimState(key, fps = 8) {
  return {
    key,
    frame: 0,
    elapsed: 0,
    fps,
    facingRight: true,
  };
}

export function updateAnim(anim, dt) {
  if (!anim || anim.fps <= 0) return;

  anim.elapsed += dt;
  const frameDuration = 1 / anim.fps;

  if (anim.elapsed >= frameDuration) {
    const sprite = getSprite(anim.key);
    if (sprite) {
      anim.frame = (anim.frame + 1) % sprite.frameCount;
    }
    anim.elapsed -= frameDuration;
    // Prevent accumulation if dt was very large
    if (anim.elapsed > frameDuration) anim.elapsed = 0;
  }
}

export function setAnimKey(anim, newKey, fps) {
  if (!anim) return;
  // Always update FPS (exercise can change worker speed without changing key)
  if (fps !== undefined) anim.fps = fps;
  if (anim.key === newKey) return;
  anim.key = newKey;
  anim.frame = 0;
  anim.elapsed = 0;
}

// Draw sprite centered on (x, y) at given render size.
// Returns false if sprite not loaded (caller should fall back).
export function drawSprite(ctx, anim, x, y, size) {
  if (!anim) return false;
  const sprite = getSprite(anim.key);
  if (!sprite) return false;

  const { img, frameW, frameH } = sprite;
  const sx = anim.frame * frameW;
  const half = size / 2;

  if (anim.facingRight) {
    ctx.drawImage(img, sx, 0, frameW, frameH, x - half, y - half, size, size);
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, 0, frameW, frameH, -half, -half, size, size);
    ctx.restore();
  }

  return true;
}
