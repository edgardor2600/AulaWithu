import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { 
  Pencil, 
  Square, 
  Circle as CircleIcon, 
  Triangle as TriangleIcon,
  Type, 
  Eraser, 
  MousePointer,
  Minus,
  Trash2,
  Save,
  FileDown,
  Undo2,
  Redo2,
  Users,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  ArrowRight,
  ImageIcon,
  FolderOpen,
  Keyboard,
  Volume2,
  Activity,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  BookOpen,
  MessageSquare,
  MonitorUp,
  Scissors,
  Palette
} from 'lucide-react';
import { useReading } from '../hooks/useReading';
import { useConversation } from '../hooks/useConversation';
import { ConversationPanel } from './ConversationPanel';
import toast from 'react-hot-toast';
import { useYjs } from '../hooks/useYjs';
import { uploadImage } from '../services/uploadService';
import { useCanvasHistory } from '../hooks/useCanvasHistory';
import { useCanvasClipboard } from '../hooks/useCanvasClipboard';
import { useScreenShare } from '../hooks/useScreenShare';
import { useCanvasBoardTheme } from '../hooks/useCanvasBoardTheme';
import { BOARD_THEMES, type Tool, type BoardTheme } from '../types/canvas';

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  );
};

interface CanvasEditorProps {
  slideId: string;
  initialData?: string;
  onSave: (canvasData: string) => Promise<void>;
  onChange?: (canvasData: string) => void;
  isReadOnly?: boolean;
  sessionId?: string | null;
  onParticipantsChange?: (
    count: number,
    list?: Array<{ clientId: number; name: string; color: string }>,
    clientId?: number
  ) => void;
  enforceOwnership?: boolean;
  isTeacher?: boolean;
  onPermissionsReady?: (updateFn: (allow: boolean) => void) => void;
  onPermissionsChange?: (allowDraw: boolean) => void;
}

