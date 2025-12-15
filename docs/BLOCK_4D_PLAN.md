# BLOCK 4D - Live Sessions con Yjs

## Plan de Implementación por Fases

---

## 🎯 OBJETIVO GENERAL

Implementar colaboración en tiempo real donde múltiples usuarios (profesor + estudiantes) pueden dibujar simultáneamente en el mismo canvas usando Yjs + WebSockets.

---

## 📋 FASE 1: Fundamentos (30-45 min)

**Estado:** ⏳ Pendiente

### Tareas:

1. ✅ Crear tabla `sessions` en DB
2. ✅ Crear `server/src/db/repositories/sessions-repository.ts`
3. ✅ Crear `server/src/services/session.service.ts`
4. ✅ Crear `server/src/api/sessions.routes.ts`
5. ✅ Mejorar `server/src/websocket/yjs-server.ts`

### API Endpoints a crear:

- `POST /api/sessions` - Crear sesión (profesor)
- `POST /api/sessions/:id/join` - Unirse a sesión (estudiante)
- `PUT /api/sessions/:id/end` - Finalizar sesión (profesor)
- `GET /api/sessions/:id` - Obtener info de sesión
- `GET /api/sessions/:id/participants` - Lista de conectados

### Tabla sessions:

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  slide_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  session_code TEXT UNIQUE NOT NULL,
  is_active INTEGER DEFAULT 1,
  allow_student_draw INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (slide_id) REFERENCES slides(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);
```

### Testing Fase 1:

- [ ] Crear sesión desde Postman → Retorna session_code
- [ ] Verificar que se guarda en DB
- [ ] Unirse con código válido → Success
- [ ] Unirse con código inválido → Error 404

---

## 📋 FASE 2: Integración Yjs + Canvas (45-60 min) ⭐⭐⭐⭐

**Estado:** ⏳ Pendiente
**NOTA:** Esta es la fase más compleja y crítica

### Tareas:

1. ✅ Instalar dependencias: `npm install y-protocols`
2. ✅ Crear `client/src/hooks/useYjs.ts`
3. ✅ Modificar `client/src/components/CanvasEditor.tsx`
4. ✅ Sincronizar Fabric.js objects con Yjs Y.Map
5. ✅ Manejar eventos de Fabric.js → Yjs
6. ✅ Manejar eventos de Yjs → Fabric.js
7. ✅ Prevenir loops infinitos de sincronización

### Arquitectura Yjs:

```
Fabric.js Canvas
    ↓ (object:added, object:modified, object:removed)
Y.Map<string, any> (Yjs shared type)
    ↓ (WebSocket)
Yjs Server (port 1234)
    ↓ (broadcast)
Otros clientes
    ↓ (Y.Map observe)
Fabric.js Canvas (otros usuarios)
```

### Código clave useYjs.ts:

```typescript
const doc = new Y.Doc();
const provider = new WebsocketProvider("ws://localhost:1234", roomName, doc);
const yCanvas = doc.getMap("canvas");

// Fabric → Yjs
canvas.on("object:added", (e) => {
  if (!isRemoteChange) {
    yCanvas.set(e.target.id, e.target.toJSON());
  }
});

// Yjs → Fabric
yCanvas.observe((event) => {
  isRemoteChange = true;
  event.changes.keys.forEach((change, key) => {
    if (change.action === "add" || change.action === "update") {
      // Agregar/actualizar objeto en Fabric
    }
  });
  isRemoteChange = false;
});
```

### Testing Fase 2:

- [ ] Abrir 2 ventanas del navegador
- [ ] Dibujar línea en ventana 1 → Aparece en ventana 2
- [ ] Dibujar círculo en ventana 2 → Aparece en ventana 1
- [ ] Dibujar simultáneamente → Sin conflictos
- [ ] Mover objeto en ventana 1 → Se mueve en ventana 2
- [ ] Borrar objeto en ventana 1 → Desaparece en ventana 2

---

## 📋 FASE 3: UI de Sesión en Vivo (30-40 min)

**Estado:** ⏳ Pendiente

### Tareas:

1. ✅ Agregar botón "Start Live Session" en EditorPage
2. ✅ Crear modal con código de sesión
3. ✅ Crear `client/src/pages/StudentSessionPage.tsx`
4. ✅ Crear componente `client/src/components/ParticipantsList.tsx`
5. ✅ Agregar botón "End Session"
6. ✅ Crear ruta `/session/join` en React Router

### UI Components:

- **LiveSessionButton**: Botón para iniciar/finalizar
- **SessionCodeModal**: Modal que muestra código ABC-123
- **ParticipantsList**: Sidebar con usuarios conectados
- **StudentSessionPage**: Vista para estudiantes

### Testing Fase 3:

- [ ] Click "Start Live Session" → Modal con código
- [ ] Copiar código
- [ ] Ir a `/session/join` → Ingresar código → Redirige a canvas
- [ ] Ver lista de participantes en sidebar
- [ ] Click "End Session" → Sesión termina

---

## 📋 FASE 4: Features Avanzados (30-40 min)

**Estado:** ⏳ Pendiente

### Tareas:

1. ✅ Implementar cursores de colores con Awareness
2. ✅ Mostrar nombres sobre cursores
3. ✅ Toggle "Allow Students to Draw"
4. ✅ Deshabilitar herramientas si no tiene permiso
5. ✅ Guardar snapshots de estudiantes
6. ✅ Reconexión automática al perder conexión

### Awareness Protocol:

```typescript
const awareness = provider.awareness;

