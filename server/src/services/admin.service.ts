import { UsersRepository, GroupsRepository, EnrollmentsRepository, ClassesRepository } from '../db/repositories';
import { User, Enrollment } from '../types/database';
import { GroupsService } from './groups.service';
import { hashPassword } from '../utils/password';
import { ValidationError, ConflictError, UnauthorizedError, NotFoundError } from '../utils/AppError';

/**
 * Administrative Service
 * Handles user management and teacher-student assignments
 * Only accessible by users with 'admin' role
 */
export class AdminService {
  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * Create a new teacher account
   * @param data - Teacher data
   * @param adminId - ID of admin creating the teacher
   * @returns Created teacher user
   */
  static async createTeacher(
    data: {
      name: string;
      username: string;
      password: string;
    },
    adminId: string
  ): Promise<User> {
    // Validate admin permission
    const admin = await UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can create teachers');
    }

    // Validate input
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Name is required');
    }

    if (!data.username || data.username.trim().length < 3) {
      throw new ValidationError('Username must be at least 3 characters');
    }

    if (!data.password || data.password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    // Check username uniqueness
    if (await UsersRepository.isUsernameTaken(data.username)) {
      throw new ConflictError('Username is already taken');
    }

    // Hash password
    const password_hash = await hashPassword(data.password);

    // Create teacher
    const teacher = await UsersRepository.createWithAuth({
      name: data.name.trim(),
      username: data.username.trim(),
      password_hash,
      role: 'teacher',
    });

    return teacher;
  }

  /**
   * Create a new student account
   * @param data - Student data
   * @param adminId - ID of admin creating the student
   * @returns Created student user
   */
  static async createStudent(
    data: {
      name: string;
      username: string;
      password: string;
      groupId?: string;
      enrollmentNotes?: string;
      levelId?: string;
    },
    adminId: string
  ): Promise<{ student: User; enrollmentWarning: string | null }> {
    // Validate admin permission
    const admin = await UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can create students');
    }

    // Validate input
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Name is required');
    }

    if (!data.username || data.username.trim().length < 3) {
      throw new ValidationError('Username must be at least 3 characters');
    }

    if (!data.password || data.password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    // Check username uniqueness
    if (await UsersRepository.isUsernameTaken(data.username)) {
      throw new ConflictError('Username is already taken');
    }

    // Hash password
    const password_hash = await hashPassword(data.password);

    // Create student
    const student = await UsersRepository.createWithAuth({
      name: data.name.trim(),
      username: data.username.trim(),
      password_hash,
      role: 'student',
      level_id: data.levelId || null,
    });

    // Si se proporcionó un grupo, intentar el enrollment automático.
    // IMPORTANTE: Si el enrollment falla (grupo lleno, no existe, etc.), NO abortamos
    // la creación del estudiante — ya está guardado en la DB correctamente.
    // En su lugar, capturamos el error y lo devolvemos como warning para que
    // el admin sepa que debe asignarlo manualmente al grupo.
    let enrollmentWarning: string | null = null;

    if (data.groupId) {
      try {
        await GroupsService.enrollStudent(
          data.groupId,
          student.id,
          adminId,
          data.enrollmentNotes || 'Enrolled during student creation'
        );
      } catch (error: any) {
        console.error('Failed to auto-enroll student during creation:', error);
        enrollmentWarning = error.message || 'Enrollment failed — assign the student to a group manually';
      }
    }

    return { student, enrollmentWarning };
  }

  /**
   * Get all users with optional role filter
   */
  static async getAllUsers(role?: 'admin' | 'teacher' | 'student'): Promise<User[]> {
    return await UsersRepository.getAll(role as 'teacher' | 'student');
  }

  /**
   * Deactivate a user (soft delete)
   */
  static async deactivateUser(userId: string, adminId: string): Promise<User | undefined> {
    // Validate admin permission
    const admin = await UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can deactivate users');
    }

    // Cannot deactivate yourself
    if (userId === adminId) {
      throw new ValidationError('Cannot deactivate your own account');
    }

    const user = await UsersRepository.setActive(userId, false);

    // Cascade: deactivate enrollments if student
    if (user && user.role === 'student') {
      await EnrollmentsRepository.deactivateAllByStudent(userId);
    }

    return user;
  }

  /**
   * Activate a user
   */
  static async activateUser(userId: string, adminId: string): Promise<User | undefined> {
    // Validate admin permission
    const admin = await UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can activate users');
    }

    return await UsersRepository.setActive(userId, true);
  }

  /**
   * Delete a user permanently
   */
  static async deleteUser(userId: string, adminId: string): Promise<boolean> {
    // Validate admin permission
    const admin = await UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can delete users');
    }

    // Cannot delete yourself
    if (userId === adminId) {
      throw new ValidationError('Cannot delete your own account');
    }

    return await UsersRepository.delete(userId);
  }

  // ============================================
  // GROUP ENROLLMENT (Replaces manual teacher-student assignments)
  // ============================================

  /**
   * Enroll student in a group
   * The teacher-student relationship is now implicit through group enrollment
   */
  static async enrollStudentToGroupUnified(
    data: {
      groupId: string;
      studentId: string;
      notes?: string;
    },
    adminId: string
  ): Promise<{ enrollment: Enrollment }> {
    // 1. Validate admin permission
    const admin = await UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can perform unified enrollment');
    }

    // 2. Get group and class info
    const group = await GroupsRepository.getById(data.groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    const classObj = await ClassesRepository.getById(group.class_id);
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }

    const teacherId = classObj.teacher_id;

    // 3. Check student existence
    const student = await UsersRepository.getById(data.studentId);
    if (!student || student.role !== 'student') {
      throw new ValidationError('Student not found or invalid role');
    }

    // 4. Enroll in group (logic already exists in GroupsService, but we'll use repos directly for atomicity or just call the service)
    // To maintain best practices, we use a transaction if possible, but our current architecture doesn't easily support it across repos without passing the client.
    // For now, we'll do it sequentially.
    
    // Check if already enrolled
    if (await EnrollmentsRepository.isEnrolled(data.groupId, data.studentId)) {
      throw new ConflictError('Student is already enrolled in this group');
    }

    // Check if group is full
    if (await GroupsRepository.isFull(data.groupId)) {
      throw new ValidationError('Group is full');
    }

    const enrollment = await EnrollmentsRepository.enroll({
      groupId: data.groupId,
      studentId: data.studentId,
      enrolledBy: adminId,
      notes: data.notes,
    });

    return { enrollment };
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get system statistics
   */
  static async getStats() {
    const users = await UsersRepository.getAll();
    const groups = await GroupsRepository.getAll();

    const teachers = users.filter((u: User) => u.role === 'teacher');
    const students = users.filter((u: User) => u.role === 'student');
    const admins = users.filter((u: User) => u.role === 'admin');

    // Contar enrollments correctamente: sumar alumnos por grupo
    let totalEnrollments = 0;
    for (const group of groups) {
      const count = await GroupsRepository.getStudentCount(group.id);
      totalEnrollments += count;
    }

    return {
      totalUsers: users.length,
      activeUsers: users.filter((u: User) => u.active === 1).length,
      teachers: teachers.length,
      students: students.length,
      admins: admins.length,
      groups: groups.length,
      enrollments: totalEnrollments,
    };
  }

  // ============================================
  // PASSWORD RESET (By Admin)
  // ============================================

  /**
   * Reset a user's password (Admin-only action)
   * Generates a secure temporary password and returns it once.
   * The temporary password follows the new security policy (8+ chars, uppercase, number).
   *
   * @param userId  - ID of the user whose password to reset
   * @param adminId - ID of the admin performing the action
   * @returns The generated temporary password (shown once, then gone)
   */
  static async resetUserPassword(
    userId: string,
    adminId: string
  ): Promise<{ temporaryPassword: string; userName: string }> {
    // Validate admin permission
    const admin = await UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can reset passwords');
    }

    // Admin cannot reset their own password this way
    if (userId === adminId) {
      throw new ValidationError('Cannot reset your own password. Use the change-password endpoint instead.');
    }

    // Verify target user exists
    const user = await UsersRepository.getById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate a secure temporary password that meets the complexity policy:
    // Format: "Temp@" + 6 random digits → always 11 chars, has uppercase + number
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const temporaryPassword = `Temp@${randomDigits}`;

    // Hash and save
    const password_hash = await hashPassword(temporaryPassword);
    await UsersRepository.updatePassword(userId, password_hash);

    return { temporaryPassword, userName: user.name };
  }

  // ============================================
  // UPDATE CREDENTIALS (By Admin)
  // ============================================

  /**
   * Update username and/or password for any user (Admin-only)
   * Validates format, uniqueness, and strength requirements.
   *
   * @param userId  - ID of the user to update
   * @param adminId - ID of the admin performing the action
   * @param data    - New username and/or new password (both optional, at least one required)
   */
  static async updateUserCredentials(
    userId: string,
    adminId: string,
    data: { newUsername?: string; newPassword?: string }
  ): Promise<{ user: User; updatedFields: string[] }> {
    const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

    // Validate admin
    const admin = await UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can update user credentials');
    }

    // Verify target user exists
    const user = await UsersRepository.getById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // At least one field must be provided
    if (!data.newUsername && !data.newPassword) {
      throw new ValidationError('At least one field (username or password) must be provided');
    }

    const updatedFields: string[] = [];

    // --- Update username ---
    if (data.newUsername) {
      const username = data.newUsername.trim().toLowerCase();

      if (username.length < 3 || username.length > 20) {
        throw new ValidationError('El usuario debe tener entre 3 y 20 caracteres');
      }
      if (!USERNAME_REGEX.test(username)) {
        throw new ValidationError('El usuario solo puede contener letras, números, puntos, guiones y guiones bajos (sin espacios)');
      }

      try {
        await UsersRepository.updateUsername(userId, username);
        updatedFields.push('username');
      } catch (err: any) {
        if (err.message === 'USERNAME_TAKEN') {
          throw new ConflictError('Ese nombre de usuario ya está en uso por otro usuario');
        }
        throw err;
      }
    }

    // --- Update password ---
    if (data.newPassword) {
      if (data.newPassword.length < 8) {
        throw new ValidationError('La contraseña debe tener al menos 8 caracteres');
      }
      if (!/[A-Z]/.test(data.newPassword)) {
        throw new ValidationError('La contraseña debe tener al menos una letra mayúscula');
      }
      if (!/[0-9]/.test(data.newPassword)) {
        throw new ValidationError('La contraseña debe tener al menos un número');
      }

      const password_hash = await hashPassword(data.newPassword);
      await UsersRepository.updatePassword(userId, password_hash);
      updatedFields.push('password');
    }

    // Return updated user
    const updatedUser = await UsersRepository.getById(userId);
    return { user: updatedUser!, updatedFields };
  }
}

