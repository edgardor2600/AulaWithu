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
  Hand
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useYjs } from '../hooks/useYjs';

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

type Tool = 'select' | 'pencil' | 'rectangle' | 'circle' | 'line' | 'text' | 'eraser' | 'hand';

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
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;
  const [isSpacePressed, setIsSpacePressed] = useState(false);  // ✅ Para pan temporal con Espacio

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

  // ✅ NUEVO: Zoom functions
  const zoomIn = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const newZoom = Math.min(zoomLevel * 1.2, MAX_ZOOM);
    setZoomLevel(newZoom);
    
    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), newZoom);
    canvas.renderAll();
  }, [zoomLevel, MAX_ZOOM]);

  const zoomOut = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const newZoom = Math.max(zoomLevel / 1.2, MIN_ZOOM);
    setZoomLevel(newZoom);
    
    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), newZoom);
    canvas.renderAll();
  }, [zoomLevel, MIN_ZOOM]);

  const resetZoom = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    setZoomLevel(1);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();
  }, []);

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
      
      // Espacio para pan temporal
      if (e.key === ' ' && currentTool !== 'hand') {
        e.preventDefault();
        if (!isSpacePressed) {
          setIsSpacePressed(true);
          const canvas = fabricCanvasRef.current;
          if (canvas) {
            canvas.defaultCursor = 'grab';
            canvas.hoverCursor = 'grab';
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
  }, [isReady, isReadOnly, undo, redo, copySelected, paste, deleteSelected, currentTool, isSpacePressed]);

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
      }
    };

    // ✅ MEJORADO: Pan con Hand Tool, Espacio, Alt+Click, middle click o right+alt
    const handleMouseDown = (e: fabric.TEvent) => {
      const evt = e.e as MouseEvent;
      
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
      }
    };

    // Agregar event listeners
    const canvasElement = canvas.getElement();
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      if (restoreTimeout) {
        clearTimeout(restoreTimeout);
      }
      
      canvasElement.removeEventListener('wheel', handleWheel);
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
    // Quitamos isSpacePressed de las dependencias para evitar re-subscribe al pulsar espacio
  }, [MAX_ZOOM, MIN_ZOOM, currentTool]);



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
    if (!canvas || !isReady || isReadOnly) return;

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

  const handleToolClick = (tool: Tool) => {
    if (tool === 'text') {
      addText();
      setCurrentTool('select');
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
    <div className="flex flex-col space-y-4">
      {/* Toolbar - Solo mostrar si NO es read-only */}
      {!isReadOnly && (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Tools */}
          <div className="flex items-center space-x-1">
            <span className="text-xs font-medium text-gray-500 mr-2">Tools:</span>
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = currentTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className={`p-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-gray-100 text-gray-700 hover:shadow'
                  }`}
                  title={tool.desc}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center space-x-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2.5 rounded-lg transition-all hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2.5 rounded-lg transition-all hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>

          {/* ✅ NUEVO: Zoom Controls */}
          <div className="flex items-center space-x-1 bg-gray-50 px-3 py-1.5 rounded-lg">
            <button
              onClick={zoomOut}
              className="p-2 rounded-lg transition-all hover:bg-white hover:shadow-sm"
              title="Zoom Out (Ctrl + Scroll Down)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-gray-600 min-w-[60px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 rounded-lg transition-all hover:bg-white hover:shadow-sm"
              title="Zoom In (Ctrl + Scroll Up)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              className="p-2 rounded-lg transition-all hover:bg-white hover:shadow-sm"
              title="Reset Zoom (100%)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Colors */}
          <div className="flex items-center space-x-1">
            <span className="text-xs font-medium text-gray-500 mr-2">Color:</span>
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`w-9 h-9 rounded-lg border-2 transition-all ${
                  color === c.value 
                    ? 'border-blue-500 scale-110 shadow-md' 
                    : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          {/* Brush Width */}
          <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg">
            <label className="text-xs font-medium text-gray-600">Width:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={brushWidth}
              onChange={(e) => setBrushWidth(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-sm font-semibold text-gray-700 w-8 text-center">
              {brushWidth}px
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={clearCanvas}
              className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
              title="Clear entire canvas"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Clear</span>
            </button>
            <button
              onClick={downloadImage}
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition border border-gray-300"
              title="Download as PNG"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Download</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-md"
              title="Save slide (Ctrl+S)"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm font-medium">{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
            
            {/* Live Session Indicator */}
            {sessionId && (
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                isConnected 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-yellow-50 border-yellow-200 text-yellow-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                }`} />
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {isConnected ? `Live (${participants})` : 'Connecting...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Canvas */}
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-6 flex justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-2">
          <canvas ref={canvasRef} className="rounded" />
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800 text-center">
          <span className="font-semibold">⌨️ Shortcuts:</span> 
          <strong> Ctrl+Z</strong> Undo · 
          <strong> Ctrl+Y</strong> Redo · 
          <strong> Ctrl+C</strong> Copy · 
          <strong> Ctrl+V</strong> Paste · 
          <strong> Delete</strong> Remove · 
          <strong> Ctrl+S</strong> Save
        </p>
      </div>
    </div>
  );
};
