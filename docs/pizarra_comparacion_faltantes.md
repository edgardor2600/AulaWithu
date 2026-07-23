# Especificación Técnica de Funciones Faltantes: Pizarra React vs. Pizarra de Tablero (HTML/JS)

Este documento describe con precisión absoluta la arquitectura, ubicación de código original, endpoints involucrados, payloads de datos y la estrategia de migración (incluyendo persistencia en PostgreSQL y base de datos de AppAula) para cada una de las funcionalidades de la pizarra antigua (`tablero/`) que aún no están en la versión React (`client/src/components/CanvasEditor.tsx`).

---

## 1. Cronómetro / Temporizador Global (`global-timer-tool`)

### 📍 Ubicación en el Código Legacy
* **Cliente**: `tablero/app.js` (Líneas 3445 - 3780)
* **Funciones Clave**:
  * `startGlobalTimerCountdown()`: Inicializa el intervalo (`setInterval`) restando tiempo al temporizador.
  * `updateGlobalTimerRemainingMs(ms, forceBroadcast)`: Actualiza el estado local y gatilla la transmisión.
  * `formatGlobalTimer(ms)`: Convierte milisegundos en string formateado `MM:SS`.
  * `clearGlobalTimerInterval()`: Detiene el bucle activo de la cuenta regresiva.
  * `applyGlobalTimerPanelPosition()` / `handleGlobalTimerDragMove(ev)`: Controlan el arrastre del visor flotante.

### 🌐 Lógica de Comunicación y Backend
* **Original**: No utiliza HTTP, se sincroniza en tiempo real mediante el canal de Yjs (`yjs-server` en el puerto `1234`). El profesor modifica la propiedad `globalTimer` en el Y.Map compartido. Los clientes escuchan los cambios y renderizan el visor flotante `#global-timer-display` en sintonía.

### 🚀 Estrategia de Migración y Base de Datos (React / PostgreSQL)
1. **Sincronización en React**:
   * En `client/src/hooks/useYjs.ts`, agregar una clave `globalTimer` al Y.Map de la sesión.
   * El estado del cronómetro compartirá la siguiente estructura JSON:
     ```json
     {
       "isOpen": false,
       "durationMinutes": 2,
       "remainingMs": 120000,
       "isRunning": false,
       "deadlineMs": 0,
       "startedBy": "userId"
     }
     ```
2. **Persistencia (Opcional - DB)**:
   * Si deseamos persistir métricas de clase o saber cuántos temporizadores se ejecutaron, podemos crear una tabla `session_timers` en PostgreSQL:
     ```sql
     CREATE TABLE session_timers (
         id SERIAL PRIMARY KEY,
         session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
         duration_seconds INT NOT NULL,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     ```

---

## 2. Visor/Presentador de Documentos (`presenter-btn`)

### 📍 Ubicación en el Código Legacy
* **Cliente**: `tablero/presenter.js` (Líneas 1 - 1146, archivo completo)
* **Lógica del HTML**: `#presenter-panel` en `tablero/index.html`.
* **Funciones Clave**:
  * `openPresenter(file)`: Orquestador de carga. Detecta formato y llama al parser respectivo.
  * `parsePptx(file)`: Descomprime el archivo usando `JSZip`, lee el orden en `ppt/_rels/presentation.xml.rels`, extrae imágenes de `ppt/media/` y renderiza cada diapositiva XML en un lienzo off-screen (`renderPptxXmlToCanvas`).
  * `parseDocx(file)`: Convierte a HTML usando `mammoth.convertToHtml` y fragmenta el documento en secciones de aproximadamente 200 palabras (`splitDocxSections`).
  * `parseXlsx(file)`: Lee hojas de cálculo usando `SheetJS` (`XLSX.read`) y las convierte a tablas HTML.
  * `htmlSectionToDataURL(htmlContent, pageNum, total)`: Utiliza `html2canvas` para transformar el HTML procesado (de DOCX o XLSX) en imágenes base64 de 1280x720.

### 🌐 Lógica de Comunicación y Backend
* **Original**: Procesamiento 100% del lado del cliente (Client-side parsers). Las dependencias externas en `index.html` son:
  * `https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js`
  * `https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js`
  * `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`
  * `https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js`

### 🚀 Estrategia de Migración y Base de Datos (React / PostgreSQL)
1. **Componente de Interfaz**:
   * Crear `client/src/components/PresenterPanel.tsx`. Importar las librerías dinámicamente o agregarlas a `package.json` de React.
2. **Integración con la Pizarra**:
   * Al convertir cada página/diapositiva a imagen PNG (Base64), se añade como un elemento tipo `"image"` a la pizarra mediante el hook del canvas (`useCanvasClipboard.ts`), ubicando los slides en una cuadrícula vertical o reemplazando el lienzo actual.
