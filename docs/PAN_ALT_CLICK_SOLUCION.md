# Problema: Alt + Click para Pan

## 🔴 PROBLEMAS ACTUALES:

### 1. Selection Box Azul

- Cuando haces Alt + Click en Select mode, aparece rectángulo azul
- Esto es el "selection box" de Fabric.js

### 2. Lápiz se Queda Dibujando

- Cuando usas Lápiz + Alt + Click, se desactiva `isDrawingMode`
- Pero al soltar, no se reactiva correctamente
- Resultado: se queda "dibujando fantasma"

### 3. Código No Se Actualiza

- El dev server no está recargando el código nuevo
- Los logs muestran líneas de código antiguas

## 💡 SOLUCIÓN SIMPLE PROPUESTA:

En lugar de intentar prevenir eventos con listeners nativos complicados, usar la propiedad `canvas.selection` de forma más inteligente:

```typescript
// En handleMouseDown del useEffect de pan:
if (shouldPan) {
  isPanning = true;

  // Guardar estado original
  const originalSelection = canvas.selection;
  const originalDrawingMode = canvas.isDrawingMode;

  // Desactivar TODO
  canvas.selection = false;
  canvas.isDrawingMode = false;
  canvas.skipTargetFind = true;

  // En handleMouseUp, RESTAURAR estado original
  const restoreCanvas = () => {
    canvas.selection = originalSelection;
    canvas.isDrawingMode = originalDrawingMode;
    canvas.skipTargetFind = false;
  };
}
```

## 🎯 ALTERNATIVA MÁS RADICAL:

Deshabilitar completamente Alt + Click y usar SOLO:

- **Espacio + Click** (ya funciona)
- **Hand Tool** (ya funciona)
- **Middle Click** (ya funciona)

Esto eliminaría toda la complejidad y los bugs.

## ❓ DECISIÓN NECESARIA:

¿Prefieres que:

1. **Arregle Alt + Click** (complejo, puede tener más bugs)
2. **Elimine Alt + Click** y use solo Espacio (simple, sin bugs)
