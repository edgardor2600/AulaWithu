import api from './api';

// ============================================
// TYPES
// ============================================

export interface Exam {
  id: string;
  class_id: string;
  group_id: string | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  status: 'draft' | 'active' | 'closed';
  available_from: string | null;
  available_to: string | null;
  scale_max: number;
  skill_type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_number: number;
  type: 'multiple_choice' | 'short_answer';
  text: string;
  options: string[] | null;
  correct_answer: string | null; // Only received by teacher
  points: number;
  skill_category: string;
  media_url: string | null;
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  student_name?: string;   // Joined from users table (teacher view)
  student_email?: string;  // Joined from users table (teacher view)
  status: 'in_progress' | 'submitted' | 'graded';
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_points: number | null;
  earned_points: number | null;
  teacher_feedback: string | null;
}

export interface ExamAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_text: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
  answered_at: string;
  // Teacher view: joined from exam_questions
  question_text?: string;
  question_type?: string;
  correct_answer?: string | null;
  points?: number;
  skill_category?: string;
}

// ============================================
// SERVICE
// ============================================

export const examsService = {
  // --- TEACHER: Exam CRUD ---

  async createExam(data: {
    classId: string;
    groupId?: string | null;
    title: string;
    description?: string;
    durationMinutes?: number;
    passingScore?: number;
    skillType?: string;
    questionCount?: number;
    availableFrom?: string | null;
    availableTo?: string | null;
  }): Promise<Exam> {
    const res = await api.post('/exams', data);
    return res.data.exam;
  },

  async getExamsByClass(classId: string): Promise<Exam[]> {
    const res = await api.get(`/classes/${classId}/exams`);
    return res.data.exams;
  },

  async getExam(examId: string): Promise<{ exam: Exam; questions: ExamQuestion[] }> {
    const res = await api.get(`/exams/${examId}`);
    return { exam: res.data.exam, questions: res.data.questions };
  },

  async updateExam(examId: string, data: {
    groupId?: string | null;
    title?: string;
    description?: string;
    durationMinutes?: number;
    passingScore?: number;
    availableFrom?: string | null;
    availableTo?: string | null;
    scaleMax?: number;
    skillType?: string;
  }): Promise<Exam> {
    const res = await api.put(`/exams/${examId}`, data);
    return res.data.exam;
  },

  async deleteExam(examId: string): Promise<void> {
    await api.delete(`/exams/${examId}`);
  },

  async publishExam(examId: string): Promise<Exam> {
    const res = await api.post(`/exams/${examId}/publish`);
    return res.data.exam;
  },

  async closeExam(examId: string): Promise<Exam> {
    const res = await api.post(`/exams/${examId}/close`);
    return res.data.exam;
  },

  // --- TEACHER: Question management ---

  async addQuestion(examId: string, data: {
    type: 'multiple_choice' | 'short_answer';
    text: string;
    options?: string[];
    correctAnswer?: string;
    points?: number;
    skillCategory?: string;
    mediaUrl?: string | null;
  }): Promise<ExamQuestion> {
    const res = await api.post(`/exams/${examId}/questions`, data);
    return res.data.question;
  },

  async updateQuestion(examId: string, questionId: string, data: {
    type?: 'multiple_choice' | 'short_answer';
    text?: string;
    options?: string[] | null;
    correctAnswer?: string | null;
    points?: number;
    skillCategory?: string;
    mediaUrl?: string | null;
  }): Promise<ExamQuestion> {
    const res = await api.put(`/exams/${examId}/questions/${questionId}`, data);
    return res.data.question;
  },

  async deleteQuestion(examId: string, questionId: string): Promise<void> {
    await api.delete(`/exams/${examId}/questions/${questionId}`);
  },

  // --- TEACHER: Results ---

  async getExamResults(examId: string): Promise<{
    exam: Exam;
    questions: ExamQuestion[];
    attempts: ExamAttempt[];
  }> {
    const res = await api.get(`/exams/${examId}/results`);
    return { exam: res.data.exam, questions: res.data.questions, attempts: res.data.attempts };
  },

  // --- STUDENT: Take exam ---

  async startAttempt(examId: string): Promise<ExamAttempt> {
    const res = await api.post(`/exams/${examId}/attempt`);
    return res.data.attempt;
  },

  async getMyAttempt(examId: string): Promise<{ attempt: ExamAttempt; answers: ExamAnswer[] } | null> {
    const res = await api.get(`/exams/${examId}/attempt`);
    if (!res.data.attempt) return null;
    return { attempt: res.data.attempt, answers: res.data.answers ?? [] };
  },

  async saveAnswer(attemptId: string, questionId: string, answerText: string | null): Promise<ExamAnswer> {
    const res = await api.put(`/exams/attempts/${attemptId}/answers`, { questionId, answerText });
    return res.data.answer;
  },

  async submitAttempt(attemptId: string): Promise<ExamAttempt> {
    const res = await api.post(`/exams/attempts/${attemptId}/submit`);
    return res.data.attempt;
  },

  // --- TEACHER: Manual Grading ---

  async getAttemptDetail(attemptId: string): Promise<{ attempt: ExamAttempt; answers: ExamAnswer[] }> {
    const res = await api.get(`/exams/attempts/${attemptId}/detail`);
    return { attempt: res.data.attempt, answers: res.data.answers ?? [] };
  },

  async gradeAnswer(attemptId: string, questionId: string, pointsEarned: number): Promise<ExamAttempt> {
    const res = await api.put(`/exams/attempts/${attemptId}/grade`, { questionId, pointsEarned });
    return res.data.attempt;
  },
};
