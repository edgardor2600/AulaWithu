import { runQuery, getOne, getAll } from '../database';
import { EventLog } from '../../types/database';

export class EventsRepository {
  // Log an event
  static log(data: { 
    session_id: string;
    event_type: string;
    actor_id: string;
    slide_id?: string;
    payload?: any;
  }): EventLog {
    const payload = data.payload ? JSON.stringify(data.payload) : null;
    
    const result = runQuery(
      `INSERT INTO events_log (session_id, event_type, actor_id, slide_id, payload) 
       VALUES (?, ?, ?, ?, ?)`,
      [data.session_id, data.event_type, data.actor_id, data.slide_id || null, payload]
    );
    
    return this.getById(result.lastInsertRowid as number)!;
  }

  // Get event by ID
  static getById(id: number): EventLog | undefined {
    return getOne<EventLog>(`SELECT * FROM events_log WHERE id = ?`, [id]);
  }

  // Get events by session
  static getBySession(sessionId: string, limit?: number): EventLog[] {
    const sql = `SELECT * FROM events_log WHERE session_id = ? ORDER BY timestamp DESC ${limit ? `LIMIT ${limit}` : ''}`;
    return getAll<EventLog>(sql, [sessionId]);
  }

  // Get events by session and type
  static getBySessionAndType(sessionId: string, eventType: string): EventLog[] {
    return getAll<EventLog>(
      `SELECT * FROM events_log WHERE session_id = ? AND event_type = ? ORDER BY timestamp DESC`,
      [sessionId, eventType]
    );
  }

  // Get events for replay (with time range)
  static getForReplay(sessionId: string, fromTime?: string, toTime?: string): EventLog[] {
    let sql = `SELECT * FROM events_log WHERE session_id = ?`;
    const params: any[] = [sessionId];

    if (fromTime) {
      sql += ` AND timestamp >= ?`;
      params.push(fromTime);
    }
    if (toTime) {
      sql += ` AND timestamp <= ?`;
      params.push(toTime);
    }

    sql += ` ORDER BY timestamp ASC`;
    return getAll<EventLog>(sql, params);
  }

  // Get events with user info
  static getBySessionWithUserInfo(sessionId: string, limit?: number): any[] {
    const sql = `
      SELECT e.*, u.name as actor_name, u.role as actor_role
      FROM events_log e
      JOIN users u ON e.actor_id = u.id
      WHERE e.session_id = ?
      ORDER BY e.timestamp DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `;
    return getAll(sql, [sessionId]);
  }

  // Get event count by session
  static getCountBySession(sessionId: string): number {
    const result = getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM events_log WHERE session_id = ?`,
      [sessionId]
    );
    return result?.count || 0;
  }

  // Get event count by type
  static getCountByType(sessionId: string, eventType: string): number {
    const result = getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM events_log WHERE session_id = ? AND event_type = ?`,
      [sessionId, eventType]
    );
    return result?.count || 0;
  }

  // Delete events by session (cleanup)
  static deleteBySession(sessionId: string): number {
    const result = runQuery(`DELETE FROM events_log WHERE session_id = ?`, [sessionId]);
    return result.changes;
  }

  // Get session duration from events
  static getSessionDuration(sessionId: string): any {
    return getOne(`
      SELECT 
        MIN(timestamp) as first_event,
        MAX(timestamp) as last_event,
        COUNT(*) as total_events
      FROM events_log
      WHERE session_id = ?
    `, [sessionId]);
  }
}
