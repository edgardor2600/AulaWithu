# 🚨 PLAN DE CORRECCIÓN - SISTEMA DE SESIONES COLABORATIVAS

**Proyecto:** Aula Colaborativa MVP  
**Fecha:** 2025-12-15  
**Objetivo:** Solucionar todos los problemas críticos del sistema de sesiones en vivo y colaboración en tiempo real

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Problemas Identificados](#problemas-identificados)
3. [Fase 1: Críticos - Bloqueantes](#fase-1-críticos---bloqueantes)
4. [Fase 2: Altos - Funcionalidad Rota](#fase-2-altos---funcionalidad-rota)
5. [Fase 3: Medios - Estabilización](#fase-3-medios---estabilización)
6. [Fase 4: Bajos - Mejoras](#fase-4-bajos---mejoras)
7. [Checklist de Validación](#checklist-de-validación)
8. [Rollback Plan](#rollback-plan)

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual

- ❌ Colaboración profesor-estudiante **NO FUNCIONA**
- ❌ Sistema de permisos **ROTO**
- ❌ Ownership de objetos **SE PIERDE**
- ⚠️ Múltiples bugs de sincronización

### Problemas Totales Identificados

- 🔴 **Críticos (Bloqueantes):** 2
- 🟠 **Altos (Funcionalidad Rota):** 3
- 🟡 **Medios (Estabilización):** 2
- 🟢 **Bajos (Mejoras):** 1

### Tiempo Estimado Total

- **Fase 1 (Críticos):** 10 minutos
- **Fase 2 (Altos):** 45 minutos
- **Fase 3 (Medios):** 30 minutos
- **Fase 4 (Bajos):** 15 minutos
- **TOTAL:** ~2 horas

---

## 🔍 PROBLEMAS IDENTIFICADOS

### Tabla Resumen

| ID  | Problema                                 | Severidad  | Impacto                 | Tiempo | Archivos Afectados                                     |
| --- | ---------------------------------------- | ---------- | ----------------------- | ------ | ------------------------------------------------------ |
| P1  | Sincronización Rota (id vs session_code) | 🔴 Crítico | Sistema no funciona     | 2 min  | `EditorPage.tsx`                                       |
| P2  | Listener Duplicado en Yjs                | 🔴 Crítico | Objetos duplicados      | 1 min  | `useYjs.ts`                                            |
| P3  | Sin Distinción Profesor/Estudiante       | 🟠 Alto    | Profesor bloqueado      | 15 min | `SessionViewPage.tsx`, `CanvasEditor.tsx`, `useYjs.ts` |
| P4  | Lógica de Permisos Duplicada             | 🟠 Alto    | Comportamiento errático | 20 min | `CanvasEditor.tsx`, `useYjs.ts`                        |
| P5  | Ownership No Persistente                 | 🟠 Alto    | Datos se pierden        | 15 min | `CanvasEditor.tsx`, `EditorPage.tsx`                   |
| P6  | Race Condition clientId                  | 🟡 Medio   | Bloqueos temporales     | 10 min | `CanvasEditor.tsx`                                     |
| P7  | Sin Validación Sesión Real-Time          | 🟡 Medio   | Sesiones fantasma       | 20 min | `SessionViewPage.tsx`                                  |
| P8  | Limpieza Incorrecta Listeners            | 🟢 Bajo    | Bugs sutiles            | 15 min | `useYjs.ts`                                            |

---

## 🔴 FASE 1: CRÍTICOS - BLOQUEANTES

**Objetivo:** Hacer que la colaboración básica funcione  
**Duración:** 10 minutos  
**Requisito:** Completar TODOS antes de pasar a Fase 2

---

### P1: Sincronización Rota (id vs session_code)

**Severidad:** 🔴 CRÍTICO - BLOQUEANTE TOTAL  
**Tiempo:** 2 minutos

#### Descripción del Problema

Profesor y estudiantes se conectan a salas Yjs diferentes:

- **Profesor** usa `activeSession.id` (UUID: "abc-123-def-456")
- **Estudiante** usa `session.session_code` (Código: "ABC123")
- Resultado: **NO SE VEN ENTRE SÍ**

#### Archivos a Modificar

- `client/src/pages/EditorPage.tsx`

#### Solución Paso a Paso

**Paso 1:** Abrir `client/src/pages/EditorPage.tsx`

**Paso 2:** Ir a línea 511 (dentro del componente `CanvasEditor`)

**Paso 3:** Cambiar:

```typescript
// ❌ ANTES (línea 511)
sessionId={activeSession?.id || null}
```

Por:

```typescript
// ✅ DESPUÉS
sessionId={activeSession?.session_code || null}
```

#### Validación

```bash
# 1. Abrir 2 ventanas del navegador
# 2. Ventana 1: Login como profesor → Crear sesión
# 3. Ventana 2: Login como estudiante → Unirse con código
# 4. Profesor dibuja → DEBE aparecer en ventana estudiante
# 5. Estudiante dibuja → DEBE aparecer en ventana profesor
```

#### Criterios de Éxito

- [ ] Profesor ve cambios de estudiante en tiempo real
- [ ] Estudiante ve cambios de profesor en tiempo real
- [ ] Lista de participantes muestra ambos usuarios
- [ ] No hay errores en consola del navegador

---

### P2: Listener Duplicado en Yjs

**Severidad:** 🔴 CRÍTICO - CAUSA DUPLICADOS  
**Tiempo:** 1 minuto

#### Descripción del Problema

El evento `object:added` está registrado DOS VECES en `useYjs.ts`, causando:

- Sincronización duplicada
- Objetos aparecen 2 veces
- Desperdicio de ancho de banda

#### Archivos a Modificar

- `client/src/hooks/useYjs.ts`

#### Solución Paso a Paso

**Paso 1:** Abrir `client/src/hooks/useYjs.ts`

**Paso 2:** Localizar líneas 247-260 (dos listeners `object:added`)

**Paso 3:** ELIMINAR el segundo listener (líneas 253-260):

```typescript
// ❌ ELIMINAR ESTE BLOQUE COMPLETO
canvas.on("object:added", (e) => {
  // Don't sync if read-only or remote change
  if (isReadOnly || isRemoteChangeRef.current) return;

  if (e.target) {
    syncFabricToYjs(e.target);
  }
});
```

**Paso 4:** MANTENER solo el primer listener (líneas 247-251):

```typescript
// ✅ MANTENER ESTE
canvas.on("object:added", (e) => {
  if (e.target && !isRemoteChangeRef.current) {
    syncFabricToYjs(e.target);
  }
});
```

#### Validación

```bash
# 1. Abrir DevTools → Network → WS (WebSocket)
# 2. Dibujar un círculo
# 3. Verificar que solo se envía 1 mensaje (no 2)
# 4. Verificar que no aparecen objetos duplicados
```

#### Criterios de Éxito

- [ ] Cada objeto se sincroniza solo 1 vez
- [ ] No hay duplicados en el canvas
- [ ] Tráfico WebSocket reducido a la mitad

---

### ✅ CHECKPOINT FASE 1

**Antes de continuar a Fase 2, verificar:**

- [ ] P1 completado y validado
- [ ] P2 completado y validado
- [ ] Colaboración básica funciona (profesor ↔ estudiante)
- [ ] No hay objetos duplicados
- [ ] Commit realizado: `git commit -m "fix(sessions): resolve critical sync issues (P1, P2)"`

**Si algo falla:** NO continuar. Revisar logs y solucionar antes de avanzar.

---

## 🟠 FASE 2: ALTOS - FUNCIONALIDAD ROTA

**Objetivo:** Implementar sistema de permisos funcional  
**Duración:** 45 minutos  
**Requisito:** Fase 1 completada exitosamente

---

### P3: Sin Distinción Profesor/Estudiante

**Severidad:** 🟠 ALTO - FUNCIONALIDAD ROTA  
**Tiempo:** 15 minutos

#### Descripción del Problema

No hay forma de distinguir si el usuario conectado es el profesor o un estudiante:

- `enforceOwnership={true}` se aplica a TODOS
- El profesor queda bloqueado en su propia sesión
- No puede editar objetos de estudiantes

#### Archivos a Modificar

1. `client/src/pages/SessionViewPage.tsx`
2. `client/src/components/CanvasEditor.tsx`
3. `client/src/hooks/useYjs.ts`

#### Solución Paso a Paso

**PASO 1: Detectar si es profesor (SessionViewPage.tsx)**

Agregar después de línea 24:

```typescript
// Línea 25 - NUEVO
const [isTeacher, setIsTeacher] = useState(false);
```

Modificar el `useEffect` de carga de sesión (líneas 26-57):

```typescript
useEffect(() => {
  if (!sessionId) return;

  const loadSession = async () => {
    try {
      const sessionData = await sessionService.getById(sessionId);
      setSession(sessionData);

      if (!sessionData.is_active) {
        toast.error("This session has ended");
        navigate("/join");
        return;
      }

      // ✅ NUEVO: Detectar si es el profesor
      const userId = localStorage.getItem("userId");
      const userIsTeacher = sessionData.teacher_id === userId;
      setIsTeacher(userIsTeacher);

      const slideData = await slideService.getById(sessionData.slide_id);
      setSlide(slideData);

      toast.success(`Connected to session: ${sessionData.session_code}`);
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("Failed to load session");
      navigate("/join");
    } finally {
      setIsLoading(false);
    }
  };

  loadSession();
}, [sessionId, navigate]);
```

**PASO 2: Pasar isTeacher al CanvasEditor (SessionViewPage.tsx)**

Modificar línea 161:

```typescript
// ❌ ANTES
enforceOwnership={true}

// ✅ DESPUÉS
enforceOwnership={!isTeacher}  // Solo estudiantes tienen restricciones
isTeacher={isTeacher}          // Pasar prop adicional
```

**PASO 3: Actualizar CanvasEditor para recibir isTeacher**

En `client/src/components/CanvasEditor.tsx`, modificar la interfaz (línea 21):

```typescript
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
  isTeacher?: boolean; // ✅ NUEVO
}
```

Modificar la desestructuración (línea 38):

```typescript
export const CanvasEditor = ({
  slideId,
  initialData,
  onSave,
  onChange,
  isReadOnly = false,
  sessionId = null,
  onParticipantsChange,
  enforceOwnership = false,
  isTeacher = false  // ✅ NUEVO
}: CanvasEditorProps) => {
```

Pasar a useYjs (línea 74):

```typescript
const { isConnected, participants, participantsList, clientId } = useYjs(
  sessionId,
  fabricCanvasRef.current,
  !!sessionId,
  isReadOnly,
  enforceOwnership,
  isTeacher // ✅ NUEVO
);
```

**PASO 4: Actualizar useYjs para usar isTeacher**

En `client/src/hooks/useYjs.ts`, modificar la firma (línea 21):

```typescript
export function useYjs(
  roomName: string | null,
  canvas: fabric.Canvas | null,
  enabled: boolean = true,
  isReadOnly: boolean = false,
  enforceOwnership: boolean = false,
  isTeacher: boolean = false  // ✅ NUEVO
) {
```

Modificar la lógica de bloqueo en `addObjectToCanvas` (línea 152):

```typescript
// ✅ MODIFICAR línea 152-153
const isOwner = (obj as any).createdBy === ydocRef.current?.clientID;
const shouldLock = isReadOnly || (enforceOwnership && !isOwner && !isTeacher);
```

#### Validación

```bash
# Test 1: Profesor
# 1. Login como profesor
# 2. Crear sesión
# 3. Dibujar objeto → debe poder editarlo
# 4. Estudiante dibuja → profesor DEBE poder editar objeto del estudiante

# Test 2: Estudiante
# 1. Login como estudiante
# 2. Unirse a sesión
# 3. Dibujar objeto → debe poder editarlo
# 4. Intentar editar objeto del profesor → DEBE estar bloqueado
```

#### Criterios de Éxito

- [ ] Profesor puede editar TODOS los objetos (propios y de estudiantes)
- [ ] Estudiante solo puede editar sus propios objetos
- [ ] Estudiante NO puede editar objetos del profesor
- [ ] Badge muestra correctamente el rol (profesor/estudiante)

---

### P4: Lógica de Permisos Duplicada

**Severidad:** 🟠 ALTO - COMPORTAMIENTO ERRÁTICO  
**Tiempo:** 20 minutos

#### Descripción del Problema

La lógica de aplicar permisos existe en DOS lugares:

1. `CanvasEditor.tsx` (líneas 361-406)
2. `useYjs.ts` (líneas 150-172)

Esto causa:

- Comportamiento inconsistente
- Objetos se bloquean/desbloquean aleatoriamente
- Difícil de debuggear

#### Archivos a Modificar

1. `client/src/components/CanvasEditor.tsx`
2. `client/src/hooks/useYjs.ts`

#### Solución Paso a Paso

**PASO 1: Eliminar lógica duplicada de CanvasEditor**

En `client/src/components/CanvasEditor.tsx`, ELIMINAR el `useEffect` completo (líneas 361-406):

```typescript
// ❌ ELIMINAR TODO ESTE BLOQUE (líneas 361-406)
// Update canvas permissions whenever isReadOnly, clientId, or enforceOwnership changes
useEffect(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;

  console.log("🔒 Updating permissions:", {
    isReadOnly,
    enforceOwnership,
    clientId,
  });

  if (isReadOnly) {
    // READ-ONLY MODE: Lock everything
    canvas.selection = false;
    canvas.isDrawingMode = false;
    canvas.forEachObject((obj) => applyLock(obj, true));
    canvas.defaultCursor = "default";
    canvas.hoverCursor = "default";
    console.log("✅ Canvas set to READ-ONLY");
  } else {
    // EDIT MODE: Check ownership if enforced
    canvas.selection = true;
    // Drawing mode handled by tool state, but ensure it's allowed
    if (currentTool === "pencil") canvas.isDrawingMode = true;

    canvas.forEachObject((obj) => {
      // ... resto del código
    });

    canvas.defaultCursor = "default";
    canvas.hoverCursor = "move";
    console.log(
      "✅ Canvas set to EDIT mode (Ownership enforced:",
      enforceOwnership,
      ")"
    );
  }
  canvas.renderAll();
}, [isReadOnly, enforceOwnership, clientId, applyLock, currentTool]);
```

**PASO 2: Mantener solo función applyLock (es útil)**

MANTENER la función `applyLock` (líneas 83-111) ya que `useYjs` la puede necesitar.

**PASO 3: Fortalecer lógica en useYjs**

En `client/src/hooks/useYjs.ts`, modificar `addObjectToCanvas` (líneas 137-184):

```typescript
async function addObjectToCanvas(objectData: any, objectId: string) {
  if (!canvas) return;

  try {
    const objects = await fabric.util.enlivenObjects([objectData]);
    const obj = objects[0];

    if (obj && typeof obj === "object" && "type" in obj) {
      (obj as any).id = objectId;

      // ✅ MEJORADO: Aplicar permisos basados en ownership y rol
      const createdBy = (obj as any).createdBy;
      const isOwner = createdBy === ydocRef.current?.clientID;

      // Lógica de bloqueo:
      // - Si isReadOnly: bloquear TODO
      // - Si enforceOwnership Y no es owner Y no es teacher: bloquear
      const shouldLock =
        isReadOnly || (enforceOwnership && !isOwner && !isTeacher);

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

      isRemoteChangeRef.current = true;
      canvas.add(obj as any);
      isRemoteChangeRef.current = false;

      syncedObjectsRef.current.add(objectId);
    }
  } catch (error) {
    console.error("Error adding object to canvas:", error);
  }
}
```

**PASO 4: Actualizar dependencias del useEffect**

Modificar línea 309 para incluir `isTeacher`:

```typescript
}, [roomName, canvas, enabled, isReadOnly, enforceOwnership, isTeacher]);
```

#### Validación

```bash
# 1. Verificar que NO hay logs duplicados de "🔒 Updating permissions"
# 2. Crear objeto como profesor → debe ser editable
# 3. Crear objeto como estudiante → debe ser editable para él, bloqueado para otros
# 4. Refrescar página → permisos deben mantenerse correctos
```

#### Criterios de Éxito

- [ ] Solo hay UNA fuente de verdad para permisos (useYjs)
- [ ] No hay comportamiento errático
- [ ] Permisos se aplican consistentemente
- [ ] Logs de consola son claros y no duplicados

---

### P5: Ownership No Persistente

**Severidad:** 🟠 ALTO - DATOS SE PIERDEN  
**Tiempo:** 15 minutos

#### Descripción del Problema

La propiedad `createdBy` se guarda en Yjs pero NO en la base de datos:

- Al refrescar la página, se pierde quién creó cada objeto
- Los estudiantes pueden editar objetos que antes no podían
- El sistema de permisos se rompe

#### Archivos a Modificar

1. `client/src/components/CanvasEditor.tsx`
2. `client/src/pages/EditorPage.tsx`

#### Solución Paso a Paso

**PASO 1: Incluir metadata en notifyChange (CanvasEditor.tsx)**

Modificar la función `notifyChange` (líneas 408-415):

```typescript
// Notify parent of canvas changes
const notifyChange = useCallback(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas || !onChange || isLoadingRef.current || isUndoRedoRef.current)
    return;

  // ✅ MODIFICADO: Incluir propiedades personalizadas
  const canvasData = JSON.stringify(canvas.toJSON(["id", "createdBy"]));
  onChange(canvasData);
}, [onChange]);
```

**PASO 2: Incluir metadata en saveHistory (CanvasEditor.tsx)**

Modificar la función `saveHistory` (línea 125):

```typescript
const saveHistory = useCallback(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas || isUndoRedoRef.current || isLoadingRef.current) return;

  // ✅ MODIFICADO: Incluir propiedades personalizadas
  const currentState = JSON.stringify(canvas.toJSON(["id", "createdBy"]));

  // Check if state actually changed
  if (historyRef.current[historyIndexRef.current] === currentState) {
    console.log("State unchanged, skipping history save");
    return;
  }

  // Remove any states after current index
  historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);

  // Add new state
  historyRef.current.push(currentState);
  historyIndexRef.current++;

  console.log(
    "History saved. Index:",
    historyIndexRef.current,
    "Total:",
    historyRef.current.length
  );

  // Limit history to 50 states
  if (historyRef.current.length > 50) {
    historyRef.current.shift();
    historyIndexRef.current--;
  }

  setCanUndo(historyIndexRef.current > 0);
  setCanRedo(false);
}, []);
```

**PASO 3: Incluir metadata en handleSave (CanvasEditor.tsx)**

Modificar la función `handleSave` (líneas 748-762):

```typescript
const handleSave = async () => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;

  setIsSaving(true);
  try {
    // ✅ MODIFICADO: Incluir propiedades personalizadas
    const canvasData = JSON.stringify(canvas.toJSON(["id", "createdBy"]));
    await onSave(canvasData);
    toast.success("Slide saved!");
  } catch (error) {
    console.error("Error saving:", error);
  } finally {
    setIsSaving(false);
  }
};
```

**PASO 4: Verificar que EditorPage guarda correctamente**

En `client/src/pages/EditorPage.tsx`, verificar que `handleCanvasChange` (línea 197) ya recibe el string completo:

```typescript
// ✅ Ya está correcto - solo verificar
const handleCanvasChange = useCallback(
  (canvasData: string) => {
    const currentSlide = slides[currentSlideIndex];
    if (!currentSlide) return;

    console.log("handleCanvasChange called, size:", canvasData.length);

    // Update in-memory data immediately (no lag)
    slidesDataRef.current.set(currentSlide.id, canvasData); // ✅ Guarda con metadata

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save to backend (3 seconds)
    saveTimeoutRef.current = window.setTimeout(() => {
      console.log("Auto-save triggered after debounce");
      saveToBackend(currentSlide.id, canvasData); // ✅ Guarda con metadata
    }, 3000);
  },
  [slides, currentSlideIndex, saveToBackend]
);
```

#### Validación

```bash
# Test completo de persistencia:
# 1. Profesor crea objeto A
# 2. Estudiante crea objeto B
# 3. Guardar slide (Ctrl+S)
# 4. Refrescar página (F5)
# 5. Verificar que:
#    - Objeto A sigue siendo del profesor
#    - Objeto B sigue siendo del estudiante
#    - Permisos se mantienen correctos
```

#### Criterios de Éxito

- [ ] Ownership se guarda en DB
- [ ] Al refrescar, ownership se recupera
- [ ] Permisos se mantienen después de reload
- [ ] No hay errores de parsing JSON

---

### ✅ CHECKPOINT FASE 2

**Antes de continuar a Fase 3, verificar:**

- [ ] P3 completado y validado (profesor vs estudiante)
- [ ] P4 completado y validado (lógica unificada)
- [ ] P5 completado y validado (ownership persistente)
- [ ] Sistema de permisos funciona correctamente
- [ ] Ownership se mantiene después de refrescar
- [ ] Commit realizado: `git commit -m "feat(sessions): implement role-based permissions (P3, P4, P5)"`

**Prueba integral:**

```bash
# Escenario completo:
# 1. Profesor crea sesión y dibuja círculo rojo
# 2. Estudiante 1 se une y dibuja cuadrado azul
# 3. Estudiante 2 se une y dibuja línea verde
# 4. Profesor puede editar los 3 objetos
# 5. Estudiante 1 solo puede editar su cuadrado
# 6. Estudiante 2 solo puede editar su línea
# 7. Guardar y refrescar → permisos se mantienen
```

---

## 🟡 FASE 3: MEDIOS - ESTABILIZACIÓN

**Objetivo:** Eliminar bugs de timing y mejorar robustez  
**Duración:** 30 minutos  
**Requisito:** Fase 2 completada exitosamente

---

### P6: Race Condition con clientId

**Severidad:** 🟡 MEDIO - BLOQUEOS TEMPORALES  
**Tiempo:** 10 minutos

#### Descripción del Problema

Al cargar la página, `clientId` es `undefined` inicialmente:

- Los objetos se cargan antes de que `clientId` esté disponible
- La lógica de permisos evalúa `createdBy === undefined`
- Todos los objetos quedan bloqueados temporalmente

#### Archivos a Modificar

- `client/src/hooks/useYjs.ts`

#### Solución Paso a Paso

**PASO 1: Esperar a que clientId esté disponible**

En `client/src/hooks/useYjs.ts`, modificar la función `loadFromYjs` (líneas 118-132):

```typescript
function loadFromYjs() {
  if (!canvas || !yCanvas) return;

  // ✅ NUEVO: Esperar a que clientId esté disponible
  if (!ydocRef.current?.clientID) {
    console.log("⏳ Waiting for clientID before loading objects...");
    return;
  }

  console.log("📥 Loading objects from Yjs...");
  isRemoteChangeRef.current = true;

  yCanvas.forEach((objectData: any, objectId: string) => {
    if (!syncedObjectsRef.current.has(objectId)) {
      addObjectToCanvas(objectData, objectId);
    }
  });

  canvas.renderAll();
  isRemoteChangeRef.current = false;
}
```

**PASO 2: Llamar loadFromYjs cuando clientId esté listo**

Modificar el evento `sync` (líneas 74-80):

```typescript
provider.on("sync", (isSynced: boolean) => {
  if (isSynced) {
    console.log("✅ Yjs initial sync complete");

    // ✅ MODIFICADO: Esperar un momento para que clientID esté disponible
    setTimeout(() => {
      if (ydocRef.current?.clientID) {
        console.log("✅ ClientID available:", ydocRef.current.clientID);
        loadFromYjs();
      } else {
        console.warn("⚠️ ClientID still not available after sync");
      }
    }, 100); // Pequeño delay para asegurar que clientID está listo
  }
});
```

**PASO 3: Agregar logs de debug**

En `addObjectToCanvas`, agregar logs (línea 152):

```typescript
// ✅ AGREGAR después de línea 152
const createdBy = (obj as any).createdBy;
const isOwner = createdBy === ydocRef.current?.clientID;

console.log("🔐 Object permissions:", {
  objectId,
  createdBy,
  myClientId: ydocRef.current?.clientID,
  isOwner,
  isTeacher,
  willLock: isReadOnly || (enforceOwnership && !isOwner && !isTeacher),
});

const shouldLock = isReadOnly || (enforceOwnership && !isOwner && !isTeacher);
```

#### Validación

```bash
# 1. Abrir DevTools → Console
# 2. Refrescar página en sesión activa
# 3. Verificar logs:
#    - "⏳ Waiting for clientID..." NO debe aparecer
#    - "✅ ClientID available: [número]" debe aparecer
#    - "🔐 Object permissions" debe mostrar valores correctos
# 4. Objetos deben tener permisos correctos desde el inicio
```

#### Criterios de Éxito

- [ ] No hay bloqueos temporales al cargar
- [ ] Permisos se aplican correctamente desde el primer momento
- [ ] Logs muestran que clientID está disponible antes de cargar objetos
- [ ] No hay warnings de "clientID undefined"

---

### P7: Sin Validación de Sesión en Tiempo Real

**Severidad:** 🟡 MEDIO - SESIONES FANTASMA  
**Tiempo:** 20 minutos

#### Descripción del Problema

La sesión se valida solo al cargar la página:

- Si el profesor termina la sesión, los estudiantes no se enteran
- Estudiantes quedan en "sesiones fantasma"
- Siguen dibujando pero nadie más los ve

#### Archivos a Modificar

- `client/src/pages/SessionViewPage.tsx`

#### Solución Paso a Paso

**PASO 1: Agregar polling de validación**

En `client/src/pages/SessionViewPage.tsx`, agregar después del primer `useEffect` (después de línea 57):

```typescript
// ✅ NUEVO: Validar sesión periódicamente
useEffect(() => {
  if (!sessionId || !session) return;

  const checkSessionStatus = async () => {
    try {
      const sessionData = await sessionService.getById(sessionId);

      // Si la sesión ya no está activa
      if (!sessionData.is_active) {
        toast.error("The session has ended");
        navigate("/join");
      }
    } catch (error) {
      console.error("Session validation failed:", error);
      // Si hay error al obtener sesión, probablemente fue eliminada
      toast.error("Session no longer exists");
      navigate("/join");
    }
  };

  // Validar cada 30 segundos
  const interval = setInterval(checkSessionStatus, 30000);

  // Cleanup
  return () => clearInterval(interval);
}, [sessionId, session, navigate]);
```

**PASO 2: Agregar indicador visual de estado**

Modificar el header (líneas 103-144) para mostrar estado de sesión:

```typescript
{
  /* Header */
}
<div className="bg-white border-b border-gray-200 px-6 py-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-4">
      <button
        onClick={() => navigate("/join")}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Leave Session</span>
      </button>
      <div className="h-6 w-px bg-gray-300"></div>
      <div className="flex items-center space-x-2">
        {/* ✅ MODIFICADO: Indicador más claro */}
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <Radio className="w-5 h-5 text-green-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Live Session: {session.session_code}
            </h1>
            <p className="text-xs text-gray-500">
              {isTeacher ? "👨‍🏫 Teacher Mode" : "👨‍🎓 Student Mode"}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div className="flex items-center space-x-4">
      {/* Participants */}
      <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
        <Users className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-600">
          {participantsCount} connected
        </span>
      </div>

      {/* Permission Badge */}
      <div
        className={`px-3 py-2 rounded-lg ${
          isReadOnly
            ? "bg-yellow-50 text-yellow-700"
            : "bg-green-50 text-green-700"
        }`}
      >
        <span className="text-sm font-medium">
          {isReadOnly ? "👁️ View Only" : "✏️ Can Draw"}
        </span>
      </div>
    </div>
  </div>
</div>;
```

**PASO 3: Agregar listener de visibilidad de página**

Agregar otro `useEffect` para validar cuando la página vuelve a estar visible:

```typescript
// ✅ NUEVO: Validar cuando usuario regresa a la pestaña
useEffect(() => {
  if (!sessionId) return;

  const handleVisibilityChange = async () => {
    if (!document.hidden) {
      // Usuario regresó a la pestaña, validar sesión
      try {
        const sessionData = await sessionService.getById(sessionId);
        if (!sessionData.is_active) {
          toast.error("The session has ended");
          navigate("/join");
        }
      } catch (error) {
        console.error("Session validation on focus failed:", error);
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () =>
    document.removeEventListener("visibilitychange", handleVisibilityChange);
}, [sessionId, navigate]);
```

#### Validación

```bash
# Test 1: Sesión termina mientras estudiante está conectado
# 1. Estudiante se une a sesión
# 2. Profesor termina sesión desde EditorPage
# 3. Esperar 30 segundos
# 4. Estudiante debe ver toast "The session has ended"
# 5. Estudiante debe ser redirigido a /join

# Test 2: Usuario regresa a pestaña
# 1. Estudiante en sesión
# 2. Cambiar a otra pestaña
# 3. Profesor termina sesión
# 4. Regresar a pestaña del estudiante
# 5. Debe detectar que sesión terminó
```

#### Criterios de Éxito

- [ ] Estudiantes son notificados cuando sesión termina
- [ ] Redirección automática a /join
- [ ] Validación funciona al regresar a la pestaña
- [ ] No hay "sesiones fantasma"

---

### ✅ CHECKPOINT FASE 3

**Antes de continuar a Fase 4, verificar:**

- [ ] P6 completado y validado (race condition)
- [ ] P7 completado y validado (validación real-time)
- [ ] No hay bloqueos al cargar
- [ ] Sesiones terminadas se detectan correctamente
- [ ] Commit realizado: `git commit -m "fix(sessions): resolve timing issues and add session validation (P6, P7)"`

---

## 🟢 FASE 4: BAJOS - MEJORAS

**Objetivo:** Pulir detalles y prevenir bugs futuros  
**Duración:** 15 minutos  
**Requisito:** Fase 3 completada exitosamente

---

### P8: Limpieza Incorrecta de Listeners

**Severidad:** 🟢 BAJO - BUGS SUTILES  
**Tiempo:** 15 minutos

#### Descripción del Problema

Al limpiar listeners en `useYjs`, se eliminan TODOS los listeners de esos eventos:

```typescript
canvas.off("object:added"); // ❌ Elimina TODOS, no solo los de Yjs
```

Esto puede romper:

- Sistema de undo/redo
- Auto-save
- Otros componentes que escuchan los mismos eventos

#### Archivos a Modificar

- `client/src/hooks/useYjs.ts`

#### Solución Paso a Paso

**PASO 1: Guardar referencias a las funciones de listener**

En `client/src/hooks/useYjs.ts`, después de la función `syncYjsToFabric` (línea 244), crear las funciones con nombres:

```typescript
// ✅ NUEVO: Definir funciones con nombres para poder eliminarlas específicamente
const handleObjectAdded = (e: any) => {
  if (e.target && !isRemoteChangeRef.current) {
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
```

**PASO 2: Registrar listeners con las funciones nombradas**

Reemplazar las líneas 247-282 con:

```typescript
// ✅ MODIFICADO: Registrar con funciones nombradas
canvas.on("object:added", handleObjectAdded);
canvas.on("object:modified", handleObjectModified);
canvas.on("object:removed", handleObjectRemoved);
```

**PASO 3: Limpiar solo los listeners específicos**

Modificar el cleanup (líneas 288-294):

```typescript
// Cleanup
return () => {
  console.log("🔌 Disconnecting Yjs for room:", roomName);

  // ✅ MODIFICADO: Remove only our specific listeners
  canvas.off("object:added", handleObjectAdded);
  canvas.off("object:modified", handleObjectModified);
  canvas.off("object:removed", handleObjectRemoved);

  // Unobserve Yjs
  yCanvas.unobserve(syncYjsToFabric);

  // Disconnect provider
  provider.disconnect();
  provider.destroy();

  // Clear refs
  ydocRef.current = null;
  providerRef.current = null;
  yCanvasRef.current = null;
  syncedObjectsRef.current.clear();
};
```

#### Validación

```bash
# Test 1: Verificar que undo/redo sigue funcionando
# 1. Dibujar varios objetos
# 2. Hacer Ctrl+Z (undo)
# 3. Hacer Ctrl+Y (redo)
# 4. Debe funcionar correctamente

# Test 2: Verificar que auto-save sigue funcionando
# 1. Dibujar objeto
# 2. Esperar 3 segundos
# 3. Verificar que aparece "Saving..." en header
# 4. Debe guardar correctamente

# Test 3: Desconectar y reconectar
# 1. Unirse a sesión
# 2. Salir de sesión
# 3. Volver a unirse
# 4. No debe haber errores de "listener already registered"
```

#### Criterios de Éxito

- [ ] Undo/redo funciona después de usar sesiones
- [ ] Auto-save funciona correctamente
- [ ] No hay errores de listeners duplicados
- [ ] Cleanup es limpio y específico

---

### ✅ CHECKPOINT FINAL

**Verificación completa del sistema:**

- [ ] P1-P8 completados y validados
- [ ] Todas las pruebas pasadas
- [ ] No hay errores en consola
- [ ] No hay warnings de React
- [ ] Commit final: `git commit -m "refactor(sessions): improve listener cleanup (P8)"`

---

## ✅ CHECKLIST DE VALIDACIÓN

### Pruebas Funcionales

#### Test Suite 1: Colaboración Básica

- [ ] Profesor crea sesión → código se genera
- [ ] Estudiante se une con código → aparece en lista
- [ ] Profesor dibuja → estudiante lo ve en tiempo real
- [ ] Estudiante dibuja → profesor lo ve en tiempo real
- [ ] Múltiples estudiantes se ven entre sí

#### Test Suite 2: Sistema de Permisos

- [ ] Profesor puede editar todos los objetos
- [ ] Profesor puede mover objetos de estudiantes
- [ ] Profesor puede eliminar objetos de estudiantes
- [ ] Estudiante puede editar solo sus objetos
- [ ] Estudiante NO puede editar objetos del profesor
- [ ] Estudiante NO puede editar objetos de otros estudiantes
- [ ] Modo "View Only" bloquea todo para estudiantes

#### Test Suite 3: Persistencia

- [ ] Guardar slide con objetos de varios usuarios
- [ ] Refrescar página
- [ ] Ownership se mantiene
- [ ] Permisos se mantienen
- [ ] Objetos siguen siendo editables por sus dueños

#### Test Suite 4: Manejo de Sesiones

- [ ] Profesor termina sesión → estudiantes son notificados
- [ ] Estudiantes son redirigidos a /join
- [ ] No se pueden unir a sesión terminada
- [ ] Validación funciona al regresar a pestaña

#### Test Suite 5: Edge Cases

- [ ] Desconexión de internet → reconexión automática
- [ ] Múltiples objetos creados simultáneamente
- [ ] Undo/redo con objetos de varios usuarios
- [ ] Copiar/pegar objetos mantiene ownership
- [ ] Exportar slide incluye todos los objetos

### Pruebas de Performance

- [ ] Latencia < 200ms en sincronización
- [ ] No hay lag al dibujar con 5+ participantes
- [ ] Canvas responde fluido con 100+ objetos
- [ ] Auto-save no bloquea UI
- [ ] WebSocket no consume excesivo ancho de banda

### Pruebas de Seguridad

- [ ] Estudiante no puede modificar `enforceOwnership` desde DevTools
- [ ] Estudiante no puede falsificar `createdBy`
- [ ] Profesor no puede ser bloqueado de su propia sesión
- [ ] Sesiones terminadas no son accesibles

---

## 🔄 ROLLBACK PLAN

### Si algo sale mal durante la implementación:

#### Opción 1: Rollback por Fase

```bash
# Si falla Fase 2, volver a Fase 1
git log --oneline  # Ver commits
git reset --hard <commit-hash-fase-1>
git push --force origin main  # Solo si es necesario
```

#### Opción 2: Rollback Completo

```bash
# Volver al estado antes de empezar
git stash  # Guardar cambios actuales
git checkout <commit-hash-inicial>
git checkout -b rollback-branch
```

#### Opción 3: Revertir Archivo Específico

```bash
# Si solo un archivo tiene problemas
git checkout HEAD~1 -- client/src/hooks/useYjs.ts
```

### Backup Recomendado

Antes de empezar:

```bash
# Crear branch de backup
git checkout -b backup-before-session-fixes
git push origin backup-before-session-fixes

# Volver a main
git checkout main
```

---

## 📝 NOTAS FINALES

### Orden de Ejecución ESTRICTO

1. **NO saltar fases** - Cada fase depende de la anterior
2. **Validar después de cada problema** - No continuar si algo falla
3. **Hacer commits frecuentes** - Uno por problema resuelto
4. **Probar con 2+ navegadores** - Siempre verificar colaboración

### Comandos Útiles

```bash
# Ver estado de Git
git status

# Ver cambios
git diff

# Commit con mensaje descriptivo
git commit -m "fix(sessions): <descripción>"

# Ver logs
git log --oneline --graph

# Deshacer último commit (mantener cambios)
git reset --soft HEAD~1
```

### Recursos de Debug

```javascript
// En DevTools Console
localStorage.getItem("userId");
localStorage.getItem("userRole");

// Ver estado de Yjs
ydoc.clientID;
awareness.getStates();

// Ver objetos en canvas
canvas.getObjects().map((o) => ({ id: o.id, createdBy: o.createdBy }));
```

---

## 🎯 CRITERIOS DE ÉXITO GLOBAL

El sistema estará completamente funcional cuando:

✅ **Colaboración:**

- Profesor y estudiantes se ven en tiempo real
- Sincronización bidireccional funciona
- No hay objetos duplicados

✅ **Permisos:**

- Profesor tiene control total
- Estudiantes solo editan lo suyo
- Modo view-only funciona

✅ **Persistencia:**

- Ownership se guarda en DB
- Refrescar no rompe permisos
- Datos no se pierden

✅ **Robustez:**

- No hay race conditions
- Sesiones terminadas se detectan
- Listeners se limpian correctamente

✅ **UX:**

- Latencia < 200ms
- No hay lag
- Indicadores visuales claros

---

**IMPORTANTE:** Este plan debe ejecutarse de forma secuencial. NO implementar problemas en paralelo. Validar cada uno antes de continuar.

**Tiempo total estimado:** 2 horas  
**Complejidad:** Media-Alta  
**Riesgo:** Bajo (si se sigue el orden)

---

**Última actualización:** 2025-12-15  
**Versión del plan:** 1.0
