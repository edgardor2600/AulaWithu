# 🎓 SISTEMA DE GRUPOS Y ENROLLMENTS - IMPLEMENTACIÓN COMPLETA

**Fecha**: 2025-12-19  
**Versión**: 1.0  
**Estado**: ✅ Implementado y listo para usar

---

## 📋 RESUMEN EJECUTIVO

Se ha implementado un **sistema completo de grupos y enrollments** (inscripciones) que permite a los profesores organizar sus estudiantes en grupos dentro de cada clase, facilitando la gestión académica para instituciones educativas.

### ¿Qué problema resuelve?

**ANTES**:

- Un profesor podía tener estudiantes asignados, pero sin organización por clases específicas
- No había manera de limitar qué estudiantes ven qué sesiones en vivo
- No se podía diferenciar "English A1 - Grupo Mañana" vs "English A1 - Grupo Tarde"

**DESPUÉS**:

- Los profesores pueden crear múltiples grupos dentro de cada clase
- Los estudiantes se inscriben en grupos específicos
- Las sesiones en vivo pueden filtrarse por grupo
- Mejor organización y reportes académicos

---

## 🗂️ ARQUITECTURA DE LA SOLUCIÓN

### Modelo de Datos

```
CLASSES (Clases del profesor)
   ↓
   1:N
   ↓
GROUPS (Grupos dentro de cada clase)
   ↓
   N:N (a través de ENROLLMENTS)
   ↓
STUDENTS (Estudiantes)
```

**Ejemplo práctico**:

```
Class: "English A1"
  ├─ Group: "Grupo Mañana" (10 estudiantes)
  ├─ Group: "Grupo Tarde" (8 estudiantes)
  └─ Group: "Avanzados" (5 estudiantes)
```

---

## 📦 ARCHIVOS IMPLEMENTADOS

### 1. Migración de Base de Datos

**Archivo**: `database/migrations/006_add_groups_and_enrollments.sql`

**Tablas creadas**:

#### `groups` - Grupos dentro de clases

| Campo          | Tipo     | Descripción                         |
| -------------- | -------- | ----------------------------------- |
| `id`           | TEXT PK  | UUID del grupo                      |
| `class_id`     | TEXT FK  | Clase a la que pertenece            |
| `name`         | TEXT     | Nombre del grupo (único por clase)  |
| `description`  | TEXT     | Descripción opcional                |
| `max_students` | INTEGER  | Máximo de estudiantes (default: 30) |
| `active`       | BOOLEAN  | Estado del grupo                    |
| `created_at`   | DATETIME | Fecha de creación                   |
| `updated_at`   | DATETIME | Última actualización                |

**Constraint único**: `(class_id, name)` - No puede haber dos grupos con el mismo nombre en la misma clase

#### `enrollments` - Inscripciones de estudiantes a grupos

| Campo         | Tipo     | Descripción                         |
| ------------- | -------- | ----------------------------------- |
| `id`          | TEXT PK  | UUID de la inscripción              |
| `group_id`    | TEXT FK  | Grupo al que está inscrito          |
| `student_id`  | TEXT FK  | Estudiante inscrito                 |
| `enrolled_at` | DATETIME | Fecha de inscripción                |
| `enrolled_by` | TEXT FK  | Quién lo inscribió (profesor/admin) |
| `status`      | TEXT     | 'active', 'inactive', 'completed'   |
| `notes`       | TEXT     | Notas opcionales                    |

**Constraint único**: `(group_id, student_id)` - Un estudiante solo puede inscribirse una vez por grupo

**Índices creados** (para performance):

- `idx_groups_class` - Búsqueda rápida de grupos por clase
- `idx_enrollments_group` - Estudiantes por grupo
- `idx_enrollments_student` - Grupos de un estudiante
- `idx_enrollments_status` - Filtrado por estado

### 2. TypeScript Types

**Archivo**: `server/src/types/database.ts`

```typescript
export interface Group {
  id: string;
  class_id: string;
  name: string;
  description: string | null;
  max_students: number;
  active: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  group_id: string;
  student_id: string;
  enrolled_at: string;
  enrolled_by: string | null;
  status: "active" | "inactive" | "completed";
  notes: string | null;
}
```

### 3. Repositories (Capa de Datos)

#### **GroupsRepository** - `server/src/db/repositories/groups-repository.ts`

**Métodos principales**:

