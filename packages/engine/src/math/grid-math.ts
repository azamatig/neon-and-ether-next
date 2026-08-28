/**
 * @neon-ether/engine
 * Deterministic 2D grid spatial mathematics and raycasting.
 */

import { Vector2D } from '@neon-ether/game-schema';

export function manhattanDistance(a: Vector2D, b: Vector2D): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function chebyshevDistance(a: Vector2D, b: Vector2D): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function euclideanDistance(a: Vector2D, b: Vector2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isSameCoord(a: Vector2D, b: Vector2D): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Bresenham line-of-sight raycaster.
 * Returns true if there is an unblocked ray from start to end.
 */
export function hasLineOfSight(
  start: Vector2D,
  end: Vector2D,
  isOpaque: (coord: Vector2D) => boolean
): boolean {
  let x0 = start.x;
  let y0 = start.y;
  const x1 = end.x;
  const y1 = end.y;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // If not start or end, check opacity
    if (!isSameCoord({ x: x0, y: y0 }, start) && !isSameCoord({ x: x0, y: y0 }, end)) {
      if (isOpaque({ x: x0, y: y0 })) {
        return false;
      }
    }

    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }

  return true;
}

export function getAdjacentCoords(pos: Vector2D): Vector2D[] {
  return [
    { x: pos.x + 1, y: pos.y },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x, y: pos.y - 1 },
  ];
}
