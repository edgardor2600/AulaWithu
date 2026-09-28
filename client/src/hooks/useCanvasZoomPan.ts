import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import type { Tool } from '../types/canvas';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

export interface UseCanvasZoomPanParams {
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentTool: string;
  isReady: boolean;
  isSpacePressedRef: React.RefObject<boolean>;
  updateMiniMap: () => void;
  /** Called whenever the zoom level changes so the parent can sync state. */
  onZoomChange: (zoom: number) => void;
  /** Called when addText-on-click is needed (text tool + mouse:down on canvas). */
  addText: (x: number, y: number) => void;
  /** Called to sync cursor for tool on pan release. */
  syncCursorForTool: (tool: Tool) => void;
  setCurrentTool: (tool: Tool) => void;
}

export interface UseCanvasZoomPanReturn {
  fitToViewport: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  handleManualZoomApply: (percent: number) => void;
  hasInitialFitRef: React.RefObject<boolean>;
}

/**
 * Encapsulates all zoom and pan logic:
 * - fitToViewport / zoomIn / zoomOut / resetZoom / handleManualZoomApply
 * - ResizeObserver for container size changes
 * - Ctrl+Scroll wheel zoom
 * - Pan with Hand tool, Space+drag, or middle-click
 * - Native mousedown fallback for Space+click on empty canvas areas
 */
