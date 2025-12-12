import { SessionsRepository, ClassesRepository, UsersRepository } from '../db/repositories';
import { Session } from '../types/database';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../utils/AppError';

export class SessionService {
  // Start a new session (teacher only)
  static async start(data: {
    class_id: string;
    teacher_id: string;
  }): Promise<Session> {
    // Check if class exists
    const classData = ClassesRepository.getById(data.class_id);
    if (!classData) {
      throw new NotFoundError('Class');
    }

    // Check ownership
    if (classData.teacher_id !== data.teacher_id) {
      throw new ForbiddenError('You can only start sessions for your own classes');
    }

    // Check if there's already an active session
    const activeSession = SessionsRepository.getActiveByClass(data.class_id);
    if (activeSession) {
      throw new ConflictError('There is already an active session for this class');
    }

    // Create session
    const session = SessionsRepository.create({
      class_id: data.class_id,
      teacher_id: data.teacher_id,
    });

    return session;
  }

  // Get session by ID with details
  static async getById(sessionId: string): Promise<any> {
    const session = SessionsRepository.getById(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    // Get session with details (class, teacher)
    const sessionWithDetails = SessionsRepository.getWithDetails(sessionId);

    // Get active participants
    const participants = SessionsRepository.getActiveParticipants(sessionId);

    return {
      ...sessionWithDetails,
      participants,
      participants_count: participants.length,
    };
  }

  // Get active session for a class
  static async getActiveByClass(classId: string): Promise<Session | null> {
    // Check if class exists
    const classData = ClassesRepository.getById(classId);
    if (!classData) {
      throw new NotFoundError('Class');
    }

    const session = SessionsRepository.getActiveByClass(classId);
    return session || null;
  }

  // Join session (student or teacher)
  static async join(sessionId: string, userId: string): Promise<any> {
    // Check if session exists
    const session = SessionsRepository.getById(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    // Check if session is active
    if (session.status !== 'active') {
      throw new ValidationError('Session is not active');
    }

    // Check if user exists
    const user = UsersRepository.getById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Add participant
    const participant = SessionsRepository.addParticipant(sessionId, userId);

    return {
      success: true,
      session: {
        id: session.id,
        class_id: session.class_id,
        yjs_room_name: session.yjs_room_name,
        yjs_url: `ws://localhost:${process.env.YJS_PORT || 1234}`,
      },
      participant,
    };
  }

  // Leave session
  static async leave(sessionId: string, userId: string): Promise<void> {
    // Check if session exists
    const session = SessionsRepository.getById(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    // Remove participant
    const removed = SessionsRepository.removeParticipant(sessionId, userId);
    if (!removed) {
      throw new ValidationError('You are not in this session');
    }
  }

  // End session (teacher only)
  static async end(sessionId: string, userId: string): Promise<Session> {
    // Check if session exists
    const session = SessionsRepository.getById(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    // Check ownership
    if (session.teacher_id !== userId) {
      throw new ForbiddenError('Only the teacher can end the session');
    }

    // Check if already ended
    if (session.status === 'ended') {
      throw new ValidationError('Session is already ended');
    }

    // End session
    const ended = SessionsRepository.end(sessionId);
    if (!ended) {
      throw new NotFoundError('Session');
    }

    return ended;
  }

  // Get all sessions for a class
  static async getByClass(classId: string): Promise<Session[]> {
    // Check if class exists
    const classData = ClassesRepository.getById(classId);
    if (!classData) {
      throw new NotFoundError('Class');
    }

    return SessionsRepository.getByClass(classId);
  }
}
