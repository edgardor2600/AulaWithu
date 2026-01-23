import { runQuery, getOne, getAll } from '../database';
import { Session } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * SessionsRepository
 */
export class SessionsRepository {
  
  /**
   * Generate a unique 6-character session code (e.g., "ABC123")
   */
  private static generateSessionCode(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    
    let code = '';
    for (let i = 0; i < 3; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    
    return code;
  }

  /**
   * Create a new live session
   */
  static async create(data: {
    class_id: string;
    slide_id: string;
    teacher_id: string;
    allow_student_draw?: boolean;
  }): Promise<Session> {
    const id = generateId();
    const sessionCode = this.generateSessionCode();
    
    await runQuery(
      `INSERT INTO sessions (
        id, class_id, slide_id, teacher_id, session_code, allow_student_draw, status, yjs_room_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        data.class_id,
        data.slide_id,
        data.teacher_id,
        sessionCode,
        data.allow_student_draw ? 1 : 0,
        'active',
        `session-${sessionCode}`
      ]
    );
    
    const sess = await this.getById(id);
    if (!sess) throw new Error('Failed to create session');
    return sess;
  }

  /**
   * Get session by ID
   */
  static async getById(id: string): Promise<Session | undefined> {
    return await getOne<Session>(
      `SELECT * FROM sessions WHERE id = $1`,
      [id]
    );
  }

  /**
   * Get session by session code
   */
  static async getByCode(sessionCode: string): Promise<Session | undefined> {
    return await getOne<Session>(
      `SELECT * FROM sessions WHERE session_code = $1`,
      [sessionCode]
    );
  }

  /**
   * Get active session for a specific slide
   */
  static async getActiveBySlide(slideId: string): Promise<Session | undefined> {
    return await getOne<Session>(
      `SELECT * FROM sessions 
       WHERE slide_id = $1 AND is_active = 1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [slideId]
    );
  }

  /**
   * Get all active sessions for a teacher
   */
  static async getActiveByTeacher(teacherId: string): Promise<Session[]> {
    return await getAll<Session>(
      `SELECT * FROM sessions 
       WHERE teacher_id = $1 AND is_active = 1 
       ORDER BY created_at DESC`,
      [teacherId]
    );
  }

  /**
   * Get all sessions for a class
   */
  static async getByClass(classId: string): Promise<Session[]> {
    return await getAll<Session>(
      `SELECT * FROM sessions 
       WHERE class_id = $1 
       ORDER BY created_at DESC`,
      [classId]
    );
  }

  /**
   * Update session permissions
   */
  static async updatePermissions(id: string, allowStudentDraw: boolean): Promise<Session | undefined> {
    await runQuery(
      `UPDATE sessions 
       SET allow_student_draw = $1 
       WHERE id = $2`,
      [allowStudentDraw ? 1 : 0, id]
    );
    
    return await this.getById(id);
  }

  /**
   * Update current slide
   */
  static async updateSlide(id: string, slideId: string): Promise<Session | undefined> {
    await runQuery(
      `UPDATE sessions 
       SET slide_id = $1 
       WHERE id = $2`,
      [slideId, id]
    );
    
    return await this.getById(id);
  }

  /**
   * End a session
   */
  static async end(id: string): Promise<Session | undefined> {
    await runQuery(
      `UPDATE sessions 
       SET is_active = 0, ended_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );
    
    return await this.getById(id);
  }

  /**
   * Delete a session
   */
  static async delete(id: string): Promise<boolean> {
    const result = await runQuery(
      `DELETE FROM sessions WHERE id = $1`,
      [id]
    );
    
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete sessions by class
   */
  static async deleteByClass(classId: string): Promise<number> {
    const result = await runQuery(
      `DELETE FROM sessions WHERE class_id = $1`,
      [classId]
    );
    
    return (result.rowCount ?? 0);
  }

  /**
   * Delete sessions by slide
   */
  static async deleteBySlide(slideId: string): Promise<number> {
    const result = await runQuery(
      `DELETE FROM sessions WHERE slide_id = $1`,
      [slideId]
    );
    
    return (result.rowCount ?? 0);
  }

  /**
   * Check if a session code already exists
   */
  static async codeExists(sessionCode: string): Promise<boolean> {
    const result = await getOne<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM sessions WHERE session_code = $1`,
      [sessionCode]
    );
    
    return (Number(result?.count) || 0) > 0;
  }

  /**
   * Get session statistics
   */
  static async getStats(teacherId?: string): Promise<{
    total: number;
    active: number;
    ended: number;
  }> {
    const query = teacherId
      ? `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as ended
         FROM sessions 
         WHERE teacher_id = $1`
      : `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as ended
         FROM sessions`;
    
    const params = teacherId ? [teacherId] : [];
    const result = await getOne<{ total: string | number; active: string | number; ended: string | number }>(query, params);
    
    if (!result) return { total: 0, active: 0, ended: 0 };

    return {
      total: Number(result.total) || 0,
      active: Number(result.active) || 0,
      ended: Number(result.ended) || 0
    };
  }
}
