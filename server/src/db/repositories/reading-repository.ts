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
  static async saveAttempt(data: StudentReadingAttempt): Promise<StudentReadingAttempt> {
    const result = await runQuery(
      `INSERT INTO student_reading_attempts (
        session_id, student_id, story_title, story_text, wpm_setting,
        overall_score, pronunciation_score, feedback, audio_url, words_alignment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.session_id,
        data.student_id,
        data.story_title || 'Historia de Lectura',
        data.story_text,
        data.wpm_setting,
        data.overall_score,
        data.pronunciation_score,
        data.feedback || '',
        data.audio_url || '',
        JSON.stringify(data.words_alignment || []),
      ]
    );

    return result.rows[0] as StudentReadingAttempt;
  }

  /**
   * Get all reading attempts for a session
   */
  static async getAttemptsBySession(sessionId: string): Promise<StudentReadingAttempt[]> {
    const result = await runQuery(
      `SELECT r.*, u.name as student_name 
       FROM student_reading_attempts r
       LEFT JOIN users u ON r.student_id = u.id
       WHERE r.session_id = $1 
       ORDER BY r.created_at DESC`,
      [sessionId]
    );
    return result.rows as StudentReadingAttempt[];
  }

  /**
   * Get all reading attempts for a student
   */
  static async getAttemptsByStudent(studentId: string): Promise<StudentReadingAttempt[]> {
    const result = await runQuery(
      `SELECT * FROM student_reading_attempts 
       WHERE student_id = $1 
       ORDER BY created_at DESC`,
      [studentId]
    );
    return result.rows as StudentReadingAttempt[];
  }
}