3. **Persistencia (PostgreSQL / Almacenamiento)**:
   * Para evitar tener que re-cargar el archivo pesado cada vez que se refresca la página, al procesar el archivo se debe enviar cada diapositiva al backend:
     * **Ruta**: `POST /api/uploads/presenter-slide` (Sube la imagen convertida al storage `/uploads`).
     * **Tabla DB (`session_materials`)**: Guarda la referencia del documento cargado:
       ```sql
       CREATE TABLE session_materials (
           id SERIAL PRIMARY KEY,
           session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
           file_name VARCHAR(255) NOT NULL,
           file_type VARCHAR(50) NOT NULL,
           slide_urls JSONB NOT NULL, -- Array de URLs ["/uploads/slide1.png", ...]
           current_slide_index INT DEFAULT 0,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       );
       ```
   * Sincronizar el slide actual en tiempo real con Yjs para que los alumnos cambien de diapositiva junto con el profesor.

---

## 3. Reto de Velocidad de Lectura (`reading-game-tool`)

### 📍 Ubicación en el Código Legacy
* **Cliente**: `tablero/reading-game.js` (Líneas 1 - 1982, archivo completo)
* **Interfaz HTML**: `#reading-game-panel` e `#reading-game-trainer-bubble`.
* **Funciones Clave**:
  * `generateStoryByAI()`: Llama a `/api/completion` para crear historias.
  * `startGame()`: Pide acceso al micrófono, inicia `MediaRecorder` y corre la animación de desplazamiento de palabras según el WPM establecido.
  * `alignTranscriptionRealtime(...)`: Utiliza el transcriptor de voz local `webkitSpeechRecognition` para marcar en tiempo real palabras leídas correctamente (verde).
  * `stopAndEvaluate()`: Finaliza grabación y envía el audio a evaluar.
  * `alignTranscription(...)` en la evaluación final: Compara el texto de la historia original contra la transcripción completa usando programación dinámica (LCS) para identificar errores (`bad`), omisiones (`unread`) y aciertos (`ok`).
  * `startPronunciationTrainer(badWords)`: Controla la ventana flotante `#reading-game-trainer-bubble` para practicar las palabras con pronunciación incorrecta una a una.

### 🌐 Lógica de Comunicación y Backend
* **Servidor de Python (`ai_tutor_server.py`)**:
  * **Endpoint de Evaluación**: `POST /api/evaluate` (Línea 1111).
    * *Payload (FormData)*: `audio` (file), `topic` (string), `level` (string), `question` (string), `expected_answer` (string), `api_provider` (string), `api_key` (string).
    * *Respuesta JSON*:
      ```json
      {
        "ok": true,
        "evaluation": {
          "transcript": "Student speech transcription text...",
          "overall_score": 85,
          "pronunciation_score": 80,
          "grammar_score": 90,
          "relevance_score": 95,
          "feedback": "Detailed feedback in Spanish from tutor IA"
        }
      }
      ```
  * **Endpoint de Síntesis de voz (TTS)**: `POST /api/tts-feedback` (Línea 98 de Express proxying a Python).
    * *Payload JSON*: `{ "text": "word", "voice": "en-US-JennyNeural" }` -> Retorna stream binario `audio/mpeg`.

### 🚀 Estrategia de Migración y Base de Datos (React / PostgreSQL)
1. **Rutas Express Proxy**:
   * Definir `POST /api/reading/evaluate` en `server/src/api/reading.routes.ts` que reciba el FormData (con el audio grabado) y haga proxy hacia `http://localhost:8080/api/evaluate`.
2. **Interfaz React**:
   * Crear `client/src/components/ReadingGamePanel.tsx`.
   * Integrar controles de audio usando Web Audio API estándar.
3. **Persistencia (PostgreSQL)**:
   * Almacenar los intentos de lectura del alumno para generar reportes de fluidez y velocidad lectora:
     ```sql
     CREATE TABLE student_reading_attempts (
         id SERIAL PRIMARY KEY,
         session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
         student_id INT REFERENCES users(id) ON DELETE CASCADE,
         story_text TEXT NOT NULL,
         wpm_setting INT NOT NULL,
         overall_score INT NOT NULL,
         pronunciation_score INT NOT NULL,
         feedback TEXT,
         audio_url VARCHAR(255),
         words_alignment JSONB NOT NULL, -- Array de objetos [{"word": "hello", "status": "ok"}]
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     ```

---

## 4. Asistente AI Tutor Completo (`ai-tutor-tool`)

### 📍 Ubicación en el Código Legacy
* **Cliente**: `tablero/ai-tutor.js` (Líneas 1 - 6520) y `tablero/lesson-runtime.js` (Líneas 1 - 2240).
* **Funciones Clave**:
  * `generateLessonScript()` / `generatePracticeScript()`: Conectan con el backend para pedir la estructura JSON de la clase (Fase 1: Explicación, Fase 2: Ejercicio, etc.).
  * `evaluateCanvasVisualDrawing()`: Captura la pizarra como imagen base64 y la manda al evaluador de imágenes de Gemini Vision.
  * `loadMaterialFromLibrary(id)`: Recupera clases guardadas en el SQLite local.

