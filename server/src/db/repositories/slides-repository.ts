import { runQuery, getOne, getAll } from '../database';
import { Slide } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class SlidesRepository {
  // Create a new slide
  static create(data: { 
    class_id: string; 
    slide_number?: number;
    title?: string;
    canvas_data?: string;
  }): Slide {
    const id = generateId();
    
    // If slide_number not provided, get next number
    const slideNumber = data.slide_number || this.getNextSlideNumber(data.class_id);
    
    runQuery(
      `INSERT INTO slides (id, class_id, slide_number, title, canvas_data) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.class_id, slideNumber, data.title || null, data.canvas_data || '{"version":"5.3.0","objects":[]}']
    );
    
    return this.getById(id)!;
  }

  // Get slide by ID
  static getById(id: string): Slide | undefined {
    return getOne<Slide>(`SELECT * FROM slides WHERE id = ?`, [id]);
  }

  // Get slides by class
  static getByClass(classId: string): Slide[] {
    return getAll<Slide>(
      `SELECT * FROM slides WHERE class_id = ? ORDER BY slide_number ASC`,
      [classId]
    );
  }

  // Get slide by class and number
  static getByClassAndNumber(classId: string, slideNumber: number): Slide | undefined {
    return getOne<Slide>(
      `SELECT * FROM slides WHERE class_id = ? AND slide_number = ?`,
      [classId, slideNumber]
    );
  }

  // Update slide
  static update(id: string, data: { 
    title?: string;
    canvas_data?: string;
    slide_number?: number;
  }): Slide | undefined {
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.canvas_data !== undefined) {
      updates.push('canvas_data = ?');
      params.push(data.canvas_data);
    }
    if (data.slide_number !== undefined) {
      updates.push('slide_number = ?');
      params.push(data.slide_number);
    }

    if (updates.length === 1) { // Only updated_at
      return this.getById(id);
    }

    params.push(id);
    runQuery(`UPDATE slides SET ${updates.join(', ')} WHERE id = ?`, params);
    
    return this.getById(id);
  }

  // Update only canvas data (frequent operation)
  static updateCanvas(id: string, canvasData: string): Slide | undefined {
    runQuery(
      `UPDATE slides SET canvas_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [canvasData, id]
    );
    return this.getById(id);
  }

  // Delete slide
  static delete(id: string): boolean {
    const result = runQuery(`DELETE FROM slides WHERE id = ?`, [id]);
    return result.changes > 0;
  }

  // ✅ NUEVO: Delete slides by class
  static deleteByClass(classId: string): number {
    const result = runQuery(`DELETE FROM slides WHERE class_id = ?`, [classId]);
    return result.changes;
  }

  // Reorder slides
  static reorder(classId: string, slideId: string, newPosition: number): boolean {
    // This would require a transaction to update multiple slides
    // For now, simple implementation
    runQuery(
      `UPDATE slides SET slide_number = ? WHERE id = ?`,
      [newPosition, slideId]
    );
    return true;
  }

  // Helper: Get next slide number for a class
  private static getNextSlideNumber(classId: string): number {
    const result = getOne<{ max_number: number | null }>(
      `SELECT MAX(slide_number) as max_number FROM slides WHERE class_id = ?`,
      [classId]
    );
    return (result?.max_number || 0) + 1;
  }
}
