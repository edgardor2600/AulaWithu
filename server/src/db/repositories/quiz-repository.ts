import { runQuery, getAll, getOne } from '../database';
import { logger } from '../../utils/logger';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface QuizData {
  title: string;
  subject: string;
  level: string;
  topic: string;
  questions_json: object[];
  created_by?: string;
}

export interface Quiz extends QuizData {
  id: number;
  created_at: string;
}

export interface QuizSummary {
  id: number;
  title: string;
  subject: string;
  level: string;
  topic: string;
  created_by?: string;
  created_at: string;
}

export interface StudentResultData {
  quiz_id: number;
  session_id: string;
  student_id?: string;
  student_name?: string;
  score: number;
  total_questions: number;
  answers_json: object[];
}

export interface StudentResult extends StudentResultData {
  id: number;
  created_at: string;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class QuizRepository {
  private static tableInitialized = false;

  private static async ensureTablesExist() {
    if (this.tableInitialized) return;
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS quizzes (
          id             SERIAL PRIMARY KEY,
          title          VARCHAR(255) NOT NULL,
          subject        VARCHAR(100) NOT NULL DEFAULT 'English',
          level          VARCHAR(50)  NOT NULL DEFAULT 'A2',
          topic          VARCHAR(255) NOT NULL,
          questions_json JSONB        NOT NULL DEFAULT '[]'::jsonb,
          created_by     VARCHAR(255),
          created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await runQuery(`
        CREATE TABLE IF NOT EXISTS quiz_student_results (
          id               SERIAL PRIMARY KEY,
          quiz_id          INT REFERENCES quizzes(id) ON DELETE CASCADE,
          session_id       VARCHAR(255) NOT NULL,
          student_id       VARCHAR(255),
          student_name     VARCHAR(255),
          score            INT NOT NULL DEFAULT 0,
          total_questions  INT NOT NULL DEFAULT 0,
          answers_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      this.tableInitialized = true;
    } catch (err: any) {
      logger.warn(`[QuizRepository] Could not auto-create tables: ${err.message}`);
    }
  }

  /**
   * Save a new quiz to the library
   */
  static async saveQuiz(data: QuizData): Promise<Quiz | null> {
    await this.ensureTablesExist();
    try {
      const result = await runQuery(
        `INSERT INTO quizzes (title, subject, level, topic, questions_json, created_by)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)
         RETURNING *`,
        [
          data.title,
          data.subject,
          data.level,
          data.topic,
          JSON.stringify(data.questions_json),
          data.created_by || null,
        ]
      );
      return result.rows[0] || null;
    } catch (err: any) {
      logger.error(`[QuizRepository] Error in saveQuiz: ${err.message}`);
      return null;
    }
  }

  /**
   * List all quizzes (lightweight — includes questions_json for preview)
   */
  static async getAllQuizzes(): Promise<QuizSummary[]> {
    await this.ensureTablesExist();
    try {
      const rows = await getAll(
        `SELECT id, title, subject, level, topic, created_by, created_at
         FROM quizzes
         ORDER BY created_at DESC
         LIMIT 100`
      );
      return (rows || []) as QuizSummary[];
    } catch (err: any) {
      logger.error(`[QuizRepository] Error in getAllQuizzes: ${err.message}`);
      return [];
    }
  }

  /**
   * Get full quiz by id (includes questions_json)
   */
  static async getQuizById(id: number): Promise<Quiz | null> {
    await this.ensureTablesExist();
    try {
      const row = await getOne(
        `SELECT * FROM quizzes WHERE id = $1`,
        [id]
      );
      return (row || null) as Quiz | null;
    } catch (err: any) {
      logger.error(`[QuizRepository] Error in getQuizById: ${err.message}`);
      return null;
    }
  }

  /**
   * Delete quiz by id
   */
  static async deleteQuiz(id: number): Promise<boolean> {
    await this.ensureTablesExist();
    try {
      const result = await runQuery(
        `DELETE FROM quizzes WHERE id = $1`,
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (err: any) {
      logger.error(`[QuizRepository] Error in deleteQuiz: ${err.message}`);
      return false;
    }
  }

  /**
   * Save a student result for a quiz session
   */
  static async saveStudentResult(data: StudentResultData): Promise<void> {
    await this.ensureTablesExist();
    try {
      await runQuery(
        `INSERT INTO quiz_student_results
          (quiz_id, session_id, student_id, student_name, score, total_questions, answers_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          data.quiz_id,
          data.session_id,
          data.student_id || null,
          data.student_name || null,
          data.score,
          data.total_questions,
          JSON.stringify(data.answers_json),
        ]
      );
    } catch (err: any) {
      logger.error(`[QuizRepository] Error in saveStudentResult: ${err.message}`);
    }
  }

  /**
   * Get all results for a quiz in a specific session
   */
  static async getResultsBySession(quizId: number, sessionId: string): Promise<StudentResult[]> {
    await this.ensureTablesExist();
    try {
      const rows = await getAll(
        `SELECT * FROM quiz_student_results
         WHERE quiz_id = $1 AND session_id = $2
         ORDER BY created_at ASC`,
        [quizId, sessionId]
      );
      return (rows || []) as StudentResult[];
    } catch (err: any) {
      logger.error(`[QuizRepository] Error in getResultsBySession: ${err.message}`);
      return [];
    }
  }
}
