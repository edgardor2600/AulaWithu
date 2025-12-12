# BLOQUE 3A - Pruebas con Postman

## 📦 Configuración Inicial de Postman

### 1. Crear una Nueva Colección

1. Abre Postman
2. Click en "Collections" en la barra lateral
3. Click en "+" o "New Collection"
4. Nombra la colección: **"Aula Colaborativa - Block 3A"**

### 2. Configurar Variables de Entorno (Opcional pero Recomendado)

1. Click en "Environments" (icono de ojo en la esquina superior derecha)
2. Click en "+" para crear nuevo environment
3. Nombre: **"Aula Dev"**
4. Agregar variables:
   - `base_url` = `http://localhost:3002`
   - `teacher_token` = (vacío por ahora)
   - `student_token` = (vacío por ahora)
5. Click "Save"
6. Selecciona "Aula Dev" en el dropdown de environments

---

## 🧪 PRUEBA 1: JOIN como Teacher

### Configuración en Postman:

1. **Método**: `POST`
2. **URL**: `http://localhost:3002/api/auth/join`
   - (o `{{base_url}}/api/auth/join` si usas variables)
3. **Headers**:
   - Click en la pestaña "Headers"
   - Agregar: `Content-Type` = `application/json`
4. **Body**:
   - Click en la pestaña "Body"
   - Selecciona "raw"
   - Selecciona "JSON" en el dropdown
   - Pega este JSON:
   ```json
   {
     "name": "Prof. García",
     "role": "teacher"
   }
   ```
5. **Click "Send"**

### ✅ Respuesta Esperada (Status: 200 OK):

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZWFjaGVyLTAwMSIsInJvbGUiOiJ0ZWFjaGVyIiwiaWF0IjoxNzAyMzg5NjAwLCJleHAiOjE3MDI5OTQ0MDB9.abc123...",
  "user": {
    "id": "teacher-001",
    "name": "Prof. García",
    "role": "teacher",
    "avatar_color": "#3b82f6",
    "created_at": "2025-12-12T10:41:00"
  }
}
```

### 📝 IMPORTANTE: Guardar el Token

1. Copia el valor del campo `token` de la respuesta
2. Ve a "Environments" → "Aula Dev"
3. Pega el token en la variable `teacher_token`
4. Click "Save"

---

## 🧪 PRUEBA 2: JOIN como Student

### Configuración en Postman:

1. **Método**: `POST`
2. **URL**: `http://localhost:3002/api/auth/join`
3. **Headers**: `Content-Type` = `application/json`
4. **Body** (raw JSON):
   ```json
   {
     "name": "Ana Martínez",
     "role": "student"
   }
   ```
5. **Click "Send"**

### ✅ Respuesta Esperada (Status: 200 OK):

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "student-001",
    "name": "Ana Martínez",
    "role": "student",
    "avatar_color": "#ef4444",
    "created_at": "2025-12-12T10:41:00"
  }
}
```

### 📝 Guardar el Token de Student

1. Copia el `token`
2. Guárdalo en la variable `student_token` del environment
3. Click "Save"

---

## 🧪 PRUEBA 3: GET /me (Usuario Actual)

### Configuración en Postman:

1. **Método**: `GET`
2. **URL**: `http://localhost:3002/api/auth/me`
3. **Headers**:
   - NO necesitas `Content-Type` para GET
4. **Authorization** (pestaña "Authorization"):
   - **Type**: Selecciona "Bearer Token"
   - **Token**: Pega tu `teacher_token` (o usa `{{teacher_token}}`)
5. **Click "Send"**

### ✅ Respuesta Esperada (Status: 200 OK):

```json
{
  "success": true,
  "user": {
    "id": "teacher-001",
    "name": "Prof. García",
    "role": "teacher",
    "avatar_color": "#3b82f6",
    "created_at": "2025-12-12T10:41:00"
  }
}
```

---

## 🧪 PRUEBA 4: Endpoint Protegido

### Configuración en Postman:

1. **Método**: `GET`
2. **URL**: `http://localhost:3002/api/test/protected`
3. **Authorization**:
   - **Type**: Bearer Token
   - **Token**: `{{teacher_token}}`
4. **Click "Send"**

### ✅ Respuesta Esperada (Status: 200 OK):

```json
{
  "success": true,
  "message": "You are authenticated!",
  "user": {
    "userId": "teacher-001",
    "role": "teacher"
  }
}
```

---

## 🧪 PRUEBA 5: Teacher Only (con token de teacher)

### Configuración en Postman:

1. **Método**: `GET`
2. **URL**: `http://localhost:3002/api/test/teacher-only`
3. **Authorization**:
   - **Type**: Bearer Token
   - **Token**: `{{teacher_token}}`
4. **Click "Send"**

### ✅ Respuesta Esperada (Status: 200 OK):

```json
{
  "success": true,
  "message": "Welcome, teacher!",
  "user": {
    "userId": "teacher-001",
    "role": "teacher"
  }
}
```

---

## 🧪 PRUEBA 6: Teacher Only (con token de student) - DEBE FALLAR

