# 🎓 AulaWithu - Plataforma Educativa y de Colaboración en Tiempo Real

[![Status](https://img.shields.io/badge/Status-Version_3.0_LTS-7d5afc?style=for-the-badge&logo=statuspage)](https://github.com/edgardor2600/AulaWithu)
[![Stack](https://img.shields.io/badge/Stack-PERN-blue?style=for-the-badge&logo=postgresql)](https://github.com/edgardor2600/AulaWithu)
[![AI-Tutor](https://img.shields.io/badge/AI--Tutor-Gemini_&_Groq-orange?style=for-the-badge&logo=google-gemini)](https://github.com/edgardor2600/AulaWithu)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**AulaWithu** es una plataforma educativa integral de *e-learning* diseñada para ofrecer una experiencia interactiva sin precedentes en la enseñanza presencial y virtual. Combina una **pizarra colaborativa en tiempo real**, un **sistema de exámenes avanzado**, un **tutor inteligente con IA**, y un motor administrativo de gestión académica (CEFR/MCER) para academias de idiomas y otras disciplinas.

---

## 🌟 Visión General

AulaWithu no es solo una herramienta de videoconferencia o gestión de tareas. Es un **ecosistema pedagógico interactivo** que permite a docentes guiar a sus estudiantes a través de material estructurado en tiempo real, realizar anotaciones en vivo con latencia mínima, medir su progreso con exámenes dinámicos y brindar soporte personalizado con un tutor de Inteligencia Artificial disponible 24/7.

---

## ✨ Características Principales

### 🎨 Pizarra Virtual Colaborativa (Real-Time Canvas)
El núcleo interactivo de la sesión en vivo, optimizado para latencia ultrabaja (<50ms):
*   **Dibujo y Herramientas Multimodal**: Lápiz de dibujo libre, creación de formas geométricas (rectángulos, círculos, líneas, flechas), inserción de texto enriquecido (TipTap) e imágenes.
*   **Estructura de Temas y Diapositivas (Slides & Topics)**: El material de clase se organiza en tópicos estructurados con navegación dinámica controlada por el profesor.
*   **Puntero Láser Sincronizado**: Permite al profesor señalar elementos específicos guiando la atención visual de todos los estudiantes conectados.
*   **Copias Personales (Student Snapshots)**: Con un solo clic, los estudiantes pueden guardar su propia copia editable de la diapositiva actual para tomar notas individuales y repasar posteriormente en su perfil.

### 🎥 Reproductor de YouTube Colaborativo
Integración de video colaborativo directamente sobre la pizarra interactiva:
*   **Ventana Superpuesta (`YouTubeOverlay`)**: Interfaz interactiva, arrastrable (*draggable*) y redimensionable (*resizable*) que flota sobre la pizarra.
*   **Sincronización Total de Reproducción**: Pausar, reproducir, silenciar o ajustar el progreso de un video sincroniza el estado en tiempo real para todos los alumnos en la sesión.
*   **Validación Inteligente (YouTube oEmbed API)**: Detecta de antemano si un video tiene restricciones de reproducción o copyright que impidan su inserción (*embed*), proporcionando una alternativa para abrirlo de forma externa en una nueva pestaña del navegador.

### 📝 Sistema Completo de Exámenes (Exam Engine)
Módulo avanzado para la creación, aplicación y calificación de evaluaciones académicas:
*   **Creador de Exámenes (`ExamBuilderPage`)**: Interfaz para profesores donde estructurar cuestionarios con preguntas de opción múltiple, verdadero/falso o de respuesta abierta.
*   **Huso Horario Localizado (UTC-5 Colombia)**: Control preciso en la programación de fechas y horarios de inicio/finalización de exámenes para evitar problemas de desfase horario.
*   **Rendimiento Estudiantil**: Flujo simplificado para tomar exámenes (`TakeExamPage`), persistencia de envíos e historial de notas con cálculo automático de promedios para retroalimentación instantánea.
*   **Panel de Calificaciones (`GradesPanel`)**: Panel centralizado donde el docente revisa los exámenes entregados y califica manualmente las respuestas abiertas.

### 🏫 Sistema de Gestión Académica (AMS)
Un panel administrativo completo enfocado en el control institucional:
*   **Niveles CEFR/MCER**: Clasificación oficial de usuarios y cursos basados en el Marco Común Europeo de Referencia para las lenguas (A1, A2, B1, B2, C1, C2).
*   **Control de Grupos y Horarios**: Configuración de franjas horarias predefinidas de 1 hora (Mañana: 08:00 a 12:00; Tarde/Noche: 14:00 a 22:00) y control de cupos máximos de estudiantes por grupo.
*   **Asignación de Profesores Automatizada**:
    *   Al crear un estudiante y seleccionar su nivel MCER, el sistema le asigna automáticamente todos los profesores con clases en ese nivel.
    *   La sincronización se realiza automáticamente durante el inicio de sesión y en cada proceso de inscripción a grupos.
*   **Acceso Restringido a Sesiones**: Validación estricta en el inicio de sesiones; únicamente los alumnos matriculados en el grupo respectivo pueden ingresar.

### 🤖 Tutor de Inteligencia Artificial (AI Tutor)
Un asistente automatizado impulsado por Inteligencia Artificial y tecnologías de audio:
*   **Servidor Python Independiente (`ai_tutor_server.py`)**: Corre en el puerto `8080` integrándose con APIs de modelos de lenguaje avanzados (Google Gemini y Groq).
*   **Generación de Contenido Multimedia**: Creación automática de lecciones interactivas, diálogos simulados, imágenes y cuestionarios dinámicos.
*   **Motor Text-to-Speech (TTS)**: Conversión de texto a voz nativa para la enseñanza de pronunciación en idiomas.
*   **Minijuegos de Lectura (`reading-game.js`)**: Dinámicas interactivas donde el estudiante puede interactuar leyendo textos e interpretando fonemas.

### 💬 Chat y Comunicación Integrada
*   **Mensajería en Vivo**: Chat integrado en la sesión WebSocket para interacción directa e inmediata en medio de la clase.
*   **Panel de Conversaciones**: Registro persistente de comunicaciones para tutorías grupales y avisos.

---

## 🛠️ Stack Tecnológico

El proyecto se organiza bajo una arquitectura limpia y modular de servicios web:

| Componente | Tecnologías Clave | Descripción |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Zustand, TailwindCSS | SPA responsiva con excelente UI/UX. |
| **Pizarra & Sync** | Fabric.js, Yjs (CRDT), ws, y-websocket | Canvas interactivo y sincronización en tiempo real. |
| **Backend API** | Node.js, Express, TypeScript, Express-Validator | API REST de alto rendimiento y robustez. |
| **Servidor AI** | Python 3.10+, Flask/FastAPI, Gemini API, Groq SDK | Motor de IA generativa y TTS para clases dinámicas. |
| **Base de Datos** | PostgreSQL (Supabase / Pooler), pg-node | Almacenamiento relacional de 14 tablas persistentes. |
| **Seguridad** | JWT, bcrypt, Helmet, CORS, Rate-Limiting | Middleware para protección de endpoints y cifrado. |
| **Despliegue** | Docker, Nginx, Docker Compose | Empaquetado en contenedores y proxy inverso. |

---

## 📂 Arquitectura del Proyecto

```text
AulaWithu/
├── client/                 # SPA React (Frontend)
│   ├── src/
│   │   ├── components/     # Componentes reutilizables (Whiteboard, YouTubeOverlay, Exams...)
│   │   ├── pages/          # Vistas (AdminPanel, ExamBuilder, TakeExam, GroupManagement...)
│   │   ├── services/       # Clientes de API REST & WebSocket (Admin, Classes, Exams...)
│   │   └── store/          # Estado global interactivo (Zustand: auth, theme, ui)
│
├── server/                 # API REST + WebSocket (Backend)
│   ├── src/
│   │   ├── api/            # Controladores y rutas (Auth, Admin, Groups, Exams, Messages...)
│   │   ├── db/             # Capa de datos PostgreSQL, Pool y Repositorios
│   │   ├── services/       # Lógica transaccional de negocio
│   │   └── websocket/      # Servidor WebSocket Yjs para sincronización en tiempo real
│
├── tablero/                # Servidor AI Tutor (Python)
│   ├── ai_tutor_server.py  # Servidor API de Tutor con IA (Puerto 8080)
│   ├── ai_tutor_core.py    # Lógica de prompts e integración con LLMs (Gemini, Groq, MiniMax)
│   ├── reading-game.js     # Lógica del minijuego de lectura/pronunciación
│   └── tts_server.py       # Servidor Text-to-Speech para audio de lecciones
│
├── database/               # Recursos de base de datos
│   ├── migrations/         # Esquemas SQL versionados para PostgreSQL
│   └── seeds/              # Inserciones y datos de inicialización
│
├── scripts/                # Scripts de utilidad
└── uploads/                # Archivos persistentes subidos por usuarios (imágenes, PDFs)
```

---

## 🚀 Guía de Instalación y Ejecución

### Requisitos Previos
*   **Node.js**: v18 o superior.
*   **Python**: v3.10 o superior (para el servidor AI Tutor).
*   **PostgreSQL**: Base de datos relacional (Supabase recomendado).
*   **Docker & Docker Compose** (opcional, para despliegue en contenedores).

---

### 1. Variables de Entorno

Debes crear archivos `.env` en sus respectivos directorios basándote en los archivos de ejemplo:

**Servidor Express (`server/.env`):**
```env
PORT=3002
YJS_PORT=1234
DATABASE_URL=postgresql://tu_usuario:tu_clave@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=tu_clave_secreta_super_segura_de_64_caracteres
ALLOWED_ORIGINS=http://localhost:5173
```

**Cliente React (`client/.env`):**
```env
VITE_API_URL=http://localhost:3002
VITE_WS_URL=ws://localhost:1234
```

**AI Tutor Python (`tablero/.env`):**
```env
GEMINI_API_KEY=tu_gemini_api_key_aqui
MINIMAX_API_KEY=tu_minimax_api_key_aqui
```

---

### 2. Instalación de Dependencias

Ejecuta los siguientes comandos para instalar dependencias en los distintos módulos del monorepo:

```bash
# Instalar dependencias del Servidor Backend
cd server
npm install

# Instalar dependencias del Cliente React
cd ../client
npm install

# Instalar dependencias del AI Tutor Python
cd ../tablero
pip install -r requirements-ai-tutor.txt
```

---

### 3. Migraciones y Base de Datos

Para inicializar la estructura relacional y los datos iniciales de prueba en PostgreSQL:

```bash
cd server
# Ejecutar migraciones SQL en Supabase/PostgreSQL
node scripts/apply-migrations-manual.js

# Cargar datos de prueba (Seeds)
node scripts/seed-db.js
```

---

### 4. Ejecución del Proyecto (Desarrollo Local)

#### Método 1: Lanzadores Rápidos para Windows 💻
Si estás en Windows, puedes iniciar todos los servicios en terminales independientes utilizando los scripts `.bat` ubicados en la raíz del proyecto:
*   **Iniciar todo**: Haz doble clic en `iniciar-todo.bat`. Esto levantará el Cliente (puerto 5173), el Servidor Backend (puerto 3002), el Servidor Yjs (puerto 1234) y el Servidor AI Tutor en Python (puerto 8080).
*   **Detener todo**: Haz doble clic en `apagar-todo.bat` para liberar automáticamente todos los puertos asociados del sistema.

#### Método 2: Manual (Multi-Terminal)
Abre cuatro terminales y ejecuta lo siguiente:
```bash
# Terminal 1: Servidor Backend API
cd server && npm run dev

# Terminal 2: Cliente React
cd client && npm run dev

# Terminal 3: AI Tutor Server
cd tablero && python ai_tutor_server.py
```

---

### 5. Lanzamiento con Docker Compose 🐳

Para arrancar el proyecto completo en contenedores aislados y listos para producción:
```bash
docker-compose up --build -d
```
Esto configurará el backend en el puerto `3002` y el cliente React servido a través de **Nginx** en el puerto `80`.

---

## 🧪 Cuentas de Acceso de Prueba (Modo Seed)

Si cargaste los datos iniciales utilizando el script de *seed*, puedes probar la plataforma con los siguientes accesos:

| Rol | Nombre de Usuario | Contraseña | Nivel Asignado (CEFR) |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `admin123` | *N/A* |
| **Profesor** | `teacher` | `teacher123` | *N/A* |
| **Estudiante A1** | `ana` | `student123` | A1 |
| **Estudiante A2** | `maria` | `student123` | A2 |
| **Estudiante B1** | `juan` | `student123` | B1 |
| **Estudiante B2** | `laura` | `student123` | B2 |

---

## 🔒 Consideraciones de Seguridad y Acceso

1.  **Control de Acceso Basado en Roles (RBAC)**: Los tokens JWT contienen información del rol del usuario. Middlewares en el backend protegen los endpoints restringiendo accesos a vistas administrativas o de docentes según corresponda.
2.  **Seguridad en API**: Protección contra ataques de denegación de servicio a través de límites de peticiones (*rate-limiting*) y configuraciones de cabeceras seguras mediante *Helmet*.
3.  **Sanitización y Validación**: Todos los datos entrantes del cliente son sanitizados y validados por esquemas restrictivos utilizando `express-validator`.
4.  **Acceso Restringido a Sesiones**: Si el profesor crea una sesión de clase para un grupo en particular, solo los estudiantes pertenecientes a ese grupo específico podrán ingresar con el código de acceso.

---

## 🤝 Contribuciones

Si deseas colaborar en el desarrollo de **AulaWithu**, sigue estos pasos:
1.  Realiza un Fork del repositorio.
2.  Crea una rama para tu característica (`git checkout -b feature/NuevaCaracteristica`).
3.  Realiza un commit de tus cambios (`git commit -m 'feat: Añadir nueva característica'`).
4.  Sube los cambios a tu rama (`git push origin feature/NuevaCaracteristica`).
5.  Crea un Pull Request en el repositorio original.

---

**Desarrollado con pasión para el futuro de la educación digital.**  
Creado por [Edgardo Rodríguez](https://github.com/edgardor2600).
