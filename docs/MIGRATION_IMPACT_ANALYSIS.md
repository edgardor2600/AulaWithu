# 🔍 ANÁLISIS DE IMPACTO - MIGRACIÓN A AUTENTICACIÓN SEGURA

**Fecha:** 17 Diciembre 2025  
**Objetivo:** Migrar de autenticación simple (nombre+rol) a autenticación segura (username+password) **SIN ROMPER** el sistema actual

---

## 📊 ESTADO ACTUAL DEL SISTEMA

### **✅ Lo que YA FUNCIONA (NO TOCAR):**

1. **Canvas Colaborativo**

   - ✅ Fabric.js + Yjs sincronización
   - ✅ Toolbar compacto
   - ✅ Zoom & Pan
   - ✅ Mini-mapa Navigator
   - ✅ Undo/Redo
   - ✅ 8 herramientas de dibujo

2. **Sesiones en Vivo**

   - ✅ WebSocket Yjs en puerto 1234
   - ✅ Awareness de participantes
   - ✅ Permisos (profesor/estudiante)
   - ✅ Viewport sync

3. **Base de Datos**

   - ✅ SQLite con 8 tablas
   - ✅ Migraciones versionadas
   - ✅ Seed data de prueba
   - ✅ Repositories pattern

4. **API REST**
   - ✅ Auth endpoints (`/api/auth/join`, `/api/auth/me`)
   - ✅ Classes endpoints
   - ✅ Slides endpoints
   - ✅ Sessions endpoints
   - ✅ JWT tokens

---

## ⚠️ PUNTOS DE RIESGO (Qué se podría romper)

### **RIESGO ALTO:**

#### **1. Tabla `users` - Cambio de estructura**

**Estado actual:**

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,              -- ⚠️ Usado para login
  role TEXT NOT NULL,
  avatar_color TEXT,
  created_at DATETIME
);
```

**Cambios propuestos:**

```sql
ALTER TABLE users ADD COLUMN username TEXT UNIQUE;      -- NUEVO
ALTER TABLE users ADD COLUMN password_hash TEXT;        -- NUEVO
ALTER TABLE users ADD COLUMN institution_id TEXT;       -- NUEVO
ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT 1;  -- NUEVO
ALTER TABLE users ADD COLUMN last_login DATETIME;       -- NUEVO
```

**⚠️ IMPACTO:**

- ❌ `UsersRepository.getByName()` - Ya no funcionará para login
- ❌ `AuthService.join()` - Necesita cambiar lógica
- ❌ Usuarios existentes en DB - No tienen username/password

**✅ SOLUCIÓN:**

- ✅ Mantener `name` como está (no rompe nada)
- ✅ Agregar columnas nuevas como **NULLABLE** inicialmente
- ✅ Migrar usuarios existentes con script
- ✅ Crear nuevos métodos SIN borrar los viejos

---

#### **2. AuthService - Lógica de login**

**Estado actual:**

```typescript
// server/src/services/auth.service.ts
static async join(data: { name: string; role: 'teacher' | 'student' }) {
  let user = UsersRepository.getByName(data.name.trim());

  if (user) {
    if (user.role !== data.role) {
      throw new ConflictError(`User ${data.name} already exists with role ${user.role}`);
    }
  } else {
    user = UsersRepository.create({
      name: data.name.trim(),
      role: data.role,
    });
  }

  const token = generateToken({ userId: user.id, role: user.role });
  return { user, token };
}
```

**⚠️ IMPACTO:**

- ❌ LoginPage.tsx llama a `authService.join({ name, role })`
- ❌ Si cambiamos la firma, se rompe el frontend

**✅ SOLUCIÓN:**

- ✅ **NO borrar** `join()` - mantenerlo para compatibilidad
- ✅ **Agregar** nuevos métodos: `login()`, `register()`
- ✅ Migración gradual del frontend

---

#### **3. Frontend - LoginPage**

**Estado actual:**

```typescript
// client/src/pages/LoginPage.tsx
const handleSubmit = async (e: React.FormEvent) => {
  const response = await authService.join({ name: name.trim(), role });
  setAuth(response.user, response.token);
  navigate("/dashboard");
};
```

**⚠️ IMPACTO:**

- ❌ Si cambiamos `authService.join()`, se rompe
- ❌ UI actual solo tiene campo de nombre

**✅ SOLUCIÓN:**

- ✅ Crear **nueva** página `LoginPageV2.tsx`
- ✅ Mantener `LoginPage.tsx` como fallback
- ✅ Feature flag para cambiar entre versiones

---

## 🛡️ ESTRATEGIA DE MIGRACIÓN SEGURA

### **FASE 0: Backup y Preparación (15 minutos)**

```bash
# 1. Backup de base de datos
cp database/aula.db database/backups/aula-pre-migration-$(date +%Y%m%d).db

