import { runQuery, getOne, getAll } from '../database';
import { EventLog } from '../../types/database';

export class EventsRepository {
  // Log an event
  static async log(data: { 
    session_id: string;
    event_type: string;
    actor_id: string;
    slide_id?: string;
    payload?: any;
  }): Promise<EventLog> {
    const payload = data.payload ? JSON.stringify(data.payload) : null;
    
    const result = await runQuery(
      `INSERT INTO events_log (session_id, event_type, actor_id, slide_id, payload) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.session_id, data.event_type, data.actor_id, data.slide_id || null, payload]
    );
    
    return result.rows[0] as EventLog;
  }

  // Get event by ID
  static async getById(id: number): Promise<EventLog | undefined> {
    return await getOne<EventLog>(`SELECT * FROM events_log WHERE id = $1`, [id]);
  }

  // Get events by session
  static async getBySession(sessionId: string, limit?: number): Promise<EventLog[]> {
    const sql = `SELECT * FROM events_log WHERE session_id = $1 ORDER BY timestamp DESC ${limit ? `LIMIT $2` : ''}`;
    return await getAll<EventLog>(sql, limit ? [sessionId, limit] : [sessionId]);
  }

  // Get events by session and type
  static async getBySessionAndType(sessionId: string, eventType: string): Promise<EventLog[]> {
    return await getAll<EventLog>(
      `SELECT * FROM events_log WHERE session_id = $1 AND event_type = $2 ORDER BY timestamp DESC`,
      [sessionId, eventType]
    );
  }

  // Get events for replay (with time range)
  static async getForReplay(sessionId: string, fromTime?: string, toTime?: string): Promise<EventLog[]> {
    let sql = `SELECT * FROM events_log WHERE session_id = $1`;
    const params: any[] = [sessionId];

    if (fromTime) {
      sql += ` AND timestamp >= $2`;
      params.push(fromTime);
    }
    if (toTime) {
      sql += ` AND timestamp <= $${params.length + 1}`;
      params.push(toTime);
    }

    sql += ` ORDER BY timestamp ASC`;
    return await getAll<EventLog>(sql, params);
  }

  // Get events with user info
  static async getBySessionWithUserInfo(sessionId: string, limit?: number): Promise<any[]> {
    const sql = `
      SELECT e.*, u.name as actor_name, u.role as actor_role
      FROM events_log e
      JOIN users u ON e.actor_id = u.id
      WHERE e.session_id = $1
      ORDER BY e.timestamp DESC
      ${limit ? `LIMIT $2` : ''}
    `;
    return await getAll(sql, limit ? [sessionId, limit] : [sessionId]);
  }

  // Get event count by session
  static async getCountBySession(sessionId: string): Promise<number> {
    const result = await getOne<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM events_log WHERE session_id = $1`,
      [sessionId]
    );
    return Number(result?.count) || 0;
  }

  // Get event count by type
  static async getCountByType(sessionId: string, eventType: string): Promise<number> {
    const result = await getOne<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM events_log WHERE session_id = $1 AND event_type = $2`,
      [sessionId, eventType]
    );
    return Number(result?.count) || 0;
  }

  // Delete events by session (cleanup)
  static async deleteBySession(sessionId: string): Promise<number> {
    const result = await runQuery(`DELETE FROM events_log WHERE session_id = $1`, [sessionId]);
    return (result.rowCount ?? 0);
  }

  // Get session duration from events
  static async getSessionDuration(sessionId: string): Promise<any> {
    const result = await getOne<{ first_event: any, last_event: any, total_events: string | number }>(`
      SELECT 
        MIN(timestamp) as first_event,
        MAX(timestamp) as last_event,
        COUNT(*) as total_events
      FROM events_log
      WHERE session_id = $1
    `, [sessionId]);
    
    if (!result) return null;
    return {
      ...result,
      total_events: Number(result.total_events)
    };
  }
}
