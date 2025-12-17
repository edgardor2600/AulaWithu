# 🎓 ROADMAP EJECUTIVO - AULA COLABORATIVA PARA ACADEMIA DE INGLÉS

**Cliente:** Academia de inglés (3 clases, 12 estudiantes inicialmente)  
**Deadline:** 1 semana (23-24 Diciembre 2025)  
**Objetivo:** Sistema listo para vender con autenticación robusta y funcionalidades core

---

## 📊 CONTEXTO DEL PROYECTO

### **Situación Actual:**

- ✅ Canvas colaborativo funcional (Fabric.js + Yjs)
- ✅ Sincronización en tiempo real
- ✅ Toolbar optimizado
- ✅ Mini-mapa Navigator
- ⚠️ **Autenticación simplificada** (solo nombre + rol)
- ⚠️ **Sin sistema de grupos/clases por estudiante**
- ⚠️ **Sin exámenes**

### **Requisitos del Cliente:**

- 🎯 **3 clases** con **4 estudiantes** cada una (12 total)
- 🎯 **Academia de inglés** (mayores de edad)
- 🎯 **Estudiantes necesitan login propio** (persistente)
- 🎯 **Exámenes variados** (escritura, multiple choice)
- 🎯 **Grupos organizados** por clase
- 🎯 **Sin email/storage externo** (por ahora)

---

## 🚀 PLAN DE IMPLEMENTACIÓN (7 DÍAS)

### **PRIORIDAD CRÍTICA (Días 1-3): AUTENTICACIÓN Y USUARIOS**

#### **DÍA 1: Sistema de Autenticación Robusto**

**Objetivo:** Profesores y estudiantes con login seguro

**Tareas:**

1. **Migración de Base de Datos** (2 horas)

```sql
-- Agregar campos a tabla users
ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN institution_id TEXT DEFAULT 'academia-001';
ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN last_login DATETIME;

-- Crear tabla de instituciones (multi-tenancy futuro)
CREATE TABLE institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar academia inicial
INSERT INTO institutions (id, name, contact_email)
VALUES ('academia-001', 'Academia de Inglés', 'contacto@academia.com');
```

2. **Implementar Hash de Contraseñas** (1 hora)

```bash
# Instalar bcrypt
cd server
npm install bcrypt
npm install --save-dev @types/bcrypt
```

```typescript
// server/src/utils/password.ts
import bcrypt from "bcrypt";

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

3. **Actualizar AuthService** (2 horas)

```typescript
// server/src/services/auth.service.ts

interface RegisterTeacherData {
  name: string;
  email: string;
  password: string;
  institution_id: string;
}

interface RegisterStudentData {
  name: string;
  username: string;
  password: string;
  institution_id: string;
}

interface LoginData {
  username: string;
  password: string;
}

export class AuthService {
  // PROFESORES: Registro con email
  static async registerTeacher(data: RegisterTeacherData) {
    // Validar email único
    // Hash password
    // Crear usuario con role='teacher'
    // Generar JWT
  }

  // ESTUDIANTES: Registro con username
  static async registerStudent(data: RegisterStudentData) {
    // Validar username único dentro de institución
    // Hash password
    // Crear usuario con role='student'
    // Generar JWT
  }

  // LOGIN UNIFICADO
  static async login(data: LoginData) {
    // Buscar usuario por username
    // Verificar password con bcrypt
    // Actualizar last_login
    // Generar JWT
  }

  // Cambiar contraseña
  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ) {
    // Verificar contraseña actual
    // Hash nueva contraseña
    // Actualizar en DB
  }
}
```

4. **Actualizar Rutas de Auth** (1 hora)

```typescript
// server/src/api/auth.routes.ts

