import { SlidesRepository, ClassesRepository } from '../db/repositories';
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

    // Validate canvas data (basic JSON check)
    try {
      JSON.parse(canvasData);
    } catch {
      throw new ValidationError('Invalid canvas data format');
    }

    // Update canvas
    const updated = SlidesRepository.updateCanvas(slideId, canvasData);
    if (!updated) {
      throw new NotFoundError('Slide');
    }

    return updated;
  }

  // Delete slide (only class owner)
  static async delete(slideId: string, userId: string): Promise<void> {
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
      throw new ForbiddenError('You can only delete slides in your own classes');
    }

    // Delete slide
    const deleted = SlidesRepository.delete(slideId);
    if (!deleted) {
      throw new NotFoundError('Slide');
    }
  }
}