# 2. Crear rama de Git
git checkout -b feat/secure-authentication
git add .
git commit -m "checkpoint: antes de migración de auth"

# 3. Verificar que todo funciona
npm run dev --prefix server
npm run dev --prefix client
# Probar login actual, crear sesión, dibujar en canvas
```

**✅ CHECKPOINT:** Si algo sale mal, puedes volver aquí

---

### **FASE 1: Extender Base de Datos (SIN ROMPER NADA)**

**Objetivo:** Agregar columnas nuevas sin afectar funcionalidad existente

```sql
-- database/migrations/003_add_auth_fields.sql

-- Agregar columnas NULLABLE (no rompe datos existentes)
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN institution_id TEXT DEFAULT 'academia-001';
ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN last_login DATETIME;

-- Crear índice para username (preparar para UNIQUE después)
CREATE INDEX idx_users_username ON users(username);

-- Tabla de instituciones (nueva, no afecta nada)
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar institución por defecto
INSERT INTO institutions (id, name, contact_email)
VALUES ('academia-001', 'Academia de Inglés', 'contacto@academia.com');
```

**✅ VALIDACIÓN:**

```bash
# Ejecutar migración
npm run db:migrate --prefix server

# Verificar que no se rompió nada
sqlite3 database/aula.db "SELECT * FROM users LIMIT 1;"
# Debe mostrar usuarios existentes con nuevas columnas en NULL

# Probar login actual - DEBE SEGUIR FUNCIONANDO
# Abrir http://localhost:5173
# Login con "Prof. García" + role "teacher"
# Debe funcionar igual que antes
```

**⚠️ SI ALGO FALLA:**

```bash
# Restaurar backup
rm database/aula.db
cp database/backups/aula-pre-migration-*.db database/aula.db
npm run dev --prefix server
```

---

### **FASE 2: Extender Repositories (AGREGAR, NO REEMPLAZAR)**

**Objetivo:** Agregar nuevos métodos sin tocar los existentes

```typescript
// server/src/db/repositories/users-repository.ts

export class UsersRepository {
  // ✅ MANTENER MÉTODOS EXISTENTES (NO TOCAR)
  static create(data: {
    name: string;
    role: "teacher" | "student";
    avatar_color?: string;
  }): User {
    // ... código actual sin cambios
  }

  static getById(id: string): User | undefined {
    // ... código actual sin cambios
  }

  static getByName(name: string): User | undefined {
    // ... código actual sin cambios
  }

  // ✅ AGREGAR NUEVOS MÉTODOS (COMPATIBLES)

