<<<<<<< HEAD
import { getDb } from '../db/database';
=======
>>>>>>> f404e31 (temp commit to switch branches)
import { TopicsRepository, ClassesRepository } from '../db/repositories';

/**
 * Topics Service
<<<<<<< HEAD
 * Handles business logic for topics management
 */
export class TopicsService {
  private topicsRepo: TopicsRepository;

  constructor() {
    const db = getDb();
    this.topicsRepo = new TopicsRepository(db);
  }

  /**
   * Create a new topic
   * Only class owner (teacher/admin) can create topics
=======
 */
export class TopicsService {
  /**
   * Create a new topic
>>>>>>> f404e31 (temp commit to switch branches)
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
<<<<<<< HEAD
    return this.topicsRepo.create(classId, {
=======
    return await TopicsRepository.create(classId, {
>>>>>>> f404e31 (temp commit to switch branches)
      title: data.title.trim(),
      description: data.description?.trim(),
    });
  }

  /**
   * Get all topics for a class
<<<<<<< HEAD
   * Students can view, teachers/admins get full access
   */
  async getClassTopics(classId: string, userId: string, userRole: string) {
    // For students, verify they have access through groups
    if (userRole === 'student') {
      // Students can view topics of any class (for now)
      // TODO: Add group-based access control if needed
    } else {
      // Teachers can only see topics of their classes
      if (userRole === 'teacher') {
        await this.validateClassPermissions(classId, userId, userRole);
      }
    }

    return this.topicsRepo.getTopicsWithSlideCount(classId);
=======
   */
  async getClassTopics(classId: string, userId: string, userRole: string) {
    if (userRole === 'teacher') {
      await this.validateClassPermissions(classId, userId, userRole);
    }

    return await TopicsRepository.getTopicsWithSlideCount(classId);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get a single topic
   */
  async getTopic(topicId: string, userId: string, userRole: string) {
<<<<<<< HEAD
    const topic = this.topicsRepo.getById(topicId);
=======
    const topic = await TopicsRepository.getById(topicId);
>>>>>>> f404e31 (temp commit to switch branches)
    
    if (!topic) {
      throw new Error('Topic not found');
    }

<<<<<<< HEAD
    // Validate permissions for non-students
=======
    // Validate permissions: teachers must own the class, students have read access
>>>>>>> f404e31 (temp commit to switch branches)
    if (userRole === 'teacher') {
      await this.validateClassPermissions(topic.class_id, userId, userRole);
    }

    return topic;
  }

  /**
   * Update a topic
<<<<<<< HEAD
   * Only class owner can update
=======
>>>>>>> f404e31 (temp commit to switch branches)
   */
  async updateTopic(
    topicId: string,
    data: { title?: string; description?: string },
    userId: string,
    userRole: string
  ) {
<<<<<<< HEAD
    const topic = this.topicsRepo.getById(topicId);
=======
    const topic = await TopicsRepository.getById(topicId);
>>>>>>> f404e31 (temp commit to switch branches)
    
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

<<<<<<< HEAD
    return this.topicsRepo.update(topicId, data);
=======
    return await TopicsRepository.update(topicId, data);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Delete a topic
<<<<<<< HEAD
   * Only class owner can delete
   * Topic must have no slides
   */
  async deleteTopic(topicId: string, userId: string, userRole: string) {
    const topic = this.topicsRepo.getById(topicId);
=======
   */
  async deleteTopic(topicId: string, userId: string, userRole: string) {
    const topic = await TopicsRepository.getById(topicId);
>>>>>>> f404e31 (temp commit to switch branches)
    
    if (!topic) {
      throw new Error('Topic not found');
    }

    // Validate permissions
    await this.validateClassPermissions(topic.class_id, userId, userRole);

    // Try to delete (will throw if topic has slides)
    try {
<<<<<<< HEAD
      this.topicsRepo.delete(topicId);
=======
      await TopicsRepository.delete(topicId);
>>>>>>> f404e31 (temp commit to switch branches)
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete topic');
    }
  }

  /**
   * Reorder topics
<<<<<<< HEAD
   * Only class owner can reorder
=======
>>>>>>> f404e31 (temp commit to switch branches)
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
<<<<<<< HEAD
      if (!this.topicsRepo.belongsToClass(topicId, classId)) {
=======
      if (!await TopicsRepository.belongsToClass(topicId, classId)) {
>>>>>>> f404e31 (temp commit to switch branches)
        throw new Error(`Topic ${topicId} does not belong to class ${classId}`);
      }
    }

<<<<<<< HEAD
    this.topicsRepo.reorderTopics(classId, topicIds);
=======
    await TopicsRepository.reorderTopics(classId, topicIds);
>>>>>>> f404e31 (temp commit to switch branches)
    return { success: true };
  }

  /**
   * Helper: Validate user has permission to manage class
<<<<<<< HEAD
   * Admins have full access, teachers only their own classes
=======
>>>>>>> f404e31 (temp commit to switch branches)
   */
  private async validateClassPermissions(
    classId: string,
    userId: string,
    userRole: string
  ) {
<<<<<<< HEAD
    const classData = ClassesRepository.getById(classId);
=======
    const classData = await ClassesRepository.getById(classId);
>>>>>>> f404e31 (temp commit to switch branches)

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
