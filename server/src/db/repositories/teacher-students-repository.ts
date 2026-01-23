import { runQuery, getOne, getAll } from '../database';
import { TeacherStudent } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * Repository for managing teacher-student assignments
<<<<<<< HEAD
 * Handles N:N relationship between teachers and students
=======
>>>>>>> f404e31 (temp commit to switch branches)
 */
export class TeacherStudentsRepository {
  /**
   * Assign a student to a teacher
<<<<<<< HEAD
   * @param teacherId - Teacher's user ID
   * @param studentId - Student's user ID
   * @param assignedBy - Admin user ID who made the assignment
   * @param notes - Optional notes (level, group, etc.)
   * @returns Created assignment
   */
  static assign(data: {
=======
   */
  static async assign(data: {
>>>>>>> f404e31 (temp commit to switch branches)
    teacherId: string;
    studentId: string;
    assignedBy?: string;
    notes?: string;
<<<<<<< HEAD
  }): TeacherStudent {
    const id = generateId();

    runQuery(
      `INSERT INTO teacher_students (id, teacher_id, student_id, assigned_by, notes, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, data.teacherId, data.studentId, data.assignedBy || null, data.notes || null]
    );

    return this.getById(id)!;
=======
  }): Promise<TeacherStudent> {
    const id = generateId();

    await runQuery(
      `INSERT INTO teacher_students (id, teacher_id, student_id, assigned_by, notes, active)
       VALUES ($1, $2, $3, $4, $5, 1)`,
      [id, data.teacherId, data.studentId, data.assignedBy || null, data.notes || null]
    );

    const assignment = await this.getById(id);
    if (!assignment) throw new Error('Failed to create assignment');
    return assignment;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get assignment by ID
   */
<<<<<<< HEAD
  static getById(id: string): TeacherStudent | undefined {
    return getOne<TeacherStudent>(
      `SELECT * FROM teacher_students WHERE id = ?`,
=======
  static async getById(id: string): Promise<TeacherStudent | undefined> {
    return await getOne<TeacherStudent>(
      `SELECT * FROM teacher_students WHERE id = $1`,
>>>>>>> f404e31 (temp commit to switch branches)
      [id]
    );
  }

  /**
   * Get all students assigned to a specific teacher
<<<<<<< HEAD
   * @param teacherId - Teacher's user ID
   * @param activeOnly - Only return active assignments (default: true)
   */
  static getStudentsByTeacher(teacherId: string, activeOnly: boolean = true): TeacherStudent[] {
    const query = activeOnly
      ? `SELECT * FROM teacher_students WHERE teacher_id = ? AND active = 1 ORDER BY assigned_at DESC`
      : `SELECT * FROM teacher_students WHERE teacher_id = ? ORDER BY assigned_at DESC`;

    return getAll<TeacherStudent>(query, [teacherId]);
=======
   */
  static async getStudentsByTeacher(teacherId: string, activeOnly: boolean = true): Promise<TeacherStudent[]> {
    const query = activeOnly
      ? `SELECT * FROM teacher_students WHERE teacher_id = $1 AND active = 1 ORDER BY assigned_at DESC`
      : `SELECT * FROM teacher_students WHERE teacher_id = $1 ORDER BY assigned_at DESC`;

    return await getAll<TeacherStudent>(query, [teacherId]);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get all teachers assigned to a specific student
<<<<<<< HEAD
   * @param studentId - Student's user ID
   * @param activeOnly - Only return active assignments (default: true)
   */
  static getTeachersByStudent(studentId: string, activeOnly: boolean = true): TeacherStudent[] {
    const query = activeOnly
      ? `SELECT * FROM teacher_students WHERE student_id = ? AND active = 1 ORDER BY assigned_at DESC`
      : `SELECT * FROM teacher_students WHERE student_id = ? ORDER BY assigned_at DESC`;

    return getAll<TeacherStudent>(query, [studentId]);
=======
   */
  static async getTeachersByStudent(studentId: string, activeOnly: boolean = true): Promise<TeacherStudent[]> {
    const query = activeOnly
      ? `SELECT * FROM teacher_students WHERE student_id = $1 AND active = 1 ORDER BY assigned_at DESC`
      : `SELECT * FROM teacher_students WHERE student_id = $1 ORDER BY assigned_at DESC`;

    return await getAll<TeacherStudent>(query, [studentId]);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get all assignments in the system
<<<<<<< HEAD
   * @param activeOnly - Only return active assignments (default: true)
   */
  static getAll(activeOnly: boolean = true): TeacherStudent[] {
=======
   */
  static async getAll(activeOnly: boolean = true): Promise<TeacherStudent[]> {
>>>>>>> f404e31 (temp commit to switch branches)
    const query = activeOnly
      ? `SELECT * FROM teacher_students WHERE active = 1 ORDER BY assigned_at DESC`
      : `SELECT * FROM teacher_students ORDER BY assigned_at DESC`;

<<<<<<< HEAD
    return getAll<TeacherStudent>(query);
=======
    return await getAll<TeacherStudent>(query);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Check if a student is assigned to a teacher
   */
<<<<<<< HEAD
  static isAssigned(teacherId: string, studentId: string): boolean {
    const assignment = getOne<TeacherStudent>(
      `SELECT * FROM teacher_students WHERE teacher_id = ? AND student_id = ? AND active = 1`,
=======
  static async isAssigned(teacherId: string, studentId: string): Promise<boolean> {
    const assignment = await getOne<TeacherStudent>(
      `SELECT * FROM teacher_students WHERE teacher_id = $1 AND student_id = $2 AND active = 1`,
>>>>>>> f404e31 (temp commit to switch branches)
      [teacherId, studentId]
    );
    return assignment !== undefined;
  }

  /**
   * Unassign a student from a teacher (soft delete)
<<<<<<< HEAD
   * @param teacherId - Teacher's user ID
   * @param studentId - Student's user ID
   */
  static unassign(teacherId: string, studentId: string): boolean {
    const result = runQuery(
      `UPDATE teacher_students SET active = 0 WHERE teacher_id = ? AND student_id = ?`,
      [teacherId, studentId]
    );
    return result.changes > 0;
=======
   */
  static async unassign(teacherId: string, studentId: string): Promise<boolean> {
    const result = await runQuery(
      `UPDATE teacher_students SET active = 0 WHERE teacher_id = $1 AND student_id = $2`,
      [teacherId, studentId]
    );
    return (result.rowCount ?? 0) > 0;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Permanently delete an assignment
<<<<<<< HEAD
   * @param id - Assignment ID
   */
  static delete(id: string): boolean {
    const result = runQuery(
      `DELETE FROM teacher_students WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
=======
   */
  static async delete(id: string): Promise<boolean> {
    const result = await runQuery(
      `DELETE FROM teacher_students WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get count of students for a teacher
   */
<<<<<<< HEAD
  static getStudentCount(teacherId: string): number {
    const result = getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM teacher_students WHERE teacher_id = ? AND active = 1`,
      [teacherId]
    );
    return result?.count || 0;
=======
  static async getStudentCount(teacherId: string): Promise<number> {
    const result = await getOne<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM teacher_students WHERE teacher_id = $1 AND active = 1`,
      [teacherId]
    );
    return Number(result?.count) || 0;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get count of teachers for a student
   */
<<<<<<< HEAD
  static getTeacherCount(studentId: string): number {
    const result = getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM teacher_students WHERE teacher_id = ? AND active = 1`,
      [studentId]
    );
    return result?.count || 0;
=======
  static async getTeacherCount(studentId: string): Promise<number> {
    const result = await getOne<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM teacher_students WHERE student_id = $1 AND active = 1`,
      [studentId]
    );
    return Number(result?.count) || 0;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Update assignment notes
   */
<<<<<<< HEAD
  static updateNotes(id: string, notes: string): TeacherStudent | undefined {
    runQuery(
      `UPDATE teacher_students SET notes = ? WHERE id = ?`,
      [notes, id]
    );
    return this.getById(id);
=======
  static async updateNotes(id: string, notes: string): Promise<TeacherStudent | undefined> {
    await runQuery(
      `UPDATE teacher_students SET notes = $1 WHERE id = $2`,
      [notes, id]
    );
    return await this.getById(id);
>>>>>>> f404e31 (temp commit to switch branches)
  }
}
