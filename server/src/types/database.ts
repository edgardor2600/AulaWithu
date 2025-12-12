// Database entity types

export interface User {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  avatar_color: string | null;
  created_at: string;
}

export interface Class {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Slide {
  id: string;
  class_id: string;
  slide_number: number;
  title: string | null;
  canvas_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  class_id: string;
  teacher_id: string;
  status: 'active' | 'paused' | 'ended';
  started_at: string;
  ended_at: string | null;
  yjs_room_name: string;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
}

export interface StudentCopy {
  id: string;
  slide_id: string;
  student_id: string;
  canvas_data: string | null;
  saved_at: string;
}

export interface Upload {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  file_path: string;
  uploaded_at: string;
}

export interface EventLog {
  id: number;
  session_id: string;
  event_type: string;
  actor_id: string;
  slide_id: string | null;
  payload: string | null;
  timestamp: string;
}