### Configuración en Postman:

1. **Método**: `GET`
2. **URL**: `http://localhost:3002/api/test/teacher-only`
3. **Authorization**:
   - **Type**: Bearer Token
   - **Token**: `{{student_token}}` ⚠️ (usa el token de student)
4. **Click "Send"**

### ✅ Respuesta Esperada (Status: 403 Forbidden):

```json
{
  "error": {
    "message": "Access denied. Required role: teacher",
    "code": "FORBIDDEN"
  }
}
```

---

## 🧪 PRUEBA 7: Student Only (con token de student)

### Configuración en Postman:

1. **Método**: `GET`
2. **URL**: `http://localhost:3002/api/test/student-only`
3. **Authorization**:
   - **Type**: Bearer Token
   - **Token**: `{{student_token}}`
4. **Click "Send"**

### ✅ Respuesta Esperada (Status: 200 OK):

```json
{
  "success": true,
  "message": "Welcome, student!",
  "user": {
    "userId": "student-001",
    "role": "student"
  }
}
```

---

## 🧪 PRUEBA 8: Validación - Sin Nombre

### Configuración en Postman:

1. **Método**: `POST`
2. **URL**: `http://localhost:3002/api/auth/join`
3. **Headers**: `Content-Type` = `application/json`
4. **Body** (raw JSON):
   ```json
   {
     "role": "teacher"
   }
   ```
   ⚠️ Nota: NO incluimos "name"
5. **Click "Send"**

### ✅ Respuesta Esperada (Status: 400 Bad Request):

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}
```

---

## 🧪 PRUEBA 9: Sin Token

### Configuración en Postman:

1. **Método**: `GET`
2. **URL**: `http://localhost:3002/api/auth/me`
3. **Authorization**:
   - **Type**: Selecciona "No Auth" o elimina el header
4. **Click "Send"**

### ✅ Respuesta Esperada (Status: 401 Unauthorized):

```json
{
  "error": {
    "message": "No authorization header provided",
    "code": "UNAUTHORIZED"
  }
}
```

---

## 🧪 PRUEBA 10: Token Inválido

### Configuración en Postman:

1. **Método**: `GET`
2. **URL**: `http://localhost:3002/api/auth/me`
3. **Authorization**:
   - **Type**: Bearer Token
   - **Token**: `invalid_token_123`
4. **Click "Send"**

### ✅ Respuesta Esperada (Status: 401 Unauthorized):

```json
{
  "error": {
    "message": "Invalid token",
    "code": "UNAUTHORIZED"
  }
}
```

---

## 📋 Checklist de Validación

Marca cada prueba cuando la completes exitosamente:

- [ ] ✅ PRUEBA 1: Login como teacher (200 OK)
- [ ] ✅ PRUEBA 2: Login como student (200 OK)
- [ ] ✅ PRUEBA 3: GET /me con token (200 OK)
- [ ] ✅ PRUEBA 4: Endpoint protegido (200 OK)
- [ ] ✅ PRUEBA 5: Teacher-only con teacher (200 OK)
- [ ] ✅ PRUEBA 6: Teacher-only con student (403 Forbidden)
- [ ] ✅ PRUEBA 7: Student-only con student (200 OK)
- [ ] ✅ PRUEBA 8: Validación sin nombre (400 Bad Request)
- [ ] ✅ PRUEBA 9: Sin token (401 Unauthorized)
- [ ] ✅ PRUEBA 10: Token inválido (401 Unauthorized)

---

## 💡 Tips de Postman

### Guardar Requests en la Colección

1. Después de configurar cada request, click en "Save"
2. Selecciona la colección "Aula Colaborativa - Block 3A"
3. Dale un nombre descriptivo (ej: "1. Join as Teacher")

### Usar Variables de Environment

En lugar de copiar/pegar tokens, usa:

- `{{base_url}}` en lugar de `http://localhost:3002`
- `{{teacher_token}}` en Authorization
- `{{student_token}}` en Authorization

### Organizar con Folders

1. En la colección, click derecho → "Add Folder"
2. Crea folders: "Auth", "Protected Endpoints", "Error Cases"
3. Arrastra los requests a sus folders correspondientes

### Tests Automáticos (Avanzado)

En la pestaña "Tests" de cada request, puedes agregar:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has token", function () {
  pm.expect(pm.response.json()).to.have.property("token");
});
```

---

## 🎯 Resultado Esperado

Si todas las 10 pruebas pasan:

- ✅ Autenticación JWT funcionando correctamente
- ✅ Middleware de auth verificando tokens
- ✅ Middleware de roles bloqueando accesos incorrectos
- ✅ Validación de inputs detectando errores
- ✅ Manejo de errores retornando formato consistente

**¡BLOQUE 3A COMPLETADO!** 🎉

---

## 🚀 Siguiente Paso

Una vez que todas las pruebas pasen:

1. Toma screenshot de las pruebas exitosas (opcional)
2. Haz commit: `git commit -m "feat: authentication and middleware (Block 3A)"`
3. Continúa con **BLOQUE 3B**: Classes y Slides API
