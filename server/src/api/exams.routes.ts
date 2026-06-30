import { Router } from 'express';
import { body, param } from 'express-validator';
import { ExamsService } from '../services/exams.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================
// EXAM CRUD (Teacher/Admin)
// ============================================

/**
 * POST /api/exams
 * Create a new exam (draft status).
 * Teacher must own the class.
 */
router.post(
  '/exams',
  requireRole(['teacher', 'admin']),
  [
    body('classId').notEmpty().withMessage('classId es requerido'),
    body('groupId').optional({ nullable: true }).isString().withMessage('groupId debe ser un texto'),
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('El título debe tener entre 3 y 200 caracteres'),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('durationMinutes').optional().isInt({ min: 0, max: 480 }).withMessage('Duración debe ser positiva'),
    body('passingScore').optional().isInt({ min: 0, max: 100 }).withMessage('Nota de aprobación entre 0 y 100'),
    body('skillType').optional().trim().isString(),
    body('questionCount').optional().isInt({ min: 1, max: 100 }).withMessage('La cantidad de preguntas debe estar entre 1 y 100'),
    body('availableFrom').optional({ nullable: true }).isISO8601().withMessage('Fecha de apertura inválida'),
    body('availableTo').optional({ nullable: true }).isISO8601().withMessage('Fecha de cierre inválida'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { classId, groupId, title, description, durationMinutes, passingScore, skillType, questionCount, availableFrom, availableTo } = req.body;
    const exam = await ExamsService.createExam(
      { classId, groupId, title, description, durationMinutes, passingScore, skillType, questionCount, availableFrom, availableTo },
      req.user.userId
    );
    res.status(201).json({ success: true, exam });
  })
);

/**
 * GET /api/classes/:classId/exams
 * Get all exams for a class.
 * - Teacher: sees all (including drafts)
 * - Student: sees only active and closed
 */
router.get(
  '/classes/:classId/exams',
  [param('classId').notEmpty()],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const exams = await ExamsService.getExamsByClass(req.params.classId, req.user.userId);
    res.status(200).json({ success: true, count: exams.length, exams });
  })
);

/**
 * GET /api/exams/:id
 * Get exam with questions.
 * Students do NOT receive correct_answer (stripped in service).
 */
router.get(
  '/exams/:id',
  [param('id').notEmpty()],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const data = await ExamsService.getExamWithQuestions(req.params.id, req.user.userId);
    res.status(200).json({ success: true, ...data });
  })
);

/**
 * PUT /api/exams/:id
 * Update exam metadata (only if status=draft).
 */
router.put(
  '/exams/:id',
  requireRole(['teacher', 'admin']),
  [
    param('id').notEmpty(),
    body('groupId').optional({ nullable: true }).isString().withMessage('groupId debe ser un texto'),
    body('title').optional().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('durationMinutes').optional().isInt({ min: 0, max: 480 }),
    body('passingScore').optional().isInt({ min: 0, max: 100 }),
    body('scaleMax').optional().isFloat({ min: 1.0, max: 100.0 }),
    body('skillType').optional().trim().isString(),
    body('availableFrom').optional({ nullable: true }).isISO8601().withMessage('Fecha de apertura inválida'),
    body('availableTo').optional({ nullable: true }).isISO8601().withMessage('Fecha de cierre inválida'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const exam = await ExamsService.updateExam(req.params.id, req.body, req.user.userId);
    res.status(200).json({ success: true, exam });
  })
);

/**
 * DELETE /api/exams/:id
 * Delete exam (only if status=draft).
 */
router.delete(
  '/exams/:id',
  requireRole(['teacher', 'admin']),
  asyncHandler(async (req: any, res: any) => {
    await ExamsService.deleteExam(req.params.id, req.user.userId);
    res.status(200).json({ success: true, message: 'Examen eliminado' });
  })
);

// ============================================
// EXAM STATUS TRANSITIONS (Teacher/Admin)
// ============================================

/**
 * POST /api/exams/:id/publish
 * Publish exam: draft -> active.
 * Validates that there are questions and all MC have correct_answer.
 */
router.post(
  '/exams/:id/publish',
  requireRole(['teacher', 'admin']),
  asyncHandler(async (req: any, res: any) => {
    const exam = await ExamsService.publishExam(req.params.id, req.user.userId);
    res.status(200).json({ success: true, exam });
  })
);

/**
 * POST /api/exams/:id/close
 * Close exam: active/draft -> closed.
 */
router.post(
  '/exams/:id/close',
  requireRole(['teacher', 'admin']),
  asyncHandler(async (req: any, res: any) => {
    const exam = await ExamsService.closeExam(req.params.id, req.user.userId);
    res.status(200).json({ success: true, exam });
  })
);

// ============================================
// QUESTION MANAGEMENT (Teacher/Admin)
// ============================================

/**
 * POST /api/exams/:id/questions
 * Add a question to an exam (only if status=draft).
 */