// POST /api/auth/register/teacher
router.post(
  "/register/teacher",
  [
    body("name").trim().notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
  ],
  validate,
  async (req, res) => {
    const result = await AuthService.registerTeacher(req.body);
    res.json({ success: true, token: result.token, user: result.user });
  }
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
  async (req, res) => {
    const result = await AuthService.registerStudent(req.body);
    res.json({ success: true, token: result.token, user: result.user });
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [body("username").trim().notEmpty(), body("password").notEmpty()],
  validate,
  async (req, res) => {
    const result = await AuthService.login(req.body);
    res.json({ success: true, token: result.token, user: result.user });
  }
);

// POST /api/auth/change-password
router.post("/change-password", authMiddleware, async (req, res) => {
  await AuthService.changePassword(
    req.user.userId,
    req.body.oldPassword,
    req.body.newPassword
  );
  res.json({ success: true });
});
```

**Entregable Día 1:**

- ✅ Base de datos con campos de autenticación
- ✅ Hash de contraseñas con bcrypt
- ✅ Endpoints de registro y login
- ✅ JWT con expiración (24h)

---

#### **DÍA 2: UI de Login y Registro**

**Objetivo:** Interfaces de usuario para profesores y estudiantes

**Tareas:**

1. **Página de Login Unificada** (2 horas)

```typescript
// client/src/pages/LoginPage.tsx

export const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await authService.login({ username, password });
    setAuth(response.user, response.token);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-md mx-auto pt-20">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-6">Aula Colaborativa</h1>

          <form onSubmit={handleLogin}>
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
        </div>
      </div>
    </div>
  );
};
```

2. **Panel de Administración para Crear Estudiantes** (3 horas)

```typescript
// client/src/pages/admin/CreateStudentPage.tsx

export const CreateStudentPage = () => {
  const [students, setStudents] = useState([
    { name: "", username: "", password: "" },
  ]);

  const handleBulkCreate = async () => {
    for (const student of students) {
      await authService.registerStudent({
        ...student,
        institution_id: "academia-001",
      });
    }

    // Generar PDF con credenciales
    generateCredentialsPDF(students);
    toast.success("Estudiantes creados exitosamente");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Crear Estudiantes</h1>

      {students.map((student, index) => (
        <div key={index} className="grid grid-cols-3 gap-4 mb-4">
          <input
            placeholder="Nombre completo"
            value={student.name}
            onChange={(e) => updateStudent(index, "name", e.target.value)}
          />
          <input
            placeholder="Usuario (ej: ana.martinez)"
            value={student.username}
            onChange={(e) => updateStudent(index, "username", e.target.value)}
          />
          <input
            placeholder="Contraseña"
            value={student.password}
            onChange={(e) => updateStudent(index, "password", e.target.value)}
          />
        </div>
      ))}

      <button onClick={() => addStudent()}>+ Agregar Estudiante</button>
      <button onClick={handleBulkCreate}>Crear Todos</button>
    </div>
  );
};
```

3. **Generador de Credenciales PDF** (1 hora)

```typescript
// client/src/utils/credentials-generator.ts
import jsPDF from "jspdf";

export const generateCredentialsPDF = (students: Student[]) => {
  const doc = new jsPDF();

  students.forEach((student, index) => {
    if (index > 0) doc.addPage();

    doc.setFontSize(20);
    doc.text("Credenciales de Acceso", 20, 20);

    doc.setFontSize(14);
    doc.text(`Nombre: ${student.name}`, 20, 40);
    doc.text(`Usuario: ${student.username}`, 20, 50);
    doc.text(`Contraseña: ${student.password}`, 20, 60);

    doc.text("URL: https://aula.academia.com", 20, 80);
  });

  doc.save("credenciales-estudiantes.pdf");
};
```

**Entregable Día 2:**

- ✅ Login funcional para profesores y estudiantes
- ✅ Panel admin para crear estudiantes en lote
- ✅ Generador de PDF con credenciales
- ✅ Cambio de contraseña en primer login

---

#### **DÍA 3: Grupos y Organización de Clases**

**Objetivo:** Sistema de grupos para organizar estudiantes por clase

**Tareas:**

1. **Migración de Base de Datos** (1 hora)

```sql
-- Tabla de grupos
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  max_students INTEGER DEFAULT 20,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE(class_id, name)
);

-- Tabla de inscripciones (estudiantes en grupos)
CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK(status IN ('active', 'inactive', 'completed')) DEFAULT 'active',
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(group_id, student_id)
);

-- Índices
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_group ON enrollments(group_id);
```

2. **Repository de Grupos** (2 horas)

```typescript
// server/src/db/repositories/groups-repository.ts

