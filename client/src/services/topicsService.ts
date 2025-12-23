import api from './api';

export interface Topic {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  topic_number: number;
  active: number;
  created_at: string;
  updated_at: string;
  slides_count?: number;
}

export const topicsService = {
  /**
   * Get all topics for a class
   */
  async getClassTopics(classId: string): Promise<Topic[]> {
    const response = await api.get(`/classes/${classId}/topics`);
    return response.data.topics;
  },

  /**
   * Get a single topic
   */
  async getTopic(topicId: string): Promise<Topic> {
    const response = await api.get(`/topics/${topicId}`);
    return response.data.topic;
  },

  /**
   * Create a new topic
   */
  async createTopic(classId: string, data: { title: string; description?: string }): Promise<Topic> {
    const response = await api.post(`/classes/${classId}/topics`, data);
    return response.data.topic;
  },

  /**
   * Update a topic
   */
  async updateTopic(topicId: string, data: { title?: string; description?: string }): Promise<Topic> {
    const response = await api.put(`/topics/${topicId}`, data);
    return response.data.topic;
  },

  /**
   * Delete a topic
   */
  async deleteTopic(topicId: string): Promise<void> {
    await api.delete(`/topics/${topicId}`);
  },

  /**
   * Reorder topics
   */
  async reorderTopics(classId: string, topicIds: string[]): Promise<void> {
    await api.post(`/classes/${classId}/topics/reorder`, { topicIds });
  },

  /**
   * Get slides for a topic
   */
  async getTopicSlides(topicId: string): Promise<any[]> {
    const response = await api.get(`/topics/${topicId}/slides`);
    return response.data.slides;
  },
};