  // Crear usuario con autenticación
  static createWithAuth(data: {
    name: string;
    username: string;
    password_hash: string;
    role: "teacher" | "student";
    institution_id?: string;
  }): User {
    const id = generateId();
    const avatar_color = this.generateRandomColor();
    const institution_id = data.institution_id || "academia-001";

    runQuery(
      `INSERT INTO users (id, name, username, password_hash, role, institution_id, avatar_color, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        data.name,
        data.username,
        data.password_hash,
        data.role,
        institution_id,
        avatar_color,
      ]
    );

    return this.getById(id)!;
  }

  // Buscar por username
  static getByUsername(username: string): User | undefined {
    return getOne<User>(
      `SELECT * FROM users WHERE username = ? AND active = 1`,
      [username]
    );
  }

  // Actualizar contraseña
  static updatePassword(id: string, password_hash: string): void {
    runQuery(`UPDATE users SET password_hash = ? WHERE id = ?`, [
      password_hash,
      id,
    ]);
  }

  // Actualizar último login
  static updateLastLogin(id: string): void {
    runQuery(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [
      id,
    ]);
  }

  // Migrar usuario existente a nuevo sistema
  static migrateToAuth(
    id: string,
    username: string,
    password_hash: string
  ): User | undefined {
    runQuery(`UPDATE users SET username = ?, password_hash = ? WHERE id = ?`, [
      username,
      password_hash,
      id,
    ]);
    return this.getById(id);
  }
}
```

**✅ VALIDACIÓN:**

```typescript
// Probar en consola de Node
import { UsersRepository } from "./repositories/users-repository";

// Método viejo - debe seguir funcionando
const oldUser = UsersRepository.getByName("Prof. García");
console.log("Old method works:", oldUser);

// Método nuevo - debe funcionar también
const newUser = UsersRepository.createWithAuth({
  name: "Test User",
  username: "test.user",
  password_hash: "$2b$10$...",
  role: "student",
});
console.log("New method works:", newUser);
```

---

### **FASE 3: Extender AuthService (DUAL MODE)**

**Objetivo:** Soportar AMBOS sistemas de autenticación simultáneamente

```typescript
// server/src/services/auth.service.ts

export class AuthService {
  // ✅ MANTENER MÉTODO EXISTENTE (LEGACY)
  static async join(data: {
    name: string;
    role: "teacher" | "student";
  }): Promise<{ user: User; token: string }> {
    // ... código actual SIN CAMBIOS
    // Este método sigue funcionando para usuarios sin username/password
  }

  // ✅ NUEVOS MÉTODOS (V2)

  // Registro de profesor
  static async registerTeacher(data: {
    name: string;
    username: string;
    password: string;
    institution_id?: string;
  }): Promise<{ user: User; token: string }> {
    // Validar username único
    const existing = UsersRepository.getByUsername(data.username);
    if (existing) {
      throw new ConflictError("Username already exists");
    }

    // Hash password
    const password_hash = await hashPassword(data.password);

    // Crear usuario
    const user = UsersRepository.createWithAuth({
      name: data.name,
      username: data.username,
      password_hash,
      role: "teacher",
      institution_id: data.institution_id,
    });

    // Generar token
    const token = generateToken({ userId: user.id, role: user.role });

    return { user, token };
  }

  // Registro de estudiante
  static async registerStudent(data: {
    name: string;
    username: string;
    password: string;
    institution_id?: string;
  }): Promise<{ user: User; token: string }> {
    const existing = UsersRepository.getByUsername(data.username);
    if (existing) {
      throw new ConflictError("Username already exists");
    }

    const password_hash = await hashPassword(data.password);

    const user = UsersRepository.createWithAuth({
      name: data.name,
      username: data.username,
      password_hash,
      role: "student",
      institution_id: data.institution_id,
    });

    const token = generateToken({ userId: user.id, role: user.role });

    return { user, token };
  }

  // Login unificado
  static async login(data: {
    username: string;
    password: string;
  }): Promise<{ user: User; token: string }> {
    // Buscar usuario
    const user = UsersRepository.getByUsername(data.username);
    if (!user) {
      throw new ValidationError("Invalid credentials");
    }

    // Verificar contraseña
    if (!user.password_hash) {
      throw new ValidationError("User needs to set password first");
    }

    const isValid = await comparePassword(data.password, user.password_hash);
    if (!isValid) {
      throw new ValidationError("Invalid credentials");
    }

    // Actualizar último login
    UsersRepository.updateLastLogin(user.id);

    // Generar token
    const token = generateToken({ userId: user.id, role: user.role });

    return { user, token };
  }

  // Cambiar contraseña
  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = UsersRepository.getById(userId);
    if (!user) {
      throw new ValidationError("User not found");
    }

    if (user.password_hash) {
      const isValid = await comparePassword(oldPassword, user.password_hash);
      if (!isValid) {
        throw new ValidationError("Invalid current password");
      }
    }

    const new_hash = await hashPassword(newPassword);
    UsersRepository.updatePassword(userId, new_hash);
  }

  // ✅ MÉTODO DE MIGRACIÓN (para usuarios existentes)
  static async migrateUserToAuth(
    userId: string,
    username: string,
    password: string
  ): Promise<User> {
    const existing = UsersRepository.getByUsername(username);
    if (existing && existing.id !== userId) {
      throw new ConflictError("Username already taken");
    }

    const password_hash = await hashPassword(password);
    const user = UsersRepository.migrateToAuth(userId, username, password_hash);

    if (!user) {
      throw new ValidationError("User not found");
    }

    return user;
  }
}
```

**✅ VALIDACIÓN:**

```bash
# Probar endpoint viejo - debe seguir funcionando
curl -X POST http://localhost:3002/api/auth/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Teacher", "role": "teacher"}'

# Debe retornar token y usuario (método legacy)
```

---

### **FASE 4: Agregar Nuevos Endpoints (SIN ROMPER VIEJOS)**

```typescript
// server/src/api/auth.routes.ts

const router = Router();

// ✅ MANTENER ENDPOINT EXISTENTE (LEGACY)
router.post(
  "/join",
  [body("name").trim().notEmpty(), body("role").isIn(["teacher", "student"])],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { name, role } = req.body;
    const result = await AuthService.join({ name, role });

    res.status(200).json({
      success: true,
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        role: result.user.role,
        avatar_color: result.user.avatar_color,
        created_at: result.user.created_at,
      },
    });
  })
);

// ✅ NUEVOS ENDPOINTS (V2)

// POST /api/auth/register/teacher
router.post(
  "/register/teacher",
  [
    body("name").trim().notEmpty(),
    body("username").trim().isLength({ min: 3, max: 20 }),
    body("password").isLength({ min: 6 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const result = await AuthService.registerTeacher(req.body);

    res.status(201).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  })
);

// POST /api/auth/register/student
router.post(
  "/register/student",
  [
    body("name").trim().notEmpty(),
    body("username").trim().isLength({ min: 3, max: 20 }),
    body("password").isLength({ min: 6 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const result = await AuthService.registerStudent(req.body);

    res.status(201).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  })
);

// POST /api/auth/login
router.post(
  "/login",
  [body("username").trim().notEmpty(), body("password").notEmpty()],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const result = await AuthService.login(req.body);

    res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  })
);

// POST /api/auth/change-password
router.post(
  "/change-password",
  authMiddleware,
  [body("oldPassword").notEmpty(), body("newPassword").isLength({ min: 6 })],
  validate,
  asyncHandler(async (req: any, res: any) => {
    await AuthService.changePassword(
      req.user!.userId,
      req.body.oldPassword,
      req.body.newPassword
    );

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  })
);

// POST /api/auth/migrate (para migrar usuarios existentes)
router.post(
  "/migrate",
  authMiddleware,
  [
    body("username").trim().isLength({ min: 3, max: 20 }),
    body("password").isLength({ min: 6 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const user = await AuthService.migrateUserToAuth(
      req.user!.userId,
      req.body.username,
      req.body.password
    );

    res.status(200).json({
      success: true,
      user,
      message: "Account migrated successfully",
    });
  })
);

// ✅ MANTENER ENDPOINT EXISTENTE
router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    // ... código sin cambios
  })
);

export default router;
```

**✅ VALIDACIÓN:**

```bash
# 1. Endpoint viejo sigue funcionando
curl -X POST http://localhost:3002/api/auth/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Old User", "role": "student"}'

# 2. Nuevo endpoint de registro
curl -X POST http://localhost:3002/api/auth/register/student \
  -H "Content-Type: application/json" \
  -d '{"name": "New User", "username": "new.user", "password": "password123"}'

# 3. Nuevo endpoint de login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "new.user", "password": "password123"}'

# Todos deben funcionar sin errores
```

---

### **FASE 5: Frontend Dual Mode (COEXISTENCIA)**

**Objetivo:** Mantener login viejo funcionando mientras agregamos el nuevo

```typescript
// client/src/services/authService.ts

class AuthService {
  // ✅ MANTENER MÉTODO EXISTENTE
  async join(data: { name: string; role: "teacher" | "student" }) {
    const response = await api.post("/auth/join", data);
    return response.data;
  }

  // ✅ NUEVOS MÉTODOS
  async registerTeacher(data: {
    name: string;
    username: string;
    password: string;
  }) {
    const response = await api.post("/auth/register/teacher", data);
    return response.data;
  }

  async registerStudent(data: {
    name: string;
    username: string;
    password: string;
  }) {
    const response = await api.post("/auth/register/student", data);
    return response.data;
  }

  async login(data: { username: string; password: string }) {
    const response = await api.post("/auth/login", data);
    return response.data;
  }

  async changePassword(data: { oldPassword: string; newPassword: string }) {
    const response = await api.post("/auth/change-password", data);
    return response.data;
  }

  async migrateAccount(data: { username: string; password: string }) {
    const response = await api.post("/auth/migrate", data);
    return response.data;
  }

  async me() {
    const response = await api.get("/auth/me");
    return response.data;
  }
}

export const authService = new AuthService();
```

```typescript
// client/src/pages/LoginPageV2.tsx (NUEVA PÁGINA)

export const LoginPageV2 = () => {
  const [mode, setMode] = useState<"login" | "legacy">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");

  const handleNewLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await authService.login({ username, password });
    setAuth(response.user, response.token);
    navigate("/dashboard");
  };

  const handleLegacyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await authService.join({ name, role });
    setAuth(response.user, response.token);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Toggle entre modos */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2 rounded-lg ${
              mode === "login" ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            Login Seguro
          </button>
          <button
            onClick={() => setMode("legacy")}
            className={`flex-1 py-2 rounded-lg ${
              mode === "legacy" ? "bg-gray-600 text-white" : "bg-white"
            }`}
          >
            Login Simple (Legacy)
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {mode === "login" ? (
            // Nuevo login con username/password
            <form onSubmit={handleNewLogin}>
              <h2 className="text-2xl font-bold mb-6">Iniciar Sesión</h2>

              <input
                type="text"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg mb-4"
              />

              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg mb-6"
              />

              <button className="w-full bg-blue-600 text-white py-3 rounded-lg">
                Iniciar Sesión
              </button>
            </form>
          ) : (
            // Login legacy (nombre + rol)
            <form onSubmit={handleLegacyLogin}>
              <h2 className="text-2xl font-bold mb-6">Acceso Rápido</h2>

              <input
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg mb-4"
              />

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`p-4 border-2 rounded-lg ${
                    role === "teacher"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  Profesor
                </button>
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`p-4 border-2 rounded-lg ${
                    role === "student"
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200"
                  }`}
                >
                  Estudiante
                </button>
              </div>

              <button className="w-full bg-gray-600 text-white py-3 rounded-lg">
                Entrar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
```

```typescript
// client/src/App.tsx - Actualizar rutas

import { LoginPageV2 } from "./pages/LoginPageV2";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPageV2 />} />
      {/* ... resto de rutas sin cambios */}
    </Routes>
  );
}
```

**✅ VALIDACIÓN:**

```bash
# 1. Abrir http://localhost:5173/login
# 2. Probar "Login Simple (Legacy)" - debe funcionar como antes
# 3. Probar "Login Seguro" - debe funcionar con username/password
# 4. Ambos modos deben coexistir sin problemas
```

---

## ✅ RESUMEN DE LA ESTRATEGIA

### **Principios clave:**

1. **NUNCA borrar código existente** - Solo agregar
2. **Mantener compatibilidad** - Ambos sistemas funcionan simultáneamente
3. **Migración gradual** - Usuarios pueden migrar cuando quieran
4. **Rollback fácil** - Si algo falla, volver atrás es simple

### **Qué NO se rompe:**

✅ Canvas colaborativo - **INTACTO**
✅ Sesiones en vivo - **INTACTO**
✅ WebSocket Yjs - **INTACTO**
✅ Slides y clases - **INTACTO**
✅ Login actual (nombre+rol) - **SIGUE FUNCIONANDO**
✅ Usuarios existentes - **NO SE PIERDEN**

### **Qué se agrega:**

✅ Nuevas columnas en `users` (NULLABLE)
✅ Nuevos métodos en repositories
✅ Nuevos métodos en AuthService
✅ Nuevos endpoints REST
✅ Nueva página de login (opcional)
✅ Sistema de migración de usuarios

---

## 🎯 PLAN DE EJECUCIÓN RECOMENDADO

### **Opción A: Migración Inmediata (Recomendada)**

```
Día 1 Mañana (2h):
  ✅ Fase 0: Backup
  ✅ Fase 1: Migración DB
  ✅ Fase 2: Extender Repositories
  ✅ Validar que login viejo funciona

