import { UsersRepository } from '../db/repositories';
import { User } from '../types/database';
import { generateToken } from '../utils/jwt';
import { ValidationError, ConflictError } from '../utils/AppError';

export class AuthService {
  // Join (login or register) - simplified for MVP
  static async join(data: { name: string; role: 'teacher' | 'student' }): Promise<{ user: User; token: string }> {
    // Validate input
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Name is required');
    }

    if (!data.role || !['teacher', 'student'].includes(data.role)) {
      throw new ValidationError('Role must be either teacher or student');
    }

    // Check if user already exists by name
    let user = UsersRepository.getByName(data.name.trim());

    if (user) {
      // User exists - verify role matches
      if (user.role !== data.role) {
        throw new ConflictError(`User ${data.name} already exists with role ${user.role}`);
      }
      // Return existing user
    } else {
      // Create new user
      user = UsersRepository.create({
        name: data.name.trim(),
        role: data.role,
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
    });

    return { user, token };
  }

  // Get user info by ID
  static async getUserById(userId: string): Promise<User | undefined> {
    return UsersRepository.getById(userId);
  }

  // Verify user exists
  static async verifyUser(userId: string): Promise<User> {
    const user = UsersRepository.getById(userId);
    if (!user) {
      throw new ValidationError('User not found');
    }
    return user;
  }
}
