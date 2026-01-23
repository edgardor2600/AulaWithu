<<<<<<< HEAD
import Database from 'better-sqlite3';
=======
import { runQuery, getOne, getAll } from '../database';
>>>>>>> f404e31 (temp commit to switch branches)
import { generateId } from '../../utils/id-generator';
import type { Topic, TopicWithSlideCount } from '../../types/database';

export class TopicsRepository {
<<<<<<< HEAD
  constructor(private db: Database.Database) {}

  /**
   * Create a new topic
   */
  create(classId: string, data: { title: string; description?: string }): Topic {
    const id = generateId();
    const topicNumber = this.getNextTopicNumber(classId);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO topics (id, class_id, title, description, topic_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
=======
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
>>>>>>> f404e31 (temp commit to switch branches)
      id,
      classId,
      data.title,
      data.description || null,
<<<<<<< HEAD
      topicNumber,
      now,
      now
    );

    return this.getById(id)!;
=======
      topicNumber
    ]);

    const topic = await this.getById(id);
    if (!topic) throw new Error('Failed to create topic');
    return topic;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get topic by ID
   */
<<<<<<< HEAD
  getById(id: string): Topic | null {
    const stmt = this.db.prepare('SELECT * FROM topics WHERE id = ?');
    return stmt.get(id) as Topic | null;
=======
  static async getById(id: string): Promise<Topic | undefined> {
    return await getOne<Topic>('SELECT * FROM topics WHERE id = $1', [id]);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get all topics for a class
   */
<<<<<<< HEAD
  getByClass(classId: string, activeOnly: boolean = true): Topic[] {
    let query = 'SELECT * FROM topics WHERE class_id = ?';
=======
  static async getByClass(classId: string, activeOnly: boolean = true): Promise<Topic[]> {
    let query = 'SELECT * FROM topics WHERE class_id = $1';
>>>>>>> f404e31 (temp commit to switch branches)
    if (activeOnly) {
      query += ' AND active = 1';
    }
    query += ' ORDER BY topic_number ASC';

<<<<<<< HEAD
    const stmt = this.db.prepare(query);
    return stmt.all(classId) as Topic[];
=======
    return await getAll<Topic>(query, [classId]);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get topics with slide count
   */
<<<<<<< HEAD
  getTopicsWithSlideCount(classId: string): TopicWithSlideCount[] {
    const stmt = this.db.prepare(`
=======
  static async getTopicsWithSlideCount(classId: string): Promise<TopicWithSlideCount[]> {
    const rows = await getAll<any>(`
>>>>>>> f404e31 (temp commit to switch branches)
      SELECT 
        t.*,
        COUNT(s.id) as slides_count
      FROM topics t
      LEFT JOIN slides s ON s.topic_id = t.id
<<<<<<< HEAD
      WHERE t.class_id = ? AND t.active = 1
      GROUP BY t.id
      ORDER BY t.topic_number ASC
    `);

    return stmt.all(classId) as TopicWithSlideCount[];
=======
      WHERE t.class_id = $1 AND t.active = 1
      GROUP BY t.id
      ORDER BY t.topic_number ASC
    `, [classId]);

    return rows.map(row => ({
      ...row,
      slides_count: Number(row.slides_count)
    }));
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Update a topic
   */
<<<<<<< HEAD
  update(id: string, data: { title?: string; description?: string }): Topic {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (updates.length === 0) {
      return this.getById(id)!;
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE topics
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id)!;
  }

  /**
   * Soft delete a topic
   * Only allows deletion if topic has no slides
   */
  delete(id: string): boolean {
    // Check if topic has slides
    const slideCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM slides WHERE topic_id = ?');
    const result = slideCountStmt.get(id) as { count: number };

    if (result.count > 0) {
      throw new Error('Cannot delete topic with existing slides');
    }

    const stmt = this.db.prepare('DELETE FROM topics WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
=======
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
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Reorder topics
   */
<<<<<<< HEAD
  reorderTopics(classId: string, topicIds: string[]): void {
    const updateStmt = this.db.prepare(`
      UPDATE topics
      SET topic_number = ?, updated_at = ?
      WHERE id = ? AND class_id = ?
    `);

    const now = new Date().toISOString();

    // Update each topic with its new number
    topicIds.forEach((topicId, index) => {
      updateStmt.run(index + 1, now, topicId, classId);
    });
=======
  static async reorderTopics(classId: string, topicIds: string[]): Promise<void> {
    // Update each topic with its new number
    for (let i = 0; i < topicIds.length; i++) {
        await runQuery(`
          UPDATE topics
          SET topic_number = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND class_id = $3
        `, [i + 1, topicIds[i], classId]);
    }
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get next available topic number for a class
   */
<<<<<<< HEAD
  getNextTopicNumber(classId: string): number {
    const stmt = this.db.prepare(`
      SELECT MAX(topic_number) as max_number
      FROM topics
      WHERE class_id = ?
    `);

    const result = stmt.get(classId) as { max_number: number | null };
    return (result.max_number || 0) + 1;
=======
  static async getNextTopicNumber(classId: string): Promise<number> {
    const result = await getOne<{ max_number: string | number | null }>(`
      SELECT MAX(topic_number) as max_number
      FROM topics
      WHERE class_id = $1
    `, [classId]);

    return (Number(result?.max_number) || 0) + 1;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Check if a topic belongs to a specific class
   */
<<<<<<< HEAD
  belongsToClass(topicId: string, classId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT id FROM topics
      WHERE id = ? AND class_id = ?
    `);

    return !!stmt.get(topicId, classId);
=======
  static async belongsToClass(topicId: string, classId: string): Promise<boolean> {
    const result = await getOne(`
      SELECT id FROM topics
      WHERE id = $1 AND class_id = $2
    `, [topicId, classId]);

    return result !== undefined;
>>>>>>> f404e31 (temp commit to switch branches)
  }
}
