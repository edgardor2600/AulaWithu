import { TopicsRepository, ClassesRepository } from '../db/repositories';

/**
 * Topics Service
 */
export class TopicsService {
  /**
   * Create a new topic
   */
  async createTopic(
    classId: string,
    data: { title: string; description?: string },
    userId: string,
    userRole: string
  ) {
    // Validate permissions
    await this.validateClassPermissions(classId, userId, userRole);

    // Validate title
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }

    if (data.title.length > 100) {
      throw new Error('Title must be 100 characters or less');
    }

    // Create topic
    return await TopicsRepository.create(classId, {
      title: data.title.trim(),
      description: data.description?.trim(),
    });
  }

  /**
   * Get all topics for a class
   */
  async getClassTopics(classId: string, userId: string, userRole: string) {
    if (userRole === 'teacher') {
      await this.validateClassPermissions(classId, userId, userRole);
    }

    return await TopicsRepository.getTopicsWithSlideCount(classId);
  }

  /**
   * Get a single topic
   */
  async getTopic(topicId: string, userId: string, userRole: string) {
    const topic = await TopicsRepository.getById(topicId);
    
    if (!topic) {
      throw new Error('Topic not found');
    }

    // Validate permissions: teachers must own the class, students have read access
    if (userRole === 'teacher') {
      await this.validateClassPermissions(topic.class_id, userId, userRole);
    }

    return topic;
  }

  /**
   * Update a topic
   */
  async updateTopic(
    topicId: string,
    data: { title?: string; description?: string },
    userId: string,
    userRole: string
  ) {
    const topic = await TopicsRepository.getById(topicId);
    
    if (!topic) {
      throw new Error('Topic not found');
    }

    // Validate permissions
    await this.validateClassPermissions(topic.class_id, userId, userRole);

    // Validate title if provided
    if (data.title !== undefined) {
      if (data.title.trim().length === 0) {
        throw new Error('Title cannot be empty');
      }
      if (data.title.length > 100) {
        throw new Error('Title must be 100 characters or less');
      }
      data.title = data.title.trim();
    }

    if (data.description !== undefined) {
      data.description = data.description.trim();
    }

    return await TopicsRepository.update(topicId, data);
  }

  /**
   * Delete a topic
   */
  async deleteTopic(topicId: string, userId: string, userRole: string) {
    const topic = await TopicsRepository.getById(topicId);
    
    if (!topic) {
      throw new Error('Topic not found');
    }

    // Validate permissions
    await this.validateClassPermissions(topic.class_id, userId, userRole);

    // Try to delete (will throw if topic has slides)
    try {
      await TopicsRepository.delete(topicId);
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete topic');
    }
  }

  /**
   * Reorder topics
   */
  async reorderTopics(
    classId: string,
    topicIds: string[],
    userId: string,
    userRole: string
  ) {
    // Validate permissions
    await this.validateClassPermissions(classId, userId, userRole);

    // Validate all topics belong to this class
    for (const topicId of topicIds) {
      if (!await TopicsRepository.belongsToClass(topicId, classId)) {
        throw new Error(`Topic ${topicId} does not belong to class ${classId}`);
      }
    }

    await TopicsRepository.reorderTopics(classId, topicIds);
    return { success: true };
  }

  /**
   * Helper: Validate user has permission to manage class
   */
  private async validateClassPermissions(
    classId: string,
    userId: string,
    userRole: string
  ) {
    const classData = await ClassesRepository.getById(classId);

    if (!classData) {
      throw new Error('Class not found');
    }

    // Admins have full access
    if (userRole === 'admin') {
      return;
    }

    // Teachers can only manage their own classes
    if (userRole === 'teacher') {
      if (classData.teacher_id !== userId) {
        throw new Error('You do not have permission to manage this class');
      }
      return;
    }

    // Students cannot manage topics
    throw new Error('Permission denied');
  }
}

export const topicsService = new TopicsService();
