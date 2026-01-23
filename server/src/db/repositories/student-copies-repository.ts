import { runQuery, getOne, getAll } from '../database';
import { StudentCopy } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class StudentCopiesRepository {
  // Save student copy (create or update)
  static async save(data: { 
    slide_id: string; 
    student_id: string;
    canvas_data: string;
  }): Promise<StudentCopy> {
    // Check if copy already exists
    const existing = await getOne<StudentCopy>(
      `SELECT * FROM student_copies WHERE slide_id = $1 AND student_id = $2`,
      [data.slide_id, data.student_id]
    );

    if (existing) {
      // Update existing copy
      await runQuery(
        `UPDATE student_copies SET canvas_data = $1, saved_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [data.canvas_data, existing.id]
      );
      return (await this.getById(existing.id))!;
    }

    // Create new copy
    const id = generateId();
    await runQuery(
      `INSERT INTO student_copies (id, slide_id, student_id, canvas_data) VALUES ($1, $2, $3, $4)`,
      [id, data.slide_id, data.student_id, data.canvas_data]
    );
    
    const copy = await this.getById(id);
    if (!copy) throw new Error('Failed to save student copy');
    return copy;
  }

  // Get copy by ID
  static async getById(id: string): Promise<StudentCopy | undefined> {
    return await getOne<StudentCopy>(`SELECT * FROM student_copies WHERE id = $1`, [id]);
  }

  // Get copy by slide and student
  static async getBySlideAndStudent(slideId: string, studentId: string): Promise<StudentCopy | undefined> {
    return await getOne<StudentCopy>(
      `SELECT * FROM student_copies WHERE slide_id = $1 AND student_id = $2`,
      [slideId, studentId]
    );
  }

  // Get all copies by student
  static async getByStudent(studentId: string): Promise<StudentCopy[]> {
    return await getAll<StudentCopy>(
      `SELECT * FROM student_copies WHERE student_id = $1 ORDER BY saved_at DESC`,
      [studentId]
    );
  }

  // Get copies by student with slide and class info
  static async getByStudentWithDetails(studentId: string): Promise<any[]> {
    return await getAll(`
      SELECT sc.*, s.title as slide_title, s.slide_number, c.title as class_title, c.id as class_id
      FROM student_copies sc
      JOIN slides s ON sc.slide_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE sc.student_id = $1
      ORDER BY sc.saved_at DESC
    `, [studentId]);
  }

  // Get all copies for a slide
  static async getBySlide(slideId: string): Promise<any[]> {
    return await getAll(`
      SELECT sc.*, u.name as student_name, u.avatar_color
      FROM student_copies sc
      JOIN users u ON sc.student_id = u.id
      WHERE sc.slide_id = $1
      ORDER BY sc.saved_at DESC
    `, [slideId]);
  }

  // Delete copy
  static async delete(id: string): Promise<boolean> {
    const result = await runQuery(`DELETE FROM student_copies WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Delete all copies by student
  static async deleteByStudent(studentId: string): Promise<number> {
    const result = await runQuery(`DELETE FROM student_copies WHERE student_id = $1`, [studentId]);
    return (result.rowCount ?? 0);
  }

  // Delete all copies by slide (for cascade delete)
  static async deleteBySlide(slideId: string): Promise<number> {
    const result = await runQuery(`DELETE FROM student_copies WHERE slide_id = $1`, [slideId]);
    return (result.rowCount ?? 0);
  }
}
