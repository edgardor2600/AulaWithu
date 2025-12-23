// Database entity types

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  avatar_color: string | null;
  created_at: string;
  // Authentication fields (added in migration 003)
  username: string | null;
  password_hash: string | null;
  active: number; // SQLite boolean (0 or 1)
  last_login: string | null;
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
  topic_id: string | null; // Added in migration 008
}

export interface Session {
  id: string;
  class_id: string;
  slide_id: string;
  teacher_id: string;
  session_code: string;
  is_active: number; // SQLite boolean (0 or 1)
  allow_student_draw: number; // SQLite boolean (0 or 1)
  created_at: string;
  ended_at: string | null;
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

export interface TeacherStudent {
  id: string;
  teacher_id: string;
  student_id: string;
  assigned_at: string;
  assigned_by: string | null;
  notes: string | null;
  active: number; // SQLite boolean (0 or 1)
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: number; // SQLite boolean (0 or 1)
  deleted_by_sender: number; // SQLite boolean (0 or 1)
  deleted_by_receiver: number; // SQLite boolean (0 or 1)
}

export interface Group {
  id: string;
  class_id: string;
  name: string;
  description: string | null;
  max_students: number;
  active: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  group_id: string;
  student_id: string;
  enrolled_at: string;
  enrolled_by: string | null;
  status: 'active' | 'inactive' | 'completed';
  notes: string | null;
}

// Topics (added in migration 008)
export interface Topic {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  topic_number: number;
  active: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

export interface TopicWithSlideCount extends Topic {
  slides_count: number;
}
