import { runQuery, getOne } from '../database';
import { SessionMaterial } from '../../types/database';

export class PresenterRepository {
  /**
   * Save or replace presenter material for a session
   */
  static async saveMaterial(data: {
    session_id: string;
    file_name: string;
    file_type: string;
    slide_urls: string[];
    current_slide_index?: number;
  }): Promise<SessionMaterial> {
    // Drop foreign key constraint if it exists to allow standalone slide presentations
    try {
      await runQuery(`ALTER TABLE session_materials DROP CONSTRAINT IF EXISTS session_materials_session_id_fkey`);
    } catch { /* ignore */ }

    // Delete any existing material for this session to keep a single presenter instance per session
    await runQuery(
      `DELETE FROM session_materials WHERE session_id = $1`,
      [data.session_id]
    );


    const result = await runQuery(
      `INSERT INTO session_materials (
        session_id, file_name, file_type, slide_urls, current_slide_index
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        data.session_id,
        data.file_name,
        data.file_type,
        JSON.stringify(data.slide_urls),
        data.current_slide_index ?? 0
      ]
    );

    return result.rows[0] as SessionMaterial;
  }

  /**
   * Get presenter material by session ID
   */
  static async getMaterialBySession(sessionId: string): Promise<SessionMaterial | undefined> {
    return await getOne<SessionMaterial>(
      `SELECT * FROM session_materials WHERE session_id = $1`,
      [sessionId]
    );
  }

  /**
   * Update current slide index
   */
  static async updateSlideIndex(sessionId: string, index: number): Promise<boolean> {
    const result = await runQuery(
      `UPDATE session_materials 
       SET current_slide_index = $1 
       WHERE session_id = $2`,
      [index, sessionId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete presenter material for a session
   */
  static async deleteMaterialBySession(sessionId: string): Promise<boolean> {
    const result = await runQuery(
      `DELETE FROM session_materials WHERE session_id = $1`,
      [sessionId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
