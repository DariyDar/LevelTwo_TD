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

export function initCamera() {
  cam.zoom = CONFIG.CAMERA_DEFAULT_ZOOM;
  cam.x = CONFIG.CAMERA_START_X;
  cam.y = CONFIG.CAMERA_START_Y;
  clampCamera();
}

export function applyCamera(ctx) {
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, -cam.x * cam.zoom, -cam.y * cam.zoom);
}

export function resetCamera(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export function screenToWorld(sx, sy) {
  return {
    x: sx / cam.zoom + cam.x,
    y: sy / cam.zoom + cam.y,
  };
}

export function handleZoom(screenX, screenY, delta) {
  const oldZoom = cam.zoom;
  cam.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(CONFIG.CAMERA_MAX_ZOOM, cam.zoom + delta));

  // Zoom towards cursor position
  const worldX = screenX / oldZoom + cam.x;
  const worldY = screenY / oldZoom + cam.y;
  cam.x = worldX - screenX / cam.zoom;
  cam.y = worldY - screenY / cam.zoom;

  clampCamera();
}

export function startDrag(screenX, screenY) {
  cam.isDragging = true;
  cam.lastScreenX = screenX;
  cam.lastScreenY = screenY;
}

export function updateDrag(screenX, screenY) {
  if (!cam.isDragging) return;
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

export function isDragging() {
  return cam.isDragging;
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
