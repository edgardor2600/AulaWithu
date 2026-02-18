
import { runQuery, getOne, getAll } from '../database';
import { AcademicLevel } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * Repository for managing academic levels
 */
export class LevelsRepository {
  /**
   * Create a new level
   */
  static async create(data: { name: string; description?: string }): Promise<AcademicLevel> {
    const id = generateId();
    await runQuery(
      'INSERT INTO academic_levels (id, name, description) VALUES ($1, $2, $3)',
      [id, data.name, data.description || null]
    );

    const level = await this.getById(id);
    if (!level) throw new Error('Failed to create academic level');
    return level;
  }

  /**
   * Get level by ID
   */
  static async getById(id: string): Promise<AcademicLevel | undefined> {
    return await getOne<AcademicLevel>(
      'SELECT * FROM academic_levels WHERE id = $1',
      [id]
    );
  }

  /**
   * Get all levels
   */
  static async getAll(): Promise<AcademicLevel[]> {
    return await getAll<AcademicLevel>(
      'SELECT * FROM academic_levels ORDER BY name ASC'
    );
  }

  /**
   * Update a level
   */
  static async update(id: string, data: { name?: string; description?: string }): Promise<AcademicLevel | undefined> {
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

    if (updates.length === 0) return await this.getById(id);

    params.push(id);
    await runQuery(
      `UPDATE academic_levels SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    return await this.getById(id);
  }

  /**
   * Delete a level
   */
  static async delete(id: string): Promise<boolean> {
    const result = await runQuery('DELETE FROM academic_levels WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
