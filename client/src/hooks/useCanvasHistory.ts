import { useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';

export interface UseCanvasHistoryReturn {
  serializeCanvas: (canvas: fabric.Canvas) => string;
  saveHistory: () => void;
  shouldSkipCanvasPersistence: (obj?: fabric.Object | null) => boolean;
  notifyChange: () => void;
  restoreCanvasState: (canvas: fabric.Canvas, serializedState: string) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  isLoadingRef: React.MutableRefObject<boolean>;
  isUndoRedoRef: React.MutableRefObject<boolean>;
}

export function useCanvasHistory(
  fabricCanvasRef: React.MutableRefObject<fabric.Canvas | null>,
  onChange?: (canvasData: string) => void
): UseCanvasHistoryReturn {
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const isLoadingRef = useRef(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const serializeCanvas = useCallback((canvas: fabric.Canvas) => {
    const json = canvas.toJSON();
    json.objects = canvas
      .getObjects()
      .filter((obj: any) => !obj.excludeFromSerialization)
      .map((obj: any) => {
        const objJson = obj.toObject();
        objJson.id = obj.id;
        objJson.createdBy = obj.createdBy;
        return objJson;
      });
    return JSON.stringify(json);
  }, []);

  const shouldSkipCanvasPersistence = useCallback((obj?: fabric.Object | null) => {
    const candidate = obj as any;
    return !!candidate?.excludeFromHistory || !!candidate?.excludeFromSerialization;
  }, []);

  const notifyChange = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !onChange) return;
    onChange(serializeCanvas(canvas));
  }, [fabricCanvasRef, onChange, serializeCanvas]);

  const saveHistory = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isUndoRedoRef.current || isLoadingRef.current) return;

    const currentState = serializeCanvas(canvas);

    if (historyRef.current[historyIndexRef.current] === currentState) {
      console.log('State unchanged, skipping history save');
      return;
    }

    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(currentState);
    historyIndexRef.current++;

    console.log('History saved. Index:', historyIndexRef.current, 'Total:', historyRef.current.length);

    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, [fabricCanvasRef, serializeCanvas]);

  const restoreCanvasState = useCallback(async (canvas: fabric.Canvas, serializedState: string) => {
    const state = JSON.parse(serializedState);
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    if (state.objects && state.objects.length > 0) {
      const enlivenedObjects = await fabric.util.enlivenObjects(state.objects);
      enlivenedObjects.forEach((obj: any) => canvas.add(obj));
    }
    canvas.renderAll();
  }, []);

  const undo = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current <= 0) {
      console.log('Cannot undo. Index:', historyIndexRef.current);
      return;
    }

    console.log('Undo: Going from index', historyIndexRef.current, 'to', historyIndexRef.current - 1);
    isUndoRedoRef.current = true;
    historyIndexRef.current--;

    const targetState = historyRef.current[historyIndexRef.current];
    const parsedState = JSON.parse(targetState);
    console.log('Restoring state with', parsedState.objects?.length || 0, 'objects');

    await restoreCanvasState(canvas, targetState);
    console.log('Undo complete');

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);

    setTimeout(() => {
      isUndoRedoRef.current = false;
      console.log('Undo flag cleared, notifying parent');
      if (onChange) onChange(serializeCanvas(canvas));
    }, 500);
  }, [fabricCanvasRef, restoreCanvasState, serializeCanvas, onChange]);

  const redo = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;

    isUndoRedoRef.current = true;
    historyIndexRef.current++;

    const targetState = historyRef.current[historyIndexRef.current];
    await restoreCanvasState(canvas, targetState);

    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);

    setTimeout(() => {
      isUndoRedoRef.current = false;
      console.log('Redo flag cleared, notifying parent');
      if (onChange) onChange(serializeCanvas(canvas));
    }, 500);
  }, [fabricCanvasRef, restoreCanvasState, serializeCanvas, onChange]);

  return {
    serializeCanvas,
    saveHistory,
    shouldSkipCanvasPersistence,
    notifyChange,
    restoreCanvasState,
    undo,
    redo,
    canUndo,
    canRedo,
    isLoadingRef,
    isUndoRedoRef,
  };
}
