import { runQuery, getOne, getAll } from '../database';
import { Exam, ExamQuestion, ExamAttempt, ExamAnswer } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * ExamsRepository
 * Data access layer for the exam system.
 * All business rules are enforced in ExamsService — this layer only does DB I/O.
 */
export class ExamsRepository {

  // ============================================
  // EXAM CRUD
  // ============================================

  static async createExam(data: {
    classId: string;
    groupId?: string | null;
    title: string;
    description?: string;
    durationMinutes?: number;
    passingScore?: number;
    scaleMax?: number;
    skillType?: string;
    availableFrom?: string | null;
    availableTo?: string | null;
    createdBy: string;
  }): Promise<Exam> {
    const id = generateId();
    await runQuery(
      `INSERT INTO exams (id, class_id, group_id, title, description, duration_minutes, passing_score, scale_max, skill_type, available_from, available_to, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', $12)`,
      [
        id,
        data.classId,
        data.groupId || null,
        data.title,
        data.description || null,
        data.durationMinutes ?? 60,
        data.passingScore ?? 60,
        data.scaleMax ?? 5.00,
        data.skillType ?? 'complete',
        data.availableFrom || null,
        data.availableTo || null,
        data.createdBy,
      ]
    );
    const exam = await this.getById(id);
    if (!exam) throw new Error('Failed to create exam');
    return exam;
  }

  static async getById(id: string): Promise<Exam | undefined> {
    return await getOne<Exam>(`SELECT * FROM exams WHERE id = $1`, [id]);
  }

  static async getByClass(classId: string, includeAll = false): Promise<Exam[]> {
    // If includeAll=false, only return non-draft exams (for students)
    const query = includeAll
      ? `SELECT * FROM exams WHERE class_id = $1 ORDER BY created_at DESC`
      : `SELECT * FROM exams WHERE class_id = $1 AND status != 'draft' ORDER BY created_at DESC`;
    return await getAll<Exam>(query, [classId]);
  }

  static async getByClassAndGroups(classId: string, groupIds: string[]): Promise<Exam[]> {
    if (groupIds.length === 0) {
      return await getAll<Exam>(
        `SELECT * FROM exams WHERE class_id = $1 AND status != 'draft' AND group_id IS NULL ORDER BY created_at DESC`,
        [classId]
      );
    }
    return await getAll<Exam>(
      `SELECT * FROM exams WHERE class_id = $1 AND status != 'draft' AND (group_id IS NULL OR group_id = ANY($2)) ORDER BY created_at DESC`,
      [classId, groupIds]
    );
  }

