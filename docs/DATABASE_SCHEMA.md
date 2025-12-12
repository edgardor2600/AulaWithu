# Database Schema - Aula Colaborativa

## Diagrama ER (Entity-Relationship)

```
┌─────────────┐
│    USERS    │
│─────────────│
│ id (PK)     │
│ name        │
│ role        │◄──────────┐
│ avatar_color│           │
│ created_at  │           │
└─────────────┘           │
       ▲                  │
       │                  │
       │                  │
┌──────┴────────┐    ┌────┴──────────┐
│   CLASSES     │    │   SESSIONS    │
│───────────────│    │───────────────│
│ id (PK)       │    │ id (PK)       │
│ title         │◄───│ class_id (FK) │
│ description   │    │ teacher_id(FK)│
│ teacher_id(FK)│    │ status        │
│ thumbnail_url │    │ yjs_room_name │
│ created_at    │    │ started_at    │
│ updated_at    │    │ ended_at      │
└───────┬───────┘    └───────┬───────┘
        │                    │
        │                    │
   ┌────▼─────┐         ┌────▼──────────────┐
   │  SLIDES  │         │ SESSION_PARTICIPANTS│
   │──────────│         │────────────────────│
   │ id (PK)  │         │ id (PK)            │
   │ class_id │         │ session_id (FK)    │
   │ slide_num│         │ user_id (FK)       │
   │ title    │         │ joined_at          │
   │ canvas   │         │ left_at            │
   │ created  │         └────────────────────┘
   │ updated  │
   └────┬─────┘
        │
   ┌────▼──────────┐
   │STUDENT_COPIES │
   │───────────────│
   │ id (PK)       │
   │ slide_id (FK) │
   │ student_id(FK)│
   │ canvas_data   │
   │ saved_at      │
   └───────────────┘

┌──────────────┐         ┌──────────────┐
│   UPLOADS    │         │  EVENTS_LOG  │
│──────────────│         │──────────────│
│ id (PK)      │         │ id (PK)      │
│ filename     │         │ session_id   │
│ original_name│         │ event_type   │
│ mime_type    │         │ actor_id     │
│ size_bytes   │         │ slide_id     │
│ uploaded_by  │         │ payload      │
│ file_path    │         │ timestamp    │
│ uploaded_at  │         └──────────────┘
└──────────────┘
```

## Tablas

### 1. USERS

Almacena información de profesores y estudiantes.

**Columnas:**

