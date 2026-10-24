/// <reference types="node" />
// Unit tests for canvasCutGeometry. Run with:
//   node --test src/utils/canvasCutGeometry.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRect,
  isRectLargeEnough,
  sceneRectToViewport,
  isRectContained,
  doRectsIntersect,
  rectCenter,
} from './canvasCutGeometry.ts';

test('normalizeRect handles drag in any direction', () => {
  const expected = { left: 10, top: 20, width: 90, height: 60 };
  assert.deepEqual(normalizeRect({ x: 10, y: 20 }, { x: 100, y: 80 }), expected);
  assert.deepEqual(normalizeRect({ x: 100, y: 80 }, { x: 10, y: 20 }), expected);
  assert.deepEqual(normalizeRect({ x: 100, y: 20 }, { x: 10, y: 80 }), expected);
});

test('isRectLargeEnough rejects accidental clicks', () => {
  assert.equal(isRectLargeEnough({ left: 0, top: 0, width: 5, height: 50 }), false);
  assert.equal(isRectLargeEnough({ left: 0, top: 0, width: 50, height: 9 }), false);
  assert.equal(isRectLargeEnough({ left: 0, top: 0, width: 10, height: 10 }), true);
});

test('sceneRectToViewport applies zoom and pan', () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };
  // identity
  assert.deepEqual(sceneRectToViewport(rect, [1, 0, 0, 1, 0, 0]), rect);
  // zoom 2x + pan (30, -40)
  assert.deepEqual(sceneRectToViewport(rect, [2, 0, 0, 2, 30, -40]), {
    left: 230, top: 60, width: 400, height: 200,
  });
  // zoom out 0.5x
  assert.deepEqual(sceneRectToViewport(rect, [0.5, 0, 0, 0.5, 0, 0]), {
    left: 50, top: 25, width: 100, height: 50,
  });
});

test('isRectContained detects full containment only', () => {
  const area = { left: 0, top: 0, width: 100, height: 100 };
  assert.equal(isRectContained({ left: 10, top: 10, width: 50, height: 50 }, area), true);
  assert.equal(isRectContained({ left: 0, top: 0, width: 100, height: 100 }, area), true);
  assert.equal(isRectContained({ left: 60, top: 10, width: 50, height: 50 }, area), false);
  assert.equal(isRectContained({ left: -1, top: 10, width: 20, height: 20 }, area), false);
});

test('doRectsIntersect detects overlap but not touching edges', () => {
  const a = { left: 0, top: 0, width: 100, height: 100 };
  assert.equal(doRectsIntersect(a, { left: 50, top: 50, width: 100, height: 100 }), true);
  assert.equal(doRectsIntersect(a, { left: 100, top: 0, width: 50, height: 50 }), false);
  assert.equal(doRectsIntersect(a, { left: 200, top: 200, width: 10, height: 10 }), false);
});

test('rectCenter returns the middle point', () => {
  assert.deepEqual(rectCenter({ left: 10, top: 20, width: 100, height: 40 }), { x: 60, y: 40 });
});
