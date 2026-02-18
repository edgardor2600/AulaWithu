# 🎓 AulaWithu - Plataforma Educativa Colaborativa

![Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-2.0.0-blue)
![License](https://img.shields.io/badge/License-Private-red)

**AulaWithu** es una plataforma educativa de próxima generación diseñada para facilitar la enseñanza de idiomas y materias en tiempo real. Combina la potencia de una pizarra colaborativa en vivo con una gestión administrativa robusta de estudiantes, niveles académicos y grupos.

![Tech Stack](https://img.shields.io/badge/Stack-PERN-7d5afc)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791)
![Styling](https://img.shields.io/badge/Styling-TailwindCSS-06B6D4)

---

## ✨ Características Principales

### 🏫 Gestión Académica Avanzada

- **Niveles CEFR**: Soporte completo para niveles académicos (A1, A2, B1, B2, C1, C2).
- **Grupos y Horarios**: Organización de estudiantes en grupos con horarios asignados.
- **Sistema de Inscripciones**: Matriculación flexible de estudiantes en grupos y clases.
- **Panel de Administración**: Control total sobre usuarios, roles, y asignaciones académicas.

### 🎨 Aula Virtual en Tiempo Real

- **Pizarra Colaborativa**: Canvas compartido sincronizado en tiempo real (Yjs).
- **Herramientas de Dibujo**: Lápiz, formas, texto, y puntero láser para profesores.
- **Sincronización Instantánea**: Lo que el profesor escribe, el estudiante lo ve al instante (< 50ms).
- **Modo Presentación**: Control de diapositivas y navegación guiada por el profesor.

### 👥 Roles y Permisos

- **Administrador**: Gestión total de la plataforma, creación de usuarios y asignación de niveles.
- **Profesor**: Gestión de sus clases, creación de contenido y control del aula en vivo.
- **Estudiante**: Acceso a clases asignadas, participación en vivo y visualización de material.

---

## 🛠️ Tecnologías

El proyecto utiliza una arquitectura moderna y escalable:

### Frontend (`/client`)

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Estilos**: TailwindCSS
- **Estado Global**: Zustand
- **Colaboración**: Yjs + WebSocket
- **UI Components**: Lucide React, React Hot Toast

### Backend (`/server`)

- **Runtime**: Node.js
- **Framework**: Express
- **Base de Datos**: PostgreSQL
- **ORM/Query Builder**: pg (node-postgres)
- **Real-time**: Yjs Websocket Server
- **Validación**: express-validator

---

## 🚀 Guía de Instalación

### Requisitos Previos

- **Node.js** v18+
- **PostgreSQL** v14+ (Local o Cloud como Supabase/Neon)

### 1. Clonar el repositorio

```bash
git clone https://github.com/edgardor2600/AulaWithu.git
cd AulaWithu
```

### 2. Configuración de Variables de Entorno

**Backend** (`server/.env`):

```env
PORT=3002
YJS_PORT=1234
# Conexión a PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/app_aula
# JWT Secret para autenticación
JWT_SECRET=tu_secreto_super_seguro_aqui
ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend** (`client/.env`):

```env
VITE_API_URL=http://localhost:3002
VITE_WS_URL=ws://localhost:1234
```

### 3. Instalación de Dependencias

```bash
# Instalar dependencias del servidor
cd server
npm install

# Instalar dependencias del cliente
cd ../client
npm install
```

### 4. Inicialización de Base de Datos

El proyecto incluye scripts para configurar PostgreSQL automáticamente:

```bash
cd server

# Ejecutar migraciones (crea tablas y esquema)
npm run db:migrate

# (Opcional) Poblar con datos de prueba
npm run db:seed
```

### 5. Ejecutar la Aplicación

Para desarrollo, puedes correr ambos servicios simultáneamente:

**Terminal 1 (Backend):**

```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**

```bash
cd client
npm run dev
```

Accede a la aplicación en: `http://localhost:5173`

---

## 🧪 Usuarios de Prueba (Seed Data)

Si ejecutaste `npm run db:seed`, puedes usar estos credenciales:

| Rol            | Usuario      | Contraseña      |
| -------------- | ------------ | --------------- |
| **Admin**      | `admin`      | `admin123`      |
| **Profesor**   | `profesor`   | `profesor123`   |
| **Estudiante** | `estudiante` | `estudiante123` |

---

## 📂 Estructura del Proyecto

```
AulaWithu/
├── client/                 # SPA React
│   ├── src/
│   │   ├── components/     # UI & Business Components
│   │   │   ├── admin/      # Componentes del Panel Admin
│   │   │   ├── groups/     # Gestión de Grupos
│   │   │   └── ...
│   │   ├── pages/          # Rutas de la aplicación
│   │   ├── services/       # Conexión con API
│   │   └── store/          # Estado global (Auth, UI)
│
├── server/                 # API REST + WebSocket
│   ├── src/
│   │   ├── api/            # Rutas Express
│   │   ├── db/             # Repositorios PostgreSQL
│   │   ├── services/       # Lógica de Negocio
│   │   └── websocket/      # Servidor Yjs
│   ├── scripts/            # Scripts de Mantenimiento y DB
│
└── database/               # Recursos de Base de Datos
    ├── migrations/         # Esquemas SQL versionados
    └── seeds/              # Datos iniciales
```

---

## 🔒 Seguridad y Arquitectura

- **Autenticación**: JWT (JSON Web Tokens) con rotación.
- **Autorización**: Middleware basado en roles (RBAC).
- **Persistencia**: Datos críticos en PostgreSQL, estado efímero de sesión en memoria/Yjs.
- **Validación**: Datos de entrada sanitizados en backend.

---

## 🤝 Contribución

1.  Crea un fork del repositorio.
2.  Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`).
3.  Haz commit de tus cambios.
4.  Haz push a la rama.
5.  Abre un Pull Request.

---

**Desarrollado con ❤️ por el equipo de AulaWithu.**
