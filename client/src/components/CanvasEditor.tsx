import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { 
  Pencil, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Eraser, 
  MousePointer,
  Minus,
  Trash2,
  Save,
  Download,
  Undo2,
  Redo2,
  Users,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useYjs } from '../hooks/useYjs';
import { uploadImage } from '../services/uploadService';

interface CanvasEditorProps {
  slideId: string;
  initialData?: string;
  onSave: (canvasData: string) => Promise<void>;
  onChange?: (canvasData: string) => void;
  isReadOnly?: boolean;
  sessionId?: string | null; // For live collaboration
  onParticipantsChange?: (
    count: number,
    list?: Array<{ clientId: number; name: string; color: string }>,
    clientId?: number
  ) => void;
  enforceOwnership?: boolean; // If true, restricts editing to own objects
  isTeacher?: boolean;  // ✅ NUEVO: Si es profesor, puede editar todo
  onPermissionsReady?: (updateFn: (allow: boolean) => void) => void;  // ✅ NUEVO: Callback para pasar updateSessionPermissions
  onPermissionsChange?: (allowDraw: boolean) => void;  // ✅ NUEVO: Callback cuando cambien permisos
}

type Tool = 'select' | 'pencil' | 'rectangle' | 'circle' | 'line' | 'text' | 'eraser' | 'hand' | 'image';

