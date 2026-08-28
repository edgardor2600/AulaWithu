import { runQuery, getAll, getOne } from '../database';
import { logger } from '../../utils/logger';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TutorMaterialData {
  content_id?: string;
  title: string;
  topic: string;
  subject: string;
  level: string;
  mode: 'guided' | 'practice';
  context?: string;
  source_kind?: string;
  script_json: object;
  created_by?: string;
}

export interface TutorMaterial extends TutorMaterialData {
  id: number;
  content_id: string;
  created_at: string;
  updated_at: string;
}

export interface TutorMaterialSummary {
  id: number;
  content_id: string;
  title: string;
  topic: string;
  subject: string;
  level: string;
  mode: string;
  context: string;
  source_kind: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationData {
  session_id: string;
  student_id?: string;
  material_id?: number;
  phase_index: number;
  score: number;
  feedback?: string;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class TutorRepository {
  private static tableInitialized = false;

  private static async ensureTablesExist() {
    if (this.tableInitialized) return;
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS ai_tutor_materials (
          id          SERIAL PRIMARY KEY,
          content_id  VARCHAR(255) NOT NULL UNIQUE,
          title       VARCHAR(255) NOT NULL,
          topic       VARCHAR(255) NOT NULL,
          subject     VARCHAR(100) NOT NULL DEFAULT 'English',
          level       VARCHAR(50)  NOT NULL DEFAULT 'B1',
          mode        VARCHAR(50)  NOT NULL DEFAULT 'guided',
          context     TEXT         NOT NULL DEFAULT '',
          source_kind VARCHAR(50)  NOT NULL DEFAULT 'generated',
          script_json JSONB        NOT NULL,
          created_by  VARCHAR(255),
          created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await runQuery(`
        CREATE TABLE IF NOT EXISTS student_ai_evaluations (
          id          SERIAL PRIMARY KEY,
          session_id  VARCHAR(255) NOT NULL,
          student_id  VARCHAR(255),
          material_id INT REFERENCES ai_tutor_materials(id) ON DELETE SET NULL,
          phase_index INT  NOT NULL DEFAULT 0,
          score       INT  NOT NULL DEFAULT 0,
          feedback    TEXT,
          created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      this.tableInitialized = true;
    } catch (err: any) {
      logger.warn(`[TutorRepository] Could not auto-create tables: ${err.message}`);
    }
  }

  /**
   * Save or update a tutor material (upsert by content_id)
   */
  static async saveMaterial(data: TutorMaterialData): Promise<TutorMaterial | null> {
    await this.ensureTablesExist();
    try {
      const contentId = data.content_id ||
        `ai_tutor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const title     = data.title || `${data.mode === 'practice' ? 'Práctica' : 'Clase'}: ${data.topic}`;
      const context   = data.context   || '';
      const sourceKind = data.source_kind || 'generated';

      const result = await runQuery(
        `INSERT INTO ai_tutor_materials (
          content_id, title, topic, subject, level, mode, context, source_kind, script_json, created_by, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, CURRENT_TIMESTAMP)
        ON CONFLICT (content_id) DO UPDATE SET
          title       = EXCLUDED.title,
          topic       = EXCLUDED.topic,
          subject     = EXCLUDED.subject,
          level       = EXCLUDED.level,
          mode        = EXCLUDED.mode,
          context     = EXCLUDED.context,
          source_kind = EXCLUDED.source_kind,
          script_json = EXCLUDED.script_json,
          updated_at  = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          contentId,
          title,
          data.topic,
          data.subject,
          data.level,
          data.mode,
          context,
          sourceKind,
          JSON.stringify(data.script_json),
          data.created_by || null,
        ]
      );
      return result.rows[0] || null;
    } catch (err: any) {
      logger.error(`[TutorRepository] Error in saveMaterial: ${err.message}`);
      return null;
    }
  }

  /**
   * List all materials (lightweight — no script_json)
   * P-14: Acepta búsqueda opcional + limit/offset para paginación futura.
   * Retro-compatible: llamadas sin parámetros retornan los últimos 50.
   */
  static async getAllMaterials(
    mode?: 'guided' | 'practice',
    search?: string,
    limit = 50,
    offset = 0
  ): Promise<{ materials: TutorMaterialSummary[]; total: number }> {
    await this.ensureTablesExist();
    try {
      const params: any[] = [];
      const conditions: string[] = [];

      if (mode) conditions.push(`mode = $${params.push(mode)}`);
      if (search?.trim()) {
        const term = `%${search.trim()}%`;
        conditions.push(`(title ILIKE $${params.push(term)} OR topic ILIKE $${params.push(term)})`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const countRow = await getOne(
        `SELECT COUNT(*) as total FROM ai_tutor_materials ${where}`,
        params
      );
      const total = parseInt((countRow as any)?.total || '0', 10);

      const safeLimit = Math.min(limit, 200);
      const rows = await getAll(
        `SELECT id, content_id, title, topic, subject, level, mode, context, source_kind, created_by, created_at, updated_at
         FROM ai_tutor_materials
         ${where}
         ORDER BY updated_at DESC
         LIMIT $${params.push(safeLimit)} OFFSET $${params.push(offset)}`,
        params
      );
      return { materials: (rows || []) as TutorMaterialSummary[], total };
    } catch (err: any) {
      logger.error(`[TutorRepository] Error in getAllMaterials: ${err.message}`);
      return { materials: [], total: 0 };
    }
  }

  /**
   * Get full material by content_id (includes script_json)
   */
  static async getMaterialById(contentId: string): Promise<TutorMaterial | null> {
    await this.ensureTablesExist();
    try {
      const row = await getOne(
        `SELECT * FROM ai_tutor_materials WHERE content_id = $1`,
        [contentId]
      );
      return (row || null) as TutorMaterial | null;
    } catch (err: any) {
      logger.error(`[TutorRepository] Error in getMaterialById: ${err.message}`);
      return null;
    }
  }

  /**
   * Delete material by content_id
   */
  static async deleteMaterial(contentId: string): Promise<boolean> {
    await this.ensureTablesExist();
    try {
      const result = await runQuery(
        `DELETE FROM ai_tutor_materials WHERE content_id = $1`,
        [contentId]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (err: any) {
      logger.error(`[TutorRepository] Error in deleteMaterial: ${err.message}`);
      return false;
    }
  }

  /**
   * Save a student evaluation for a phase
   */
  static async saveEvaluation(data: EvaluationData): Promise<void> {
    await this.ensureTablesExist();
    try {
      await runQuery(
        `INSERT INTO student_ai_evaluations
          (session_id, student_id, material_id, phase_index, score, feedback)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          data.session_id,
          data.student_id || null,
          data.material_id || null,
          data.phase_index,
          Math.max(0, Math.min(100, data.score)),
          data.feedback || null,
        ]
      );
    } catch (err: any) {
      logger.error(`[TutorRepository] Error in saveEvaluation: ${err.message}`);
    }
  }
}
