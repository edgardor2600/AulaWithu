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
  ): Promise<User> {
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

    // If groupId is provided, perform enrollment using GroupsService
    // This will automatically handle teacher assignment and validations
    if (data.groupId) {
      try {
        await GroupsService.enrollStudent(
          data.groupId,
          student.id,
          adminId,
          data.enrollmentNotes || 'Enrolled during student creation'
        );
      } catch (error) {
        console.error('Failed to auto-enroll student during creation:', error);
        // We don't throw here to avoid failing student creation if enrollment fails
      }
    }

    return student;
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
}
