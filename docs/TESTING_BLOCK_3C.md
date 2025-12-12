# BLOQUE 3C - Pruebas con Postman (Sessions + Uploads + Snapshots)

## 📦 Variables de Environment Necesarias

Asegúrate de tener en "Aula Dev":

- `base_url` = `http://localhost:3002`
- `teacher_token` = (tu token de teacher)
- `student_token` = (tu token de student)
- `class_id` = (ID de una clase existente)
- `session_id` = (vacío, lo llenaremos)
- `upload_id` = (vacío, lo llenaremos)
- `snapshot_id` = (vacío, lo llenaremos)

---

## 🧪 PARTE 1: SESSIONS API

### PRUEBA 1: Iniciar Sesión (Teacher)

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/sessions`
- **Authorization**: Bearer → `{{teacher_token}}`
- **Body** (raw JSON):

```json
{
  "class_id": "{{class_id}}"
}
```

**✅ Respuesta (201):**

```json
{
  "success": true,
  "session": {
    "id": "session-uuid",
    "class_id": "class-uuid",
    "teacher_id": "teacher-001",
    "status": "active",
    "yjs_room_name": "room-session-uuid",
    "started_at": "2025-12-12T..."
  }
}
```

**📝 Guardar**: `session.id` en `session_id`

---

### PRUEBA 2: Ver Sesión con Participantes

**Request:**

- **Método**: `GET`
- **URL**: `{{base_url}}/api/sessions/{{session_id}}`
- **Authorization**: Bearer → `{{teacher_token}}`

**✅ Respuesta (200):**

```json
{
  "success": true,
  "session": {
    "id": "session-uuid",
    "class_title": "English Level A1",
    "teacher_name": "Prof. García",
    "status": "active",
    "participants": [],
    "participants_count": 0,
    "started_at": "2025-12-12T..."
  }
}
```

---

### PRUEBA 3: Unirse a Sesión (Student)

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/sessions/{{session_id}}/join`
- **Authorization**: Bearer → `{{student_token}}`

**✅ Respuesta (200):**

```json
{
  "success": true,
  "session": {
    "id": "session-uuid",
    "class_id": "class-uuid",
    "yjs_room_name": "room-session-uuid",
    "yjs_url": "ws://localhost:1234"
  },
  "participant": {
    "id": "participant-uuid",
    "session_id": "session-uuid",
    "user_id": "student-001",
    "joined_at": "2025-12-12T..."
  }
}
```

---

### PRUEBA 4: Ver Sesión con Participante

Repite PRUEBA 2. Ahora deberías ver 1 participante en la lista.

---

### PRUEBA 5: Salir de Sesión (Student)

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/sessions/{{session_id}}/leave`
- **Authorization**: Bearer → `{{student_token}}`

**✅ Respuesta (200):**

```json
{
  "success": true,
  "message": "Left session successfully"
}
```

---

### PRUEBA 6: Terminar Sesión (Teacher)

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/sessions/{{session_id}}/end`
- **Authorization**: Bearer → `{{teacher_token}}`

**✅ Respuesta (200):**

```json
{
  "success": true,
  "session": {
    "id": "session-uuid",
    "status": "ended",
    "ended_at": "2025-12-12T..."
  }
}
```

---

### PRUEBA 7: Obtener Sesión Activa de Clase

**Request:**

- **Método**: `GET`
- **URL**: `{{base_url}}/api/sessions/classes/{{class_id}}/active-session`
- **Authorization**: Bearer → `{{teacher_token}}`

**✅ Respuesta (200):**

```json
{
  "success": true,
  "session": null,
  "message": "No active session found"
}
```

---

## 🧪 PARTE 2: UPLOADS API

