import { runQuery, getOne, getAll } from '../database';
import { Session } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * SessionsRepository
 * 
 * Data access layer for live collaboration sessions.
 * Follows repository pattern for clean architecture and testability.
 * 
 * Responsibilities:
 * - CRUD operations for sessions
 * - Session code generation
 * - Active session queries
 * - No business logic (that belongs in SessionService)
 */
export class SessionsRepository {
  
  /**
   * Generate a unique 6-character session code (e.g., "ABC123")
   * Format: 3 uppercase letters + 3 digits
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
   * 
   * @param data Session creation data
   * @returns Created session with generated code
   * @throws Error if session_code collision (retry in service layer)
   */
  static create(data: {
    class_id: string;
    slide_id: string;
    teacher_id: string;
    allow_student_draw?: boolean;
  }): Session {
    const id = generateId();
    const sessionCode = this.generateSessionCode();
    
    runQuery(
      `INSERT INTO sessions (
        id, class_id, slide_id, teacher_id, session_code, allow_student_draw
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.class_id,
        data.slide_id,
        data.teacher_id,
        sessionCode,
        data.allow_student_draw ? 1 : 0
      ]
    );
    
    return this.getById(id)!;
  }

  /**
   * Get session by ID
   */
  static getById(id: string): Session | undefined {
    return getOne<Session>(
      `SELECT * FROM sessions WHERE id = ?`,
      [id]
    );
  }

  /**
   * Get session by session code
   * Used when students join with a code
   */
  static getByCode(sessionCode: string): Session | undefined {
    return getOne<Session>(
      `SELECT * FROM sessions WHERE session_code = ?`,
      [sessionCode]
    );
  }

  /**
   * Get active session for a specific slide
   * Returns the most recent active session
   */
  static getActiveBySlide(slideId: string): Session | undefined {
    return getOne<Session>(
      `SELECT * FROM sessions 
       WHERE slide_id = ? AND is_active = 1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [slideId]
    );
  }

  /**
   * Get all active sessions for a teacher
   * Useful for dashboard view
   */
  static getActiveByTeacher(teacherId: string): Session[] {
    return getAll<Session>(
      `SELECT * FROM sessions 
       WHERE teacher_id = ? AND is_active = 1 
       ORDER BY created_at DESC`,
      [teacherId]
    );
  }

  /**
   * Get all sessions for a class (active and ended)
   * Useful for history view
   */
  static getByClass(classId: string): Session[] {
    return getAll<Session>(
      `SELECT * FROM sessions 
       WHERE class_id = ? 
       ORDER BY created_at DESC`,
      [classId]
    );
  }

  /**
   * Update session permissions
   * Allows teacher to toggle student drawing permission
   */
  static updatePermissions(id: string, allowStudentDraw: boolean): Session | undefined {
    runQuery(
      `UPDATE sessions 
       SET allow_student_draw = ? 
       WHERE id = ?`,
      [allowStudentDraw ? 1 : 0, id]
    );
    
    return this.getById(id);
  }

  /**
   * Update current slide
   * Allows teacher to change the active slide during session
   */
  static updateSlide(id: string, slideId: string): Session | undefined {
    runQuery(
      `UPDATE sessions 
       SET slide_id = ? 
       WHERE id = ?`,
      [slideId, id]
    );
    
    return this.getById(id);
  }

  /**
   * End a session
   * Sets is_active to 0 and records ended_at timestamp
   */
  static end(id: string): Session | undefined {
    runQuery(
      `UPDATE sessions 
       SET is_active = 0, ended_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id]
    );
    
    return this.getById(id);
  }

  /**
   * Delete a session (hard delete)
   * Use with caution - prefer soft delete (end) instead
   */
  static delete(id: string): boolean {
    const result = runQuery(
      `DELETE FROM sessions WHERE id = ?`,
      [id]
    );
    
    return result.changes > 0;
  }

  // ✅ NUEVO: Delete sessions by class (for cascade delete)
  static deleteByClass(classId: string): number {
    const result = runQuery(
      `DELETE FROM sessions WHERE class_id = ?`,
      [classId]
    );
    
    return result.changes;
  }

  // ✅ NUEVO: Delete sessions by slide (for cascade delete)
  static deleteBySlide(slideId: string): number {
    const result = runQuery(
      `DELETE FROM sessions WHERE slide_id = ?`,
      [slideId]
    );
    
    return result.changes;
  }

  /**
   * Check if a session code already exists
   * Used for validation before creating session
   */
  static codeExists(sessionCode: string): boolean {
    const result = getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM sessions WHERE session_code = ?`,
      [sessionCode]
    );
    
    return (result?.count || 0) > 0;
  }

  /**
   * Get session statistics for analytics
   * Returns count of active vs ended sessions
   */
  static getStats(teacherId?: string): {
    total: number;
    active: number;
    ended: number;
  } {
    const query = teacherId
      ? `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as ended
         FROM sessions 
         WHERE teacher_id = ?`
      : `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as ended
         FROM sessions`;
    
    const params = teacherId ? [teacherId] : [];
    const result = getOne<{ total: number; active: number; ended: number }>(query, params);
    
    return result || { total: 0, active: 0, ended: 0 };
  }
}
