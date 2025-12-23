import api from './api';

export interface TeacherStudent {
  assignment_id: string;
  student: {
    id: string;
    name: string;
    username: string;
    avatar_color: string;
    active: boolean;
    last_login: string | null;
  };
  assigned_at: string;
  notes: string | null;
}

export const usersService = {
  // Get students assigned to the logged-in teacher
  async getMyStudents(): Promise<TeacherStudent[]> {
    const response = await api.get('/users/my-students');
    return response.data.students;
  },
};