export function useCanvasZoomPan({
  fabricCanvasRef,
  containerRef,
  currentTool,
  isReady,
  isSpacePressedRef,
  updateMiniMap,
  onZoomChange,
  addText,
  syncCursorForTool,
  setCurrentTool,
}: UseCanvasZoomPanParams): UseCanvasZoomPanReturn {
  const hasInitialFitRef = useRef(false);

  // ── fitToViewport ────────────────────────────────────────────────────────────
  const fitToViewport = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) return;

    // Physical canvas always fills the container 100 %
    canvas.setWidth(containerWidth);
    canvas.setHeight(containerHeight);

    // Scale to fit 16:9 base 1200×675 in both dimensions
    const scaleX = containerWidth / 1200;
    const scaleY = containerHeight / 675;
    const scale = Math.min(scaleX, scaleY);

    // Center the board inside the container
    const translateX = (containerWidth - 1200 * scale) / 2;
    const translateY = (containerHeight - 675 * scale) / 2;

    canvas.setViewportTransform([scale, 0, 0, scale, translateX, translateY]);
    onZoomChange(scale);
    canvas.renderAll();
    updateMiniMap();
  }, [fabricCanvasRef, containerRef, onZoomChange, updateMiniMap]);

  // ── ResizeObserver ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        const canvas = fabricCanvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        if (!hasInitialFitRef.current) {
          fitToViewport();
          hasInitialFitRef.current = true;
        } else {
          canvas.setWidth(container.clientWidth);
          canvas.setHeight(container.clientHeight);
          canvas.requestRenderAll();
          updateMiniMap();
        }
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [isReady, fabricCanvasRef, containerRef, fitToViewport, updateMiniMap]);

  // ── zoomIn / zoomOut / resetZoom ─────────────────────────────────────────────
  // NOTE: These read zoomLevel from the canvas directly to avoid stale closures.
  const zoomIn = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const newZoom = Math.min(canvas.getZoom() * 1.1, MAX_ZOOM);
    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), newZoom);
    onZoomChange(newZoom);
    updateMiniMap();
  }, [fabricCanvasRef, onZoomChange, updateMiniMap]);

  const zoomOut = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const newZoom = Math.max(canvas.getZoom() / 1.1, MIN_ZOOM);
    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), newZoom);
    onZoomChange(newZoom);
    updateMiniMap();
  }, [fabricCanvasRef, onZoomChange, updateMiniMap]);

  const resetZoom = useCallback(() => {
    fitToViewport();
  }, [fitToViewport]);

  // ── handleManualZoomApply ────────────────────────────────────────────────────
  const handleManualZoomApply = useCallback((percent: number) => {
    const newZoom = percent / 100;
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      onZoomChange(newZoom);
      const center = canvas.getCenter();
      canvas.zoomToPoint({ x: center.left, y: center.top } as any, newZoom);
      updateMiniMap();
    }
  }, [fabricCanvasRef, onZoomChange, updateMiniMap]);

  // ── Ctrl+Scroll zoom & Pan (hand / space / middle-click) ─────────────────────
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;
    let wasDrawingMode = false;
    let restoreTimeout: ReturnType<typeof setTimeout> | null = null;

    // Zoom with Ctrl + Scroll wheel
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY;
        let newZoom = canvas.getZoom();
        if (delta < 0) {
          newZoom = Math.min(newZoom * 1.1, MAX_ZOOM);
        } else {
          newZoom = Math.max(newZoom / 1.1, MIN_ZOOM);
        }
        onZoomChange(newZoom);
        canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), newZoom);
        canvas.renderAll();
        updateMiniMap();
      }
    };

    // Pan: Hand tool, Space+drag, or middle-click
    const handleMouseDown = (e: fabric.TEvent) => {
      const evt = e.e as MouseEvent;

      // Disable selection immediately when Space is held (prevents blue selection box)
      if (isSpacePressedRef.current) {
        canvas.selection = false;
      }

      if (currentTool === 'text') {
        const pointer = canvas.getScenePoint(evt);
        addText(pointer.x, pointer.y);
        setCurrentTool('select');
        syncCursorForTool('select');
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }

      const shouldPan =
        currentTool === 'hand' ||
        isSpacePressedRef.current ||
        evt.button === 1; // Middle click

      if (shouldPan) {
        isPanning = true;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        canvas.defaultCursor = 'grabbing';

        // Save and disable drawing mode so pencil doesn't draw during pan
        wasDrawingMode = canvas.isDrawingMode;
        if (wasDrawingMode) {
          canvas.isDrawingMode = false;
          if ((canvas as any).freeDrawingBrush) {
            (canvas as any).freeDrawingBrush._reset();
          }
        }

        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        canvas.selection = false;
        canvas.skipTargetFind = true;
        return false;
      } else if (isSpacePressedRef.current) {
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }
    };

    const handleMouseMove = (e: fabric.TEvent) => {
      if (!isPanning) return;
      const evt = e.e as MouseEvent;
      evt.preventDefault();
      evt.stopPropagation();
      evt.stopImmediatePropagation();

      const deltaX = evt.clientX - lastPosX;
      const deltaY = evt.clientY - lastPosY;
      canvas.relativePan(new fabric.Point(deltaX, deltaY));
      lastPosX = evt.clientX;
      lastPosY = evt.clientY;
      updateMiniMap();
      return false;
    };

    const handleMouseUp = (e: fabric.TEvent) => {
      if (isPanning) {
        const evt = e.e as MouseEvent;
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();

        isPanning = false;
        canvas.defaultCursor = 'default';

        // Clean up internal Fabric state
        (canvas as any)._isCurrentlyDrawing = false;
        (canvas as any)._currentTransform = null;
        (canvas as any).__corner = null;
        canvas.discardActiveObject();
        canvas.skipTargetFind = false;

        if (wasDrawingMode) {
          if (restoreTimeout) clearTimeout(restoreTimeout);
          restoreTimeout = setTimeout(() => {
            if (canvas && !isPanning) {
              canvas.isDrawingMode = true;
              if ((canvas as any).freeDrawingBrush) {
                (canvas as any).freeDrawingBrush._reset();
              }
            }
            wasDrawingMode = false;
            restoreTimeout = null;
          }, 50);
        } else {
          canvas.selection = true;
        }

        canvas.requestRenderAll();
        return false;
      } else if (isSpacePressedRef.current) {
        // Space held but no pan — restore selection
        if (!canvas.isDrawingMode) {
          canvas.selection = true;
        }
      }
    };

    // Native mousedown fallback — ensures Space+click works on empty canvas areas
    const handleNativeMouseDownForPan = (evt: MouseEvent) => {
      if (!isSpacePressedRef.current && evt.button !== 1) return;
      canvas.selection = false;
      isPanning = true;
      lastPosX = evt.clientX;
      lastPosY = evt.clientY;
      canvas.defaultCursor = 'grabbing';
      wasDrawingMode = canvas.isDrawingMode;
      if (wasDrawingMode) {
        canvas.isDrawingMode = false;
        if ((canvas as any).freeDrawingBrush) {
          (canvas as any).freeDrawingBrush._reset();
        }
      }
      evt.preventDefault();
      evt.stopPropagation();
      canvas.skipTargetFind = true;
    };

    const canvasElement = canvas.getElement();
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    canvasElement.addEventListener('mousedown', handleNativeMouseDownForPan);
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      if (restoreTimeout) clearTimeout(restoreTimeout);
      canvasElement.removeEventListener('wheel', handleWheel);
      canvasElement.removeEventListener('mousedown', handleNativeMouseDownForPan);
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [fabricCanvasRef, currentTool, updateMiniMap, onZoomChange, isSpacePressedRef, addText, syncCursorForTool, setCurrentTool]);

  return { fitToViewport, zoomIn, zoomOut, resetZoom, handleManualZoomApply, hasInitialFitRef };
}
