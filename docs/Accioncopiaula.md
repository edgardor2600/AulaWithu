Plan de Desarrollo Técnico Detallado — Aula Colaborativa MVP
Este documento está pensado para copiar/pegar y ejecutar paso a paso con un asistente de código (Cursor, etc.). Está dividido en 6 fases. Cada paso es literal, secuencial y accionable.

FASE 1 — Arquitectura, Entorno y Configuración Inicial (Base Sólida)
Objetivo de la fase
Tener el monorepo estructurado, con client y server configurados, dependencias instaladas, y docker-compose opcional funcionando localmente. Control de versiones activo y scripts de ejecución listos.
Checklist detallado (paso a paso)
1.1. Crear estructura del monorepo

En tu máquina crea la carpeta raíz: aula-colaborativa/
Dentro crea estas carpetas:

client/ (React + TypeScript)
server/ (Node.js + Express + Yjs WebSocket)
database/ (scripts SQLite y migraciones)
docs/ (documentación técnica y API contracts)
scripts/ (scripts de utilidad: backup, init, tunnel)
uploads/ (almacenamiento local de imágenes/archivos)

Crea README.md en raíz con descripción del proyecto.

1.2. Inicializar control de versiones
bashcd aula-colaborativa
git init

```
- Crear `.gitignore` con:
```

node*modules/
.env
.env.local
dist/
build/
uploads/*
!uploads/.gitkeep
\_.db
\*.db-journal
.DS_Store
1.3. Configuración del servidor (server/)
1.3.1. Inicializar proyecto Node
bashcd server
npm init -y
1.3.2. Instalar dependencias principales
bashnpm install express cors dotenv better-sqlite3 multer ws y-websocket yjs uuid
npm install --save-dev typescript @types/express @types/node @types/ws @types/multer ts-node nodemon
1.3.3. Configurar TypeScript

Crear server/tsconfig.json:

json{
"compilerOptions": {
"target": "ES2020",
"module": "commonjs",
"outDir": "./dist",
"rootDir": "./src",
"strict": true,
"esModuleInterop": true,
"skipLibCheck": true
},
"include": ["src/**/*"],
"exclude": ["node_modules"]
}

```

**1.3.4. Estructura de carpetas en server/src/**
- Crear carpetas:
  - `server/src/api/` (rutas REST)
  - `server/src/db/` (configuración SQLite y queries)
  - `server/src/middleware/` (auth, error handling)
  - `server/src/services/` (lógica de negocio)
  - `server/src/websocket/` (servidor Yjs)
  - `server/src/utils/` (helpers)
  - `server/src/types/` (interfaces TypeScript)

**1.3.5. Crear archivos iniciales**
- `server/src/index.ts` (punto de entrada, levanta Express y WebSocket)
- `server/src/api/routes.ts` (definición de rutas REST)
- `server/src/db/database.ts` (configuración better-sqlite3)
- `server/src/websocket/yjs-server.ts` (servidor y-websocket)
- `server/.env.example`:
```

PORT=3002
YJS_PORT=1234
DATABASE_PATH=./database/aula.db
UPLOADS_DIR=../uploads
JWT_SECRET=cambiar_en_produccion
ALLOWED_ORIGINS=http://localhost:5173
1.3.6. Scripts en server/package.json
json"scripts": {
"dev": "nodemon --exec ts-node src/index.ts",
"build": "tsc",
"start": "node dist/index.js",
"db:init": "ts-node scripts/init-db.ts"
}
1.4. Configuración del cliente (client/)
1.4.1. Crear proyecto Vite + React + TypeScript
bashcd ../client
npm create vite@latest . -- --template react-ts
1.4.2. Instalar dependencias principales
bashnpm install fabric yjs y-websocket @tiptap/react @tiptap/starter-kit @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor zustand axios react-router-dom
npm install -D tailwindcss postcss autoprefixer @types/fabric
npx tailwindcss init -p
1.4.3. Configurar Tailwind CSS

En client/tailwind.config.js:

jsexport default {
content: [
"./index.html",
"./src/**/*.{js,ts,jsx,tsx}",
],
theme: {
extend: {},
},
plugins: [],
}

En client/src/index.css agregar directivas Tailwind:

css@tailwind base;
@tailwind components;
@tailwind utilities;

```

**1.4.4. Estructura de carpetas en client/src/**
- Crear carpetas:
  - `client/src/components/` (componentes reutilizables)
  - `client/src/pages/` (vistas principales)
  - `client/src/hooks/` (custom hooks)
  - `client/src/services/` (llamadas API)
  - `client/src/store/` (Zustand stores)
  - `client/src/types/` (interfaces TypeScript)
  - `client/src/utils/` (helpers)
  - `client/src/lib/` (configuraciones: yjs, fabric)

**1.4.5. Crear archivos base**
- `client/src/lib/yjs-config.ts` (configuración WebSocket provider)
- `client/src/lib/fabric-config.ts` (inicialización canvas)
- `client/src/services/api.ts` (Axios instance configurado)
- `client/src/store/sessionStore.ts` (estado global Zustand)
- `client/.env.example`:
```

VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:1234
1.4.6. Scripts en client/package.json (ya vienen con Vite)
json"scripts": {
"dev": "vite",
"build": "tsc && vite build",
"preview": "vite preview"
}
1.5. Configuración de base de datos (database/)
1.5.1. Estructura de carpetas

database/migrations/ (scripts SQL versionados)
database/seeds/ (datos iniciales)
database/schema.sql (schema completo para referencia)

1.5.2. Crear script de inicialización

server/scripts/init-db.ts que:

Lee archivos SQL de migrations/
Ejecuta en orden secuencial
Inserta seeds si es primera vez
Verifica integridad

1.6. Docker Compose (opcional para dev)
1.6.1. Crear docker-compose.yml en raíz
yamlversion: '3.8'
services:
server:
build: ./server
ports: - "3000:3000" - "1234:1234"
volumes: - ./server:/app - ./database:/app/database - ./uploads:/app/uploads
environment: - NODE_ENV=development

client:
build: ./client
ports: - "5173:5173"
volumes: - ./client:/app
depends_on: - server
1.6.2. Crear Dockerfiles

server/Dockerfile (base node:18-alpine, instalar deps, copiar código)
client/Dockerfile (base node:18-alpine, instalar deps, vite dev)

1.7. Calidad de Código y Flujo de Trabajo (Code Quality Workflow)
1.7.1. ESLint y Prettier (server y client)
bash# En ambas carpetas (client y server)
npm install -D eslint prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
1.7.2. Configurar .eslintrc.json y .prettierrc

Reglas recomendadas:
Semi: false
SingleQuote: true
TrailingComma: all
PrintWidth: 100

1.7.3. Estandarización de Commits (Commitlint)
Para asegurar que "revisamos los commits antes de enviarlos", usaremos Conventional Commits.
bash# En la raíz del monorepo
npm install -D @commitlint/cli @commitlint/config-conventional
echo "module.exports = { extends: ['@commitlint/config-conventional'] };" > commitlint.config.js
1.7.4. Pre-commit hooks (Husky & lint-staged)
Esto automatiza la revisión antes de cada commit.
bashnpm install -D husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
npx husky add .husky/commit-msg "npx --no -- commitlint --edit ${1}"
Configurar `lint-staged` en `package.json` raíz:
json"lint-staged": {
"client/src/**/\*.{ts,tsx}": [
"npm run lint --prefix client",
"prettier --write"
],
"server/src/**/\*.ts": [
"npm run lint --prefix server",
"prettier --write"
]
}
1.7.5. Estrategia de Ramas y Pull Requests (Review)
Nunca subir directo a main.

1. Crear rama: `git checkout -b feat/nombre-feature`
2. Commit (Husky validará formato y mensaje): `git commit -m "feat: agregar login"`
3. Push: `git push origin feat/nombre-feature`
4. Pull Request: Revisión de código por pares antes de merge.

1.8. Scripts de utilidad en scripts/
1.8.1. Crear scripts auxiliares

scripts/tunnel-cloudflared.sh:

bash#!/bin/bash
cloudflared tunnel --url http://localhost:3000

scripts/backup-db.sh:

bash#!/bin/bash
cp database/aula.db database/backups/aula-$(date +%Y%m%d-%H%M%S).db

scripts/dev-full.sh:

bash#!/bin/bash

# Arranca server y client en paralelo

npm run dev --prefix server &
npm run dev --prefix client &
wait
1.9. Documentación inicial
1.9.1. Crear docs/ARCHITECTURE.md

Diagrama de componentes (texto/ASCII)
Flujo de sincronización Yjs
Endpoints REST planificados
Estructura de datos en Yjs

1.9.2. Crear docs/API_CONTRACTS.md

Lista de endpoints con request/response esperados
Formatos de error estándar
Códigos de estado HTTP

1.9.3. README.md en raíz con instrucciones
markdown# Aula Colaborativa MVP

## Requisitos previos

- Node.js 18+
- npm o yarn
- Git

## Instalación local

1. Clonar repo
2. cd server && npm install
3. cd ../client && npm install
4. npm run db:init en server
5. Copiar .env.example a .env y ajustar

## Ejecución

- Opción 1: `sh scripts/dev-full.sh`
- Opción 2 (manual):
  - Terminal 1: `cd server && npm run dev`
  - Terminal 2: `cd client && npm run dev`

## Túnel HTTPS

- Instalar cloudflared
- `sh scripts/tunnel-cloudflared.sh`
- Copiar URL generada
  1.10. Validación de fase

