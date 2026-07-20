import { useState, useCallback } from 'react';
import * as fabric from 'fabric';
import toast from 'react-hot-toast';
import { BOARD_THEMES, type BoardTheme } from '../types/canvas';

export interface UseCanvasBoardThemeReturn {
  boardTheme: BoardTheme;
  showThemeMenu: boolean;
  setShowThemeMenu: React.Dispatch<React.SetStateAction<boolean>>;
  applyBoardTheme: (theme: BoardTheme) => void;
}

export function useCanvasBoardTheme(
  fabricCanvasRef: React.MutableRefObject<fabric.Canvas | null>
): UseCanvasBoardThemeReturn {
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('white');
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const applyBoardTheme = useCallback(
    (theme: BoardTheme) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      canvas.backgroundColor = BOARD_THEMES[theme].bg;
      canvas.renderAll();
      setBoardTheme(theme);
      setShowThemeMenu(false);
      toast.success(`Tema: ${BOARD_THEMES[theme].label}`);
    },
    [fabricCanvasRef]
  );

  return { boardTheme, showThemeMenu, setShowThemeMenu, applyBoardTheme };
}
