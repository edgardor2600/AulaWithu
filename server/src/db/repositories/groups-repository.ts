import { runQuery, getOne, getAll } from '../database';
import { Group } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * Repository for managing class groups
 * A group is a subdivision within a class to organize students
 * Example: "English A1" class might have "Group Morning" and "Group Evening"
 */
export class GroupsRepository {
  /**
   * Create a new group for a class
   * @param data - Group data
   * @returns Created group
   */
  static create(data: {
    classId: string;
    name: string;
    description?: string;
    maxStudents?: number;
  }): Group {
    const id = generateId();
    const maxStudents = data.maxStudents || 30;

    runQuery(
      `INSERT INTO groups (id, class_id, name, description, max_students, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, data.classId, data.name, data.description || null, maxStudents]
    );

    return this.getById(id)!;
  }

  /**
   * Get group by ID
   */
  static getById(id: string): Group | undefined {
    return getOne<Group>(
      `SELECT * FROM groups WHERE id = ?`,
      [id]
    );
  }

  /**
   * Get all groups for a specific class
   * @param classId - Class ID
   * @param activeOnly - Only return active groups (default: true)
   */
  static getByClass(classId: string, activeOnly: boolean = true): Group[] {
    const query = activeOnly
      ? `SELECT * FROM groups WHERE class_id = ? AND active = 1 ORDER BY name`
      : `SELECT * FROM groups WHERE class_id = ? ORDER BY name`;

    return getAll<Group>(query, [classId]);
  }

  /**
   * Get all groups in the system
   * @param activeOnly - Only return active groups (default: true)
   */
  static getAll(activeOnly: boolean = true): Group[] {
    const query = activeOnly
      ? `SELECT * FROM groups WHERE active = 1 ORDER BY created_at DESC`
      : `SELECT * FROM groups ORDER BY created_at DESC`;

    return getAll<Group>(query);
  }

  /**
   * Update group information
   * @param id - Group ID
   * @param data - Update data
   */
  static update(
    id: string,
    data: {
      name?: string;
      description?: string;
      maxStudents?: number;
    }
  ): Group | undefined {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.maxStudents !== undefined) {
      updates.push('max_students = ?');
      params.push(data.maxStudents);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    runQuery(
      `UPDATE groups SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getById(id);
  }

  /**
   * Deactivate a group (soft delete)
   * Note: This does not affect existing enrollments
   */
  static deactivate(id: string): boolean {
    const result = runQuery(
      `UPDATE groups SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Activate a group
   */
  static activate(id: string): boolean {
    const result = runQuery(
      `UPDATE groups SET active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Permanently delete a group
   * WARNING: This will cascade delete all enrollments
   */
  static delete(id: string): boolean {
    const result = runQuery(
      `DELETE FROM groups WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Get student count for a group
   * @param groupId - Group ID
   * @param activeOnly - Only count active enrollments (default: true)
   */
  static getStudentCount(groupId: string, activeOnly: boolean = true): number {
    const query = activeOnly
      ? `SELECT COUNT(*) as count FROM enrollments WHERE group_id = ? AND status = 'active'`
      : `SELECT COUNT(*) as count FROM enrollments WHERE group_id = ?`;

    const result = getOne<{ count: number }>(query, [groupId]);
    return result?.count || 0;
  }

  /**
   * Check if group is full
   * @param groupId - Group ID
   */
  static isFull(groupId: string): boolean {
    const group = this.getById(groupId);
    if (!group) return true;

    const currentCount = this.getStudentCount(groupId);
    return currentCount >= group.max_students;
  }

  /**
   * Get groups with student count
   * @param classId - Class ID
   */
  static getByClassWithCount(classId: string): Array<Group & { student_count: number }> {
    return getAll<Group & { student_count: number }>(
      `SELECT g.*, 
              COALESCE((SELECT COUNT(*) FROM enrollments e 
                        WHERE e.group_id = g.id AND e.status = 'active'), 0) as student_count
       FROM groups g
       WHERE g.class_id = ? AND g.active = 1
       ORDER BY g.name`,
      [classId]
    );
  }
}
