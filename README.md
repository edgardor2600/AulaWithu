# 🎓 AulaWithu - Plataforma Educativa Colaborativa

[![Status](https://img.shields.io/badge/Status-Version_2.2-7d5afc?style=for-the-badge&logo=statuspage)](https://github.com/edgardor2600/AulaWithu)
[![Stack](https://img.shields.io/badge/Stack-PERN-blue?style=for-the-badge&logo=postgresql)](https://github.com/edgardor2600/AulaWithu)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**AulaWithu** es una solución integral de e-learning diseñada para transformar la enseñanza presencial y virtual en una experiencia interactiva sin precedentes. Combina una **pizarra colaborativa en tiempo real** con un motor administrativo robusto para la gestión de academias de idiomas y otras disciplinas.

---

## 🌟 Visión General

AulaWithu no es solo una herramienta de videoconferencia; es un **ecosistema pedagógico** que permite a los profesores guiar a sus estudiantes a través de material interactivo, realizar anotaciones en vivo con latencia mínima y gestionar la progresión académica (Niveles CEFR) de manera centralizada.

### 🚀 Capacidades Diferenciales

- **Sincronización Ultra-Rápida**: Latencia inferior a 50ms mediante WebSockets y CRDTs (Yjs).
- **Gestión Académica Basada en Roles (RBAC)**: Flujos de trabajo diferenciados para Administradores, Profesores y Estudiantes.
- **Persistencia Inteligente**: Los cambios en la pizarra se guardan automáticamente y pueden ser consultados por los estudiantes en cualquier momento.

---

## ✨ Características Principales

### 🏫 Sistema de Gestión Académica (AMS)

Diseñado para el control total de una institución educativa:

- **Niveles CEFR**: Clasificación de cursos según el Marco Común Europeo (A1, A2, B1, B2, C1, C2).
- **Estructura de Grupos**: Organización de alumnos en grupos con horarios específicos, cupos máximos y días de clase.
- **Matriculación Dinámica**: Sistema flexible para inscribir estudiantes en múltiples niveles y grupos.
- **Panel Administrativo**: Visualización de métricas, gestión de usuarios y control de accesos.

### 🎨 Aula Virtual Interactiva

El corazón de la plataforma, donde ocurre la magia:

- **Pizarra Multimodal**: Herramientas profesionales de dibujo (lápiz, formas geométricas, texto enriquecido) impulsadas por **Fabric.js**.
- **Sistema de Slides & Topics**: El contenido se organiza en temas, cada uno con múltiples diapositivas navegables por el profesor.
- **Puntero Láser**: Sincronización del cursor del profesor para guiar la atención del alumno.
- **Snapshots de Alumnos**: Cada estudiante puede guardar su propia copia editada de la slide actual para estudio posterior.

### 💬 Comunicación & Colaboración

- **Chat en Vivo**: Mensajería instantánea dentro de la sesión para resolución de dudas.
- **Control de Participantes**: El profesor puede ver quién está conectado y gestionar permisos de edición en el canvas.
- **Modo Presentación**: Bloqueo de navegación para que los alumnos sigan exactamente la página que el profesor visualiza.

---

## 🛠️ Stack Tecnológico

El proyecto utiliza una arquitectura moderna separada en frontend y backend para máxima escalabilidad:

| Componente          | Tecnologías                                          |
| :------------------ | :--------------------------------------------------- |
| **Frontend**        | React 18, TypeScript, Vite, Zustand, TailwindCSS     |
| **Backend**         | Node.js, Express, TypeScript, Express-Validator      |
| **Real-Time**       | Yjs (CRDT), WebSockets (ws), y-websocket             |
| **Base de Datos**   | PostgreSQL (Supabase/Local), pg-node                 |
| **Infraestructura** | Docker, Nginx, GitHub Actions                        |
| **Seguridad**       | JWT (JSON Web Tokens), bcrypt, Helmet, Rate Limiting |

---

## 📂 Arquitectura del Proyecto

```text
AulaWithu/
├── client/                 # SPA React (Frontend)
│   ├── src/
│   │   ├── components/     # UI Atómica & Componentes de Negocio
│   │   ├── pages/          # Vistas (Admin, Editor, Dashboard, etc.)
│   │   ├── services/       # Clientes de API (Axios/WebSockets)
│   │   └── store/          # Estado global interactivo (Zustand)
│
├── server/                 # API REST + WebSocket (Backend)
│   ├── src/
│   │   ├── api/            # Controladores y Rutas Express
│   │   ├── db/             # Capa de Persistencia y Repositorios
│   │   ├── services/       # Lógica Transaccional
│   │   └── websocket/      # Servidor de Sincronización Yjs
│
└── database/               # Recursos de Persistencia
    ├── migrations/         # Esquemas SQL versionados
    └── seeds/              # Datos de inicialización (Roles, Niveles)
```

---

## 🚀 Guía de Instalación

### Requisitos Previos

- **Node.js**: v18 o superior
- **PostgreSQL**: v14 o superior
- **Git**

### 1. Clonar y Configurar

```bash
git clone https://github.com/edgardor2600/AulaWithu.git
cd AulaWithu
```

### 2. Variables de Entorno

Crea archivos `.env` siguiendo las plantillas proporcionadas:

**Backend (`server/.env`):**

```env
PORT=3002
YJS_PORT=1234
DATABASE_URL=postgresql://user:pass@localhost:5432/aula_db
JWT_SECRET=tu_clave_secreta_altamente_segura
ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend (`client/.env`):**

```env
VITE_API_URL=http://localhost:3002
VITE_WS_URL=ws://localhost:1234
```

### 3. Instalación & Inicialización

```bash
# Servidor
cd server
npm install
npm run db:migrate  # Crea la estructura en Postgres
npm run db:seed     # Opcional: Carga datos de prueba

# Cliente
cd ../client
npm install
```

### 4. Lanzamiento

- **Modo Desarrollo (Local):** Ejecuta `npm run dev` en ambas carpetas.
- **Modo Docker (Completo):**
  ```bash
  docker-compose up --build -d
  ```

---

## 🧪 Datos de Acceso (Seed Mode)

Si utilizaste el script de `db:seed`, puedes ingresar con:

| Rol               | Usuario      | Contraseña      |
| :---------------- | :----------- | :-------------- |
| **Administrador** | `admin`      | `admin123`      |
| **Profesor**      | `profesor`   | `profesor123`   |
| **Estudiante**    | `estudiante` | `estudiante123` |

---

## 🔒 Consideraciones de Seguridad

- **RBAC**: Implementado mediante middlewares que verifican el `role` en el payload del JWT.
- **Sanitización**: Validación estricta de esquemas de datos con `express-validator`.
- **Protección de API**: Rate-limiting y Helmet configurados para mitigar ataques comunes.
- **SSL**: Recomendado el uso de un proxy inverso (Nginx) para terminación SSL.

---

## 🤝 Contribución

Las contribuciones son las que hacen de la comunidad de código abierto un lugar increíble para aprender, inspirar y crear.

1. Fork el proyecto.
2. Crea tu Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit tus cambios (`git commit -m 'Add: New Amazing Feature'`).
4. Push a la rama (`git push origin feature/AmazingFeature`).
5. Abre un Pull Request.

---

**Desarrollado con pasión para el futuro de la educación.**✨  
Desarrollado por [Edgardo Rodríguez](https://github.com/edgardor2600).
