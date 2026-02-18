import api from './api';

export interface Group {
  id: string;
  class_id: string;
  name: string;
  description: string | null;
  max_students: number;
  student_count?: number;
  schedule_time: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  group_id: string;
  student_id: string;
  enrolled_at: string;
  enrolled_by: string | null;
  status: 'active' | 'inactive' | 'completed';
  notes: string | null;
}

export interface GroupStudent {
  enrollment_id: string;
  student: {
    id: string;
    name: string;
    username: string;
    avatar_color: string;
    active: boolean;
  };
  enrolled_at: string;
  status: string;
  notes: string | null;
}

export interface StudentGroup {
  enrollment: {
    id: string;
    status: string;
    enrolled_at: string;
    notes: string | null;
  };
  group: {
    id: string;
    name: string;
    description: string | null;
    max_students: number;
  } | null;
  class: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
  } | null;
}

export const groupsService = {
  // Get all groups for a class
  async getClassGroups(classId: string): Promise<Group[]> {
    const response = await api.get(`/classes/${classId}/groups`);
    return response.data.groups;
  },

  // Create a new group
  async createGroup(classId: string, data: {
    name: string;
    description?: string;
    maxStudents?: number;
    scheduleTime?: string;
  }): Promise<Group> {
    const response = await api.post(`/classes/${classId}/groups`, data);
    return response.data.group;
  },

  // Update a group
  async updateGroup(groupId: string, data: {
    name?: string;
    description?: string;
    maxStudents?: number;
    scheduleTime?: string;
  }): Promise<Group> {
    const response = await api.put(`/groups/${groupId}`, data);
    return response.data.group;
  },

  // Delete a group
  async deleteGroup(groupId: string): Promise<void> {
    await api.delete(`/groups/${groupId}`);
  },

  // Enroll a student in a group
  async enrollStudent(groupId: string, studentId: string, notes?: string): Promise<Enrollment> {
    const response = await api.post(`/groups/${groupId}/enroll`, {
      studentId,
      notes,
    });
    return response.data.enrollment;
  },

  // Unenroll a student from a group
  async unenrollStudent(groupId: string, studentId: string): Promise<void> {
    await api.delete(`/groups/${groupId}/students/${studentId}`);
  },

  // Get students in a group
  async getGroupStudents(groupId: string): Promise<GroupStudent[]> {
    const response = await api.get(`/groups/${groupId}/students`);
    return response.data.students;
  },

  // Get student's groups (for students)
  async getMyGroups(): Promise<StudentGroup[]> {
    const response = await api.get(`/students/my-groups`);
    return response.data.groups;
  },
};
