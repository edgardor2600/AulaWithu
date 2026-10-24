import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import toast from 'react-hot-toast';
import {
  normalizeRect,
  isRectLargeEnough,
  sceneRectToViewport,
  isRectContained,
  doRectsIntersect,
  rectCenter,
  type Point,
  type Rect,
  type ViewportTransform,
} from '../utils/canvasCutGeometry';

/**
 * Cut tool (scissors) — professional-style behavior:
 *  - Drag a rectangle over the board.
 *  - On release, every unlocked object fully inside the area is turned into a
 *    single movable image placed in the same spot (true cut).
 *  - Holding Alt on release copies the whole area instead (originals untouched).
 *  - The whole operation is a single undo step and syncs through the usual
 *    canvas events (object:removed / object:added).
 */

export interface UseCanvasCutToolParams {
  fabricCanvasRef: React.MutableRefObject<fabric.Canvas | null>;
  isActive: boolean;
  isSpacePressedRef: React.MutableRefObject<boolean>;
  onComplete: () => void;
}

type HelperFlags = {
  excludeFromSync?: boolean;
  excludeFromSerialization?: boolean;
  excludeFromHistory?: boolean;
};

const COPY_OFFSET = 20;

const isHelperObject = (obj: fabric.Object): boolean => {
  const flags = obj as fabric.Object & HelperFlags;
  return !!(flags.excludeFromSync || flags.excludeFromSerialization || flags.excludeFromHistory);
};

/** Objects the current user is allowed to remove (respects ownership locks). */
const isCuttable = (obj: fabric.Object): boolean =>
  obj.visible !== false && !isHelperObject(obj) && obj.selectable !== false && !obj.lockMovementX;

const getBounds = (obj: fabric.Object): Rect => obj.getBoundingRect();

const createSelectionRect = (start: Point): fabric.Rect => {
  const rect = new fabric.Rect({
    left: start.x,
    top: start.y,
    width: 0,
    height: 0,
    fill: 'rgba(99,102,241,0.15)',
    stroke: '#6366f1',
    strokeWidth: 1.5,
    strokeDashArray: [6, 3],
    selectable: false,
    evented: false,
  });
  Object.assign(rect, { excludeFromSync: true, excludeFromSerialization: true, excludeFromHistory: true });
  return rect;
};

/** Rasterizes `area` (scene coords) with a transparent background. */
const renderAreaToDataUrl = (
  canvas: fabric.Canvas,
  area: Rect,
  filter: (obj: any) => boolean
): string => {
  const vpt = (canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0]) as ViewportTransform;
  const viewportArea = sceneRectToViewport(area, vpt);
  const previousBg = canvas.backgroundColor;
  canvas.backgroundColor = '';
  try {
    const element = canvas.toCanvasElement(1, { ...viewportArea, filter });
    return element.toDataURL('image/png');
  } finally {
    canvas.backgroundColor = previousBg;
  }
};

const performCut = async (canvas: fabric.Canvas, area: Rect, copyMode: boolean): Promise<boolean> => {
  const objects = canvas.getObjects();
  const toRemove = copyMode
    ? []
    : objects.filter((obj) => isCuttable(obj) && isRectContained(getBounds(obj), area));

  if (!copyMode && toRemove.length === 0) {
    toast('Encierra por completo los objetos que quieres recortar (Alt = copiar área)', { icon: '✂️' });
    return false;
  }

  const removeSet = new Set(toRemove);
  const filter = copyMode
    ? (obj: any) => !isHelperObject(obj) && doRectsIntersect(getBounds(obj), area)
    : (obj: any) => removeSet.has(obj);

  const zoom = canvas.getZoom() || 1;
  const dataUrl = renderAreaToDataUrl(canvas, area, filter);
  // Load first (async) so removal + insertion below happen synchronously →
  // the debounced history save captures them as a single undo step.
  const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });

  const center = rectCenter(area);
  const offset = copyMode ? COPY_OFFSET : 0;
  img.set({
    left: center.x + offset,
    top: center.y + offset,
    originX: 'center',
    originY: 'center',
    scaleX: 1 / zoom,
    scaleY: 1 / zoom,
  });

  toRemove.forEach((obj) => canvas.remove(obj));
  canvas.discardActiveObject();
  canvas.add(img);
  canvas.setActiveObject(img);
  canvas.requestRenderAll();

  toast.success(copyMode ? 'Área copiada como imagen' : 'Recorte listo: arrástralo donde quieras');
  return true;
};

export function useCanvasCutTool({
  fabricCanvasRef,
  isActive,
  isSpacePressedRef,
  onComplete,
}: UseCanvasCutToolParams): void {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isActive) return;

    const previous = {
      selection: canvas.selection,
      skipTargetFind: canvas.skipTargetFind,
      defaultCursor: canvas.defaultCursor,
    };
    canvas.selection = false;
    canvas.skipTargetFind = true; // drag never grabs/moves objects under the cursor
    canvas.defaultCursor = 'crosshair';
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    let start: Point | null = null;
    let selectionRect: fabric.Rect | null = null;
    let busy = false;

    const clearSelectionRect = () => {
      if (selectionRect) canvas.remove(selectionRect);
      selectionRect = null;
      start = null;
    };

    const onMouseDown = (opt: fabric.TPointerEventInfo) => {
      const evt = opt.e as MouseEvent;
      if (busy || isSpacePressedRef.current || evt.button === 1) return;
      start = canvas.getScenePoint(opt.e);
      selectionRect = createSelectionRect(start);
      canvas.add(selectionRect);
    };

    const onMouseMove = (opt: fabric.TPointerEventInfo) => {
      if (!start || !selectionRect) return;
      selectionRect.set(normalizeRect(start, canvas.getScenePoint(opt.e)));
      canvas.requestRenderAll();
    };

    const onMouseUp = async (opt: fabric.TPointerEventInfo) => {
      if (!start || !selectionRect) return;
      const area = normalizeRect(start, canvas.getScenePoint(opt.e));
      clearSelectionRect();

      if (!isRectLargeEnough(area)) {
        canvas.requestRenderAll();
        return;
      }

      busy = true;
      try {
        const copyMode = (opt.e as MouseEvent).altKey === true;
        const done = await performCut(canvas, area, copyMode);
        if (done) onCompleteRef.current();
      } catch (error) {
        console.error('[CutTool] Failed to cut area:', error);
        toast.error('No se pudo recortar el área');
      } finally {
        busy = false;
      }
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);

    return () => {
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
      clearSelectionRect();
      canvas.selection = previous.selection;
      canvas.skipTargetFind = previous.skipTargetFind;
      canvas.defaultCursor = previous.defaultCursor;
      canvas.requestRenderAll();
    };
  }, [fabricCanvasRef, isActive, isSpacePressedRef]);
}
