import { UsersRepository } from '../db/repositories';
import { User } from '../types/database';
import { generateToken } from '../utils/jwt';
import { ValidationError, ConflictError } from '../utils/AppError';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';

/**
 * Authentication Service
 * Handles user authentication, registration, and password management
 */
export class AuthService {
  // ============================================
  // LEGACY METHOD (Maintain for backward compatibility)
  // ============================================

  /**
   * Join (login or register) - simplified MVP method
   * @deprecated Use login() or register methods instead
   * Kept for backward compatibility during migration
   */
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

  // ============================================
  // SECURE AUTHENTICATION METHODS (Phase 3)
  // ============================================

  /**
   * Login with username and password
   * @param username - User's username (case-insensitive)
   * @param password - User's plaintext password
   * @returns User object and JWT token
   * @throws ValidationError if credentials are invalid
   */
  static async login(data: {
    username: string;
    password: string;
  }): Promise<{ user: User; token: string }> {
    // Validate input
    if (!data.username || data.username.trim().length === 0) {
      throw new ValidationError('Username is required');
    }

    if (!data.password || data.password.length === 0) {
      throw new ValidationError('Password is required');
    }

    // Find user by username (case-insensitive, active users only)
    const user = UsersRepository.getByUsername(data.username);

    if (!user) {
      // Generic error message to prevent username enumeration
      throw new ValidationError('Invalid username or password');
    }

    // Verify user has password set
    if (!user.password_hash) {
      throw new ValidationError('This account needs to set a password first');
    }

    // Compare password with hash
    const isPasswordValid = await comparePassword(data.password, user.password_hash);

    if (!isPasswordValid) {
      throw new ValidationError('Invalid username or password');
    }

    // Update last login timestamp
    UsersRepository.updateLastLogin(user.id);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
    });

    return { user, token };
  }

  /**
   * Register a new teacher with username and password
   * @param data - Registration data
   * @returns Newly created user and JWT token
   * @throws ConflictError if username already exists
   * @throws ValidationError if validation fails
   */
  static async registerTeacher(data: {
    name: string;
    username: string;
    password: string;
  }): Promise<{ user: User; token: string }> {
    // Validate input
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Name is required');
    }

    if (!data.username || data.username.trim().length === 0) {
      throw new ValidationError('Username is required');
    }

    if (data.username.trim().length < 3) {
      throw new ValidationError('Username must be at least 3 characters long');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.errors.join(', '));
    }

    // Check if username is already taken
    if (UsersRepository.isUsernameTaken(data.username)) {
      throw new ConflictError('Username is already taken');
    }

    // Hash password
    const password_hash = await hashPassword(data.password);

    // Create user with authentication
    const user = UsersRepository.createWithAuth({
      name: data.name.trim(),
      username: data.username.trim(),
      password_hash,
      role: 'teacher',
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
    });

    return { user, token };
  }

  /**
   * Register a new student with username and password
   * @param data - Registration data
   * @returns Newly created user and JWT token
   * @throws ConflictError if username already exists
   * @throws ValidationError if validation fails
   */
  static async registerStudent(data: {
    name: string;
    username: string;
    password: string;
  }): Promise<{ user: User; token: string }> {
    // Validate input
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Name is required');
    }

    if (!data.username || data.username.trim().length === 0) {
      throw new ValidationError('Username is required');
    }

    if (data.username.trim().length < 3) {
      throw new ValidationError('Username must be at least 3 characters long');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.errors.join(', '));
    }

    // Check if username is already taken
    if (UsersRepository.isUsernameTaken(data.username)) {
      throw new ConflictError('Username is already taken');
    }

    // Hash password
    const password_hash = await hashPassword(data.password);

    // Create user with authentication
    const user = UsersRepository.createWithAuth({
      name: data.name.trim(),
      username: data.username.trim(),
      password_hash,
      role: 'student',
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
    });

    return { user, token };
  }

  /**
   * Change user's password
   * @param userId - User ID
   * @param oldPassword - Current password
   * @param newPassword - New password
   * @throws ValidationError if current password is incorrect or new password is invalid
   */
  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user
    const user = UsersRepository.getById(userId);
    if (!user) {
      throw new ValidationError('User not found');
    }

    // Verify current password if user has one set
    if (user.password_hash) {
      const isCurrentPasswordValid = await comparePassword(oldPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.errors.join(', '));
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password in database
    UsersRepository.updatePassword(userId, newPasswordHash);
  }

  // ============================================
  // UTILITY METHODS (Unchanged)
  // ============================================

  /**
   * Get user info by ID
   * @param userId - User ID
   * @returns User object or undefined if not found
   */
  static async getUserById(userId: string): Promise<User | undefined> {
    return UsersRepository.getById(userId);
  }

  /**
   * Verify user exists and return user object
   * @param userId - User ID
   * @returns User object
   * @throws ValidationError if user not found
   */
  static async verifyUser(userId: string): Promise<User> {
    const user = UsersRepository.getById(userId);
    if (!user) {
      throw new ValidationError('User not found');
    }
    return user;
  }
}

