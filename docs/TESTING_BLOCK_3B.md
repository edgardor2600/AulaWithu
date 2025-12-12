# BLOQUE 3B - Pruebas con Postman (Classes + Slides API)

## 📦 Configuración Inicial

### Variables de Environment

Asegúrate de tener en "Aula Dev":

- `base_url` = `http://localhost:3002`
- `teacher_token` = (tu token de teacher del Bloque 3A)
- `student_token` = (tu token de student del Bloque 3A)
- `class_id` = (vacío por ahora, lo llenaremos)
- `slide_id` = (vacío por ahora, lo llenaremos)

---

## 🧪 PARTE 1: CLASSES API

### PRUEBA 1: Crear Clase (Teacher)

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/classes`
- **Authorization**: Bearer Token → `{{teacher_token}}`
- **Body** (raw JSON):

```json
{
  "title": "English Level A1 - Unit 2",
  "description": "Greetings and introductions"
}
```

**✅ Respuesta Esperada (201 Created):**

```json
{
  "success": true,
  "class": {
    "id": "uuid-here",
    "title": "English Level A1 - Unit 2",
    "description": "Greetings and introductions",
    "teacher_id": "teacher-001",
    "thumbnail_url": null,
    "created_at": "2025-12-12T...",
    "updated_at": "2025-12-12T..."
  }
}
```

**📝 IMPORTANTE**: Guarda el `id` de la clase:

1. Copia el valor del campo `class.id`
2. Ve a Environments → Aula Dev
3. Pega en la variable `class_id`
4. Save

---

### PRUEBA 2: Listar Todas las Clases

**Request:**

- **Método**: `GET`
- **URL**: `{{base_url}}/api/classes`
- **Authorization**: Bearer Token → `{{teacher_token}}`

**✅ Respuesta Esperada (200 OK):**

```json
{
  "success": true,
  "count": 2,
  "classes": [
    {
      "id": "uuid",
      "title": "English Level A1 - Unit 2",
      "description": "Greetings and introductions",
      "teacher_id": "teacher-001",
      "created_at": "2025-12-12T..."
    },
    {
      "id": "class-001",
      "title": "English Level A1 - Unit 1",
      "description": "Introduction to basic greetings and vocabulary",
      "teacher_id": "teacher-001",
      "created_at": "2025-12-12T..."
    }
  ]
}
```

---

### PRUEBA 3: Ver Clase con Slides

**Request:**

- **Método**: `GET`
- **URL**: `{{base_url}}/api/classes/{{class_id}}`
- **Authorization**: Bearer Token → `{{teacher_token}}`

**✅ Respuesta Esperada (200 OK):**

```json
{
  "success": true,
  "class": {
    "id": "uuid",
    "title": "English Level A1 - Unit 2",
    "description": "Greetings and introductions",
    "teacher_id": "teacher-001",
    "teacher_name": "Prof. García",
    "teacher_color": "#3b82f6",
    "slides": [],
    "slides_count": 0,
    "created_at": "2025-12-12T..."
  }
}
```

---

### PRUEBA 4: Actualizar Clase (Owner)

**Request:**

- **Método**: `PUT`
- **URL**: `{{base_url}}/api/classes/{{class_id}}`
- **Authorization**: Bearer Token → `{{teacher_token}}`
- **Body** (raw JSON):

```json
{
  "title": "English Level A1 - Unit 2 (Updated)",
  "description": "Greetings, introductions, and basic conversations"
}
```

**✅ Respuesta Esperada (200 OK):**

```json
{
  "success": true,
  "class": {
    "id": "uuid",
    "title": "English Level A1 - Unit 2 (Updated)",
    "description": "Greetings, introductions, and basic conversations",
    "teacher_id": "teacher-001",
    "updated_at": "2025-12-12T..."
  }
}
```

---

### PRUEBA 5: Intentar Actualizar Clase de Otro (DEBE FALLAR)

**Request:**

- **Método**: `PUT`
- **URL**: `{{base_url}}/api/classes/class-001`
  ⚠️ Nota: Usa `class-001` (clase del seed, no la tuya)
- **Authorization**: Bearer Token → `{{teacher_token}}`
- **Body** (raw JSON):

```json
{
  "title": "Trying to hack"
}
```

**✅ Respuesta Esperada (403 Forbidden):**

```json
{
  "error": {
    "message": "You can only update your own classes",
    "code": "FORBIDDEN"
  }
}
```

---

## 🧪 PARTE 2: SLIDES API

### PRUEBA 6: Crear Slide

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/classes/{{class_id}}/slides`
- **Authorization**: Bearer Token → `{{teacher_token}}`
- **Body** (raw JSON):