### PRUEBA 8: Subir Imagen

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/uploads`
- **Authorization**: Bearer → `{{teacher_token}}`
- **Body**: `form-data`
  - Key: `file`
  - Type: `File`
  - Value: (selecciona una imagen JPG/PNG)

**Pasos en Postman:**

1. En la pestaña "Body", selecciona "form-data"
2. En Key, escribe `file` y cambia el tipo a "File" (dropdown a la derecha)
3. Click en "Select Files" y elige una imagen

**✅ Respuesta (201):**

```json
{
  "success": true,
  "upload": {
    "id": "upload-uuid",
    "url": "/uploads/1234567890-uuid-image.png",
    "filename": "1234567890-uuid-image.png",
    "original_name": "image.png",
    "mime_type": "image/png",
    "size_bytes": 102400,
    "uploaded_at": "2025-12-12T..."
  }
}
```

**📝 Guardar**: `upload.id` en `upload_id`

---

### PRUEBA 9: Ver Imagen

**Request:**

- **Método**: `GET`
- **URL**: `{{base_url}}/uploads/{{filename}}`
  (Usa el `filename` de la respuesta anterior)
- **No Authorization** (público)

**✅ Respuesta**: La imagen se descarga/muestra

---

### PRUEBA 10: Listar Uploads

**Request:**

- **Método**: `GET`
- **URL**: `{{base_url}}/api/uploads`
- **Authorization**: Bearer → `{{teacher_token}}`

**✅ Respuesta (200):**

```json
{
  "success": true,
  "count": 1,
  "uploads": [...]
}
```

---

### PRUEBA 11: Eliminar Upload

**Request:**

- **Método**: `DELETE`
- **URL**: `{{base_url}}/api/uploads/{{upload_id}}`
- **Authorization**: Bearer → `{{teacher_token}}`

**✅ Respuesta (200):**

```json
{
  "success": true,
  "message": "Upload deleted successfully"
}
```

---

## 🧪 PARTE 3: SNAPSHOTS API

### PRUEBA 12: Guardar Snapshot (Student)

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/snapshots`
- **Authorization**: Bearer → `{{student_token}}`
- **Body** (raw JSON):

```json
{
  "slide_id": "slide-001",
  "canvas_data": "{\"version\":\"5.3.0\",\"objects\":[{\"type\":\"circle\",\"radius\":50,\"fill\":\"blue\"}]}"
}
```

**✅ Respuesta (201):**

```json
{
  "success": true,
  "snapshot": {
    "id": "snapshot-uuid",
    "slide_id": "slide-001",
    "student_id": "student-001",
    "canvas_data": "{...}",
    "saved_at": "2025-12-12T..."
  }
}
```

**📝 Guardar**: `snapshot.id` en `snapshot_id`

---

### PRUEBA 13: Ver Mis Copias (Student)

**Request:**

- **Método**: `GET`
- **URL**: `{{base_url}}/api/snapshots/my-copies`
- **Authorization**: Bearer → `{{student_token}}`

**✅ Respuesta (200):**

```json
{
  "success": true,
  "count": 1,
  "copies": [
    {
      "id": "snapshot-uuid",
      "slide_title": "Welcome",
      "slide_number": 1,
      "class_title": "English Level A1 - Unit 1",
      "class_id": "class-001",
      "canvas_data": "{...}",
      "saved_at": "2025-12-12T..."
    }
  ]
}
```

---

### PRUEBA 14: Ver Snapshot Específico

**Request:**

- **Método**: `GET`
- **URL**: `{{base_url}}/api/snapshots/{{snapshot_id}}`
- **Authorization**: Bearer → `{{student_token}}`

**✅ Respuesta (200):**

```json
{
  "success": true,
  "snapshot": {...}
}
```

---

### PRUEBA 15: Eliminar Snapshot

**Request:**

- **Método**: `DELETE`
- **URL**: `{{base_url}}/api/snapshots/{{snapshot_id}}`
- **Authorization**: Bearer → `{{student_token}}`

**✅ Respuesta (200):**

```json
{
  "success": true,
  "message": "Snapshot deleted successfully"
}
```

