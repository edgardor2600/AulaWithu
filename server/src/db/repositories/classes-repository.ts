import { runQuery, getOne, getAll } from '../database';
import { Class } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class ClassesRepository {
  // Create a new class
  static async create(data: { 
    title: string; 
    description?: string; 
    teacher_id: string;
    thumbnail_url?: string;
  }): Promise<Class> {
    const id = generateId();
    
    await runQuery(
      `INSERT INTO classes (id, title, description, teacher_id, thumbnail_url) 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, data.title, data.description || null, data.teacher_id, data.thumbnail_url || null]
    );
    
    const cls = await this.getById(id);
    if (!cls) throw new Error('Failed to create class');
    return cls;
  }

  // Get class by ID
  static async getById(id: string): Promise<Class | undefined> {
    return await getOne<Class>(`SELECT * FROM classes WHERE id = $1`, [id]);
  }

  // Get class with teacher info
  static async getByIdWithTeacher(id: string): Promise<any> {
    return await getOne(`
      SELECT c.*, u.name as teacher_name, u.avatar_color as teacher_color
      FROM classes c
      JOIN users u ON c.teacher_id = u.id
      WHERE c.id = $1
    `, [id]);
  }

  // Get all classes
  static async getAll(): Promise<Class[]> {
    return await getAll<Class>(`SELECT * FROM classes ORDER BY created_at DESC`);
  }

  // Get classes by teacher
  static async getByTeacher(teacherId: string): Promise<Class[]> {
    return await getAll<Class>(
      `SELECT * FROM classes WHERE teacher_id = $1 ORDER BY created_at DESC`,
      [teacherId]
    );
  }

  // Update class
  static async update(id: string, data: { 
    title?: string; 
    description?: string;
    thumbnail_url?: string;
  }): Promise<Class | undefined> {
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.title) {
      updates.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.thumbnail_url !== undefined) {
      updates.push(`thumbnail_url = $${paramIndex++}`);
      params.push(data.thumbnail_url);
    }

    if (updates.length === 1) { // Only updated_at
      return await this.getById(id);
    }

    params.push(id);
    await runQuery(`UPDATE classes SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);
    
    return await this.getById(id);
  }

  // Delete class (CASCADE will delete slides)
  static async delete(id: string): Promise<boolean> {
    const result = await runQuery(`DELETE FROM classes WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Get class with slides count
  static async getWithSlidesCount(id: string): Promise<any> {
    return await getOne(`
      SELECT c.*, COUNT(s.id) as slides_count
      FROM classes c
      LEFT JOIN slides s ON c.id = s.class_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);
  }
}
