# BLOQUE 4C - Pruebas del Editor de Canvas

## 🎯 Objetivo

Verificar que el editor de canvas funciona correctamente con todas las herramientas de dibujo y gestión de slides.

---

## 📦 Requisitos Previos

1. **Backend corriendo**: `http://localhost:3002`
2. **Frontend corriendo**: `http://localhost:5174`
3. **Estar logueado** como Teacher
4. **Tener al menos una clase creada**

---

## 🧪 PRUEBA 1: Acceder al Editor

1. **Ve al Dashboard**

2. **Click en "View"** en una de tus clases

3. **Deberías ver** el botón "Edit Slides" en la esquina superior derecha

4. **Click en "Edit Slides"**

5. **Deberías ver**:
   - Header con nombre de la clase
   - Navegación de slides (Slide 1/1)
   - Botón "New Slide"
   - Sidebar izquierdo con miniaturas de slides
   - Toolbar con herramientas de dibujo
   - Canvas blanco grande en el centro

---

## 🧪 PRUEBA 2: Herramientas de Dibujo - Lápiz

1. **Click en el icono de lápiz** (Pencil) en el toolbar

2. **Dibuja libremente** en el canvas arrastrando el mouse

3. **Deberías ver**: Líneas negras siguiendo tu cursor

4. **Cambia el color** clickeando en un color diferente (ej: rojo)

5. **Dibuja de nuevo**

6. **Deberías ver**: Líneas del nuevo color

7. **Ajusta el grosor** con el slider "Width"

8. **Dibuja de nuevo**

9. **Deberías ver**: Líneas más gruesas o delgadas

---

## 🧪 PRUEBA 3: Formas - Rectángulo

1. **Click en el icono de cuadrado** (Rectangle)

2. **Click y arrastra** en el canvas

3. **Deberías ver**: Un rectángulo que crece mientras arrastras

4. **Suelta el mouse**

5. **Deberías ver**: Rectángulo con borde del color seleccionado

---

## 🧪 PRUEBA 4: Formas - Círculo

1. **Click en el icono de círculo** (Circle)

2. **Click y arrastra** en el canvas

3. **Deberías ver**: Un círculo que crece desde el punto inicial

4. **Suelta el mouse**

5. **Deberías ver**: Círculo con borde del color seleccionado

---

## 🧪 PRUEBA 5: Formas - Línea

1. **Click en el icono de línea** (Minus)

2. **Click y arrastra** en el canvas

3. **Deberías ver**: Una línea recta desde el punto inicial hasta el cursor

4. **Suelta el mouse**

5. **Deberías ver**: Línea del color y grosor seleccionado

---

## 🧪 PRUEBA 6: Texto

1. **Click en el icono de texto** (Type)

2. **Deberías ver**: Aparece un texto "Click to edit" en el canvas

3. **Escribe algo** (ej: "Hello World")

4. **Click fuera del texto**

5. **Deberías ver**: Tu texto en el canvas

6. **Click en "Select"** (MousePointer)

7. **Click en el texto**

8. **Deberías poder**: Moverlo, redimensionarlo, rotarlo

---

## 🧪 PRUEBA 7: Borrador

1. **Dibuja varias líneas** con el lápiz

2. **Click en el icono de borrador** (Eraser)

3. **Arrastra sobre las líneas**

4. **Deberías ver**: Las líneas se borran (se pintan de blanco)

---

## 🧪 PRUEBA 8: Selección y Transformación

1. **Dibuja un rectángulo**

2. **Click en "Select"** (MousePointer)

3. **Click en el rectángulo**

4. **Deberías ver**: Controles de transformación alrededor

5. **Arrastra el rectángulo** - Se mueve

6. **Arrastra una esquina** - Se redimensiona

7. **Arrastra el icono de rotación** - Rota

---

## 🧪 PRUEBA 9: Guardar Slide

1. **Dibuja algo** en el canvas

2. **Click en "Save"**

3. **Deberías ver**: Toast "Slide saved successfully!"

4. **Recarga la página** (F5)

5. **Deberías ver**: Tu dibujo sigue ahí (se guardó)

---

## 🧪 PRUEBA 10: Limpiar Canvas

1. **Dibuja varias cosas** en el canvas

2. **Click en "Clear"**

3. **Deberías ver**: Confirmación "Are you sure...?"

4. **Click "OK"**

5. **Deberías ver**:
   - Canvas completamente blanco
   - Toast "Canvas cleared"

---

## 🧪 PRUEBA 11: Descargar Imagen

1. **Dibuja algo** en el canvas

2. **Click en "Download"**

3. **Deberías ver**:
   - Se descarga un archivo PNG
   - Toast "Image downloaded!"
   - El archivo contiene tu dibujo

---

## 🧪 PRUEBA 12: Crear Nuevo Slide

