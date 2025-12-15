import { SessionsRepository, ClassesRepository, SlidesRepository } from '../db/repositories';
import { Session } from '../types/database';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../utils/AppError';

/**
 * SessionService
 * 
 * Business logic layer for live collaboration sessions.
 * Implements use cases and enforces business rules.
 * 
 * Responsibilities:
 * - Session lifecycle management (create, join, end)
 * - Permission validation
 * - Business rule enforcement
 * - Coordination between repositories
 */
export class SessionService {
  
  /**
   * Create a new live session
   * 
   * Business rules:
   * - Only teachers can create sessions
   * - Class must exist and belong to teacher
   * - Slide must exist and belong to class
   * - Only one active session per slide at a time
   * 
   * @param data Session creation data
   * @returns Created session with unique code
   */
  static async create(data: {
    class_id: string;
    slide_id: string;
    teacher_id: string;
    allow_student_draw?: boolean;
  }): Promise<Session> {
    // Validate class exists and belongs to teacher
    const classData = ClassesRepository.getById(data.class_id);
    if (!classData) {
      throw new NotFoundError('Class');
    }
    
    if (classData.teacher_id !== data.teacher_id) {
      throw new ForbiddenError('You can only create sessions for your own classes');
    }

    // Validate slide exists and belongs to class
    const slide = SlidesRepository.getById(data.slide_id);
    if (!slide) {
      throw new NotFoundError('Slide');
    }
    
    if (slide.class_id !== data.class_id) {
      throw new ValidationError('Slide does not belong to this class');
    }

    // Check if there's already an active session for this slide
    const existingSession = SessionsRepository.getActiveBySlide(data.slide_id);
    if (existingSession) {
      throw new ConflictError('There is already an active session for this slide');
    }

    // Create session with retry logic for code collision
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        const session = SessionsRepository.create({
          class_id: data.class_id,
          slide_id: data.slide_id,
          teacher_id: data.teacher_id,
          allow_student_draw: data.allow_student_draw || false,
        });
        
        return session;
      } catch (error: any) {
        // If unique constraint on session_code, retry
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && attempts < maxAttempts - 1) {
          attempts++;
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Failed to generate unique session code after multiple attempts');
  }

  /**
   * Get session by ID
   * 
   * @param sessionId Session ID
   * @returns Session data
   */
  static async getById(sessionId: string): Promise<Session> {
    const session = SessionsRepository.getById(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }
    
    return session;
  }

  /**
   * Join a session using session code
   * 
   * Business rules:
   * - Session must exist and be active
   * - User must be a student (teachers use create)
   * 
   * @param sessionCode 6-character session code
   * @param userId User attempting to join
   * @returns Session data
   */
  static async joinByCode(sessionCode: string, userId: string): Promise<Session> {
    // Find session by code
    const session = SessionsRepository.getByCode(sessionCode.toUpperCase());
    if (!session) {
      throw new NotFoundError('Session with this code');
    }

    // Check if session is active
    if (!session.is_active) {
      throw new ValidationError('This session has ended');
    }

    return session;
  }

  /**
   * Update session permissions
   * 
   * Business rules:
   * - Only the teacher who created the session can update permissions
   * - Session must be active
   * 
   * @param sessionId Session ID
   * @param teacherId Teacher attempting to update
   * @param allowStudentDraw New permission value
   * @returns Updated session
   */
  static async updatePermissions(
    sessionId: string,
    teacherId: string,
    allowStudentDraw: boolean
  ): Promise<Session> {
    // Get session
    const session = SessionsRepository.getById(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    // Verify ownership
    if (session.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only update your own sessions');
    }

    // Verify session is active
    if (!session.is_active) {
      throw new ValidationError('Cannot update permissions of an ended session');
    }

    // Update permissions
    const updated = SessionsRepository.updatePermissions(sessionId, allowStudentDraw);
    if (!updated) {
      throw new NotFoundError('Session');
    }

    return updated;
  }

/**
 * Update current slide
 * 
 * Business rules:
 * - Only the teacher who created the session can update the slide
 * - Session must be active
 * - Slide must exist and belong to the same class
 * 
 * @param sessionId Session ID
 * @param teacherId Teacher attempting to update
 * @param slideId New slide ID
 * @returns Updated session
 */
static async updateSlide(
  sessionId: string,
  teacherId: string,
  slideId: string
): Promise<Session> {
  // Get session
  const session = SessionsRepository.getById(sessionId);
  if (!session) {
    throw new NotFoundError('Session');
  }

  // Verify ownership
  if (session.teacher_id !== teacherId) {
    throw new ForbiddenError('You can only update your own sessions');
  }

  // Verify session is active
  if (!session.is_active) {
    throw new ValidationError('Cannot update slide of an ended session');
  }

  // Validate slide exists and belongs to same class
  const slide = SlidesRepository.getById(slideId);
  if (!slide) {
    throw new NotFoundError('Slide');
  }

  if (slide.class_id !== session.class_id) {
    throw new ValidationError('Slide must belong to the same class');
  }

  // Update slide
  const updated = SessionsRepository.updateSlide(sessionId, slideId);
  if (!updated) {
    throw new NotFoundError('Session');
  }

  return updated;
}

  /**
   * End a session
   * 
   * Business rules:
   * - Only the teacher who created the session can end it
   * - Session must be active
   * 
   * @param sessionId Session ID
   * @param teacherId Teacher attempting to end session
   * @returns Ended session
   */
  static async end(sessionId: string, teacherId: string): Promise<Session> {
    // Get session
    const session = SessionsRepository.getById(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    // Verify ownership
    if (session.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only end your own sessions');
    }

    // Verify session is active
    if (!session.is_active) {
      throw new ValidationError('Session is already ended');
    }

    // End session
    const ended = SessionsRepository.end(sessionId);
    if (!ended) {
      throw new NotFoundError('Session');
    }

    return ended;
  }

  /**
   * Get all active sessions for a teacher
   * 
   * @param teacherId Teacher ID
   * @returns List of active sessions
   */
  static async getActiveByTeacher(teacherId: string): Promise<Session[]> {
    return SessionsRepository.getActiveByTeacher(teacherId);
  }

  /**
   * Get session history for a class
   * 
   * @param classId Class ID
   * @param teacherId Teacher requesting history
   * @returns List of all sessions for the class
   */
  static async getByClass(classId: string, teacherId: string): Promise<Session[]> {
    // Verify class ownership
    const classData = ClassesRepository.getById(classId);
    if (!classData) {
      throw new NotFoundError('Class');
    }

    if (classData.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only view sessions for your own classes');
    }

    return SessionsRepository.getByClass(classId);
  }

  /**
   * Get session statistics for a teacher
   * 
   * @param teacherId Teacher ID
   * @returns Session statistics
   */
  static async getStats(teacherId: string): Promise<{
    total: number;
    active: number;
    ended: number;
  }> {
    return SessionsRepository.getStats(teacherId);
  }
}
