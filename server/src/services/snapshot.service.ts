import { StudentCopiesRepository, SlidesRepository } from '../db/repositories';
import { StudentCopy } from '../types/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/AppError';

export class SnapshotService {
  // Save student copy (create or update)
  static async save(data: {
    slide_id: string;
    student_id: string;
    canvas_data: string;
  }): Promise<StudentCopy> {
    // Check if slide exists
    const slide = await SlidesRepository.getById(data.slide_id);
    if (!slide) {
      throw new NotFoundError('Slide');
    }

    // Validate canvas data (basic JSON check)
    try {
      JSON.parse(data.canvas_data);
    } catch {
      throw new ValidationError('Invalid canvas data format');
    }

    // Save copy (upsert)
    const copy = await StudentCopiesRepository.save({
      slide_id: data.slide_id,
      student_id: data.student_id,
      canvas_data: data.canvas_data,
    });

    return copy;
  }

  // Get copy by ID
  static async getById(copyId: string, userId: string): Promise<StudentCopy> {
    const copy = await StudentCopiesRepository.getById(copyId);
    if (!copy) {
      throw new NotFoundError('Snapshot');
    }

    // Check ownership
    if (copy.student_id !== userId) {
      throw new ForbiddenError('You can only view your own snapshots');
    }

    return copy;
  }

  // Get all copies by student with details
  static async getByStudent(studentId: string): Promise<any[]> {
    return await StudentCopiesRepository.getByStudentWithDetails(studentId);
  }

  // Get copy for specific slide and student
  static async getBySlideAndStudent(slideId: string, studentId: string): Promise<StudentCopy | null> {
    // Check if slide exists
    const slide = await SlidesRepository.getById(slideId);
    if (!slide) {
      throw new NotFoundError('Slide');
    }

    const copy = await StudentCopiesRepository.getBySlideAndStudent(slideId, studentId);
    return copy || null;
  }

  // Delete copy (only owner)
  static async delete(copyId: string, userId: string): Promise<void> {
    // Get copy
    const copy = await StudentCopiesRepository.getById(copyId);
    if (!copy) {
      throw new NotFoundError('Snapshot');
    }

    // Check ownership
    if (copy.student_id !== userId) {
      throw new ForbiddenError('You can only delete your own snapshots');
    }

    // Delete copy
    const deleted = await StudentCopiesRepository.delete(copyId);
    if (!deleted) {
      throw new NotFoundError('Snapshot');
    }
  }

  // Get all copies for a slide (teacher view)
  static async getBySlide(slideId: string): Promise<any[]> {
    // Check if slide exists
    const slide = await SlidesRepository.getById(slideId);
    if (!slide) {
      throw new NotFoundError('Slide');
    }

    return await StudentCopiesRepository.getBySlide(slideId);
  }
}
