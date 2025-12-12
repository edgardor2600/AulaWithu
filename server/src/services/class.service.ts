import { ClassesRepository, SlidesRepository } from '../db/repositories';
import { Class } from '../types/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/AppError';

export class ClassService {
  // Create a new class (teacher only)
  static async create(data: {
    title: string;
    description?: string;
    teacher_id: string;
  }): Promise<Class> {
    // Validate input
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Title is required');
    }

    if (data.title.length > 200) {
      throw new ValidationError('Title must be less than 200 characters');
    }

    // Create class
    const newClass = ClassesRepository.create({
      title: data.title.trim(),
      description: data.description?.trim(),
      teacher_id: data.teacher_id,
    });

    return newClass;
  }

  // Get class by ID with slides
  static async getById(classId: string): Promise<any> {
    const classData = ClassesRepository.getById(classId);

    if (!classData) {
      throw new NotFoundError('Class');
    }

    // Get slides for this class
    const slides = SlidesRepository.getByClass(classId);

    // Get teacher info
    const classWithDetails = ClassesRepository.getByIdWithTeacher(classId);

    return {
      ...classWithDetails,
      slides,
      slides_count: slides.length,
    };
  }

  // Get all classes (optionally filter by teacher)
  static async getAll(teacherId?: string): Promise<Class[]> {
    if (teacherId) {
      return ClassesRepository.getByTeacher(teacherId);
    }
    return ClassesRepository.getAll();
  }

  // Update class (only owner can update)
  static async update(
    classId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      thumbnail_url?: string;
    }
  ): Promise<Class> {
    // Check if class exists
    const existingClass = ClassesRepository.getById(classId);
    if (!existingClass) {
      throw new NotFoundError('Class');
    }

    // Check ownership
    if (existingClass.teacher_id !== userId) {
      throw new ForbiddenError('You can only update your own classes');
    }

    // Validate title if provided
    if (data.title !== undefined) {
      if (data.title.trim().length === 0) {
        throw new ValidationError('Title cannot be empty');
      }
      if (data.title.length > 200) {
        throw new ValidationError('Title must be less than 200 characters');
      }
    }

    // Update class
    const updated = ClassesRepository.update(classId, {
      title: data.title?.trim(),
      description: data.description?.trim(),
      thumbnail_url: data.thumbnail_url,
    });

    if (!updated) {
      throw new NotFoundError('Class');
    }

    return updated;
  }

  // Delete class (only owner can delete)
  static async delete(classId: string, userId: string): Promise<void> {
    // Check if class exists
    const existingClass = ClassesRepository.getById(classId);
    if (!existingClass) {
      throw new NotFoundError('Class');
    }

    // Check ownership
    if (existingClass.teacher_id !== userId) {
      throw new ForbiddenError('You can only delete your own classes');
    }

    // Delete class (CASCADE will delete slides)
    const deleted = ClassesRepository.delete(classId);
    if (!deleted) {
      throw new NotFoundError('Class');
    }
  }

  // Check if user owns class
  static async checkOwnership(classId: string, userId: string): Promise<boolean> {
    const classData = ClassesRepository.getById(classId);
    if (!classData) {
      throw new NotFoundError('Class');
    }
    return classData.teacher_id === userId;
  }
}
