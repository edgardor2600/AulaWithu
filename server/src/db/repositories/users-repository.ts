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

  // Helper: Generate random avatar color
  private static generateRandomColor(): string {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
