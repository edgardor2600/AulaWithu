import { Router } from 'express';
import {  TeacherStudentsRepository, UsersRepository } from '../db/repositories';
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

export default router;
