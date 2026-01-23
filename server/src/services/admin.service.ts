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
<<<<<<< HEAD
    const admin = UsersRepository.getById(adminId);
=======
    const admin = await UsersRepository.getById(adminId);
>>>>>>> f404e31 (temp commit to switch branches)
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
<<<<<<< HEAD
    if (UsersRepository.isUsernameTaken(data.username)) {
=======
    if (await UsersRepository.isUsernameTaken(data.username)) {
>>>>>>> f404e31 (temp commit to switch branches)
      throw new ConflictError('Username is already taken');
    }

    // Hash password
    const password_hash = await hashPassword(data.password);

    // Create teacher
<<<<<<< HEAD
    const teacher = UsersRepository.createWithAuth({
=======
    const teacher = await UsersRepository.createWithAuth({
>>>>>>> f404e31 (temp commit to switch branches)
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
<<<<<<< HEAD
    const admin = UsersRepository.getById(adminId);
=======
    const admin = await UsersRepository.getById(adminId);
>>>>>>> f404e31 (temp commit to switch branches)
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
<<<<<<< HEAD
    if (UsersRepository.isUsernameTaken(data.username)) {
=======
    if (await UsersRepository.isUsernameTaken(data.username)) {
>>>>>>> f404e31 (temp commit to switch branches)
      throw new ConflictError('Username is already taken');
    }

    // Hash password
    const password_hash = await hashPassword(data.password);

    // Create student
<<<<<<< HEAD
    const student = UsersRepository.createWithAuth({
=======
    const student = await UsersRepository.createWithAuth({
>>>>>>> f404e31 (temp commit to switch branches)
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
<<<<<<< HEAD
  static getAllUsers(role?: 'admin' | 'teacher' | 'student'): User[] {
    return UsersRepository.getAll(role as 'teacher' | 'student');
=======
  static async getAllUsers(role?: 'admin' | 'teacher' | 'student'): Promise<User[]> {
    return await UsersRepository.getAll(role as 'teacher' | 'student');
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Deactivate a user (soft delete)
   */
<<<<<<< HEAD
  static deactivateUser(userId: string, adminId: string): User | undefined {
    // Validate admin permission
    const admin = UsersRepository.getById(adminId);
=======
  static async deactivateUser(userId: string, adminId: string): Promise<User | undefined> {
    // Validate admin permission
    const admin = await UsersRepository.getById(adminId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can deactivate users');
    }

    // Cannot deactivate yourself
    if (userId === adminId) {
      throw new ValidationError('Cannot deactivate your own account');
    }

<<<<<<< HEAD
    return UsersRepository.setActive(userId, false);
=======
    return await UsersRepository.setActive(userId, false);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Activate a user
   */
<<<<<<< HEAD
  static activateUser(userId: string, adminId: string): User | undefined {
    // Validate admin permission
    const admin = UsersRepository.getById(adminId);
=======
  static async activateUser(userId: string, adminId: string): Promise<User | undefined> {
    // Validate admin permission
    const admin = await UsersRepository.getById(adminId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can activate users');
    }

<<<<<<< HEAD
    return UsersRepository.setActive(userId, true);
=======
    return await UsersRepository.setActive(userId, true);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Delete a user permanently
   */
<<<<<<< HEAD
  static deleteUser(userId: string, adminId: string): boolean {
    // Validate admin permission
    const admin = UsersRepository.getById(adminId);
=======
  static async deleteUser(userId: string, adminId: string): Promise<boolean> {
    // Validate admin permission
    const admin = await UsersRepository.getById(adminId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can delete users');
    }

    // Cannot delete yourself
    if (userId === adminId) {
      throw new ValidationError('Cannot delete your own account');
    }

<<<<<<< HEAD
    return UsersRepository.delete(userId);
=======
    return await UsersRepository.delete(userId);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  // ============================================
  // TEACHER-STUDENT ASSIGNMENTS
  // ============================================

  /**
   * Assign a student to a teacher
   */
<<<<<<< HEAD
  static assignStudentToTeacher(
=======
  static async assignStudentToTeacher(
>>>>>>> f404e31 (temp commit to switch branches)
    data: {
      teacherId: string;
      studentId: string;
      notes?: string;
    },
    adminId: string
<<<<<<< HEAD
  ): TeacherStudent {
    // Validate admin permission
    const admin = UsersRepository.getById(adminId);
=======
  ): Promise<TeacherStudent> {
    // Validate admin permission
    const admin = await UsersRepository.getById(adminId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can assign students to teachers');
    }

    // Validate teacher exists and has correct role
<<<<<<< HEAD
    const teacher = UsersRepository.getById(data.teacherId);
=======
    const teacher = await UsersRepository.getById(data.teacherId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!teacher) {
      throw new ValidationError('Teacher not found');
    }
    if (teacher.role !== 'teacher') {
      throw new ValidationError('User is not a teacher');
    }

    // Validate student exists and has correct role
<<<<<<< HEAD
    const student = UsersRepository.getById(data.studentId);
=======
    const student = await UsersRepository.getById(data.studentId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!student) {
      throw new ValidationError('Student not found');
    }
    if (student.role !== 'student') {
      throw new ValidationError('User is not a student');
    }

    // Check if already assigned
<<<<<<< HEAD
    if (TeacherStudentsRepository.isAssigned(data.teacherId, data.studentId)) {
=======
    if (await TeacherStudentsRepository.isAssigned(data.teacherId, data.studentId)) {
>>>>>>> f404e31 (temp commit to switch branches)
      throw new ConflictError('Student is already assigned to this teacher');
    }

    // Create assignment
<<<<<<< HEAD
    return TeacherStudentsRepository.assign({
=======
    return await TeacherStudentsRepository.assign({
>>>>>>> f404e31 (temp commit to switch branches)
      teacherId: data.teacherId,
      studentId: data.studentId,
      assignedBy: adminId,
      notes: data.notes,
    });
  }

  /**
   * Unassign a student from a teacher
   */
<<<<<<< HEAD
  static unassignStudentFromTeacher(
    teacherId: string,
    studentId: string,
    adminId: string
  ): boolean {
    // Validate admin permission
    const admin = UsersRepository.getById(adminId);
=======
  static async unassignStudentFromTeacher(
    teacherId: string,
    studentId: string,
    adminId: string
  ): Promise<boolean> {
    // Validate admin permission
    const admin = await UsersRepository.getById(adminId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can unassign students');
    }

<<<<<<< HEAD
    return TeacherStudentsRepository.unassign(teacherId, studentId);
=======
    return await TeacherStudentsRepository.unassign(teacherId, studentId);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get all assignments
   */
<<<<<<< HEAD
  static getAllAssignments(activeOnly: boolean = true): TeacherStudent[] {
    return TeacherStudentsRepository.getAll(activeOnly);
=======
  static async getAllAssignments(activeOnly: boolean = true): Promise<TeacherStudent[]> {
    return await TeacherStudentsRepository.getAll(activeOnly);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get students assigned to a teacher
   */
<<<<<<< HEAD
  static getStudentsByTeacher(teacherId: string): TeacherStudent[] {
    return TeacherStudentsRepository.getStudentsByTeacher(teacherId);
=======
  static async getStudentsByTeacher(teacherId: string): Promise<TeacherStudent[]> {
    return await TeacherStudentsRepository.getStudentsByTeacher(teacherId);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get teachers assigned to a student
   */
<<<<<<< HEAD
  static getTeachersByStudent(studentId: string): TeacherStudent[] {
    return TeacherStudentsRepository.getTeachersByStudent(studentId);
=======
  static async getTeachersByStudent(studentId: string): Promise<TeacherStudent[]> {
    return await TeacherStudentsRepository.getTeachersByStudent(studentId);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get detailed student list for a teacher (with user info)
   */
  static async getTeacherStudentsWithDetails(teacherId: string): Promise<Array<{
    assignment: TeacherStudent;
    student: User;
  }>> {
<<<<<<< HEAD
    const assignments = TeacherStudentsRepository.getStudentsByTeacher(teacherId);
    
    return assignments.map(assignment => {
      const student = UsersRepository.getById(assignment.student_id);
=======
    const assignments = await TeacherStudentsRepository.getStudentsByTeacher(teacherId);
    
    const results = await Promise.all(assignments.map(async (assignment) => {
      const student = await UsersRepository.getById(assignment.student_id);
>>>>>>> f404e31 (temp commit to switch branches)
      return {
        assignment,
        student: student!,
      };
<<<<<<< HEAD
    }).filter(item => item.student); // Filter out any deleted students
=======
    }));

    return results.filter(item => item.student);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get system statistics
   */
<<<<<<< HEAD
  static getStats() {
    const users = UsersRepository.getAll();
    const teachers = users.filter(u => u.role === 'teacher');
    const students = users.filter(u => u.role === 'student');
    const admins = users.filter(u => u.role === 'admin');
    const assignments = TeacherStudentsRepository.getAll();

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.active === 1).length,
=======
  static async getStats() {
    const users = await UsersRepository.getAll();
    const teachers = users.filter((u: User) => u.role === 'teacher');
    const students = users.filter((u: User) => u.role === 'student');
    const admins = users.filter((u: User) => u.role === 'admin');
    const assignments = await TeacherStudentsRepository.getAll();

    return {
      totalUsers: users.length,
      activeUsers: users.filter((u: User) => u.active === 1).length,
>>>>>>> f404e31 (temp commit to switch branches)
      teachers: teachers.length,
      students: students.length,
      admins: admins.length,
      assignments: assignments.length,
    };
  }
}