export class GroupsRepository {
  static createGroup(classId: string, name: string, description?: string) {
    const id = `group-${uuid()}`;
    db.run(
      `
      INSERT INTO groups (id, class_id, name, description)
      VALUES (?, ?, ?, ?)
    `,
      [id, classId, name, description]
    );
    return this.getById(id);
  }

  static getGroupsByClass(classId: string) {
    return db.all(
      `
      SELECT g.*, COUNT(e.id) as student_count
      FROM groups g
      LEFT JOIN enrollments e ON e.group_id = g.id AND e.status = 'active'
      WHERE g.class_id = ? AND g.active = 1
      GROUP BY g.id
      ORDER BY g.name
    `,
      [classId]
    );
  }

  static enrollStudent(groupId: string, studentId: string) {
    const id = `enrollment-${uuid()}`;
    db.run(
      `
      INSERT INTO enrollments (id, group_id, student_id, status)
      VALUES (?, ?, ?, 'active')
    `,
      [id, groupId, studentId]
    );
    return { id, groupId, studentId };
  }

  static getStudentsByGroup(groupId: string) {
    return db.all(
      `
      SELECT u.id, u.name, u.username, u.avatar_color, e.enrolled_at
      FROM enrollments e
      JOIN users u ON u.id = e.student_id
      WHERE e.group_id = ? AND e.status = 'active'
      ORDER BY u.name
    `,
      [groupId]
    );
  }

  static getGroupsByStudent(studentId: string) {
    return db.all(
      `
      SELECT g.*, c.title as class_title, c.description as class_description
      FROM enrollments e
      JOIN groups g ON g.id = e.group_id
      JOIN classes c ON c.id = g.class_id
      WHERE e.student_id = ? AND e.status = 'active'
      ORDER BY c.title, g.name
    `,
      [studentId]
    );
  }
}
```

3. **Endpoints de Grupos** (2 horas)

```typescript
// server/src/api/groups.routes.ts

// POST /api/classes/:classId/groups
router.post(
  "/:classId/groups",
  authMiddleware,
  requireRole(["teacher"]),
  async (req, res) => {
    const group = GroupsRepository.createGroup(
      req.params.classId,
      req.body.name,
      req.body.description
    );
    res.json({ success: true, group });
  }
);

// GET /api/classes/:classId/groups
router.get("/:classId/groups", authMiddleware, async (req, res) => {
  const groups = GroupsRepository.getGroupsByClass(req.params.classId);
  res.json({ success: true, groups });
});

// POST /api/groups/:groupId/enroll
router.post(
  "/:groupId/enroll",
  authMiddleware,
  requireRole(["teacher"]),
  async (req, res) => {
    const enrollment = GroupsRepository.enrollStudent(
      req.params.groupId,
      req.body.studentId
    );
    res.json({ success: true, enrollment });
  }
);

// GET /api/groups/:groupId/students
router.get("/:groupId/students", authMiddleware, async (req, res) => {
  const students = GroupsRepository.getStudentsByGroup(req.params.groupId);
  res.json({ success: true, students });
});

// GET /api/students/my-groups (para estudiantes)
router.get("/my-groups", authMiddleware, async (req, res) => {
  const groups = GroupsRepository.getGroupsByStudent(req.user.userId);
  res.json({ success: true, groups });
});
```

4. **UI de Gestión de Grupos** (2 horas)

```typescript
// client/src/pages/teacher/ManageGroupsPage.tsx

