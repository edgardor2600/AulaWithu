import api from './api';

export interface Slide {
  id: string;
  class_id: string;
  slide_number: number;
  title: string | null;
  canvas_data: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSlideData {
  title?: string;
  slide_number?: number;
}

export interface UpdateSlideData {
  title?: string;
  canvas_data?: string;
  slide_number?: number;
}

export const slideService = {
  // Create slide
  async create(classId: string, data: CreateSlideData): Promise<Slide> {
    const response = await api.post<{ success: boolean; slide: Slide }>(
      `/slides/class/${classId}`,
      data
    );
    return response.data.slide;
  },

  // Get slide by ID
  async getById(id: string): Promise<Slide> {
    const response = await api.get<{ success: boolean; slide: Slide }>(`/slides/${id}`);
    return response.data.slide;
  },

  // Update slide
  async update(id: string, data: UpdateSlideData): Promise<Slide> {
    const response = await api.put<{ success: boolean; slide: Slide }>(`/slides/${id}`, data);
    return response.data.slide;
  },

  // Update canvas data (optimized)
  async updateCanvas(id: string, canvasData: string): Promise<Slide> {
    const response = await api.put<{ success: boolean; slide: Slide }>(
      `/slides/${id}/canvas`,
      { canvas_data: canvasData }
    );
    return response.data.slide;
  },

  // Delete slide
  async delete(id: string): Promise<void> {
    await api.delete(`/slides/${id}`);
  },
};
