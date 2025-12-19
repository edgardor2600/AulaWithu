import api from './api';

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'teacher' | 'student';
  avatar_color: string;
  active: boolean;
  created_at: string;
  last_login?: string;
}

export interface CreateUserRequest {
  name: string;
  username: string;
  password: string;
}

export interface Assignment {
  id: string;
  teacher_id: string;
  student_id: string;
  assigned_at: string;
  assigned_by: string | null;
  notes: string | null;
  active: boolean;
}

export interface TeacherStudents {
  assignment_id: string;
  student: {
    id: string;
    name: string;
    username: string;
    avatar_color: string;
    active: boolean;
  };
  assigned_at: string;
  notes: string | null;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  teachers: number;
  students: number;
  admins: number;
  assignments: number;
}

// ============================================
// ADMIN SERVICE
// ============================================

export const adminService = {
  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * Create a new teacher account
   */
  async createTeacher(data: CreateUserRequest): Promise<User> {
    const response = await api.post<{ success: boolean; user: User }>('/admin/users/teacher', data);
    return response.data.user;
  },

  /**
   * Create a new student account
   */
  async createStudent(data: CreateUserRequest): Promise<User> {
    const response = await api.post<{ success: boolean; user: User }>('/admin/users/student', data);
    return response.data.user;
  },

  /**
   * Get all users (with optional role filter)
   */
  async getUsers(role?: 'admin' | 'teacher' | 'student'): Promise<User[]> {
    const params = role ? { role } : {};
    const response = await api.get<{ success: boolean; users: User[]; count: number }>('/admin/users', { params });
    return response.data.users;
  },

  /**
   * Activate a user
   */
  async activateUser(userId: string): Promise<void> {
    await api.patch(`/admin/users/${userId}/activate`);
  },

  /**
   * Deactivate a user
   */
  async deactivateUser(userId: string): Promise<void> {
    await api.patch(`/admin/users/${userId}/deactivate`);
  },

  /**
   * Delete a user permanently
   */
  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}`);
  },

  // ============================================
  // TEACHER-STUDENT ASSIGNMENTS
  // ============================================

  /**
   * Assign a student to a teacher
   */
  async assignStudent(teacherId: string, studentId: string, notes?: string): Promise<Assignment> {
    const response = await api.post<{ success: boolean; assignment: Assignment }>('/admin/assignments', {
      teacherId,
      studentId,
      notes,
    });
    return response.data.assignment;
  },

  /**
   * Unassign a student from a teacher
   */
  async unassignStudent(teacherId: string, studentId: string): Promise<void> {
    await api.delete('/admin/assignments', {
      data: { teacherId, studentId },
    });
  },

  /**
   * Get all assignments
   */
  async getAssignments(activeOnly: boolean = true): Promise<Assignment[]> {
    const response = await api.get<{ success: boolean; assignments: Assignment[]; count: number }>(
      '/admin/assignments',
      { params: { activeOnly } }
    );
    return response.data.assignments;
  },

  /**
   * Get students assigned to a specific teacher
   */
  async getTeacherStudents(teacherId: string): Promise<TeacherStudents[]> {
    const response = await api.get<{ success: boolean; students: TeacherStudents[]; count: number }>(
      `/admin/teachers/${teacherId}/students`
    );
    return response.data.students;
  },

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get system statistics
   */
  async getStats(): Promise<SystemStats> {
    const response = await api.get<{ success: boolean; stats: SystemStats }>('/admin/stats');
    return response.data.stats;
  },
};
