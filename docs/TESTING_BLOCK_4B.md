# BLOQUE 4B - Pruebas de Dashboard y Gestión de Clases

## 🎯 Objetivo

Verificar que el dashboard funciona correctamente y que se pueden crear, editar, ver y eliminar clases.

---

## 📦 Requisitos Previos

1. **Backend corriendo**: `http://localhost:3002`
2. **Frontend corriendo**: `http://localhost:5174`
3. **Estar logueado** como Teacher o Student

---

## 🧪 PRUEBA 1: Dashboard con Layout

1. **Inicia sesión** como Teacher

2. **Deberías ver**:

   - Sidebar a la izquierda con:
     - Logo "Aula"
     - Botón de colapsar sidebar
     - Navegación (Dashboard, Classes)
     - Tu avatar y nombre
     - Botón "Logout"
   - Contenido principal con "My Classes"
   - Botón "Create New Class"

3. **Prueba el sidebar**:
   - Click en el botón de colapsar (X)
   - El sidebar debería reducirse mostrando solo iconos
   - Click de nuevo para expandir

---

## 🧪 PRUEBA 2: Crear Primera Clase (Teacher)

1. **Click en "Create New Class"**

2. **Deberías ver** un modal con:

   - Título "Create New Class"
   - Campo "Class Title"
   - Campo "Description"
   - Botones "Cancel" y "Create Class"

3. **Completa el formulario**:

   - Title: `English Level A1 - Unit 1`
   - Description: `Introduction to basic greetings and vocabulary`

4. **Click "Create Class"**

5. **Deberías ver**:
   - Toast: "Class created successfully!"
   - Modal se cierra
   - La nueva clase aparece en el grid
   - Card con:
     - Gradiente azul-púrpura
     - Título de la clase
     - Descripción
     - Botones: View, Edit (lápiz), Delete (basura)

---

## 🧪 PRUEBA 3: Crear Más Clases

Repite la PRUEBA 2 con estos datos:

**Clase 2:**

- Title: `Mathematics - Algebra Basics`
- Description: `Learn fundamental algebraic concepts`

**Clase 3:**

- Title: `History - World War II`
- Description: `Study the major events of WWII`

**Deberías tener**: 3 clases en total en el grid

---

## 🧪 PRUEBA 4: Ver Detalle de Clase

1. **Click en "View"** en cualquier clase

2. **Deberías ver**:

   - Botón "Back to Dashboard"
   - Header con:
     - Icono de libro
     - Título de la clase
     - Descripción
     - Nombre del profesor
     - Número de slides (0)
   - Sección "Slides" con mensaje "No slides yet"
   - Aviso: "📝 Slide editor coming in Block 4C!"

3. **Click "Back to Dashboard"**
   - Deberías volver al dashboard

---

## 🧪 PRUEBA 5: Editar Clase

1. **Click en el botón de editar** (lápiz) en una clase

2. **Deberías ver** modal con:

   - Título "Edit Class"
   - Campos pre-llenados con los datos actuales

3. **Modifica los datos**:

   - Title: Agrega " (Updated)" al final
   - Description: Cambia el texto

4. **Click "Save Changes"**

5. **Deberías ver**:
   - Toast: "Class updated successfully!"
   - La clase se actualiza en el grid con los nuevos datos

---

## 🧪 PRUEBA 6: Validación de Formulario

1. **Click "Create New Class"**

2. **Deja el título vacío** y click "Create Class"

3. **Deberías ver**: El navegador muestra validación HTML5 "Please fill out this field"

4. **Escribe solo 2 caracteres** en el título

5. **Deberías ver**: Validación indicando mínimo 3 caracteres

---

## 🧪 PRUEBA 7: Eliminar Clase

1. **Click en el botón de eliminar** (basura) en una clase

2. **Deberías ver**: Confirmación del navegador

   ```
   Are you sure you want to delete "..."? This will also delete all slides.
   ```

3. **Click "Cancel"** - No pasa nada

4. **Click eliminar de nuevo** y **Click "OK"**

5. **Deberías ver**:
   - Toast: "Class deleted successfully"
   - La clase desaparece del grid

---

## 🧪 PRUEBA 8: Dashboard Vacío (Teacher)

1. **Elimina todas las clases** que creaste

2. **Deberías ver**:
   - Mensaje "No classes yet"
   - "Create your first class to get started"
   - Botón "Create Class"

---

## 🧪 PRUEBA 9: Vista de Student

1. **Logout** y **Login como Student**

2. **Deberías ver**:

   - Título "Available Classes" (no "My Classes")
   - **NO hay botón** "Create New Class"
   - Las clases que existen (creadas por teachers)
   - En cada clase solo botón "View" (sin Edit/Delete)

3. **Click "View"** en una clase

4. **Deberías poder** ver los detalles pero **no editar**

---

## 🧪 PRUEBA 10: Navegación

1. **En el sidebar**, click en "Dashboard"

   - Deberías ir a `/dashboard`

2. **Click en "Classes"**

   - Deberías ir a `/dashboard` también (por ahora)

3. **En la URL**, escribe manualmente `/classes/class-001`
   - Deberías ver el detalle de esa clase

---

## 🧪 PRUEBA 11: Responsive Design

1. **Reduce el tamaño de la ventana** del navegador

2. **Deberías ver**:
   - El grid de clases se adapta (3 columnas → 2 → 1)
   - El sidebar sigue funcionando
   - Todo se ve bien en móvil

---

## 🧪 PRUEBA 12: Persistencia

1. **Recarga la página** (F5)

2. **Deberías ver**:
   - Sigues logueado
   - Las clases siguen ahí
   - Todo funciona igual

---

## 📋 Checklist de Validación

- [ ] ✅ PRUEBA 1: Dashboard con layout profesional
- [ ] ✅ PRUEBA 2: Crear clase funciona
- [ ] ✅ PRUEBA 3: Crear múltiples clases
- [ ] ✅ PRUEBA 4: Ver detalle de clase
- [ ] ✅ PRUEBA 5: Editar clase funciona
- [ ] ✅ PRUEBA 6: Validación de formulario
- [ ] ✅ PRUEBA 7: Eliminar clase funciona
- [ ] ✅ PRUEBA 8: Dashboard vacío se muestra bien
- [ ] ✅ PRUEBA 9: Vista de student correcta
- [ ] ✅ PRUEBA 10: Navegación funciona
- [ ] ✅ PRUEBA 11: Responsive design
- [ ] ✅ PRUEBA 12: Persistencia funciona

---

## 🎯 Resultado Esperado

Si todas las 12 pruebas pasan:

- ✅ Dashboard profesional funcionando
- ✅ Layout con sidebar colapsable
- ✅ CRUD completo de clases
- ✅ Validaciones funcionando
- ✅ Permisos por rol (teacher/student)
- ✅ Navegación fluida
- ✅ UI responsive
- ✅ Integración con backend perfecta

**¡BLOQUE 4B COMPLETADO!** 🎉

---

## 🚀 Siguiente Paso

Una vez que todas las pruebas pasen:

1. Haz commit: `git commit -m "feat: dashboard and classes management UI (Block 4B)"`
2. Continúa con **BLOQUE 4C**: Canvas Editor con Fabric.js
