import api from './api';

export interface Class {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string;
  thumbnail_url: string | null;
  level_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassWithDetails extends Class {
  teacher_name?: string;
  teacher_color?: string;
  slides?: any[];
  slides_count?: number;
}

export interface CreateClassData {
  title: string;
  description?: string;
  levelId?: string;
  teacherId?: string;
}

export interface UpdateClassData {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  levelId?: string;
}

export const classService = {
  // Get all classes
  async getAll(): Promise<Class[]> {
    const response = await api.get<{ success: boolean; count: number; classes: Class[] }>('/classes');
    return response.data.classes;
  },

  // Get class by ID
  async getById(id: string): Promise<ClassWithDetails> {
    const response = await api.get<{ success: boolean; class: ClassWithDetails }>(`/classes/${id}`);
    return response.data.class;
  },

  // Create class (teacher only)
  async create(data: CreateClassData): Promise<Class> {
    const response = await api.post<{ success: boolean; class: Class }>('/classes', data);
    return response.data.class;
  },

  // Update class (owner only)
  async update(id: string, data: UpdateClassData): Promise<Class> {
    const response = await api.put<{ success: boolean; class: Class }>(`/classes/${id}`, data);
    return response.data.class;
  },

  // Delete class (owner only)
  async delete(id: string): Promise<void> {
    await api.delete(`/classes/${id}`);
  },

  // Get academic levels
  async getLevels(): Promise<any[]> {
    const response = await api.get<{ success: boolean; levels: any[] }>('/classes/levels');
    return response.data.levels;
  },
};