- `id` (TEXT, PK): UUID único del usuario
- `name` (TEXT, NOT NULL): Nombre completo
- `role` (TEXT, NOT NULL): 'teacher' o 'student'
- `avatar_color` (TEXT): Color hexadecimal para avatar (#3b82f6)
- `created_at` (DATETIME): Timestamp de creación

**Constraints:**

- CHECK: `role IN ('teacher', 'student')`

**Índices:**

- PRIMARY KEY en `id`

---

### 2. CLASSES

Clases creadas por profesores.

**Columnas:**

- `id` (TEXT, PK): UUID único de la clase
- `title` (TEXT, NOT NULL): Título de la clase
- `description` (TEXT): Descripción opcional
- `teacher_id` (TEXT, FK → users.id, NOT NULL): Profesor propietario
- `thumbnail_url` (TEXT): URL de imagen de portada
- `created_at` (DATETIME): Timestamp de creación
- `updated_at` (DATETIME): Timestamp de última actualización

**Constraints:**

- FOREIGN KEY: `teacher_id` → `users.id` ON DELETE CASCADE

**Índices:**

- PRIMARY KEY en `id`
- INDEX en `teacher_id`

---

### 3. SLIDES

Diapositivas dentro de una clase.

**Columnas:**

- `id` (TEXT, PK): UUID único del slide
- `class_id` (TEXT, FK → classes.id, NOT NULL): Clase a la que pertenece
- `slide_number` (INTEGER, NOT NULL): Número de orden del slide
- `title` (TEXT): Título opcional del slide
- `canvas_data` (TEXT): JSON serializado de Fabric.js
- `created_at` (DATETIME): Timestamp de creación
- `updated_at` (DATETIME): Timestamp de última actualización

**Constraints:**

- FOREIGN KEY: `class_id` → `classes.id` ON DELETE CASCADE
- UNIQUE: `(class_id, slide_number)`

**Índices:**

- PRIMARY KEY en `id`
- INDEX en `class_id`

---

### 4. SESSIONS

Sesiones en vivo de una clase.

**Columnas:**

- `id` (TEXT, PK): UUID único de la sesión
- `class_id` (TEXT, FK → classes.id, NOT NULL): Clase de la sesión
- `teacher_id` (TEXT, FK → users.id, NOT NULL): Profesor que inició
- `status` (TEXT, NOT NULL): 'active', 'paused', o 'ended'
- `started_at` (DATETIME): Timestamp de inicio
- `ended_at` (DATETIME): Timestamp de finalización
- `yjs_room_name` (TEXT, UNIQUE, NOT NULL): Nombre del room de Yjs

**Constraints:**

- FOREIGN KEY: `class_id` → `classes.id` ON DELETE CASCADE
- FOREIGN KEY: `teacher_id` → `users.id` ON DELETE CASCADE
- CHECK: `status IN ('active', 'paused', 'ended')`
- UNIQUE: `yjs_room_name`

**Índices:**

- PRIMARY KEY en `id`
- INDEX en `class_id`

---

### 5. SESSION_PARTICIPANTS

Participantes de una sesión en vivo.

**Columnas:**

- `id` (TEXT, PK): UUID único del participante
- `session_id` (TEXT, FK → sessions.id, NOT NULL): Sesión
- `user_id` (TEXT, FK → users.id, NOT NULL): Usuario participante
- `joined_at` (DATETIME): Timestamp de ingreso
- `left_at` (DATETIME): Timestamp de salida (NULL si aún está)

**Constraints:**

- FOREIGN KEY: `session_id` → `sessions.id` ON DELETE CASCADE
- FOREIGN KEY: `user_id` → `users.id` ON DELETE CASCADE
- UNIQUE: `(session_id, user_id)`

**Índices:**

- PRIMARY KEY en `id`
- INDEX en `session_id`

---

### 6. STUDENT_COPIES

Copias personales guardadas por estudiantes.

**Columnas:**

- `id` (TEXT, PK): UUID único de la copia
- `slide_id` (TEXT, FK → slides.id, NOT NULL): Slide original
- `student_id` (TEXT, FK → users.id, NOT NULL): Estudiante propietario
- `canvas_data` (TEXT): JSON del canvas guardado
- `saved_at` (DATETIME): Timestamp de guardado

**Constraints:**

- FOREIGN KEY: `slide_id` → `slides.id` ON DELETE CASCADE
- FOREIGN KEY: `student_id` → `users.id` ON DELETE CASCADE

**Índices:**

- PRIMARY KEY en `id`
- INDEX en `student_id`

---

### 7. UPLOADS

Archivos subidos (imágenes, etc.).

**Columnas:**

- `id` (TEXT, PK): UUID único del archivo
- `filename` (TEXT, NOT NULL): Nombre del archivo en disco
- `original_name` (TEXT, NOT NULL): Nombre original del archivo
- `mime_type` (TEXT, NOT NULL): Tipo MIME (image/png, etc.)
- `size_bytes` (INTEGER, NOT NULL): Tamaño en bytes
- `uploaded_by` (TEXT, FK → users.id, NOT NULL): Usuario que subió
- `file_path` (TEXT, NOT NULL): Ruta relativa del archivo
- `uploaded_at` (DATETIME): Timestamp de subida

**Constraints:**

- FOREIGN KEY: `uploaded_by` → `users.id` ON DELETE SET NULL

**Índices:**

- PRIMARY KEY en `id`

---

### 8. EVENTS_LOG

Log de eventos para auditoría y replay.

**Columnas:**

- `id` (INTEGER, PK, AUTOINCREMENT): ID secuencial
- `session_id` (TEXT, FK → sessions.id, NOT NULL): Sesión del evento
- `event_type` (TEXT, NOT NULL): Tipo de evento ('object_added', 'slide_changed', etc.)
- `actor_id` (TEXT, FK → users.id, NOT NULL): Usuario que generó el evento
- `slide_id` (TEXT): Slide relacionado (opcional)
- `payload` (TEXT): JSON con detalles del evento
- `timestamp` (DATETIME): Timestamp del evento

**Constraints:**

- FOREIGN KEY: `session_id` → `sessions.id` ON DELETE CASCADE
- FOREIGN KEY: `actor_id` → `users.id` ON DELETE CASCADE

**Índices:**

- PRIMARY KEY en `id`
- INDEX compuesto en `(session_id, timestamp)`

---

## Relaciones

### One-to-Many

- `users` (teacher) → `classes` (1:N)
- `users` (teacher) → `sessions` (1:N)
- `classes` → `slides` (1:N)
- `classes` → `sessions` (1:N)
- `sessions` → `session_participants` (1:N)
- `sessions` → `events_log` (1:N)
- `slides` → `student_copies` (1:N)
- `users` (student) → `student_copies` (1:N)
- `users` → `uploads` (1:N)

### Many-to-Many (through junction table)

- `users` ↔ `sessions` (through `session_participants`)

---

## Queries Comunes

### Obtener clase con slides

```sql
SELECT c.*,
       (SELECT COUNT(*) FROM slides WHERE class_id = c.id) as slides_count
FROM classes c
WHERE c.id = ?;
```

### Obtener sesión activa con participantes

```sql
SELECT s.*,
       u.name as teacher_name,
       COUNT(sp.id) as participants_count
FROM sessions s
JOIN users u ON s.teacher_id = u.id
LEFT JOIN session_participants sp ON s.id = sp.session_id AND sp.left_at IS NULL
WHERE s.class_id = ? AND s.status = 'active'
GROUP BY s.id;
```

### Obtener copias de un estudiante con detalles

```sql
SELECT sc.*,
       s.title as slide_title,
       s.slide_number,
       c.title as class_title
FROM student_copies sc
JOIN slides s ON sc.slide_id = s.id
JOIN classes c ON s.class_id = c.id
WHERE sc.student_id = ?
ORDER BY sc.saved_at DESC;
```

### Replay de eventos de una sesión

```sql
SELECT e.*, u.name as actor_name
FROM events_log e
JOIN users u ON e.actor_id = u.id
WHERE e.session_id = ?
ORDER BY e.timestamp ASC;
```

---

## Migraciones

Las migraciones se encuentran en `database/migrations/` y se aplican en orden:

1. `000_migration_control.sql` - Tabla de control de migraciones
2. `001_initial_schema.sql` - Creación de todas las tablas
3. `002_add_indexes.sql` - Índices de performance

Para aplicar migraciones:

```bash
cd server
npm run db:init
```

---

## Datos de Prueba (Seeds)

Los datos de prueba se encuentran en `database/seeds/dev-data.sql`:

- 1 profesor: Prof. García
- 5 estudiantes: Ana, Carlos, María, Juan, Laura
- 1 clase: "English Level A1 - Unit 1"
- 3 slides de ejemplo

Para cargar seeds:

```bash
cd server
npm run db:init
```

---

## Backup y Restore

### Backup

```bash
# Windows
scripts\backup-db.bat

# Linux/Mac
./scripts/backup-db.sh
```

### Restore

```bash
cp database/backups/aula-YYYYMMDD-HHMMSS.db database/aula.db
```

---

## Performance

### Índices Implementados

- `idx_slides_class` en `slides(class_id)`
- `idx_sessions_class` en `sessions(class_id)`
- `idx_events_session` en `events_log(session_id, timestamp)`
- `idx_student_copies_student` en `student_copies(student_id)`
- `idx_participants_session` en `session_participants(session_id)`
- `idx_classes_teacher` en `classes(teacher_id)`

### Optimizaciones

- Foreign keys habilitadas para integridad referencial
- Índices compuestos para queries frecuentes
- Timestamps automáticos con `CURRENT_TIMESTAMP`
- Cascadas configuradas para eliminación automática

---

## Tamaño Estimado

Con datos de prueba:

- **Base de datos**: ~120 KB
- **Por clase** (con 10 slides): ~50 KB
- **Por sesión** (1 hora, 100 eventos): ~20 KB
- **Por copia de estudiante**: ~10 KB

**Estimación para 100 clases activas**: ~5-10 MB
