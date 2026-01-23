import { runQuery, getOne, getAll } from '../database';
import { User } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class UsersRepository {
<<<<<<< HEAD
  // Create a new user
  static create(data: { name: string; role: 'teacher' | 'student'; avatar_color?: string }): User {
    const id = generateId();
    const avatar_color = data.avatar_color || this.generateRandomColor();
    
    runQuery(
      `INSERT INTO users (id, name, role, avatar_color) VALUES (?, ?, ?, ?)`,
      [id, data.name, data.role, avatar_color]
    );
    
    return this.getById(id)!;
  }

  // Get user by ID
  static getById(id: string): User | undefined {
    return getOne<User>(`SELECT * FROM users WHERE id = ?`, [id]);
  }

  // Get user by name (for login)
  static getByName(name: string): User | undefined {
    return getOne<User>(`SELECT * FROM users WHERE name = ?`, [name]);
  }

  // Get all users with optional role filter
  static getAll(role?: 'teacher' | 'student'): User[] {
    if (role) {
      return getAll<User>(`SELECT * FROM users WHERE role = ? ORDER BY created_at DESC`, [role]);
    }
    return getAll<User>(`SELECT * FROM users ORDER BY created_at DESC`);
  }

  // Update user
  static update(id: string, data: { name?: string; avatar_color?: string }): User | undefined {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.avatar_color) {
      updates.push('avatar_color = ?');
      params.push(data.avatar_color);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    params.push(id);
    runQuery(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    
    return this.getById(id);
  }

  // Delete user
  static delete(id: string): boolean {
    const result = runQuery(`DELETE FROM users WHERE id = ?`, [id]);
    return result.changes > 0;
  }

  // Get teachers
  static getTeachers(): User[] {
    return this.getAll('teacher');
  }

  // Get students
  static getStudents(): User[] {
    return this.getAll('student');
  }

  // ============================================
  // AUTHENTICATION METHODS (Added in Phase 2)
  // ============================================

  /**
   * Get user by username (for login)
   * Only returns active users with username set
   */
  static getByUsername(username: string): User | undefined {
    return getOne<User>(
      `SELECT * FROM users WHERE username = ? AND active = 1`,
      [username.toLowerCase().trim()]
    );
  }

  /**
   * Create a new user with authentication (username + password)
   * For registration flow
   */
  static createWithAuth(data: {
    name: string;
    username: string;
    password_hash: string;
    role: 'admin' | 'teacher' | 'student';
    avatar_color?: string;
  }): User {
    const id = generateId();
    const avatar_color = data.avatar_color || this.generateRandomColor();

    runQuery(
      `INSERT INTO users (id, name, username, password_hash, role, avatar_color, active) 
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        data.name.trim(),
        data.username.toLowerCase().trim(),
        data.password_hash,
        data.role,
        avatar_color,
      ]
    );

    return this.getById(id)!;
  }

  /**
   * Update user's password hash
   * For password change functionality
   */
  static updatePassword(id: string, password_hash: string): void {
    runQuery(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [password_hash, id]
    );
  }

  /**
   * Update last login timestamp
   * Called after successful login
   */
  static updateLastLogin(id: string): void {
    runQuery(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }

  /**
   * Set user active status (soft delete)
   * active = 1 (enabled), active = 0 (disabled)
   */
  static setActive(id: string, active: boolean): User | undefined {
    runQuery(
      `UPDATE users SET active = ? WHERE id = ?`,
      [active ? 1 : 0, id]
    );
    return this.getById(id);
  }

  /**
   * Check if username is already taken
   * Returns true if username exists (case-insensitive)
   */
  static isUsernameTaken(username: string): boolean {
    const user = getOne<User>(
      `SELECT id FROM users WHERE LOWER(username) = LOWER(?)`,
      [username.trim()]
    );
    return user !== undefined;
  }

=======
>>>>>>> f404e31 (temp commit to switch branches)
  // Helper: Generate random avatar color
  private static generateRandomColor(): string {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Create a new user
  static async create(data: { name: string; role: 'teacher' | 'student'; avatar_color?: string }): Promise<User> {
    const id = generateId();
    const avatar_color = data.avatar_color || this.generateRandomColor();
    
    await runQuery(
      `INSERT INTO users (id, name, role, avatar_color) VALUES ($1, $2, $3, $4)`,
      [id, data.name, data.role, avatar_color]
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

  // Get all users with optional role filter
  static async getAll(role?: 'teacher' | 'student'): Promise<User[]> {
    if (role) {
      return await getAll<User>(`SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC`, [role]);
    }
    return await getAll<User>(`SELECT * FROM users ORDER BY created_at DESC`);
  }

  // Update user
  static async update(id: string, data: { name?: string; avatar_color?: string }): Promise<User | undefined> {
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
  }): Promise<User> {
    const id = generateId();
    const avatar_color = data.avatar_color || this.generateRandomColor();

    await runQuery(
      `INSERT INTO users (id, name, username, password_hash, role, avatar_color, active) 
       VALUES ($1, $2, $3, $4, $5, $6, 1)`,
      [
        id,
        data.name.trim(),
        data.username.toLowerCase().trim(),
        data.password_hash,
        data.role,
        avatar_color,
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