### 🌐 Lógica de Comunicación y Backend
* **Servidor de Python (`ai_tutor_server.py`)**:
  * **Endpoint Generación de Clase**: `POST /api/generate-lesson` (Línea 612).
    * *Payload*: `{ "topic": "...", "subject": "...", "level": "...", "context": "..." }`
  * **Endpoint Generación de Ejercicios**: `POST /api/generate-practice` (Línea 676).
  * **Endpoint Evaluación de Imagen de la Pizarra**: `POST /api/evaluate-image` (Línea 1218).
    * *Payload*: `{ "image_data_url": "data:image/png;base64,...", "topic": "...", "level": "...", "question": "..." }`
  * **Biblioteca SQLite original**: Consultaba la base de datos `tutor_library.db` usando funciones de `ai_tutor_library.py`.

### 🚀 Estrategia de Migración y Base de Datos (React / PostgreSQL)
1. **Migración de Base de Datos (SQLite a PostgreSQL)**:
   * Crear tablas de biblioteca en la base de datos PostgreSQL de AppAula:
     ```sql
     CREATE TABLE ai_tutor_materials (
         id SERIAL PRIMARY KEY,
         title VARCHAR(255) NOT NULL,
         subject VARCHAR(100) NOT NULL,
         level VARCHAR(50) NOT NULL,
         mode VARCHAR(50) NOT NULL, -- 'guided' o 'practice'
         script_json JSONB NOT NULL, -- El árbol completo de lección generado por IA
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     
     CREATE TABLE student_ai_evaluations (
         id SERIAL PRIMARY KEY,
         session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
         student_id INT REFERENCES users(id) ON DELETE CASCADE,
         material_id INT REFERENCES ai_tutor_materials(id) ON DELETE SET NULL,
         score INT NOT NULL,
         feedback TEXT,
         screenshot_url VARCHAR(255), -- Ruta de la pizarra evaluada en /uploads
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     ```
2. **Backend Express**:
   * En `server/src/api/conversation.routes.ts`, implementar proxies para `/api/generate-lesson`, `/api/generate-practice`, `/api/evaluate-image` y `/api/evaluate-text` apuntando al backend Python.
   * Crear las rutas en Express para guardar y recuperar elementos de `ai_tutor_materials` directo de PostgreSQL.

---

## 5. Herramienta de Dibujo IA (`ai-draw-panel`)

### 📍 Ubicación en el Código Legacy
* **Cliente**: `tablero/app.js` (Líneas 2970 - 3340).
* **Funciones Clave**:
  * `generateAIDrawingFromPrompt()`: Lee el prompt y el modo de generación seleccionado.
  * `requestAIDrawPlan(prompt)`: Genera un plan de trazos vectoriales (Gemini).
  * `requestAIDrawSVG(prompt)`: Genera código SVG de un dibujo hecho por IA (Gemini).
  * `requestAIDrawImage(prompt)`: Genera imagen rasterizada realista (Gemini).
  * `requestPollinationsImage(prompt)`: Llama a la API gratuita de Pollinations.ai.
  * `renderSVGToDataURL(svgString)`: Convierte el SVG devuelto en una imagen cargable.

### 🌐 Lógica de Comunicación y Backend
* **Servidor de Python (`ai_tutor_server.py`)**:
  * **Endpoint Trazos vectoriales (Strokes)**: `POST /api/generate-drawing-plan`
  * **Endpoint SVG**: `POST /api/generate-drawing-svg`
  * **Endpoint Imagen realista**: `POST /api/generate-drawing-image` (Línea 208 de Express proxy)
* **API Externa Directa**:
  * `https://image.pollinations.ai/prompt/{encoded_prompt}?width=1280&height=960&seed={seed}&nologo=true&model=flux`

### 🚀 Estrategia de Migración y Base de Datos (React / PostgreSQL)
1. **Integración con la Pizarra de React**:
   * Para los modos **Pollinations**, **SVG** e **Imagen Realista**: La imagen Base64 resultante se inserta como un elemento `"image"` en la pizarra de React.
   * Para el modo **Trazos (Strokes)**: El backend devuelve un JSON de puntos coordinados. En el frontend de React, debemos iterar este arreglo e inyectar elementos de tipo `"path"` en el lienzo de Fabric.js para que el profesor/alumno pueda editarlos, cambiarles de color o borrarlos de forma nativa.
2. **Persistencia (PostgreSQL)**:
   * Al insertar una imagen generada por IA, se debe subir la imagen al backend (`server/src/api/uploads.routes.ts`) y guardar la referencia en la colección de elementos de la sesión.
