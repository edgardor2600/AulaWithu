import { runQuery, getOne, getAll } from '../database';
import { Class } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class ClassesRepository {
  // Create a new class
  static create(data: { 
    title: string; 
    description?: string; 
    teacher_id: string;
    thumbnail_url?: string;
  }): Class {
    const id = generateId();
    
    runQuery(
      `INSERT INTO classes (id, title, description, teacher_id, thumbnail_url) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.title, data.description || null, data.teacher_id, data.thumbnail_url || null]
    );
    
    return this.getById(id)!;
  }

  // Get class by ID
  static getById(id: string): Class | undefined {
    return getOne<Class>(`SELECT * FROM classes WHERE id = ?`, [id]);
  }

  // Get class with teacher info
  static getByIdWithTeacher(id: string): any {
    return getOne(`
      SELECT c.*, u.name as teacher_name, u.avatar_color as teacher_color
      FROM classes c
      JOIN users u ON c.teacher_id = u.id
      WHERE c.id = ?
    `, [id]);
  }

  // Get all classes
  static getAll(): Class[] {
    return getAll<Class>(`SELECT * FROM classes ORDER BY created_at DESC`);
  }

  // Get classes by teacher
  static getByTeacher(teacherId: string): Class[] {
    return getAll<Class>(
      `SELECT * FROM classes WHERE teacher_id = ? ORDER BY created_at DESC`,
      [teacherId]
    );
  }

  // Update class
  static update(id: string, data: { 
    title?: string; 
    description?: string;
    thumbnail_url?: string;
  }): Class | undefined {
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (data.title) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.thumbnail_url !== undefined) {
      updates.push('thumbnail_url = ?');
      params.push(data.thumbnail_url);
    }

    if (updates.length === 1) { // Only updated_at
      return this.getById(id);
    }

    params.push(id);
    runQuery(`UPDATE classes SET ${updates.join(', ')} WHERE id = ?`, params);
    
    return this.getById(id);
  }

  // Delete class (CASCADE will delete slides)
  static delete(id: string): boolean {
    const result = runQuery(`DELETE FROM classes WHERE id = ?`, [id]);
    return result.changes > 0;
  }

  // Get class with slides count
  static getWithSlidesCount(id: string): any {
    return getOne(`
      SELECT c.*, COUNT(s.id) as slides_count
      FROM classes c
      LEFT JOIN slides s ON c.id = s.class_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);
  }
}