1. **Click en "New Slide"**

2. **Deberías ver**:
   - Toast "Slide created!"
   - Navegación cambia a "Slide 2/2"
   - Nuevo slide en blanco
   - Nueva miniatura en el sidebar

---

## 🧪 PRUEBA 13: Navegar Entre Slides

1. **Crea 3 slides** (deberías tener Slide 1, 2, 3)

2. **Dibuja algo diferente** en cada slide

3. **Usa las flechas** (ChevronLeft/Right) para navegar

4. **Deberías ver**: Cada slide con su dibujo correspondiente

5. **Click en una miniatura** del sidebar

6. **Deberías ver**: Saltas a ese slide

---

## 🧪 PRUEBA 14: Eliminar Slide

1. **Crea 2 slides**

2. **Hover sobre una miniatura** en el sidebar

3. **Deberías ver**: Botón rojo de basura aparece

4. **Click en el botón de basura**

5. **Deberías ver**: Confirmación

6. **Click "OK"**

7. **Deberías ver**:
   - Toast "Slide deleted"
   - El slide desaparece
   - Navegación se actualiza

---

## 🧪 PRUEBA 15: Paleta de Colores

1. **Prueba todos los colores** disponibles

2. **Deberías ver**: 10 colores diferentes:

   - Negro, Blanco, Rojo, Verde, Azul
   - Amarillo, Magenta, Cyan, Naranja, Púrpura

3. **Dibuja con cada color**

4. **Deberías ver**: Cada color funciona correctamente

---

## 🧪 PRUEBA 16: Responsive del Toolbar

1. **Reduce el tamaño de la ventana**

2. **Deberías ver**: El toolbar se adapta (wrap)

3. **Todas las herramientas** siguen accesibles

---

## 🧪 PRUEBA 17: Volver al Dashboard

1. **Click en "Back"** en el header

2. **Deberías volver** a la vista de detalle de la clase

3. **Deberías ver**: El número de slides actualizado

---

## 🧪 PRUEBA 18: Persistencia Completa

1. **Crea 3 slides** con diferentes dibujos

2. **Guarda cada uno**

3. **Cierra el navegador completamente**

4. **Abre de nuevo** y ve al editor

5. **Deberías ver**: Todos los slides con sus dibujos intactos

---

## 📋 Checklist de Validación

- [ ] ✅ PRUEBA 1: Acceso al editor
- [ ] ✅ PRUEBA 2: Lápiz funciona
- [ ] ✅ PRUEBA 3: Rectángulo funciona
- [ ] ✅ PRUEBA 4: Círculo funciona
- [ ] ✅ PRUEBA 5: Línea funciona
- [ ] ✅ PRUEBA 6: Texto funciona
- [ ] ✅ PRUEBA 7: Borrador funciona
- [ ] ✅ PRUEBA 8: Selección y transformación
- [ ] ✅ PRUEBA 9: Guardar slide
- [ ] ✅ PRUEBA 10: Limpiar canvas
- [ ] ✅ PRUEBA 11: Descargar imagen
- [ ] ✅ PRUEBA 12: Crear nuevo slide
- [ ] ✅ PRUEBA 13: Navegar entre slides
- [ ] ✅ PRUEBA 14: Eliminar slide
- [ ] ✅ PRUEBA 15: Paleta de colores
- [ ] ✅ PRUEBA 16: Responsive toolbar
- [ ] ✅ PRUEBA 17: Volver al dashboard
- [ ] ✅ PRUEBA 18: Persistencia completa

---

## 🎯 Resultado Esperado

Si todas las 18 pruebas pasan:

- ✅ Editor de canvas profesional funcionando
- ✅ 7 herramientas de dibujo completas
- ✅ Gestión de slides (crear, navegar, eliminar)
- ✅ Guardar y cargar automático
- ✅ Descargar imágenes
- ✅ Selección y transformación de objetos
- ✅ Paleta de colores completa
- ✅ UI intuitiva y profesional
- ✅ Persistencia perfecta

**¡BLOQUE 4C COMPLETADO!** 🎉

---

## 🚀 Siguiente Paso

Una vez que todas las pruebas pasen:

1. Haz commit: `git commit -m "feat: canvas editor with Fabric.js (Block 4C)"`
2. Continúa con **BLOQUE 4D**: Live Sessions con Yjs

---

## 💡 Tips para el Profesor

El editor está diseñado para ser intuitivo:

- **Lápiz**: Para escribir y dibujar libre
- **Formas**: Para diagramas y esquemas
- **Texto**: Para títulos y explicaciones
- **Borrador**: Para corregir errores
- **Selección**: Para mover y ajustar elementos
- **Guardar**: Automático, pero manual también disponible
- **Slides**: Organiza tu clase en múltiples páginas

¡Todo lo que necesitas para dar una clase interactiva! 🎨📚
