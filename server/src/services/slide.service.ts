import { SlidesRepository, ClassesRepository, StudentCopiesRepository, SessionsRepository } from '../db/repositories';
import { Slide } from '../types/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/AppError';

export class SlideService {
  // Create a new slide (only class owner)
  static async create(data: {
    class_id: string;
    user_id: string;
    title?: string;
    slide_number?: number;
  }): Promise<Slide> {
    // Check if class exists
    const classData = ClassesRepository.getById(data.class_id);
    if (!classData) {
      throw new NotFoundError('Class');
    }

    // Check ownership
    if (classData.teacher_id !== data.user_id) {
      throw new ForbiddenError('You can only add slides to your own classes');
    }

    // Validate title if provided
    if (data.title && data.title.length > 200) {
      throw new ValidationError('Title must be less than 200 characters');
    }

    // Create slide
    const slide = SlidesRepository.create({
      class_id: data.class_id,
      title: data.title?.trim(),
      slide_number: data.slide_number,
    });

    return slide;
  }

  // Get slide by ID
  static async getById(slideId: string): Promise<Slide> {
    const slide = SlidesRepository.getById(slideId);
    if (!slide) {
      throw new NotFoundError('Slide');
    }
    return slide;
  }

  // Get slides by class
  static async getByClass(classId: string): Promise<Slide[]> {
    // Check if class exists
    const classData = ClassesRepository.getById(classId);
    if (!classData) {
      throw new NotFoundError('Class');
    }

    return SlidesRepository.getByClass(classId);
  }

  // Update slide (only class owner)
  static async update(
    slideId: string,
    userId: string,
    data: {
      title?: string;
      canvas_data?: string;
      slide_number?: number;
    }
  ): Promise<Slide> {
    // Get slide
    const slide = SlidesRepository.getById(slideId);
    if (!slide) {
      throw new NotFoundError('Slide');
    }

    // Check class ownership
    const classData = ClassesRepository.getById(slide.class_id);
    if (!classData) {
      throw new NotFoundError('Class');
    }

    if (classData.teacher_id !== userId) {
      throw new ForbiddenError('You can only update slides in your own classes');
    }

    // Validate title if provided
    if (data.title !== undefined && data.title.length > 200) {
      throw new ValidationError('Title must be less than 200 characters');
    }

    // Update slide
    const updated = SlidesRepository.update(slideId, {
      title: data.title?.trim(),
      canvas_data: data.canvas_data,
      slide_number: data.slide_number,
    });

    if (!updated) {
      throw new NotFoundError('Slide');
    }

    return updated;
  }

  // Update only canvas data (frequent operation, optimized)
  static async updateCanvas(
    slideId: string,
    userId: string,
    canvasData: string
  ): Promise<Slide> {
    console.log('=== UPDATE CANVAS START ===');
    console.log('Slide ID:', slideId);
    console.log('User ID:', userId);
    console.log('Canvas data length:', canvasData?.length);
    
    // Get slide
    const slide = SlidesRepository.getById(slideId);
    if (!slide) {
      console.error('Slide not found:', slideId);
      throw new NotFoundError('Slide');
    }
    console.log('Slide found:', slide.id);

    // Check class ownership
    const classData = ClassesRepository.getById(slide.class_id);
    if (!classData) {
      console.error('Class not found:', slide.class_id);
      throw new NotFoundError('Class');
    }
    console.log('Class found:', classData.id);

    if (classData.teacher_id !== userId) {
      console.error('Permission denied. Teacher:', classData.teacher_id, 'User:', userId);
      throw new ForbiddenError('You can only update slides in your own classes');
    }
    console.log('Permission granted');

    // Validate canvas data (basic JSON check)
    try {
      const parsed = JSON.parse(canvasData);
      console.log('JSON valid, objects count:', parsed.objects?.length);
    } catch (err) {
      console.error('Invalid JSON:', err);
      console.error('Data preview:', canvasData.substring(0, 200));
      throw new ValidationError('Invalid canvas data format');
    }

    // Update canvas
    try {
      console.log('Updating repository...');
      const updated = SlidesRepository.updateCanvas(slideId, canvasData);
      if (!updated) {
        console.error('Repository returned no slide');
        throw new NotFoundError('Slide');
      }
      console.log('=== UPDATE CANVAS SUCCESS ===');
      return updated;
    } catch (err) {
      console.error('Repository error:', err);
      throw err;
    }
  }

  // Delete slide (only class owner)
  static async delete(slideId: string, userId: string): Promise<void> {
    console.log('=== DELETE SLIDE START ===');
    console.log('Slide ID:', slideId);
    console.log('User ID:', userId);

    try {
      // Get slide
      const slide = SlidesRepository.getById(slideId);
      if (!slide) {
        console.error('Slide not found for deletion');
        throw new NotFoundError('Slide');
      }

      // Check class ownership
      const classData = ClassesRepository.getById(slide.class_id);
      if (!classData) {
        console.error('Class not found for slide');
        throw new NotFoundError('Class');
      }

      if (classData.teacher_id !== userId) {
        console.error('Permission denied for deletion');
        throw new ForbiddenError('You can only delete slides in your own classes');
      }

      // ✅ Borrado manual en cascada para evitar errores de FK
      // 1. Borrar sesiones que usan esta slide
      console.log('Deleting sessions using this slide...');
      const sessionsDeleted = SessionsRepository.deleteBySlide(slideId);
      console.log(`Deleted ${sessionsDeleted} sessions.`);

      // 2. Borrar copias de estudiantes
      console.log('Deleting dependent student copies...');
      const copiesDeleted = StudentCopiesRepository.deleteBySlide(slideId);
      console.log(`Deleted ${copiesDeleted} student copies.`);

      // 3. Borrar la slide
      console.log('Attempting to delete slide from repository...');
      const deleted = SlidesRepository.delete(slideId);
      
      if (!deleted) {
        console.error('Repository returned false (deletion failed)');
        throw new Error('Failed to delete slide from database');
      }
      
      console.log('=== DELETE SLIDE SUCCESS ===');
    } catch (error) {
      console.error('Error deleting slide:', error);
      throw error;
    }
  }
}
