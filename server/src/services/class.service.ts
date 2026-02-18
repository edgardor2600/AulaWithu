import { 
  ClassesRepository, 
  SlidesRepository, 
  SessionsRepository, 
  StudentCopiesRepository,
  EnrollmentsRepository
} from '../db/repositories';
import { Class } from '../types/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/AppError';

export class ClassService {
  static async create(data: {
    title: string;
    description?: string;
    teacher_id: string;
    level_id?: string;
  }): Promise<Class> {
    // Validate input
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Title is required');
    }

    if (data.title.length > 200) {
      throw new ValidationError('Title must be less than 200 characters');
    }

    // Create class
    const newClass = await ClassesRepository.create({
      title: data.title.trim(),
      description: data.description?.trim(),
      teacher_id: data.teacher_id,
      level_id: data.level_id
    });

    return newClass;
  }

  // Get class by ID with slides
  static async getById(classId: string): Promise<any> {
    const classData = await ClassesRepository.getById(classId);

    if (!classData) {
      throw new NotFoundError('Class');
    }

    // Get slides for this class
    const slides = await SlidesRepository.getByClass(classId);

    // Get teacher info
    const classWithDetails = await ClassesRepository.getByIdWithTeacher(classId);

    return {
      ...classWithDetails,
      slides,
      slides_count: slides.length,
    };
  }

  // Get all classes (filtered by role and assignments)
  static async getAll(userId: string, userRole: string, teacherId?: string): Promise<Class[]> {
    // ADMIN: Ve todas las clases
    if (userRole === 'admin') {
      if (teacherId) {
        return await ClassesRepository.getByTeacher(teacherId);
      }
      return await ClassesRepository.getAll();
    }

    // PROFESOR: Solo ve sus propias clases
    if (userRole === 'teacher') {
      return await ClassesRepository.getByTeacher(userId);
    }

    // ESTUDIANTE: Solo ve clases donde está matriculado
    if (userRole === 'student') {
      const classIds = await EnrollmentsRepository.getStudentClasses(userId);
      
      if (classIds.length === 0) {
        return [];
      }

      const allClasses: Class[] = [];
      for (const classId of classIds) {
        const classObj = await ClassesRepository.getById(classId);
        if (classObj) {
          allClasses.push(classObj);
        }
      }

      return allClasses;
    }

    return [];
  }

  // Update class (only owner can update)
  static async update(
    classId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      thumbnail_url?: string;
      level_id?: string;
    }
  ): Promise<Class> {
    // Check if class exists
    const existingClass = await ClassesRepository.getById(classId);
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
    const updated = await ClassesRepository.update(classId, {
      title: data.title?.trim(),
      description: data.description?.trim(),
      thumbnail_url: data.thumbnail_url,
      level_id: data.level_id
    });

    if (!updated) {
      throw new NotFoundError('Class');
    }

    return updated;
  }

  // Delete class (only owner can delete)
  static async delete(classId: string, userId: string): Promise<void> {
    console.log('=== DELETE CLASS START ===', classId);
    
    // Check if class exists
    const existingClass = await ClassesRepository.getById(classId);
    if (!existingClass) {
      throw new NotFoundError('Class');
    }

    // Check ownership
    if (existingClass.teacher_id !== userId) {
      throw new ForbiddenError('You can only delete your own classes');
    }

    try {
      // 1. Borrar Sesiones
      console.log('Deleting sessions...');
      await SessionsRepository.deleteByClass(classId);

      // 2. Borrar copias de estudiantes para cada slide
      console.log('Fetching slides to delete student copies...');
      const slides = await SlidesRepository.getByClass(classId);
      
      for (const slide of slides) {
        console.log(`Deleting student copies for slide ${slide.id}...`);
        await StudentCopiesRepository.deleteBySlide(slide.id);
      }

      // 3. Borrar Slides
      console.log('Deleting slides...');
      await SlidesRepository.deleteByClass(classId);

      // 4. Borrar Clase
      console.log('Deleting class...');
      const deleted = await ClassesRepository.delete(classId);
      
      if (!deleted) {
        throw new NotFoundError('Class'); // Should not happen if getById worked
      }
      console.log('=== DELETE CLASS SUCCESS ===');
    } catch (error) {
      console.error('Error deleting class manually:', error);
      throw error;
    }
  }

  // Check if user owns class
  static async checkOwnership(classId: string, userId: string): Promise<boolean> {
    const classData = await ClassesRepository.getById(classId);
    if (!classData) {
      throw new NotFoundError('Class');
    }
    return classData.teacher_id === userId;
  }
}
