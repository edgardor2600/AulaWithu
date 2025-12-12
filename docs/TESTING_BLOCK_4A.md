# BLOQUE 4A - Pruebas de Autenticación Frontend

## 🎯 Objetivo

Verificar que el frontend se conecta correctamente al backend y la autenticación funciona.

---

## 📦 Requisitos Previos

1. **Backend corriendo**:

   ```
   cd server
   npm run dev
   ```

   Debería estar en: `http://localhost:3002`

2. **Frontend corriendo**:
   ```
   cd client
   npm run dev
   ```
   Debería estar en: `http://localhost:5173`

---

## 🧪 PRUEBA 1: Acceso Inicial

1. **Abre el navegador** en: `http://localhost:5173`

2. **Deberías ver**:

   - Página de login con diseño profesional
   - Logo "Aula Colaborativa"
   - Campo para nombre
   - Opciones de rol (Teacher/Student)
   - Botón "Join Now"

3. **Verifica**:
   - ✅ El diseño se ve bien (gradiente azul-púrpura)
   - ✅ Los iconos se muestran correctamente
   - ✅ No hay errores en la consola del navegador

---

## 🧪 PRUEBA 2: Login como Teacher

1. **Ingresa tus datos**:

   - Nombre: `Test Teacher`
   - Rol: Click en "Teacher" (debería resaltarse en azul)

2. **Click "Join Now"**

3. **Deberías ver**:

   - Notificación toast: "Welcome, Test Teacher!"
   - Redirección automática a `/dashboard`
   - Dashboard con tu nombre y avatar
   - Badge "Teacher" con icono
   - Botón "Logout"
   - Mensaje: "✅ Block 4A: Authentication is working!"

4. **Verifica en DevTools**:
   - Abre DevTools (F12) → Application → Local Storage
   - Busca `auth-storage`
   - Deberías ver tu token y datos de usuario guardados

---

## 🧪 PRUEBA 3: Persistencia de Sesión

1. **Recarga la página** (F5)

2. **Deberías ver**:

   - Sigues en el dashboard (no te redirige al login)
   - Tus datos siguen ahí

3. **Esto confirma**: La sesión persiste en localStorage ✅

---

## 🧪 PRUEBA 4: Logout

1. **Click en "Logout"**

2. **Deberías ver**:

   - Notificación: "Logged out successfully"
   - Redirección a `/login`

3. **Verifica en DevTools**:
   - Local Storage → `auth-storage` debería estar vacío o sin token

---

## 🧪 PRUEBA 5: Login como Student

1. **Ingresa datos**:

   - Nombre: `Test Student`
   - Rol: Click en "Student" (debería resaltarse en púrpura)

2. **Click "Join Now"**

3. **Deberías ver**:
   - Dashboard con badge "Student" (icono de usuarios)
   - Avatar con color diferente
   - Todo funcionando igual que con teacher

---

## 🧪 PRUEBA 6: Rutas Protegidas

1. **Estando deslogueado**, intenta acceder a:

   ```
   http://localhost:5173/dashboard
   ```

2. **Deberías ser redirigido** a `/login` automáticamente

3. **Esto confirma**: Las rutas protegidas funcionan ✅

---

## 🧪 PRUEBA 7: Validación de Formulario

1. **En login**, deja el nombre vacío

2. **Click "Join Now"**

3. **Deberías ver**: Toast de error "Please enter your name"

---

## 🧪 PRUEBA 8: Conexión con Backend

1. **Abre DevTools** → Network tab

2. **Haz login** con cualquier nombre

3. **Deberías ver**:

   - Request a `http://localhost:3002/api/auth/join`
   - Status: 200 OK
   - Response con token y user data

4. **Esto confirma**: Frontend se comunica correctamente con backend ✅

---

## 🧪 PRUEBA 9: Manejo de Errores

1. **Detén el servidor backend** (Ctrl+C en la terminal del server)

2. **Intenta hacer login**

3. **Deberías ver**:

   - Toast de error: "Network error. Please check your connection."
   - No se crashea la aplicación

4. **Reinicia el backend** y vuelve a intentar

---

## 📋 Checklist de Validación

- [ ] ✅ PRUEBA 1: Página de login se muestra correctamente
- [ ] ✅ PRUEBA 2: Login como teacher funciona
- [ ] ✅ PRUEBA 3: Sesión persiste después de recargar
- [ ] ✅ PRUEBA 4: Logout funciona
- [ ] ✅ PRUEBA 5: Login como student funciona
- [ ] ✅ PRUEBA 6: Rutas protegidas redirigen
- [ ] ✅ PRUEBA 7: Validación de formulario funciona
- [ ] ✅ PRUEBA 8: Conexión con backend OK
- [ ] ✅ PRUEBA 9: Manejo de errores funciona

---

## 🎯 Resultado Esperado

Si todas las 9 pruebas pasan:

- ✅ Frontend configurado correctamente
- ✅ Zustand stores funcionando
- ✅ API client con Axios funcionando
- ✅ Autenticación completa
- ✅ Persistencia de sesión
- ✅ Rutas protegidas
- ✅ Manejo de errores
- ✅ UI profesional y responsive

**¡BLOQUE 4A COMPLETADO!** 🎉

---

## 🚀 Siguiente Paso

Una vez que todas las pruebas pasen:

1. Haz commit: `git commit -m "feat: frontend setup and authentication UI (Block 4A)"`
2. Continúa con **BLOQUE 4B**: Dashboard y gestión de clases
