import { UsersRepository, TeacherStudentsRepository } from '../db/repositories';
import { User, TeacherStudent } from '../types/database';
import { hashPassword } from '../utils/password';
import { ValidationError, ConflictError, UnauthorizedError } from '../utils/AppError';

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
    const admin = UsersRepository.getById(adminId);
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
    if (UsersRepository.isUsernameTaken(data.username)) {
      throw new ConflictError('Username is already taken');
    }

    // Hash password
    const password_hash = await hashPassword(data.password);

    // Create teacher
    const teacher = UsersRepository.createWithAuth({
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
    },
    adminId: string
  ): Promise<User> {
    // Validate admin permission
    const admin = UsersRepository.getById(adminId);
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
    if (UsersRepository.isUsernameTaken(data.username)) {
      throw new ConflictError('Username is already taken');
    }

    // Hash password
    const password_hash = await hashPassword(data.password);

    // Create student
    const student = UsersRepository.createWithAuth({
      name: data.name.trim(),
      username: data.username.trim(),
      password_hash,
      role: 'student',
    });

    return student;
  }

  /**
   * Get all users with optional role filter
   */
  static getAllUsers(role?: 'admin' | 'teacher' | 'student'): User[] {
    return UsersRepository.getAll(role as 'teacher' | 'student');
  }

  /**
   * Deactivate a user (soft delete)
   */
  static deactivateUser(userId: string, adminId: string): User | undefined {
    // Validate admin permission
    const admin = UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can deactivate users');
    }

    // Cannot deactivate yourself
    if (userId === adminId) {
      throw new ValidationError('Cannot deactivate your own account');
    }

    return UsersRepository.setActive(userId, false);
  }

  /**
   * Activate a user
   */
  static activateUser(userId: string, adminId: string): User | undefined {
    // Validate admin permission
    const admin = UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can activate users');
    }

    return UsersRepository.setActive(userId, true);
  }

  /**
   * Delete a user permanently
   */
  static deleteUser(userId: string, adminId: string): boolean {
    // Validate admin permission
    const admin = UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can delete users');
    }

    // Cannot delete yourself
    if (userId === adminId) {
      throw new ValidationError('Cannot delete your own account');
    }

    return UsersRepository.delete(userId);
  }

  // ============================================
  // TEACHER-STUDENT ASSIGNMENTS
  // ============================================

  /**
   * Assign a student to a teacher
   */
  static assignStudentToTeacher(
    data: {
      teacherId: string;
      studentId: string;
      notes?: string;
    },
    adminId: string
  ): TeacherStudent {
    // Validate admin permission
    const admin = UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can assign students to teachers');
    }

    // Validate teacher exists and has correct role
    const teacher = UsersRepository.getById(data.teacherId);
    if (!teacher) {
      throw new ValidationError('Teacher not found');
    }
    if (teacher.role !== 'teacher') {
      throw new ValidationError('User is not a teacher');
    }

    // Validate student exists and has correct role
    const student = UsersRepository.getById(data.studentId);
    if (!student) {
      throw new ValidationError('Student not found');
    }
    if (student.role !== 'student') {
      throw new ValidationError('User is not a student');
    }

    // Check if already assigned
    if (TeacherStudentsRepository.isAssigned(data.teacherId, data.studentId)) {
      throw new ConflictError('Student is already assigned to this teacher');
    }

    // Create assignment
    return TeacherStudentsRepository.assign({
      teacherId: data.teacherId,
      studentId: data.studentId,
      assignedBy: adminId,
      notes: data.notes,
    });
  }

  /**
   * Unassign a student from a teacher
   */
  static unassignStudentFromTeacher(
    teacherId: string,
    studentId: string,
    adminId: string
  ): boolean {
    // Validate admin permission
    const admin = UsersRepository.getById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can unassign students');
    }

    return TeacherStudentsRepository.unassign(teacherId, studentId);
  }

  /**
   * Get all assignments
   */
  static getAllAssignments(activeOnly: boolean = true): TeacherStudent[] {
    return TeacherStudentsRepository.getAll(activeOnly);
  }

  /**
   * Get students assigned to a teacher
   */
  static getStudentsByTeacher(teacherId: string): TeacherStudent[] {
    return TeacherStudentsRepository.getStudentsByTeacher(teacherId);
  }

  /**
   * Get teachers assigned to a student
   */
  static getTeachersByStudent(studentId: string): TeacherStudent[] {
    return TeacherStudentsRepository.getTeachersByStudent(studentId);
  }

  /**
   * Get detailed student list for a teacher (with user info)
   */
  static async getTeacherStudentsWithDetails(teacherId: string): Promise<Array<{
    assignment: TeacherStudent;
    student: User;
  }>> {
    const assignments = TeacherStudentsRepository.getStudentsByTeacher(teacherId);
    
    return assignments.map(assignment => {
      const student = UsersRepository.getById(assignment.student_id);
      return {
        assignment,
        student: student!,
      };
    }).filter(item => item.student); // Filter out any deleted students
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get system statistics
   */
  static getStats() {
    const users = UsersRepository.getAll();
    const teachers = users.filter(u => u.role === 'teacher');
    const students = users.filter(u => u.role === 'student');
    const admins = users.filter(u => u.role === 'admin');
    const assignments = TeacherStudentsRepository.getAll();

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.active === 1).length,
      teachers: teachers.length,
      students: students.length,
      admins: admins.length,
      assignments: assignments.length,
    };
  }
}
