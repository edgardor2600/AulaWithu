import { Router } from 'express';
import { TeacherStudentsRepository, UsersRepository, ClassesRepository } from '../db/repositories';
import { authMiddleware } from '../middleware/auth.middleware';
import { teacherOnly } from '../middleware/role.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * GET /api/users/my-students
 * Get students assigned to the logged-in teacher
 * Only accessible by teachers
 */
router.get(
  '/my-students',
  authMiddleware,
  teacherOnly,
  asyncHandler(async (req: any, res: any) => {
    const teacherId = req.user.userId;

    // Get assignments
    const assignments = TeacherStudentsRepository.getStudentsByTeacher(teacherId);

    // Get full student details
    const studentsWithDetails = assignments.map((assignment) => {
      const student = UsersRepository.getById(assignment.student_id);
      return {
        assignment_id: assignment.id,
        student: student ? {
          id: student.id,
          name: student.name,
          username: student.username,
          avatar_color: student.avatar_color,
          active: student.active === 1,
          last_login: student.last_login,
        } : null,
        assigned_at: assignment.assigned_at,
        notes: assignment.notes,
      };
    }).filter(item => item.student !== null);

    res.status(200).json({
      success: true,
      count: studentsWithDetails.length,
      students: studentsWithDetails,
    });
  })
);

/**
 * GET /api/users/my-teachers
 * Get teachers assigned to the logged-in student
 * Only accessible by students
 */
router.get(
  '/my-teachers',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const studentId = req.user.userId;
    const userRole = req.user.role;

    // Only students can access this
    if (userRole !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can access this endpoint',
      });
    }

    // Get teacher assignments
    const assignments = TeacherStudentsRepository.getTeachersByStudent(studentId);

    // Get full teacher details with classes count
    const teachersWithDetails = assignments.map((assignment) => {
      const teacher = UsersRepository.getById(assignment.teacher_id);
      if (!teacher || !teacher.active) return null;

      // Count classes for this teacher
      const classes = ClassesRepository.getByTeacher(assignment.teacher_id);

      return {
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        teacher_avatar_color: teacher.avatar_color || '#4F46E5',
        assigned_at: assignment.assigned_at,
        classes_count: classes.length,
      };
    }).filter(item => item !== null);

    res.status(200).json({
      success: true,
      count: teachersWithDetails.length,
      teachers: teachersWithDetails,
    });
  })
);

export default router;
