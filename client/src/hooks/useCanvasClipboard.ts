import { useRef, useCallback, useEffect } from 'react';
import * as fabric from 'fabric';
import toast from 'react-hot-toast';

export interface UseCanvasClipboardReturn {
  copySelected: () => Promise<void>;
  cutSelected: () => Promise<void>;
  paste: () => Promise<void>;
}

export function useCanvasClipboard(
  fabricCanvasRef: React.MutableRefObject<fabric.Canvas | null>,
  isReadOnly: boolean
): UseCanvasClipboardReturn {
  const clipboardRef = useRef<any>(null);

  const copySelected = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      try {
        const cloned = await activeObject.clone();
        clipboardRef.current = cloned;
        toast.success('Copied!');
      } catch (error) {
        console.error('Error copying:', error);
      }
    }
  }, [fabricCanvasRef]);

  const cutSelected = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      const cloned = await activeObject.clone();
      clipboardRef.current = cloned;
      canvas.remove(activeObject);
      canvas.discardActiveObject();
      canvas.renderAll();
      toast.success('Cut!');
    }
  }, [fabricCanvasRef]);

  const paste = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !clipboardRef.current) return;
    try {
      const clonedObj = await clipboardRef.current.clone();
      canvas.discardActiveObject();
      clonedObj.set({
        left: (clonedObj.left || 0) + 10,
        top: (clonedObj.top || 0) + 10,
        evented: true,
      });
      if (clonedObj.type === 'activeSelection') {
        clonedObj.canvas = canvas;
        clonedObj.forEachObject((obj: any) => { canvas.add(obj); });
        clonedObj.setCoords();
      } else {
        canvas.add(clonedObj);
      }
      clipboardRef.current.set({
        top: (clipboardRef.current.top || 0) + 10,
        left: (clipboardRef.current.left || 0) + 10,
      });
      canvas.setActiveObject(clonedObj);
      canvas.requestRenderAll();
      toast.success('Pegado!');
    } catch (error) {
      console.error('Error pasting:', error);
    }
  }, [fabricCanvasRef]);

  // External clipboard paste — images and text from OS (Ctrl+V from browser/OS)
  useEffect(() => {
    if (isReadOnly) return;
    const handleExternalPaste = async (e: ClipboardEvent) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      )
        return;

      const items = e.clipboardData?.items;
      if (!items) return;

      // Priority 1: image
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (!blob) continue;
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            if (!dataUrl) return;
            const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });
            const maxW = canvas.width! * 0.7;
            const maxH = canvas.height! * 0.7;
            const scale = Math.min(1, maxW / (img.width || 1), maxH / (img.height || 1));
            img.set({
              left: canvas.width! / 2,
              top: canvas.height! / 2,
              scaleX: scale,
              scaleY: scale,
              originX: 'center',
              originY: 'center',
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
            toast.success('Imagen pegada desde portapapeles');
          };
          reader.readAsDataURL(blob);
          return;
        }
      }

      // Priority 2: plain text
      for (let i = 0; i < items.length; i++) {
        if (items[i].type === 'text/plain') {
          items[i].getAsString((text) => {
            if (!text?.trim()) return;
            e.preventDefault();
            const textObj = new fabric.IText(text.trim(), {
              left: canvas.width! / 2,
              top: canvas.height! / 2,
              originX: 'center',
              originY: 'center',
              fontSize: 20,
              fill: '#000000',
              fontFamily: 'Inter, sans-serif',
            });
            canvas.add(textObj);
            canvas.setActiveObject(textObj);
            canvas.requestRenderAll();
            toast.success('Texto pegado desde portapapeles');
          });
          return;
        }
      }
    };

    window.addEventListener('paste', handleExternalPaste);
    return () => window.removeEventListener('paste', handleExternalPaste);
  }, [fabricCanvasRef, isReadOnly]);

  return { copySelected, cutSelected, paste };
}