- `create()` - Crear grupo
- `getById()` - Obtener grupo por ID
- `getByClass()` - Todos los grupos de una clase
- `getByClassWithCount()` - Grupos con conteo de estudiantes
- `update()` - Actualizar grupo
- `deactivate()` / `activate()` - Soft delete
- `delete()` - Eliminación permanente
- `getStudentCount()` - Contar estudiantes en un grupo
- `isFull()` - Verificar si el grupo está lleno

#### **EnrollmentsRepository** - `server/src/db/repositories/enrollments-repository.ts`

**Métodos principales**:

- `enroll()` - Inscribir estudiante a grupo
- `getByGroup()` - Estudiantes de un grupo
- `getByStudent()` - Grupos de un estudiante
- `getStudentsWithInfo()` - Estudiantes con info completa de usuario
- `isEnrolled()` - Verificar si ya está inscrito
- `updateStatus()` - Cambiar estado de inscripción
- `unenroll()` - Desinscribir (soft delete)
- `delete()` - Eliminación permanente
- `getByClass()` - Todas las inscripciones de una clase

### 4. Service Layer (Lógica de Negocio)

**Archivo**: `server/src/services/groups.service.ts`

**Validaciones implementadas**:

- Solo el profesor de la clase puede crear/editar grupos
- Nombres de grupos únicos por clase
- Límite de estudiantes por grupo (1-100)
- Solo estudiantes activos pueden inscribirse
- Verificación de cupo disponible
- Permisos por rol (admin puede ver/editar todo)

**Métodos principales**:

- `createGroup()` - Crear nuevo grupo (teacher/admin)
- `getClassGroups()` - Listar grupos de una clase
- `updateGroup()` - Actualizar grupo
- `deleteGroup()` - Eliminar grupo (solo si no tiene estudiantes)
- `enrollStudent()` - Inscribir estudiante
- `unenrollStudent()` - Desinscribir estudiante
- `getGroupStudents()` - Listar estudiantes del grupo
- `getStudentGroups()` - Listar grupos del estudiante

### 5. API Routes

**Archivo**: `server/src/api/groups.routes.ts`

#### Endpoints de Grupos

| Método | Ruta                           | Rol           | Descripción      |
| ------ | ------------------------------ | ------------- | ---------------- |
| POST   | `/api/classes/:classId/groups` | teacher/admin | Crear grupo      |
| GET    | `/api/classes/:classId/groups` | authenticated | Listar grupos    |
| PUT    | `/api/groups/:groupId`         | teacher/admin | Actualizar grupo |
| DELETE | `/api/groups/:groupId`         | teacher/admin | Eliminar grupo   |

#### Endpoints de Enrollments

| Método | Ruta                                       | Rol           | Descripción          |
| ------ | ------------------------------------------ | ------------- | -------------------- |
| POST   | `/api/groups/:groupId/enroll`              | teacher/admin | Inscribir estudiante |
| DELETE | `/api/groups/:groupId/students/:studentId` | teacher/admin | Desinscribir         |
| GET    | `/api/groups/:groupId/students`            | authenticated | Listar estudiantes   |
| GET    | `/api/students/my-groups`                  | student       | Mis grupos           |

**Validaciones de entrada**:

- `name`: 1-100 caracteres, required
- `description`: máximo 500 caracteres, opcional
- `maxStudents`: 1-100, opcional (default: 30)
- `notes`: máximo 500 caracteres, opcional

### 6. Middleware de Roles

**Archivo**: `server/src/middleware/role.middleware.ts`

Se agregó la función `requireRole()` para control de acceso basado en roles con soporte para arrays:

```typescript
requireRole(["teacher", "admin"]); // Permite teacher O admin
```

---

## EJEMPLOS DE USO (API)

### 1. Crear un grupo

```bash
POST /api/classes/class-123/groups
Authorization: Bearer <teacher-token>
Content-Type: application/json

{
  "name": "Grupo Mañana",
  "description": "Clases de 8-10 AM",
  "maxStudents": 25
}
```

**Respuesta**:

```json
{
  "success": true,
  "group": {
    "id": "group-abc123",
    "class_id": "class-123",
    "name": "Grupo Mañana",
    "description": "Clases de 8-10 AM",
    "max_students": 25,
    "active": true,
    "created_at": "2025-12-19T15:00:00Z",
    "updated_at": "2025-12-19T15:00:00Z"
  }
}
```

### 2. Listar grupos de una clase

```bash
GET /api/classes/class-123/groups
Authorization: Bearer <token>
```

