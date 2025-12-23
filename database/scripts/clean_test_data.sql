-- ============================================
-- SCRIPT DE LIMPIEZA: Eliminar datos de prueba
-- ============================================
-- Ejecutar SOLO si los datos actuales no son importantes
-- Este script elimina TODAS las clases, slides y sesiones
-- Los grupos se mantienen (sin clases asociadas quedan huérfanos)

-- 1. Eliminar sesiones activas
DELETE FROM sessions;

-- 2. Eliminar student_copies (copias de estudiantes)
DELETE FROM student_copies;

-- 3. Eliminar slides
DELETE FROM slides;

-- 4. Eliminar clases (esto también elimina grupos por CASCADE)
-- NOTA: Si quieres mantener los grupos, comenta esta línea
DELETE FROM classes;

-- 5. Resetear uploads (opcional - descomentar si quieres limpiar)
-- DELETE FROM uploads;

-- 6. Resetear eventos (opcional)
-- DELETE FROM events_log;

-- Verificación final
SELECT 'Classes restantes:' as info, COUNT(*) as count FROM classes
UNION ALL
SELECT 'Slides restantes:', COUNT(*) FROM slides
UNION ALL
SELECT 'Sessions restantes:', COUNT(*) FROM sessions
UNION ALL
SELECT 'Groups restantes:', COUNT(*) FROM groups;
