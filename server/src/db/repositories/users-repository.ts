import { runQuery, getOne, getAll } from '../database';
import { User } from '../../types/database';
import { generateId } from '../../utils/id-generator';

export class UsersRepository {
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

  // Helper: Generate random avatar color
  private static generateRandomColor(): string {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
