import { runQuery, getOne, getAll } from '../database';
import { StudentCopy } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class StudentCopiesRepository {
  // Save student copy (create or update)
  static save(data: { 
    slide_id: string; 
    student_id: string;
    canvas_data: string;
  }): StudentCopy {
    // Check if copy already exists
    const existing = getOne<StudentCopy>(
      `SELECT * FROM student_copies WHERE slide_id = ? AND student_id = ?`,
      [data.slide_id, data.student_id]
    );

    if (existing) {
      // Update existing copy
      runQuery(
        `UPDATE student_copies SET canvas_data = ?, saved_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [data.canvas_data, existing.id]
      );
      return this.getById(existing.id)!;
    }

    // Create new copy
    const id = generateId();
    runQuery(
      `INSERT INTO student_copies (id, slide_id, student_id, canvas_data) VALUES (?, ?, ?, ?)`,
      [id, data.slide_id, data.student_id, data.canvas_data]
    );
    
    return this.getById(id)!;
  }

  // Get copy by ID
  static getById(id: string): StudentCopy | undefined {
    return getOne<StudentCopy>(`SELECT * FROM student_copies WHERE id = ?`, [id]);
  }

  // Get copy by slide and student
  static getBySlideAndStudent(slideId: string, studentId: string): StudentCopy | undefined {
    return getOne<StudentCopy>(
      `SELECT * FROM student_copies WHERE slide_id = ? AND student_id = ?`,
      [slideId, studentId]
    );
  }

  // Get all copies by student
  static getByStudent(studentId: string): StudentCopy[] {
    return getAll<StudentCopy>(
      `SELECT * FROM student_copies WHERE student_id = ? ORDER BY saved_at DESC`,
      [studentId]
    );
  }

  // Get copies by student with slide and class info
  static getByStudentWithDetails(studentId: string): any[] {
    return getAll(`
      SELECT sc.*, s.title as slide_title, s.slide_number, c.title as class_title, c.id as class_id
      FROM student_copies sc
      JOIN slides s ON sc.slide_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE sc.student_id = ?
      ORDER BY sc.saved_at DESC
    `, [studentId]);
  }

  // Get all copies for a slide
  static getBySlide(slideId: string): any[] {
    return getAll(`
      SELECT sc.*, u.name as student_name, u.avatar_color
      FROM student_copies sc
      JOIN users u ON sc.student_id = u.id
      WHERE sc.slide_id = ?
      ORDER BY sc.saved_at DESC
    `, [slideId]);
  }

  // Delete copy
  static delete(id: string): boolean {
    const result = runQuery(`DELETE FROM student_copies WHERE id = ?`, [id]);
    return result.changes > 0;
  }

  // Delete all copies by student
  static deleteByStudent(studentId: string): number {
    const result = runQuery(`DELETE FROM student_copies WHERE student_id = ?`, [studentId]);
    return result.changes;
  }
}