export const CanvasEditor = ({ 
  slideId, 
  initialData, 
  onSave, 
  onChange, 
  isReadOnly = false,
  sessionId = null,
  onParticipantsChange,
  enforceOwnership = false,
  isTeacher = false,
  onPermissionsReady,
  onPermissionsChange
}: CanvasEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isReadOnlyRef = useRef(isReadOnly);

  useEffect(() => {
    isReadOnlyRef.current = isReadOnly;
  }, [isReadOnly]);

  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [color, setColor] = useState('#000000');
  const [brushWidth, setBrushWidth] = useState(2);
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Zoom and Pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [manualZoom, setManualZoom] = useState('100');
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const miniMapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // ── Extracted hooks ──────────────────────────────────────────────────────────
  const history = useCanvasHistory(fabricCanvasRef, onChange);
  const { serializeCanvas, saveHistory, shouldSkipCanvasPersistence, notifyChange,
          restoreCanvasState, undo, redo, canUndo, canRedo, isLoadingRef, isUndoRedoRef } = history;

  const clipboard = useCanvasClipboard(fabricCanvasRef, isReadOnly);
  const { copySelected, cutSelected, paste } = clipboard;

  const screenShare = useScreenShare(fabricCanvasRef);
  const { handleShareScreen, audioBannerType, setAudioBannerType } = screenShare;

  const boardThemeHook = useCanvasBoardTheme(fabricCanvasRef);
  const { boardTheme, showThemeMenu, setShowThemeMenu, applyBoardTheme } = boardThemeHook;
  // ────────────────────────────────────────────────────────────────────────────

  // Estados para subtítulos arrastrables y redimensionables

  const [subtitlesPos, setSubtitlesPos] = useState({ x: window.innerWidth / 2 - 200, y: window.innerHeight - 150 });
  const [subtitlesSize, setSubtitlesSize] = useState({ width: 400, height: 75 });

  // Lógica de arrastre de los subtítulos (Drag)
  const handleSubtitlesMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // Evitar arrastrar si se hace clic en el tirador de tamaño
    if ((e.target as HTMLElement).closest('#conversation-subtitles-resize')) return;
    
    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    const startX = clientX;
    const startY = clientY;
    const initialX = subtitlesPos.x;
    const initialY = subtitlesPos.y;

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const isMoveTouch = moveEvent.type === 'touchmove';
      const moveClientX = isMoveTouch ? (moveEvent as TouchEvent).touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const moveClientY = isMoveTouch ? (moveEvent as TouchEvent).touches[0].clientY : (moveEvent as MouseEvent).clientY;

      const dx = moveClientX - startX;
      const dy = moveClientY - startY;

      setSubtitlesPos({
        x: initialX + dx,
        y: initialY + dy
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
  };

  // Lógica de cambio de tamaño de los subtítulos (Resize)
  const handleSubtitlesResizeMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    const startX = clientX;
    const startY = clientY;
    const initialWidth = subtitlesSize.width;
    const initialHeight = subtitlesSize.height;

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const isMoveTouch = moveEvent.type === 'touchmove';
      const moveClientX = isMoveTouch ? (moveEvent as TouchEvent).touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const moveClientY = isMoveTouch ? (moveEvent as TouchEvent).touches[0].clientY : (moveEvent as MouseEvent).clientY;

      const dx = moveClientX - startX;
      const dy = moveClientY - startY;

      setSubtitlesSize({
        width: Math.max(250, initialWidth + dx),
        height: Math.max(60, initialHeight + dy)
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
  };

  // Yjs real-time collaboration
  const { isConnected, participants, participantsList, clientId, updateSessionPermissions } = useYjs(
    sessionId, // Room name (null if not in live session)
    fabricCanvasRef.current,
    !!sessionId, // Only enable if sessionId exists
    isReadOnly, // Pass read-only state
    enforceOwnership, // Pass ownership enforcement
    isTeacher,  // ✅ NUEVO: Pasar rol de profesor
    onPermissionsChange  // ✅ NUEVO: Pasar callback de cambio de permisos
  );

  // ✅ ELIMINADO: applyLock - Toda la lógica de permisos está en useYjs

  // Notify parent when participants change
  useEffect(() => {
    if (onParticipantsChange) {
      onParticipantsChange(participants, participantsList, clientId);
    }
  }, [participants, participantsList, clientId, onParticipantsChange]);

  // ✅ NUEVO: Notificar cuando updateSessionPermissions esté disponible
  useEffect(() => {
    if (onPermissionsReady && updateSessionPermissions) {
      onPermissionsReady(updateSessionPermissions);
    }
  }, [onPermissionsReady, updateSessionPermissions]);

  // MiniMap Refs for Interaction
  const miniMapStateRef = useRef({ scale: 1, minX: 0, minY: 0 });
  const isDraggingMiniMapRef = useRef(false);
  const hasInitialFitRef = useRef(false);

  const reading = useReading(fabricCanvasRef.current, saveHistory);
  const conversation = useConversation(fabricCanvasRef.current, saveHistory);

  // Referencia mutable para actualizar el texto de lectura TTS basado en selecciones en el canvas
  const setReadingTextRef = useRef(reading.setReadingText);
  useEffect(() => {
    setReadingTextRef.current = reading.setReadingText;
  }, [reading.setReadingText]);

  // ✅ NUEVO: Función para actualizar el mini-mapa (movida arriba para ser usada en zoom)
  const updateMiniMap = useCallback(() => {
    const miniCanvas = miniMapCanvasRef.current;
    const mainCanvas = fabricCanvasRef.current;
    
    if (!miniCanvas || !mainCanvas) return;
    
    const miniCtx = miniCanvas.getContext('2d');
    if (!miniCtx) return;
    
    // Clear background
    miniCtx.fillStyle = '#1e293b'; // Slate 800 para contraste
    miniCtx.fillRect(0, 0, 150, 100);
    
    // Get viewport info
    const vpt = mainCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = mainCanvas.getZoom();
    
    const viewportX = -vpt[4] / zoom;
    const viewportY = -vpt[5] / zoom;
    const viewportWidth = mainCanvas.width! / zoom;
    const viewportHeight = mainCanvas.height! / zoom;
    
    // ✅ MEJORADO: Bounds Dinámicos (El mapa crece si te sales)
    let minX = 0;
    let minY = 0;
    let maxX = 1200;
    let maxY = 675;

    // 1. Expandir con objetos
    mainCanvas.getObjects().forEach((obj) => {
      const br = obj.getBoundingRect();
      minX = Math.min(minX, br.left);
      minY = Math.min(minY, br.top);
      maxX = Math.max(maxX, br.left + br.width);
      maxY = Math.max(maxY, br.top + br.height);
    });

    // 2. Expandir con Viewport actual (Crucial para no perder el indicador)
    // ✅ AJUSTE: Solo expandimos con la POSICIÓN (x,y) del viewport, no con su tamaño total.
    // Esto evita que el minimapa se aleje solo porque la pantalla es ancha.
    minX = Math.min(minX, viewportX);
    minY = Math.min(minY, viewportY);
    // Aseguramos ver al menos el inicio del viewport si nos fuimos muy a la derecha/abajo
    maxX = Math.max(maxX, viewportX + 100); 
    maxY = Math.max(maxY, viewportY + 100);

    // Agregar padding suave
    const padding = 40;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    const totalWidth = maxX - minX;
    const totalHeight = maxY - minY;
    
    // Calculate scale
    const scale = Math.min(150 / totalWidth, 100 / totalHeight);
    
    // Guardar estado para interacción
    miniMapStateRef.current = { scale, minX, minY };

    miniCtx.save();
    miniCtx.clearRect(0, 0, 150, 100); // Limpiar
    
    // Fondo general del mini-mapa (neutro)
    miniCtx.fillStyle = '#f1f5f9'; // Slate 100
    miniCtx.fillRect(0, 0, 150, 100);
    
    // Centrar el contenido en el canvas del minimap si sobra espacio
    const offsetX = (150 - totalWidth * scale) / 2;
    const offsetY = (100 - totalHeight * scale) / 2;
    
    // Guardar offsets para el drag
    (miniMapStateRef.current as any).offsetX = offsetX;
    (miniMapStateRef.current as any).offsetY = offsetY;
    
    miniCtx.translate(offsetX, offsetY);
    miniCtx.translate(-minX * scale, -minY * scale);
    miniCtx.scale(scale, scale);
    
    // ✅ Dibujar "Papel" de la pizarra 
    miniCtx.shadowColor = 'rgba(0,0,0,0.1)'; // Sombra suave
    miniCtx.shadowBlur = 10;
    miniCtx.fillStyle = '#ffffff';
    miniCtx.fillRect(0, 0, 1200, 675);
    miniCtx.shadowBlur = 0; // Reset shadow
    
    // Borde de la pizarra
    miniCtx.strokeStyle = '#94a3b8';
    miniCtx.lineWidth = 2;
    miniCtx.strokeRect(0, 0, 1200, 675);
    
    // Dibujar objetos con grosor aumentado para visibilidad
    mainCanvas.getObjects().forEach((obj: any) => {
      miniCtx.save();
      
      const bounds = obj.getBoundingRect();
      const objColor = obj.stroke || obj.fill || '#000';
      
      if (obj.type === 'path') {
        miniCtx.strokeStyle = objColor;
        // Forzar un grosor mínimo mucho mayor (8px) para que se vea claro en el mapa
        miniCtx.lineWidth = Math.max((obj.strokeWidth || 2) * 2, 8);
        const path = obj.path;
        if (path) {
          miniCtx.translate(obj.left - (obj.pathOffset?.x || 0), obj.top - (obj.pathOffset?.y || 0));
          miniCtx.beginPath();
          path.forEach((cmd: any) => {
            if (cmd[0] === 'M') miniCtx.moveTo(cmd[1], cmd[2]);
            else if (cmd[0] === 'L') miniCtx.lineTo(cmd[1], cmd[2]);
            else if (cmd[0] === 'Q') miniCtx.quadraticCurveTo(cmd[1], cmd[2], cmd[3], cmd[4]);
            else if (cmd[0] === 'C') miniCtx.bezierCurveTo(cmd[1], cmd[2], cmd[3], cmd[4], cmd[5], cmd[6]);
          });
          miniCtx.stroke();
        }
      } else if (obj.type === 'image' || obj.type === 'fabric.Image') {
        miniCtx.fillStyle = '#64748b';
        miniCtx.globalAlpha = 0.7;
        miniCtx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
      } else {
        // ✅ MEJORADO: Renderizado inteligente para formas en el minimapa
        const hasFill = obj.fill && obj.fill !== 'transparent';
        const hasStroke = obj.stroke && obj.stroke !== 'transparent' && (obj.strokeWidth || 0) > 0;
        
        // Caso especial: Texto (Bloque semitransparente para representar el texto)
        if (obj.type === 'i-text' || obj.type === 'text') {
           miniCtx.fillStyle = (obj.fill && obj.fill !== 'transparent') ? obj.fill : (obj.stroke || '#000');
           miniCtx.globalAlpha = 0.6; // Un poco transparente para no ocultar otros objetos
           miniCtx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
           miniCtx.globalAlpha = 1.0;
        } 
        else {
          // Formas Genéricas (Rect, Circle, etc.)
          
          // 1. Dibujar relleno si existe
          if (hasFill) {
            miniCtx.fillStyle = obj.fill;
            miniCtx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
          }
          
          // 2. Dibujar borde si existe
          if (hasStroke) {
            miniCtx.strokeStyle = obj.stroke;
            // Grosor adaptado para visibilidad
            miniCtx.lineWidth = Math.max((obj.strokeWidth || 1) * 2, 4); 
            miniCtx.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
          }
          
          // 3. Fallback para objetos "invisibles" (sin fill ni stroke) o muy finos
          if (!hasFill && !hasStroke) {
            miniCtx.strokeStyle = '#94a3b8'; // Borde gris suave
            miniCtx.lineWidth = 2;
            miniCtx.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
          }
        }
      }
      
      miniCtx.restore();
    });
    
    miniCtx.restore();
    
    // ✅ VIEWPORT INDICATOR (Más grueso y con relleno)
    // Hay que aplicar el mismo offset de centrado
    const vx = (viewportX - minX) * scale + offsetX;
    const vy = (viewportY - minY) * scale + offsetY;
    const vw = viewportWidth * scale;
    const vh = viewportHeight * scale;
    
    // Relleno suave para el viewport
    miniCtx.fillStyle = 'rgba(59, 130, 246, 0.25)';
    miniCtx.fillRect(vx, vy, vw, vh);
    
    // Borde más refinado
    miniCtx.strokeStyle = '#3b82f6';
    miniCtx.lineWidth = 2; // Reducido de 4 a 2 para un look más limpio
    miniCtx.strokeRect(vx, vy, vw, vh);
    
    // Esquineras ajustadas
    miniCtx.fillStyle = '#3b82f6';
    const dotSize = 4;
    miniCtx.fillRect(vx - 2, vy - 2, dotSize, dotSize); 
    miniCtx.fillRect(vx + vw - 2, vy - 2, dotSize, dotSize); 
    miniCtx.fillRect(vx - 2, vy + vh - 2, dotSize, dotSize); 
    miniCtx.fillRect(vx + vw - 2, vy + vh - 2, dotSize, dotSize); 
  }, []);

  // ✅ NUEVO: Fit to Viewport con Redimensionamiento Físico
  const fitToViewport = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Obtener dimensiones disponibles
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calcular escala para caber en AMBAS dimensiones (manteniendo 16:9)
    // El tablero base es de 1200x675
    const scaleX = containerWidth / 1200;
    const scaleY = containerHeight / 675;
    
    // Elegimos la escala menor para que el tablero ENTERO sea visible
    const scale = Math.min(scaleX, scaleY);
    
    // Aplicar dimensiones físicas (el lienzo físico ocupa el espacio de escala)
    canvas.setWidth(1200 * scale);
    canvas.setHeight(675 * scale);
    
    // Aplicar zoom de Fabric
    canvas.setZoom(scale);
    canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
    
    setZoomLevel(scale);
    canvas.renderAll();
    updateMiniMap();
  }, [updateMiniMap]);

  // ✅ NUEVO: Sensor de tamaño inteligente (ResizeObserver)
  // AJUSTADO: Solo hace "Fit" (Zoom automático) la primera vez.
  // Después, solo redimensiona el lienzo sin tocar el zoom del usuario.
  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        const canvas = fabricCanvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        if (!hasInitialFitRef.current) {
          // Primera vez: Hacemos Fit para que se vea grande
          fitToViewport();
          hasInitialFitRef.current = true;
        } else {
          // Veces siguientes (ej: ocultar sidebar): Solo ajustamos tamaño físico
          // MANTENIENDO el zoom actual del usuario
          canvas.setWidth(container.clientWidth);
          canvas.setHeight(container.clientHeight);
          
          canvas.requestRenderAll();
          updateMiniMap();
        }
      });
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [isReady, fitToViewport, updateMiniMap]);

  const zoomIn = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const newZoom = Math.min(zoomLevel * 1.1, MAX_ZOOM);
    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), newZoom);
    setZoomLevel(newZoom);
    updateMiniMap();
  }, [zoomLevel, MAX_ZOOM, updateMiniMap]);

  // Sincronizar input manual cuando cambia el zoom externamente (botones/scroll)
  useEffect(() => {
    setManualZoom(Math.round(zoomLevel * 100).toString());
  }, [zoomLevel]);

  const zoomOut = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const newZoom = Math.max(zoomLevel / 1.1, MIN_ZOOM);
    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), newZoom);
    setZoomLevel(newZoom);
    updateMiniMap();
  }, [zoomLevel, MIN_ZOOM, updateMiniMap]);

  const resetZoom = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Zoom al 100% exacto
    const newZoom = 1;
    setZoomLevel(newZoom);
    
    const center = canvas.getCenter();
    canvas.zoomToPoint({ x: center.left, y: center.top } as any, newZoom);
    updateMiniMap();
  }, [updateMiniMap]);


  // Delete selected object

  const deleteSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }, []);

  // ✅ NUEVO: Trigger file input for image upload
  const triggerImageUpload = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const syncCursorForTool = useCallback((tool: Tool) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (tool === 'hand') {
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
      return;
    }

    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';
  }, []);

  const addText = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const text = new fabric.IText('Click to edit', {
      left: 100,
      top: 100,
      fontSize: 32,
      fill: color,
      fontFamily: 'Arial',
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    canvas.renderAll();
  }, [color]);

  const handleSave = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      const canvasData = serializeCanvas(canvas);
      await onSave(canvasData);
      toast.success('Slide saved!');
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, serializeCanvas]);

  const handleToolClick = useCallback((tool: Tool) => {
    if (tool === 'text') {
      addText();
      setCurrentTool('select');
      syncCursorForTool('select');
      return;
    }

    if (tool === 'image') {
      triggerImageUpload();
      return;
    }

    if (tool === 'reading') {
      const willShow = !reading.showReadingPanel;
      reading.setShowReadingPanel(willShow);
      if (willShow) {
        conversation.setShowConversationPanel(false); // Cerrar conversación
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject();
        if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text')) {
          let text = (activeObject as any).text || '';
          // Si es un bloque de texto unificado, extraemos solo la frase original (primera linea)
          if (text.includes('\n')) {
            text = text.split('\n')[0];
          }
          if (text && text.trim()) {
            reading.setReadingText(text.trim());
          }
        }
      }
      setCurrentTool('select');
      syncCursorForTool('select');
      return;
    }

    if (tool === 'conversation') {
      const willShow = !conversation.showConversationPanel;
      conversation.setShowConversationPanel(willShow);
      if (willShow) {
        reading.setShowReadingPanel(false); // Cerrar lectura
        conversation.loadStoriesFromLibrary();
      }
      setCurrentTool('select');
      syncCursorForTool('select');
      return;
    }

    setCurrentTool(tool);
    syncCursorForTool(tool);
  }, [addText, syncCursorForTool, triggerImageUpload, reading]);

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
  }, [serializeCanvas, slideId]);

  const importJSON = useCallback(() => {
    jsonInputRef.current?.click();
  }, []);

  const handleJSONFileLoad = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      e.target.value = '';
      return;
    }

    try {
      const fileContents = await file.text();
      JSON.parse(fileContents);

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
  }, [notifyChange, restoreCanvasState, saveHistory]);

  // (updateMiniMap movida arriba)

  // ✅ NUEVO: Actualizar mini-mapa cuando cambie el canvas o viewport
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isReady) return;
    
    // Actualizar mini-mapa cuando cambie el canvas
    const handleCanvasChange = () => {
      updateMiniMap();
    };
    
    canvas.on('after:render', handleCanvasChange);
    canvas.on('mouse:wheel', handleCanvasChange);
    
    // Actualizar inicialmente
    updateMiniMap();
    
    return () => {
      canvas.off('after:render', handleCanvasChange);
      canvas.off('mouse:wheel', handleCanvasChange);
    };
  }, [isReady, updateMiniMap]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isReady || isReadOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) {
        return;
      }

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
      if (((e.ctrlKey || e.metaKey) && key === 'y') || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'z')) {
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

      // Cut: Ctrl+X / Cmd+X — cuts selected object to internal clipboard
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
        if (key === 'v') {
          e.preventDefault();
          handleToolClick('select');
          return;
        }

        if (key === 'p') {
          e.preventDefault();
          handleToolClick('pencil');
          return;
        }

        if (key === 'r') {
          e.preventDefault();
          handleToolClick('rectangle');
          return;
        }

        if (key === 'c') {
          e.preventDefault();
          handleToolClick('circle');
          return;
        }

        if (key === 'l') {
          e.preventDefault();
          handleToolClick('line');
          return;
        }

        if (key === 'a') {
          e.preventDefault();
          handleToolClick('arrow');
          return;
        }

        if (key === 't') {
          e.preventDefault();
          handleToolClick('text');
          return;
        }

        if (key === 'e') {
          e.preventDefault();
          handleToolClick('eraser');
          return;
        }

        if (key === 'h') {
          e.preventDefault();
          handleToolClick('hand');
          return;
        }

        if (key === 'i') {
          e.preventDefault();
          handleToolClick('image');
          return;
        }

        if (key === 'x') {
          e.preventDefault();
          handleToolClick('cut');
          return;
        }

        if (key === 'escape' && canvas) {
          setShowShortcuts(false);
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          return;
        }
      }
      
      // Espacio para pan temporal
      if (e.key === ' ' && currentTool !== 'hand') {
        e.preventDefault();
        if (!isSpacePressedRef.current) {
          setIsSpacePressed(true);
          if (canvas) {
            canvas.defaultCursor = 'grab';
            canvas.hoverCursor = 'grab';
            // ✅ NO desactivar selection aquí - lo haremos en mouse:down
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Soltar Espacio vuelve a cursor normal
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
  }, [isReady, isReadOnly, undo, redo, copySelected, cutSelected, paste, deleteSelected, currentTool, handleSave, handleToolClick]);

  // ✅ NUEVO: Ref para isSpacePressed para evitar re-render del useEffect
  const isSpacePressedRef = useRef(isSpacePressed);
  useEffect(() => {
    isSpacePressedRef.current = isSpacePressed;
  }, [isSpacePressed]);

  // ✅ NUEVO: Zoom con Ctrl+Scroll y Pan con mouse
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;
    let wasDrawingMode = false;  // Guardar estado del modo de dibujo
    let restoreTimeout: number | null = null;  // Para delay al restaurar

    // Zoom con Ctrl + Scroll
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        const delta = e.deltaY;
        let newZoom = canvas.getZoom();
        
        if (delta < 0) {
          // Scroll up = Zoom in
          newZoom = Math.min(newZoom * 1.1, MAX_ZOOM);
        } else {
          // Scroll down = Zoom out
          newZoom = Math.max(newZoom / 1.1, MIN_ZOOM);
        }
        
        setZoomLevel(newZoom);
        
        // Zoom hacia el punto del mouse
        const point = new fabric.Point(e.offsetX, e.offsetY);
        canvas.zoomToPoint(point, newZoom);
        canvas.renderAll();
        updateMiniMap();
      }
    };

    // ✅ MEJORADO: Pan con Hand Tool, Espacio, Alt+Click, middle click o right+alt
    const handleMouseDown = (e: fabric.TEvent) => {
      const evt = e.e as MouseEvent;
      
      // ✅ CRÍTICO: Si Space está presionado, desactivar selection INMEDIATAMENTE
      // Esto previene el recuadro azul antes de que Fabric.js lo dibuje
      if (isSpacePressedRef.current) {
        canvas.selection = false;
      }
      
      // Activar pan si:
      // 1. Hand tool está seleccionado
      // 2. Espacio está presionado (leído desde ref)
      // 3. Middle click (rueda del mouse)
      const shouldPan = 
        currentTool === 'hand' || 
        isSpacePressedRef.current || 
        evt.button === 1;  // Middle click
      
      if (shouldPan) {
        isPanning = true;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        canvas.defaultCursor = 'grabbing';
        
        // ✅ CRÍTICO: Guardar y desactivar el modo de dibujo para prevenir que dibuje mientras hace pan
        wasDrawingMode = canvas.isDrawingMode;
        if (wasDrawingMode) {
          canvas.isDrawingMode = false;
          
          // Limpiar cualquier estado de dibujo pendiente en Fabric.js
          if ((canvas as any).freeDrawingBrush) {
            (canvas as any).freeDrawingBrush._reset();
          }
        }
        
        // Prevenir que Fabric.js procese este evento
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        
        // Desactivar interacciones de Fabric.js temporalmente
        canvas.selection = false;
        canvas.skipTargetFind = true;
        
        return false;
      } else if (isSpacePressedRef.current) {
        // ✅ NUEVO: Si Space está presionado pero no se activó pan (ej: click en objeto)
        // Prevenir el evento para evitar selección
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }
    };

    const handleMouseMove = (e: fabric.TEvent) => {
      if (!isPanning) return;
      
      const evt = e.e as MouseEvent;
      
      // Prevenir que Fabric.js dibuje selection box o líneas
      evt.preventDefault();
      evt.stopPropagation();
      evt.stopImmediatePropagation();
      
      // ✅ MEJORADO: Usar relativePan en lugar de manipular viewportTransform manualmente
      // Esto asegura compatibilidad total con el zoom y evita desincronizaciones
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
        
        // CRÍTICO: Prevenir que Fabric.js procese este mouse:up
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        
        isPanning = false;
        canvas.defaultCursor = 'default';
        
        // Limpiar estado interno
        (canvas as any)._isCurrentlyDrawing = false;
        (canvas as any)._currentTransform = null;
        (canvas as any).__corner = null;
        canvas.discardActiveObject();
        canvas.skipTargetFind = false;
        
        // ✅ LÓGICA MEJORADA DE RESTAURACIÓN
        if (wasDrawingMode) {
          // Si íbamos a dibujar, MANTENER selección apagada para evitar blink azul
          // Y programar la restauración del dibujo
          
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
          // Solo reactivar selección si NO estábamos dibujando
          canvas.selection = true;
        }
        
        canvas.requestRenderAll();
        return false;
      } else if (isSpacePressedRef.current) {
        // ✅ NUEVO: Si Space está presionado pero NO se hizo pan
        // Restaurar selection (fue desactivada en mouse:down)
        if (!canvas.isDrawingMode) {
          canvas.selection = true;
        }
      }
    };

    // ✅ NUEVO: Listener nativo como fallback para cuando Fabric.js no dispara mouse:down
    // Esto asegura que Space+Click funcione incluso en áreas vacías del canvas
    const handleNativeMouseDownForPan = (evt: MouseEvent) => {
      // Solo actuar si Space está presionado
      if (!isSpacePressedRef.current && evt.button !== 1) return;
      
      // Desactivar selection inmediatamente
      canvas.selection = false;
      
      // Iniciar pan
      isPanning = true;
      lastPosX = evt.clientX;
      lastPosY = evt.clientY;
      canvas.defaultCursor = 'grabbing';
      
      // Guardar estado de dibujo
      wasDrawingMode = canvas.isDrawingMode;
      if (wasDrawingMode) {
        canvas.isDrawingMode = false;
        if ((canvas as any).freeDrawingBrush) {
          (canvas as any).freeDrawingBrush._reset();
        }
      }
      
      // Prevenir comportamiento por defecto
      evt.preventDefault();
      evt.stopPropagation();
      
      canvas.skipTargetFind = true;
    };

    // Agregar event listeners
    const canvasElement = canvas.getElement();
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    
    // ✅ NUEVO: Agregar listener nativo para pan
    canvasElement.addEventListener('mousedown', handleNativeMouseDownForPan);
    
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      if (restoreTimeout) {
        clearTimeout(restoreTimeout);
      }
      
      canvasElement.removeEventListener('wheel', handleWheel);
      // ✅ NUEVO: Limpiar listener nativo
      canvasElement.removeEventListener('mousedown', handleNativeMouseDownForPan);
      
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
    // Quitamos isSpacePressed de las dependencias para evitar re-subscribe al pulsar espacio
  }, [MAX_ZOOM, MIN_ZOOM, currentTool, updateMiniMap]);





  // Initialize canvas and load data
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('Canvas effect triggered for slide:', slideId);

    // Create new canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1200,
      height: 675,
      backgroundColor: '#ffffff',
      selection: !isReadOnly, // Disable selection box in read-only mode
    });

    fabricCanvasRef.current = canvas;
    isLoadingRef.current = true;

    // Load data immediately if available
    const loadData = async () => {
      // Always clear canvas first
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      
      if (initialData && initialData.trim() && initialData !== '{}' && initialData !== 'null') {
        try {
          const data = JSON.parse(initialData);
          
          if (data && data.objects && data.objects.length > 0) {
            console.log('Loading', data.objects.length, 'objects for slide:', slideId);
            // Use enlivenObjects instead of loadFromJSON
            try {
              const enlivenedObjects = await fabric.util.enlivenObjects(data.objects);
              enlivenedObjects.forEach((obj: any) => {
                // ✅ ENFORCE READ-ONLY: Lock objects if in read-only mode
                if (isReadOnlyRef.current) {
                  const isTextType = obj instanceof fabric.IText || obj.type === 'text' || obj.type === 'i-text';
                  obj.selectable = isTextType ? true : false;
                  obj.evented = isTextType ? true : false;
                  obj.hasControls = false;
                  obj.hasBorders = isTextType ? true : false;
                  obj.lockMovementX = true;
                  obj.lockMovementY = true;
                  obj.lockRotation = true;
                  obj.lockScalingX = true;
                  obj.lockScalingY = true;
                  
                  if (obj instanceof fabric.IText) {
                    obj.editable = false;
                    obj.selectable = true;
                  }
                }
                canvas.add(obj);
              });
              
              canvas.renderAll();
              
              // Force multiple renders
              await new Promise(resolve => setTimeout(resolve, 50));
              canvas.renderAll();
              await new Promise(resolve => setTimeout(resolve, 50));
              canvas.renderAll();
            } catch (err) {
              console.error('enliven error:', err);
              canvas.renderAll();
            }
          } else {
            console.log('No objects in data for slide:', slideId);
            canvas.renderAll();
          }
        } catch (error) {
          console.error('Error loading canvas data:', error);
          canvas.renderAll();
        }
      } else {
        console.log('No initial data for slide:', slideId);
        canvas.renderAll();
      }
      
      // Reset history for new slide — saveHistory resets via the hook
      saveHistory();
      console.log('History reset for slide:', slideId);
      
      isLoadingRef.current = false;
      setIsReady(true);
      
      // ✅ NUEVO: Ajustar al viewport al cargar
      
      isLoadingRef.current = false;
      setIsReady(true);
      
      // ✅ NUEVO: Ajustar al viewport al cargar
      setTimeout(() => fitToViewport(), 100);
    };

    loadData();

    // Listen to canvas changes AFTER loading
    const setupListeners = () => {
      // Escuchar selecciones del canvas para cargar textos automáticamente en la herramienta TTS
      const handleSelection = () => {
        const activeObject = canvas.getActiveObject();
        if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text')) {
          const text = (activeObject as any).text;
          if (text && text.trim()) {
            setReadingTextRef.current(text);
          }
        }
      };

      canvas.on('selection:created', handleSelection);
      canvas.on('selection:updated', handleSelection);

      // Enforce read-only on added objects (skip locally owned objects like TTS text)
      canvas.on('object:added', (e) => {
        const obj = e.target;
        if (obj && isReadOnlyRef.current && !(obj as any).isLocalOwned) {
           const isTextType = obj instanceof fabric.IText || obj.type === 'text' || obj.type === 'i-text';
           obj.selectable = isTextType ? true : false;
           obj.evented = isTextType ? true : false;
           obj.hasControls = false;
           obj.hasBorders = isTextType ? true : false;
           obj.lockMovementX = true;
           obj.lockMovementY = true;
           obj.lockRotation = true;
           obj.lockScalingX = true;
           obj.lockScalingY = true;
           
           if (obj instanceof fabric.IText) {
             (obj as any).editable = false;
             (obj as any).selectable = true;
           }
          
          canvas.requestRenderAll();
        }

        if (shouldSkipCanvasPersistence(obj)) {
          return;
        }

        if (!isUndoRedoRef.current && !isReadOnlyRef.current) {
          setTimeout(() => saveHistory(), 100);
          notifyChange();
        }
      });

      canvas.on('object:modified', (e) => {
        if (shouldSkipCanvasPersistence(e.target)) {
          return;
        }

        if (!isUndoRedoRef.current && !isReadOnlyRef.current) {
          setTimeout(() => saveHistory(), 100);
          notifyChange();
        }
      });
      canvas.on('object:removed', (e) => {
        const obj = e.target;
        if (obj && (obj as any).isVideo) {
          const stream = (obj as any).stream as MediaStream;
          const audioElement = (obj as any).audioElement as HTMLAudioElement;
          console.log('Cleaning up shared screen video/audio resource...');
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          if (audioElement && audioElement.parentNode) {
            audioElement.parentNode.removeChild(audioElement);
          }
        }

        if (shouldSkipCanvasPersistence(obj)) {
          return;
        }

        if (!isUndoRedoRef.current && !isReadOnlyRef.current) {
          setTimeout(() => saveHistory(), 100);
          notifyChange();
        }
      });
      canvas.on('path:created', () => {
        if (!isUndoRedoRef.current && !isReadOnlyRef.current) {
          setTimeout(() => saveHistory(), 100);
          notifyChange();
        }
      });
    };

    const timeoutId = setTimeout(setupListeners, 100);

    return () => {
      console.log('Disposing canvas for slide:', slideId);
      
      // Cancelar setTimeout si aún no se ejecutó
      clearTimeout(timeoutId);
      
      // Detener cualquier stream activo del canvas antes de eliminarlo
      canvas.getObjects().forEach((obj: any) => {
        if (obj.isVideo) {
          const stream = obj.stream as MediaStream;
          const audioElement = obj.audioElement as HTMLAudioElement;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          if (audioElement && audioElement.parentNode) {
            audioElement.parentNode.removeChild(audioElement);
          }
        }
      });
      
      canvas.dispose();
      fabricCanvasRef.current = null;
      setIsReady(false);
    };
  }, [slideId, initialData, notifyChange, saveHistory, serializeCanvas, shouldSkipCanvasPersistence]);

  // Update tool - Handle drawing modes and shape drawing
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isReady) return;

    if (isReadOnly) {
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      return;
    }

    // Reset modes
    canvas.isDrawingMode = false;
    canvas.selection = true;
    
    // Handlers específicos para poder removerlos selectivamente
    let mouseDownHandler: ((o: fabric.TEvent) => void) | undefined;
    let mouseMoveHandler: ((o: fabric.TEvent) => void) | undefined;
    let mouseUpHandler: ((o: fabric.TEvent) => void) | undefined;
    
    // ✅ NUEVO: Hand tool - no remover event listeners de pan
    if (currentTool === 'hand') {
      canvas.selection = false;
      canvas.isDrawingMode = false;
      return;
    }
    
    if (currentTool === 'pencil') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushWidth;
    } else if (currentTool === 'eraser') {
      // Smart eraser - removes objects on contact
      canvas.selection = false;
      canvas.isDrawingMode = false;
      
      let isErasing = false;
      const erasedObjects = new Set<fabric.Object>();

      mouseDownHandler = (options) => {
        // ✅ CRÍTICO: No borrar si se está haciendo pan (Space o Middle Click)
        const evt = options.e as MouseEvent;
        if (isSpacePressedRef.current || evt.button === 1) return;
        
        isErasing = true;
        erasedObjects.clear();
      };

      mouseMoveHandler = (o) => {
        if (!isErasing) return;

        const pointer = canvas.getPointer(o.e);
        const eraserSize = brushWidth * 2;

        // Check all objects for intersection with eraser
        const objects = canvas.getObjects();
        objects.forEach((obj) => {
          // Skip if already erased in this stroke
          if (erasedObjects.has(obj)) return;
          
          // Only erase drawable objects (not background, etc)
          if (obj.type === 'path' || obj.type === 'rect' || obj.type === 'circle' || 
              obj.type === 'line' || obj.type === 'i-text' || obj.type === 'text' ||
              obj.type === 'triangle' || obj.type === 'group') {
            
            // Get object bounds
            const bounds = obj.getBoundingRect();
            
            // Check if eraser touches this object
            if (
              pointer.x >= bounds.left - eraserSize &&
              pointer.x <= bounds.left + bounds.width + eraserSize &&
              pointer.y >= bounds.top - eraserSize &&
              pointer.y <= bounds.top + bounds.height + eraserSize
            ) {
              // Mark as erased and remove
              erasedObjects.add(obj);
              canvas.remove(obj);
            }
          }
        });

        canvas.renderAll();
      };

      mouseUpHandler = () => {
        isErasing = false;
        erasedObjects.clear();
      };
    } else if (
      currentTool === 'rectangle' ||
      currentTool === 'circle' ||
      currentTool === 'line' ||
      currentTool === 'triangle'
    ) {
      // Drag-to-draw mode for shapes
      canvas.selection = false;
      let isDrawing = false;
      let startX = 0;
      let startY = 0;
      let shape: fabric.Object | null = null;

      mouseDownHandler = (o) => {
        // ✅ CRÍTICO: No dibujar formas si se está haciendo pan (Space o Middle Click)
        const evt = o.e as MouseEvent;
        if (isSpacePressedRef.current || evt.button === 1) return;

        isDrawing = true;
        const pointer = canvas.getPointer(o.e);
        startX = pointer.x;
        startY = pointer.y;

        // Create initial shape
        if (currentTool === 'rectangle') {
          shape = new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: color,
            strokeWidth: brushWidth,
          });
        } else if (currentTool === 'circle') {
          shape = new fabric.Circle({
            left: startX,
            top: startY,
            radius: 0,
            fill: 'transparent',
            stroke: color,
            strokeWidth: brushWidth,
          });
        } else if (currentTool === 'line') {
          shape = new fabric.Line([startX, startY, startX, startY], {
            stroke: color,
            strokeWidth: brushWidth,
          });
        } else if (currentTool === 'triangle') {
          shape = new fabric.Triangle({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: color,
            strokeWidth: brushWidth,
          });
        }

        if (shape) {
          canvas.add(shape);
        }
      };

      mouseMoveHandler = (o) => {
        if (!isDrawing || !shape) return;

        const pointer = canvas.getPointer(o.e);
        
        if (currentTool === 'rectangle') {
          const rect = shape as fabric.Rect;
          const width = pointer.x - startX;
          const height = pointer.y - startY;
          
          rect.set({
            width: Math.abs(width),
            height: Math.abs(height),
            left: width < 0 ? pointer.x : startX,
            top: height < 0 ? pointer.y : startY,
          });
        } else if (currentTool === 'circle') {
          const circle = shape as fabric.Circle;
          const radius = Math.sqrt(
            Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)
          ) / 2;
          circle.set({ radius });
        } else if (currentTool === 'line') {
          const line = shape as fabric.Line;
          line.set({ x2: pointer.x, y2: pointer.y });
        } else if (currentTool === 'triangle') {
          const triangle = shape as fabric.Triangle;
          const width = pointer.x - startX;
          const height = pointer.y - startY;

          triangle.set({
            width: Math.abs(width),
            height: Math.abs(height),
            left: width < 0 ? pointer.x : startX,
            top: height < 0 ? pointer.y : startY,
          });
        }

        canvas.renderAll();
      };

      mouseUpHandler = () => {
        if (isDrawing && shape) {
          isDrawing = false;
          canvas.setActiveObject(shape);
          
          // ✅ CRÍTICO: Disparar evento para que useYjs sincronice el tamaño final
          shape.setCoords();
          canvas.fire('object:modified', { target: shape });
          
          shape = null;
          setCurrentTool('select'); // Auto-switch back to select
        }
      };
    } else if (currentTool === 'arrow') {
      canvas.selection = false;
      let isDrawingArrow = false;
      let arrowStartX = 0;
      let arrowStartY = 0;
      let tempLine: fabric.Line | null = null;

      mouseDownHandler = (o) => {
        const evt = o.e as MouseEvent;
        if (isSpacePressedRef.current || evt.button === 1) return;

        isDrawingArrow = true;
        const pointer = canvas.getPointer(o.e);
        arrowStartX = pointer.x;
        arrowStartY = pointer.y;

        tempLine = new fabric.Line([arrowStartX, arrowStartY, arrowStartX, arrowStartY], {
          stroke: color,
          strokeWidth: brushWidth,
          selectable: false,
          evented: false,
        });

        (tempLine as any).excludeFromSync = true;
        (tempLine as any).excludeFromHistory = true;
        (tempLine as any).excludeFromSerialization = true;

        canvas.add(tempLine);
      };

      mouseMoveHandler = (o) => {
        if (!isDrawingArrow || !tempLine) return;

        const pointer = canvas.getPointer(o.e);
        tempLine.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
      };

      mouseUpHandler = (o) => {
        if (!isDrawingArrow || !tempLine) return;

        isDrawingArrow = false;
        const pointer = canvas.getPointer(o.e);
        const distance = Math.hypot(pointer.x - arrowStartX, pointer.y - arrowStartY);

        canvas.remove(tempLine);
        tempLine = null;

        if (distance < 2) {
          setCurrentTool('select');
          return;
        }

        const angle = Math.atan2(pointer.y - arrowStartY, pointer.x - arrowStartX) * (180 / Math.PI);
        const line = new fabric.Line([arrowStartX, arrowStartY, pointer.x, pointer.y], {
          stroke: color,
          strokeWidth: brushWidth,
        });
        const head = new fabric.Triangle({
          left: pointer.x,
          top: pointer.y,
          width: 14,
          height: 18,
          fill: color,
          angle: angle + 90,
          originX: 'center',
          originY: 'center',
        });
        const group = new fabric.Group([line, head]);

        group.setCoords();
        canvas.add(group);
        canvas.setActiveObject(group);
        group.setCoords();
        canvas.fire('object:modified', { target: group });
        setCurrentTool('select');
      };
    } else if (currentTool === 'cut') {
      // Drag-to-cut: select a rectangular area and extract it as a new image object
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      let isCutting = false;
      let cutStartX = 0;
      let cutStartY = 0;
      let selectionRect: fabric.Rect | null = null;

      mouseDownHandler = (o) => {
        const evt = o.e as MouseEvent;
        if (isSpacePressedRef.current || evt.button === 1) return;
        const pointer = canvas.getScenePoint(o.e);
        isCutting = true;
        cutStartX = pointer.x;
        cutStartY = pointer.y;
        selectionRect = new fabric.Rect({
          left: cutStartX,
          top: cutStartY,
          width: 0,
          height: 0,
          fill: 'rgba(99,102,241,0.15)',
          stroke: '#6366f1',
          strokeWidth: 1.5,
          strokeDashArray: [6, 3],
          selectable: false,
          evented: false,
        } as any);
        (selectionRect as any).excludeFromSync = true;
        (selectionRect as any).excludeFromSerialization = true;
        (selectionRect as any).excludeFromHistory = true;
        canvas.add(selectionRect);
      };

      mouseMoveHandler = (o) => {
        if (!isCutting || !selectionRect) return;
        const pointer = canvas.getScenePoint(o.e);
        const w = pointer.x - cutStartX;
        const h = pointer.y - cutStartY;
        selectionRect.set({
          width: Math.abs(w), height: Math.abs(h),
          left: w < 0 ? pointer.x : cutStartX,
          top: h < 0 ? pointer.y : cutStartY,
        });
        canvas.renderAll();
      };

      mouseUpHandler = async () => {
        if (!isCutting || !selectionRect) return;
        isCutting = false;

        const cutX = selectionRect.left || 0;
        const cutY = selectionRect.top || 0;
        const cutW = selectionRect.width || 0;
        const cutH = selectionRect.height || 0;

        canvas.remove(selectionRect);
        selectionRect = null;

        if (cutW < 10 || cutH < 10) {
          setCurrentTool('select');
          return;
        }

        // Render canvas to offscreen and crop the selected area
        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform || [1,0,0,1,0,0];
        const offscreen = document.createElement('canvas');
        offscreen.width = Math.round(cutW * zoom);
        offscreen.height = Math.round(cutH * zoom);
        const ctx = offscreen.getContext('2d');
        if (!ctx) { setCurrentTool('select'); return; }

        // Temporarily render without the selection overlay
        canvas.renderAll();
        const srcX = (cutX * zoom) + vpt[4];
        const srcY = (cutY * zoom) + vpt[5];
        ctx.drawImage(
          canvas.getElement(),
          Math.round(srcX), Math.round(srcY),
          Math.round(cutW * zoom), Math.round(cutH * zoom),
          0, 0,
          Math.round(cutW * zoom), Math.round(cutH * zoom)
        );

        const dataUrl = offscreen.toDataURL('image/png');
        const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });
        img.set({
          left: cutX + cutW / 2 + 20,
          top:  cutY + cutH / 2 + 20,
          originX: 'center', originY: 'center',
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        toast.success('Área recortada como imagen');
        setCurrentTool('select');
      };
    }

    // Registrar listeners si existen
    if (mouseDownHandler) canvas.on('mouse:down', mouseDownHandler);
    if (mouseMoveHandler) canvas.on('mouse:move', mouseMoveHandler);
    if (mouseUpHandler) canvas.on('mouse:up', mouseUpHandler);

    // ✅ CRÍTICO: Limpieza quirúrgica - remover SOLO los listeners de esta herramienta
    return () => {
      if (mouseDownHandler) canvas.off('mouse:down', mouseDownHandler);
      if (mouseMoveHandler) canvas.off('mouse:move', mouseMoveHandler);
      if (mouseUpHandler) canvas.off('mouse:up', mouseUpHandler);
      
      // Si era lápiz, apagar modo dibujo
      canvas.isDrawingMode = false;
    };
  }, [currentTool, color, brushWidth, isReadOnly, isReady]);

  // ✅ NUEVO: Handle image file selection
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      // Show loading toast
      const loadingToast = toast.loading('Uploading image...');

      // Upload image (will be compressed automatically)
      const upload = await uploadImage(file);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Add image to canvas
      await addImageToCanvas(upload.url);

      toast.success('Image added to canvas!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    }
  };

  // ✅ NUEVO: Add image to canvas from URL
  const addImageToCanvas = async (imageUrl: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      // Load image from URL
      const img = await fabric.FabricImage.fromURL(imageUrl, {
        crossOrigin: 'anonymous',
      });

      // Calculate scale to fit image nicely on canvas
      const maxWidth = canvas.width! * 0.5; // 50% of canvas width
      const maxHeight = canvas.height! * 0.5; // 50% of canvas height
      
      const scaleX = maxWidth / (img.width || 1);
      const scaleY = maxHeight / (img.height || 1);
      const scale = Math.min(scaleX, scaleY, 1); // Don't upscale

      // Position image in center
      img.set({
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
      });

      // Add to canvas
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();

      // Save to history
      setTimeout(() => saveHistory(), 100);
    } catch (error) {
      console.error('Error adding image to canvas:', error);
      throw new Error('Failed to load image');
    }
  };

  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (confirm('Are you sure you want to clear the canvas?')) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
      saveHistory();
      toast.success('Canvas cleared');
    }
  };

  const exportPNG = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    const link = document.createElement('a');
    link.download = `slide-${slideId}.png`;
    link.href = dataURL;
    link.click();
    toast.success('Imagen PNG exportada');
  }, [slideId]);

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
  }, [slideId]);

  const tools = [
    { id: 'select' as Tool, icon: MousePointer, label: 'Select', desc: 'Select and move (V)' },
    { id: 'hand' as Tool, icon: Hand, label: 'Hand', desc: 'Pan canvas (H or Space)' },
    { id: 'pencil' as Tool, icon: Pencil, label: 'Pencil', desc: 'Draw freehand (P)' },
    { id: 'cut' as Tool, icon: Scissors, label: 'Recortar', desc: 'Recortar área del canvas (X)' },
    { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle', desc: 'Add rectangle (R)' },
    { id: 'circle' as Tool, icon: CircleIcon, label: 'Circle', desc: 'Add circle (C)' },
    { id: 'line' as Tool, icon: Minus, label: 'Line', desc: 'Add line (L)' },
    { id: 'triangle' as Tool, icon: TriangleIcon, label: 'Triangle', desc: 'Add triangle' },
    { id: 'arrow' as Tool, icon: ArrowRight, label: 'Arrow', desc: 'Add arrow (A)' },
    { id: 'text' as Tool, icon: Type, label: 'Text', desc: 'Add text (T)' },
    { id: 'image' as Tool, icon: ImageIcon, label: 'Image', desc: 'Upload image (I)' },
    { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser', desc: 'Erase (E)' },
    { id: 'reading' as Tool, icon: BookOpen, label: 'Reading/TTS', desc: 'Text to Speech and Phonetics' },
    { id: 'conversation' as Tool, icon: MessageSquare, label: 'Diálogos/Conversación', desc: 'Práctica de diálogos con voces de personajes' },
  ];

  const colors = [
    { value: '#000000', name: 'Black' },
    { value: '#ffffff', name: 'White' },
    { value: '#ff0000', name: 'Red' },
    { value: '#00ff00', name: 'Green' },
    { value: '#0000ff', name: 'Blue' },
    { value: '#ffff00', name: 'Yellow' },
    { value: '#ff00ff', name: 'Magenta' },
    { value: '#00ffff', name: 'Cyan' },
    { value: '#ff8800', name: 'Orange' },
    { value: '#8800ff', name: 'Purple' },
  ];

  const shortcuts = [
    { desc: 'Seleccionar', key: 'V' },
    { desc: 'Lapiz', key: 'P' },
    { desc: 'Rectangulo', key: 'R' },
    { desc: 'Circulo', key: 'C' },
    { desc: 'Linea', key: 'L' },
    { desc: 'Flecha', key: 'A' },
    { desc: 'Texto', key: 'T' },
    { desc: 'Imagen', key: 'I' },
    { desc: 'Borrador', key: 'E' },
    { desc: 'Mano / Pan', key: 'H o Espacio' },
    { desc: 'Deshacer', key: 'Ctrl + Z' },
    { desc: 'Rehacer', key: 'Ctrl + Y' },
    { desc: 'Copiar', key: 'Ctrl + C' },
    { desc: 'Pegar', key: 'Ctrl + V' },
    { desc: 'Eliminar', key: 'Delete' },
    { desc: 'Guardar', key: 'Ctrl + S' },
    { desc: 'Zoom', key: 'Ctrl + Rueda' },
    { desc: 'Ver atajos', key: '?' },
    { desc: 'Cerrar panel', key: 'Esc' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar Compacto - Solo mostrar si NO es read-only */}
      {!isReadOnly && (
        <div className="bg-white border-b border-gray-200 shadow-sm shrink-0 overflow-hidden">
          <div className="px-3 py-2 overflow-x-auto custom-scrollbar">
            {/* Primera fila: Tools + Actions principales */}
            <div className="flex items-center justify-between gap-4 mb-2 min-w-max">
              {/* Tools */}
              <div className="flex items-center gap-1">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = currentTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleToolClick(tool.id)}
                      className={`p-2 rounded transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                      title={tool.desc}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-300" />

              {/* Undo/Redo */}
              <div className="flex items-center gap-1">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-2 rounded transition-all hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-2 rounded transition-all hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-300" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                <button 
              onClick={zoomOut}
              className="p-1 hover:bg-gray-100 rounded text-gray-600"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            
            {/* ✅ NUEVO: Input editable de Zoom Mejorado */}
            <div className="relative group flex items-center bg-white rounded border border-gray-200 hover:border-blue-400">
              <input
                type="text"
                className="w-10 text-center text-xs font-bold text-gray-700 border-none bg-transparent focus:ring-0 focus:outline-none p-1"
                value={manualZoom}
                onChange={(e) => {
                  // Permitir solo números
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setManualZoom(val);
                }}
                onBlur={() => {
                   // Aplicar al perder foco
                   if (manualZoom) {
                      let num = parseInt(manualZoom, 10);
                      // Limites seguros
                      if (num < 10) num = 10;
                      if (num > 500) num = 500;
                      
                      const newZoom = num / 100;
                      const canvas = fabricCanvasRef.current;
                      if (canvas) {
                        setZoomLevel(newZoom);
                        const center = canvas.getCenter();
                        canvas.zoomToPoint({ x: center.left, y: center.top } as any, newZoom);
                        updateMiniMap();
                      }
                      setManualZoom(num.toString());
                   } else {
                      setManualZoom(Math.round(zoomLevel * 100).toString());
                   }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur(); // Dispara onBlur que aplica el cambio
                  }
                }}
              />
              <span className="text-xs text-gray-400 pr-1 pointer-events-none">%</span>
            </div>

            <button 
              onClick={zoomIn}
                  className="p-1 hover:bg-gray-100 rounded text-gray-600"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={resetZoom}
                  className="p-1.5 rounded hover:bg-white transition-all"
                  title="Reset"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-300" />

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium"
                  title="Save (Ctrl+S)"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={exportPNG}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition text-sm font-medium"
                  title="Exportar PNG"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  PNG
                </button>
                <button
                  onClick={exportSVG}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition text-sm font-medium"
                  title="Exportar SVG"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  SVG
                </button>
                <button
                  onClick={exportJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition text-sm font-medium"
                  title="Exportar JSON"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  JSON
                </button>
                <button
                  onClick={importJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition text-sm font-medium"
                  title="Cargar JSON"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Cargar
                </button>
                {/* Board Theme Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowThemeMenu(prev => !prev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition text-sm font-medium border border-gray-200"
                    title="Tema del Pizarrón"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>{BOARD_THEMES[boardTheme].emoji}</span>
                    <span className="hidden md:inline">{BOARD_THEMES[boardTheme].label}</span>
                  </button>
                  {showThemeMenu && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[150px]">
                      {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => applyBoardTheme(key)}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-indigo-50 transition text-left ${boardTheme === key ? 'font-semibold text-indigo-700 bg-indigo-50' : 'text-gray-700'}`}
                        >
                          <span className="text-base">{BOARD_THEMES[key].emoji}</span>
                          {BOARD_THEMES[key].label}
                          {boardTheme === key && <span className="ml-auto text-indigo-500 text-xs">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleShareScreen}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded transition text-sm font-medium shadow-sm"
                  title="Compartir Pantalla (Meet/Video)"
                >
                  <MonitorUp className="w-3.5 h-3.5" />
                  Compartir
                </button>
                <button
                  onClick={() => setShowShortcuts(true)}
                  className="p-2 text-gray-700 hover:bg-gray-100 rounded transition"
                  title="Atajos (?)"
                >
                  <Keyboard className="w-4 h-4" />
                </button>
                <button
                  onClick={clearCanvas}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                  title="Clear"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Live Session Indicator */}
              {sessionId && (
                <>
                  <div className="h-8 w-px bg-gray-300" />
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${
                    isConnected 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                    }`} />
                    <Users className="w-3.5 h-3.5" />
                    {isConnected ? `Live (${participants})` : 'Connecting...'}
                  </div>
                </>
              )}
            </div>

            {/* Segunda fila: Colors + Brush Width */}
            <div className="flex items-center gap-4 min-w-max pb-1">
              {/* Colors */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-600">Color:</span>
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      color === c.value 
                        ? 'border-blue-500 scale-110' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-gray-300" />

              {/* Brush Width */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded">
                <label className="text-xs font-medium text-gray-600">Width:</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushWidth}
                  onChange={(e) => setBrushWidth(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs font-semibold text-gray-700 w-7 text-center">
                  {brushWidth}px
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas - Scrollable Container */}
      <div 
        ref={containerRef}
        className={`flex-1 flex items-center justify-center overflow-auto ${
          isReadOnly && !isTeacher 
            ? 'p-0 bg-[#1a1d23]' // Fondo oscuro para estudiantes en lectura
            : 'p-2 md:p-4 bg-[#1e2128]' // Bordes oscuros para edición
        }`}
      >
        <div className={`bg-white shrink-0 ${
          isReadOnly && !isTeacher 
            ? 'shadow-none ring-1 ring-white/10' // Sin sombras para estudiantes en lectura
            : 'shadow-2xl shadow-black/50 ring-1 ring-white/10' // Con sombra para edición
        }`}>
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Mini-Map Navigator - Fixed position (Visible only on Large screens) */}
      <div className="hidden lg:block fixed bottom-6 right-6 bg-[#1e2128] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-white/10 p-3 z-20">
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 text-center">Navigator</div>
        <div className="relative bg-[#13151a] rounded-lg overflow-hidden border border-white/10" style={{ width: '150px', height: '100px' }}>
        <canvas 
          ref={miniMapCanvasRef} 
          width={150} 
          height={100} 
          className="cursor-move rounded"
          onMouseDown={(e) => {
            isDraggingMiniMapRef.current = true;
            const canvas = fabricCanvasRef.current;
            if (canvas && miniMapStateRef.current) {
               const rect = e.currentTarget.getBoundingClientRect();
               const { minX, minY, scale, offsetX = 0, offsetY = 0 } = miniMapStateRef.current as any;
               
               // Calcular posición clickeada en coords mundo
               const x = e.clientX - rect.left - offsetX;
               const y = e.clientY - rect.top - offsetY;
               
               const targetX = x / scale + minX;
               const targetY = y / scale + minY;
               
               // Centrar vista ahí
               const zoom = canvas.getZoom();
               const vpt = canvas.viewportTransform!;
               // vpt[4] es translate X. Formula: center_screen_x - target_world_x * zoom
               vpt[4] = -targetX * zoom + canvas.getWidth() / 2;
               vpt[5] = -targetY * zoom + canvas.getHeight() / 2;
               
               canvas.requestRenderAll();
               updateMiniMap();
            }
          }}
          onMouseMove={(e) => {
            if (isDraggingMiniMapRef.current) {
               const canvas = fabricCanvasRef.current;
               if (canvas && miniMapStateRef.current) {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const { minX, minY, scale, offsetX = 0, offsetY = 0 } = miniMapStateRef.current as any;
                   
                   const x = e.clientX - rect.left - offsetX;
                   const y = e.clientY - rect.top - offsetY;
                   
                   const targetX = x / scale + minX;
                   const targetY = y / scale + minY;
                   
                   const zoom = canvas.getZoom();
                   const vpt = canvas.viewportTransform!;
                   vpt[4] = -targetX * zoom + canvas.getWidth() / 2;
                   vpt[5] = -targetY * zoom + canvas.getHeight() / 2;
                   
                   canvas.requestRenderAll();
                   updateMiniMap();
               }
            }
          }}
          onMouseUp={() => isDraggingMiniMapRef.current = false}
          onMouseLeave={() => isDraggingMiniMapRef.current = false}
        />
        </div>
      </div>

      {/* Hidden file input for image uploads */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileSelect}
        style={{ display: 'none' }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleJSONFileLoad}
        style={{ display: 'none' }}
      />
      {/* Panel flotante de Reading / TTS (Figma style) */}
      {reading.showReadingPanel && (
        <div className="fixed top-20 right-6 z-40 w-80 bg-[#1e2128]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col max-h-[75vh] transition-all duration-300">
          {/* Cabecera */}
          <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between bg-white/5 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-indigo-400" />
              <span className="font-semibold text-white text-sm">Lectura y TTS / IPA</span>
            </div>
            <button 
              onClick={() => reading.setShowReadingPanel(false)}
              className="text-slate-400 hover:text-white text-lg font-bold p-1 leading-none transition-colors"
            >
              ×
            </button>
          </div>

          {/* Contenido con scroll */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs text-slate-300">
            
            {/* Texto de entrada */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Texto a fraccionar y leer:</label>
              <textarea
                className="w-full h-20 p-2 border border-white/10 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-xs text-slate-100 bg-white/5 placeholder-slate-500"
                value={reading.readingText}
                onChange={(e) => reading.setReadingText(e.target.value)}
                placeholder="Introduce el texto aquí..."
              />
            </div>

            {/* Botón de Fraccionar + IPA */}
            <button
              onClick={reading.handleSplitAndIpa}
              disabled={!reading.readingText.trim() || reading.readingStatus.includes('Generando')}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-900/50 transition disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              {reading.readingStatus.includes('Generando') ? 'Generando IPA...' : 'Fraccionar + IPA'}
            </button>

            {/* Configuración de Audio (Speech) */}
            <div className="border-t border-white/8 pt-3">
              <span className="font-bold text-slate-200 block mb-2">Configuración de voz</span>
              
              {/* Selector de Modo */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => reading.setAudioMode('browser')}
                  className={`py-1 rounded border text-center transition font-medium ${
                    reading.audioMode === 'browser'
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-white/10 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  Navegador
                </button>
                <button
                  onClick={() => reading.setAudioMode('server')}
                  className={`py-1 rounded border text-center transition font-medium ${
                    reading.audioMode === 'server'
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-white/10 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  Servidor (Edge)
                </button>
              </div>

              {/* Lista de Voces */}
              <div className="space-y-2.5">
                {reading.audioMode === 'browser' ? (
                  <div>
                    <label className="block text-gray-600 mb-1">Voz del Navegador:</label>
                    <select
                      className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-white/5 focus:ring-1 focus:ring-indigo-500"
                      value={reading.voiceURI}
                      onChange={(e) => reading.setVoiceURI(e.target.value)}
                    >
                      {reading.browserVoices.map((v, idx) => (
                        <option key={`${v.voiceURI}-${idx}`} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-gray-600 mb-1">Voz del Servidor:</label>
                    <select
                      className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-white/5 focus:ring-1 focus:ring-indigo-500"
                      value={reading.edgeVoice}
                      onChange={(e) => reading.setEdgeVoice(e.target.value)}
                    >
                      {reading.edgeVoices.map((v, idx) => (
                        <option key={`${v.shortName || idx}`} value={v.shortName}>
                          {v.name || v.friendlyName || v.shortName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Controles de velocidad (Rate / Pitch) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 mb-0.5">Velocidad: {reading.rate}x</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={reading.rate}
                      onChange={(e) => reading.setRate(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-0.5">Tono: {reading.pitch}x</label>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={reading.pitch}
                      onChange={(e) => reading.setPitch(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración de Fonética (IPA) */}
            <div className="border-t border-white/8 pt-3">
              <span className="font-bold text-slate-200 block mb-2">Configuración Fonética (IPA)</span>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 mb-0.5">Idioma:</label>
                    <select
                      className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-white/5 focus:ring-1 focus:ring-indigo-500"
                      value={reading.ipaLang}
                      onChange={(e) => reading.setIpaLang(e.target.value as any)}
                    >
                      <option value="auto">Auto</option>
                      <option value="en">Inglés</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-0.5">Acento:</label>
                    <select
                      className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-white/5 focus:ring-1 focus:ring-indigo-500"
                      value={reading.ipaAccent}
                      onChange={(e) => reading.setIpaAccent(e.target.value as any)}
                    >
                      <option value="us">Americano</option>
                      <option value="uk">Británico</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 mb-0.5">Motor IPA:</label>
                  <select
                    className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-white/5 focus:ring-1 focus:ring-indigo-500"
                    value={reading.ipaEngine}
                    onChange={(e) => reading.setIpaEngine(e.target.value as any)}
                  >
                    <option value="local">Gruut (Local)</option>
                    <option value="ai">AI (Gemini)</option>
                  </select>
                </div>

                {reading.ipaEngine === 'ai' && (
                  <div className="space-y-2 bg-white/5 p-2 rounded-lg border border-white/10">
                    <div>
                      <label className="block text-gray-600 mb-0.5">Proveedor API:</label>
                      <select
                        className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-white/5 focus:ring-1 focus:ring-indigo-500"
                        value={reading.ipaProvider}
                        onChange={(e) => reading.setIpaProvider(e.target.value)}
                      >
                        <option value="gemini">Gemini</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-0.5">API Key:</label>
                      <input
                        type="password"
                        className="w-full p-1.5 border border-white/10 rounded-lg text-xs text-slate-200 bg-white/5 focus:ring-1 focus:ring-indigo-500"
                        placeholder="Ingresa API Key..."
                        value={reading.ipaApiKey}
                        onChange={(e) => reading.setIpaApiKey(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Bar */}
            <div className="bg-black/30 border border-white/8 rounded-lg p-2 text-center text-[10px] text-slate-400 font-mono">
              {reading.readingStatus}
            </div>

            {/* ✅ Segmentos generados con IPA */}
            {reading.readingSegments.length > 0 && (
              <div className="border-t border-white/8 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-200 text-[11px]">Frases generadas</span>
                  <span className="text-[10px] text-slate-500">{reading.readingSegments.length} segmento(s)</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
                  {reading.readingSegments.map((seg, idx) => (
                    <div
                      key={seg.id}
                      onClick={() => reading.playSegment(idx)}
                      className={`cursor-pointer rounded-lg px-2.5 py-2 border transition-all select-none ${
                        idx === reading.currentSegmentIndex
                          ? 'bg-indigo-600/20 border-indigo-500/50 shadow-sm'
                          : 'bg-white/5 border-white/10 hover:border-indigo-500/40 hover:bg-indigo-600/10'
                      }`}
                    >
                      <p className={`text-[11px] font-semibold leading-snug ${
                        idx === reading.currentSegmentIndex ? 'text-indigo-200' : 'text-slate-200'
                      }`}>
                        {seg.text}
                      </p>
                      {seg.ipa && (
                        <p className={`text-[10px] italic mt-0.5 font-mono leading-snug ${
                          idx === reading.currentSegmentIndex ? 'text-indigo-400' : 'text-violet-400'
                        }`}>
                          /{seg.ipa}/
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panel de control de reproducción */}
          {reading.readingSegments.length > 0 && (
            <div className="p-3 border-t border-white/8 bg-black/20 rounded-b-2xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Segmento {reading.currentSegmentIndex + 1} de {reading.readingSegments.length}</span>
              </div>
              
              {/* Botones de reproducción */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    const prevIdx = Math.max(0, reading.currentSegmentIndex - 1);
                    reading.playSegment(prevIdx);
                  }}
                  disabled={reading.currentSegmentIndex <= 0}
                  className="p-2 bg-white/8 border border-white/10 hover:bg-white/15 rounded-lg transition text-slate-300 disabled:opacity-40"
                  title="Anterior"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={reading.togglePlayPause}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition shadow-lg shadow-indigo-900/50"
                  title={reading.isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {reading.isPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white translate-x-0.5" />
                  )}
                </button>

                <button
                  onClick={reading.stopReading}
                  className="p-2 bg-white/8 border border-white/10 hover:bg-red-900/20 rounded-lg transition text-red-400"
                  title="Detener"
                >
                  <Volume2 className="w-3.5 h-3.5 text-red-600" />
                </button>

                <button
                  onClick={() => {
                    const nextIdx = Math.min(reading.readingSegments.length - 1, reading.currentSegmentIndex + 1);
                    reading.playSegment(nextIdx);
                  }}
                  disabled={reading.currentSegmentIndex >= reading.readingSegments.length - 1}
                  className="p-2 bg-white/8 border border-white/10 hover:bg-white/15 rounded-lg transition text-slate-300 disabled:opacity-40"
                  title="Siguiente"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConversationPanel conversation={conversation} />

      {/* Subtítulos Flotantes Sincronizados de la Conversación */}
      {conversation.showSubtitles && conversation.isPlaying && conversation.currentClipIndex !== -1 && conversation.currentClipIndex < conversation.clips.length && (() => {
        const subtitlesFontSize = Math.max(11, Math.min(36, Math.round(subtitlesSize.width * 0.035)));
        return (
          <div 
            id="conversation-subtitles" 
            onMouseDown={handleSubtitlesMouseDown}
            onTouchStart={handleSubtitlesMouseDown}
            style={{
              position: 'fixed',
              left: `${subtitlesPos.x}px`,
              top: `${subtitlesPos.y}px`,
              width: `${subtitlesSize.width}px`,
              height: `${subtitlesSize.height}px`,
            }}
            className="z-50 bg-slate-900/90 backdrop-blur-md border border-violet-500/40 border-l-4 border-l-violet-500 rounded-xl px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center justify-center cursor-move select-none transition-all duration-75 animate-fade-in group"
          >
            {/* Texto de Subtítulo */}
            <div 
              id="conversation-subtitles-text"
              style={{ fontSize: `${subtitlesFontSize}px` }}
              className="text-center font-sans leading-relaxed text-slate-200 w-full overflow-y-auto max-h-full custom-scrollbar pr-1"
            >
              <strong className="text-violet-400 font-bold uppercase tracking-wider text-[0.8em] mr-2">
                {conversation.clips[conversation.currentClipIndex].speaker}:
              </strong>
              {conversation.clips[conversation.currentClipIndex].text}
            </div>

            {/* Tirador para cambiar tamaño (Resize Handle) */}
            <div
              id="conversation-subtitles-resize"
              onMouseDown={handleSubtitlesResizeMouseDown}
              onTouchStart={handleSubtitlesResizeMouseDown}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5"
              title="Redimensionar subtítulos"
            >
              <svg className="w-2.5 h-2.5 text-violet-400/50 group-hover:text-violet-400" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0L0 10M10 4L4 10M10 7L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        );
      })()}

      
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-white">Atajos de Teclado</h2>
                <p className="text-sm text-slate-400">Resumen de herramientas y acciones rapidas del tablero.</p>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
                aria-label="Cerrar panel de atajos"
              >
                ×
              </button>
            </div>
            <div className="grid gap-2 p-6 md:grid-cols-2">
              {shortcuts.map((shortcut) => (
                <div
                  key={`${shortcut.desc}-${shortcut.key}`}
                  className="flex items-center justify-between rounded-xl bg-slate-700/50 px-3 py-2"
                >
                  <span className="text-sm text-slate-200">{shortcut.desc}</span>
                  <kbd className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs font-mono text-cyan-300">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {audioBannerType && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center gap-3 max-w-[90vw] animate-fade-in text-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            {audioBannerType === 'active' && (
              <p>
                <strong>Compartiendo Pantalla con Audio:</strong> Para que los estudiantes escuchen el video, presenta <em>esta pestaña de la pizarra</em> en Google Meet y asegúrate de marcar la casilla <strong>"Compartir audio de la pestaña"</strong>.
              </p>
            )}
            {audioBannerType === 'blocked' && (
              <p className="text-amber-400">
                <strong>Audio bloqueado:</strong> El navegador bloqueó el autoplay del audio. Haz clic en cualquier lugar del pizarrón para activarlo.
              </p>
            )}
            {audioBannerType === 'no-audio' && (
              <p className="text-amber-400">
                <strong>Sin audio capturado:</strong> No se detectó audio. Al compartir, recuerda marcar la opción <strong>"Compartir audio de la pestaña"</strong> en el cuadro del navegador.
              </p>
            )}
          </div>
          <button 
            onClick={() => setAudioBannerType(null)} 
            className="text-slate-400 hover:text-white text-base font-bold px-1.5 leading-none transition-colors"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
