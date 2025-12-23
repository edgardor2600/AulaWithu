import { runQuery, getOne, getAll } from '../database';
import { Enrollment, User } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * Repository for managing student enrollments in groups
 * Handles the N:N relationship between students and groups
 */
export class EnrollmentsRepository {
  /**
   * Enroll a student in a group
   * @param data - Enrollment data
   * @returns Created enrollment
   */
  static enroll(data: {
    groupId: string;
    studentId: string;
    enrolledBy?: string;
    notes?: string;
  }): Enrollment {
    const id = generateId();

    runQuery(
      `INSERT INTO enrollments (id, group_id, student_id, enrolled_by, status, notes)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [id, data.groupId, data.studentId, data.enrolledBy || null, data.notes || null]
    );

    return this.getById(id)!;
  }

  /**
   * Get enrollment by ID
   */
  static getById(id: string): Enrollment | undefined {
    return getOne<Enrollment>(
      `SELECT * FROM enrollments WHERE id = ?`,
      [id]
    );
  }

  /**
   * Get all students enrolled in a specific group
   * @param groupId - Group ID
   * @param activeOnly - Only return active enrollments (default: true)
   */
  static getByGroup(groupId: string, activeOnly: boolean = true): Enrollment[] {
    const query = activeOnly
      ? `SELECT * FROM enrollments WHERE group_id = ? AND status = 'active' ORDER BY enrolled_at DESC`
      : `SELECT * FROM enrollments WHERE group_id = ? ORDER BY enrolled_at DESC`;

    return getAll<Enrollment>(query, [groupId]);
  }

  /**
   * Get all groups a student is enrolled in
   * @param studentId - Student user ID
   * @param activeOnly - Only return active enrollments (default: true)
   */
  static getByStudent(studentId: string, activeOnly: boolean = true): Enrollment[] {
    const query = activeOnly
      ? `SELECT * FROM enrollments WHERE student_id = ? AND status = 'active' ORDER BY enrolled_at DESC`
      : `SELECT * FROM enrollments WHERE student_id = ? ORDER BY enrolled_at DESC`;

    return getAll<Enrollment>(query, [studentId]);
  }

  /**
   * Get students enrolled in a group with their user info
   * @param groupId - Group ID
   * @param activeOnly - Only return active enrollments (default: true)
   */
  static getStudentsWithInfo(
    groupId: string,
    activeOnly: boolean = true
  ): Array<{
    enrollment: Enrollment;
    student: User;
  }> {
    const statusFilter = activeOnly ? `AND e.status = 'active'` : '';

    return getAll<any>(
      `SELECT 
        e.id as enrollment_id,
        e.group_id,
        e.student_id,
        e.enrolled_at,
        e.enrolled_by,
        e.status,
        e.notes,
        u.id as student_id,
        u.name as student_name,
        u.username as student_username,
        u.avatar_color as student_avatar_color,
        u.role as student_role,
        u.active as student_active
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       WHERE e.group_id = ? ${statusFilter}
       ORDER BY e.enrolled_at DESC`,
      [groupId]
    ).map((row) => ({
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
        id: row.student_id,
        name: row.student_name,
        username: row.student_username,
        avatar_color: row.student_avatar_color,
        role: row.student_role,
        active: row.student_active,
        created_at: '', // Not fetched
        password_hash: null,
        last_login: null,
      },
    }));
  }

  /**
   * Check if a student is already enrolled in a group
   * @param groupId - Group ID
   * @param studentId - Student user ID
   * @param activeOnly - Only check active enrollments (default: true)
   */
  static isEnrolled(
    groupId: string,
    studentId: string,
    activeOnly: boolean = true
  ): boolean {
    const query = activeOnly
      ? `SELECT id FROM enrollments WHERE group_id = ? AND student_id = ? AND status = 'active'`
      : `SELECT id FROM enrollments WHERE group_id = ? AND student_id = ?`;

    const enrollment = getOne<Enrollment>(query, [groupId, studentId]);
    return enrollment !== undefined;
  }

  /**
   * Update enrollment status
   * @param id - Enrollment ID
   * @param status - New status
   */
  static updateStatus(
    id: string,
    status: 'active' | 'inactive' | 'completed'
  ): Enrollment | undefined {
    runQuery(
      `UPDATE enrollments SET status = ? WHERE id = ?`,
      [status, id]
    );
    return this.getById(id);
  }

  /**
   * Update enrollment notes
   * @param id - Enrollment ID
   * @param notes - Notes to update
   */
  static updateNotes(id: string, notes: string): Enrollment | undefined {
    runQuery(
      `UPDATE enrollments SET notes = ? WHERE id = ?`,
      [notes, id]
    );
    return this.getById(id);
  }

  /**
   * Unenroll a student from a group (set status to inactive)
   * @param groupId - Group ID
   * @param studentId - Student user ID
   */
  static unenroll(groupId: string, studentId: string): boolean {
    const result = runQuery(
      `UPDATE enrollments SET status = 'inactive' WHERE group_id = ? AND student_id = ?`,
      [groupId, studentId]
    );
    return result.changes > 0;
  }

  /**
   * Permanently delete an enrollment
   * @param id - Enrollment ID
   */
  static delete(id: string): boolean {
    const result = runQuery(
      `DELETE FROM enrollments WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Get enrollment count for a student
   * @param studentId - Student user ID
   * @param activeOnly - Only count active enrollments (default: true)
   */
  static getEnrollmentCount(studentId: string, activeOnly: boolean = true): number {
    const query = activeOnly
      ? `SELECT COUNT(*) as count FROM enrollments WHERE student_id = ? AND status = 'active'`
      : `SELECT COUNT(*) as count FROM enrollments WHERE student_id = ?`;

    const result = getOne<{ count: number }>(query, [studentId]);
    return result?.count || 0;
  }

  /**
   * Get all enrollments for a class (across all groups)
   * Useful for class-wide statistics
   * @param classId - Class ID
   */
  static getByClass(classId: string): Array<Enrollment & { group_name: string }> {
    return getAll<Enrollment & { group_name: string }>(
      `SELECT e.*, g.name as group_name
       FROM enrollments e
       JOIN groups g ON g.id = e.group_id
       WHERE g.class_id = ? AND e.status = 'active'
       ORDER BY g.name, e.enrolled_at DESC`,
      [classId]
    );
  }
}
