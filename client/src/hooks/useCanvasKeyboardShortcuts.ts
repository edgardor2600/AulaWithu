import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { isEditableTarget } from '../types/canvasEditor';
import type { Tool } from '../types/canvas';

export interface UseCanvasKeyboardShortcutsParams {
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>;
  isReady: boolean;
  isReadOnly: boolean;
  currentTool: Tool;
  isSpacePressed: boolean;
  setIsSpacePressed: (val: boolean) => void;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  undo: () => void;
  redo: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  paste: () => void;
  deleteSelected: () => void;
  handleSave: () => void;
  handleToolClick: (tool: Tool) => void;
}

/**
 * Attaches window-level keydown/keyup listeners for canvas keyboard shortcuts.
 * Also returns isSpacePressedRef so callers can read the latest value
 * from event handlers without stale closures.
 */
export function useCanvasKeyboardShortcuts({
  fabricCanvasRef,
  isReady,
  isReadOnly,
  currentTool,
  isSpacePressed,
  setIsSpacePressed,
  setShowShortcuts,
  undo,
  redo,
  copySelected,
  cutSelected,
  paste,
  deleteSelected,
  handleSave,
  handleToolClick,
}: UseCanvasKeyboardShortcutsParams): { isSpacePressedRef: React.RefObject<boolean> } {
  // Mutable ref so pan handlers always read the latest value without re-registering
  const isSpacePressedRef = useRef(isSpacePressed);
  useEffect(() => {
    isSpacePressedRef.current = isSpacePressed;
  }, [isSpacePressed]);

  useEffect(() => {
    if (!isReady || isReadOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const canvas = fabricCanvasRef.current;
      const activeObject = canvas?.getActiveObject();
      const key = e.key.toLowerCase();

      // Don't intercept if editing text
      if (activeObject && activeObject instanceof fabric.IText && (activeObject as any).isEditing) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'z')
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Copy: Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && key === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }

      // Cut: Ctrl+X / Cmd+X
      if ((e.ctrlKey || e.metaKey) && key === 'x') {
        e.preventDefault();
        cutSelected();
        return;
      }

      // Paste: Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && key === 'v') {
        e.preventDefault();
        paste();
        return;
      }

      // Delete: Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Save: Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      if (!e.ctrlKey && !e.metaKey) {
        if (key === 'v') { e.preventDefault(); handleToolClick('select'); return; }
        if (key === 'p') { e.preventDefault(); handleToolClick('pencil'); return; }
        if (key === 'r') { e.preventDefault(); handleToolClick('rectangle'); return; }
        if (key === 'c') { e.preventDefault(); handleToolClick('circle'); return; }
        if (key === 'l') { e.preventDefault(); handleToolClick('line'); return; }
        if (key === 'a') { e.preventDefault(); handleToolClick('arrow'); return; }
        if (key === 't') { e.preventDefault(); handleToolClick('text'); return; }
        if (key === 'e') { e.preventDefault(); handleToolClick('eraser'); return; }
        if (key === 'h') { e.preventDefault(); handleToolClick('hand'); return; }
        if (key === 'i') { e.preventDefault(); handleToolClick('image'); return; }
        if (key === 'x') { e.preventDefault(); handleToolClick('cut'); return; }

        if (key === 'escape' && canvas) {
          setShowShortcuts(false);
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          return;
        }
      }

      // Space — temporary pan mode
      if (e.key === ' ' && currentTool !== 'hand') {
        e.preventDefault();
        if (!isSpacePressedRef.current) {
          setIsSpacePressed(true);
          if (canvas) {
            canvas.defaultCursor = 'grab';
            canvas.hoverCursor = 'grab';
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsSpacePressed(false);
        const canvas = fabricCanvasRef.current;
        if (canvas && currentTool !== 'hand') {
          canvas.defaultCursor = 'default';
          canvas.hoverCursor = 'move';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    fabricCanvasRef,
    isReady,
    isReadOnly,
    currentTool,
    undo,
    redo,
    copySelected,
    cutSelected,
    paste,
    deleteSelected,
    handleSave,
    handleToolClick,
    setShowShortcuts,
    setIsSpacePressed,
  ]);

  return { isSpacePressedRef };
}
