-- Development Seed Data
-- Sample data for testing and development

-- Insert teacher user
INSERT INTO users (id, name, role, avatar_color) 
VALUES ('teacher-001', 'Prof. García', 'teacher', '#3b82f6');

-- Insert student users
INSERT INTO users (id, name, role, avatar_color) VALUES
('student-001', 'Ana Martínez', 'student', '#ef4444'),
('student-002', 'Carlos López', 'student', '#10b981'),
('student-003', 'María Rodríguez', 'student', '#f59e0b'),
('student-004', 'Juan Pérez', 'student', '#8b5cf6'),
('student-005', 'Laura Gómez', 'student', '#ec4899');

-- Insert sample class
INSERT INTO classes (id, title, description, teacher_id)
VALUES ('class-001', 'English Level A1 - Unit 1', 'Introduction to basic greetings and vocabulary', 'teacher-001');

-- Insert sample slides
INSERT INTO slides (id, class_id, slide_number, title, canvas_data) VALUES
('slide-001', 'class-001', 1, 'Welcome', '{"version":"5.3.0","objects":[]}'),
('slide-002', 'class-001', 2, 'Vocabulary', '{"version":"5.3.0","objects":[]}'),
('slide-003', 'class-001', 3, 'Practice', '{"version":"5.3.0","objects":[]}');