```json
{
  "title": "Introduction Slide",
  "slide_number": 1
}
```

**✅ Respuesta Esperada (201 Created):**

```json
{
  "success": true,
  "slide": {
    "id": "slide-uuid",
    "class_id": "class-uuid",
    "slide_number": 1,
    "title": "Introduction Slide",
    "canvas_data": "{\"version\":\"5.3.0\",\"objects\":[]}",
    "created_at": "2025-12-12T...",
    "updated_at": "2025-12-12T..."
  }
}
```

**📝 IMPORTANTE**: Guarda el `slide.id` en la variable `slide_id`

---

### PRUEBA 7: Crear Más Slides

Repite la PRUEBA 6 dos veces más con estos datos:

**Slide 2:**

```json
{
  "title": "Vocabulary",
  "slide_number": 2
}
```

**Slide 3:**

```json
{
  "title": "Practice Exercises"
}
```

⚠️ Nota: No especificamos `slide_number`, se auto-incrementa a 3

---

### PRUEBA 8: Ver Slide

**Request:**

- **Método**: `GET`
- **URL**: `{{base_url}}/api/slides/{{slide_id}}`
- **Authorization**: Bearer Token → `{{teacher_token}}`

**✅ Respuesta Esperada (200 OK):**

```json
{
  "success": true,
  "slide": {
    "id": "slide-uuid",
    "class_id": "class-uuid",
    "slide_number": 1,
    "title": "Introduction Slide",
    "canvas_data": "{\"version\":\"5.3.0\",\"objects\":[]}",
    "created_at": "2025-12-12T...",
    "updated_at": "2025-12-12T..."
  }
}
```

---

### PRUEBA 9: Actualizar Slide

**Request:**

- **Método**: `PUT`
- **URL**: `{{base_url}}/api/slides/{{slide_id}}`
- **Authorization**: Bearer Token → `{{teacher_token}}`
- **Body** (raw JSON):

```json
{
  "title": "Welcome & Introduction"
}
```

**✅ Respuesta Esperada (200 OK):**

```json
{
  "success": true,
  "slide": {
    "id": "slide-uuid",
    "title": "Welcome & Introduction",
    "updated_at": "2025-12-12T..."
  }
}
```

---

### PRUEBA 10: Actualizar Canvas Data

**Request:**

- **Método**: `PUT`
- **URL**: `{{base_url}}/api/slides/{{slide_id}}/canvas`
- **Authorization**: Bearer Token → `{{teacher_token}}`
- **Body** (raw JSON):

```json
{
  "canvas_data": "{\"version\":\"5.3.0\",\"objects\":[{\"type\":\"rect\",\"left\":100,\"top\":100,\"width\":200,\"height\":100,\"fill\":\"red\"}]}"
}
```

**✅ Respuesta Esperada (200 OK):**

```json
{
  "success": true,
  "slide": {
    "id": "slide-uuid",
    "canvas_data": "{\"version\":\"5.3.0\",\"objects\":[...]}",
    "updated_at": "2025-12-12T..."
  }
}
```

---

### PRUEBA 11: Ver Clase con Slides (Verificar)

**Request:**

- **Método**: `GET`
- **URL**: `{{base_url}}/api/classes/{{class_id}}`
- **Authorization**: Bearer Token → `{{teacher_token}}`

**✅ Respuesta Esperada (200 OK):**

```json
{
  "success": true,
  "class": {
    "id": "uuid",
    "title": "English Level A1 - Unit 2 (Updated)",
    "slides": [
      {
        "id": "slide-1-uuid",
        "slide_number": 1,
        "title": "Welcome & Introduction"
      },
      {
        "id": "slide-2-uuid",
        "slide_number": 2,
        "title": "Vocabulary"
      },
      {
        "id": "slide-3-uuid",
        "slide_number": 3,
        "title": "Practice Exercises"
      }
    ],
    "slides_count": 3
  }
}
```

---