router.post(
  '/exams/:id/questions',
  requireRole(['teacher', 'admin']),
  [
    param('id').notEmpty(),
    body('type').isIn(['multiple_choice', 'short_answer']).withMessage('Tipo inválido'),
    body('text').trim().isLength({ min: 5 }).withMessage('La pregunta debe tener al menos 5 caracteres'),
    body('options').optional().isArray({ min: 2, max: 6 }).withMessage('Debe tener entre 2 y 6 opciones'),
    body('correctAnswer').optional().isString(),
    body('points').optional().isInt({ min: 1, max: 100 }).withMessage('Puntos entre 1 y 100'),
    body('skillCategory').optional().trim().isString(),
    body('mediaUrl').optional({ nullable: true }).trim().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const question = await ExamsService.addQuestion(req.params.id, req.body, req.user.userId);
    res.status(201).json({ success: true, question });
  })
);

/**
 * PUT /api/exams/:examId/questions/:questionId
 * Update a question (only if exam is draft).
 */
router.put(
  '/exams/:examId/questions/:questionId',
  requireRole(['teacher', 'admin']),
  asyncHandler(async (req: any, res: any) => {
    const question = await ExamsService.updateQuestion(
      req.params.questionId,
      req.body,
      req.user.userId
    );
    res.status(200).json({ success: true, question });
  })
);

/**
 * DELETE /api/exams/:examId/questions/:questionId
 * Delete a question (only if exam is draft).
 */
router.delete(
  '/exams/:examId/questions/:questionId',
  requireRole(['teacher', 'admin']),
  asyncHandler(async (req: any, res: any) => {
    await ExamsService.deleteQuestion(req.params.questionId, req.user.userId);
    res.status(200).json({ success: true, message: 'Pregunta eliminada' });
  })
);

// ============================================
// TEACHER: Results
// ============================================

/**
 * GET /api/exams/:id/results
 * Get all student attempts for an exam (teacher only).
 */
router.get(
  '/exams/:id/results',
  requireRole(['teacher', 'admin']),
  asyncHandler(async (req: any, res: any) => {
    const data = await ExamsService.getExamResults(req.params.id, req.user.userId);
    res.status(200).json({ success: true, ...data });
  })
);

/**
 * GET /api/exams/attempts/:attemptId/detail
 * Get full attempt with all answered questions for teacher review/grading.
 */
router.get(
  '/exams/attempts/:attemptId/detail',
  requireRole(['teacher', 'admin']),
  asyncHandler(async (req: any, res: any) => {
    const data = await ExamsService.getAttemptDetail(req.params.attemptId, req.user.userId);
    res.status(200).json({ success: true, ...data });
  })
);

/**
 * PUT /api/exams/attempts/:attemptId/grade
 * Teacher manually grades one answer (short_answer/writing questions).
 * Body: { questionId, pointsEarned }
 */
router.put(
  '/exams/attempts/:attemptId/grade',
  requireRole(['teacher', 'admin']),
  [
    param('attemptId').notEmpty(),
    body('questionId').notEmpty().withMessage('questionId es requerido'),
    body('pointsEarned').isFloat({ min: 0 }).withMessage('pointsEarned debe ser >= 0'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { questionId, pointsEarned } = req.body;
    const attempt = await ExamsService.gradeAttemptAnswer(
      req.params.attemptId,
      questionId,
      Number(pointsEarned),
      req.user.userId
    );
    res.status(200).json({ success: true, attempt });
  })
);

// ============================================
// STUDENT: Take Exam
// ============================================

/**
 * POST /api/exams/:id/attempt
 * Start or resume a student's attempt.
 * Returns existing in_progress attempt if already started (allows page refresh).
 */
router.post(
  '/exams/:id/attempt',
  requireRole(['student']),
  asyncHandler(async (req: any, res: any) => {
    const attempt = await ExamsService.startAttempt(req.params.id, req.user.userId);
    res.status(200).json({ success: true, attempt });
  })
);

/**
 * GET /api/exams/:id/attempt
 * Get the current student's attempt (with saved answers).
 */
router.get(
  '/exams/:id/attempt',
  requireRole(['student']),
  asyncHandler(async (req: any, res: any) => {
    const data = await ExamsService.getMyAttempt(req.params.id, req.user.userId);
    res.status(200).json({ success: true, ...data });
  })
);

/**
 * PUT /api/exams/attempts/:attemptId/answers
 * Save/update one answer during an in-progress attempt.
 */
router.put(
  '/exams/attempts/:attemptId/answers',
  requireRole(['student']),
  [
    param('attemptId').notEmpty(),
    body('questionId').notEmpty().withMessage('questionId es requerido'),
    body('answerText').optional({ nullable: true }).isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { questionId, answerText } = req.body;
    const answer = await ExamsService.saveAnswer(
      req.params.attemptId,
      questionId,
      answerText ?? null,
      req.user.userId
    );
    res.status(200).json({ success: true, answer });
  })
);

/**
 * POST /api/exams/attempts/:attemptId/submit
 * Submit the exam. Auto-grades MC questions and calculates score.
 * Status moves from in_progress -> submitted. Irreversible.
 */
router.post(
  '/exams/attempts/:attemptId/submit',
  requireRole(['student']),
  asyncHandler(async (req: any, res: any) => {
    const attempt = await ExamsService.submitAttempt(req.params.attemptId, req.user.userId);
    res.status(200).json({ success: true, attempt });
  })
);

export default router;
