# API Contracts - Aula Colaborativa

## Base URL

- **Development**: `http://localhost:3002/api`
- **Production**: `https://your-domain.com/api`

## Authentication

Todos los endpoints (excepto `/auth/join`) requieren JWT en header:

```
Authorization: Bearer <token>
```

## Error Format

```json
{
  "error": {
    "message": "Descripción del error",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validación)
- `401` - Unauthorized (sin token o token inválido)
- `403` - Forbidden (sin permisos)
- `404` - Not Found
- `409` - Conflict (ej: recurso ya existe)
- `500` - Internal Server Error

---

## Endpoints

### Authentication

#### POST /auth/join

Crear usuario o login (sin password para MVP).

**Request:**

```json
{
  "name": "Juan Pérez",
  "role": "student" // "teacher" | "student"
}
```

**Response (201):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "name": "Juan Pérez",
    "role": "student",
    "avatar_color": "#3b82f6",
    "created_at": "2025-12-12T10:00:00Z"
  }
}
```

#### GET /auth/me

Obtener información del usuario actual.

**Response (200):**

```json
{
  "id": "user-uuid",
  "name": "Juan Pérez",
  "role": "student",
  "avatar_color": "#3b82f6"
}
```

---

### Classes

#### POST /classes

Crear nueva clase (solo profesores).

**Request:**

```json
{
  "title": "English Level A1",
  "description": "Introduction to basic English"
}
```

**Response (201):**

```json
{
  "id": "class-uuid",
  "title": "English Level A1",
  "description": "Introduction to basic English",
  "teacher_id": "teacher-uuid",
  "thumbnail_url": null,
  "created_at": "2025-12-12T10:00:00Z",
  "updated_at": "2025-12-12T10:00:00Z"
}
```

#### GET /classes

Listar clases.

**Query Params:**

- `teacherId` (optional): Filtrar por profesor

**Response (200):**

```json
{
  "classes": [
    {
      "id": "class-uuid",
      "title": "English Level A1",
      "description": "Introduction to basic English",
      "teacher": {
        "id": "teacher-uuid",
        "name": "Prof. García"
      },
      "created_at": "2025-12-12T10:00:00Z"
    }
  ]
}
```

#### GET /classes/:id

Obtener clase con slides.

**Response (200):**

```json
{
  "id": "class-uuid",
  "title": "English Level A1",
  "description": "Introduction to basic English",
  "teacher": {
    "id": "teacher-uuid",
    "name": "Prof. García"
  },
  "slides": [
    {
      "id": "slide-uuid",
      "slide_number": 1,
      "title": "Welcome",
      "created_at": "2025-12-12T10:00:00Z"
    }
  ]
}
```

#### PUT /classes/:id

Actualizar clase (solo owner).

**Request:**

```json
{
  "title": "English Level A1 - Updated",
  "description": "New description"
}
```

**Response (200):** Clase actualizada

#### DELETE /classes/:id

Eliminar clase (solo owner).

**Response (200):**

```json
{
  "success": true
}
```

---

### Slides

#### POST /classes/:classId/slides

Crear slide (solo profesor).

**Request:**

```json
{
  "title": "Vocabulary",
  "slideNumber": 2 // optional, auto-increment si no se provee
}
```

**Response (201):**

```json
{
  "id": "slide-uuid",
  "class_id": "class-uuid",
  "slide_number": 2,
  "title": "Vocabulary",
  "canvas_data": "{\"version\":\"5.3.0\",\"objects\":[]}",
  "created_at": "2025-12-12T10:00:00Z"
}
```

#### GET /slides/:id

Obtener slide completo.

**Response (200):**

```json
{
  "id": "slide-uuid",
  "class_id": "class-uuid",
  "slide_number": 2,
  "title": "Vocabulary",
  "canvas_data": "{\"version\":\"5.3.0\",\"objects\":[...]}",
  "created_at": "2025-12-12T10:00:00Z",
  "updated_at": "2025-12-12T10:30:00Z"
}
```

#### PUT /slides/:id/canvas

Guardar cambios en canvas (solo profesor).

**Request:**

```json
{
  "canvasData": "{\"version\":\"5.3.0\",\"objects\":[...]}"
}
```

**Response (200):**

