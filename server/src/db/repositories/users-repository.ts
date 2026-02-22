import { runQuery, getOne, getAll } from '../database';
import { User } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class UsersRepository {
  // Helper: Generate random avatar color
  private static generateRandomColor(): string {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Create a new user
  static async create(data: { name: string; role: 'teacher' | 'student'; avatar_color?: string; level_id?: string | null }): Promise<User> {
    const id = generateId();
    const avatar_color = data.avatar_color || this.generateRandomColor();
    
    await runQuery(
      `INSERT INTO users (id, name, role, avatar_color, level_id) VALUES ($1, $2, $3, $4, $5)`,
      [id, data.name, data.role, avatar_color, data.level_id || null]
    );
    
    const user = await this.getById(id);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  // Get user by ID
  static async getById(id: string): Promise<User | undefined> {
    return await getOne<User>(`SELECT * FROM users WHERE id = $1`, [id]);
  }

  // Get user by name (for login)
  static async getByName(name: string): Promise<User | undefined> {
    return await getOne<User>(`SELECT * FROM users WHERE name = $1`, [name]);
  }

  // Get all users with optional role filter (includes level information)
  static async getAll(role?: 'teacher' | 'student'): Promise<any[]> {
    const baseQuery = `
      SELECT 
        u.*,
        CASE 
          WHEN al.id IS NOT NULL THEN json_build_object(
            'id', al.id,
            'name', al.name,
            'description', al.description
          )
          ELSE NULL
        END as level
      FROM users u
      LEFT JOIN academic_levels al ON u.level_id = al.id
    `;
    
    if (role) {
      return await getAll<any>(
        `${baseQuery} WHERE u.role = $1 ORDER BY u.created_at DESC`,
        [role]
      );
    }
    return await getAll<any>(`${baseQuery} ORDER BY u.created_at DESC`);
  }

  /**
   * Get paginated users with optional role filter.
   * Returns users for the requested page + total count for pagination metadata.
   *
   * @param options.page   1-based page number (default: 1)
   * @param options.limit  Results per page, max 100 (default: 20)
   * @param options.role   Optional role filter
   */
  static async getPaginated(options: {
    page?: number;
    limit?: number;
    role?: 'admin' | 'teacher' | 'student';
  }): Promise<{ users: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const page  = Math.max(1, options.page  ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const offset = (page - 1) * limit;

    const baseSelect = `
      SELECT 
        u.*,
        CASE 
          WHEN al.id IS NOT NULL THEN json_build_object(
            'id', al.id,
            'name', al.name,
            'description', al.description
          )
          ELSE NULL
        END as level
      FROM users u
      LEFT JOIN academic_levels al ON u.level_id = al.id
    `;
    const baseCount = `SELECT COUNT(*) as total FROM users u`;

    let usersQuery: string;
    let countQuery: string;
    let params: any[];

    if (options.role) {
      usersQuery = `${baseSelect} WHERE u.role = $1 ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`;
      countQuery = `${baseCount} WHERE u.role = $1`;
      params = [options.role, limit, offset];
    } else {
      usersQuery = `${baseSelect} ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`;
      countQuery = baseCount;
      params = [limit, offset];
    }

    const [users, countResult] = await Promise.all([
      getAll<any>(usersQuery, params),
      getOne<{ total: string }>( countQuery, options.role ? [options.role] : [] ),
    ]);

    const total = Number(countResult?.total ?? 0);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }


  // Update user
  static async update(id: string, data: { name?: string; avatar_color?: string; level_id?: string | null }): Promise<User | undefined> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.avatar_color) {
      updates.push(`avatar_color = $${paramIndex++}`);
      params.push(data.avatar_color);
    }
    if (data.level_id !== undefined) {
      updates.push(`level_id = $${paramIndex++}`);
      params.push(data.level_id);
    }

    if (updates.length === 0) {
      return await this.getById(id);
    }

    params.push(id);
    await runQuery(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);
    
    return await this.getById(id);
  }

  // Delete user
  static async delete(id: string): Promise<boolean> {
    const result = await runQuery(`DELETE FROM users WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Get teachers
  static async getTeachers(): Promise<User[]> {
    return await this.getAll('teacher');
  }

  // Get students
  static async getStudents(): Promise<User[]> {
    return await this.getAll('student');
  }

  // ============================================
  // AUTHENTICATION METHODS
  // ============================================

  /**
   * Get user by username (for login)
   * Only returns active users with username set
   */
  static async getByUsername(username: string): Promise<User | undefined> {
    return await getOne<User>(
      `SELECT * FROM users WHERE username = $1 AND active = 1`,
      [username.toLowerCase().trim()]
    );
  }

  /**
   * Create a new user with authentication (username + password)
   */
  static async createWithAuth(data: {
    name: string;
    username: string;
    password_hash: string;
    role: 'admin' | 'teacher' | 'student';
    avatar_color?: string;
    level_id?: string | null;
  }): Promise<User> {
    const id = generateId();
    const avatar_color = data.avatar_color || this.generateRandomColor();

    await runQuery(
      `INSERT INTO users (id, name, username, password_hash, role, avatar_color, active, level_id) 
       VALUES ($1, $2, $3, $4, $5, $6, 1, $7)`,
      [
        id,
        data.name.trim(),
        data.username.toLowerCase().trim(),
        data.password_hash,
        data.role,
        avatar_color,
        data.level_id || null
      ]
    );

    const user = await this.getById(id);
    if (!user) throw new Error('Failed to create user with auth');
    return user;
  }

  /**
   * Update user's password hash
   */
  static async updatePassword(id: string, password_hash: string): Promise<void> {
    await runQuery(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [password_hash, id]
    );
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id: string): Promise<void> {
    await runQuery(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  }

  /**
   * Set user active status (soft delete)
   */
  static async setActive(id: string, active: boolean): Promise<User | undefined> {
    await runQuery(
      `UPDATE users SET active = $1 WHERE id = $2`,
      [active ? 1 : 0, id]
    );
    return await this.getById(id);
  }

  /**
   * Check if username is already taken
   */
  static async isUsernameTaken(username: string): Promise<boolean> {
    const user = await getOne<User>(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`,
      [username.trim()]
    );
    return user !== undefined;
  }
}
