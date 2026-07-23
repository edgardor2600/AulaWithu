import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import * as fabric from 'fabric';
import api from '../services/api';
import toast from 'react-hot-toast';
import { parsePptx, parseDocx, parseXlsx } from '../utils/presenterParser';

export function usePresenter(
  sessionId: string | null,
  canvas: fabric.Canvas | null,
  ydoc: Y.Doc | null,
  isTeacher: boolean
) {
  const [isActive, setIsActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [slideUrls, setSlideUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showPresenterPanel, setShowPresenterPanel] = useState(false);

  // Shared Yjs map for presenter state
  const yPresenterRef = useRef<Y.Map<any> | null>(null);

  // Smooth panning helper
  const animatePan = useCallback((targetX: number, targetY: number, duration: number = 400) => {
    if (!canvas) return;
    const vpt = canvas.viewportTransform;
    if (!vpt) return;

    const startX = vpt[4];
    const startY = vpt[5];
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out

      if (vpt) {
        vpt[4] = startX + (targetX - startX) * ease;
        vpt[5] = startY + (targetY - startY) * ease;
        canvas?.requestRenderAll();
      }


      if (t < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }, [canvas]);

  // Center canvas on slide coords
  const centerOnSlide = useCallback((index: number) => {
    if (!canvas || index < 0) return;
    const isDocx = fileType === 'docx';
    const slideH = isDocx ? 1200 : 720;
    const stepY = slideH + 100;
    const targetX = 0;
    const targetY = index * stepY + (slideH / 2);

    const zoom = canvas.getZoom();
    const targetPanX = -targetX * zoom + canvas.getWidth() / 2;
    const targetPanY = -targetY * zoom + canvas.getHeight() / 2;

    animatePan(targetPanX, targetPanY, 400);
  }, [canvas, animatePan, fileType]);

  // Load / Sync Yjs Map
  useEffect(() => {
    if (!ydoc) return;
    const yPresenter = ydoc.getMap('presenterState');
    yPresenterRef.current = yPresenter;

    const handleSync = () => {
      const active = !!yPresenter.get('isActive');
      const name = (yPresenter.get('fileName') as string) || '';
      const type = (yPresenter.get('fileType') as string) || '';
      const urls = (yPresenter.get('slideUrls') as string[]) || [];
      const idx = yPresenter.get('currentIndex') !== undefined ? Number(yPresenter.get('currentIndex')) : -1;

      setIsActive(active);
      setFileName(name);
      setFileType(type);
      setSlideUrls(urls);
      setCurrentIndex(idx);

      if (active && urls.length > 0 && idx >= 0) {
        setShowPresenterPanel(true);
      } else {
        setShowPresenterPanel(false);
      }
    };

    yPresenter.observe(handleSync);
    handleSync(); // initial load

    return () => {
      yPresenter.unobserve(handleSync);
    };
  }, [ydoc]);

  // Fetch initial state from DB (persistence across page refresh / rejoin)
  useEffect(() => {
    if (!sessionId) return;

    const fetchDBState = async () => {
      try {
        const res = await api.get(`/presenter/${sessionId}`);
        if (res.data.success && res.data.material) {
          const m = res.data.material;
          const yPresenter = yPresenterRef.current;
          if (yPresenter && isTeacher) {
            yPresenter.set('isActive', true);
            yPresenter.set('fileName', m.file_name);
            yPresenter.set('fileType', m.file_type);
            yPresenter.set('slideUrls', m.slide_urls);
            yPresenter.set('currentIndex', m.current_slide_index ?? 0);
          }

          // ALWAYS restore local React state
          setIsActive(true);
          setFileName(m.file_name);
          setFileType(m.file_type);
          setSlideUrls(m.slide_urls || []);
          setCurrentIndex(m.current_slide_index ?? 0);
        }
      } catch (e) {
        // Silently skip if no material exists
      }
    };

    fetchDBState();
  }, [sessionId, isTeacher]);

  // Effect to automatically pan viewport when index updates
  useEffect(() => {
    if (!canvas || !isActive || currentIndex < 0 || slideUrls.length === 0) return;
    centerOnSlide(currentIndex);
  }, [currentIndex, isActive, slideUrls, canvas, centerOnSlide]);


  // Ensure current slide image is actually placed on canvas (Teacher adds it, Yjs handles replication)
  const ensureSlidePlaced = useCallback(async (index: number) => {
    if (!canvas || index < 0 || slideUrls.length === 0) return;
    const slideId = `slide_${index}`;
    const existing = canvas.getObjects().find((o: any) => o.id === slideId);

    const isDocx = fileType === 'docx';
    const slideW = isDocx ? 900 : 1280;
    const slideH = isDocx ? 1200 : 720;
    const stepY = slideH + 100;

    if (!existing && isTeacher) {
      try {
        const img = await fabric.FabricImage.fromURL(slideUrls[index], {
          crossOrigin: 'anonymous',
        });
        
        img.set({
          left: -slideW / 2,
          top: index * stepY,
          width: slideW,
          height: slideH,
          selectable: isTeacher,
          evented: isTeacher,
          hasControls: isTeacher,
          hasBorders: isTeacher,
          lockMovementX: !isTeacher,
          lockMovementY: !isTeacher,
          lockScalingX: !isTeacher,
          lockScalingY: !isTeacher,
          lockRotation: !isTeacher,
          // @ts-ignore
          id: slideId,
        });

        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
      } catch (err) {
        console.error('Error placing slide on canvas:', err);
      }
    }
  }, [canvas, slideUrls, isTeacher, fileType]);


  // 1. Smart Slide Preloading (0ms switching latency for N, N-1, N+1)
  useEffect(() => {
    if (!canvas || !isActive || currentIndex < 0 || slideUrls.length === 0) return;
    
    ensureSlidePlaced(currentIndex);

    // Preload next slide in background
    if (currentIndex + 1 < slideUrls.length) {
      ensureSlidePlaced(currentIndex + 1);
    }
    // Preload previous slide in background
    if (currentIndex - 1 >= 0) {
      ensureSlidePlaced(currentIndex - 1);
    }
  }, [canvas, isActive, currentIndex, slideUrls, ensureSlidePlaced]);

  // 2. Group Annotations: Sync drawings/notes when slide moves or scales on canvas
  useEffect(() => {
    if (!canvas || !isTeacher) return;

    const handleObjectMoving = (e: any) => {
      const target = e.target;
      if (!target || !target.id || !target.id.startsWith('slide_')) return;

      const activeObjects = canvas.getActiveObjects ? canvas.getActiveObjects() : [];

      const currentLeft = target.left || 0;
      const currentTop = target.top || 0;
      const prevLeft = target._prevLeft !== undefined ? target._prevLeft : currentLeft;
      const prevTop = target._prevTop !== undefined ? target._prevTop : currentTop;

      const deltaX = currentLeft - prevLeft;
      const deltaY = currentTop - prevTop;

      if (deltaX === 0 && deltaY === 0) return;

      const slideW = (target.width || 1280) * (target.scaleX || 1);
      const slideH = (target.height || 720) * (target.scaleY || 1);
      const slideBounds = {
        left: prevLeft,
        top: prevTop,
        right: prevLeft + slideW,
        bottom: prevTop + slideH,
      };

      const canvasObjects = canvas.getObjects();
      canvasObjects.forEach((obj: any) => {
        // Skip slide background objects and objects already being moved directly in active selection
        if (obj.id && (obj.id.startsWith('slide_') || obj.id.startsWith('presenter_'))) return;
        if (activeObjects.includes(obj)) return;

        const objX = obj.left || 0;
        const objY = obj.top || 0;

        if (
          objX >= slideBounds.left - 50 &&
          objX <= slideBounds.right + 50 &&
          objY >= slideBounds.top - 50 &&
          objY <= slideBounds.bottom + 50
        ) {
          obj.set({
            left: objX + deltaX,
            top: objY + deltaY,
          });
          obj.setCoords();
        }
      });

      target._prevLeft = currentLeft;
      target._prevTop = currentTop;
      canvas.renderAll();
    };


    const handleObjectSelection = (e: any) => {
      const target = e.target;
      if (target && target.id && target.id.startsWith('slide_')) {
        target._prevLeft = target.left || 0;
        target._prevTop = target.top || 0;
      }
    };

    canvas.on('object:moving', handleObjectMoving);
    canvas.on('mouse:down', handleObjectSelection);
    canvas.on('selection:created', handleObjectSelection);

    return () => {
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('mouse:down', handleObjectSelection);
      canvas.off('selection:created', handleObjectSelection);
    };
  }, [canvas, isTeacher]);



  // Handle slide change
  const showSlide = useCallback(async (index: number) => {
    if (index < 0 || index >= slideUrls.length) return;

    if (isTeacher && yPresenterRef.current) {
      yPresenterRef.current.set('currentIndex', index);
    } else {
      setCurrentIndex(index);
    }

    // Pre-add slide image to canvas
    await ensureSlidePlaced(index);

    // Persist index in DB if active session exists
    if (sessionId) {
      try {
        await api.put(`/presenter/${sessionId}/slide`, {
          current_slide_index: index,
        });
      } catch (e) {
        console.warn('Failed to sync slide index to DB:', e);
      }
    }
    centerOnSlide(index);
  }, [slideUrls, isTeacher, sessionId, ensureSlidePlaced, centerOnSlide]);

  // Start presentation (upload and parse)
  const startPresentation = useCallback(async (file: File) => {
    const activeSessionId = sessionId || 'standalone_session';

    setIsLoading(true);
    setLoadingMessage('Analizando archivo...');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let slides: Array<{ label: string; dataURL: string }> = [];

      if (ext === 'pptx') {
        slides = await parsePptx(file, msg => setLoadingMessage(msg));
      } else if (ext === 'docx') {
        slides = await parseDocx(file, msg => setLoadingMessage(msg));
      } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        slides = await parseXlsx(file, msg => setLoadingMessage(msg));
      } else {
        throw new Error('Formato de archivo no soportado. Sube PPTX, DOCX o XLSX.');
      }

      setLoadingMessage(`Subiendo ${slides.length} imágenes procesadas...`);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < slides.length; i++) {
        setLoadingMessage(`Subiendo diapositiva ${i + 1} de ${slides.length}...`);
        
        // Convert base64 dataURL to Blob
        const resBlob = await fetch(slides[i].dataURL);
        const blob = await resBlob.blob();
        const slideFile = new File([blob], `slide_${i}.png`, { type: 'image/png' });

        const formData = new FormData();
        formData.append('file', slideFile);

        const uploadRes = await api.post('/uploads', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (uploadRes.data && uploadRes.data.upload) {
          // Reutilizar construcción de URL absoluta
          const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
          const serverBaseURL = baseURL.replace('/api', '');
          const relativeUrl = uploadRes.data.upload.url;
          const absoluteURL = relativeUrl.startsWith('http') 
            ? relativeUrl 
            : `${serverBaseURL}${relativeUrl}`;
          uploadedUrls.push(absoluteURL);
        } else {
          throw new Error('Error al subir una de las diapositivas');
        }
      }

      setLoadingMessage('Guardando material de la sesión...');
      // 1. Save in Database (silently skip if non-live session or DB error)
      try {
        await api.post('/presenter', {
          session_id: activeSessionId,
          file_name: file.name,
          file_type: ext || '',
          slide_urls: uploadedUrls,
          current_slide_index: 0,
        });
      } catch (dbErr) {
        console.warn('DB persistence skipped for presenter material:', dbErr);
      }

      // 2. Sync to Yjs or fallback to local state
      const yPresenter = yPresenterRef.current;
      if (yPresenter) {
        yPresenter.set('isActive', true);
        yPresenter.set('fileName', file.name);
        yPresenter.set('fileType', ext || '');
        yPresenter.set('slideUrls', uploadedUrls);
        yPresenter.set('currentIndex', 0);
      }

      // Local state fallback
      setIsActive(true);
      setFileName(file.name);
      setFileType(ext || '');
      setSlideUrls(uploadedUrls);
      setCurrentIndex(0);
      setShowPresenterPanel(true);

      // Pre-render first slide image on canvas
      try {
        if (canvas) {
          const fabricModule = await import('fabric');
          const img = await fabricModule.FabricImage.fromURL(uploadedUrls[0], {
            crossOrigin: 'anonymous',
          });
          const isDocx = (ext || '').toLowerCase() === 'docx';
          const slideW = isDocx ? 900 : 1280;
          const slideH = isDocx ? 1200 : 720;

          img.set({
            left: -slideW / 2,
            top: 0,
            width: slideW,
            height: slideH,
            selectable: isTeacher,
            evented: isTeacher,
            hasControls: isTeacher,
            hasBorders: isTeacher,
            lockMovementX: !isTeacher,
            lockMovementY: !isTeacher,
            lockScalingX: !isTeacher,
            lockScalingY: !isTeacher,
            lockRotation: !isTeacher,
            // @ts-ignore
            id: 'slide_0',
          });


          canvas.add(img);
          canvas.sendObjectToBack(img);
          canvas.renderAll();
          centerOnSlide(0);
        }
      } catch (e) {
        console.warn('Error adding initial slide to canvas:', e);
      }


      toast.success('Presentación iniciada con éxito');
    } catch (error: any) {
      console.error('Error starting presentation:', error);
      toast.error(error.message || 'Error al iniciar la presentación');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [sessionId, canvas]);


  // End presentation (remove from DB, Yjs and Canvas)
  const endPresentation = useCallback(async () => {
    const confirmEnd = window.confirm('¿Deseas eliminar la presentación actual y volver al tablero normal?');
    if (!confirmEnd) return;

    setIsLoading(true);
    setLoadingMessage('Finalizando presentación...');

    try {
      // 1. Delete from database if session exists
      if (sessionId) {
        try {
          await api.delete(`/presenter/${sessionId}`);
        } catch (e) {
          console.warn('DB delete skipped for presenter:', e);
        }
      }

      // 2. Remove all slide objects from Canvas and reset viewport/zoom
      if (canvas) {
        const objects = canvas.getObjects();
        const slidesToRemove = objects.filter((obj: any) => obj.id && (obj.id.startsWith('slide_') || obj.id.startsWith('presenter_')));
        slidesToRemove.forEach(obj => canvas.remove(obj));

        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        canvas.setZoom(1);
        canvas.renderAll();
      }

      // 3. Clear from Yjs
      const yPresenter = yPresenterRef.current;
      if (yPresenter) {
        yPresenter.set('isActive', false);
        yPresenter.set('fileName', '');
        yPresenter.set('fileType', '');
        yPresenter.set('slideUrls', []);
        yPresenter.set('currentIndex', -1);
      }

      // 4. Clear local state
      setIsActive(false);
      setFileName('');
      setFileType('');
      setSlideUrls([]);
      setCurrentIndex(-1);
      setShowPresenterPanel(false);

      toast.success('Presentación eliminada. Volviendo al tablero normal.');
    } catch (error: any) {
      console.error('Error ending presentation:', error);
      toast.error('Error al finalizar la presentación');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [sessionId, canvas]);


  // Export active slide with all annotations as HD PNG download
  const exportCurrentSlide = useCallback(async () => {
    if (!canvas || currentIndex < 0 || slideUrls.length === 0) return;

    try {
      const slideId = `slide_${currentIndex}`;
      const slideObj = canvas.getObjects().find((o: any) => o.id === slideId);

      const slideLeft = slideObj ? slideObj.left : -640;
      const slideTop = slideObj ? slideObj.top : currentIndex * (720 + 100);
      const slideW = slideObj ? (slideObj.width * (slideObj.scaleX || 1)) : 1280;
      const slideH = slideObj ? (slideObj.height * (slideObj.scaleY || 1)) : 720;

      const dataURL = canvas.toDataURL({
        format: 'png',
        left: slideLeft,
        top: slideTop,
        width: slideW,
        height: slideH,
        multiplier: 2, // HD quality 2560x1440
      });

      const link = document.createElement('a');
      const cleanFileName = (fileName || 'presentacion').replace(/\.[^/.]+$/, '');
      link.download = `${cleanFileName}_diapositiva_${currentIndex + 1}_editada.png`;
      link.href = dataURL;
      link.click();

      toast.success(`Diapositiva ${currentIndex + 1} descargada en alta resolución (HD)`);
    } catch (err) {
      console.error('Error al exportar diapositiva:', err);
      toast.error('Error al descargar la diapositiva');
    }
  }, [canvas, currentIndex, slideUrls, fileName]);

  return {
    isActive,
    fileName,
    fileType,
    slideUrls,
    currentIndex,
    isLoading,
    loadingMessage,
    showPresenterPanel,
    setShowPresenterPanel,
    startPresentation,
    showSlide,
    endPresentation,
    centerOnSlide,
    exportCurrentSlide,
  };
}

