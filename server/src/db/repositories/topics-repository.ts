import { runQuery, getOne, getAll } from '../database';
import { generateId } from '../../utils/id-generator';
import type { Topic, TopicWithSlideCount } from '../../types/database';

export class TopicsRepository {
  /**
   * Create a new topic
   */
  static async create(classId: string, data: { title: string; description?: string }): Promise<Topic> {
    const id = generateId();
    const topicNumber = await this.getNextTopicNumber(classId);

    await runQuery(`
      INSERT INTO topics (id, class_id, title, description, topic_number, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      id,
      classId,
      data.title,
      data.description || null,
      topicNumber
    ]);

    const topic = await this.getById(id);
    if (!topic) throw new Error('Failed to create topic');
    return topic;
  }

  /**
   * Get topic by ID
   */
  static async getById(id: string): Promise<Topic | undefined> {
    return await getOne<Topic>('SELECT * FROM topics WHERE id = $1', [id]);
  }

  /**
   * Get all topics for a class
   */
  static async getByClass(classId: string, activeOnly: boolean = true): Promise<Topic[]> {
    let query = 'SELECT * FROM topics WHERE class_id = $1';
    if (activeOnly) {
      query += ' AND active = 1';
    }
    query += ' ORDER BY topic_number ASC';

    return await getAll<Topic>(query, [classId]);
  }

  /**
   * Get topics with slide count
   */
  static async getTopicsWithSlideCount(classId: string): Promise<TopicWithSlideCount[]> {
    const rows = await getAll<any>(`
      SELECT 
        t.*,
        COUNT(s.id) as slides_count
      FROM topics t
      LEFT JOIN slides s ON s.topic_id = t.id
      WHERE t.class_id = $1 AND t.active = 1
      GROUP BY t.id
      ORDER BY t.topic_number ASC
    `, [classId]);

    return rows.map(row => ({
      ...row,
      slides_count: Number(row.slides_count)
    }));
  }

  /**
   * Update a topic
   */
  static async update(id: string, data: { title?: string; description?: string }): Promise<Topic | undefined> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    if (updates.length === 0) {
      return await this.getById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    await runQuery(`
      UPDATE topics
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, params);

    return await this.getById(id);
  }

  /**
   * Delete a topic
   */
  static async delete(id: string): Promise<boolean> {
    // Check if topic has slides
    const result = await getOne<{ count: string | number }>('SELECT COUNT(*) as count FROM slides WHERE topic_id = $1', [id]);
    const count = Number(result?.count) || 0;

    if (count > 0) {
      throw new Error('Cannot delete topic with existing slides');
    }

    const deleteResult = await runQuery('DELETE FROM topics WHERE id = $1', [id]);
    return (deleteResult.rowCount ?? 0) > 0;
  }

  /**
   * Reorder topics
   */
  static async reorderTopics(classId: string, topicIds: string[]): Promise<void> {
    // Update each topic with its new number
    for (let i = 0; i < topicIds.length; i++) {
        await runQuery(`
          UPDATE topics
          SET topic_number = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND class_id = $3
        `, [i + 1, topicIds[i], classId]);
    }
  }

  /**
   * Get next available topic number for a class
   */
  static async getNextTopicNumber(classId: string): Promise<number> {
    const result = await getOne<{ max_number: string | number | null }>(`
      SELECT MAX(topic_number) as max_number
      FROM topics
      WHERE class_id = $1
    `, [classId]);

    return (Number(result?.max_number) || 0) + 1;
  }

  /**
   * Check if a topic belongs to a specific class
   */
  static async belongsToClass(topicId: string, classId: string): Promise<boolean> {
    const result = await getOne(`
      SELECT id FROM topics
      WHERE id = $1 AND class_id = $2
    `, [topicId, classId]);

    return result !== undefined;
  }
}
