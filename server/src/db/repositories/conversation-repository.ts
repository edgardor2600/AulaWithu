import { runQuery, getAll, getOne } from '../database';

export interface ConversationStoryRecord {
  id: string;
  title: string;
  topics: string;
  level: string;
  dialogueText: string;
  supplementaryText?: string;
  speakers: any[];
  clips?: any[];
  imageUrl?: string;
  timestamp?: number;
  created_at?: string;
  updated_at?: string;
}

export class ConversationRepository {
  private static tableInitialized = false;

  private static async ensureTableExists() {
    if (this.tableInitialized) return;
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS conversation_stories (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            topics VARCHAR(255) NOT NULL DEFAULT 'General',
            level VARCHAR(50) NOT NULL DEFAULT 'A1',
            dialogue_text TEXT NOT NULL,
            supplementary_text TEXT,
            speakers JSONB NOT NULL DEFAULT '[]'::jsonb,
            clips JSONB DEFAULT '[]'::jsonb,
            image_url VARCHAR(500),
            timestamp BIGINT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.tableInitialized = true;
    } catch (err) {
      console.warn('[ConversationRepository] Failed to auto-create conversation_stories table:', err);
    }
  }

  /**
   * Get all conversation stories
   */
  static async getAllStories(): Promise<ConversationStoryRecord[]> {
    await this.ensureTableExists();
    try {
      const rows = await getAll(
        `SELECT id, title, topics, level, dialogue_text as "dialogueText",
                supplementary_text as "supplementaryText", speakers, clips,
                image_url as "imageUrl", timestamp, created_at, updated_at
         FROM conversation_stories
         ORDER BY updated_at DESC, created_at DESC`
      );
      return (rows || []) as ConversationStoryRecord[];
    } catch (err: any) {
      console.error('[ConversationRepository] Error in getAllStories:', err.message);
      return [];
    }
  }

  /**
   * Get single story by ID
   */
  static async getStoryById(id: string): Promise<ConversationStoryRecord | null> {
    await this.ensureTableExists();
    try {
      const row = await getOne(
        `SELECT id, title, topics, level, dialogue_text as "dialogueText",
                supplementary_text as "supplementaryText", speakers, clips,
                image_url as "imageUrl", timestamp, created_at, updated_at
         FROM conversation_stories
         WHERE id = $1`,
        [id]
      );
      return (row || null) as ConversationStoryRecord | null;
    } catch (err: any) {
      console.error('[ConversationRepository] Error in getStoryById:', err.message);
      return null;
    }
  }

  /**
   * Upsert (insert or update) a story
   */
  static async upsertStory(data: Partial<ConversationStoryRecord>): Promise<ConversationStoryRecord | null> {
    await this.ensureTableExists();
    try {
      const id = data.id || Math.random().toString(36).substring(2, 11);
      const title = data.title || 'Diálogo sin título';
      const topics = data.topics || 'General';
      const level = data.level || 'A1';
      const dialogueText = data.dialogueText || '';
      const supplementaryText = data.supplementaryText || '';
      const speakers = JSON.stringify(data.speakers || []);
      const clips = JSON.stringify(data.clips || []);
      const imageUrl = data.imageUrl || null;
      const timestamp = data.timestamp || Date.now();

      const result = await runQuery(
        `INSERT INTO conversation_stories (
          id, title, topics, level, dialogue_text, supplementary_text,
          speakers, clips, image_url, timestamp, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          topics = EXCLUDED.topics,
          level = EXCLUDED.level,
          dialogue_text = EXCLUDED.dialogue_text,
          supplementary_text = EXCLUDED.supplementary_text,
          speakers = EXCLUDED.speakers,
          clips = EXCLUDED.clips,
          image_url = EXCLUDED.image_url,
          timestamp = EXCLUDED.timestamp,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, title, topics, level, dialogue_text as "dialogueText",
                  supplementary_text as "supplementaryText", speakers, clips,
                  image_url as "imageUrl", timestamp, created_at, updated_at`,
        [id, title, topics, level, dialogueText, supplementaryText, speakers, clips, imageUrl, timestamp]
      );

      return result.rows[0] || null;
    } catch (err: any) {
      console.error('[ConversationRepository] Error in upsertStory:', err.message);
      return null;
    }
  }

  /**
   * Delete a story by ID
   */
  static async deleteStory(id: string): Promise<boolean> {
    await this.ensureTableExists();
    try {
      const result = await runQuery(`DELETE FROM conversation_stories WHERE id = $1`, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (err: any) {
      console.error('[ConversationRepository] Error in deleteStory:', err.message);
      return false;
    }
  }
}
