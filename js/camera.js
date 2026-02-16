// GlucoDefense — Camera system (zoom + pan)

import { CONFIG } from './config.js';

const cam = {
  x: 0,
  y: 0,
  zoom: 1.0,
  isDragging: false,
  lastScreenX: 0,
  lastScreenY: 0,
};

// Smooth transition state
const anim = {
  active: false,
  targetX: 0,
  targetY: 0,
  targetZoom: 1.0,
  speed: 3.0, // lerp speed (higher = faster)
};

// Rendered values (what actually gets applied to ctx)
const rendered = { x: 0, y: 0, zoom: 1.0 };

export function initCamera() {
  cam.zoom = CONFIG.CAMERA_DEFAULT_ZOOM;
  cam.x = CONFIG.CAMERA_START_X;
  cam.y = CONFIG.CAMERA_START_Y;
  clampCamera();
  // Start rendered values at cam position
  rendered.x = cam.x;
  rendered.y = cam.y;
  rendered.zoom = cam.zoom;
}

// Smoothly animate camera to tutorial view (zoom 1.0, pos 0,0) or back
export function setCameraOverride(active) {
  anim.active = active;
  if (active) {
    anim.targetX = 0;
    anim.targetY = 0;
    anim.targetZoom = 1.0;
  } else {
    anim.targetX = cam.x;
    anim.targetY = cam.y;
    anim.targetZoom = cam.zoom;
  }
}

export function updateCameraAnim(dt) {
  const speed = anim.speed * dt;
  const t = Math.min(1.0, speed);

  if (anim.active) {
    // Animate toward tutorial view
    rendered.x += (anim.targetX - rendered.x) * t;
    rendered.y += (anim.targetY - rendered.y) * t;
    rendered.zoom += (anim.targetZoom - rendered.zoom) * t;
  } else {
    // Animate back toward real camera
    rendered.x += (cam.x - rendered.x) * t;
    rendered.y += (cam.y - rendered.y) * t;
    rendered.zoom += (cam.zoom - rendered.zoom) * t;
  }
}

export function applyCamera(ctx) {
  const z = rendered.zoom;
  ctx.setTransform(z, 0, 0, z, -rendered.x * z, -rendered.y * z);
}

export function resetCamera(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export function screenToWorld(sx, sy) {
  const z = rendered.zoom;
  return {
    x: sx / z + rendered.x,
    y: sy / z + rendered.y,
  };
}

export function handleZoom(screenX, screenY, delta) {
  if (anim.active) return; // no manual zoom during tutorial
  const oldZoom = cam.zoom;
  cam.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(CONFIG.CAMERA_MAX_ZOOM, cam.zoom + delta));

  // Zoom towards cursor position
  const worldX = screenX / oldZoom + cam.x;
  const worldY = screenY / oldZoom + cam.y;
  cam.x = worldX - screenX / cam.zoom;
  cam.y = worldY - screenY / cam.zoom;

  clampCamera();
}

const DRAG_THRESHOLD = 5; // pixels before mouse-down becomes a drag

export function startDrag(screenX, screenY) {
  if (anim.active) return;
  cam.isDragging = true;
  cam.didDrag = false;
  cam.dragOriginX = screenX;
  cam.dragOriginY = screenY;
  cam.lastScreenX = screenX;
  cam.lastScreenY = screenY;
}

export function updateDrag(screenX, screenY) {
  if (!cam.isDragging) return;

  // Check if moved past threshold
  if (!cam.didDrag) {
    const dx = screenX - cam.dragOriginX;
    const dy = screenY - cam.dragOriginY;
    if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
    cam.didDrag = true;
  }

  const dx = (screenX - cam.lastScreenX) / cam.zoom;
  const dy = (screenY - cam.lastScreenY) / cam.zoom;
  cam.x -= dx;
  cam.y -= dy;
  cam.lastScreenX = screenX;
  cam.lastScreenY = screenY;
  clampCamera();
}

export function endDrag() {
  cam.isDragging = false;
}

export function wasDrag() {
  return cam.didDrag;
}

export function getCamera() {
  return { x: cam.x, y: cam.y, zoom: cam.zoom };
}

function clampCamera() {
  const viewW = CONFIG.CANVAS_WIDTH / cam.zoom;
  const viewH = CONFIG.CANVAS_HEIGHT / cam.zoom;
  const maxX = CONFIG.CANVAS_WIDTH - viewW;
  const maxY = CONFIG.CANVAS_HEIGHT - viewH;
  cam.x = Math.max(0, Math.min(maxX, cam.x));
  cam.y = Math.max(0, Math.min(maxY, cam.y));
}
