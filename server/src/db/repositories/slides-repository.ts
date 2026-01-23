import { runQuery, getOne, getAll } from '../database';
import { Slide } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class SlidesRepository {
  // Create a new slide
  static async create(data: { 
    class_id: string; 
    slide_number?: number;
    title?: string;
    canvas_data?: string;
    topic_id?: string;  // Added for topics support
<<<<<<< HEAD
  }): Slide {
=======
  }): Promise<Slide> {
>>>>>>> f404e31 (temp commit to switch branches)
    const id = generateId();
    
    // If slide_number not provided, get next number
    const slideNumber = data.slide_number || await this.getNextSlideNumber(data.class_id);
    
<<<<<<< HEAD
    runQuery(
      `INSERT INTO slides (id, class_id, slide_number, title, canvas_data, topic_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
=======
    await runQuery(
      `INSERT INTO slides (id, class_id, slide_number, title, canvas_data, topic_id) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
>>>>>>> f404e31 (temp commit to switch branches)
      [
        id, 
        data.class_id, 
        slideNumber, 
        data.title || null, 
        data.canvas_data || '{"version":"5.3.0","objects":[]}',
        data.topic_id || null  // Insert topic_id
      ]
    );
    
    const slide = await this.getById(id);
    if (!slide) throw new Error('Failed to create slide');
    return slide;
  }

  // Get slide by ID
  static async getById(id: string): Promise<Slide | undefined> {
    return await getOne<Slide>(`SELECT * FROM slides WHERE id = $1`, [id]);
  }

  // Get slides by class
  static async getByClass(classId: string): Promise<Slide[]> {
    return await getAll<Slide>(
      `SELECT * FROM slides WHERE class_id = $1 ORDER BY slide_number ASC`,
      [classId]
    );
  }

  // Get slide by class and number
  static async getByClassAndNumber(classId: string, slideNumber: number): Promise<Slide | undefined> {
    return await getOne<Slide>(
      `SELECT * FROM slides WHERE class_id = $1 AND slide_number = $2`,
      [classId, slideNumber]
    );
  }

  // Update slide
  static async update(id: string, data: { 
    title?: string;
    canvas_data?: string;
    slide_number?: number;
  }): Promise<Slide | undefined> {
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }
    if (data.canvas_data !== undefined) {
      updates.push(`canvas_data = $${paramIndex++}`);
      params.push(data.canvas_data);
    }
    if (data.slide_number !== undefined) {
      updates.push(`slide_number = $${paramIndex++}`);
      params.push(data.slide_number);
    }

    if (updates.length === 1) { // Only updated_at
      return await this.getById(id);
    }

    params.push(id);
    await runQuery(`UPDATE slides SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);
    
    return await this.getById(id);
  }

  // Update only canvas data (frequent operation)
  static async updateCanvas(id: string, canvasData: string): Promise<Slide | undefined> {
    await runQuery(
      `UPDATE slides SET canvas_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [canvasData, id]
    );
    return await this.getById(id);
  }

  // Delete slide
  static async delete(id: string): Promise<boolean> {
    const result = await runQuery(`DELETE FROM slides WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Delete slides by class
  static async deleteByClass(classId: string): Promise<number> {
    const result = await runQuery(`DELETE FROM slides WHERE class_id = $1`, [classId]);
    return (result.rowCount ?? 0);
  }

  // Reorder slides
  static async reorder(classId: string, slideId: string, newPosition: number): Promise<boolean> {
    await runQuery(
      `UPDATE slides SET slide_number = $1 WHERE id = $2`,
      [newPosition, slideId]
    );
    return true;
  }

  // Get slides by topic
  static async getByTopic(topicId: string): Promise<Slide[]> {
    return await getAll<Slide>(
      `SELECT * FROM slides WHERE topic_id = $1 ORDER BY slide_number ASC`,
      [topicId]
    );
  }

  // Helper: Get next slide number for a class
  private static async getNextSlideNumber(classId: string): Promise<number> {
    const result = await getOne<{ max_number: number | null }>(
      `SELECT MAX(slide_number) as max_number FROM slides WHERE class_id = $1`,
      [classId]
    );
    return (result?.max_number || 0) + 1;
  }
}