Día 1 Tarde (3h):
  ✅ Fase 3: Extender AuthService
  ✅ Fase 4: Nuevos endpoints
  ✅ Validar ambos sistemas

Día 2 Mañana (3h):
  ✅ Fase 5: Frontend dual mode
  ✅ Testing completo
  ✅ Documentar cambios
```

### **Opción B: Migración Gradual (Más Segura)**

```
Semana 1:
  ✅ Solo Fase 1 (DB)
  ✅ Validar 2-3 días

Semana 2:
  ✅ Fases 2-3 (Backend)
  ✅ Validar 2-3 días

Semana 3:
  ✅ Fases 4-5 (Frontend)
  ✅ Testing final
```

---

## 🚨 PLAN DE CONTINGENCIA

### **Si algo sale mal:**

```bash
# 1. Detener servidores
Ctrl+C en ambas terminales

# 2. Restaurar base de datos
rm database/aula.db
cp database/backups/aula-pre-migration-*.db database/aula.db

# 3. Revertir cambios de código
git checkout main
# o
git reset --hard HEAD~1

# 4. Reiniciar
npm run dev --prefix server
npm run dev --prefix client

# 5. Verificar que funciona
# Login con nombre + rol debe funcionar
```

---

## 📝 CONCLUSIÓN

**¿Se va a romper algo?**

- ❌ **NO** - Si seguimos esta estrategia
- ✅ Todo el código actual sigue funcionando
- ✅ Agregamos funcionalidad nueva sin quitar la vieja
- ✅ Migración es opcional y gradual

**¿Es seguro empezar?**

- ✅ **SÍ** - Con backups y Git
- ✅ Cada fase es reversible
- ✅ Puedes probar en cada paso
- ✅ Si algo falla, rollback inmediato

**¿Cuánto tiempo toma?**

- ⏱️ **5-8 horas** total (con validaciones)
- ⏱️ **2 horas** mínimo (solo backend)
- ⏱️ **1 día** completo (con frontend y testing)

---

**¿Quieres que empecemos con la Fase 0 (Backup) y Fase 1 (Migración DB)?**

Es el paso más seguro y reversible. Solo agregamos columnas a la base de datos, nada se rompe.
