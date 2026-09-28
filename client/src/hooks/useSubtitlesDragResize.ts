import { useState } from 'react';

interface SubtitlesState {
  pos: { x: number; y: number };
  size: { width: number; height: number };
}

interface UseSubtitlesDragResizeReturn extends SubtitlesState {
  handleDragStart: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
  handleResizeStart: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
}

export function useSubtitlesDragResize(): UseSubtitlesDragResizeReturn {
  const [pos, setPos] = useState({
    x: window.innerWidth / 2 - 200,
    y: window.innerHeight - 150,
  });
  const [size, setSize] = useState({ width: 400, height: 75 });

  const handleDragStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    // Don't drag when clicking the resize handle
    if ((e.target as HTMLElement).closest('#conversation-subtitles-resize')) return;

    const isTouch = e.type === 'touchstart';
    const clientX = isTouch
      ? (e as React.TouchEvent).touches[0].clientX
      : (e as React.MouseEvent).clientX;
    const clientY = isTouch
      ? (e as React.TouchEvent).touches[0].clientY
      : (e as React.MouseEvent).clientY;

    const startX = clientX;
    const startY = clientY;
    const initialX = pos.x;
    const initialY = pos.y;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const isMoveTouch = moveEvent.type === 'touchmove';
      const moveX = isMoveTouch
        ? (moveEvent as TouchEvent).touches[0].clientX
        : (moveEvent as MouseEvent).clientX;
      const moveY = isMoveTouch
        ? (moveEvent as TouchEvent).touches[0].clientY
        : (moveEvent as MouseEvent).clientY;

      setPos({ x: initialX + (moveX - startX), y: initialY + (moveY - startY) });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  };

  const handleResizeStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const isTouch = e.type === 'touchstart';
    const clientX = isTouch
      ? (e as React.TouchEvent).touches[0].clientX
      : (e as React.MouseEvent).clientX;
    const clientY = isTouch
      ? (e as React.TouchEvent).touches[0].clientY
      : (e as React.MouseEvent).clientY;

    const startX = clientX;
    const startY = clientY;
    const initialWidth = size.width;
    const initialHeight = size.height;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const isMoveTouch = moveEvent.type === 'touchmove';
      const moveX = isMoveTouch
        ? (moveEvent as TouchEvent).touches[0].clientX
        : (moveEvent as MouseEvent).clientX;
      const moveY = isMoveTouch
        ? (moveEvent as TouchEvent).touches[0].clientY
        : (moveEvent as MouseEvent).clientY;

      setSize({
        width: Math.max(250, initialWidth + (moveX - startX)),
        height: Math.max(60, initialHeight + (moveY - startY)),
      });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  };

  return { pos, size, handleDragStart, handleResizeStart };
}