---

## 🧪 PARTE 4: VALIDACIONES Y ERRORES

### PRUEBA 16: Iniciar Sesión Duplicada (DEBE FALLAR)

Repite PRUEBA 1 (iniciar sesión) sin terminar la anterior.

**✅ Respuesta (409 Conflict):**

```json
{
  "error": {
    "message": "There is already an active session for this class",
    "code": "CONFLICT"
  }
}
```

---

### PRUEBA 17: Student Intenta Terminar Sesión (DEBE FALLAR)

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/sessions/{{session_id}}/end`
- **Authorization**: Bearer → `{{student_token}}`

**✅ Respuesta (403 Forbidden):**

```json
{
  "error": {
    "message": "Access denied. Required role: teacher",
    "code": "FORBIDDEN"
  }
}
```

---

### PRUEBA 18: Subir Archivo No Imagen (DEBE FALLAR)

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/uploads`
- **Authorization**: Bearer → `{{teacher_token}}`
- **Body**: form-data
  - Key: `file`
  - Value: (selecciona un PDF o TXT)

**✅ Respuesta (400 Bad Request):**

```json
{
  "error": {
    "message": "Only image files are allowed (JPEG, PNG, GIF, WebP)",
    "code": "VALIDATION_ERROR"
  }
}
```

---

### PRUEBA 19: Teacher Intenta Guardar Snapshot (DEBE FALLAR)

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/snapshots`
- **Authorization**: Bearer → `{{teacher_token}}`
- **Body** (raw JSON):

```json
{
  "slide_id": "slide-001",
  "canvas_data": "{}"
}
```

**✅ Respuesta (403 Forbidden):**

```json
{
  "error": {
    "message": "Access denied. Required role: student",
    "code": "FORBIDDEN"
  }
}
```

---

## 📋 Checklist de Validación

- [ ] ✅ PRUEBA 1: Iniciar sesión (201)
- [ ] ✅ PRUEBA 2: Ver sesión (200)
- [ ] ✅ PRUEBA 3: Unirse a sesión (200)
- [ ] ✅ PRUEBA 4: Ver participantes (200)
- [ ] ✅ PRUEBA 5: Salir de sesión (200)
- [ ] ✅ PRUEBA 6: Terminar sesión (200)
- [ ] ✅ PRUEBA 7: Sesión activa (200)
- [ ] ✅ PRUEBA 8: Subir imagen (201)
- [ ] ✅ PRUEBA 9: Ver imagen (200)
- [ ] ✅ PRUEBA 10: Listar uploads (200)
- [ ] ✅ PRUEBA 11: Eliminar upload (200)
- [ ] ✅ PRUEBA 12: Guardar snapshot (201)
- [ ] ✅ PRUEBA 13: Ver mis copias (200)
- [ ] ✅ PRUEBA 14: Ver snapshot (200)
- [ ] ✅ PRUEBA 15: Eliminar snapshot (200)
- [ ] ✅ PRUEBA 16: Sesión duplicada (409)
- [ ] ✅ PRUEBA 17: Student termina sesión (403)
- [ ] ✅ PRUEBA 18: Upload no imagen (400)
- [ ] ✅ PRUEBA 19: Teacher guarda snapshot (403)

---

## 🎯 Resultado Esperado

Si todas las 19 pruebas pasan:

- ✅ Sessions API completa
- ✅ Upload de archivos funcionando
- ✅ Snapshots de estudiantes funcionando
- ✅ Validaciones de permisos correctas
- ✅ Manejo de conflictos funcionando

**¡BLOQUE 3C Y FASE 3 COMPLETADOS!** 🎉

---

## 🚀 Siguiente Paso

1. Haz commit: `git commit -m "feat: sessions, uploads and snapshots API (Block 3C)"`
2. **¡FASE 3 COMPLETA!** 🎊
3. Continúa con **FASE 4**: Frontend Development
