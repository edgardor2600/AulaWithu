import { runQuery, getOne, getAll } from '../database';
import { Enrollment, User } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * Repository for managing student enrollments in groups
 */
export class EnrollmentsRepository {
  /**
   * Enroll a student in a group
   */
  static async enroll(data: {
    groupId: string;
    studentId: string;
    enrolledBy?: string;
    notes?: string;
  }): Promise<Enrollment> {
    const id = generateId();

    await runQuery(
      `INSERT INTO enrollments (id, group_id, student_id, enrolled_by, status, notes)
       VALUES ($1, $2, $3, $4, 'active', $5)`,
      [id, data.groupId, data.studentId, data.enrolledBy || null, data.notes || null]
    );

    const enrollment = await this.getById(id);
    if (!enrollment) throw new Error('Failed to enroll student');
    return enrollment;
  }

  /**
   * Get enrollment by ID
   */
  static async getById(id: string): Promise<Enrollment | undefined> {
    return await getOne<Enrollment>(
      `SELECT * FROM enrollments WHERE id = $1`,
      [id]
    );
  }

  /**
   * Get all students enrolled in a specific group
   */
  static async getByGroup(groupId: string, activeOnly: boolean = true): Promise<Enrollment[]> {
    const query = activeOnly
      ? `SELECT * FROM enrollments WHERE group_id = $1 AND status = 'active' ORDER BY enrolled_at DESC`
      : `SELECT * FROM enrollments WHERE group_id = $1 ORDER BY enrolled_at DESC`;

    return await getAll<Enrollment>(query, [groupId]);
  }

  /**
   * Get all groups a student is enrolled in
   */
  static async getByStudent(studentId: string, activeOnly: boolean = true): Promise<Enrollment[]> {
    const query = activeOnly
      ? `SELECT * FROM enrollments WHERE student_id = $1 AND status = 'active' ORDER BY enrolled_at DESC`
      : `SELECT * FROM enrollments WHERE student_id = $1 ORDER BY enrolled_at DESC`;

    return await getAll<Enrollment>(query, [studentId]);
  }

  /**
   * Get students enrolled in a group with their user info
   */
  static async getStudentsWithInfo(
    groupId: string,
    activeOnly: boolean = true
  ): Promise<Array<{
    enrollment: Enrollment;
    student: User;
  }>> {
    const statusFilter = activeOnly ? `AND e.status = 'active'` : '';

    const rows = await getAll<any>(
      `SELECT 
        e.id as enrollment_id,
        e.group_id,
        e.student_id,
        e.enrolled_at,
        e.enrolled_by,
        e.status,
        e.notes,
        u.id as student_user_id,
        u.name as student_name,
        u.username as student_username,
        u.avatar_color as student_avatar_color,
        u.role as student_role,
        u.active as student_active,
        u.level_id as student_level_id
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       WHERE e.group_id = $1 ${statusFilter}
       ORDER BY e.enrolled_at DESC`,
      [groupId]
    );

    return rows.map((row) => ({
      enrollment: {
        id: row.enrollment_id,
        group_id: row.group_id,
        student_id: row.student_id,
        enrolled_at: row.enrolled_at,
        enrolled_by: row.enrolled_by,
        status: row.status,
        notes: row.notes,
      },
      student: {
        id: row.student_user_id,
        name: row.student_name,
        username: row.student_username,
        avatar_color: row.student_avatar_color,
        role: row.student_role,
        active: row.student_active,
        created_at: '', // Not fetched
        password_hash: null,
        last_login: null,
        level_id: row.student_level_id,
      },
    }));
  }

  /**
   * Check if a student is already enrolled in a group
   */
  static async isEnrolled(
    groupId: string,
    studentId: string,
    activeOnly: boolean = true
  ): Promise<boolean> {
    const query = activeOnly
      ? `SELECT id FROM enrollments WHERE group_id = $1 AND student_id = $2 AND status = 'active'`
      : `SELECT id FROM enrollments WHERE group_id = $1 AND student_id = $2`;

    const enrollment = await getOne<Enrollment>(query, [groupId, studentId]);
    return enrollment !== undefined;
  }

  /**
   * Update enrollment status
   */
  static async updateStatus(
    id: string,
    status: 'active' | 'inactive' | 'completed'
  ): Promise<Enrollment | undefined> {
    await runQuery(
      `UPDATE enrollments SET status = $1 WHERE id = $2`,
      [status, id]
    );
    return await this.getById(id);
  }

  /**
   * Update enrollment notes
   */
  static async updateNotes(id: string, notes: string): Promise<Enrollment | undefined> {
    await runQuery(
      `UPDATE enrollments SET notes = $1 WHERE id = $2`,
      [notes, id]
    );
    return await this.getById(id);
  }

