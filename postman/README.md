# Postman Collections - Aula Colaborativa

## 📦 Importar Colección y Environment

### Opción 1: Importar Archivos (Recomendado)

1. **Abre Postman**

2. **Importar Colección**:

   - Click en "Import" (botón en la esquina superior izquierda)
   - Click en "Upload Files"
   - Selecciona: `postman/Block_3A_Tests.postman_collection.json`
   - Click "Import"

3. **Importar Environment**:

   - Click en "Import" nuevamente
   - Click en "Upload Files"
   - Selecciona: `postman/Aula_Dev.postman_environment.json`
   - Click "Import"

4. **Activar Environment**:

   - En la esquina superior derecha, busca el dropdown de "Environments"
   - Selecciona "Aula Dev"

5. **¡Listo!** Ahora puedes ejecutar las pruebas

---

### Opción 2: Configuración Manual

Si prefieres configurar manualmente, sigue la guía en:
`docs/TESTING_BLOCK_3A.md`

---

## 🧪 Ejecutar las Pruebas

### Orden Recomendado:

1. **Auth** (carpeta):

   - 1. Join as Teacher → Guarda el token en `teacher_token`
   - 2. Join as Student → Guarda el token en `student_token`
   - 3. Get Me

2. **Protected Endpoints** (carpeta):

   - 4. Protected Endpoint
   - 5. Teacher Only (with teacher token)
   - 6. Teacher Only (with student token) - DEBE FALLAR
   - 7. Student Only (with student token)

3. **Error Cases** (carpeta):
   - 8. Validation Error
   - 9. No Token
   - 10. Invalid Token

---

## 💡 Tips

### Guardar Tokens Automáticamente

Después de ejecutar "1. Join as Teacher", en la pestaña "Tests" puedes agregar:

```javascript
// Guardar token automáticamente
if (pm.response.code === 200) {
  const response = pm.response.json();
  pm.environment.set("teacher_token", response.token);
}
```

Haz lo mismo para "2. Join as Student" con `student_token`.

---

## 📋 Checklist

- [ ] Colección importada
- [ ] Environment importado y activado
- [ ] Servidor corriendo en `http://localhost:3002`
- [ ] Las 10 pruebas ejecutadas exitosamente

---

## 🚀 Siguiente Paso

Una vez que todas las pruebas pasen, procede con el commit y el Bloque 3B.