export const CanvasEditor = ({ 
  slideId, 
  initialData, 
  onSave, 
  onChange, 
  isReadOnly = false,
  sessionId = null,
  onParticipantsChange,
  enforceOwnership = false,
  isTeacher = false,  // ✅ NUEVO: Por defecto es estudiante
  onPermissionsReady,  // ✅ NUEVO: Callback para permisos
  onPermissionsChange  // ✅ NUEVO: Callback cuando cambien permisos
}: CanvasEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isLoadingRef = useRef(false);
  const isReadOnlyRef = useRef(isReadOnly);

  useEffect(() => {
    isReadOnlyRef.current = isReadOnly;
  }, [isReadOnly]);
  
  // Undo/Redo state
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  
  // Clipboard
  const clipboardRef = useRef<any>(null);
  
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [color, setColor] = useState('#000000');
  const [brushWidth, setBrushWidth] = useState(2);
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // ✅ NUEVO: Zoom and Pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [manualZoom, setManualZoom] = useState('100'); // Estado para el input de zoom
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;
  const [isSpacePressed, setIsSpacePressed] = useState(false);  // ✅ Para pan temporal con Espacio
  const miniMapCanvasRef = useRef<HTMLCanvasElement | null>(null);  // ✅ NUEVO: Ref para mini-mapa
  const imageInputRef = useRef<HTMLInputElement | null>(null);  // ✅ NUEVO: Ref para input de imagen
  const containerRef = useRef<HTMLDivElement>(null); // ✅ NUEVO: Ref para el contenedor principal

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

  // Save state to history (debounced to avoid too many saves)
  // ✅ NUEVO: Helper para serializar canvas con propiedades personalizadas
  const serializeCanvas = useCallback((canvas: fabric.Canvas) => {
    const json = canvas.toJSON();
    // Agregar propiedades personalizadas manualmente a cada objeto
    json.objects = canvas.getObjects().map((obj: any) => {
      const objJson = obj.toObject();
      objJson.id = obj.id;
      objJson.createdBy = obj.createdBy;
      return objJson;
    });
    return JSON.stringify(json);
  }, []);

  // MiniMap Refs for Interaction
  const miniMapStateRef = useRef({ scale: 1, minX: 0, minY: 0 });
  const isDraggingMiniMapRef = useRef(false);
  const hasInitialFitRef = useRef(false); // Para controlar el auto-zoom inicial

  const saveHistory = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isUndoRedoRef.current || isLoadingRef.current) return;

    // ✅ MODIFICADO: Usar serializeCanvas para incluir propiedades personalizadas
    const currentState = serializeCanvas(canvas);
    
    // Check if state actually changed
    if (historyRef.current[historyIndexRef.current] === currentState) {
      console.log('State unchanged, skipping history save');
      return;
    }
    
    // Remove any states after current index
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    
    // Add new state
    historyRef.current.push(currentState);
    historyIndexRef.current++;
    
    console.log('History saved. Index:', historyIndexRef.current, 'Total:', historyRef.current.length);
    
    // Limit history to 50 states
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
    
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, [serializeCanvas]);

  // Undo
  const undo = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current <= 0) {
      console.log('Cannot undo. Index:', historyIndexRef.current);
      return;
    }

    console.log('Undo: Going from index', historyIndexRef.current, 'to', historyIndexRef.current - 1);
    
    isUndoRedoRef.current = true;
    historyIndexRef.current--;
    
    const state = JSON.parse(historyRef.current[historyIndexRef.current]);
    console.log('Restoring state with', state.objects?.length || 0, 'objects');
    
    // Clear canvas and reload
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    
    if (state.objects && state.objects.length > 0) {
      const enlivenedObjects = await fabric.util.enlivenObjects(state.objects);
      enlivenedObjects.forEach((obj: any) => canvas.add(obj));
    }
    
    canvas.renderAll();
    console.log('Undo complete');
    
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
    
    // Keep flag briefly then notify parent to trigger auto-save
    setTimeout(() => {
      isUndoRedoRef.current = false;
      console.log('Undo flag cleared, notifying parent');
      
      // Notify parent so auto-save can happen
      if (onChange) {
        const currentState = JSON.stringify(canvas.toJSON());
        onChange(currentState);
      }
    }, 500); // Longer delay to ensure history doesn't get saved again
  }, [onChange]);

  // Redo
  const redo = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;

    isUndoRedoRef.current = true;
    historyIndexRef.current++;
    
    const state = JSON.parse(historyRef.current[historyIndexRef.current]);
    
    // Clear canvas and reload
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    
    if (state.objects && state.objects.length > 0) {
      const enlivenedObjects = await fabric.util.enlivenObjects(state.objects);
      enlivenedObjects.forEach((obj: any) => canvas.add(obj));
    }
    
    canvas.renderAll();
    
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    
    // Keep flag briefly then notify parent to trigger auto-save
    setTimeout(() => {
      isUndoRedoRef.current = false;
      console.log('Redo flag cleared, notifying parent');
      
      // Notify parent so auto-save can happen
      if (onChange) {
        const currentState = JSON.stringify(canvas.toJSON());
        onChange(currentState);
      }
    }, 500); // Longer delay to ensure history doesn't get saved again
  }, [onChange]);

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

  // Copy selected object
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
  }, []);

  // Paste from clipboard
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
        // Handle multiple objects
        clonedObj.canvas = canvas;
        clonedObj.forEachObject((obj: any) => {
          canvas.add(obj);
        });
        clonedObj.setCoords();
      } else {
        canvas.add(clonedObj);
      }
      
      // Update clipboard position for next paste
      clipboardRef.current.set({
        top: (clipboardRef.current.top || 0) + 10,
        left: (clipboardRef.current.left || 0) + 10,
      });
      
      canvas.setActiveObject(clonedObj);
      canvas.requestRenderAll();
      
      toast.success('Pasted!');
    } catch (error) {
      console.error('Error pasting:', error);
    }
  }, []);

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
      const canvas = fabricCanvasRef.current;
      const activeObject = canvas?.getActiveObject();
      
      // Don't intercept if editing text
      if (activeObject && activeObject instanceof fabric.IText && (activeObject as any).isEditing) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Redo: Ctrl+Y / Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
      
      // Copy: Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelected();
      }
      
      // Paste: Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        paste();
      }
      
      // Delete: Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
      
      // Save: Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // ✅ NUEVO: Image upload: I
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        triggerImageUpload();
      }
      
      // Espacio para pan temporal
      if (e.key === ' ' && currentTool !== 'hand') {
        e.preventDefault();
        if (!isSpacePressed) {
          setIsSpacePressed(true);
          const canvas = fabricCanvasRef.current;
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
  }, [isReady, isReadOnly, undo, redo, copySelected, paste, deleteSelected, currentTool, isSpacePressed, triggerImageUpload]);

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



  // ✅ ELIMINADO: Lógica de permisos movida completamente a useYjs
  // useYjs maneja todos los permisos basados en isReadOnly, enforceOwnership, e isTeacher

  // Notify parent of canvas changes
  const notifyChange = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !onChange || isLoadingRef.current || isUndoRedoRef.current) return;
    
    // ✅ MODIFICADO: Usar serializeCanvas para persistir ownership
    const canvasData = serializeCanvas(canvas);
    onChange(canvasData);
  }, [onChange, serializeCanvas]);

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
                  obj.selectable = false;
                  obj.evented = false;
                  obj.hasControls = false;
                  obj.hasBorders = false;
                  obj.lockMovementX = true;
                  obj.lockMovementY = true;
                  obj.lockRotation = true;
                  obj.lockScalingX = true;
                  obj.lockScalingY = true;
                  
                  if (obj instanceof fabric.IText) {
                    obj.editable = false;
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
      
      // Reset history for new slide
      const initialState = JSON.stringify(canvas.toJSON());
      historyRef.current = [initialState];
      historyIndexRef.current = 0;
      console.log('History reset for slide:', slideId);
      
      isLoadingRef.current = false;
      setIsReady(true);
      
      // ✅ NUEVO: Ajustar al viewport al cargar
      setTimeout(() => fitToViewport(), 100);
    };

    loadData();

    // Listen to canvas changes AFTER loading
    const setupListeners = () => {
      // Enforce read-only on added objects
      canvas.on('object:added', (e) => {
        const obj = e.target;
        if (obj && isReadOnlyRef.current) {
           // Apply restrictions immediately
           obj.selectable = false;
           obj.evented = false;
           obj.hasControls = false;
           obj.hasBorders = false;
           obj.lockMovementX = true;
           obj.lockMovementY = true;
           obj.lockRotation = true;
           obj.lockScalingX = true;
           obj.lockScalingY = true;
           
           if (obj instanceof fabric.IText) {
             (obj as any).editable = false;
             (obj as any).selectable = false;
           }
           
           canvas.requestRenderAll();
        }

        if (!isUndoRedoRef.current && !isReadOnlyRef.current) {
          setTimeout(() => saveHistory(), 100);
          notifyChange();
        }
      });

      canvas.on('object:modified', () => {
        if (!isUndoRedoRef.current && !isReadOnlyRef.current) {
          setTimeout(() => saveHistory(), 100);
          notifyChange();
        }
      });
      canvas.on('object:removed', () => {
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
      
      canvas.dispose();
      fabricCanvasRef.current = null;
      setIsReady(false);
    };
  }, [slideId, initialData, notifyChange, saveHistory]);

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
              obj.type === 'line' || obj.type === 'i-text' || obj.type === 'text') {
            
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
    } else if (currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'line') {
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

  const addText = () => {
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
  };

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

  const handleToolClick = (tool: Tool) => {
    if (tool === 'text') {
      addText();
      setCurrentTool('select');
    } else if (tool === 'image') {
      // ✅ NUEVO: Trigger image upload
      triggerImageUpload();
      // Don't change current tool, stay on select
    } else {
      setCurrentTool(tool);
      
      // ✅ NUEVO: Cambiar cursor cuando se selecciona hand tool
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        if (tool === 'hand') {
          canvas.defaultCursor = 'grab';
          canvas.hoverCursor = 'grab';
        } else {
          canvas.defaultCursor = 'default';
          canvas.hoverCursor = 'move';
        }
      }
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

  const handleSave = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      // ✅ MODIFICADO: Usar serializeCanvas para persistir ownership
      const canvasData = serializeCanvas(canvas);
      await onSave(canvasData);
      toast.success('Slide saved!');
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadImage = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });

    const link = document.createElement('a');
    link.download = `slide-${slideId}.png`;
    link.href = dataURL;
    link.click();
    toast.success('Image downloaded!');
  };

  const tools = [
    { id: 'select' as Tool, icon: MousePointer, label: 'Select', desc: 'Select and move (V)' },
    { id: 'hand' as Tool, icon: Hand, label: 'Hand', desc: 'Pan canvas (H or Space)' },  // ✅ NUEVO
    { id: 'pencil' as Tool, icon: Pencil, label: 'Pencil', desc: 'Draw freehand (P)' },
    { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle', desc: 'Add rectangle (R)' },
    { id: 'circle' as Tool, icon: CircleIcon, label: 'Circle', desc: 'Add circle (C)' },
    { id: 'line' as Tool, icon: Minus, label: 'Line', desc: 'Add line (L)' },
    { id: 'text' as Tool, icon: Type, label: 'Text', desc: 'Add text (T)' },
    { id: 'image' as Tool, icon: ImageIcon, label: 'Image', desc: 'Upload image (I)' },  // ✅ NUEVO
    { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser', desc: 'Erase (E)' },
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
                  onClick={downloadImage}
                  className="p-2 text-gray-700 hover:bg-gray-100 rounded transition"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
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
            ? 'p-0 bg-white' // Pantalla completa blanca para estudiantes en lectura
            : 'p-2 md:p-4 bg-gray-200/50' // Bordes grises para edición
        }`}
      >
        <div className={`bg-white shrink-0 ${
          isReadOnly && !isTeacher 
            ? 'shadow-none' // Sin sombras para estudiantes en lectura
            : 'shadow-lg border border-gray-100' // Con sombra para edición
        }`}>
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Mini-Map Navigator - Fixed position (Visible only on Large screens) */}
      <div className="hidden lg:block fixed bottom-6 right-6 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 p-3 z-20">
        <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2 text-center">Navigator</div>
        <div className="relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200" style={{ width: '150px', height: '100px' }}>
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
    </div>
  );
};
