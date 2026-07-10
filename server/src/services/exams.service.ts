import {
  ExamsRepository,
  ClassesRepository,
  EnrollmentsRepository,
  UsersRepository,
} from '../db/repositories';
import { Exam, ExamQuestion, ExamAttempt, ExamAnswer } from '../types/database';
import { getOne, getAll } from '../db/database';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../utils/AppError';

/**
 * Parse a DB timestamp string correctly regardless of whether it has a TZ suffix.
 * The pg type-parser (OID 1114) returns raw strings like "2026-07-03T11:32:00"
 * without any timezone info. Node.js treats those as UTC, which is wrong —
 * the values were stored as Colombia wall-clock time (UTC-5).
 * We append the Colombia offset so Date comparisons are accurate.
 */
const parseColombiaTs = (raw: string): Date => {
  if (raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw)) return new Date(raw);
  return new Date(raw.replace(' ', 'T') + '-05:00');
};


// ============================================================
// ACADEMIC TEMPLATES (Harvard / TOEFL / IELTS style)
// ============================================================
const EXAM_TEMPLATES: Record<string, Array<{
  type: 'multiple_choice' | 'short_answer';
  text: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  skillCategory: string;
}>> = {
  listening: [
    {
      type: 'multiple_choice',
      text: '[Listening Section] Listen to the professor discussing historical migrations in Europe. What was the primary driver of the third wave of migration?',
      options: [
        'An unexpected decade-long agricultural drought.',
        'The expansion of trade routes towards northern seas.',
        'Military alliances forming between rival city-states.',
        'A sudden shift in regional climate patterns.'
      ],
      correctAnswer: '0',
      points: 1,
      skillCategory: 'listening'
    },
    {
      type: 'multiple_choice',
      text: '[Listening Section] According to the speaker, what is the main limitation of the classical migration theory model?',
      options: [
        'It fails to incorporate macroeconomic factors.',
        'It assumes perfect information flow between regions.',
        'It overemphasizes technological advancements.',
        'It ignores regional border regulations.'
      ],
      correctAnswer: '1',
      points: 1,
      skillCategory: 'listening'
    },
    {
      type: 'multiple_choice',
      text: '[Listening Section] Why does the professor mention the trade guild archives?',
      options: [
        'To question the accuracy of official census records.',
        'To provide primary source evidence of urban labor demands.',
        'To contrast modern merchant unions with historical guilds.',
        'To introduce the concept of medieval currency fluctuation.'
      ],
      correctAnswer: '1',
      points: 1,
      skillCategory: 'listening'
    }
  ],
  writing: [
    {
      type: 'short_answer',
      text: '[Integrated Writing Task] Read the provided passage on academic specialization. Synthesize the arguments presented in the lecture to explain how they challenge the benefits claimed in the reading passage. (Target: 250-300 words)',
      points: 2,
      skillCategory: 'writing'
    },
    {
      type: 'short_answer',
      text: '[Independent Writing Task] Do you agree or disagree with the following statement?\n"Universities should require all students to complete courses in philosophy and ethics, regardless of their major fields of study."\nProvide specific arguments and examples to defend your stance.',
      points: 3,
      skillCategory: 'writing'
    }
  ],
  speaking: [
    {
      type: 'short_answer',
      text: '[Independent Speaking Task] Many universities are moving towards fully digital lecture libraries. Explain whether you believe physical attendance in lectures is still necessary for academic success. State your reasons clearly.',
      points: 2,
      skillCategory: 'speaking'
    },
    {
      type: 'short_answer',
      text: '[Integrated Speaking Task] Read the campus policy regarding mandatory internships, then listen to the student debate. Summarize the main points of disagreement and explain the arguments presented by the opposing student.',
      points: 3,
      skillCategory: 'speaking'
    }
  ],
  writing_listening: [
    {
      type: 'multiple_choice',
      text: '[Listening Task] Listen to the audio report on environmental economics. What is the speaker\'s opinion on green subsidies?',
      options: [
        'They are highly ineffective due to market saturation.',
        'They yield substantial long-term benefits despite initial high costs.',
        'They should only be applied to agricultural sectors.',
        'They are secondary to carbon taxation mechanisms.'
      ],
      correctAnswer: '1',
      points: 2,
      skillCategory: 'listening'
    },
    {
      type: 'short_answer',
      text: '[Writing Task] Based on the environmental economics lecture, write an analytical summary discussing the balance between market-based incentives and direct government regulations.',
      points: 3,
      skillCategory: 'writing'
    }
  ],
  writing_speaking: [
    {
      type: 'short_answer',
      text: '[Writing Section] Analytical Essay: Discuss the impact of language globalization on indigenous dialects. Analyze both cultural preservation and socio-economic integration factors.',
      points: 2,
      skillCategory: 'writing'
    },
    {
      type: 'short_answer',
      text: '[Speaking Section] Deliver a 2-minute synthesis of your globalization essay. Emphasize your key arguments, evidence, and your final outlook.',
      points: 3,
      skillCategory: 'speaking'
    }
  ],
  complete: [
    {
      type: 'multiple_choice',
      text: '[Section A: Listening] Listen to the advisor discussing course prerequisites. What option is recommended for the student?',
      options: [
        'Taking a placement exam before registration.',
        'Enrolling in the introductory course during summer term.',
        'Submitting a formal waiver request to the dean.',
        'Waiting until next year when the requirement changes.'
      ],
      correctAnswer: '0',
      points: 1,
      skillCategory: 'listening'
    },
    {
      type: 'short_answer',
      text: '[Section B: Speaking] State your position on whether public research funding should favor applied sciences over theoretical research. Speak clearly.',
      points: 2,
      skillCategory: 'speaking'
    },
    {
      type: 'short_answer',
      text: '[Section C: Writing] Discuss how digital automation affects modern labor markets. Propose potential educational solutions to mitigate workforce disruption.',
      points: 2,
      skillCategory: 'writing'
    }
  ]
};

