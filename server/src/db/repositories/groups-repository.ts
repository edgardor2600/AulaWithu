import { runQuery, getOne, getAll } from '../database';
import { Group } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * Repository for managing class groups
<<<<<<< HEAD
 * A group is a subdivision within a class to organize students
 * Example: "English A1" class might have "Group Morning" and "Group Evening"
=======
>>>>>>> f404e31 (temp commit to switch branches)
 */
export class GroupsRepository {
  /**
   * Create a new group for a class
<<<<<<< HEAD
   * @param data - Group data
   * @returns Created group
   */
  static create(data: {
=======
   */
  static async create(data: {
>>>>>>> f404e31 (temp commit to switch branches)
    classId: string;
    name: string;
    description?: string;
    maxStudents?: number;
<<<<<<< HEAD
  }): Group {
    const id = generateId();
    const maxStudents = data.maxStudents || 30;

    runQuery(
      `INSERT INTO groups (id, class_id, name, description, max_students, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, data.classId, data.name, data.description || null, maxStudents]
    );

    return this.getById(id)!;
=======
  }): Promise<Group> {
    const id = generateId();
    const maxStudents = data.maxStudents || 30;

    await runQuery(
      `INSERT INTO groups (id, class_id, name, description, max_students, active)
       VALUES ($1, $2, $3, $4, $5, 1)`,
      [id, data.classId, data.name, data.description || null, maxStudents]
    );

    const group = await this.getById(id);
    if (!group) throw new Error('Failed to create group');
    return group;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get group by ID
   */
<<<<<<< HEAD
  static getById(id: string): Group | undefined {
    return getOne<Group>(
      `SELECT * FROM groups WHERE id = ?`,
=======
  static async getById(id: string): Promise<Group | undefined> {
    return await getOne<Group>(
      `SELECT * FROM groups WHERE id = $1`,
>>>>>>> f404e31 (temp commit to switch branches)
      [id]
    );
  }

  /**
   * Get all groups for a specific class
<<<<<<< HEAD
   * @param classId - Class ID
   * @param activeOnly - Only return active groups (default: true)
   */
  static getByClass(classId: string, activeOnly: boolean = true): Group[] {
    const query = activeOnly
      ? `SELECT * FROM groups WHERE class_id = ? AND active = 1 ORDER BY name`
      : `SELECT * FROM groups WHERE class_id = ? ORDER BY name`;

    return getAll<Group>(query, [classId]);
=======
   */
  static async getByClass(classId: string, activeOnly: boolean = true): Promise<Group[]> {
    const query = activeOnly
      ? `SELECT * FROM groups WHERE class_id = $1 AND active = 1 ORDER BY name`
      : `SELECT * FROM groups WHERE class_id = $1 ORDER BY name`;

    return await getAll<Group>(query, [classId]);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get all groups in the system
<<<<<<< HEAD
   * @param activeOnly - Only return active groups (default: true)
   */
  static getAll(activeOnly: boolean = true): Group[] {
=======
   */
  static async getAll(activeOnly: boolean = true): Promise<Group[]> {
>>>>>>> f404e31 (temp commit to switch branches)
    const query = activeOnly
      ? `SELECT * FROM groups WHERE active = 1 ORDER BY created_at DESC`
      : `SELECT * FROM groups ORDER BY created_at DESC`;

<<<<<<< HEAD
    return getAll<Group>(query);
=======
    return await getAll<Group>(query);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Update group information
<<<<<<< HEAD
   * @param id - Group ID
   * @param data - Update data
   */
  static update(
=======
   */
  static async update(
>>>>>>> f404e31 (temp commit to switch branches)
    id: string,
    data: {
      name?: string;
      description?: string;
      maxStudents?: number;
    }
<<<<<<< HEAD
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
=======
  ): Promise<Group | undefined> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.maxStudents !== undefined) {
      updates.push(`max_students = $${paramIndex++}`);
>>>>>>> f404e31 (temp commit to switch branches)
      params.push(data.maxStudents);
    }

    if (updates.length === 0) {
<<<<<<< HEAD
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
=======
      return await this.getById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    await runQuery(
      `UPDATE groups SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    return await this.getById(id);
  }

  /**
   * Deactivate a group
   */
  static async deactivate(id: string): Promise<boolean> {
    const result = await runQuery(
      `UPDATE groups SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Activate a group
   */
<<<<<<< HEAD
  static activate(id: string): boolean {
    const result = runQuery(
      `UPDATE groups SET active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
=======
  static async activate(id: string): Promise<boolean> {
    const result = await runQuery(
      `UPDATE groups SET active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Permanently delete a group
<<<<<<< HEAD
   * WARNING: This will cascade delete all enrollments
   */
  static delete(id: string): boolean {
    const result = runQuery(
      `DELETE FROM groups WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
=======
   */
  static async delete(id: string): Promise<boolean> {
    const result = await runQuery(
      `DELETE FROM groups WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get student count for a group
<<<<<<< HEAD
   * @param groupId - Group ID
   * @param activeOnly - Only count active enrollments (default: true)
   */
  static getStudentCount(groupId: string, activeOnly: boolean = true): number {
    const query = activeOnly
      ? `SELECT COUNT(*) as count FROM enrollments WHERE group_id = ? AND status = 'active'`
      : `SELECT COUNT(*) as count FROM enrollments WHERE group_id = ?`;

    const result = getOne<{ count: number }>(query, [groupId]);
    return result?.count || 0;
=======
   */
  static async getStudentCount(groupId: string, activeOnly: boolean = true): Promise<number> {
    const query = activeOnly
      ? `SELECT COUNT(*) as count FROM enrollments WHERE group_id = $1 AND status = 'active'`
      : `SELECT COUNT(*) as count FROM enrollments WHERE group_id = $1`;

    const result = await getOne<{ count: string | number }>(query, [groupId]);
    return Number(result?.count) || 0;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Check if group is full
<<<<<<< HEAD
   * @param groupId - Group ID
   */
  static isFull(groupId: string): boolean {
    const group = this.getById(groupId);
    if (!group) return true;

    const currentCount = this.getStudentCount(groupId);
=======
   */
  static async isFull(groupId: string): Promise<boolean> {
    const group = await this.getById(groupId);
    if (!group) return true;

    const currentCount = await this.getStudentCount(groupId);
>>>>>>> f404e31 (temp commit to switch branches)
    return currentCount >= group.max_students;
  }

  /**
   * Get groups with student count
<<<<<<< HEAD
   * @param classId - Class ID
   */
  static getByClassWithCount(classId: string): Array<Group & { student_count: number }> {
    return getAll<Group & { student_count: number }>(
=======
   */
  static async getByClassWithCount(classId: string): Promise<Array<Group & { student_count: number }>> {
    const rows = await getAll<any>(
>>>>>>> f404e31 (temp commit to switch branches)
      `SELECT g.*, 
              COALESCE((SELECT COUNT(*) FROM enrollments e 
                        WHERE e.group_id = g.id AND e.status = 'active'), 0) as student_count
       FROM groups g
<<<<<<< HEAD
       WHERE g.class_id = ? AND g.active = 1
       ORDER BY g.name`,
      [classId]
    );
=======
       WHERE g.class_id = $1 AND g.active = 1
       ORDER BY g.name`,
      [classId]
    );

    return rows.map(row => ({
      ...row,
      student_count: Number(row.student_count)
    }));
>>>>>>> f404e31 (temp commit to switch branches)
  }
}
