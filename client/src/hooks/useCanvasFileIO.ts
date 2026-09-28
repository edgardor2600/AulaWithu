import { useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import toast from 'react-hot-toast';
import { uploadImage } from '../services/uploadService';

interface UseCanvasFileIOParams {
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>;
  slideId: string;
  serializeCanvas: (canvas: fabric.Canvas) => string;
  restoreCanvasState: (canvas: fabric.Canvas, data: string) => Promise<void>;
  saveHistory: () => void;
  notifyChange: () => void;
  isLoadingRef: React.RefObject<boolean>;
}

interface UseCanvasFileIOReturn {
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  jsonInputRef: React.RefObject<HTMLInputElement | null>;
  presentationInputRef: React.RefObject<HTMLInputElement | null>;
  triggerImageUpload: () => void;
  importJSON: () => void;
  handleImageFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleJSONFileLoad: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  exportJSON: () => void;
  exportPNG: () => void;
  exportSVG: () => void;
  clearCanvas: () => void;
}

export function useCanvasFileIO({
  fabricCanvasRef,
  slideId,
  serializeCanvas,
  restoreCanvasState,
  saveHistory,
  notifyChange,
  isLoadingRef,
}: UseCanvasFileIOParams): UseCanvasFileIOReturn {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const presentationInputRef = useRef<HTMLInputElement | null>(null);

  const triggerImageUpload = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const importJSON = useCallback(() => {
    jsonInputRef.current?.click();
  }, []);

  // ── Add image from URL to canvas ───────────────────────────────────────────
  const addImageToCanvas = async (imageUrl: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' });

    const maxWidth = canvas.width! * 0.5;
    const maxHeight = canvas.height! * 0.5;
    const scaleX = maxWidth / (img.width || 1);
    const scaleY = maxHeight / (img.height || 1);
    const scale = Math.min(scaleX, scaleY, 1);

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
    canvas.renderAll();
    setTimeout(() => saveHistory(), 100);
  };

  // ── Image file select handler ───────────────────────────────────────────────
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      const loadingToast = toast.loading('Uploading image...');
      const upload = await uploadImage(file);
      toast.dismiss(loadingToast);
      await addImageToCanvas(upload.url);
      toast.success('Image added to canvas!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    }
  };

  // ── JSON import handler ────────────────────────────────────────────────────
  const handleJSONFileLoad = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        e.target.value = '';
        return;
      }

      try {
        const fileContents = await file.text();
        JSON.parse(fileContents); // Validate JSON

        isLoadingRef.current = true;
        await restoreCanvasState(canvas, fileContents);
        isLoadingRef.current = false;

        saveHistory();
        notifyChange();
        toast.success('Pizarra cargada desde backup');
      } catch (error) {
        isLoadingRef.current = false;
        console.error('Error importing JSON:', error);
        toast.error('Archivo JSON invalido o incompatible');
      } finally {
        e.target.value = '';
      }
    },
    [fabricCanvasRef, restoreCanvasState, saveHistory, notifyChange, isLoadingRef]
  );

  // ── Export JSON ────────────────────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const json = serializeCanvas(canvas);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `slide-${slideId}-backup.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Backup JSON descargado');
  }, [fabricCanvasRef, serializeCanvas, slideId]);

  // ── Export PNG ─────────────────────────────────────────────────────────────
  const exportPNG = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    const link = document.createElement('a');
    link.download = `slide-${slideId}.png`;
    link.href = dataURL;
    link.click();
    toast.success('Imagen PNG exportada');
  }, [fabricCanvasRef, slideId]);

  // ── Export SVG ─────────────────────────────────────────────────────────────
  const exportSVG = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const svg = canvas.toSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `slide-${slideId}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Vector SVG exportado');
  }, [fabricCanvasRef, slideId]);

  // ── Clear canvas ───────────────────────────────────────────────────────────
  const clearCanvas = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (confirm('Are you sure you want to clear the canvas?')) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
      saveHistory();
      toast.success('Canvas cleared');
    }
  }, [fabricCanvasRef, saveHistory]);

  return {
    imageInputRef,
    jsonInputRef,
    presentationInputRef,
    triggerImageUpload,
    importJSON,
    handleImageFileSelect,
    handleJSONFileLoad,
    exportJSON,
    exportPNG,
    exportSVG,
    clearCanvas,
  };
}