### PRUEBA 12: Eliminar Slide

**Request:**

- **Método**: `DELETE`
- **URL**: `{{base_url}}/api/slides/{{slide_id}}`
- **Authorization**: Bearer Token → `{{teacher_token}}`

**✅ Respuesta Esperada (200 OK):**

```json
{
  "success": true,
  "message": "Slide deleted successfully"
}
```

---

### PRUEBA 13: Eliminar Clase (CASCADE)

**Request:**

- **Método**: `DELETE`
- **URL**: `{{base_url}}/api/classes/{{class_id}}`
- **Authorization**: Bearer Token → `{{teacher_token}}`

**✅ Respuesta Esperada (200 OK):**

```json
{
  "success": true,
  "message": "Class deleted successfully"
}
```

⚠️ Nota: Esto también eliminará todos los slides de la clase (CASCADE)

---

## 🧪 PARTE 3: VALIDACIONES Y ERRORES

### PRUEBA 14: Crear Clase sin Título (DEBE FALLAR)

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/classes`
- **Authorization**: Bearer Token → `{{teacher_token}}`
- **Body** (raw JSON):

```json
{
  "description": "No title provided"
}
```

**✅ Respuesta Esperada (400 Bad Request):**

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  }
}
```

---

### PRUEBA 15: Student Intenta Crear Clase (DEBE FALLAR)

**Request:**

- **Método**: `POST`
- **URL**: `{{base_url}}/api/classes`
- **Authorization**: Bearer Token → `{{student_token}}` ⚠️ (usa student token)
- **Body** (raw JSON):

```json
{
  "title": "Student's Class",
  "description": "This should fail"
}
```

**✅ Respuesta Esperada (403 Forbidden):**

```json
{
  "error": {
    "message": "Access denied. Required role: teacher",
    "code": "FORBIDDEN"
  }
}
```

---

### PRUEBA 16: Canvas Data Inválido (DEBE FALLAR)

**Request:**

- **Método**: `PUT`
- **URL**: `{{base_url}}/api/slides/slide-001/canvas`
- **Authorization**: Bearer Token → `{{teacher_token}}`
- **Body** (raw JSON):

```json
{
  "canvas_data": "invalid json here"
}
```

**✅ Respuesta Esperada (400 Bad Request):**

```json
{
  "error": {
    "message": "Invalid canvas data format",
    "code": "VALIDATION_ERROR"
  }
}
```

---

## 📋 Checklist de Validación

- [ ] ✅ PRUEBA 1: Crear clase (201)
- [ ] ✅ PRUEBA 2: Listar clases (200)
- [ ] ✅ PRUEBA 3: Ver clase con slides (200)
- [ ] ✅ PRUEBA 4: Actualizar clase (200)
- [ ] ✅ PRUEBA 5: Actualizar clase ajena (403)
- [ ] ✅ PRUEBA 6: Crear slide (201)
- [ ] ✅ PRUEBA 7: Crear más slides (201 x2)
- [ ] ✅ PRUEBA 8: Ver slide (200)
- [ ] ✅ PRUEBA 9: Actualizar slide (200)
- [ ] ✅ PRUEBA 10: Actualizar canvas (200)
- [ ] ✅ PRUEBA 11: Ver clase con slides (200)
- [ ] ✅ PRUEBA 12: Eliminar slide (200)
- [ ] ✅ PRUEBA 13: Eliminar clase (200)
- [ ] ✅ PRUEBA 14: Validación sin título (400)
- [ ] ✅ PRUEBA 15: Student crea clase (403)
- [ ] ✅ PRUEBA 16: Canvas inválido (400)

---

## 🎯 Resultado Esperado

Si todas las 16 pruebas pasan:

- ✅ CRUD completo de Classes funcionando
- ✅ CRUD completo de Slides funcionando
- ✅ Validaciones de ownership funcionando
- ✅ Validaciones de inputs funcionando
- ✅ Permisos por rol funcionando
- ✅ CASCADE delete funcionando

**¡BLOQUE 3B COMPLETADO!** 🎉

---

## 🚀 Siguiente Paso

Una vez que todas las pruebas pasen:

1. Haz commit: `git commit -m "feat: classes and slides API (Block 3B)"`
2. Continúa con **BLOQUE 3C**: Sessions, Uploads y Snapshots
