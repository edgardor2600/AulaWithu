import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { CanvasToolbar } from './canvas/CanvasToolbar';
import { CanvasOverlaysManager } from './canvas/CanvasOverlaysManager';
import { CanvasMiniMap } from './canvas/CanvasMiniMap';
import { useReading } from '../hooks/useReading';
import { useConversation } from '../hooks/useConversation';
import { useReadingGame } from '../hooks/useReadingGame';
import { useGlobalTimer } from '../hooks/useGlobalTimer';
import toast from 'react-hot-toast';
import { useYjs } from '../hooks/useYjs';
import { useCanvasHistory } from '../hooks/useCanvasHistory';
import { useCanvasClipboard } from '../hooks/useCanvasClipboard';
import { useScreenShare } from '../hooks/useScreenShare';
import { useCanvasBoardTheme } from '../hooks/useCanvasBoardTheme';
import { BOARD_THEMES, type Tool, type BoardTheme } from '../types/canvas';
import { usePresenter } from '../hooks/usePresenter';
import { useAITutor } from '../hooks/useAITutor';
import { useQuizGame } from '../hooks/useQuizGame';
import { useSubtitlesDragResize } from '../hooks/useSubtitlesDragResize';
import { useCanvasFileIO } from '../hooks/useCanvasFileIO';
import { useCanvasKeyboardShortcuts } from '../hooks/useCanvasKeyboardShortcuts';
import { useCanvasZoomPan } from '../hooks/useCanvasZoomPan';
import type { CanvasEditorProps } from '../types/canvasEditor';
import { CANVAS_SHORTCUTS } from '../types/canvasEditor';