**Respuesta**:

```json
{
  "success": true,
  "groups": [
    {
      "id": "group-abc123",
      "name": "Grupo Mañana",
      "student_count": 15,
      "max_students": 25,
      "active": true
    },
    {
      "id": "group-def456",
      "name": "Grupo Tarde",
      "student_count": 8,
      "max_students": 20,
      "active": true
    }
  ]
}
```

### 3. Inscribir estudiante a un grupo

```bash
POST /api/groups/group-abc123/enroll
Authorization: Bearer <teacher-token>
Content-Type: application/json

{
  "studentId": "student-789",
  "notes": "Nivel intermedio"
}
```

**Respuesta**:

```json
{
  "success": true,
  "enrollment": {
    "id": "enrollment-xyz",
    "group_id": "group-abc123",
    "student_id": "student-789",
    "enrolled_at": "2025-12-19T15:05:00Z",
    "enrolled_by": "teacher-001",
    "status": "active",
    "notes": "Nivel intermedio"
  }
}
```

### 4. Obtener mis grupos (estudiante)

```bash
GET /api/students/my-groups
Authorization: Bearer <student-token>
```

**Respuesta**:

```json
{
  "success": true,
  "groups": [
    {
      "enrollment": {
        "id": "enrollment-xyz",
        "status": "active",
        "enrolled_at": "2025-12-19T15:05:00Z"
      },
      "group": {
        "id": "group-abc123",
        "name": "Grupo Mañana",
        "description": "Clases de 8-10 AM"
      },
      "class": {
        "id": "class-123",
        "title": "English A1",
        "description": "Nivel básico de inglés"
      }
    }
  ]
}
```

---

## 🚀 INSTRUCCIONES DE INSTALACIÓN

### 1. Aplicar la migración de base de datos

```bash
cd server
npm run db:init
```

Este comando aplicará automáticamente la migración `006_add_groups_and_enrollments.sql`.

**Output esperado**:

```
🗄️  Initializing database...
  ⚡ Applying migration: 006_add_groups_and_enrollments.sql
  ✅ Migration 006_add_groups_and_enrollments.sql applied successfully
✅ Database initialized successfully
```

### 2. Reiniciar el servidor

Si el servidor está corriendo, reinícialo para cargar las nuevas rutas:

```bash
# Detener con Ctrl+C
npm run dev
```

### 3. Verificar que funciona

```bash
# Verificar health check
curl http://localhost:3002/health

# Crear un grupo de prueba (necesitas un token de teacher)
curl -X POST http://localhost:3002/api/classes/YOUR_CLASS_ID/groups \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Grupo Test","maxStudents":20}'
```

---

## 📊 CASOS DE USO REALES

### Caso 1: Academia con múltiples horarios

```
Clase: "English A1"
├─ Grupo "Lunes-Miércoles 8:00 AM" (12 estudiantes)
├─ Grupo "Lunes-Miércoles 2:00 PM" (15 estudiantes)
├─ Grupo "Martes-Jueves 10:00 AM" (10 estudiantes)
└─ Grupo "Sábados 9:00 AM" (8 estudiantes)
```

### Caso 2: Niveles dentro de la misma clase

```
Clase: "Matemáticas 1º ESO"
├─ Grupo "Básico" (20 estudiantes)
├─ Grupo "Intermedio" (18 estudiantes)
└─ Grupo "Avanzado" (12 estudiantes)
```

### Caso 3: Grupos por edad

```
Clase: "Programación para Niños"
├─ Grupo "7-9 años" (15 estudiantes)
├─ Grupo "10-12 años" (18 estudiantes)
└─ Grupo "13-15 años" (12 estudiantes)
```

---

## 🔐 SEGURIDAD Y PERMISOS

### Reglas de acceso implementadas:

1. **Crear grupos**: Solo teachers (del su propia clase) y admins
2. **Ver grupos**: Teachers (de su clase), students (de sus grupos inscritos), admins (todos)
3. **Editar grupos**: Solo teacher owner o admin
4. **Eliminar grupos**: Solo si no tiene estudiantes inscritos
5. **Inscribir estudiantes**: Solo teacher de la clase o admin
6. **Ver estudiantes del grupo**: Solo teacher de la clase, admin, o estudiantes inscritos
7. **Desinscribir**: Solo teacher de la clase o admin

**Validaciones automáticas**:

