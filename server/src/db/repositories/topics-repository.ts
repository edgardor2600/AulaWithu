import Database from 'better-sqlite3';
import { generateId } from '../../utils/id-generator';
import type { Topic, TopicWithSlideCount } from '../../types/database';

export class TopicsRepository {
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
      id,
      classId,
      data.title,
      data.description || null,
      topicNumber,
      now,
      now
    );

    return this.getById(id)!;
  }

  /**
   * Get topic by ID
   */
  getById(id: string): Topic | null {
    const stmt = this.db.prepare('SELECT * FROM topics WHERE id = ?');
    return stmt.get(id) as Topic | null;
  }

  /**
   * Get all topics for a class
   */
  getByClass(classId: string, activeOnly: boolean = true): Topic[] {
    let query = 'SELECT * FROM topics WHERE class_id = ?';
    if (activeOnly) {
      query += ' AND active = 1';
    }
    query += ' ORDER BY topic_number ASC';

    const stmt = this.db.prepare(query);
    return stmt.all(classId) as Topic[];
  }

  /**
   * Get topics with slide count
   */
  getTopicsWithSlideCount(classId: string): TopicWithSlideCount[] {
    const stmt = this.db.prepare(`
      SELECT 
        t.*,
        COUNT(s.id) as slides_count
      FROM topics t
      LEFT JOIN slides s ON s.topic_id = t.id
      WHERE t.class_id = ? AND t.active = 1
      GROUP BY t.id
      ORDER BY t.topic_number ASC
    `);

    return stmt.all(classId) as TopicWithSlideCount[];
  }

  /**
   * Update a topic
   */
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
  }

  /**
   * Reorder topics
   */
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
  }

  /**
   * Get next available topic number for a class
   */
  getNextTopicNumber(classId: string): number {
    const stmt = this.db.prepare(`
      SELECT MAX(topic_number) as max_number
      FROM topics
      WHERE class_id = ?
    `);

    const result = stmt.get(classId) as { max_number: number | null };
    return (result.max_number || 0) + 1;
  }

  /**
   * Check if a topic belongs to a specific class
   */
  belongsToClass(topicId: string, classId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT id FROM topics
      WHERE id = ? AND class_id = ?
    `);

    return !!stmt.get(topicId, classId);
  }
}