  static async updateExam(
    id: string,
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
    }
  ): Promise<Exam | undefined> {
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];
    let i = 1;

    if (data.groupId !== undefined)       { updates.push(`group_id = $${i++}`);           params.push(data.groupId); }
    if (data.title !== undefined)         { updates.push(`title = $${i++}`);             params.push(data.title); }
    if (data.description !== undefined)   { updates.push(`description = $${i++}`);        params.push(data.description); }
    if (data.durationMinutes !== undefined){ updates.push(`duration_minutes = $${i++}`);   params.push(data.durationMinutes); }
    if (data.passingScore !== undefined)  { updates.push(`passing_score = $${i++}`);      params.push(data.passingScore); }
    if (data.availableFrom !== undefined) { updates.push(`available_from = $${i++}`);     params.push(data.availableFrom); }
    if (data.availableTo !== undefined)   { updates.push(`available_to = $${i++}`);       params.push(data.availableTo); }
    if (data.scaleMax !== undefined)      { updates.push(`scale_max = $${i++}`);          params.push(data.scaleMax); }
    if (data.skillType !== undefined)     { updates.push(`skill_type = $${i++}`);         params.push(data.skillType); }

    if (updates.length === 1) return await this.getById(id); // nothing changed

    params.push(id);
    await runQuery(`UPDATE exams SET ${updates.join(', ')} WHERE id = $${i}`, params);
    return await this.getById(id);
  }

  static async updateStatus(id: string, status: 'draft' | 'active' | 'closed'): Promise<Exam | undefined> {
    await runQuery(
      `UPDATE exams SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, id]
    );
    return await this.getById(id);
  }

  static async deleteExam(id: string): Promise<boolean> {
    const result = await runQuery(`DELETE FROM exams WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // ============================================
  // QUESTION CRUD
  // ============================================

  static async addQuestion(data: {
    examId: string;
    type: 'multiple_choice' | 'short_answer';
    text: string;
    options?: string[];
    correctAnswer?: string;
    points?: number;
    skillCategory?: string;
    mediaUrl?: string | null;
  }): Promise<ExamQuestion> {
    const id = generateId();

    // Determine next question_number
    const countResult = await getOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = $1`,
      [data.examId]
    );
    const questionNumber = (Number(countResult?.count) || 0) + 1;

    const optionsJson = data.options ? JSON.stringify(data.options) : null;

    await runQuery(
      `INSERT INTO exam_questions (id, exam_id, question_number, type, text, options, correct_answer, points, skill_category, media_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        data.examId,
        questionNumber,
        data.type,
        data.text,
        optionsJson,
        data.correctAnswer || null,
        data.points ?? 1,
        data.skillCategory ?? 'complete',
        data.mediaUrl || null,
      ]
    );

    const question = await this.getQuestionById(id);
    if (!question) throw new Error('Failed to create question');
    return question;
  }

  static async getQuestionById(id: string): Promise<ExamQuestion | undefined> {
    const row = await getOne<any>(`SELECT * FROM exam_questions WHERE id = $1`, [id]);
    if (!row) return undefined;
    return this.parseQuestion(row);
  }

  static async getQuestionsByExam(examId: string): Promise<ExamQuestion[]> {
    const rows = await getAll<any>(
      `SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY question_number ASC`,
      [examId]
    );
    return rows.map(this.parseQuestion);
  }

  static async updateQuestion(
    id: string,
    data: {
      text?: string;
      options?: string[];
      correctAnswer?: string | null;
      points?: number;
      skillCategory?: string;
      mediaUrl?: string | null;
    }
  ): Promise<ExamQuestion | undefined> {
    const updates: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (data.text !== undefined)          { updates.push(`text = $${i++}`);           params.push(data.text); }
    if (data.options !== undefined)       { updates.push(`options = $${i++}`);        params.push(JSON.stringify(data.options)); }
    if (data.correctAnswer !== undefined) { updates.push(`correct_answer = $${i++}`); params.push(data.correctAnswer); }
    if (data.points !== undefined)        { updates.push(`points = $${i++}`);         params.push(data.points); }
    if (data.skillCategory !== undefined) { updates.push(`skill_category = $${i++}`); params.push(data.skillCategory); }
    if (data.mediaUrl !== undefined)      { updates.push(`media_url = $${i++}`);      params.push(data.mediaUrl); }

    if (updates.length === 0) return await this.getQuestionById(id);

    params.push(id);
    await runQuery(`UPDATE exam_questions SET ${updates.join(', ')} WHERE id = $${i}`, params);
    return await this.getQuestionById(id);
  }

  static async deleteQuestion(id: string): Promise<boolean> {
    // After delete, renumber remaining questions for consistency
    const question = await this.getQuestionById(id);
    if (!question) return false;

    const result = await runQuery(`DELETE FROM exam_questions WHERE id = $1`, [id]);
    if ((result.rowCount ?? 0) > 0) {
      // Renumber remaining questions
      await runQuery(
        `UPDATE exam_questions SET question_number = sq.rn
         FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY question_number) as rn
               FROM exam_questions WHERE exam_id = $1) sq
         WHERE exam_questions.id = sq.id`,
        [question.exam_id]
      );
    }
    return (result.rowCount ?? 0) > 0;
  }

  /** Parse raw DB row (options is JSONB string) into ExamQuestion */
  private static parseQuestion(row: any): ExamQuestion {
    return {
      ...row,
      options: row.options ? (typeof row.options === 'string' ? JSON.parse(row.options) : row.options) : null,
      points: Number(row.points),
    };
  }

  // ============================================
  // ATTEMPT OPERATIONS
  // ============================================

  static async createAttempt(examId: string, studentId: string): Promise<ExamAttempt> {
    const id = generateId();
    await runQuery(
      `INSERT INTO exam_attempts (id, exam_id, student_id, status)
       VALUES ($1, $2, $3, 'in_progress')`,
      [id, examId, studentId]
    );
    const attempt = await this.getAttemptById(id);
    if (!attempt) throw new Error('Failed to create attempt');
    return attempt;
  }

  static async getAttemptById(id: string): Promise<ExamAttempt | undefined> {
    return await getOne<ExamAttempt>(`SELECT * FROM exam_attempts WHERE id = $1`, [id]);
  }

  static async getAttemptByStudentAndExam(
    examId: string,
    studentId: string
  ): Promise<ExamAttempt | undefined> {
    return await getOne<ExamAttempt>(
      `SELECT * FROM exam_attempts WHERE exam_id = $1 AND student_id = $2`,
      [examId, studentId]
    );
  }

  static async getAttemptsByExam(examId: string): Promise<(ExamAttempt & { student_name: string; student_username: string })[]> {
    return await getAll<ExamAttempt & { student_name: string; student_username: string }>(
      `SELECT ea.*, u.name as student_name, u.username as student_username
       FROM exam_attempts ea
       LEFT JOIN users u ON u.id = ea.student_id
       WHERE ea.exam_id = $1 ORDER BY ea.started_at DESC`,
      [examId]
    );
  }

  static async getAttemptWithAnswers(attemptId: string): Promise<{ attempt: ExamAttempt & { student_name: string }; answers: (ExamAnswer & { question_text: string; question_type: string; correct_answer: string | null; points: number; skill_category: string })[] } | null> {
    const attempt = await getOne<ExamAttempt & { student_name: string }>(
      `SELECT ea.*, u.name as student_name FROM exam_attempts ea
       LEFT JOIN users u ON u.id = ea.student_id
       WHERE ea.id = $1`,
      [attemptId]
    );
    if (!attempt) return null;

    const answers = await getAll<ExamAnswer & { question_text: string; question_type: string; correct_answer: string | null; points: number; skill_category: string }>(
      `SELECT ans.*, q.text as question_text, q.type as question_type, q.correct_answer, q.points, q.skill_category
       FROM exam_answers ans
       JOIN exam_questions q ON q.id = ans.question_id
       WHERE ans.attempt_id = $1
       ORDER BY q.question_number ASC`,
      [attemptId]
    );
    return { attempt, answers };
  }

  static async gradeAnswer(attemptId: string, questionId: string, pointsEarned: number, teacherComment?: string | null): Promise<void> {
    await runQuery(
      `UPDATE exam_answers SET points_earned = $1, is_correct = ($1 > 0)
       WHERE attempt_id = $2 AND question_id = $3`,
      [pointsEarned, attemptId, questionId]
    );
  }

  static async finalizeGrading(attemptId: string): Promise<ExamAttempt | undefined> {
    // Recalculate score from all answers
    const result = await getOne<{ total: number; earned: number; exam_scale_max: number }>(
      `SELECT
        (SELECT SUM(q.points) FROM exam_questions q WHERE q.exam_id = ea.exam_id) as total,
        COALESCE(SUM(ans.points_earned), 0) as earned,
        COALESCE(e.scale_max, 5.0) as exam_scale_max
       FROM exam_attempts ea
       JOIN exams e ON e.id = ea.exam_id
       LEFT JOIN exam_answers ans ON ans.attempt_id = ea.id
       WHERE ea.id = $1
       GROUP BY ea.exam_id, e.scale_max`,
      [attemptId]
    );
    if (!result) return undefined;

    const score = result.total > 0 ? Math.round((result.earned / result.total) * result.exam_scale_max * 100) / 100 : 0;
    await runQuery(
      `UPDATE exam_attempts SET status = 'graded', score = $1, earned_points = $2, total_points = $3 WHERE id = $4`,
      [score, result.earned, result.total, attemptId]
    );
    return await this.getAttemptById(attemptId);
  }

  static async submitAttempt(
    attemptId: string,
    data: {
      score: number;
      totalPoints: number;
      earnedPoints: number;
    }
  ): Promise<ExamAttempt | undefined> {
    await runQuery(
      `UPDATE exam_attempts
       SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP,
           score = $1, total_points = $2, earned_points = $3
       WHERE id = $4`,
      [data.score, data.totalPoints, data.earnedPoints, attemptId]
    );
    return await this.getAttemptById(attemptId);
  }

  // ============================================
  // ANSWER OPERATIONS (upsert pattern)
  // ============================================

  static async upsertAnswer(data: {
    attemptId: string;
    questionId: string;
    answerText: string | null;
  }): Promise<ExamAnswer> {
    // Check if answer already exists
    const existing = await getOne<ExamAnswer>(
      `SELECT * FROM exam_answers WHERE attempt_id = $1 AND question_id = $2`,
      [data.attemptId, data.questionId]
    );

    if (existing) {
      await runQuery(
        `UPDATE exam_answers SET answer_text = $1, answered_at = CURRENT_TIMESTAMP
         WHERE attempt_id = $2 AND question_id = $3`,
        [data.answerText, data.attemptId, data.questionId]
      );
      const updated = await getOne<ExamAnswer>(
        `SELECT * FROM exam_answers WHERE attempt_id = $1 AND question_id = $2`,
        [data.attemptId, data.questionId]
      );
      return updated!;
    }

    const id = generateId();
    await runQuery(
      `INSERT INTO exam_answers (id, attempt_id, question_id, answer_text)
       VALUES ($1, $2, $3, $4)`,
      [id, data.attemptId, data.questionId, data.answerText]
    );
    const answer = await getOne<ExamAnswer>(
      `SELECT * FROM exam_answers WHERE id = $1`,
      [id]
    );
    return answer!;
  }

  static async getAnswersByAttempt(attemptId: string): Promise<ExamAnswer[]> {
    return await getAll<ExamAnswer>(
      `SELECT * FROM exam_answers WHERE attempt_id = $1`,
      [attemptId]
    );
  }

  /** Grade and save all auto-gradeable answers for an attempt */
  static async gradeAndSaveAnswers(
    attemptId: string,
    questions: ExamQuestion[],
    answers: ExamAnswer[]
  ): Promise<void> {
    for (const q of questions) {
      if (q.type !== 'multiple_choice' || q.correct_answer === null) continue;

      const answer = answers.find(a => a.question_id === q.id);
      const isCorrect = answer?.answer_text === q.correct_answer;
      const pointsEarned = isCorrect ? q.points : 0;

      if (answer) {
        await runQuery(
          `UPDATE exam_answers SET is_correct = $1, points_earned = $2
           WHERE attempt_id = $3 AND question_id = $4`,
          [isCorrect, pointsEarned, attemptId, q.id]
        );
      }
    }
  }

  /**
   * Get the grade-book for a class.
   * Returns:
   *   - exams: all non-draft exams for the class
   *   - rows:  one entry per (student, exam) where an attempt exists
   *
   * @param classId   The class to query
   * @param studentId If provided, only return rows for this student (student view)
   */
  static async getGradesByClass(
    classId: string,
    studentId?: string
  ): Promise<{
    exams: { id: string; title: string; scale_max: number; passing_score: number; status: string; skill_type: string | null }[];
    rows: { student_id: string; student_name: string; student_username: string; exam_id: string; score: number | null; status: string; submitted_at: string | null }[];
  }> {
    const exams = await getAll<any>(
      `SELECT id, title, scale_max, passing_score, status, skill_type
       FROM exams
       WHERE class_id = $1 AND status != 'draft'
       ORDER BY created_at ASC`,
      [classId]
    );

    const studentFilter = studentId ? `AND ea.student_id = $2` : '';
    const params: any[] = studentId ? [classId, studentId] : [classId];

    const rows = await getAll<any>(
      `SELECT
         ea.student_id,
         COALESCE(u.name, u.username) AS student_name,
         u.username                    AS student_username,
         ea.exam_id,
         ea.score,
         ea.status,
         ea.submitted_at
       FROM exam_attempts ea
       JOIN exams e ON e.id = ea.exam_id
       JOIN users u ON u.id = ea.student_id
       WHERE e.class_id = $1
         AND ea.status != 'in_progress'
         ${studentFilter}
       ORDER BY student_name ASC, e.created_at ASC`,
      params
    );

    return { exams, rows };
  }
}
