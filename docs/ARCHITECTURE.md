# Arquitectura del Sistema - Aula Colaborativa

## Visión General

Aula Colaborativa es una plataforma educativa en tiempo real que permite a profesores y estudiantes colaborar en una pizarra compartida durante clases virtuales.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  Fabric.js   │  │   TipTap     │      │
│  │  (Vite+TS)   │  │   Canvas     │  │   Editor     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  Yjs Provider  │                        │
│                    │  (WebSocket)   │                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   HTTP/WS       │
                    └────────┬────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                      SERVIDOR (Node.js)                       │
│  ┌──────────────────────────────────────────────────────────┐│
│  │              Express API (REST)                          ││
│  │  /api/auth  /api/classes  /api/sessions  /api/uploads   ││
│  └──────────────────────┬───────────────────────────────────┘│
│                         │                                     │
│  ┌──────────────────────▼───────────────────────────────────┐│
│  │           Yjs WebSocket Server (Port 1234)              ││
│  │         (Sincronización en Tiempo Real)                 ││
│  └──────────────────────┬───────────────────────────────────┘│
│                         │                                     │
│  ┌──────────────────────▼───────────────────────────────────┐│
│  │              Capa de Servicios                          ││
│  │  AuthService  ClassService  SessionService  UploadSvc   ││
│  └──────────────────────┬───────────────────────────────────┘│
│                         │                                     │
│  ┌──────────────────────▼───────────────────────────────────┐│
│  │            Repositories (Data Access)                    ││
│  │  UsersRepo  ClassesRepo  SlidesRepo  SessionsRepo       ││
│  └──────────────────────┬───────────────────────────────────┘│
└─────────────────────────┼─────────────────────────────────────┘
                          │
                ┌─────────▼──────────┐
                │   SQLite Database  │
                │   (better-sqlite3) │
                └────────────────────┘
```

## Componentes Principales

### Frontend (Client)

- **Framework**: React 18 + TypeScript + Vite
- **Estilos**: TailwindCSS
- **Canvas**: Fabric.js (pizarra colaborativa)
- **Editor de Texto**: TipTap (texto enriquecido colaborativo)
- **Estado Global**: Zustand
- **Routing**: React Router
- **HTTP Client**: Axios
- **Sincronización**: Yjs + y-websocket

### Backend (Server)

- **Runtime**: Node.js 20+
- **Framework**: Express + TypeScript
- **WebSocket**: ws + y-websocket
- **Base de Datos**: SQLite (better-sqlite3)
- **Autenticación**: JWT (jsonwebtoken)
- **Upload**: Multer
- **CRDT**: Yjs (Conflict-free Replicated Data Type)

### Base de Datos

- **Motor**: SQLite
- **ORM**: Ninguno (SQL directo con better-sqlite3)
- **Migraciones**: Sistema custom basado en archivos SQL versionados
- **Tablas**: 8 tablas principales (users, classes, slides, sessions, etc.)

## Flujo de Datos

### 1. Autenticación

```
Usuario → POST /api/auth/join → Server valida → JWT generado → Cliente guarda token
```

### 2. Crear Clase

```
Profesor → POST /api/classes → Server crea en DB → Retorna clase con ID
```

### 3. Sesión en Vivo (Colaboración)

```
Profesor inicia sesión → POST /api/sessions → Server crea room Yjs
                                                      ↓
Estudiantes se unen → POST /api/sessions/:id/join → Conectan a WebSocket
                                                      ↓
Cambios en canvas → Yjs sincroniza → Todos los clientes actualizan
```

### 4. Guardar Snapshot

```
Estudiante → Botón "Guardar" → POST /api/snapshots → Server guarda canvas_data
```

## Seguridad

- **Autenticación**: JWT en header `Authorization: Bearer <token>`
- **CORS**: Configurado para orígenes permitidos
- **Validación**: express-validator en todos los endpoints
- **Rate Limiting**: (Pendiente - Fase 3)
- **Sanitización**: Inputs validados antes de DB

## Escalabilidad

### Actual (MVP)

- SQLite (archivo local)
- WebSocket en mismo proceso que API
- Uploads en filesystem local

### Futuro (Producción)

- PostgreSQL (multi-tenant)
- WebSocket en servidor separado (escalado horizontal)
- S3 para uploads
- Redis para sesiones y cache
- Load balancer (Nginx/Traefik)

## Deployment

### Desarrollo

```bash
# Opción 1: Local
npm run dev (en server y client)

# Opción 2: Docker
docker-compose -f docker-compose.dev.yml up
```

### Producción

```bash
docker-compose up -d
```

## Monitoreo

- Health Check: `GET /health` (retorna 200 OK)
- Logs: stdout (capturados por Docker)
- Métricas: (Pendiente - Fase 6)
