import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import * as fabric from 'fabric';

/**
 * useYjs Hook
 * 
 * Manages Yjs WebSocket connection and synchronization with Fabric.js canvas.
 * Implements bidirectional sync: Fabric ↔ Yjs ↔ WebSocket ↔ Other Clients
 * 
 * Architecture:
 * 1. Local changes in Fabric.js → Update Yjs Y.Map
 * 2. Yjs Y.Map changes → Broadcast via WebSocket
 * 3. Remote Yjs changes → Update local Fabric.js canvas
 * 
 * @param roomName - Unique room identifier (e.g., session ID)
 * @param canvas - Fabric.js canvas instance
 * @param enabled - Whether to enable sync (default: true)
 */
export function useYjs(
  roomName: string | null,
  canvas: fabric.Canvas | null,
  enabled: boolean = true,
  isReadOnly: boolean = false,
  enforceOwnership: boolean = false, // If true, only own objects are editable
  isTeacher: boolean = false,  // ✅ NUEVO: Si es profesor, puede editar todo
  onPermissionsChange?: (allowDraw: boolean) => void  // ✅ NUEVO: Callback cuando cambien permisos
) {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<number>(0);
  const [participantsList, setParticipantsList] = useState<Array<{
    clientId: number;
    name: string;
    color: string;
  }>>([]);
  
  // Yjs document and provider refs
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const yCanvasRef = useRef<Y.Map<any> | null>(null);
  
  // Flag to prevent infinite sync loops
  const isRemoteChangeRef = useRef(false);
  
  // Track object IDs to prevent duplicates
  const syncedObjectsRef = useRef<Set<string>>(new Set());
  
  // ✅ NUEVO: Ref para callback de cambio de permisos (evita stale closures)
  const onPermissionsChangeRef = useRef(onPermissionsChange);
  
  // Actualizar ref en cada render
  useEffect(() => {
    onPermissionsChangeRef.current = onPermissionsChange;
  }, [onPermissionsChange]);

  useEffect(() => {
    // Don't connect if disabled or missing required params
    if (!enabled || !roomName || !canvas) {
      return;
    }

    console.log('🔗 Initializing Yjs connection for room:', roomName);

    // Create Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Create WebSocket provider
    const wsUrl = import.meta.env.VITE_YJS_WS_URL || 'ws://localhost:1234';
    const provider = new WebsocketProvider(wsUrl, roomName, ydoc);
    providerRef.current = provider;

    // Get shared canvas map
    const yCanvas = ydoc.getMap('canvas');
    yCanvasRef.current = yCanvas;

    // Connection status handlers
    provider.on('status', (event: { status: string }) => {
      console.log('📡 Yjs connection status:', event.status);
      setIsConnected(event.status === 'connected');
    });

    provider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        console.log('✅ Yjs initial sync complete');
        // Load existing objects from Yjs to canvas
        loadFromYjs();
      }
    });

    // Awareness for participant tracking
    const awareness = provider.awareness;
    
    // Get user info from localStorage (support auth-storage format)
    let user = null;
    try {
      const authStr = localStorage.getItem('auth-storage');
      if (authStr) {
        const parsed = JSON.parse(authStr);
        user = parsed.user;
      }
      
      // Fallback for legacy format
      if (!user) {
        const userStr = localStorage.getItem('user');
        user = userStr ? JSON.parse(userStr) : null;
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }

    const userName = user?.name || 'Anonymous';
    const userColor = getRandomColor();
    
    awareness.on('change', () => {
      const states = Array.from(awareness.getStates().entries());
      setParticipants(states.length);
      
      // Build participants list with names and colors
      const participantsData = states
        .map(([clientId, state]: [number, any]) => ({
          clientId,
          name: state.user?.name || 'Anonymous',
          color: state.user?.color || '#999999',
        }))
        .filter((p) => p.name); // Remove invalid entries
      
      setParticipantsList(participantsData);
      
      // ✅ NUEVO: Reintentar cargar objetos si clientID ahora está disponible
      if (ydocRef.current?.clientID && yCanvasRef.current) {
        loadFromYjs();
      }
    });

    // Set local awareness state with user info
    awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
      clientId: ydoc.clientID,
    });

    // ✅ NUEVO: Mapa compartido para permisos de sesión
    const ySessionPermissions = ydoc.getMap('sessionPermissions');
    
    // ✅ NUEVO: Mapa compartido para sincronizar viewport (pan/zoom)
    const yViewport = ydoc.getMap('viewport');
    
    // Listener para cambios en permisos (para estudiantes)
    const handlePermissionsChange = () => {
      const allowDraw = ySessionPermissions.get('allowStudentDraw');
      if (allowDraw !== undefined && !isTeacher && canvas) {
        console.log('🔄 Permissions updated from server:', allowDraw);
        
        // ✅ NUEVO: Re-aplicar permisos a todos los objetos
        const myClientId = ydocRef.current?.clientID;
        canvas.forEachObject((obj: any) => {
          const createdBy = obj.createdBy;
          const isOwner = createdBy === myClientId;
          
          // Si allowDraw es true, desbloquear objetos propios
          // Si allowDraw es false, bloquear todo
          const shouldLock = !allowDraw || (enforceOwnership && !isOwner);
          
          console.log('🔓 Updating object permissions:', {
            objectId: obj.id,
            createdBy,
            isOwner,
            allowDraw,
            shouldLock
          });
          
          obj.selectable = !shouldLock;
          obj.evented = !shouldLock;
          obj.hasControls = !shouldLock;
          obj.hasBorders = !shouldLock;
          obj.lockMovementX = shouldLock;
          obj.lockMovementY = shouldLock;
          obj.lockRotation = shouldLock;
          obj.lockScalingX = shouldLock;
          obj.lockScalingY = shouldLock;
          obj.editable = !shouldLock;
          
          if (obj instanceof fabric.IText) {
            obj.editable = !shouldLock;
            obj.selectable = !shouldLock;
          }
        });
        
        canvas.renderAll();
        
        // ✅ NUEVO: Notificar al componente padre
        if (onPermissionsChangeRef.current) {
          onPermissionsChangeRef.current(!!allowDraw);
        }
      }
    };
    
    ySessionPermissions.observe(handlePermissionsChange);

    // ✅ NUEVO: Sincronización de viewport (pan/zoom)
    let isApplyingViewport = false; // Flag para evitar loops
    
    // Listener para cambios de viewport (solo estudiantes)
    const handleViewportChange = () => {
      if (isTeacher || !canvas || isApplyingViewport) return;
      
      const viewportData = yViewport.get('transform');
      if (viewportData && Array.isArray(viewportData) && viewportData.length === 6) {
        isApplyingViewport = true;
        console.log('📺 Applying teacher viewport:', viewportData);
        
        // Aplicar transformación del viewport
        canvas.setViewportTransform(viewportData as [number, number, number, number, number, number]);
        canvas.requestRenderAll();
        
        isApplyingViewport = false;
      }
    };
    
    yViewport.observe(handleViewportChange);
    
    // Broadcast viewport changes (solo profesor)
    let viewportBroadcastTimeout: number | null = null;
    
    const broadcastViewport = () => {
      if (!isTeacher || !canvas || isApplyingViewport) return;
      
      // Debounce para no saturar la red
      if (viewportBroadcastTimeout) {
        clearTimeout(viewportBroadcastTimeout);
      }
      
      viewportBroadcastTimeout = setTimeout(() => {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          yViewport.set('transform', [...vpt]); // Clonar array
          console.log('📡 Teacher broadcasting viewport:', vpt);
        }
      }, 50) as unknown as number; // 50ms debounce
    };
    
    // Escuchar eventos de viewport del canvas (solo profesor)
    if (isTeacher) {
      // Detectar cambios en el viewport (pan/zoom)
      const handleCanvasMouseWheel = () => broadcastViewport();
      const handleCanvasMouseMove = () => {
        // Solo broadcast si se está haciendo pan
        if ((canvas as any)._isPanning) {
          broadcastViewport();
        }
      };
      
      canvas.on('mouse:wheel', handleCanvasMouseWheel);
      canvas.on('mouse:move', handleCanvasMouseMove);
      
      // También capturar cuando termine el pan
      canvas.on('mouse:up', broadcastViewport);
    }

    /**
     * Load existing objects from Yjs to Fabric canvas
     * Called on initial sync
     */
    function loadFromYjs() {
      if (!canvas || !yCanvas) return;

      // ✅ NUEVO: Esperar a que clientId esté disponible
      if (!ydocRef.current?.clientID) {
        console.log('⏳ Waiting for clientID before loading objects...');
        return;
      }

      console.log('📥 Loading objects from Yjs...');
      console.log('🔒 Current permissions:', { isReadOnly, enforceOwnership, isTeacher });
      isRemoteChangeRef.current = true;

      yCanvas.forEach((objectData: any, objectId: string) => {
        if (!syncedObjectsRef.current.has(objectId)) {
          addObjectToCanvas(objectData, objectId);
        }
      });

      // ✅ CRÍTICO: Aplicar permisos inmediatamente después de cargar
      if (isReadOnly && !isTeacher) {
        console.log('🔐 Applying read-only lock to all objects for student...');
        canvas.forEachObject((obj: any) => {
          obj.selectable = false;
          obj.evented = false;
          obj.hasControls = false;
          obj.hasBorders = false;
          obj.lockMovementX = true;
          obj.lockMovementY = true;
          obj.lockRotation = true;
          obj.lockScalingX = true;
          obj.lockScalingY = true;
          obj.editable = false;
          
          if (obj instanceof fabric.IText) {
            obj.editable = false;
            obj.selectable = false;
          }
        });
      }

      canvas.renderAll();
      isRemoteChangeRef.current = false;
    }

    /**
     * Add object from Yjs data to Fabric canvas
     */
    async function addObjectToCanvas(objectData: any, objectId: string) {
      if (!canvas) return;

      // ✅ PREVENCIÓN DE DUPLICADOS: Verificar si ya existe antes de procesar
      // Esto evita que condiciones de carrera creen copias "fantasma"
      const existingObject = canvas.getObjects().find((o: any) => o.id === objectId);
      if (existingObject) {
        console.log('⚠️ Object already exists, skipping add:', objectId);
        return;
      }

      try {
        // Enliven object from JSON (Fabric.js v6 uses async)
        const objects = await fabric.util.enlivenObjects([objectData]);
        const obj = objects[0];
        
        // Check if it's a valid FabricObject (not a gradient, filter, etc.)
        if (obj && typeof obj === 'object' && 'type' in obj) {
          // Set custom ID for tracking
          (obj as any).id = objectId;
          
          // Apply read-only or ownership restrictions
          // @ts-ignore - Fabric.js types are complex, using any for property access
          const createdBy = (obj as any).createdBy;
          const isOwner = createdBy === ydocRef.current?.clientID;
          
          // ✅ MODIFICADO: Lógica de bloqueo mejorada con prioridad clara
          // PRIORIDAD 1: Si es profesor, NUNCA bloquear (puede editar todo)
          // PRIORIDAD 2: Si isReadOnly está activo, bloquear TODO (modo view-only)
          // PRIORIDAD 3: Si enforceOwnership está activo, bloquear objetos que no son propios
          let shouldLock = false;
          
          if (isTeacher) {
            // Profesor: siempre puede editar
            shouldLock = false;
          } else if (isReadOnly) {
            // Estudiante en modo view-only: bloquear TODO
            shouldLock = true;
          } else if (enforceOwnership && !isOwner) {
            // Estudiante con permisos pero solo puede editar lo suyo
            shouldLock = true;
          }

          console.log('🔐 Object permissions:', {
            objectId,
            createdBy,
            myClientId: ydocRef.current?.clientID,
            isOwner,
            isTeacher,
            isReadOnly,
            enforceOwnership,
            shouldLock
          });

          if (shouldLock) {
            const fabricObj = obj as any;
            fabricObj.selectable = false;
            fabricObj.evented = false;
            fabricObj.hasControls = false;
            fabricObj.hasBorders = false;
            fabricObj.lockMovementX = true;
            fabricObj.lockMovementY = true;
            fabricObj.lockRotation = true;
            fabricObj.lockScalingX = true;
            fabricObj.lockScalingY = true;
            fabricObj.editable = false;
            
            if (obj instanceof fabric.IText) {
              fabricObj.editable = false;
              fabricObj.selectable = false;
            }
          } else {
            // ✅ NUEVO: Asegurar que objetos desbloqueados estén completamente editables
            const fabricObj = obj as any;
            fabricObj.selectable = true;
            fabricObj.evented = true;
            fabricObj.hasControls = true;
            fabricObj.hasBorders = true;
            fabricObj.lockMovementX = false;
            fabricObj.lockMovementY = false;
            fabricObj.lockRotation = false;
            fabricObj.lockScalingX = false;
            fabricObj.lockScalingY = false;
            fabricObj.editable = true;
            
            if (obj instanceof fabric.IText) {
              fabricObj.editable = true;
              fabricObj.selectable = true;
            }
          }
          
          
          // Cast to any to avoid type issues with Fabric.js complex types
          isRemoteChangeRef.current = true;
          
          // CRITICAL: Ensure coordinates are calculated before adding
          (obj as any).setCoords();
          
          canvas.add(obj as any);
          
          // Force render for critical updates like paths
          canvas.requestRenderAll();
          
          isRemoteChangeRef.current = false;
          
          syncedObjectsRef.current.add(objectId);
        }
      } catch (error) {
        console.error('Error adding object to canvas:', error);
      }
    }

    /**
     * Fabric → Yjs: Sync local changes to Yjs
     */
    function syncFabricToYjs(obj: fabric.Object) {
      if (!yCanvas || isRemoteChangeRef.current) return;

      const objectId = (obj as any).id || generateObjectId();
      (obj as any).id = objectId;
      
      // Add ownership metadata
      if (!(obj as any).createdBy && ydocRef.current) {
        (obj as any).createdBy = ydocRef.current.clientID;
      }

      const objectData = (obj as any).toJSON(['id', 'createdBy']); // Include custom props
      yCanvas.set(objectId, objectData);
      syncedObjectsRef.current.add(objectId);
    }

    /**
     * Yjs → Fabric: Sync remote changes to canvas
     */
    function syncYjsToFabric(event: Y.YMapEvent<any>) {
      if (!canvas || isRemoteChangeRef.current) return;

      // ✅ CRÍTICO: Ignorar eventos originados por este mismo cliente (Echo suppression)
      // Si no filtramos esto, nuestros propios cambios vuelven y pueden causar duplicados o loops visuales
      if (event.transaction.origin === ydocRef.current?.clientID || event.transaction.local) {
        return;
      }

      isRemoteChangeRef.current = true;

      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          // Find existing object
          const existingObj = canvas.getObjects().find((o: any) => o.id === key);
          
          if (existingObj) {
            // Update existing object
            const newData = yCanvas.get(key);
            if (newData) {
              // ✅ CRÍTICO: Filtrar propiedades read-only de Fabric.js
              // 'type' y 'version' son read-only y causan errores si intentamos setearlas
              const { type, version, ...updateData } = newData as any;
              existingObj.set(updateData);
              existingObj.setCoords();
            }
          } else {
            // Add new object
            const objectData = yCanvas.get(key);
            if (objectData) {
              addObjectToCanvas(objectData, key);
            }
          }
        } else if (change.action === 'delete') {
          // Remove deleted object
          const objToRemove = canvas.getObjects().find((o: any) => o.id === key);
          if (objToRemove) {
            canvas.remove(objToRemove);
            syncedObjectsRef.current.delete(key);
          }
        }
      });

      canvas.renderAll();
      isRemoteChangeRef.current = false;
    }





    // ✅ MEJORADO: Guardar referencias a funciones para cleanup específico
    const handlePathCreated = (e: any) => {
      if (e.path && ydocRef.current) {
        (e.path as any).createdBy = ydocRef.current.clientID;
        console.log('✨ Path created with owner:', ydocRef.current.clientID);
      }
    };

    const handleObjectAdded = (e: any) => {
      if (e.target && !isRemoteChangeRef.current) {
        // Asegurar createdBy antes de sincronizar
        if (!(e.target as any).createdBy && ydocRef.current) {
          (e.target as any).createdBy = ydocRef.current.clientID;
          console.log('✨ Object ownership assigned on add:', ydocRef.current.clientID);
        }
        syncFabricToYjs(e.target);
      }
    };

    const handleObjectModified = (e: any) => {
      // Don't sync if read-only or remote change
      if (isReadOnly || isRemoteChangeRef.current) return;

      if (e.target) {
        syncFabricToYjs(e.target);
      }
    };

    const handleObjectRemoved = (e: any) => {
      // Don't sync if read-only or remote change
      if (isReadOnly || isRemoteChangeRef.current) return;

      if (e.target && yCanvas) {
        const objectId = (e.target as any).id;
        if (objectId) {
          yCanvas.delete(objectId);
          syncedObjectsRef.current.delete(objectId);
        }
      }
    };

    // Register listeners
    canvas.on('path:created', handlePathCreated);
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:removed', handleObjectRemoved);

    // Listen to Yjs changes
    yCanvas.observe(syncYjsToFabric);

    // Cleanup
    return () => {
      console.log('🔌 Disconnecting Yjs for room:', roomName);
      
      // ✅ MEJORADO: Remove Fabric listeners específicos (no todos)
      canvas.off('path:created', handlePathCreated);
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:removed', handleObjectRemoved);
      
      // Unobserve Yjs
      yCanvas.unobserve(syncYjsToFabric);
      
      // ✅ NUEVO: Limpiar observer de permisos
      const ySessionPermissions = ydoc.getMap('sessionPermissions');
      ySessionPermissions.unobserve(handlePermissionsChange);
      
      // ✅ NUEVO: Limpiar observer de viewport
      yViewport.unobserve(handleViewportChange);
      
      // ✅ NUEVO: Limpiar timeout de viewport si existe
      if (viewportBroadcastTimeout) {
        clearTimeout(viewportBroadcastTimeout);
      }
      
      // Disconnect provider
      provider.disconnect();
      provider.destroy();
      
      // Clear refs
      ydocRef.current = null;
      providerRef.current = null;
      yCanvasRef.current = null;
      syncedObjectsRef.current.clear();
    };
  }, [roomName, canvas, enabled, isReadOnly, enforceOwnership, isTeacher]);  // ✅ MODIFICADO: Agregar isTeacher

  return {
    isConnected,
    participants,
    participantsList,
    clientId: ydocRef.current?.clientID,
    ydoc: ydocRef.current,
    provider: providerRef.current,
    awareness: providerRef.current?.awareness || null,
    // ✅ NUEVO: Función para actualizar permisos (solo profesor)
    updateSessionPermissions: (allowStudentDraw: boolean) => {
      if (ydocRef.current && isTeacher) {
        const ySessionPermissions = ydocRef.current.getMap('sessionPermissions');
        ySessionPermissions.set('allowStudentDraw', allowStudentDraw);
        console.log('👨‍🏫 Teacher updated permissions:', allowStudentDraw);
      }
    },
  };
}

/**
 * Generate unique object ID
 */
function generateObjectId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate random color for user cursor
 */
function getRandomColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
