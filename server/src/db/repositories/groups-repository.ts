import { runQuery, getOne, getAll } from '../database';
import { Group } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * Repository for managing class groups
 */
export class GroupsRepository {
  /**
   * Create a new group for a class
   */
  static async create(data: {
    classId: string;
    name: string;
    description?: string;
    maxStudents?: number;
    scheduleTime?: string;
  }): Promise<Group> {
    const id = generateId();
    const maxStudents = data.maxStudents || 30;

    await runQuery(
      `INSERT INTO groups (id, class_id, name, description, max_students, active, schedule_time)
       VALUES ($1, $2, $3, $4, $5, 1, $6)`,
      [
        id, 
        data.classId, 
        data.name, 
        data.description || null, 
        maxStudents,
        data.scheduleTime || null
      ]
    );

    const group = await this.getById(id);
    if (!group) throw new Error('Failed to create group');
    return group;
  }

  /**
   * Get group by ID
   */
  static async getById(id: string): Promise<Group | undefined> {
    return await getOne<Group>(
      `SELECT * FROM groups WHERE id = $1`,
      [id]
    );
  }

  /**
   * Get all groups for a specific class
   */
  static async getByClass(classId: string, activeOnly: boolean = true): Promise<Group[]> {
    const query = activeOnly
      ? `SELECT * FROM groups WHERE class_id = $1 AND active = 1 ORDER BY name`
      : `SELECT * FROM groups WHERE class_id = $1 ORDER BY name`;

    return await getAll<Group>(query, [classId]);
  }

  /**
   * Get all groups in the system
   */
  static async getAll(activeOnly: boolean = true): Promise<Group[]> {
    const query = activeOnly
      ? `SELECT * FROM groups WHERE active = 1 ORDER BY created_at DESC`
      : `SELECT * FROM groups ORDER BY created_at DESC`;

    return await getAll<Group>(query);
  }

  /**
   * Update group information
   */
  static async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      maxStudents?: number;
      scheduleTime?: string;
    }
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
      params.push(data.maxStudents);
    }
    if (data.scheduleTime !== undefined) {
      updates.push(`schedule_time = $${paramIndex++}`);
      params.push(data.scheduleTime);
    }

    if (updates.length === 0) {
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
  }

  /**
   * Activate a group
   */
  static async activate(id: string): Promise<boolean> {
    const result = await runQuery(
      `UPDATE groups SET active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Permanently delete a group
   */
  static async delete(id: string): Promise<boolean> {
    const result = await runQuery(
      `DELETE FROM groups WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get student count for a group
   */
  static async getStudentCount(groupId: string, activeOnly: boolean = true): Promise<number> {
    const query = activeOnly
      ? `SELECT COUNT(*) as count FROM enrollments WHERE group_id = $1 AND status = 'active'`
      : `SELECT COUNT(*) as count FROM enrollments WHERE group_id = $1`;

    const result = await getOne<{ count: string | number }>(query, [groupId]);
    return Number(result?.count) || 0;
  }

  /**
   * Check if group is full
   */
  static async isFull(groupId: string): Promise<boolean> {
    const group = await this.getById(groupId);
    if (!group) return true;

    const currentCount = await this.getStudentCount(groupId);
    return currentCount >= group.max_students;
  }

  /**
   * Get groups with student count
   */
  static async getByClassWithCount(classId: string): Promise<Array<Group & { student_count: number }>> {
    const rows = await getAll<any>(
      `SELECT g.*, 
              COALESCE((SELECT COUNT(*) FROM enrollments e 
                        WHERE e.group_id = g.id AND e.status = 'active'), 0) as student_count
       FROM groups g
       WHERE g.class_id = $1 AND g.active = 1
       ORDER BY g.name`,
      [classId]
    );

    return rows.map(row => ({
      ...row,
      student_count: Number(row.student_count)
    }));
  }
}
