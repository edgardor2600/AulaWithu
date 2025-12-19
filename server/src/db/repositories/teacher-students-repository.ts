import { runQuery, getOne, getAll } from '../database';
import { TeacherStudent } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * Repository for managing teacher-student assignments
 * Handles N:N relationship between teachers and students
 */
export class TeacherStudentsRepository {
  /**
   * Assign a student to a teacher
   * @param teacherId - Teacher's user ID
   * @param studentId - Student's user ID
   * @param assignedBy - Admin user ID who made the assignment
   * @param notes - Optional notes (level, group, etc.)
   * @returns Created assignment
   */
  static assign(data: {
    teacherId: string;
    studentId: string;
    assignedBy?: string;
    notes?: string;
  }): TeacherStudent {
    const id = generateId();

    runQuery(
      `INSERT INTO teacher_students (id, teacher_id, student_id, assigned_by, notes, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, data.teacherId, data.studentId, data.assignedBy || null, data.notes || null]
    );

    return this.getById(id)!;
  }

  /**
   * Get assignment by ID
   */
  static getById(id: string): TeacherStudent | undefined {
    return getOne<TeacherStudent>(
      `SELECT * FROM teacher_students WHERE id = ?`,
      [id]
    );
  }

  /**
   * Get all students assigned to a specific teacher
   * @param teacherId - Teacher's user ID
   * @param activeOnly - Only return active assignments (default: true)
   */
  static getStudentsByTeacher(teacherId: string, activeOnly: boolean = true): TeacherStudent[] {
    const query = activeOnly
      ? `SELECT * FROM teacher_students WHERE teacher_id = ? AND active = 1 ORDER BY assigned_at DESC`
      : `SELECT * FROM teacher_students WHERE teacher_id = ? ORDER BY assigned_at DESC`;

    return getAll<TeacherStudent>(query, [teacherId]);
  }

  /**
   * Get all teachers assigned to a specific student
   * @param studentId - Student's user ID
   * @param activeOnly - Only return active assignments (default: true)
   */
  static getTeachersByStudent(studentId: string, activeOnly: boolean = true): TeacherStudent[] {
    const query = activeOnly
      ? `SELECT * FROM teacher_students WHERE student_id = ? AND active = 1 ORDER BY assigned_at DESC`
      : `SELECT * FROM teacher_students WHERE student_id = ? ORDER BY assigned_at DESC`;

    return getAll<TeacherStudent>(query, [studentId]);
  }

  /**
   * Get all assignments in the system
   * @param activeOnly - Only return active assignments (default: true)
   */
  static getAll(activeOnly: boolean = true): TeacherStudent[] {
    const query = activeOnly
      ? `SELECT * FROM teacher_students WHERE active = 1 ORDER BY assigned_at DESC`
      : `SELECT * FROM teacher_students ORDER BY assigned_at DESC`;

    return getAll<TeacherStudent>(query);
  }

  /**
   * Check if a student is assigned to a teacher
   */
  static isAssigned(teacherId: string, studentId: string): boolean {
    const assignment = getOne<TeacherStudent>(
      `SELECT * FROM teacher_students WHERE teacher_id = ? AND student_id = ? AND active = 1`,
      [teacherId, studentId]
    );
    return assignment !== undefined;
  }

  /**
   * Unassign a student from a teacher (soft delete)
   * @param teacherId - Teacher's user ID
   * @param studentId - Student's user ID
   */
  static unassign(teacherId: string, studentId: string): boolean {
    const result = runQuery(
      `UPDATE teacher_students SET active = 0 WHERE teacher_id = ? AND student_id = ?`,
      [teacherId, studentId]
    );
    return result.changes > 0;
  }

  /**
   * Permanently delete an assignment
   * @param id - Assignment ID
   */
  static delete(id: string): boolean {
    const result = runQuery(
      `DELETE FROM teacher_students WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Get count of students for a teacher
   */
  static getStudentCount(teacherId: string): number {
    const result = getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM teacher_students WHERE teacher_id = ? AND active = 1`,
      [teacherId]
    );
    return result?.count || 0;
  }

  /**
   * Get count of teachers for a student
   */
  static getTeacherCount(studentId: string): number {
    const result = getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM teacher_students WHERE teacher_id = ? AND active = 1`,
      [studentId]
    );
    return result?.count || 0;
  }

  /**
   * Update assignment notes
   */
  static updateNotes(id: string, notes: string): TeacherStudent | undefined {
    runQuery(
      `UPDATE teacher_students SET notes = ? WHERE id = ?`,
      [notes, id]
    );
    return this.getById(id);
  }
}
