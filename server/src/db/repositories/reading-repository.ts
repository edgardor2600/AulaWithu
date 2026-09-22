import { runQuery } from '../database';

export interface StudentReadingAttempt {
  id?: number;
  session_id: string;
  student_id: string;
  story_title?: string;
  story_text: string;
  wpm_setting: number;
  overall_score: number;
  pronunciation_score: number;
  feedback?: string;
  audio_url?: string;
  words_alignment: any[];
  created_at?: string;
}

export class ReadingRepository {
  /**
   * Save a new student reading attempt
   */
  static async saveAttempt(data: StudentReadingAttempt): Promise<StudentReadingAttempt | null> {
    try {
      const result = await runQuery(
        `INSERT INTO student_reading_attempts (
          session_id, student_id, story_title, story_text, wpm_setting,
          overall_score, pronunciation_score, feedback, audio_url, words_alignment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          data.session_id || 'default_session',
          data.student_id || 'anonymous',
          data.story_title || 'Historia de Lectura',
          data.story_text || '',
          data.wpm_setting || 120,
          data.overall_score || 0,
          data.pronunciation_score || 0,
          data.feedback || '',
          data.audio_url || '',
          JSON.stringify(data.words_alignment || []),
        ]
      );
      return (result.rows[0] as StudentReadingAttempt) || null;
    } catch (err: any) {
      console.error('[ReadingRepository] saveAttempt error:', err.message);
      return null;
    }
  }

  /**
   * Get all reading attempts for a session
   */
  static async getAttemptsBySession(sessionId: string): Promise<StudentReadingAttempt[]> {
    try {
      const result = await runQuery(
        `SELECT r.*, COALESCE(u.name, 'Estudiante') as student_name 
         FROM student_reading_attempts r
         LEFT JOIN users u ON r.student_id = u.id
         WHERE r.session_id = $1 
         ORDER BY r.created_at DESC`,
        [sessionId]
      );
      return (result.rows as StudentReadingAttempt[]) || [];
    } catch (err: any) {
      console.warn('[ReadingRepository] getAttemptsBySession fallback:', err.message);
      return [];
    }
  }

  /**
   * Get all reading attempts for a student
   */
  static async getAttemptsByStudent(studentId: string): Promise<StudentReadingAttempt[]> {
    try {
      const result = await runQuery(
        `SELECT * FROM student_reading_attempts 
         WHERE student_id = $1 
         ORDER BY created_at DESC`,
        [studentId]
      );
      return (result.rows as StudentReadingAttempt[]) || [];
    } catch (err: any) {
      console.warn('[ReadingRepository] getAttemptsByStudent fallback:', err.message);
      return [];
    }
  }

  /**
   * Delete a reading attempt by ID
   */
  static async deleteAttempt(id: number | string): Promise<boolean> {
    try {
      const result = await runQuery(`DELETE FROM student_reading_attempts WHERE id = $1`, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (err: any) {
      console.error('[ReadingRepository] deleteAttempt error:', err.message);
      return false;
    }
  }
}