```json
{
  "success": true,
  "updated_at": "2025-12-12T10:30:00Z"
}
```

---

### Sessions

#### POST /sessions

Iniciar sesión en vivo (solo profesor).

**Request:**

```json
{
  "classId": "class-uuid",
  "slideId": "slide-uuid" // optional, primer slide por defecto
}
```

**Response (201):**

```json
{
  "id": "session-uuid",
  "class_id": "class-uuid",
  "teacher_id": "teacher-uuid",
  "status": "active",
  "yjs_room_name": "room-unique-id",
  "yjs_url": "ws://localhost:1234",
  "started_at": "2025-12-12T10:00:00Z"
}
```

#### GET /sessions/:id

Obtener sesión con participantes.

**Response (200):**

```json
{
  "id": "session-uuid",
  "class": {
    "id": "class-uuid",
    "title": "English Level A1"
  },
  "teacher": {
    "id": "teacher-uuid",
    "name": "Prof. García"
  },
  "status": "active",
  "participants": [
    {
      "id": "user-uuid",
      "name": "Ana Martínez",
      "role": "student",
      "joined_at": "2025-12-12T10:05:00Z"
    }
  ],
  "started_at": "2025-12-12T10:00:00Z"
}
```

#### POST /sessions/:id/join

Unirse a sesión.

**Response (200):**

```json
{
  "success": true,
  "session": {
    "id": "session-uuid",
    "yjs_room_name": "room-unique-id",
    "yjs_url": "ws://localhost:1234"
  }
}
```

#### POST /sessions/:id/leave

Salir de sesión.

**Response (200):**

```json
{
  "success": true
}
```

#### POST /sessions/:id/end

Finalizar sesión (solo profesor).

**Response (200):**

```json
{
  "success": true,
  "ended_at": "2025-12-12T11:00:00Z"
}
```

#### GET /sessions/active

Obtener sesión activa de una clase.

**Query Params:**

- `classId` (required)

**Response (200):**

```json
{
  "id": "session-uuid",
  "status": "active",
  "yjs_room_name": "room-unique-id"
}
```

---

### Uploads

#### POST /uploads

Subir imagen.

**Request:** `multipart/form-data`

- `file`: archivo (max 5MB)

**Response (201):**

```json
{
  "id": "upload-uuid",
  "url": "/uploads/1234567890-uuid-image.png",
  "filename": "1234567890-uuid-image.png",
  "original_name": "image.png",
  "mime_type": "image/png",
  "size_bytes": 102400,
  "uploaded_at": "2025-12-12T10:00:00Z"
}
```

#### GET /uploads/:id

Obtener archivo (público).

**Response:** Archivo binario

#### DELETE /uploads/:id

Eliminar archivo (solo uploader o profesor).

**Response (200):**

```json
{
  "success": true
}
```

---

### Snapshots (Student Copies)

#### POST /snapshots

Guardar copia personal (solo estudiantes).

**Request:**

```json
{
  "slideId": "slide-uuid",
  "canvasData": "{\"version\":\"5.3.0\",\"objects\":[...]}"
}
```

**Response (201):**

```json
{
  "id": "snapshot-uuid",
  "slide_id": "slide-uuid",
  "student_id": "student-uuid",
  "saved_at": "2025-12-12T10:30:00Z"
}
```

#### GET /snapshots/my-copies

Obtener mis copias guardadas (solo estudiantes).

**Response (200):**

```json
{
  "copies": [
    {
      "id": "snapshot-uuid",
      "slide": {
        "id": "slide-uuid",
        "title": "Vocabulary",
        "class": {
          "id": "class-uuid",
          "title": "English Level A1"
        }
      },
      "canvas_data": "{\"version\":\"5.3.0\",\"objects\":[...]}",
      "saved_at": "2025-12-12T10:30:00Z"
    }
  ]
}
```

---

## WebSocket (Yjs)

**URL:** `ws://localhost:1234`

**Protocolo:** y-websocket

**Room Name:** Obtenido de `POST /sessions` → `yjs_room_name`

**Conexión:**

```javascript
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  "ws://localhost:1234",
  "room-unique-id",
  ydoc
);
```

**Datos Sincronizados:**

- Canvas objects (Fabric.js)
- Cursor positions
- Text content (TipTap)
