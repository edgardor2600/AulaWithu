-- Development Seed Data
-- Sample data for testing and development

-- Insert academic levels
INSERT INTO academic_levels (id, name, description) VALUES
('level-a1', 'A1', 'Nivel principiante - Puede comprender y utilizar expresiones cotidianas'),
('level-a2', 'A2', 'Nivel elemental - Puede comunicarse en tareas simples y cotidianas'),
('level-b1', 'B1', 'Nivel intermedio - Puede desenvolverse en la mayoría de situaciones'),
('level-b2', 'B2', 'Nivel intermedio alto - Puede interactuar con hablantes nativos con fluidez');

-- Insert teacher user
INSERT INTO users (id, name, role, avatar_color) 
VALUES ('teacher-001', 'Prof. García', 'teacher', '#3b82f6');

-- Insert student users
INSERT INTO users (id, name, role, avatar_color, level_id) VALUES
('student-001', 'Ana Martínez', 'student', '#ef4444', 'level-a1'),
('student-002', 'Carlos López', 'student', '#10b981', 'level-a1'),
('student-003', 'María Rodríguez', 'student', '#f59e0b', 'level-a2'),
('student-004', 'Juan Pérez', 'student', '#8b5cf6', 'level-b1'),
('student-005', 'Laura Gómez', 'student', '#ec4899', 'level-b2');

-- Insert sample class
INSERT INTO classes (id, title, description, teacher_id, level_id)
VALUES ('class-001', 'English Level A1 - Unit 1', 'Introduction to basic greetings and vocabulary', 'teacher-001', 'level-a1');

-- Insert sample slides
INSERT INTO slides (id, class_id, slide_number, title, canvas_data) VALUES
('slide-001', 'class-001', 1, 'Welcome', '{"version":"5.3.0","objects":[]}'),
('slide-002', 'class-001', 2, 'Vocabulary', '{"version":"5.3.0","objects":[]}'),
('slide-003', 'class-001', 3, 'Practice', '{"version":"5.3.0","objects":[]}');