// CanvasEditorProps, isEditableTarget and CANVAS_SHORTCUTS are imported from '../types/canvasEditor'

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
  onPermissionsChange,
  classId,
  topicId,
  currentSlideIndex,
  onSlideChange,
  totalSlides,
  onReloadSlides
}: CanvasEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isReadOnlyRef = useRef(isReadOnly);

  useEffect(() => {
    isReadOnlyRef.current = isReadOnly;
  }, [isReadOnly]);

  const [currentTool, setCurrentTool] = useState<Tool>('hand');


  const [color, setColor] = useState('#000000');
  const [brushWidth, setBrushWidth] = useState(2);
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Zoom / Pan state (zoomLevel synced from hook via onZoomChange)
  const [zoomLevel, setZoomLevel] = useState(1);
  const [manualZoom, setManualZoom] = useState('100');
  const [isSpacePressed, setIsSpacePressed] = useState(false);
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

  // ── miniMapCanvasRef (kept here as it's referenced by updateMiniMap callback) ─
  const miniMapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── File I/O — delegado a useCanvasFileIO ────────────────────────────────────
  const fileIO = useCanvasFileIO({
    fabricCanvasRef,
    slideId,
    serializeCanvas,
    restoreCanvasState,
    saveHistory,
    notifyChange,
    isLoadingRef,
  });
  const {
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
  } = fileIO;
  // ────────────────────────────────────────────────────────────────────────────


  // ── Subtítulos drag/resize — delegado a useSubtitlesDragResize ──────────────
  const {
    pos: subtitlesPos,
    size: subtitlesSize,
    handleDragStart: handleSubtitlesMouseDown,
    handleResizeStart: handleSubtitlesResizeMouseDown,
  } = useSubtitlesDragResize();

  // Yjs real-time collaboration
  const { isConnected, participants, participantsList, clientId, updateSessionPermissions, ydoc } = useYjs(
    sessionId,        // Room name (null if not in live session)
    fabricCanvasRef.current,
    !!sessionId && isReady, // ✅ FIX: Solo conectar DESPUÉS de que initialData cargó
    isReadOnly,       // Pass read-only state
    enforceOwnership, // Pass ownership enforcement
    isTeacher,        // Pasar rol de profesor
    onPermissionsChange // Callback de cambio de permisos
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
  // hasInitialFitRef comes from useCanvasZoomPan below

  const reading = useReading(fabricCanvasRef.current, saveHistory, ydoc, isTeacher);
  const conversation = useConversation(fabricCanvasRef.current, saveHistory, ydoc, isTeacher, notifyChange);
  const globalTimer = useGlobalTimer(ydoc, isTeacher);

  const effectivePresenterSessionId = sessionId || (slideId ? `slide_${slideId}` : 'standalone_session');
  const presenter = usePresenter(
    effectivePresenterSessionId,
    fabricCanvasRef.current,
    ydoc,
    isTeacher
  );
  const readingGame = useReadingGame(effectivePresenterSessionId, ydoc, isTeacher);
  const aiTutor = useAITutor({
    canvasOrGetter: () => fabricCanvasRef.current,
    saveHistory,
    classId,
    topicId,
    currentSlideIndex,
    onSlideChange,
    onReloadSlides,
    totalSlides,
    currentSlideInitialData: initialData,
    isTeacher,
    ydoc,
  });
  const quizGame = useQuizGame(ydoc, isTeacher, effectivePresenterSessionId);



  const handlePresentationFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await presenter.startPresentation(file);
  };


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

  const addText = useCallback((x?: number, y?: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let posX = x;
    let posY = y;

    if (posX === undefined || posY === undefined) {
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = canvas.getZoom();
      posX = (-vpt[4] + canvas.getWidth() / 2) / zoom - 100;
      posY = (-vpt[5] + canvas.getHeight() / 2) / zoom - 20;
    }

    const text = new fabric.IText('Escribe aquí...', {
      left: posX,
      top: posY,
      fontSize: 28,
      fill: color,
      fontFamily: 'Inter, Arial, sans-serif',
      editable: true,
      selectable: true,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
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
        conversation.setShowConversationPanel(false);
        readingGame.setShowReadingGamePanel(false);
        const activeObject = fabricCanvasRef.current?.getActiveObject();
        if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox')) {
          let text = (activeObject as any).text || '';
          if (text.includes('\n')) text = text.split('\n')[0];
          if (text && text.trim()) reading.setReadingText(text.trim());
        }
      }
      setCurrentTool('select');
      syncCursorForTool('select');
      return;
    }

    if (tool === 'reading-game') {
      const willShow = !readingGame.showReadingGamePanel;
      readingGame.setShowReadingGamePanel(willShow);
      if (willShow) {
        conversation.setShowConversationPanel(false);
        reading.setShowReadingPanel(false);
        const activeObject = fabricCanvasRef.current?.getActiveObject();
        if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox')) {
          const text = ((activeObject as any).text || '').trim();
          if (text) readingGame.setStoryText(text);
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

    if (tool === 'timer') {
      globalTimer.setOpen(!globalTimer.isOpen);
      setCurrentTool('select');
      syncCursorForTool('select');
      return;
    }

    if (tool === 'presenter') {
      presentationInputRef.current?.click();
      setCurrentTool('select');
      syncCursorForTool('select');
      return;
    }

    if (tool === 'ai-tutor') {
      if (isTeacher) {
        aiTutor.setShowAITutorPanel(!aiTutor.showAITutorPanel);
        if (!aiTutor.showAITutorPanel) {
          conversation.setShowConversationPanel(false);
          reading.setShowReadingPanel(false);
          readingGame.setShowReadingGamePanel(false);
        }
      } else {
        aiTutor.setShowStudentWidget(!aiTutor.showStudentWidget);
      }
      setCurrentTool('select');
      syncCursorForTool('select');
      return;
    }

    setCurrentTool(tool);
    syncCursorForTool(tool);
  }, [addText, syncCursorForTool, triggerImageUpload, reading, globalTimer, presenter, readingGame, conversation, aiTutor, quizGame]);


  // handleManualZoomApply is provided by useCanvasZoomPan above

  // (updateMiniMap movida arriba)

  // ✅ NUEVO: Actualizar mini-mapa cuando cambie el canvas o viewport
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isReady) return;
    const handleCanvasChange = () => { updateMiniMap(); };
    canvas.on('after:render', handleCanvasChange);
    canvas.on('mouse:wheel', handleCanvasChange);
    updateMiniMap();
    return () => {
      canvas.off('after:render', handleCanvasChange);
      canvas.off('mouse:wheel', handleCanvasChange);
    };
  }, [isReady, updateMiniMap]);

  // ── Keyboard shortcuts — delegado a useCanvasKeyboardShortcuts ───────────────
  const { isSpacePressedRef } = useCanvasKeyboardShortcuts({
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
  });

  // ── Zoom & Pan — delegado a useCanvasZoomPan ─────────────────────────────────
  // (must come after addText, syncCursorForTool, and isSpacePressedRef are defined)
  const zoomPan = useCanvasZoomPan({
    fabricCanvasRef,
    containerRef,
    currentTool,
    isReady,
    isSpacePressedRef,
    updateMiniMap,
    onZoomChange: (zoom) => {
      setZoomLevel(zoom);
      setManualZoom(Math.round(zoom * 100).toString());
    },
    addText,
    syncCursorForTool,
    setCurrentTool,
  });
  const { fitToViewport, zoomIn, zoomOut, resetZoom, handleManualZoomApply, hasInitialFitRef } = zoomPan;
  // ─────────────────────────────────────────────────────────────────────────────

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
                // ✅ FIX-3: Asignar ID estable ANTES de canvas.add() para que
                // la dedup de Yjs funcione por id desde el primer momento.
                // Preservar el id original si ya venía serializado en el JSON.
                if (!obj.id) {
                  obj.id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                }

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

  // handleImageFileSelect, exportJSON, exportPNG, exportSVG, clearCanvas — provided by useCanvasFileIO
  // shortcuts array — imported as CANVAS_SHORTCUTS from '../types/canvasEditor'

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar Compacto — delegado a CanvasToolbar */}
      {!isReadOnly && (
        <CanvasToolbar
          currentTool={currentTool}
          onToolClick={handleToolClick}
          isTeacher={isTeacher}
          color={color}
          onColorChange={setColor}
          brushWidth={brushWidth}
          onBrushWidthChange={setBrushWidth}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          zoomLevel={zoomLevel}
          manualZoom={manualZoom}
          onManualZoomChange={setManualZoom}
          onManualZoomApply={handleManualZoomApply}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onSave={handleSave}
          isSaving={isSaving}
          onExportPNG={exportPNG}
          onExportSVG={exportSVG}
          onExportJSON={exportJSON}
          onImportJSON={importJSON}
          onClearCanvas={clearCanvas}
          onShareScreen={handleShareScreen}
          onShowShortcuts={() => setShowShortcuts(true)}
          boardTheme={boardTheme}
          showThemeMenu={showThemeMenu}
          onToggleThemeMenu={() => setShowThemeMenu(prev => !prev)}
          onApplyTheme={applyBoardTheme}
          sessionId={sessionId}
          isConnected={isConnected}
          participants={participants}
          quiz={quizGame}
        />
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

      {/* Mini-Map Navigator */}
      <CanvasMiniMap
        isTeacher={isTeacher}
        showAITutorPanel={aiTutor.showAITutorPanel}
        miniMapCanvasRef={miniMapCanvasRef}
        onMiniMapMouseDown={(e) => {
          isDraggingMiniMapRef.current = true;
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
        }}
        onMiniMapMouseMove={(e) => {
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
        onMiniMapMouseUp={() => { isDraggingMiniMapRef.current = false; }}
        onMiniMapMouseLeave={() => { isDraggingMiniMapRef.current = false; }}
      />

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
      <input
        ref={presentationInputRef}
        type="file"
        accept=".pptx,.docx,.xlsx,.xls,.csv"
        onChange={handlePresentationFileSelect}
        style={{ display: 'none' }}
      />

      {/* Overlays: paneles flotantes, modales, subtítulos, quiz, etc. */}
      <CanvasOverlaysManager
        isTeacher={isTeacher}
        clientId={clientId}
        classId={classId}
        topicId={topicId}
        onReloadSlides={onReloadSlides}
        participantsList={participantsList || []}
        reading={reading}
        conversation={conversation}
        globalTimer={globalTimer}
        presenter={presenter}
        readingGame={readingGame}
        aiTutor={aiTutor}
        quiz={quizGame}
        subtitlesPos={subtitlesPos}
        subtitlesSize={subtitlesSize}
        onSubtitlesDragStart={handleSubtitlesMouseDown}
        onSubtitlesResizeStart={handleSubtitlesResizeMouseDown}
        showShortcuts={showShortcuts}
        onCloseShortcuts={() => setShowShortcuts(false)}
        shortcuts={CANVAS_SHORTCUTS}
        audioBannerType={audioBannerType}
        onCloseAudioBanner={() => setAudioBannerType(null)}
      />
    </div>
  );
};

