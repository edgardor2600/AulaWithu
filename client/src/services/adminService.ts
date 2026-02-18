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
  level_id?: string;
  level?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface AcademicLevel {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface CreateUserRequest {
  name: string;
  username: string;
  password: string;
  groupId?: string;
  enrollmentNotes?: string;
  levelId?: string;
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
  enrollments: number;
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

  /**
   * Update user's academic level
   */
  async updateUserLevel(userId: string, levelId: string | null): Promise<User> {
    const response = await api.patch<{ success: boolean; user: User }>(`/admin/users/${userId}/level`, {
      levelId,
    });
    return response.data.user;
  },

  // ============================================
  // STATISTICS
  // ============================================

  async getStats(): Promise<SystemStats> {
    const response = await api.get<{ success: boolean; stats: SystemStats }>('/admin/stats');
    return response.data.stats;
  },

  /**
   * Unified Enrollment: Enroll student in a group and automatically assign to teacher
   */
  async enrollStudentUnified(groupId: string, studentId: string, notes?: string): Promise<any> {
    const response = await api.post('/admin/enrollments/unified', {
      groupId,
      studentId,
      notes,
    });
    return response.data.data;
  },

  /**
   * Get academic levels
   */
  async getLevels(): Promise<AcademicLevel[]> {
    const response = await api.get<{ success: boolean; levels: AcademicLevel[] }>('/classes/levels');
    return response.data.levels;
  },
};