Ejecutar npm run dev en server → debe arrancar en puerto 3000
Ejecutar npm run dev en client → debe arrancar en puerto 5173
Abrir http://localhost:5173 → debe renderizar React
Verificar que server responde en http://localhost:3000/health
Git tiene commits iniciales con estructura base

FASE 2 — Base de Datos y Persistencia (La Data Foundation)
Objetivo de la fase
Modelar schema SQLite completo, crear migraciones versionadas, implementar CRUD básico y tener datos seed para desarrollo.
Checklist detallado (paso a paso)
2.1. Diseñar schema de base de datos
2.1.1. Tablas principales a crear
Tabla: users
sqlCREATE TABLE users (
id TEXT PRIMARY KEY,
name TEXT NOT NULL,
role TEXT NOT NULL CHECK(role IN ('teacher', 'student')),
avatar_color TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
Tabla: classes
sqlCREATE TABLE classes (
id TEXT PRIMARY KEY,
title TEXT NOT NULL,
description TEXT,
teacher_id TEXT NOT NULL,
thumbnail_url TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);
Tabla: slides
sqlCREATE TABLE slides (
id TEXT PRIMARY KEY,
class_id TEXT NOT NULL,
slide_number INTEGER NOT NULL,
title TEXT,
canvas_data TEXT, -- JSON serializado de Fabric.js
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
UNIQUE(class_id, slide_number)
);
Tabla: sessions
sqlCREATE TABLE sessions (
id TEXT PRIMARY KEY,
class_id TEXT NOT NULL,
teacher_id TEXT NOT NULL,
status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'ended')),
started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
ended_at DATETIME,
yjs_room_name TEXT UNIQUE NOT NULL,
FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);
Tabla: session_participants
sqlCREATE TABLE session_participants (
id TEXT PRIMARY KEY,
session_id TEXT NOT NULL,
user_id TEXT NOT NULL,
joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
left_at DATETIME,
FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
UNIQUE(session_id, user_id)
);
Tabla: student_copies
sqlCREATE TABLE student_copies (
id TEXT PRIMARY KEY,
slide_id TEXT NOT NULL,
student_id TEXT NOT NULL,
canvas_data TEXT, -- snapshot personal del estudiante
saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (slide_id) REFERENCES slides(id) ON DELETE CASCADE,
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
Tabla: uploads
sqlCREATE TABLE uploads (
id TEXT PRIMARY KEY,
filename TEXT NOT NULL,
original_name TEXT NOT NULL,
mime_type TEXT NOT NULL,
size_bytes INTEGER NOT NULL,
uploaded_by TEXT NOT NULL,
file_path TEXT NOT NULL,
uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
Tabla: events_log
sqlCREATE TABLE events_log (
id INTEGER PRIMARY KEY AUTOINCREMENT,
session_id TEXT NOT NULL,
event_type TEXT NOT NULL, -- 'object_added', 'object_modified', 'object_deleted', 'slide_changed', etc.
actor_id TEXT NOT NULL,
slide_id TEXT,
payload TEXT, -- JSON con detalles del evento
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);
2.1.2. Índices para performance
sqlCREATE INDEX idx_slides_class ON slides(class_id);
CREATE INDEX idx_sessions_class ON sessions(class_id);
CREATE INDEX idx_events_session ON events_log(session_id, timestamp);
CREATE INDEX idx_student_copies_student ON student_copies(student_id);
CREATE INDEX idx_participants_session ON session_participants(session_id);
2.2. Crear sistema de migraciones versionado
2.2.1. Estructura de archivos migration

database/migrations/001_initial_schema.sql (todas las tablas de arriba)
database/migrations/002_add_indexes.sql (índices)
database/migrations/003_add_constraints.sql (si se necesitan ajustes)

2.2.2. Tabla de control de migraciones
sqlCREATE TABLE IF NOT EXISTS schema_migrations (
version INTEGER PRIMARY KEY,
name TEXT NOT NULL,
applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
2.2.3. Script de migración en server/scripts/migrate.ts

Leer directorio database/migrations/
Ordenar por nombre (001, 002, etc.)
Verificar contra schema_migrations
Ejecutar pendientes en transacción
Registrar versión aplicada

2.3. Seeds de datos iniciales
2.3.1. Crear database/seeds/dev-data.sql
sql-- Usuario profesor
INSERT INTO users (id, name, role, avatar_color)
VALUES ('teacher-001', 'Prof. García', 'teacher', '#3b82f6');

-- Usuarios estudiantes
INSERT INTO users (id, name, role, avatar_color) VALUES
('student-001', 'Ana Martínez', 'student', '#ef4444'),
('student-002', 'Carlos López', 'student', '#10b981'),
('student-003', 'María Rodríguez', 'student', '#f59e0b'),
('student-004', 'Juan Pérez', 'student', '#8b5cf6'),
('student-005', 'Laura Gómez', 'student', '#ec4899');

-- Clase de ejemplo
INSERT INTO classes (id, title, description, teacher_id)
VALUES ('class-001', 'English Level A1 - Unit 1', 'Introduction to basic greetings and vocabulary', 'teacher-001');

-- Slides de ejemplo
INSERT INTO slides (id, class_id, slide_number, title, canvas_data) VALUES
('slide-001', 'class-001', 1, 'Welcome', '{"version":"5.3.0","objects":[]}'),
('slide-002', 'class-001', 2, 'Vocabulary', '{"version":"5.3.0","objects":[]}'),
('slide-003', 'class-001', 3, 'Practice', '{"version":"5.3.0","objects":[]}');
2.3.2. Script para cargar seeds

server/scripts/seed.ts
Ejecuta dev-data.sql si DB está vacía
Opción para resetear y recargar con flag --reset

2.4. Capa de acceso a datos (DB Layer)
2.4.1. Crear server/src/db/database.ts

Función getDb() que retorna instancia better-sqlite3
Funciones helper:

runQuery(sql, params) para INSERT/UPDATE/DELETE
getOne(sql, params) para SELECT único
getAll(sql, params) para SELECT múltiples

Manejo de errores con try-catch
Logging de queries en desarrollo

2.4.2. Crear server/src/db/repositories/ (patrón Repository)
users-repository.ts

createUser(data) → INSERT y retorna user
getUserById(id) → SELECT por ID
getUsersByRole(role) → SELECT filtrado
updateUser(id, data) → UPDATE
deleteUser(id) → DELETE

classes-repository.ts

createClass(data) → INSERT
getClassById(id) → SELECT con JOIN a teacher
getClassesByTeacher(teacherId) → SELECT filtrado
updateClass(id, data) → UPDATE
deleteClass(id) → DELETE CASCADE verificado

slides-repository.ts

createSlide(classId, slideNumber, data) → INSERT
getSlideById(id) → SELECT
getSlidesByClass(classId) → SELECT ordenado por slide_number
updateSlideCanvas(id, canvasData) → UPDATE solo canvas_data
deleteSlide(id) → DELETE

sessions-repository.ts

createSession(classId, teacherId, roomName) → INSERT con status='active'
getActiveSession(classId) → SELECT WHERE status='active'
endSession(id) → UPDATE status='ended', ended_at
addParticipant(sessionId, userId) → INSERT en session_participants
removeParticipant(sessionId, userId) → UPDATE left_at

student-copies-repository.ts

saveStudentCopy(slideId, studentId, canvasData) → INSERT or UPDATE
getStudentCopy(slideId, studentId) → SELECT
getStudentCopiesByStudent(studentId) → SELECT con JOIN a slides

uploads-repository.ts

createUpload(fileData) → INSERT
getUploadById(id) → SELECT
deleteUpload(id) → DELETE y eliminar archivo físico

events-repository.ts

logEvent(sessionId, eventType, actorId, payload) → INSERT
getSessionEvents(sessionId) → SELECT ordenado por timestamp
getEventsForReplay(sessionId, fromTime, toTime) → SELECT con filtros

2.5. Pruebas unitarias de DB
2.5.1. Setup de test DB

server/src/db/**tests**/setup.ts
Crea DB en memoria para tests
Corre migraciones antes de cada test suite

2.5.2. Tests por repository

users-repository.test.ts: CRUD completo
classes-repository.test.ts: verificar CASCADE
sessions-repository.test.ts: verificar constraints UNIQUE
events-repository.test.ts: inserción masiva y queries por rango

2.5.3. Comandos de test
json"scripts": {
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
}
2.6. Documentar schema
2.6.1. Crear docs/DATABASE_SCHEMA.md

Diagrama ER (texto/ASCII art)
Descripción de cada tabla y columna
Relaciones y constraints
Queries comunes con ejemplos

2.6.2. Exportar schema completo
bashsqlite3 database/aula.db .schema > database/schema.sql
2.7. Validación de fase

Ejecutar npm run db:init → crea DB sin errores
Ejecutar npm run seed → inserta datos de prueba
Abrir DB con cliente SQLite → verificar tablas y datos
Ejecutar npm test en server → todos los tests pasan
Verificar que constraints funcionan (intentar insertar dato inválido)

FASE 3 — API REST y Servicios Backend (CRM/ERP del Aula)
Objetivo de la fase
Implementar endpoints REST para autenticación, gestión de clases, sesiones, uploads y snapshots. Middleware de seguridad y validación.
Checklist detallado (paso a paso)
3.1. Arquitectura de la API
3.1.1. Estructura de rutas

server/src/api/routes/ con archivos:

auth.routes.ts → /api/auth/_
classes.routes.ts → /api/classes/_
slides.routes.ts → /api/slides/_
sessions.routes.ts → /api/sessions/_
uploads.routes.ts → /api/uploads/_
snapshots.routes.ts → /api/snapshots/_
events.routes.ts → /api/events/\*

3.1.2. Router principal en server/src/api/index.ts

Importa todos los sub-routers
Monta en /api/\*
Define middleware global (CORS, body-parser, error handler)

3.2. Autenticación ligera
3.2.1. Estrategia de auth

SIN passwords (para simplicidad del MVP)
Usuario se identifica con nombre + rol al unirse
Server genera JWT simple con {userId, name, role}
JWT válido por 24 horas

3.2.2. Endpoints de auth
POST /api/auth/join

Body: {name: string, role: 'teacher'|'student'}
Crea usuario en DB si no existe, o reutiliza existente por nombre
Genera JWT
Response: {token: string, user: {...}}

GET /api/auth/me

Header: Authorization: Bearer <token>
Valida JWT y retorna datos de usuario
Response: {id, name, role, avatar_color}

3.2.3. Implementar server/src/middleware/auth.middleware.ts

Función authenticate(req, res, next)
Extrae token de header
Verifica con jsonwebtoken
Adjunta req.user = decodedToken
Si falla → 401 Unauthorized

3.2.4. Función requireRole(['teacher'])

Middleware que verifica req.user.role
Si no coincide → 403 Forbidden

3.3. Gestión de clases (Classes)
3.3.1. Endpoints
POST /api/classes

Auth: teacher
Body: {title, description}
Crea clase con teacher_id del token
Response: {id, title, description, teacher, created_at}

GET /api/classes

Auth: any
Query params: ?teacherId=xxx (opcional)
Response: {classes: [...]}

GET /api/classes/:id

Auth: any
Response: {id, title, description, teacher, slides: [...]}

PUT /api/classes/:id

Auth: teacher (owner only)
Body: {title?, description?}
Response: clase actualizada

DELETE /api/classes/:id

Auth: teacher (owner only)
Elimina clase y slides CASCADE
Response: {success: true}

3.3.2. Validaciones con express-validator

Instalar: npm install express-validator
Crear server/src/middleware/validators/classes.validators.ts
Reglas:

title: min 3 chars, max 100, required
description: max 500, optional

3.4. Gestión de slides
3.4.1. Endpoints
POST /api/classes/:classId/slides

Auth: teacher
Body: {title, slideNumber?}
Si no se provee slideNumber, auto-incrementa
Response: {id, title, slide_number, canvas_data}

GET /api/slides/:id

Auth: any
Response: slide completo con canvas_data

PUT /api/slides/:id/canvas

Auth: teacher
Body: {canvasData: string} (JSON stringificado)
Guarda snapshot del canvas
Response: {success: true, updated_at}

POST /api/slides/:id/export

Auth: any
Body: {format: 'png'|'pdf'}
Genera archivo y retorna URL de descarga
Response: {url: '/uploads/exports/slide-xxx.png'}

DELETE /api/slides/:id

Auth: teacher
Response: {success: true}

3.5. Gestión de sesiones en vivo
3.5.1. Endpoints
POST /api/sessions

Auth: teacher
Body: {classId, slideId?}
Crea sesión activa con roomName único (UUID)
Response: {id, roomName, class, status, yjs_url: 'ws://...'}

GET /api/sessions/:id

Auth: any
Response: sesión completa con participantes activos

POST /api/sessions/:id/join

Auth: any
Registra participante en session_participants
Response: {success: true, session: {...}}

POST /api/sessions/:id/leave

Auth: any
Marca left_at
Response: {success: true}

POST /api/sessions/:id/end

Auth: teacher
Finaliza sesión (status='ended')
Response: {success: true}

GET /api/sessions/active

Auth: any
Query: ?classId=xxx
Response: sesión activa o null

3.6. Uploads de imágenes
3.6.1. Configurar Multer

server/src/middleware/upload.middleware.ts
Storage: diskStorage en /uploads
Filename: ${timestamp}-${uuid}-${originalname}
Límites: max 5MB por archivo
Tipos permitidos: image/png, image/jpeg, image/svg+xml

3.6.2. Endpoint de upload
POST /api/uploads

Auth: any
Multipart form-data con campo file
Guarda archivo en disco
Registra en tabla uploads
Response: {id, url: '/uploads/xxx.png', filename, size}

GET /api/uploads/:id

Sirve archivo estático
Sin auth (público una vez subido)

DELETE /api/uploads/:id

Auth: uploader o teacher
Elimina registro DB y archivo físico
Response: {success: true}

3.7. Snapshots de estudiantes
3.7.1. Endpoints
POST /api/snapshots

Auth: student
Body: {slideId, canvasData: string}
Guarda copia personal del slide
Response: {id, saved_at}

GET /api/snapshots/my-copies

Auth: student
Response: {copies: [{slide, canvas_data, saved_at}]}

GET /api/snapshots/:id

Auth: student (owner only)
Response: snapshot completo

POST /api/snapshots/:id/export

Auth: student (owner only)
Body: {format: 'png'|'pdf'}
Response: {url: '/uploads/exports/copy-xxx.png'}

3.8. Registro de eventos (Events Log)
3.8.1. Endpoints
POST /api/events (interno, no expuesto directamente)

Usado por WebSocket server para registrar eventos
Body: {sessionId, eventType, actorId, payload}

GET /api/sessions/:id/events

Auth: teacher
Query: ?from=timestamp&to=timestamp
Response: {events: [{type, actor, payload, timestamp}]}

GET /api/sessions/:id/replay

Auth: teacher
Retorna eventos ordenados para reproducción
Response: {events: [...], duration_ms: number}

3.9. Middleware de manejo de errores
3.9.1. Crear server/src/middleware/error.middleware.ts

Función errorHandler(err, req, res, next)
Captura errores y formatea respuesta:

typescript{
error: {
message: string,
code: string,
details?: any
}
}

Códigos comunes:

AUTH_REQUIRED → 401
FORBIDDEN → 403
NOT_FOUND → 404
VALIDATION_ERROR → 400
INTERNAL_ERROR → 500

3.9.2. Logger de errores

Usar winston o pino para logging estructurado
Log nivel: error → archivo, warn → archivo, info → stdout

3.10. Rate limiting y seguridad
3.10.1. Instalar helmet y rate-limit
bashnpm install helmet express-rate-limit
3.10.2. Configurar en server/src/index.ts

helmet() para headers de seguridad
rateLimit() para limitar requests: 100 req/15min por IP

3.10.3. CORS específico

Solo permitir orígenes configurados en .env
Para desarrollo: http://localhost:5173
Para producción: URL del túnel cloudflared

3.11. Documentar API
3.11.1. Crear docs/API_REFERENCE.md

Sección por recurso (auth, classes, slides, etc.)
Para cada endpoint:

Method y path
Auth requerida
Request body schema
Response schema
Códigos de error posibles
Ejemplo con curl

3.11.2. Implementar Swagger/OpenAPI (opcional)

Instalar swagger-ui-express y swagger-jsdoc
Exponer en /api/docs
Anotar rutas con JSDoc comments

3.12. Tests de integración API
3.12.1. Configurar supertest
bashnpm install --save-dev supertest @types/supertest
3.12.2. Tests por recurso

server/src/api/**tests**/auth.test.ts

POST /join → debe retornar token válido
GET /me con token → debe retornar usuario
GET /me sin token → debe retornar 401

server/src/api/**tests**/classes.test.ts

POST /classes (teacher) → crea clase
POST /classes (student) → 403
GET /classes → retorna lista
DELETE /classes/:id (non-owner) → 403

server/src/api/**tests**/sessions.test.ts

POST /sessions → crea y retorna roomName
POST /join → registra participante
POST /end → finaliza sesión

3.12.3. Fixtures y setup

server/src/api/**tests**/fixtures.ts
Helper createTestUser(role) que retorna token
Helper createTestClass() que retorna clase
Helper cleanupDb() para limpiar entre tests

3.13. Validación de fase

Ejecutar npm run dev → server levanta sin errores
Probar con Thunder Client / Postman / curl todos los endpoints
POST /api/auth/join → obtener token
POST /api/classes con token → crear clase exitosa
POST /api/uploads con imagen → archivo se guarda
GET /api/classes/:id → retorna clase con slides
Ejecutar npm test → todos los integration tests pasan
Verificar en DB que datos se persisten correctamente

FASE 4 — Sincronización en Tiempo Real con Yjs (El Corazón Colaborativo)
Objetivo de la fase
Implementar servidor WebSocket con Yjs, conectar cliente React, sincronizar objetos Fabric.js en canvas y texto TipTap, gestionar presencia de cursores.
Checklist detallado (paso a paso)
4.1. Servidor WebSocket Yjs
4.1.1. Crear server/src/websocket/yjs-server.ts

Importar y-websocket/bin/utils y ws
Crear servidor WebSocket en puerto YJS_PORT (1234)
Configurar persistencia con y-leveldb (opcional) o solo en memoria para MVP
Implementar hooks:

onConnect(doc, provider) → registrar conexión
onDisconnect(doc, provider) → limpiar
onUpdate(update, origin, doc) → opcional: log cambios

4.1.2. Estructura de documentos Yjs

Cada sesión tiene un room name único (UUID)
Documento Yjs tiene estructura:

typescript{
canvas: Y.Map<any>, // objetos del canvas
text: Y.XmlFragment, // contenido TipTap
cursors: Y.Map<{x, y, name, color}>, // presencia
metadata: Y.Map<{slideId, participants}>
}
4.1.3. Iniciar servidor en server/src/index.ts
typescriptimport { startYjsServer } from './websocket/yjs-server'

// Después de Express
startYjsServer(parseInt(process.env.YJS_PORT || '1234'))
4.1.4. Logging de actividad

Registrar eventos: user_joined, user_left, sync_complete
Opcional: persistir updates en events_log para replay

4.2. Cliente React: conexión a Yjs
4.2.1. Crear client/src/lib/yjs-config.ts
typescriptimport \* as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export function createYjsProvider(roomName: string, userId: string) {
const ydoc = new Y.Doc()

const provider = new WebsocketProvider(
import.meta.env.VITE_WS_URL, // ws://localhost:1234
roomName,
ydoc,
{
connect: true,
params: { userId }
}
)

// Awareness para presencia
const awareness = provider.awareness
awareness.setLocalStateField('user', {
id: userId,
name: 'User name',
color: '#3b82f6'
})

return { ydoc, provider, awareness }
}
4.2.2. Custom hook: useYjsProvider
typescript// client/src/hooks/useYjsProvider.ts
export function useYjsProvider(roomName: string | null) {
const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
const [provider, setProvider] = useState<WebsocketProvider | null>(null)

useEffect(() => {
if (!roomName) return

    const { ydoc, provider, awareness } = createYjsProvider(roomName, userId)
    setYdoc(ydoc)
    setProvider(provider)

    return () => {
      provider.disconnect()
      ydoc.destroy()
    }

}, [roomName])

return { ydoc, provider }
}
4.3. Sincronización Canvas Fabric.js
4.3.1. Crear client/src/lib/fabric-yjs-binding.ts

Clase FabricYjsBinding que:

Toma instancia fabric.Canvas y Y.Map del canvas
Escucha eventos Fabric: object:added, object:modified, object:removed
Al detectar cambio local → actualiza Y.Map correspondiente
Escucha cambios remotos en Y.Map → aplica a Fabric canvas

4.3.2. Mapeo Fabric ↔ Yjs

Cada objeto Fabric tiene id único (UUID)
En Y.Map: key = object.id, value = object.toJSON()
Al recibir update remoto:

Si objeto no existe localmente → canvas.add(new fabric.Object.fromJSON(data))
Si existe → object.set(data) y canvas.requestRenderAll()
Si eliminado → canvas.remove(object)

4.3.3. Prevenir loops infinitos

Flag isSyncing para ignorar eventos locales durante sync remoto
Usar origin en Yjs transactions para identificar fuente

4.3.4. Implementar en componente Canvas
typescript// client/src/components/CollaborativeCanvas.tsx
export function CollaborativeCanvas({ roomName }: Props) {
const { ydoc } = useYjsProvider(roomName)
const canvasRef = useRef<fabric.Canvas | null>(null)

useEffect(() => {
if (!ydoc) return

    const canvas = new fabric.Canvas('canvas-element')
    canvasRef.current = canvas

    const yCanvas = ydoc.getMap('canvas')
    const binding = new FabricYjsBinding(canvas, yCanvas)

    return () => {
      binding.destroy()
      canvas.dispose()
    }

}, [ydoc])

return <canvas id="canvas-element" />
}
4.4. Sincronización Texto TipTap
4.4.1. Instalar extensiones colaborativas
bashnpm install @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor
4.4.2. Configurar TipTap con Yjs
typescript// client/src/components/CollaborativeEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'

export function CollaborativeEditor({ ydoc, awareness }: Props) {
const editor = useEditor({
extensions: [
StarterKit.configure({ history: false }), // Yjs maneja history
Collaboration.configure({
document: ydoc,
field: 'text' // nombre del Y.XmlFragment
}),
CollaborationCursor.configure({
provider: awareness,
user: {
name: 'Current User',
color: '#3b82f6'
}
})
]
})

return <EditorContent editor={editor} />
}
4.4.3. Integrar en slide

Cada slide puede tener área de texto colaborativa
Usar Y.XmlFragment independiente: ydoc.getXmlFragment('slide-text-{slideId}')

4.5. Presencia y cursores
4.5.1. Awareness API

Yjs Awareness maneja estado efímero de usuarios
Campos útiles:

cursor: {x, y} (posición del mouse)
user: {id, name, color}
selection: {slideId, objectId} (opcional)

4.5.2. Mostrar cursores de otros usuarios
typescript// client/src/components/CursorOverlay.tsx
export function CursorOverlay({ awareness }: Props) {
const [cursors, setCursors] = useState<Map<number, CursorState>>(new Map())

useEffect(() => {
const updateCursors = () => {
const states = awareness.getStates()
setCursors(new Map(states))
}

    awareness.on('change', updateCursors)
    return () => awareness.off('change', updateCursors)

}, [awareness])

return (

<div className="absolute inset-0 pointer-events-none">
{Array.from(cursors.values()).map(state => (
<Cursor
          key={state.user.id}
          x={state.cursor.x}
          y={state.cursor.y}
          name={state.user.name}
          color={state.user.color}
        />
))}
</div>
)
}
4.5.3. Actualizar posición de cursor local

Listener mousemove en canvas
Throttle con lodash.throttle a 50ms
awareness.setLocalStateField('cursor', {x, y})

4.6. Lista de participantes activos
4.6.1. Componente ParticipantsList
typescriptexport function ParticipantsList({ awareness }: Props) {
const [participants, setParticipants] = useState<User[]>([])

useEffect(() => {
const update = () => {
const states = Array.from(awareness.getStates().values())
setParticipants(states.map(s => s.user))
}

    awareness.on('change', update)
    return () => awareness.off('change', update)

}, [awareness])

return (

<div className="flex gap-2">
{participants.map(user => (
<Avatar key={user.id} name={user.name} color={user.color} />
))}
</div>
)
}
4.7. Manejo de desconexiones
4.7.1. Indicador de estado de conexión

Provider emite eventos: status, sync
Estados: connecting, connected, disconnected
UI: badge con color (verde=conectado, amarillo=sincronizando, rojo=desconectado)

4.7.2. Reconexión automática

y-websocket maneja reconexión por defecto
Configurable: maxBackoffTime, connectRetries

4.7.3. Resolución de conflictos

Yjs CRDT resuelve automáticamente
No se requiere código adicional (beneficio de Yjs)

4.8. Optimización de performance
4.8.1. Debounce de actualizaciones canvas

Al mover/redimensionar objeto → no enviar cada frame
Solo enviar al terminar interacción (object:modified event)

4.8.2. Limitar tamaño del documento

Si canvas tiene >500 objetos → mostrar warning
Implementar límite máximo y prevenir agregar más

4.8.3. Lazy loading de slides

Solo sincronizar slide actual
Al cambiar slide → desconectar provider anterior, conectar nuevo

4.9. Logging de sincronización
4.9.1. Registrar eventos en server

onUpdate hook en yjs-server.ts
Extraer info: quién, qué cambió, timestamp
Insertar en events_log con payload relevante

4.9.2. Tipos de eventos a registrar
typescript{
'object_added': { objectType, objectId, position },
'object_modified': { objectId, changedProps },
'object_deleted': { objectId },
'text_edited': { length, insertions, deletions },
'slide_changed': { fromSlideId, toSlideId },
'user_joined': { userId, userName },
'user_left': { userId }
}
4.10. Tests de sincronización
4.10.1. Simular clientes múltiples

Crear test que instancia 2 Y.Doc
Conectar ambos al mismo room
Cliente A agrega objeto → verificar que aparece en B
Cliente B modifica → verificar cambio en A

4.10.2. Test de conflictos

Ambos clientes editan mismo objeto simultáneamente
Verificar que Yjs resuelve sin crash
Verificar estado final consistente

4.11. Validación de fase

Levantar servidor Yjs en puerto 1234
Abrir 2 tabs del cliente con mismo roomName
Crear rectángulo en tab 1 → debe aparecer en tab 2 en <1 segundo
Mover objeto en tab 2 → debe actualizarse en tab 1
Escribir texto en editor → debe sincronizar entre tabs
Ver cursores de otros usuarios moviéndose
Desconectar una tab → debe desaparecer de lista de participantes
Verificar en events_log que se registraron los eventos

FASE 5 — Interfaz de Usuario y Experiencia (UI/UX del Aula)
Objetivo de la fase
Construir componentes React con TailwindCSS, implementar flujos de profesor y estudiante, navegación entre slides, toolbar de herramientas, export de PDFs.
Checklist detallado (paso a paso)
5.1. Arquitectura de componentes
5.1.1. Estructura de páginas

client/src/pages/Home.tsx → landing, login
client/src/pages/TeacherDashboard.tsx → gestión de clases
client/src/pages/ClassEditor.tsx → crear/editar plantilla de clase
client/src/pages/LiveSession.tsx → sesión en vivo (profesor y estudiante)
client/src/pages/StudentCopies.tsx → mis copias guardadas

5.1.2. Componentes reutilizables

client/src/components/layout/ → Header, Sidebar, Footer
client/src/components/ui/ → Button, Input, Modal, Dropdown, Badge
client/src/components/canvas/ → Canvas, Toolbar, ShapesMenu
client/src/components/editor/ → TextEditor (TipTap)
`client/
Continuar19:12Orchestrated continuation of detailed design framework phases.1min y 14sEl usuario quiere que continúe con el plan detallado, siguiendo el mismo formato y nivel de detalle que el ejemplo proporcionado. Estoy en la Fase 5, sección de componentes reutilizables. Debo seguir con subsecciones detalladas de cada aspecto de la UI/UX.src/components/session/` → ParticipantsList, Chat, SessionControls
5.2. Sistema de rutas
5.2.1. Configurar React Router
typescript// client/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/dashboard" element={<TeacherDashboard />} />
  <Route path="/classes/:id/edit" element={<ClassEditor />} />
  <Route path="/session/:id" element={<LiveSession />} />
  <Route path="/my-copies" element={<StudentCopies />} />
  <Route path="*" element={<NotFound />} />
</Routes>
5.2.2. Rutas protegidas

Crear ProtectedRoute component
Verifica si hay token en localStorage
Si no → redirect a /
Si rol no coincide → mostrar 403

5.2.3. Navegación programática

Hook personalizado useNavigateWithState() para pasar datos entre rutas

5.3. Estado global con Zustand
5.3.1. Stores a crear
client/src/store/authStore.ts
typescriptinterface AuthState {
user: User | null
token: string | null
login: (name: string, role: Role) => Promise<void>
logout: () => void
isAuthenticated: boolean
}
client/src/store/sessionStore.ts
typescriptinterface SessionState {
currentSession: Session | null
roomName: string | null
participants: User[]
isConnected: boolean
setSession: (session: Session) => void
disconnect: () => void
}
client/src/store/canvasStore.ts
typescriptinterface CanvasState {
selectedTool: Tool
color: string
strokeWidth: number
selectedObjects: fabric.Object[]
setTool: (tool: Tool) => void
// ... más acciones
}
5.3.2. Persistencia de auth

Guardar token en localStorage al login
Cargar al inicializar app
Limpiar al logout

5.4. Página de inicio y autenticación
5.4.1. Home.tsx - diseño

Hero section: "Aula Colaborativa en Tiempo Real"
Formulario simple:

Input: nombre
Radio buttons: profesor / estudiante
Botón: "Entrar"

Al submit → POST /api/auth/join → guardar token → redirect según rol

5.4.2. Validaciones de formulario

Nombre: mínimo 3 caracteres
Rol: requerido
Mostrar errores inline con Tailwind

5.5. Dashboard del profesor
5.5.1. TeacherDashboard.tsx - secciones

Header con nombre de usuario y botón logout
Botón primario: "Crear Nueva Clase"
Grid de cards con clases existentes:

Título, descripción
Número de slides
Botones: "Editar", "Iniciar Sesión", "Eliminar"

5.5.2. Modal: Crear clase

Form con título y descripción
Submit → POST /api/classes → agregar a lista
Cerrar modal y navegar a /classes/:id/edit

5.5.3. Eliminar clase

Confirmación con Modal
DELETE /api/classes/:id → refresh lista

5.5.4. Iniciar sesión en vivo

Click "Iniciar Sesión" → POST /api/sessions
Recibe roomName y sessionId
Modal con URL para compartir (incluyendo cloudflared URL)
Botón "Copiar Link" con clipboard API
Redirect a /session/:id

5.6. Editor de plantillas de clase
5.6.1. ClassEditor.tsx - layout

Sidebar izquierdo: miniatura de slides (vertical)
Área central: canvas grande con slide activo
Toolbar superior: herramientas de dibujo
Panel derecho: propiedades de objeto seleccionado

5.6.2. Miniatura de slides

Cada slide como thumbnail clickeable
Botones: "Agregar Slide", "Eliminar Slide", "Duplicar"
Drag & drop para reordenar (opcional para MVP)

5.6.3. Toolbar de herramientas

Botones:

Seleccionar (cursor)
Dibujar (lápiz libre)
Formas: rectángulo, círculo, línea, flecha
Texto
Imagen (upload)
Borrar objeto seleccionado

Color picker para fill y stroke
Slider para stroke width
Deshacer / Rehacer (Yjs history)

5.6.4. Canvas interactivo

Click en herramienta → cambia modo
Modo rectángulo:

mousedown → inicio
mousemove → preview
mouseup → crear objeto final

Modo texto:

click → crear textbox en posición
doble click → editar texto inline

5.6.5. Panel de propiedades

Si objeto seleccionado:

Inputs para X, Y, Width, Height
Color fill, stroke
Opacidad
Z-index (traer al frente / enviar atrás)
Botón "Eliminar"

Si nada seleccionado:

Propiedades del slide (título)

5.6.6. Guardar cambios

Botón "Guardar" en header
PUT /api/slides/:id/canvas con canvas.toJSON()
Toast notification: "Guardado exitosamente"
Auto-save cada 30 segundos (opcional)

5.6.7. Agregar área de texto TipTap

Sección dedicada debajo del canvas
Editor TipTap con barra de herramientas:

Bold, italic, underline
Lists (bullet, numbered)
Headings

Sincronizado por Yjs (preparación para colaboración)

5.7. Sesión en vivo (profesor)
5.7.1. LiveSession.tsx (rol profesor) - estructura

Área principal: canvas sincronizado en tiempo real
Sidebar derecho:

Lista de participantes con avatares
Chat simple (opcional para MVP)

Header:

Título de la clase
Slide actual (con navegación prev/next)
Botón "Finalizar Sesión"
Badge con número de participantes

5.7.2. Sincronización en vivo

Conectar a WebSocket con roomName
useYjsProvider para obtener ydoc y awareness
FabricYjsBinding para sincronizar canvas
Mostrar cursores de estudiantes con nombres

5.7.3. Controles del profesor

Todas las herramientas de dibujo disponibles
Puede agregar/editar/eliminar objetos
Navegar entre slides (todos ven el cambio)

5.7.4. Navegación de slides sincronizada

Al cambiar slide → actualizar ydoc.getMap('metadata').set('currentSlide', slideId)
Todos los clientes observan cambio y cargan nuevo canvas

5.7.5. Finalizar sesión

Click "Finalizar" → confirmación
POST /api/sessions/:id/end
Desconectar WebSocket
Redirect a dashboard con mensaje de éxito

5.8. Sesión en vivo (estudiante)
5.8.1. LiveSession.tsx (rol estudiante) - diferencias

Canvas en modo semi-lectura: pueden dibujar pero profesor puede borrar
Opción: "Guardar Mi Copia" (botón destacado)
No pueden cambiar de slide manualmente (siguen al profesor)

5.8.2. Unirse a sesión

Estudiante accede a URL compartida con sessionId
Si no está autenticado → modal de login rápido
POST /api/sessions/:id/join → registra participante
Conecta a WebSocket y carga slide actual

5.8.3. Guardar copia personal

Click "Guardar Mi Copia"
POST /api/snapshots con slideId y canvas.toJSON()
Toast: "Copia guardada exitosamente"
Continúa participando en sesión

5.8.4. Indicador de "siguiendo al profesor"

Badge: "Siguiendo slide X de Y"
Si profesor cambia → transición automática

5.9. Mis copias guardadas (estudiante)
5.9.1. StudentCopies.tsx - layout

Grid de cards con snapshots guardados
Cada card:

Thumbnail del canvas
Título de la clase y slide
Fecha de guardado
Botones: "Ver", "Exportar", "Eliminar"

5.9.2. Ver copia

Modal full-screen con canvas renderizado (read-only)
Opción de exportar desde aquí

5.9.3. Exportar copia

Click "Exportar" → modal con opciones: PNG o PDF
POST /api/snapshots/:id/export → recibe URL
Auto-download del archivo
Loading spinner durante generación

5.10. Exportación de slides
5.10.1. Implementar generación de imagen en server

Usar node-canvas o puppeteer para renderizar Fabric JSON a imagen
Endpoint POST /api/slides/:id/export
Body: {format: 'png'|'pdf', width?: number, height?: number}

5.10.2. Proceso de export

Server carga canvas_data del slide
Renderiza con biblioteca de canvas headless
Guarda en /uploads/exports/
Retorna URL pública
Opcional: generar PDF multi-página (todos los slides de la clase)

5.10.3. Client-side: trigger export

Botón "Exportar Clase Completa" en ClassEditor
Loading overlay mientras se genera
Al completar → link de descarga o auto-download

5.11. Chat en vivo (opcional)
5.11.1. Agregar Y.Array para mensajes

ydoc.getArray('chat')
Estructura: {userId, userName, message, timestamp}

5.11.2. Componente Chat.tsx

Input en footer del sidebar
Lista de mensajes con scroll automático
Avatares y nombres coloreados

5.11.3. Enviar mensaje

yChat.push([{...messageData}])
Se sincroniza automáticamente
No requiere API REST

5.12. Diseño responsivo
5.12.1. Breakpoints Tailwind

Mobile (sm): ocultar sidebars, canvas full-screen
Tablet (md): sidebar colapsable
Desktop (lg): layout completo

5.12.2. Canvas adaptable

Detectar tamaño de viewport
Ajustar dimensiones canvas manteniendo aspect ratio
Touch events para tablet/móvil

5.13. Componentes UI base (design system)
5.13.1. Button.tsx

Variantes: primary, secondary, danger, ghost
Tamaños: sm, md, lg
Estados: loading, disabled
Iconos opcionales con lucide-react

5.13.2. Modal.tsx

Backdrop oscuro
Animación fade-in
Close button (X)
Footer con actions (Cancel, Confirm)

5.13.3. Toast.tsx / Notification system

Usar react-hot-toast o implementar custom
Tipos: success, error, warning, info
Auto-dismiss después de 3 segundos

5.13.4. Avatar.tsx

Mostrar iniciales si no hay imagen
Background color basado en userId (hash)
Tamaños: xs, sm, md, lg

5.13.5. Badge.tsx

Para estados: online, offline, syncing
Colores: green, red, yellow, blue

5.14. Manejo de errores en UI
5.14.1. Error boundaries

ErrorBoundary component para capturar errores React
Mostrar fallback UI amigable
Botón "Recargar" o "Reportar"

5.14.2. Errores de API

Interceptor en Axios para capturar errores
Mapear códigos de error a mensajes amigables
Mostrar toast con error
Si 401 → logout automático

5.14.3. Errores de WebSocket

Detectar desconexión
Mostrar banner: "Conexión perdida. Reintentando..."
Auto-reconectar (ya manejado por y-websocket)

5.15. Performance y optimización
5.15.1. Code splitting

Lazy load de páginas con React.lazy()
Suspense con loading skeleton

5.15.2. Memoización

React.memo() para componentes pesados (Canvas, Editor)
useMemo() para cálculos costosos
useCallback() para funciones en props

5.15.3. Virtual scrolling

Si lista de slides es larga → usar react-window

5.15.4. Optimizar canvas

fabric.StaticCanvas para thumbnails (no interactivo, más rápido)
Limitar FPS de render con requestAnimationFrame

5.16. Accesibilidad (a11y)
5.16.1. Semántica HTML

Usar <button>, <nav>, <main>, <aside>
Labels para inputs
Alt text para imágenes

5.16.2. Keyboard navigation

Tab order lógico
Atajos de teclado para herramientas (Ctrl+Z, Ctrl+C, etc.)
Focus visible con Tailwind focus:ring

5.16.3. ARIA labels

aria-label en botones con solo icono
aria-live para notificaciones

5.17. Testing de componentes
5.17.1. Configurar Vitest + Testing Library
bashnpm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
5.17.2. Tests por componente

Button.test.tsx: variantes, disabled, onClick
Modal.test.tsx: abre/cierra, backdrop click
Canvas.test.tsx: crea objeto, selecciona, elimina

5.17.3. Tests de integración

Flujo completo: login → crear clase → agregar slide
Mock de API con MSW (Mock Service Worker)

5.18. Storybook (opcional)
5.18.1. Setup
bashnpx sb init
5.18.2. Stories para cada componente UI

Documentar props y variantes
Visual testing de estados

5.19. Validación de fase

Login como profesor → llegar a dashboard
Crear clase → agregar slide → dibujar rectángulo → guardar
Iniciar sesión → copiar link
Login como estudiante con link → ver canvas sincronizado
Profesor dibuja → estudiante ve en tiempo real (<1s latencia)
Estudiante guarda copia → aparece en "Mis Copias"
Exportar slide a PNG → archivo se descarga
Verificar responsividad en mobile
Tests de componentes pasan con npm test

FASE 6 — Túnel HTTPS, Pruebas y Despliegue (Producción Local)
Objetivo de la fase
Exponer servidor local con Cloudflare Tunnel, realizar pruebas end-to-end, documentar despliegue, implementar backups y monitoreo básico.
Checklist detallado (paso a paso)
6.1. Configurar Cloudflare Tunnel
6.1.1. Instalar cloudflared
bash# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux

wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Windows

# Descargar .exe de releases y agregar a PATH

6.1.2. Autenticar cloudflared
bashcloudflared tunnel login

Abre navegador → selecciona dominio (o usar sin dominio)

6.1.3. Crear túnel
bashcloudflared tunnel create aula-colaborativa

Genera tunnel ID y credentials JSON

6.1.4. Configurar túnel

Crear ~/.cloudflared/config.yml:

yamltunnel: <TUNNEL_ID>
credentials-file: /path/to/<TUNNEL_ID>.json

ingress:

- hostname: aula.tudominio.com # opcional
  service: http://localhost:3000
- service: http_status:404
  6.1.5. Arrancar túnel
  bashcloudflared tunnel run aula-colaborativa

Obtener URL pública (ej: https://xyz.trycloudflare.com)

6.1.6. Crear script scripts/tunnel-start.sh
bash#!/bin/bash
echo "Iniciando Cloudflare Tunnel..."
cloudflared tunnel --url http://localhost:3000
echo "Túnel activo. Presiona Ctrl+C para detener."
6.1.7. Actualizar CORS en server

Agregar URL del túnel a ALLOWED_ORIGINS en .env
Reiniciar servidor

6.2. Configurar proxy para WebSocket
6.2.1. Problema: túnel expone puerto 3000, WebSocket está en 1234

Opción 1: Proxy WebSocket a través de Express
Opción 2: Usar cloudflared con múltiples servicios

6.2.2. Implementar proxy en Express
typescript// server/src/index.ts
import { createProxyMiddleware } from 'http-proxy-middleware'

app.use('/ws', createProxyMiddleware({
target: `ws://localhost:${process.env.YJS_PORT}`,
ws: true,
changeOrigin: true,
pathRewrite: { '^/ws': '' }
}))
6.2.3. Actualizar cliente

VITE_WS_URL=wss://xyz.trycloudflare.com/ws
Cliente conecta a WSS (HTTPS → WSS automáticamente)

6.3. Pruebas end-to-end automatizadas
6.3.1. Configurar Playwright
bashcd client
npm install -D @playwright/test
npx playwright install
6.3.2. Tests E2E
tests/e2e/auth.spec.ts

Abrir app
Completar login
Verificar redirect a dashboard

tests/e2e/collaboration.spec.ts

Login como profesor en contexto 1
Crear clase e iniciar sesión
Copiar URL
Login como estudiante en contexto 2 con URL
Profesor agrega rectángulo
Verificar que aparece en cliente estudiante (con wait)

tests/e2e/snapshot.spec.ts

Estudiante en sesión activa
Click "Guardar Copia"
Navegar a "Mis Copias"
Verificar que snapshot aparece

6.3.3. Ejecutar tests
bashnpm run test:e2e
6.3.4. CI para E2E

GitHub Actions workflow que:

Levanta server y client
Ejecuta Playwright tests
Captura screenshots en failure

6.4. Pruebas de carga
6.4.1. Instalar Artillery
bashnpm install -D artillery
6.4.2. Escenarios de prueba
tests/load/api.yml
yamlconfig:
target: 'http://localhost:3000'
phases: - duration: 60
arrivalRate: 10
scenarios:

- name: "Login and create class"
  flow: - post:
  url: "/api/auth/join"
  json:
  name: "Test User"
  role: "teacher" - post:
  url: "/api/classes"
  headers:
  Authorization: "Bearer {{ token }}"
  json:
  title: "Load Test Class"
  6.4.3. Ejecutar pruebas
  bashartillery run tests/load/api.yml
  6.4.4. Analizar resultados

Latencia p95 < 500ms
Error rate < 1%
Throughput objetivo: 50 req/s

6.5. Backups automatizados
6.5.1. Script de backup
bash# scripts/backup-db.sh
#!/bin/bash
BACKUP_DIR="./database/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DB_FILE="./database/aula.db"

mkdir -p $BACKUP_DIR

# Backup con SQLite

sqlite3 $DB_FILE ".backup '$BACKUP_DIR/aula-$TIMESTAMP.db'"

# Comprimir

gzip "$BACKUP_DIR/aula-$TIMESTAMP.db"

echo "Backup creado: aula-$TIMESTAMP.db.gz"

# Limpiar backups antiguos (mantener últimos 30 días)

find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
6.5.2. Cron job
bash# Ejecutar diario a las 2 AM
0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/aula-backup.log 2>&1
6.5.3. Backup de uploads
bashtar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/
6.6. Monitoreo y logging
6.6.1. Implementar health check endpoint
typescript// server/src/api/routes/health.routes.ts
router.get('/health', (req, res) => {
const dbStatus = checkDatabaseConnection()
const wsStatus = checkWebSocketServer()

res.json({
status: 'ok',
timestamp: new Date().toISOString(),
database: dbStatus,
websocket: wsStatus,
uptime: process.uptime()
})
})
6.6.2. Logging estructurado

Usar winston o pino
Niveles: error, warn, info, debug
Formato JSON para parsing

6.6.3. Configurar rotación de logs
typescriptconst logger = winston.createLogger({
transports: [
new winston.transports.File({
filename: 'logs/error.log',
level: 'error',
maxsize: 5242880, // 5MB
maxFiles: 5
}),
new winston.transports.File({
filename: 'logs/combined.log',
maxsize: 5242880,
maxFiles: 5
})
]
})
6.6.4. Monitoreo simple con dashboard

Crear endpoint /api/metrics:

Número de sesiones activas
Usuarios conectados
Requests por minuto
Tamaño de DB

Frontend en /admin (solo profesor) con gráficas simples

6.7. Manejo de errores en producción
6.7.1. Capturar errores no manejados
typescript// server/src/index.ts
process.on('uncaughtException', (error) => {
logger.error('Uncaught Exception', { error })
process.exit(1)
})

process.on('unhandledRejection', (reason) => {
logger.error('Unhandled Rejection', { reason })
})
6.7.2. Graceful shutdown
typescriptconst server = app.listen(PORT)

process.on('SIGTERM', () => {
logger.info('SIGTERM received, closing server...')
server.close(() => {
logger.info('Server closed')
process.exit(0)
})
})
6.8. Documentación de despliegue
6.8.1. Crear docs/DEPLOYMENT.md
Contenido:
markdown# Guía de Despliegue — Aula Colaborativa

## Requisitos del sistema

- Node.js 18+
- Cloudflared instalado
- Puertos disponibles: 3000, 1234

## Pasos de instalación

### 1. Clonar repositorio

git clone <repo>
cd aula-colaborativa

### 2. Instalar dependencias

cd server && npm install
cd ../client && npm install

### 3. Configurar variables de entorno

cp server/.env.example server/.env
cp client/.env.example client/.env

# Editar archivos .env

### 4. Inicializar base de datos

cd server
npm run db:init
npm run seed

### 5. Compilar cliente

cd client
npm run build

### 6. Iniciar servidor

cd server
npm start

### 7. Iniciar túnel

sh scripts/tunnel-start.sh

### 8. Compartir URL

Copiar URL generada y compartir con estudiantes

## Troubleshooting

### WebSocket no conecta

- Verificar que puerto 1234 no está bloqueado
- Verificar configuración proxy en server

### Túnel no arranca

- Verificar autenticación: `cloudflared tunnel login`
- Revisar logs: `cloudflared tunnel --loglevel debug`
  6.8.2. Crear docs/ARCHITECTURE.md completo

Diagramas de flujo de datos
Explicación de CRDT y Yjs
Esquemas de DB con relaciones
Endpoints API con ejemplos

6.9. Checklist de lanzamiento
6.9.1. Pre-lanzamiento

Todas las migraciones aplicadas
Seeds cargados o DB preparada
Variables de entorno configuradas
Cliente compilado (build)
Health check responde OK
Backups configurados y testeados

6.9.2. Smoke tests

Login como profesor → dashboard carga
Crear clase → se guarda en DB
Iniciar sesión → URL se genera
Estudiante se une → aparece en lista
Sincronización funciona en ambos sentidos
Guardar snapshot → archivo en DB
Exportar PNG → descarga exitosa

6.9.3. Validar desde dispositivo externo

Abrir URL del túnel desde celular/tablet
Login y unirse a sesión
Dibujar y verificar sync
Performance aceptable (<2s latencia)

6.10. Plan de rollback
6.10.1. Si falla en producción

Detener servidor: pkill node
Restaurar DB desde backup:

bashgunzip database/backups/aula-YYYYMMDD.db.gz
cp database/backups/aula-YYYYMMDD.db database/aula.db

Revertir a commit anterior: git checkout <commit>
Reiniciar servidor

6.10.2. Documentar incidentes

Crear docs/INCIDENTS.md
Template: fecha, descripción, causa raíz, solución, prevención

6.11. Optimizaciones para producción
6.11.1. Comprimir respuestas
typescriptimport compression from 'compression'
app.use(compression())
6.11.2. Cachear assets estáticos
typescriptapp.use('/uploads', express.static('uploads', {
maxAge: '1d',
etag: true
}))
6.11.3. Limitar tamaño de uploads
typescriptapp.use(express.json({ limit: '10mb' }))
6.11.4. Configurar timeouts
typescriptserver.setTimeout(30000) // 30 segundos
6.12. Seguridad hardening
6.12.1. Headers de seguridad

Helmet ya configurado (Fase 3)
Agregar CSP (Content Security Policy):

typescriptapp.use(helmet.contentSecurityPolicy({
directives: {
defaultSrc: ["'self'"],
scriptSrc: ["'self'", "'unsafe-inline'"],
styleSrc: ["'self'", "'unsafe-inline'"],
imgSrc: ["'self'", "data:", "https:"],
connectSrc: ["'self'", "ws:", "wss:"]
}
}))
6.12.2. Rate limiting específico

Auth endpoints: 5 req/min por IP
Upload: 10 archivos/hora por usuario

6.12.3. Sanitización de inputs

Usar validator library
Escapar HTML en nombres de usuario
Validar tipos de archivo en uploads

6.13. Documentación de usuario final
6.13.1. Manual del profesor

Crear docs/USER_GUIDE_TEACHER.md:

Cómo crear clase
Cómo agregar slides
Cómo iniciar sesión en vivo
Cómo compartir link
Cómo usar herramientas de dibujo
Cómo exportar clase

6.13.2. Manual del estudiante

Crear docs/USER_GUIDE_STUDENT.md:

Cómo unirse a sesión
Cómo usar herramientas
Cómo guardar copia personal
Cómo exportar mi copia

6.13.3. Video tutoriales (opcional)

Grabar screencast de 5-10 min por flujo principal
Subir a YouTube o plataforma interna

6.14. Validación final de fase

Túnel cloudflared funciona y expone servidor
URL es accesible desde dispositivos externos
5 estudiantes se conectan simultáneamente sin problemas
Latencia de sincronización < 1 segundo
Tests E2E pasan al 100%
Backup manual exitoso y restore validado
Logs se escriben correctamente
Health check retorna status OK
Documentación completa y actualizada
Profesor puede usar aplicación sin asistencia técnica

ROADMAP POR SPRINTS
Sprint 0 — Setup Inicial (Semana 1)
Duración: 3-5 días
Objetivos:

Monorepo estructurado y funcional
Dependencias instaladas
Scripts de ejecución funcionando
Control de versiones activo

Tareas:

Crear estructura de carpetas (server, client, database, docs, scripts)
Inicializar proyectos Node (server y client)
Configurar TypeScript en ambos
Instalar dependencias principales (Express, React, Yjs, Fabric, TipTap)
Configurar Tailwind CSS
Crear archivos .env.example
Configurar ESLint y Prettier
Configurar Husky pre-commit hooks
Crear README con instrucciones de instalación
Primera ejecución exitosa de server y client

Criterios de aceptación:

npm run dev en server levanta servidor en puerto 3000
npm run dev en client levanta Vite en puerto 5173
React app renderiza "Hello World"
Express responde en /health con 200 OK
Git tiene commits iniciales estructurados

Entregables:

PR: "feat: initial project setup"
README.md funcional

Sprint 1 — Base de Datos y API Básica (Semana 1-2)
Duración: 1 semana
Objetivos:

Schema SQLite completo
Migraciones versionadas
Repositories con CRUD
Endpoints de auth y classes

Tareas:

Diseñar schema completo (8 tablas)
Crear archivos migration SQL
Implementar script de migración
Crear seeds con datos de desarrollo
Implementar database.ts con helpers
Crear repositories (users, classes, slides, sessions, etc.)
Implementar endpoints POST /api/auth/join y GET /api/auth/me
Implementar endpoints CRUD para /api/classes
Middleware de autenticación JWT
Middleware de validación con express-validator
Tests unitarios de repositories
Tests de integración de endpoints

Criterios de aceptación:

Ejecutar npm run db:init crea DB con todas las tablas
Ejecutar npm run seed inserta datos de prueba
POST /api/auth/join retorna token válido
POST /api/classes (con token) crea clase y persiste en DB
GET /api/classes retorna lista correcta
Tests pasan al 100%

Entregables:

PR: "feat: database schema and migrations"
PR: "feat: auth and classes API endpoints"
PR: "test: unit and integration tests for DB layer"

Sprint 2 — WebSocket Yjs y Sincronización (Semana 2-3)
Duración: 1 semana
Objetivos:

Servidor y-websocket funcionando
Cliente conecta y sincroniza
Objetos Fabric.js se replican entre clientes

Tareas:

Implementar yjs-server.ts con y-websocket
Configurar persistencia en memoria (o y-leveldb opcional)
Arrancar WebSocket server en puerto 1234
Crear lib/yjs-config.ts en cliente
Implementar custom hook useYjsProvider
Crear FabricYjsBinding class
Mapear eventos Fabric → Yjs Map
Mapear cambios Yjs → objetos Fabric
Prevenir loops infinitos con flag isSyncing
Implementar logging de eventos en server
Crear componente CollaborativeCanvas básico
Tests de sincronización (2 clientes simulados)

Criterios de aceptación:

Servidor WebSocket levanta sin errores
2 tabs del navegador conectan al mismo room
Cliente A crea rectángulo → aparece en cliente B en < 1 segundo
Cliente B modifica color → cliente A ve el cambio
No hay errores de concurrencia o race conditions
Events_log registra eventos de sincronización

Entregables:

PR: "feat: Yjs WebSocket server implementation"
PR: "feat: client-side Yjs provider and Fabric binding"
PR: "test: sync tests with multiple clients"

Sprint 3 — UI Core y Navegación (Semana 3-4)
Duración: 1 semana
Objetivos:

Páginas principales funcionando
Routing configurado
Componentes UI base
Estado global con Zustand

Tareas:

Configurar React Router con rutas principales
Crear authStore y sessionStore con Zustand
Implementar página Home con formulario de login
Implementar TeacherDashboard con lista de clases
Crear componentes UI: Button, Modal, Input, Badge, Avatar
Implementar ClassEditor con layout básico (sin funcionalidad completa)
Implementar LiveSession con estructura (sin sync aún)
Configurar persistencia de auth en localStorage
Implementar rutas protegidas (ProtectedRoute)
Agregar Tailwind styling a todos los componentes
Tests de componentes UI

Criterios de aceptación:

Login funciona y guarda token
Dashboard carga lista de clases desde API
Click "Crear Clase" abre modal y persiste en DB
Navegación entre páginas sin errores
UI es responsive en desktop
Tests de componentes pasan

Entregables:

PR: "feat: routing and page structure"
PR: "feat: auth flow and Zustand stores"
PR: "feat: UI component library"

Sprint 4 — Editor de Clases (Semana 4-5)
Duración: 1 semana
Objetivos:

Canvas Fabric.js funcional
Toolbar de herramientas completo
Guardar cambios en DB
Agregar/eliminar slides

Tareas:

Integrar Fabric.js en ClassEditor
Implementar toolbar con botones de herramientas
Crear modos: selección, rectángulo, círculo, línea, texto
Implementar color picker y stroke width
Implementar panel de propiedades para objeto seleccionado
Crear miniatura de slides con navegación
Implementar "Agregar Slide" y "Eliminar Slide"
Conectar a API: PUT /api/slides/:id/canvas para guardar
Implementar auto-save cada 30 segundos
Agregar TipTap editor para área de texto
Tests de interacciones canvas

Criterios de aceptación:

Crear rectángulo en canvas y se persiste
Cambiar color de objeto y se aplica
Guardar cambios → canvas_data en DB se actualiza
Agregar nuevo slide → aparece en lista
Editor de texto funciona con formato básico
Canvas responde sin lag en interacciones

Entregables:

PR: "feat: Fabric.js canvas with toolbar"
PR: "feat: slide management and persistence"
PR: "feat: TipTap text editor integration"

Sprint 5 — Sesión en Vivo (Semana 5-6)
Duración: 1 semana
Objetivos:

Sesiones activas con múltiples participantes
Sincronización en tiempo real completa
Presencia y cursores
Chat (opcional)

Tareas:

Implementar endpoints POST /api/sessions y gestión de sesiones
Integrar Yjs en LiveSession (profesor y estudiante)
Conectar FabricYjsBinding en sesión activa
Implementar awareness para presencia de cursores
Crear componente CursorOverlay con cursores de otros usuarios
Implementar ParticipantsList con avatares
Sincronizar cambio de slide entre participantes
Implementar control "Finalizar Sesión" (profesor)
Registrar eventos en events_log durante sesión
Implementar indicador de conexión (conectado/desconectado)
Opcional: Chat con Y.Array
Tests E2E de sesión colaborativa

Criterios de aceptación:

Profesor inicia sesión → genera URL
5 estudiantes se unen con URL
Profesor dibuja → todos ven en < 1 segundo
Estudiantes ven cursores de otros con nombres
Cambiar slide → todos siguen al profesor
Finalizar sesión → desconecta a todos
Events_log contiene todos los eventos de la sesión

Entregables:

PR: "feat: live session with real-time sync"
PR: "feat: cursor presence and participants list"
PR: "test: E2E collaboration tests"

Sprint 6 — Copias de Estudiantes y Export (Semana 6-7)
Duración: 1 semana
Objetivos:

Estudiantes guardan copias personales
Exportar slides a PNG/PDF
Página "Mis Copias"

Tareas:

Implementar POST /api/snapshots en backend
Agregar botón "Guardar Mi Copia" en LiveSession (estudiante)
Implementar GET /api/snapshots/my-copies
Crear página StudentCopies con grid de snapshots
Implementar POST /api/slides/:id/export (PNG)
Usar node-canvas o puppeteer para renderizar canvas
Implementar POST /api/snapshots/:id/export
Agregar botón "Exportar" en ClassEditor para export completo
Modal de descarga con loading spinner
Tests de export y snapshots

Criterios de aceptación:

Estudiante guarda copia → aparece en "Mis Copias"
Exportar slide → archivo PNG se descarga correctamente
Canvas se renderiza fielmente en export
Profesor exporta clase completa → ZIP con todos los slides
Tests de export pasan

Entregables:

PR: "feat: student snapshots and personal copies"
PR: "feat: export slides to PNG/PDF"

Sprint 7 — Túnel HTTPS y Despliegue (Semana 7-8)
Duración: 1 semana
Objetivos:

Cloudflare Tunnel funcionando
Acceso desde dispositivos externos
Backups automatizados
Documentación completa

Tareas:

Instalar y configurar cloudflared
Crear script tunnel-start.sh
Configurar proxy WebSocket en Express
Actualizar CORS con URL del túnel
Probar acceso desde dispositivos externos
Crear script backup-db.sh con rotación
Configurar cron job para backups diarios
Implementar health check endpoint
Configurar logging con winston
Crear docs/DEPLOYMENT.md completo
Crear docs/USER_GUIDE_TEACHER.md
Crear docs/USER_GUIDE_STUDENT.md
Ejecutar checklist de lanzamiento
Smoke tests completos

Criterios de aceptación:

Túnel expone servidor públicamente
URL accesible desde celular en red diferente
WebSocket funciona sobre WSS
5 dispositivos externos se conectan sin problemas
Backup manual exitoso y restore validado
Documentación completa y precisa
Profesor no técnico puede seguir guía y usar app

Entregables:

PR: "feat: cloudflare tunnel configuration"
PR: "feat: backup automation and logging"
PR: "docs: complete deployment and user guides"

Sprint 8 — Pulido y Optimización (Semana 8-9 - Opcional)
Duración: 1 semana
Objetivos:

Performance mejorada
Testing completo
Features adicionales menores

Tareas:

Optimizar queries de DB con índices
Implementar caching de assets estáticos
Code splitting en cliente
Virtual scrolling para listas largas
Memoización de componentes pesados
Tests de carga con Artillery
Análisis de bundle size
Mejoras de accesibilidad (a11y)
Implementar deshacer/rehacer en canvas
Agregar atajos de teclado
Mejorar manejo de errores con mensajes amigables
Implementar panel de métricas básico (/admin)

Criterios de aceptación:

Latencia p95 < 500ms
Bundle size < 500KB (gzipped)
Lighthouse score > 90
Coverage de tests > 80%
Sin errores en consola
Accesibilidad WCAG AA cumplida

Entregables:

PR: "perf: optimize bundle and queries"
PR: "feat: undo/redo and keyboard shortcuts"
PR: "test: increase coverage to 80%"

HISTORIAS DE USUARIO
Como Profesor
HU-01: Crear clase

Como profesor
Quiero crear una nueva clase con título y descripción
Para organizar mis lecciones

Criterios de aceptación:

Formulario con campos título (requerido) y descripción (opcional)
Al guardar, clase aparece en mi dashboard
Se crea con al menos 1 slide por defecto

HU-02: Editar plantilla de clase

Como profesor
Quiero agregar slides y dibujar en canvas
Para preparar material antes de la clase

Criterios de aceptación:

Puedo agregar/eliminar slides
Puedo dibujar formas (rectángulo, círculo, línea)
Puedo agregar texto con editor
Puedo subir imágenes
Cambios se guardan automáticamente o con botón "Guardar"

HU-03: Iniciar sesión en vivo

Como profesor
Quiero iniciar una sesión en vivo de mi clase
Para que mis estudiantes se unan y colaboren en tiempo real

Criterios de aceptación:

Botón "Iniciar Sesión" en la clase
Se genera URL única para compartir
URL es copiable con un click
Al entrar a la sesión, veo canvas sincronizado y lista de participantes

HU-04: Controlar sesión en vivo

Como profesor
Quiero dibujar y navegar slides durante la sesión
Para guiar la lección y todos los estudiantes vean lo mismo

Criterios de aceptación:

Puedo usar todas las herramientas de dibujo
Al cambiar de slide, todos los estudiantes ven el cambio
Puedo ver quiénes están conectados
Puedo finalizar la sesión cuando termine

HU-05: Exportar clase completa

Como profesor
Quiero exportar todos los slides como imágenes o PDF
Para compartir material fuera de la plataforma

Criterios de aceptación:

Botón "Exportar Clase"
Opciones: PNG (individual) o PDF (todos juntos)
Descarga automática del archivo generado

Como Estudiante
HU-06: Unirme a sesión en vivo

Como estudiante
Quiero unirme a una sesión usando un link
Para participar en la clase remota

Criterios de aceptación:

Accedo a URL compartida por el profesor
Si no estoy logueado, puedo ingresar mi nombre rápidamente
Veo el canvas sincronizado en tiempo real
Aparezco en la lista de participantes

HU-07: Ver cambios en tiempo real

Como estudiante
Quiero ver lo que el profesor dibuja instantáneamente
Para seguir la clase sin retrasos

Criterios de aceptación:

Latencia < 1 segundo entre acción del profesor y mi vista
Veo cursores de otros participantes
Si el profesor cambia de slide, mi vista se actualiza automáticamente

HU-08: Guardar copia personal

Como estudiante
Quiero guardar una copia del slide actual
Para tener mi propia versión y trabajar sobre ella después

Criterios de aceptación:

Botón "Guardar Mi Copia" visible durante sesión
Al guardar, recibo confirmación
Puedo acceder a mis copias en una página dedicada

HU-09: Ver mis copias guardadas

Como estudiante
Quiero ver todas mis copias guardadas
Para revisarlas y exportarlas cuando necesite

Criterios de aceptación:

Página "Mis Copias" lista todas mis copias
Cada copia muestra: thumbnail, nombre de clase, fecha
Puedo ver, exportar o eliminar cada copia

HU-10: Exportar mi copia

Como estudiante
Quiero exportar mi copia como imagen
Para guardarla en mi dispositivo

Criterios de aceptación:

Botón "Exportar" en cada copia
Opciones: PNG o PDF
Descarga automática del archivo