  /**
   * Unenroll a student from a group
   */
  static async unenroll(groupId: string, studentId: string): Promise<boolean> {
    const result = await runQuery(
      `UPDATE enrollments SET status = 'inactive' WHERE group_id = $1 AND student_id = $2`,
      [groupId, studentId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Permanently delete an enrollment
   */
  static async delete(id: string): Promise<boolean> {
    const result = await runQuery(
      `DELETE FROM enrollments WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get enrollment count for a student
   */
  static async getEnrollmentCount(studentId: string, activeOnly: boolean = true): Promise<number> {
    const query = activeOnly
      ? `SELECT COUNT(*) as count FROM enrollments WHERE student_id = $1 AND status = 'active'`
      : `SELECT COUNT(*) as count FROM enrollments WHERE student_id = $1`;

    const result = await getOne<{ count: string | number }>(query, [studentId]);
    return Number(result?.count) || 0;
  }

  /**
   * Get all enrollments for a class
   */
  static async getByClass(classId: string): Promise<Array<Enrollment & { group_name: string }>> {
    return await getAll<Enrollment & { group_name: string }>(
      `SELECT e.*, g.name as group_name
       FROM enrollments e
       JOIN groups g ON g.id = e.group_id
       WHERE g.class_id = $1 AND e.status = 'active'
       ORDER BY g.name, e.enrolled_at DESC`,
      [classId]
    );
  }

  /**
   * Deactivate all enrollments for a student
   */
  static async deactivateAllByStudent(studentId: string): Promise<void> {
    await runQuery(
      `UPDATE enrollments SET status = 'inactive' WHERE student_id = $1 AND status = 'active'`,
      [studentId]
    );
  }

  // ============================================
  // TEACHER-STUDENT RELATIONSHIP FUNCTIONS
  // (Replaces teacher_students table functionality)
  // ============================================

  /**
   * Check if two users can message each other
   * Users can message if they share at least one active group
   * (either as teacher-student or student-student in same group)
   */
  static async canMessage(userId1: string, userId2: string): Promise<boolean> {
    const result = await getOne<{ count: string | number }>(
      `SELECT COUNT(DISTINCT g.id) as count
       FROM enrollments e1
       JOIN enrollments e2 ON e1.group_id = e2.group_id
       JOIN groups g ON e1.group_id = g.id
       JOIN classes c ON g.class_id = c.id
       WHERE e1.status = 'active' 
         AND e2.status = 'active'
         AND g.active = 1
         AND (
           -- Case 1: userId1 is teacher, userId2 is student
           (c.teacher_id = $1 AND e2.student_id = $2)
           OR
           -- Case 2: userId2 is teacher, userId1 is student
           (c.teacher_id = $3 AND e1.student_id = $4)
           OR
           -- Case 3: Both are students in the same group
           (e1.student_id = $5 AND e2.student_id = $6)
         )`,
      [userId1, userId2, userId2, userId1, userId1, userId2]
    );
    return (Number(result?.count) || 0) > 0;
  }

  /**
   * Get all students of a teacher (across all their groups)
   * Returns unique students with their enrollment details
   */
  static async getStudentsByTeacher(teacherId: string): Promise<Array<{
    student_id: string;
    enrollment_id: string;
    group_id: string;
    class_id: string;
    enrolled_at: string;
    notes: string | null;
  }>> {
    return await getAll(
      `SELECT DISTINCT
         e.student_id,
         e.id as enrollment_id,
         e.group_id,
         g.class_id,
         e.enrolled_at,
         e.notes
       FROM enrollments e
       JOIN groups g ON e.group_id = g.id
       JOIN classes c ON g.class_id = c.id
       WHERE c.teacher_id = $1
         AND e.status = 'active'
         AND g.active = 1
       ORDER BY e.enrolled_at DESC`,
      [teacherId]
    );
  }

  /**
   * Get all teachers of a student (across all their groups)
   * Returns unique teachers with enrollment context
   */
  static async getTeachersByStudent(studentId: string): Promise<Array<{
    teacher_id: string;
    class_id: string;
    group_id: string;
    enrolled_at: string;
  }>> {
    return await getAll(
      `SELECT DISTINCT
         c.teacher_id,
         c.id as class_id,
         g.id as group_id,
         e.enrolled_at
       FROM enrollments e
       JOIN groups g ON e.group_id = g.id
       JOIN classes c ON g.class_id = c.id
       WHERE e.student_id = $1
         AND e.status = 'active'
         AND g.active = 1
       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );
  }

  /**
   * Get all class IDs a student is enrolled in
   * Useful for filtering classes for students
   */
  static async getStudentClasses(studentId: string): Promise<string[]> {
    const result = await getAll<{ class_id: string }>(
      `SELECT DISTINCT c.id as class_id
       FROM enrollments e
       JOIN groups g ON e.group_id = g.id
       JOIN classes c ON g.class_id = c.id
       WHERE e.student_id = $1
         AND e.status = 'active'
         AND g.active = 1`,
      [studentId]
    );
    return result.map(r => r.class_id);
  }
}