export const ManageGroupsPage = () => {
  const { classId } = useParams();
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);

  const handleCreateGroup = async (name: string) => {
    await classesService.createGroup(classId, { name });
    loadGroups();
  };

  const handleEnrollStudent = async (groupId: string, studentId: string) => {
    await groupsService.enrollStudent(groupId, studentId);
    loadGroupStudents(groupId);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Gestionar Grupos</h1>

      <div className="grid grid-cols-3 gap-6">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-2">{group.name}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {group.student_count} estudiantes
            </p>

            <button onClick={() => openEnrollModal(group.id)}>
              + Inscribir Estudiante
            </button>

            <div className="mt-4">
              {getGroupStudents(group.id).map((student) => (
                <div key={student.id} className="flex items-center gap-2 py-2">
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: student.avatar_color }}
                  />
                  <span>{student.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Entregable Día 3:**

- ✅ Sistema de grupos funcional
- ✅ Inscripción de estudiantes a grupos
- ✅ Dashboard de profesor con vista de grupos
- ✅ Dashboard de estudiante con sus clases

---

### **PRIORIDAD ALTA (Días 4-5): EXÁMENES BÁSICOS**

#### **DÍA 4: Estructura de Exámenes**

**Objetivo:** Sistema de exámenes con multiple choice y respuestas cortas

**Tareas:**

1. **Migración de Base de Datos** (2 horas)

```sql
-- Tabla de exámenes
CREATE TABLE exams (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  total_points REAL,
  passing_score REAL,
  start_date DATETIME,
  due_date DATETIME,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabla de preguntas
CREATE TABLE exam_questions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  question_type TEXT CHECK(question_type IN ('multiple_choice', 'short_answer', 'essay')) NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT, -- JSON array para multiple choice
  correct_answer TEXT, -- Para auto-calificación
  points REAL NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Tabla de intentos de examen
CREATE TABLE exam_attempts (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME,
  score REAL,
  status TEXT CHECK(status IN ('in_progress', 'submitted', 'graded')) DEFAULT 'in_progress',
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de respuestas
CREATE TABLE exam_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer_text TEXT,
  points_earned REAL,
  feedback TEXT,
  FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE,
  UNIQUE(attempt_id, question_id)
);
```

2. **Repository de Exámenes** (3 horas)

```typescript
// server/src/db/repositories/exams-repository.ts

export class ExamsRepository {
  static createExam(data: CreateExamData) {
    const id = `exam-${uuid()}`;
    db.run(
      `
      INSERT INTO exams (id, class_id, title, description, duration_minutes, total_points, passing_score, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        data.classId,
        data.title,
        data.description,
        data.durationMinutes,
        data.totalPoints,
        data.passingScore,
        data.createdBy,
      ]
    );
    return this.getById(id);
  }

  static addQuestion(examId: string, question: QuestionData) {
    const id = `question-${uuid()}`;
    db.run(
      `
      INSERT INTO exam_questions (id, exam_id, question_number, question_type, question_text, options, correct_answer, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        examId,
        question.number,
        question.type,
        question.text,
        JSON.stringify(question.options),
        question.correctAnswer,
        question.points,
      ]
    );
    return { id, ...question };
  }

  static startAttempt(examId: string, studentId: string) {
    const id = `attempt-${uuid()}`;
    db.run(
      `
      INSERT INTO exam_attempts (id, exam_id, student_id, status)
      VALUES (?, ?, ?, 'in_progress')
    `,
      [id, examId, studentId]
    );
    return this.getAttemptById(id);
  }

  static saveAnswer(attemptId: string, questionId: string, answerText: string) {
    const id = `answer-${uuid()}`;
    db.run(
      `
      INSERT OR REPLACE INTO exam_answers (id, attempt_id, question_id, answer_text)
      VALUES (?, ?, ?, ?)
    `,
      [id, attemptId, questionId, answerText]
    );
  }

  static submitAttempt(attemptId: string) {
    db.run(
      `
      UPDATE exam_attempts
      SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [attemptId]
    );

    // Auto-calificar preguntas de multiple choice
    this.autoGradeAttempt(attemptId);
  }

  static autoGradeAttempt(attemptId: string) {
    const answers = db.all(
      `
      SELECT a.id, a.answer_text, q.correct_answer, q.points, q.question_type
      FROM exam_answers a
      JOIN exam_questions q ON q.id = a.question_id
      WHERE a.attempt_id = ?
    `,
      [attemptId]
    );

    let totalScore = 0;

    answers.forEach((answer) => {
      if (answer.question_type === "multiple_choice") {
        const points =
          answer.answer_text === answer.correct_answer ? answer.points : 0;
        db.run(
          `
          UPDATE exam_answers
          SET points_earned = ?
          WHERE id = ?
        `,
          [points, answer.id]
        );
        totalScore += points;
      }
    });

    db.run(
      `
      UPDATE exam_attempts
      SET score = ?, status = 'graded'
      WHERE id = ?
    `,
      [totalScore, attemptId]
    );
  }
}
```

**Entregable Día 4:**

- ✅ Base de datos de exámenes
- ✅ CRUD de exámenes y preguntas
- ✅ Sistema de intentos y respuestas
- ✅ Auto-calificación de multiple choice

---

#### **DÍA 5: UI de Exámenes**

**Objetivo:** Interfaces para crear y tomar exámenes

**Tareas:**

1. **Creador de Exámenes (Profesor)** (3 horas)

```typescript
// client/src/pages/teacher/CreateExamPage.tsx

