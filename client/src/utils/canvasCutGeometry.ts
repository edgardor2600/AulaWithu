// Pure geometry helpers for the canvas Cut tool.
// Kept free of Fabric/DOM dependencies so they can be unit-tested in Node.

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 2D affine matrix as used by Fabric: [a, b, c, d, e, f]. */
export type ViewportTransform = readonly [number, number, number, number, number, number];

/** Minimum size (scene units) for a selection to be considered a real cut. */
export const MIN_CUT_SIZE = 10;

/** Builds a positive-size rect from two arbitrary drag corners. */
export const normalizeRect = (start: Point, end: Point): Rect => ({
  left: Math.min(start.x, end.x),
  top: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
});

export const isRectLargeEnough = (rect: Rect, min = MIN_CUT_SIZE): boolean =>
  rect.width >= min && rect.height >= min;

/**
 * Converts a scene-space rect to viewport (screen pixel) space.
 * Assumes no rotation/skew in the viewport (true for zoom + pan).
 */
export const sceneRectToViewport = (rect: Rect, vpt: ViewportTransform): Rect => {
  const [scaleX, , , scaleY, offsetX, offsetY] = vpt;
  return {
    left: rect.left * scaleX + offsetX,
    top: rect.top * scaleY + offsetY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
};

/** True when `inner` lies completely inside `outer`. */
export const isRectContained = (inner: Rect, outer: Rect): boolean =>
  inner.left >= outer.left &&
  inner.top >= outer.top &&
  inner.left + inner.width <= outer.left + outer.width &&
  inner.top + inner.height <= outer.top + outer.height;

/** True when both rects overlap (touching edges do not count). */
export const doRectsIntersect = (a: Rect, b: Rect): boolean =>
  a.left < b.left + b.width &&
  a.left + a.width > b.left &&
  a.top < b.top + b.height &&
  a.top + a.height > b.top;

/** Center point of a rect — used to place the cut piece in its original spot. */
export const rectCenter = (rect: Rect): Point => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});