/**
 * ExamsService
 * Business logic for the exam/evaluation system.
 * All authorization and validation happens here — the repository only does DB I/O.
 */
export class ExamsService {

  // ============================================
  // HELPER: Verify teacher owns the class
  // ============================================
  private static async assertTeacherOwnsClass(classId: string, userId: string): Promise<void> {
    const classObj = await ClassesRepository.getById(classId);
    if (!classObj) throw new NotFoundError('Class not found');

    const user = await UsersRepository.getById(userId);
    if (!user) throw new NotFoundError('User not found');

    // Admin can do anything; teacher must own the class
    if (user.role !== 'admin' && classObj.teacher_id !== userId) {
      throw new ForbiddenError('Solo el profesor de la clase puede gestionar sus exámenes');
    }
  }

  // ============================================
  // HELPER: Verify student is enrolled in the class
  // ============================================
  private static async assertStudentEnrolled(classId: string, studentId: string): Promise<void> {
    const classIds = await EnrollmentsRepository.getStudentClasses(studentId);
    if (!classIds.includes(classId)) {
      throw new ForbiddenError('No estás inscrito en esta clase');
    }
  }

  // ============================================
  // HELPER: Verify student is in the exam group
  // ============================================
  private static async assertStudentInExamGroup(groupId: string | null, studentId: string): Promise<void> {
    if (!groupId) return;
    const isEnrolled = await getOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM enrollments WHERE student_id = $1 AND group_id = $2',
      [studentId, groupId]
    );
    if (!isEnrolled || isEnrolled.count === 0) {
      throw new ForbiddenError('No perteneces al grupo de este examen');
    }
  }

  // ============================================
  // EXAM MANAGEMENT (Teacher)
  // ============================================

  static async createExam(
    data: {
      classId: string;
      groupId?: string | null;
      title: string;
      description?: string;
      durationMinutes?: number;
      passingScore?: number;
      skillType?: string;
      questionCount?: number;
      availableFrom?: string | null;
      availableTo?: string | null;
    },
    teacherId: string
  ): Promise<Exam> {
    await this.assertTeacherOwnsClass(data.classId, teacherId);

    if (!data.title || data.title.trim().length < 3) {
      throw new ValidationError('El título del examen debe tener al menos 3 caracteres');
    }
    if (data.durationMinutes !== undefined && data.durationMinutes < 0) {
      throw new ValidationError('La duración no puede ser negativa');
    }
    if (data.passingScore !== undefined && (data.passingScore < 0 || data.passingScore > 100)) {
      throw new ValidationError('La nota mínima de aprobación debe ser entre 0 y 100');
    }

    const scaleMaxVal = 5.0; // scaleMax is fixed to 5.0 per user specification
    const questionCount = data.questionCount || 10;
    if (questionCount < 1 || questionCount > 100) {
      throw new ValidationError('La cantidad de preguntas debe estar entre 1 y 100');
    }

    const exam = await ExamsRepository.createExam({
      classId: data.classId,
      groupId: data.groupId,
      title: data.title.trim(),
      description: data.description?.trim(),
      durationMinutes: data.durationMinutes,
      passingScore: data.passingScore,
      scaleMax: scaleMaxVal,
      skillType: data.skillType,
      availableFrom: data.availableFrom,
      availableTo: data.availableTo,
      createdBy: teacherId,
    });

    // Dynamic points calculation to sum exactly 5.0
    const pointsPerQuestion = Number((5.0 / questionCount).toFixed(3));

    // Get the template questions for the requested skill
    const skill = data.skillType || 'complete';
    let templateQuestions = EXAM_TEMPLATES[skill];
    if (!templateQuestions || templateQuestions.length === 0) {
      templateQuestions = EXAM_TEMPLATES['complete'] || [];
    }

    // Insert exactly questionCount questions, looping through the template pool cyclically
    for (let i = 0; i < questionCount; i++) {
      const template = templateQuestions[i % templateQuestions.length];
      
      let points = pointsPerQuestion;
      if (i === questionCount - 1) {
        // Adjust the final question points to guarantee exact sum of 5.000
        points = Number((5.0 - (pointsPerQuestion * (questionCount - 1))).toFixed(3));
      }

      await ExamsRepository.addQuestion({
        examId: exam.id,
        type: template.type,
        text: template.text,
        options: template.options,
        correctAnswer: template.correctAnswer,
        points: points,
        skillCategory: template.skillCategory,
      });
    }

    return exam;
  }

  static async getExamsByClass(classId: string, requesterId: string): Promise<(Exam & { my_attempt_status?: string | null })[]> {
    const user = await UsersRepository.getById(requesterId);
    if (!user) throw new NotFoundError('User not found');

    if (user.role === 'student') {
      await this.assertStudentEnrolled(classId, requesterId);
      // Students only see active and closed exams that belong to their active groups or are global (null group_id)
      const enrollments = await getAll<{ group_id: string }>(
        `SELECT e.group_id 
         FROM enrollments e
         JOIN groups g ON g.id = e.group_id
         WHERE e.student_id = $1 AND g.class_id = $2 AND e.status = 'active' AND g.active = 1`,
        [requesterId, classId]
      );
      const studentGroupIds = enrollments.map(e => e.group_id);
      const exams = await ExamsRepository.getByClassAndGroups(classId, studentGroupIds);

      // Attach attempt status so the student UI knows if the exam was already taken
      const withAttempts = await Promise.all(exams.map(async (exam) => {
        const att = await getOne<{ status: string }>(
          `SELECT status FROM exam_attempts WHERE exam_id = $1 AND student_id = $2 ORDER BY started_at DESC LIMIT 1`,
          [exam.id, requesterId]
        );
        return { ...exam, my_attempt_status: att?.status ?? null };
      }));
      return withAttempts;
    }

    // Teacher/Admin: see all exams including drafts
    await this.assertTeacherOwnsClass(classId, requesterId);
    return await ExamsRepository.getByClass(classId, true);
  }

  static async getExamWithQuestions(
    examId: string,
    requesterId: string
  ): Promise<{ exam: Exam; questions: ExamQuestion[] }> {
    const exam = await ExamsRepository.getById(examId);
    if (!exam) throw new NotFoundError('Examen no encontrado');

    const user = await UsersRepository.getById(requesterId);
    if (!user) throw new NotFoundError('User not found');

    if (user.role === 'student') {
      // Students cannot see draft exams
      if (exam.status === 'draft') throw new ForbiddenError('Este examen no está disponible');
      await this.assertStudentEnrolled(exam.class_id, requesterId);
      await this.assertStudentInExamGroup(exam.group_id, requesterId);

      // Get questions but STRIP correct_answer from student view (prevent cheating)
      const questions = await ExamsRepository.getQuestionsByExam(examId);
      const sanitized = questions.map(q => ({ ...q, correct_answer: null }));
      return { exam, questions: sanitized };
    }

    // Teacher/Admin: see everything including correct answers
    await this.assertTeacherOwnsClass(exam.class_id, requesterId);
    const questions = await ExamsRepository.getQuestionsByExam(examId);
    return { exam, questions };
  }

  static async updateExam(
    examId: string,
    data: {
      groupId?: string | null;
      title?: string;
      description?: string;
      durationMinutes?: number;
      passingScore?: number;
      availableFrom?: string | null;
      availableTo?: string | null;
      scaleMax?: number;
      skillType?: string;
    },
    teacherId: string
  ): Promise<Exam> {
    const exam = await ExamsRepository.getById(examId);
    if (!exam) throw new NotFoundError('Examen no encontrado');

    await this.assertTeacherOwnsClass(exam.class_id, teacherId);

    // Validate time window if both dates provided
    if (data.availableFrom && data.availableTo) {
      const from = new Date(data.availableFrom);
      const to   = new Date(data.availableTo);
      if (from >= to) {
        throw new ValidationError('La fecha de apertura debe ser anterior al cierre');
      }
    }

    if (data.scaleMax !== undefined && (data.scaleMax < 1 || data.scaleMax > 100)) {
      throw new ValidationError('La nota máxima debe estar entre 1 y 100');
    }

    const updated = await ExamsRepository.updateExam(examId, data);
    if (!updated) throw new NotFoundError('Examen no encontrado después de actualizar');
    return updated;
  }

  static async publishExam(examId: string, teacherId: string): Promise<Exam> {
    const exam = await ExamsRepository.getById(examId);
    if (!exam) throw new NotFoundError('Examen no encontrado');

    if (exam.status !== 'draft') {
      throw new ValidationError(`El examen ya está en estado "${exam.status}"`);
    }

    await this.assertTeacherOwnsClass(exam.class_id, teacherId);

    // Must have at least one question
    const questions = await ExamsRepository.getQuestionsByExam(examId);
    if (questions.length === 0) {
      throw new ValidationError('El examen debe tener al menos una pregunta antes de publicarlo');
    }

    // Validate multiple_choice questions have correct_answer set
    const mcWithoutAnswer = questions.filter(
      q => q.type === 'multiple_choice' && !q.correct_answer
    );
    if (mcWithoutAnswer.length > 0) {
      throw new ValidationError(
        `${mcWithoutAnswer.length} pregunta(s) de opción múltiple no tienen respuesta correcta definida`
      );
    }

    const updated = await ExamsRepository.updateStatus(examId, 'active');
    if (!updated) throw new NotFoundError('Error al publicar el examen');
    return updated;
  }

  static async closeExam(examId: string, teacherId: string): Promise<Exam> {
    const exam = await ExamsRepository.getById(examId);
    if (!exam) throw new NotFoundError('Examen no encontrado');

    if (exam.status === 'closed') {
      throw new ValidationError('El examen ya está cerrado');
    }

    await this.assertTeacherOwnsClass(exam.class_id, teacherId);

    // Auto-submit any in_progress attempts so no student is left without a grade
    const allAttempts = await ExamsRepository.getAttemptsByExam(examId);
    const orphaned = allAttempts.filter((a) => a.status === 'in_progress');
    for (const att of orphaned) {
      try {
        await this.forceSubmitAttempt(att.id);
      } catch {
        // Best-effort: skip if something fails for a specific attempt
      }
    }

    const updated = await ExamsRepository.updateStatus(examId, 'closed');
    if (!updated) throw new NotFoundError('Error al cerrar el examen');
    return updated;
  }

  /**
   * Internal helper: force-submit an in_progress attempt without student auth check.
   * Used when the teacher closes an exam to grade orphaned attempts automatically.
   */
  private static async forceSubmitAttempt(attemptId: string): Promise<void> {
    const attempt = await ExamsRepository.getAttemptById(attemptId);
    if (!attempt || attempt.status !== 'in_progress') return;

    const questions = await ExamsRepository.getQuestionsByExam(attempt.exam_id);
    const answers   = await ExamsRepository.getAnswersByAttempt(attemptId);

    await ExamsRepository.gradeAndSaveAnswers(attemptId, questions, answers);

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const mcQuestions = questions.filter((q) => q.type === 'multiple_choice');
    let earnedPoints  = 0;
    for (const q of mcQuestions) {
      const answer = answers.find((a) => a.question_id === q.id);
      if (answer?.answer_text === q.correct_answer) earnedPoints += q.points;
    }

    const exam     = await ExamsRepository.getById(attempt.exam_id);
    const scaleMax = exam?.scale_max ? Number(exam.scale_max) : 5.0;
    const score    = totalPoints > 0
      ? Math.round((earnedPoints / totalPoints) * scaleMax * 100) / 100
      : 0;

    await ExamsRepository.submitAttempt(attemptId, { score, totalPoints, earnedPoints });
  }

  static async deleteExam(examId: string, teacherId: string): Promise<void> {
    const exam = await ExamsRepository.getById(examId);
    if (!exam) throw new NotFoundError('Examen no encontrado');

    if (exam.status !== 'draft') {
      throw new ValidationError('Solo se pueden eliminar exámenes en borrador. Cierra el examen primero.');
    }

    await this.assertTeacherOwnsClass(exam.class_id, teacherId);
    await ExamsRepository.deleteExam(examId);
  }

  // ============================================
  // QUESTION MANAGEMENT (Teacher)
  // ============================================

  static async addQuestion(
    examId: string,
    data: {
      type: 'multiple_choice' | 'short_answer';
      text: string;
      options?: string[];
      correctAnswer?: string;
      points?: number;
      skillCategory?: string;
      mediaUrl?: string | null;
    },
    teacherId: string
  ): Promise<ExamQuestion> {
    const exam = await ExamsRepository.getById(examId);
    if (!exam) throw new NotFoundError('Examen no encontrado');
    if (exam.status !== 'draft') throw new ValidationError('Solo se pueden editar preguntas de exámenes en borrador');

    await this.assertTeacherOwnsClass(exam.class_id, teacherId);

    if (!data.text || data.text.trim().length < 5) {
      throw new ValidationError('La pregunta debe tener al menos 5 caracteres');
    }

    if (data.type === 'multiple_choice') {
      if (!data.options || data.options.length < 2) {
        throw new ValidationError('Las preguntas de opción múltiple deben tener al menos 2 opciones');
      }
      if (data.options.length > 6) {
        throw new ValidationError('Máximo 6 opciones por pregunta');
      }
      if (data.correctAnswer === undefined) {
        throw new ValidationError('Debes indicar cuál es la respuesta correcta');
      }
      const idx = parseInt(data.correctAnswer, 10);
      if (isNaN(idx) || idx < 0 || idx >= data.options.length) {
        throw new ValidationError('La respuesta correcta debe ser un índice válido de las opciones');
      }
    }

    return await ExamsRepository.addQuestion({
      examId,
      type: data.type,
      text: data.text.trim(),
      options: data.options?.map(o => o.trim()),
      correctAnswer: data.correctAnswer,
      points: data.points ?? 1,
      skillCategory: data.skillCategory,
      mediaUrl: data.mediaUrl,
    });
  }

  static async updateQuestion(
    questionId: string,
    data: {
      text?: string;
      options?: string[];
      correctAnswer?: string | null;
      points?: number;
      skillCategory?: string;
      mediaUrl?: string | null;
    },
    teacherId: string
  ): Promise<ExamQuestion> {
    const question = await ExamsRepository.getQuestionById(questionId);
    if (!question) throw new NotFoundError('Pregunta no encontrada');

    const exam = await ExamsRepository.getById(question.exam_id);
    if (!exam || exam.status !== 'draft') throw new ValidationError('Solo se pueden editar preguntas de exámenes en borrador');

    await this.assertTeacherOwnsClass(exam.class_id, teacherId);

    const updated = await ExamsRepository.updateQuestion(questionId, data);
    if (!updated) throw new NotFoundError('Error al actualizar la pregunta');
    return updated;
  }

  static async deleteQuestion(questionId: string, teacherId: string): Promise<void> {
    const question = await ExamsRepository.getQuestionById(questionId);
    if (!question) throw new NotFoundError('Pregunta no encontrada');

    const exam = await ExamsRepository.getById(question.exam_id);
    if (!exam || exam.status !== 'draft') throw new ValidationError('Solo se pueden eliminar preguntas de exámenes en borrador');

    await this.assertTeacherOwnsClass(exam.class_id, teacherId);
    await ExamsRepository.deleteQuestion(questionId);
  }

  // ============================================
  // TEACHER: View Results
  // ============================================

  static async getExamResults(
    examId: string,
    teacherId: string
  ): Promise<{ exam: Exam; questions: ExamQuestion[]; attempts: any[] }> {
    const exam = await ExamsRepository.getById(examId);
    if (!exam) throw new NotFoundError('Examen no encontrado');

    await this.assertTeacherOwnsClass(exam.class_id, teacherId);

    const questions = await ExamsRepository.getQuestionsByExam(examId);
    const attempts  = await ExamsRepository.getAttemptsByExam(examId);

    return { exam, questions, attempts };
  }

  static async getAttemptDetail(
    attemptId: string,
    teacherId: string
  ): Promise<{ attempt: any; answers: any[] }> {
    const data = await ExamsRepository.getAttemptWithAnswers(attemptId);
    if (!data) throw new NotFoundError('Intento no encontrado');

    // Verify teacher owns the exam
    const exam = await ExamsRepository.getById(data.attempt.exam_id);
    if (!exam) throw new NotFoundError('Examen no encontrado');
    await this.assertTeacherOwnsClass(exam.class_id, teacherId);

    return data;
  }

  static async gradeAttemptAnswer(
    attemptId: string,
    questionId: string,
    pointsEarned: number,
    teacherId: string
  ): Promise<ExamAttempt> {
    const data = await ExamsRepository.getAttemptWithAnswers(attemptId);
    if (!data) throw new NotFoundError('Intento no encontrado');

    const exam = await ExamsRepository.getById(data.attempt.exam_id);
    if (!exam) throw new NotFoundError('Examen no encontrado');
    await this.assertTeacherOwnsClass(exam.class_id, teacherId);

    if (data.attempt.status === 'in_progress') {
      throw new ValidationError('El estudiante aún no ha enviado el examen');
    }

    // Validate points against question max
    const question = await ExamsRepository.getQuestionById(questionId);
    if (!question) throw new NotFoundError('Pregunta no encontrada');
    if (pointsEarned < 0 || pointsEarned > question.points) {
      throw new ValidationError(`Los puntos deben estar entre 0 y ${question.points}`);
    }

    await ExamsRepository.gradeAnswer(attemptId, questionId, pointsEarned);

    // Recalculate and finalize grading
    const updated = await ExamsRepository.finalizeGrading(attemptId);
    if (!updated) throw new NotFoundError('Error al actualizar la calificación');
    return updated;
  }

  // ============================================
  // STUDENT: Take Exam
  // ============================================

  static async startAttempt(examId: string, studentId: string): Promise<ExamAttempt> {
    const exam = await ExamsRepository.getById(examId);
    if (!exam) throw new NotFoundError('Examen no encontrado');

    // Must be active
    if (exam.status !== 'active') {
      throw new ValidationError('Este examen no está disponible actualmente');
    }

    // Check time window
    const now = new Date();
    if (exam.available_from && parseColombiaTs(exam.available_from) > now) {
      throw new ValidationError(`El examen aún no ha abierto. Disponible desde: ${parseColombiaTs(exam.available_from).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);
    }
    if (exam.available_to && parseColombiaTs(exam.available_to) < now) {
      throw new ValidationError('El período de este examen ya ha cerrado');
    }

    // Verify student is enrolled
    await this.assertStudentEnrolled(exam.class_id, studentId);
    await this.assertStudentInExamGroup(exam.group_id, studentId);

    // Check if already has an attempt
    const existing = await ExamsRepository.getAttemptByStudentAndExam(examId, studentId);
    if (existing) {
      if (existing.status !== 'in_progress') {
        throw new ConflictError('Ya completaste este examen');
      }
      // Return existing in-progress attempt (allows page refresh)
      return existing;
    }

    return await ExamsRepository.createAttempt(examId, studentId);
  }

  static async getMyAttempt(
    examId: string,
    studentId: string
  ): Promise<{ attempt: ExamAttempt; answers: ExamAnswer[] } | null> {
    const attempt = await ExamsRepository.getAttemptByStudentAndExam(examId, studentId);
    if (!attempt) return null;

    const answers = await ExamsRepository.getAnswersByAttempt(attempt.id);
    return { attempt, answers };
  }

  static async saveAnswer(
    attemptId: string,
    questionId: string,
    answerText: string | null,
    studentId: string
  ): Promise<ExamAnswer> {
    const attempt = await ExamsRepository.getAttemptById(attemptId);
    if (!attempt) throw new NotFoundError('Intento no encontrado');
    if (attempt.student_id !== studentId) throw new ForbiddenError('No autorizado');
    if (attempt.status !== 'in_progress') throw new ValidationError('Este intento ya fue enviado');

    // Validate question belongs to the exam
    const question = await ExamsRepository.getQuestionById(questionId);
    if (!question || question.exam_id !== attempt.exam_id) {
      throw new ValidationError('La pregunta no pertenece a este examen');
    }

    // Validate time hasn't expired
    const exam = await ExamsRepository.getById(attempt.exam_id);
    if (exam?.available_to && parseColombiaTs(exam.available_to) < new Date()) {
      // Auto-submit if time expired
      await this.submitAttempt(attemptId, studentId);
      throw new ValidationError('El tiempo del examen ha expirado. Tu examen fue enviado automáticamente.');
    }

    return await ExamsRepository.upsertAnswer({ attemptId, questionId, answerText });
  }

  static async submitAttempt(attemptId: string, studentId: string): Promise<ExamAttempt> {
    const attempt = await ExamsRepository.getAttemptById(attemptId);
    if (!attempt) throw new NotFoundError('Intento no encontrado');
    if (attempt.student_id !== studentId) throw new ForbiddenError('No autorizado');

    if (attempt.status !== 'in_progress') {
      throw new ValidationError('Este intento ya fue enviado');
    }

    const questions = await ExamsRepository.getQuestionsByExam(attempt.exam_id);
    const answers   = await ExamsRepository.getAnswersByAttempt(attemptId);

    // Auto-grade multiple_choice questions
    await ExamsRepository.gradeAndSaveAnswers(attemptId, questions, answers);

    // Calculate score (only MC questions are auto-graded)
    const totalPoints  = questions.reduce((sum, q) => sum + q.points, 0);
    const mcQuestions  = questions.filter(q => q.type === 'multiple_choice');
    let earnedPoints   = 0;

    for (const q of mcQuestions) {
      const answer = answers.find(a => a.question_id === q.id);
      if (answer?.answer_text === q.correct_answer) {
        earnedPoints += q.points;
      }
    }

    // Score is based on all questions total points and scaled to the exam scale_max (default 5.00)
    const exam = await ExamsRepository.getById(attempt.exam_id);
    const scaleMax = exam?.scale_max ? Number(exam.scale_max) : 5.00;
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * scaleMax * 100) / 100 : 0;

    const submitted = await ExamsRepository.submitAttempt(attemptId, {
      score,
      totalPoints,
      earnedPoints,
    });

    if (!submitted) throw new NotFoundError('Error al enviar el examen');
    return submitted;
  }

  /**
   * Get the grade-book for a class.
   * - Teacher/admin: sees all students.
   * - Student: sees only their own grades (filtered by studentId).
   */
  static async getGradesByClass(classId: string, requesterId: string) {
    const requester = await UsersRepository.getById(requesterId);
    if (!requester) throw new ForbiddenError('Usuario no encontrado');

    const isTeacher = requester.role === 'teacher' || requester.role === 'admin';

    if (isTeacher) {
      // Teacher must own the class (or be admin)
      if (requester.role !== 'admin') {
        await this.assertTeacherOwnsClass(classId, requesterId);
      }
      return ExamsRepository.getGradesByClass(classId);
    }

    // Student: only their own data
    return ExamsRepository.getGradesByClass(classId, requesterId);
  }
}