export const CreateExamPage = () => {
  const [exam, setExam] = useState({
    title: "",
    description: "",
    durationMinutes: 60,
    passingScore: 70,
  });

  const [questions, setQuestions] = useState([]);

  const addQuestion = (type: "multiple_choice" | "short_answer" | "essay") => {
    setQuestions([
      ...questions,
      {
        number: questions.length + 1,
        type,
        text: "",
        options: type === "multiple_choice" ? ["", "", "", ""] : null,
        correctAnswer: "",
        points: 10,
      },
    ]);
  };

  const handleSave = async () => {
    const createdExam = await examsService.createExam(exam);

    for (const question of questions) {
      await examsService.addQuestion(createdExam.id, question);
    }

    toast.success("Examen creado exitosamente");
    navigate(`/exams/${createdExam.id}`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Crear Examen</h1>

      {/* Información del examen */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <input
          placeholder="Título del examen"
          value={exam.title}
          onChange={(e) => setExam({ ...exam, title: e.target.value })}
          className="w-full text-xl font-bold mb-4"
        />

        <textarea
          placeholder="Descripción"
          value={exam.description}
          onChange={(e) => setExam({ ...exam, description: e.target.value })}
          className="w-full mb-4"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Duración (minutos)</label>
            <input
              type="number"
              value={exam.durationMinutes}
              onChange={(e) =>
                setExam({ ...exam, durationMinutes: Number(e.target.value) })
              }
            />
          </div>

          <div>
            <label>Nota mínima para aprobar (%)</label>
            <input
              type="number"
              value={exam.passingScore}
              onChange={(e) =>
                setExam({ ...exam, passingScore: Number(e.target.value) })
              }
            />
          </div>
        </div>
      </div>

      {/* Preguntas */}
      <div className="space-y-4">
        {questions.map((q, index) => (
          <QuestionEditor
            key={index}
            question={q}
            onChange={(updated) => updateQuestion(index, updated)}
            onDelete={() => deleteQuestion(index)}
          />
        ))}
      </div>

      {/* Botones para agregar preguntas */}
      <div className="flex gap-4 mt-6">
        <button onClick={() => addQuestion("multiple_choice")}>
          + Opción Múltiple
        </button>
        <button onClick={() => addQuestion("short_answer")}>
          + Respuesta Corta
        </button>
        <button onClick={() => addQuestion("essay")}>+ Ensayo</button>
      </div>

      <button
        onClick={handleSave}
        className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg"
      >
        Guardar Examen
      </button>
    </div>
  );
};
```

2. **Vista de Examen (Estudiante)** (3 horas)

```typescript
// client/src/pages/student/TakeExamPage.tsx

export const TakeExamPage = () => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    loadExam();
    startAttempt();
  }, [examId]);

  const startAttempt = async () => {
    const newAttempt = await examsService.startAttempt(examId);
    setAttempt(newAttempt);
    setTimeRemaining(exam.durationMinutes * 60);
  };

  const handleSubmit = async () => {
    // Guardar todas las respuestas
    for (const [questionId, answer] of Object.entries(answers)) {
      await examsService.saveAnswer(attempt.id, questionId, answer);
    }

    // Enviar examen
    await examsService.submitAttempt(attempt.id);

    toast.success("Examen enviado exitosamente");
    navigate("/my-exams");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header con timer */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{exam?.title}</h1>
        <div className="text-lg font-mono">⏱️ {formatTime(timeRemaining)}</div>
      </div>

      {/* Preguntas */}
      <div className="space-y-6">
        {exam?.questions.map((question, index) => (
          <div key={question.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold">Pregunta {index + 1}</h3>
              <span className="text-sm text-gray-600">
                {question.points} puntos
              </span>
            </div>

            <p className="mb-4">{question.text}</p>

            {question.type === "multiple_choice" && (
              <div className="space-y-2">
                {question.options.map((option, i) => (
                  <label key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={(e) =>
                        setAnswers({
                          ...answers,
                          [question.id]: e.target.value,
                        })
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === "short_answer" && (
              <input
                type="text"
                value={answers[question.id] || ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [question.id]: e.target.value })
                }
                className="w-full border rounded px-4 py-2"
                placeholder="Tu respuesta..."
              />
            )}

            {question.type === "essay" && (
              <textarea
                value={answers[question.id] || ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [question.id]: e.target.value })
                }
                className="w-full border rounded px-4 py-2 h-32"
                placeholder="Escribe tu respuesta..."
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-bold"
      >
        Enviar Examen
      </button>
    </div>
  );
};
```

**Entregable Día 5:**

- ✅ Creador de exámenes para profesores
- ✅ Vista de examen para estudiantes
- ✅ Timer de examen
- ✅ Auto-calificación de multiple choice
- ✅ Vista de resultados

---

### **PRIORIDAD MEDIA (Días 6-7): PULIDO Y TESTING**

#### **DÍA 6: Dashboard y Reportes**

**Tareas:**

1. **Dashboard del Profesor** (3 horas)

   - Vista general de clases y grupos
   - Estadísticas de exámenes
   - Lista de estudiantes por grupo
   - Exámenes pendientes de calificar

2. **Dashboard del Estudiante** (2 horas)

   - Mis clases y grupos
   - Próximos exámenes
   - Historial de calificaciones
   - Progreso general

3. **Reportes Básicos** (2 horas)
   - Exportar lista de estudiantes (CSV)
   - Exportar calificaciones (CSV)
   - Reporte de asistencia a sesiones

**Entregable Día 6:**

- ✅ Dashboards funcionales
- ✅ Reportes exportables
- ✅ Estadísticas básicas

---

#### **DÍA 7: Testing y Deployment**

**Tareas:**

1. **Testing Manual** (2 horas)

   - Flujo completo de profesor
   - Flujo completo de estudiante
   - Crear examen y tomarlo
   - Verificar calificaciones

2. **Seed Data Real** (1 hora)

```sql
-- Profesor
INSERT INTO users (id, name, username, password_hash, role, institution_id)
VALUES ('teacher-001', 'Profesor García', 'prof.garcia', '$2b$10$...', 'teacher', 'academia-001');

-- 3 Clases
INSERT INTO classes (id, title, description, teacher_id) VALUES
('class-001', 'English A1 - Beginners', 'Basic English for beginners', 'teacher-001'),
('class-002', 'English A2 - Elementary', 'Elementary level English', 'teacher-001'),
('class-003', 'English B1 - Intermediate', 'Intermediate English', 'teacher-001');

-- 3 Grupos (uno por clase)
INSERT INTO groups (id, class_id, name) VALUES
('group-001', 'class-001', 'Grupo Mañana'),
('group-002', 'class-002', 'Grupo Tarde'),
('group-003', 'class-003', 'Grupo Noche');

-- 12 Estudiantes (4 por grupo)
-- Clase A1
INSERT INTO users (id, name, username, password_hash, role, institution_id) VALUES
('student-001', 'Ana Martínez', 'ana.martinez', '$2b$10$...', 'student', 'academia-001'),
('student-002', 'Carlos López', 'carlos.lopez', '$2b$10$...', 'student', 'academia-001'),
('student-003', 'María García', 'maria.garcia', '$2b$10$...', 'student', 'academia-001'),
('student-004', 'Juan Pérez', 'juan.perez', '$2b$10$...', 'student', 'academia-001');

-- Clase A2
INSERT INTO users (id, name, username, password_hash, role, institution_id) VALUES
('student-005', 'Laura Gómez', 'laura.gomez', '$2b$10$...', 'student', 'academia-001'),
('student-006', 'Pedro Sánchez', 'pedro.sanchez', '$2b$10$...', 'student', 'academia-001'),
('student-007', 'Sofia Rodríguez', 'sofia.rodriguez', '$2b$10$...', 'student', 'academia-001'),
('student-008', 'Diego Torres', 'diego.torres', '$2b$10$...', 'student', 'academia-001');

-- Clase B1
INSERT INTO users (id, name, username, password_hash, role, institution_id) VALUES
('student-009', 'Valentina Ruiz', 'valentina.ruiz', '$2b$10$...', 'student', 'academia-001'),
('student-010', 'Mateo Díaz', 'mateo.diaz', '$2b$10$...', 'student', 'academia-001'),
('student-011', 'Isabella Castro', 'isabella.castro', '$2b$10$...', 'student', 'academia-001'),
('student-012', 'Lucas Morales', 'lucas.morales', '$2b$10$...', 'student', 'academia-001');

-- Inscripciones
INSERT INTO enrollments (id, group_id, student_id, status) VALUES
-- Grupo A1
('enroll-001', 'group-001', 'student-001', 'active'),
('enroll-002', 'group-001', 'student-002', 'active'),
('enroll-003', 'group-001', 'student-003', 'active'),
('enroll-004', 'group-001', 'student-004', 'active'),
-- Grupo A2
('enroll-005', 'group-002', 'student-005', 'active'),
('enroll-006', 'group-002', 'student-006', 'active'),
('enroll-007', 'group-002', 'student-007', 'active'),
('enroll-008', 'group-002', 'student-008', 'active'),
-- Grupo B1
('enroll-009', 'group-003', 'student-009', 'active'),
('enroll-010', 'group-003', 'student-010', 'active'),
('enroll-011', 'group-003', 'student-011', 'active'),
('enroll-012', 'group-003', 'student-012', 'active');
```

3. **Documentación** (2 horas)

   - README actualizado
   - Manual de usuario (profesor)
   - Manual de usuario (estudiante)
   - Guía de deployment

4. **Deployment Local** (2 horas)
   - Build de producción
   - Configurar .env de producción
   - Script de inicio
   - Backup automático de DB

**Entregable Día 7:**

- ✅ Sistema completamente funcional
- ✅ Datos de prueba cargados
- ✅ Documentación completa
- ✅ Listo para demo

---

## 📋 CHECKLIST FINAL

### **Funcionalidades Core:**

- ✅ Login seguro (profesores y estudiantes)
- ✅ Gestión de grupos (3 clases, 4 estudiantes c/u)
- ✅ Canvas colaborativo en tiempo real
- ✅ Creación de exámenes (multiple choice + respuesta corta)
- ✅ Toma de exámenes con timer
- ✅ Auto-calificación de multiple choice
- ✅ Dashboard de profesor
- ✅ Dashboard de estudiante
- ✅ Reportes básicos (CSV)

### **Seguridad:**

- ✅ Contraseñas hasheadas (bcrypt)
- ✅ JWT con expiración
- ✅ Validación de permisos por rol
- ✅ Protección de endpoints

### **UX:**

- ✅ Interfaz intuitiva
- ✅ Responsive design
- ✅ Feedback visual (toasts)
- ✅ Loading states

---

## 🚫 FUERA DE ALCANCE (Fase 2 - Futuro)

- ❌ Email notifications
- ❌ Cloud storage (AWS S3)
- ❌ Video/Audio en sesiones
- ❌ Chat en tiempo real
- ❌ Grabación de sesiones
- ❌ Analytics avanzados
- ❌ Integración con Google Classroom
- ❌ App móvil
- ❌ Gamificación
- ❌ Certificados automáticos

---

## 📞 SOPORTE Y MANTENIMIENTO

### **Post-Lanzamiento:**

1. Monitoreo de errores (logs)
2. Backup diario de base de datos
3. Actualizaciones de seguridad
4. Soporte técnico básico

### **Mejoras Incrementales:**

- Agregar más tipos de preguntas
- Banco de preguntas reutilizables
- Calificación por rúbricas
- Feedback automático

---

**Última actualización:** 17 Diciembre 2025  
**Versión:** 1.0 - MVP Academia de Inglés
