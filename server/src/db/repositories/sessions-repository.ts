import { runQuery, getOne, getAll, transaction } from '../database';
import { Session, SessionParticipant } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class SessionsRepository {
  // Create a new session
  static create(data: { 
    class_id: string; 
    teacher_id: string;
  }): Session {
    const id = generateId();
    const yjs_room_name = `room-${id}`;
    
    runQuery(
      `INSERT INTO sessions (id, class_id, teacher_id, status, yjs_room_name) 
       VALUES (?, ?, ?, 'active', ?)`,
      [id, data.class_id, data.teacher_id, yjs_room_name]
    );
    
    return this.getById(id)!;
  }

  // Get session by ID
  static getById(id: string): Session | undefined {
    return getOne<Session>(`SELECT * FROM sessions WHERE id = ?`, [id]);
  }

  // Get active session for a class
  static getActiveByClass(classId: string): Session | undefined {
    return getOne<Session>(
      `SELECT * FROM sessions WHERE class_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
      [classId]
    );
  }

  // Get all sessions for a class
  static getByClass(classId: string): Session[] {
    return getAll<Session>(
      `SELECT * FROM sessions WHERE class_id = ? ORDER BY started_at DESC`,
      [classId]
    );
  }

  // Update session status
  static updateStatus(id: string, status: 'active' | 'paused' | 'ended'): Session | undefined {
    const updates = ['status = ?'];
    const params: any[] = [status];

    if (status === 'ended') {
      updates.push('ended_at = CURRENT_TIMESTAMP');
    }

    params.push(id);
    runQuery(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`, params);
    
    return this.getById(id);
  }

  // End session
  static end(id: string): Session | undefined {
    return this.updateStatus(id, 'ended');
  }

  // Add participant to session
  static addParticipant(sessionId: string, userId: string): SessionParticipant {
    const id = generateId();
    
    // Check if already exists
    const existing = getOne<SessionParticipant>(
      `SELECT * FROM session_participants WHERE session_id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    if (existing) {
      // Update joined_at, clear left_at
      runQuery(
        `UPDATE session_participants SET joined_at = CURRENT_TIMESTAMP, left_at = NULL WHERE id = ?`,
        [existing.id]
      );
      return getOne<SessionParticipant>(`SELECT * FROM session_participants WHERE id = ?`, [existing.id])!;
    }

    runQuery(
      `INSERT INTO session_participants (id, session_id, user_id) VALUES (?, ?, ?)`,
      [id, sessionId, userId]
    );
    
    return getOne<SessionParticipant>(`SELECT * FROM session_participants WHERE id = ?`, [id])!;
  }

  // Remove participant from session
  static removeParticipant(sessionId: string, userId: string): boolean {
    const result = runQuery(
      `UPDATE session_participants SET left_at = CURRENT_TIMESTAMP 
       WHERE session_id = ? AND user_id = ? AND left_at IS NULL`,
      [sessionId, userId]
    );
    return result.changes > 0;
  }

  // Get active participants
  static getActiveParticipants(sessionId: string): any[] {
    return getAll(`
      SELECT sp.*, u.name, u.role, u.avatar_color
      FROM session_participants sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.session_id = ? AND sp.left_at IS NULL
      ORDER BY sp.joined_at ASC
    `, [sessionId]);
  }

  // Get all participants (including those who left)
  static getAllParticipants(sessionId: string): any[] {
    return getAll(`
      SELECT sp.*, u.name, u.role, u.avatar_color
      FROM session_participants sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.session_id = ?
      ORDER BY sp.joined_at ASC
    `, [sessionId]);
  }

  // Get session with details
  static getWithDetails(id: string): any {
    return getOne(`
      SELECT s.*, c.title as class_title, u.name as teacher_name
      FROM sessions s
      JOIN classes c ON s.class_id = c.id
      JOIN users u ON s.teacher_id = u.id
      WHERE s.id = ?
    `, [id]);
  }

  // Delete session
  static delete(id: string): boolean {
    const result = runQuery(`DELETE FROM sessions WHERE id = ?`, [id]);
    return result.changes > 0;
  }
}
