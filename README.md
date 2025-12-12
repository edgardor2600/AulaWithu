# Aula Colaborativa MVP

Plataforma educativa en tiempo real donde profesores y estudiantes colaboran en una pizarra compartida.

## 🚀 Características

- **Pizarra Colaborativa**: Canvas compartido en tiempo real con Fabric.js
- **Editor de Texto**: Texto enriquecido colaborativo con TipTap
- **Sincronización en Tiempo Real**: Yjs CRDT para colaboración sin conflictos
- **Gestión de Clases**: Profesores crean y administran clases con múltiples slides
- **Sesiones en Vivo**: Estudiantes se unen a sesiones activas y colaboran
- **Copias Personales**: Estudiantes guardan snapshots de slides para trabajar offline
- **Export**: Exportar slides a PNG/PDF

## 📋 Requisitos Previos

- **Node.js** 20+ (recomendado 20.19+ o 22.12+)
- **npm** 10+
- **Git**
- **Docker** (opcional, para deployment con contenedores)

## 🛠️ Instalación Local

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd aula-colaborativa
```

### 2. Instalar dependencias

**Backend:**

```bash
cd server
npm install
```

**Frontend:**

```bash
cd ../client
npm install
```

### 3. Configurar variables de entorno

**Server** (`server/.env`):

```env
PORT=3002
YJS_PORT=1234
DATABASE_PATH=./database/aula.db
UPLOADS_DIR=../uploads
JWT_SECRET=your_secret_key_here
ALLOWED_ORIGINS=http://localhost:5173
```

**Client** (`client/.env`):

```env
VITE_API_URL=http://localhost:3002
VITE_WS_URL=ws://localhost:1234
```

### 4. Inicializar base de datos

```bash
cd server
npm run db:init
```

Esto creará la base de datos SQLite y la poblará con datos de prueba.

## 🎮 Ejecución

### Opción 1: Manual (2 terminales)

**Terminal 1 - Backend:**

```bash
cd server
npm run dev
```

Verás: `Server running on port 3002` y `Yjs WebSocket server running on port 1234`

**Terminal 2 - Frontend:**

```bash
cd client
npm run dev
```

Verás: `Local: http://localhost:5173/`

### Opción 2: Script Automático

**Windows:**

```bash
scripts\dev-full.bat
```

**Linux/Mac:**

```bash
chmod +x scripts/dev-full.sh
./scripts/dev-full.sh
```

### Opción 3: Docker Compose

**Desarrollo (con hot-reload):**

```bash
docker-compose -f docker-compose.dev.yml up
```

**Producción:**

```bash
docker-compose up -d
```

## 🌐 URLs de Acceso

- **Frontend**: http://localhost:5173
- **API REST**: http://localhost:3002
- **API Docs**: http://localhost:3002/health
- **WebSocket**: ws://localhost:1234

## 📚 Documentación

- **[Arquitectura](docs/ARCHITECTURE.md)** - Diagrama del sistema y componentes
- **[API Contracts](docs/API_CONTRACTS.md)** - Endpoints REST completos
- **[Notas de Desarrollo](DEV_NOTES.md)** - Estado actual y progreso

## 🧪 Testing

### Usuarios de Prueba (Seed Data)

**Profesor:**

- ID: `teacher-001`
- Nombre: Prof. García

**Estudiantes:**

- Ana Martínez (`student-001`)
- Carlos López (`student-002`)
- María Rodríguez (`student-003`)
- Juan Pérez (`student-004`)
- Laura Gómez (`student-005`)

**Clase de Ejemplo:**

- Título: "English Level A1 - Unit 1"
- 3 slides predefinidos

### Flujo de Prueba

1. **Abrir Frontend**: http://localhost:5173
2. **Login como Profesor**: Nombre "Prof. García", Rol "teacher"
3. **Ver Clases**: Deberías ver "English Level A1 - Unit 1"
4. **Iniciar Sesión**: Click en la clase → "Iniciar Sesión"
5. **Compartir URL**: Copiar URL generada
6. **Abrir en Incógnito**: Pegar URL, login como "Ana Martínez", rol "student"
7. **Colaborar**: Dibujar en el canvas, ver cambios en tiempo real

## 🔧 Scripts Útiles

### Backup de Base de Datos

```bash
# Windows
scripts\backup-db.bat

# Linux/Mac
./scripts/backup-db.sh
```

### Túnel Público (Cloudflare)

Para compartir con usuarios externos (requiere [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)):

```bash
# Windows
scripts\tunnel-start.bat

# Linux/Mac
./scripts/tunnel-start.sh
```

Esto generará una URL pública tipo `https://random-name.trycloudflare.com` que puedes compartir.

## 📦 Estructura del Proyecto

```
aula-colaborativa/
├── client/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/  # Componentes reutilizables
│   │   ├── pages/       # Vistas principales
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API calls
│   │   ├── store/       # Zustand stores
│   │   ├── lib/         # Configuraciones (Yjs, Fabric)
│   │   └── types/       # TypeScript types
│   └── Dockerfile
├── server/              # Backend (Node.js + Express)
│   ├── src/
│   │   ├── api/         # REST routes
│   │   ├── db/          # Database access
│   │   ├── middleware/  # Auth, validation
│   │   ├── services/    # Business logic
│   │   ├── websocket/   # Yjs server
│   │   └── types/       # TypeScript types
│   ├── scripts/         # DB initialization
│   └── Dockerfile
├── database/            # SQLite database
│   ├── migrations/      # SQL migration files
│   ├── seeds/           # Seed data
│   └── backups/         # DB backups
├── docs/                # Documentation
├── scripts/             # Utility scripts
├── uploads/             # File uploads
├── docker-compose.yml   # Production compose
└── docker-compose.dev.yml  # Development compose
```

## 🛡️ Seguridad

- **JWT Authentication**: Tokens en header `Authorization: Bearer <token>`
- **CORS**: Configurado para orígenes permitidos
- **Input Validation**: express-validator en todos los endpoints
- **File Upload Limits**: Max 5MB por archivo
- **SQL Injection Protection**: Prepared statements con better-sqlite3

## 🚢 Deployment

### Desarrollo

Ya cubierto arriba (npm run dev o docker-compose.dev.yml)

### Producción

1. **Build Docker Images:**

```bash
docker-compose build
```

2. **Start Services:**

```bash
docker-compose up -d
```

3. **Check Health:**

```bash
curl http://localhost:3002/health
```

4. **View Logs:**

```bash
docker-compose logs -f
```

### Variables de Entorno (Producción)

Crear archivo `.env` en raíz:

```env
JWT_SECRET=your_production_secret_here_min_32_chars
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feat/amazing-feature`)
3. Commit tus cambios (`git commit -m 'feat: add amazing feature'`)
4. Push al branch (`git push origin feat/amazing-feature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es privado y confidencial.

## 👥 Equipo

- **Desarrollador Principal**: [Tu Nombre]
- **Arquitecto**: [Tu Nombre]

## 📞 Soporte

Para reportar bugs o solicitar features, abre un issue en el repositorio.

---

**Versión**: 1.0.0 (MVP)  
**Última Actualización**: 2025-12-12