// Publicar mi cursor
awareness.setLocalStateField("cursor", { x, y, name, color });

// Escuchar cursores de otros
awareness.on("change", () => {
  const states = awareness.getStates();
  states.forEach((state, clientId) => {
    if (clientId !== doc.clientID) {
      // Mostrar cursor de otro usuario
    }
  });
});
```

### Testing Fase 4:

- [ ] Ver cursor de otro usuario moviéndose
- [ ] Ver nombre sobre cursor
- [ ] Profesor desactiva "Allow Draw" → Estudiante no puede dibujar
- [ ] Profesor activa "Allow Draw" → Estudiante puede dibujar
- [ ] Estudiante guarda snapshot → Se guarda en DB
- [ ] Desconectar WiFi → Reconecta automáticamente

---

## 🎯 RESULTADO FINAL ESPERADO

Al completar las 4 fases tendremos:

✅ Sistema de sesiones en vivo funcional
✅ Colaboración en tiempo real sin conflictos
✅ Cursores de usuarios visibles
✅ Control de permisos por el profesor
✅ UI intuitiva para profesor y estudiantes
✅ Persistencia de sesiones en DB
✅ Reconexión automática
✅ Snapshots de estudiantes

---

## 📦 COMMITS PLANEADOS

### Después de Fase 1-2:

```
feat(block-4d): implement real-time collaboration foundation

- Add sessions table and repository
- Create session service and API routes
- Integrate Yjs with Fabric.js canvas
- Implement bidirectional sync (Fabric ↔ Yjs)
- Add WebSocket connection management
- Prevent infinite sync loops

Phases 1-2 complete
```

### Después de Fase 3-4:

```
feat(block-4d): add live session UI and advanced features

- Add "Start Live Session" button and modal
- Create student session join page
- Implement participants list sidebar
- Add user cursors with Awareness protocol
- Implement permission toggle (allow/deny student drawing)
- Add student snapshot functionality
- Implement auto-reconnection

Phases 3-4 complete - Block 4D DONE
```

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: Loop infinito de sincronización

**Síntoma:** Canvas se actualiza infinitamente
**Solución:** Usar flag `isRemoteChange` para prevenir re-sync

### Problema 2: Objetos duplicados

**Síntoma:** Cada objeto aparece 2 veces
**Solución:** Verificar que IDs sean únicos y consistentes

### Problema 3: WebSocket no conecta

**Síntoma:** Error de conexión
**Solución:** Verificar que puerto 1234 esté libre y servidor Yjs corriendo

### Problema 4: Cambios no se propagan

**Síntoma:** Dibujo en ventana 1, no aparece en ventana 2
**Solución:** Verificar que eventos de Fabric.js estén correctamente conectados a Yjs

### Problema 5: Conflictos al dibujar simultáneamente

**Síntoma:** Objetos desaparecen o se corrompen
**Solución:** Yjs debería resolver automáticamente, verificar que Y.Map esté bien configurado

---

## 📚 RECURSOS Y REFERENCIAS

- Yjs Docs: https://docs.yjs.dev/
- y-websocket: https://github.com/yjs/y-websocket
- Fabric.js Events: http://fabricjs.com/events
- Awareness Protocol: https://docs.yjs.dev/getting-started/adding-awareness

---

## ⚠️ NOTAS IMPORTANTES

1. **NO modificar** el servidor Yjs mientras hay sesiones activas
2. **Siempre testear** con 2+ ventanas abiertas
3. **Verificar** que IDs de objetos sean únicos
4. **Usar** `isRemoteChange` flag para prevenir loops
5. **Guardar** frecuentemente durante desarrollo

---

**ESTE ARCHIVO SE BORRARÁ AL COMPLETAR BLOCK 4D**

Estado actual: 🟡 En progreso
Última actualización: 2025-12-13
