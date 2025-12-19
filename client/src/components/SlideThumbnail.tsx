import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';

interface SlideThumbnailProps {
  canvasData: string;
  slideNumber: number;
}

export const SlideThumbnail = ({ canvasData, slideNumber }: SlideThumbnailProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create a small canvas for thumbnail
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 200,
      height: 112.5, // 16:9 ratio
      backgroundColor: '#ffffff',
      selection: false,
      renderOnAddRemove: false,
    });

    fabricCanvasRef.current = canvas;

    // Load canvas data if exists
    const loadThumbnail = async () => {
      if (canvasData && canvasData.trim() && canvasData !== '{}' && canvasData !== 'null') {
        try {
          const data = JSON.parse(canvasData);
          if (data && data.objects && data.objects.length > 0) {
            // Use enlivenObjects instead of loadFromJSON
            
            fabric.util.enlivenObjects(data.objects).then((enlivenedObjects: any[]) => {
              enlivenedObjects.forEach((obj) => {
                // Scale down to fit thumbnail (200 / 1200 = 0.1666)
                const scale = 200 / 1200;
                
                obj.scaleX = (obj.scaleX || 1) * scale;
                obj.scaleY = (obj.scaleY || 1) * scale;
                obj.left = (obj.left || 0) * scale;
                obj.top = (obj.top || 0) * scale;

                // Si es un path, asegurar grosor mínimo ABSOLUTO para que sea visible (mínimo 1.5px reales)
                const originalStroke = obj.strokeWidth || 2;
                const scaledStroke = originalStroke * scale;
                obj.strokeWidth = Math.max(scaledStroke, 1.5);
                
                obj.setCoords();
                canvas.add(obj);
              });
              
              canvas.renderAll();
              // Doble render para asegurar que objetos asíncronos (texto/imágenes) se vean
              setTimeout(() => {
                canvas.requestRenderAll();
                console.log('Thumbnail re-rendered for slide:', slideNumber);
              }, 200);
            }).catch((err: any) => {
              console.error('Thumbnail enliven error:', err);
            });
          }
        } catch (error) {
          console.error('Error loading thumbnail:', error);
        }
      }
    };

    loadThumbnail();

    return () => {
      canvas.dispose();
    };
  }, [canvasData]);

  return (
    <div className="aspect-video bg-white rounded-t flex items-center justify-center relative overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {(!canvasData || canvasData === '{}' || canvasData === 'null') && (
        <span className="text-2xl font-bold text-gray-300 relative z-10">
          {slideNumber}
        </span>
      )}
    </div>
  );
};
