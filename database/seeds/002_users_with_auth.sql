-- Seed Data: Users with Authentication
-- Aula Colaborativa - Test Users
-- Created: 2025-12-19 | Updated: 2026-06-23
-- Password for ALL test users: "Password123" (mayúscula inicial + número)

-- ============================================
-- CLEAR OLD TEST DATA
-- ============================================

-- Delete all existing users (they don't have username/password)
DELETE FROM users;

-- Reset any auto-increment counters if needed
-- (Not applicable for TEXT PRIMARY KEY, but good practice)

-- ============================================
-- INSERT TEST USERS WITH AUTHENTICATION
-- ============================================

-- TEACHER: Prof. García
-- Username: prof.garcia
-- Password: Password123
INSERT INTO users (
  id, 
  name, 
  username, 
  password_hash, 
  role, 
  avatar_color,
  active,
  created_at
) VALUES (
  'teacher-001',
  'Prof. García',
  'prof.garcia',
  '$2b$10$KkqcqnU7M1h4ukZIpf89KuJIIJZ9jq5Ha3Vsi/q.7PSM1HkJdqv8q',
  'teacher',
  '#3b82f6',
  1,
  CURRENT_TIMESTAMP
);

-- STUDENT 1: Ana Martínez
-- Username: ana.martinez
-- Password: Password123
INSERT INTO users (
  id, 
  name, 
  username, 
  password_hash, 
  role, 
  avatar_color,
  active,
  created_at
) VALUES (
  'student-001',
  'Ana Martínez',
  'ana.martinez',
  '$2b$10$KkqcqnU7M1h4ukZIpf89KuJIIJZ9jq5Ha3Vsi/q.7PSM1HkJdqv8q',
  'student',
  '#10b981',
  1,
  CURRENT_TIMESTAMP
);

-- STUDENT 2: Carlos López
-- Username: carlos.lopez
-- Password: password123
INSERT INTO users (
  id, 
  name, 
  username, 
  password_hash, 
  role, 
  avatar_color,
  active,
  created_at
) VALUES (
  'student-002',
  'Carlos López',
  'carlos.lopez',
  '$2b$10$KkqcqnU7M1h4ukZIpf89KuJIIJZ9jq5Ha3Vsi/q.7PSM1HkJdqv8q',
  'student',
  '#f59e0b',
  1,
  CURRENT_TIMESTAMP
);

-- STUDENT 3: María Rodríguez
-- Username: maria.rodriguez
-- Password: password123
INSERT INTO users (
  id, 
  name, 
  username, 
  password_hash, 
  role, 
  avatar_color,
  active,
  created_at
) VALUES (
  'student-003',
  'María Rodríguez',
  'maria.rodriguez',
  '$2b$10$KkqcqnU7M1h4ukZIpf89KuJIIJZ9jq5Ha3Vsi/q.7PSM1HkJdqv8q',
  'student',
  '#8b5cf6',
  1,
  CURRENT_TIMESTAMP
);

-- STUDENT 4: Juan Pérez
-- Username: juan.perez
-- Password: password123
INSERT INTO users (
  id, 
  name, 
  username, 
  password_hash, 
  role, 
  avatar_color,
  active,
  created_at
) VALUES (
  'student-004',
  'Juan Pérez',
  'juan.perez',
  '$2b$10$KkqcqnU7M1h4ukZIpf89KuJIIJZ9jq5Ha3Vsi/q.7PSM1HkJdqv8q',
  'student',
  '#ec4899',
  1,
  CURRENT_TIMESTAMP
);

-- STUDENT 5: Laura Sánchez
-- Username: laura.sanchez
-- Password: password123
INSERT INTO users (
  id, 
  name, 
  username, 
  password_hash, 
  role, 
  avatar_color,
  active,
  created_at
) VALUES (
  'student-005',
  'Laura Sánchez',
  'laura.sanchez',
  '$2b$10$KkqcqnU7M1h4ukZIpf89KuJIIJZ9jq5Ha3Vsi/q.7PSM1HkJdqv8q',
  'student',
  '#06b6d4',
  1,
  CURRENT_TIMESTAMP
);

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Check that all users were inserted correctly
SELECT 
  id,
  name,
  username,
  role,
  active,
  CASE 
    WHEN password_hash IS NOT NULL THEN '✓ Set'
    ELSE '✗ Missing'
  END as password_status
FROM users
ORDER BY role DESC, name ASC;
