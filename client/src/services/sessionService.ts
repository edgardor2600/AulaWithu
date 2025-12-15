import api from './api';

export interface Session {
  id: string;
  class_id: string;
  slide_id: string;
  teacher_id: string;
  session_code: string;
  is_active: number;
  allow_student_draw: number;
  created_at: string;
  ended_at: string | null;
}

export interface CreateSessionData {
  class_id: string;
  slide_id: string;
  allow_student_draw?: boolean;
}

export const sessionService = {
  /**
   * Create a new live session
   */
  async create(data: CreateSessionData): Promise<Session> {
    const response = await api.post<{ success: boolean; session: Session }>(
      '/sessions',
      data
    );
    return response.data.session;
  },

  /**
   * Join a session with code
   */
  async joinByCode(sessionCode: string): Promise<Session> {
    const response = await api.post<{ success: boolean; session: Session }>(
      '/sessions/join',
      { session_code: sessionCode }
    );
    return response.data.session;
  },

  /**
   * Get session by ID
   */
  async getById(sessionId: string): Promise<Session> {
    const response = await api.get<{ success: boolean; session: Session }>(
      `/sessions/${sessionId}`
    );
    return response.data.session;
  },

  /**
   * Update session permissions
   */
  async updatePermissions(sessionId: string, allowStudentDraw: boolean): Promise<Session> {
    const response = await api.put<{ success: boolean; session: Session }>(
      `/sessions/${sessionId}/permissions`,
      { allow_student_draw: allowStudentDraw }
    );
    return response.data.session;
  },

  /**
   * Update current slide
   */
  async updateSlide(sessionId: string, slideId: string): Promise<Session> {
    const response = await api.put<{ success: boolean; session: Session }>(
      `/sessions/${sessionId}/slide`,
      { slide_id: slideId }
    );
    return response.data.session;
  },

  /**
   * End a session
   */
  async end(sessionId: string): Promise<Session> {
    const response = await api.put<{ success: boolean; session: Session }>(
      `/sessions/${sessionId}/end`
    );
    return response.data.session;
  },

  /**
   * Get active sessions for teacher
   */
  async getActive(): Promise<Session[]> {
    const response = await api.get<{ success: boolean; sessions: Session[] }>(
      '/sessions/teacher/active'
    );
    return response.data.sessions;
  },
};