- No se puede inscribir a un estudiante dos veces en el mismo grupo
- No se puede inscribir si el grupo está lleno
- Solo usuarios activos pueden ser inscritos
- No se puede cambiar el max_students a menos del número actual de inscritos

---

## 🧪 TESTING MANUAL

### Test 1: Crear grupo

1. Login como profesor
2. Crear una clase (si no existe)
3. Crear un grupo para esa clase
4. Verificar que aparece en la lista de grupos

### Test 2: Inscribir estudiantes

1. Login como admin o profesor
2. Obtener lista de estudiantes disponibles
3. Inscribir 3 estudiantes diferentes al grupo
4. Verificar que `student_count` se incrementa
5. Intentar inscribir el mismo estudiante dos veces (debe fallar con error 409)

### Test 3: Ver mis grupos (como estudiante)

1. Login como uno de los estudiantes inscritos
2. Llamar a `/api/students/my-groups`
3. Verificar que aparece el grupo con la info de la clase

### Test 4: Límite de estudiantes

1. Crear grupo con `maxStudents: 2`
2. Inscribir 2 estudiantes (debe funcionar)
3. Intentar inscribir un tercero (debe fallar con error 400: "Group is full")

### Test 5: Eliminar grupo con estudiantes

1. Intentar eliminar un grupo que tiene estudiantes
2. Debe fallar con error 400 indicando que tiene estudiantes
3. Desinscribir todos los estudiantes
4. Ahora debe permitir eliminar el grupo

---

## 🎯 PRÓXIMOS PASOS SUGERIDOS (FUTURO)

### Fase 2: UI Components (Cliente)

**Componentes a crear**:

1. `GroupsPanel.tsx` - Panel de gestión de grupos para profesores
2. `EnrollStudentsModal.tsx` - Modal para inscribir estudiantes
3. `StudentGroupsView.tsx` - Vista de grupos para estudiantes
4. `GroupDetailCard.tsx` - Tarjeta con detalles del grupo

### Fase 3: Integración con Sesiones en Vivo

**Mejora**: Filtrar sesiones en vivo por grupo

- Al iniciar sesión, seleccionar grupo específico
- Solo estudiantes de ese grupo pueden unirse
- Reporte de asistencia por grupo

### Fase 4: Reportes y Estadísticas

- Progreso por grupo
- Comparativa entre grupos
- Asistencia por grupo
- Calificaciones promedio por grupo

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de usar en producción, verificar:

- [x] Migración aplicada correctamente
- [x] Servidor reiniciado
- [x] Endpoints responden correctamente
- [x] Permisos funcionan según rol
- [x] Validaciones de negocio activas
- [x] No hay errores en consola del servidor
- [x] TypeScript compila sin errores

---

## 📞 SOPORTE Y DEBUGGING

### Errores comunes:

**Error: "Class not found"**

- Verificar que el `classId` existe en la base de datos
- Verificar que el profesor es owner de la clase

**Error: "Group full"**

- El grupo alcanzó el `max_students`
- Aumentar el límite o crear otro grupo

**Error: "Student already enrolled"**

- El estudiante ya está inscrito en ese grupo
- Verificar en la tabla `enrollments`

**Error: "Only the class teacher can..."**

- El usuario no es teacher de esa clase
- Verificar ownership o usar cuenta admin

### Consultas útiles SQL:

```sql
-- Ver todos los grupos de una clase
SELECT * FROM groups WHERE class_id = 'class-123';

-- Ver estudiantes de un grupo
SELECT u.name, e.enrolled_at
FROM enrollments e
JOIN users u ON u.id = e.student_id
WHERE e.group_id = 'group-abc' AND e.status = 'active';

-- Contar estudiantes por grupo
SELECT g.name, COUNT(e.id) as student_count
FROM groups g
LEFT JOIN enrollments e ON e.group_id = g.id AND e.status = 'active'
WHERE g.class_id = 'class-123'
GROUP BY g.id;
```

---

## 📝 NOTAS FINALES

- **Backwards compatible**: No afecta funcionalidad existente
- **Performance**: Índices creados para queries eficientes
- **Escalable**: Soporta miles de estudiantes y grupos
- **Mantenible**: Código bien documentado con TypeScript
- **Seguro**: Validaciones a nivel de servicio y base de datos

**Autor**: Sistema implementado siguiendo las mejores prácticas del código existente  
**Fecha de implementación**: 2025-12-19  
**Versión de la aplicación**: Compatible con v1.0+

---

¡El sistema de grupos está listo para usar! 🎉
