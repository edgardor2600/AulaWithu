import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import * as fabric from 'fabric';
import { useAuthStore } from '../store/authStore';

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
    userId?: string;
    name: string;
    color: string;
    isTeacher?: boolean;
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

    // Obtener token JWT del store para autenticarse con el servidor Yjs
    const token = useAuthStore.getState().token;
    if (!token) {
      console.warn('[Yjs] No auth token available — aborting WS connection');
      return;
    }

    // Create Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Create WebSocket provider — el token se pasa como query param para autenticación
    const wsUrl = import.meta.env.VITE_YJS_WS_URL || 'ws://localhost:1234';
    const provider = new WebsocketProvider(wsUrl, roomName, ydoc, {
      params: { token },
    });
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
    
    // Get user info from authStore or localStorage
    const authUser = useAuthStore.getState().user;
    let user = authUser || null;
    if (!user) {
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
    }

    const currentUserId = user?.id || null;
    const userName = user?.name || 'Anonymous';
    const userColor = user?.avatar_color || getRandomColor();
    
    awareness.on('change', () => {
      const states = Array.from(awareness.getStates().entries());
      
      // Build raw participants list with full metadata
      const rawParticipants = states
        .map(([cId, state]: [number, any]) => ({
          clientId: cId,
          userId: state.user?.userId as string | undefined,
          name: (state.user?.name as string) || 'Anonymous',
          color: (state.user?.color as string) || '#999999',
          isTeacher: !!state.user?.isTeacher,
        }))
        .filter((p) => p.name);

      // Deduplicate participants by userId:
      // If the same user has multiple connections (e.g. from Ctrl+F5 or reload),
      // keep only one, prioritizing the local active connection (ydoc.clientID).
      const deduplicatedMap = new Map<string, typeof rawParticipants[0]>();
      const anonymousList: typeof rawParticipants = [];

      for (const p of rawParticipants) {
        if (p.userId) {
          const existing = deduplicatedMap.get(p.userId);
          if (!existing) {
            deduplicatedMap.set(p.userId, p);
          } else if (p.clientId === ydocRef.current?.clientID) {
            // Prioritize our own active local client ID
            deduplicatedMap.set(p.userId, p);
          }
        } else {
          anonymousList.push(p);
        }
      }

      const deduplicatedParticipants = [
        ...Array.from(deduplicatedMap.values()),
        ...anonymousList,
      ];

      setParticipants(deduplicatedParticipants.length);
      setParticipantsList(deduplicatedParticipants);
      
      // Reintentar cargar objetos si clientID ahora está disponible
      if (ydocRef.current?.clientID && yCanvasRef.current) {
        loadFromYjs();
      }
    });

    // Set local awareness state with user info including userId and role
    awareness.setLocalStateField('user', {
      userId: currentUserId,
      name: userName,
      color: userColor,
      clientId: ydoc.clientID,
      isTeacher,
    });

    // ✅ Mapa compartido para permisos de sesión
    const ySessionPermissions = ydoc.getMap('sessionPermissions');
    
    // ✅ Mapa compartido para sincronizar viewport (pan/zoom)
    const yViewport = ydoc.getMap('viewport');
    
    // Listener para cambios en permisos (para estudiantes)
    const handlePermissionsChange = () => {
      const allowDraw = ySessionPermissions.get('allowStudentDraw');
      if (allowDraw !== undefined && !isTeacher && canvas) {
        console.log('🔄 Permissions updated from server:', allowDraw);
        
        // Re-aplicar permisos a todos los objetos
        const myClientId = ydocRef.current?.clientID;
        canvas.forEachObject((obj: any) => {
          const createdBy = obj.createdBy;
          const creatorUserId = obj.creatorUserId;
          const isOwner = (creatorUserId && currentUserId && creatorUserId === currentUserId) || (createdBy === myClientId);
          
          // Si allowDraw es true, desbloquear objetos propios
          // Si allowDraw es false, bloquear todo
          const shouldLock = !allowDraw || (enforceOwnership && !isOwner);
          
          console.log('🔓 Updating object permissions:', {
            objectId: obj.id,
            createdBy,
            creatorUserId,
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
        
        if (onPermissionsChangeRef.current) {
          onPermissionsChangeRef.current(!!allowDraw);
        }
      }
    };
    
    ySessionPermissions.observe(handlePermissionsChange);

    // Sincronización de viewport RELATIVA (pan/zoom)
    let isApplyingViewport = false;
    
    // Listener para cambios de viewport (estudiantes siguen área del profe)
    const handleViewportChange = () => {
      if (isTeacher || !canvas || isApplyingViewport || !isReadOnly) return;
      
      const teacherArea = yViewport.get('area') as { x1: number, y1: number, x2: number, y2: number } | undefined;
      if (teacherArea) {
        isApplyingViewport = true;
        
        const { x1, y1, x2, y2 } = teacherArea;
        const width = x2 - x1;
        const height = y2 - y1;
        
        // Calcular escala necesaria para que el área del profe quepa en mi pantalla
        const scaleX = canvas.getWidth() / width;
        const scaleY = canvas.getHeight() / height;
        const newScale = Math.min(scaleX, scaleY); // Mantener aspecto
        
        // Centrar mi vista en ese mismo punto
        canvas.setZoom(newScale);
        const vpt = canvas.viewportTransform;
        if (vpt) {
            // Posicionar para que x1, y1 quede en la esquina (con centrado si sobra espacio)
            vpt[4] = -x1 * newScale + (canvas.getWidth() - width * newScale) / 2;
            vpt[5] = -y1 * newScale + (canvas.getHeight() - height * newScale) / 2;
        }
        
        canvas.requestRenderAll();
        isApplyingViewport = false;
      }
    };
    
    yViewport.observe(handleViewportChange);
    
    // Broadcast del área visible (solo profesor)
    let viewportBroadcastTimeout: number | null = null;
    
    const broadcastViewport = () => {
      if (!isTeacher || !canvas) return;
      
      // Debounce para no saturar la red mientras se hace pan continuo
      if (viewportBroadcastTimeout) {
        clearTimeout(viewportBroadcastTimeout);
      }
      
      viewportBroadcastTimeout = window.setTimeout(() => {
        const vpt = canvas.viewportTransform;
        if (!vpt) return;
        
        const zoom = canvas.getZoom();
        // Esquina superior izquierda del área visible en coords del lienzo
        const x1 = -vpt[4] / zoom;
        const y1 = -vpt[5] / zoom;
        // Esquina inferior derecha
        const x2 = x1 + canvas.getWidth() / zoom;
        const y2 = y1 + canvas.getHeight() / zoom;
        
        console.log('📡 Broadcasting teacher viewport area:', { x1, y1, x2, y2 });
        yViewport.set('area', { x1, y1, x2, y2 });
      }, 50); // 50ms debounce
    };
    
    // Escuchar eventos de pan y zoom solo si es profesor
    if (isTeacher) {
      canvas.on('mouse:wheel', broadcastViewport);
      canvas.on('mouse:move', (opt) => {
        // Solo broadcast si está arrastrando con Espacio o botón central
        if (opt.e && ((opt.e as any).buttons === 4 || (canvas as any).isDragging)) {
          broadcastViewport();
        }
      });
      // Broadcast inicial para sincronizar a los estudiantes que ya están
      setTimeout(broadcastViewport, 500);
    }

    /**
     * Fabric ← Yjs: Load all objects from Yjs to canvas
     */
    async function loadFromYjs() {
      if (!canvas || !yCanvas || isRemoteChangeRef.current) return;

      // Esperar a que clientId esté disponible
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

      // Aplicar permisos inmediatamente después de cargar
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

      // Prevenir duplicados
      const existingObject = canvas.getObjects().find((o: any) => o.id === objectId);
      if (existingObject) {
        console.log('⚠️ Object already exists, skipping add:', objectId);
        return;
      }

      try {
        // Enliven object from JSON (Fabric.js v6 uses async)
        const objects = await fabric.util.enlivenObjects([objectData]);
        const obj = objects[0];
        
        // Check if it's a valid FabricObject
        if (obj && typeof obj === 'object' && 'type' in obj) {
          (obj as any).id = objectId;
          
          const createdBy = (obj as any).createdBy;
          const creatorUserId = (obj as any).creatorUserId;
          const isOwner = (creatorUserId && currentUserId && creatorUserId === currentUserId) || (createdBy === ydocRef.current?.clientID);
          
          let shouldLock = false;
          
          if (isTeacher) {
            shouldLock = false;
          } else if ((objectData as any).isLocalOwned && isOwner) {
            shouldLock = false;
          } else if (isReadOnly) {
            shouldLock = true;
          } else if (enforceOwnership && !isOwner) {
            shouldLock = true;
          }

          console.log('🔐 Object permissions:', {
            objectId,
            createdBy,
            creatorUserId,
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
          
          isRemoteChangeRef.current = true;
          (obj as any).setCoords();
          canvas.add(obj as any);
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
      if ((obj as any).excludeFromSync) return;

      const objectId = (obj as any).id || generateObjectId();
      (obj as any).id = objectId;
      
      // Add ownership metadata
      if (!(obj as any).createdBy && ydocRef.current) {
        (obj as any).createdBy = ydocRef.current.clientID;
      }
      if (!(obj as any).creatorUserId && currentUserId) {
        (obj as any).creatorUserId = currentUserId;
      }

      const objectData = (obj as any).toJSON(['id', 'createdBy', 'creatorUserId', 'isLocalOwned']);
      yCanvas.set(objectId, objectData);
      syncedObjectsRef.current.add(objectId);
    }

    /**
     * Yjs → Fabric: Sync remote changes to canvas
     */
    function syncYjsToFabric(event: Y.YMapEvent<any>) {
      if (!canvas || isRemoteChangeRef.current) return;

      // Ignorar eventos originados por este mismo cliente
      if (event.transaction.origin === ydocRef.current?.clientID || event.transaction.local) {
        return;
      }

      isRemoteChangeRef.current = true;

      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const existingObj = canvas.getObjects().find((o: any) => o.id === key);
          
          if (existingObj) {
            const newData = yCanvas.get(key);
            if (newData) {
              const { type, version, ...updateData } = newData as any;
              existingObj.set(updateData);
              existingObj.setCoords();
            }
          } else {
            const objectData = yCanvas.get(key);
            if (objectData) {
              addObjectToCanvas(objectData, key);
            }
          }
        } else if (change.action === 'delete') {
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

    // Fabric Event Handlers
    const handlePathCreated = (e: any) => {
      if (e.path && ydocRef.current) {
        (e.path as any).createdBy = ydocRef.current.clientID;
        if (currentUserId) (e.path as any).creatorUserId = currentUserId;
        console.log('✨ Path created with owner:', ydocRef.current.clientID);
      }
    };

    const handleObjectAdded = (e: any) => {
      if (e.target && !isRemoteChangeRef.current) {
        if ((e.target as any).excludeFromSync) return;
        if (!(e.target as any).createdBy && ydocRef.current) {
          (e.target as any).createdBy = ydocRef.current.clientID;
          console.log('✨ Object ownership assigned on add:', ydocRef.current.clientID);
        }
        if (!(e.target as any).creatorUserId && currentUserId) {
          (e.target as any).creatorUserId = currentUserId;
        }
        syncFabricToYjs(e.target);
      }
    };

    const handleObjectModified = (e: any) => {
      if (isReadOnly || isRemoteChangeRef.current) return;

      if (e.target) {
        if ((e.target as any).excludeFromSync) return;
        syncFabricToYjs(e.target);
      }
    };

    const handleObjectRemoved = (e: any) => {
      if (isReadOnly || isRemoteChangeRef.current) return;

      if (e.target && yCanvas) {
        if ((e.target as any).excludeFromSync) return;
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

    // Manejador para notificar salida antes de que la ventana o pestaña se destruya
    const handleBeforeUnload = () => {
      if (providerRef.current) {
        try {
          providerRef.current.awareness.setLocalState(null);
        } catch (e) {
          // ignore error during browser teardown
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    // Cleanup
    return () => {
      console.log('🔌 Disconnecting Yjs for room:', roomName);
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      canvas.off('path:created', handlePathCreated);
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:removed', handleObjectRemoved);
      
      yCanvas.unobserve(syncYjsToFabric);
      
      const ySessionPermissions = ydoc.getMap('sessionPermissions');
      ySessionPermissions.unobserve(handlePermissionsChange);
      
      yViewport.unobserve(handleViewportChange);
      
      if (viewportBroadcastTimeout) {
        clearTimeout(viewportBroadcastTimeout);
      }
      
      // Notificar a Yjs Awareness que este cliente se retiró antes de cerrar el socket
      try {
        provider.awareness.setLocalState(null);
      } catch (e) {
        // ignore
      }

      // Disconnect & destroy provider
      provider.destroy();
      
      // Clear refs
      ydocRef.current = null;
      providerRef.current = null;
      yCanvasRef.current = null;
      syncedObjectsRef.current.clear();
    };
  }, [roomName, canvas, enabled, isReadOnly, enforceOwnership, isTeacher]);

  return {
    isConnected,
    participants,
    participantsList,
    clientId: ydocRef.current?.clientID,
    ydoc: ydocRef.current,
    provider: providerRef.current,
    awareness: providerRef.current?.awareness || null,
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
