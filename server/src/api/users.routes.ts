import { Router } from 'express';
import { EnrollmentsRepository, UsersRepository, ClassesRepository } from '../db/repositories';
import { authMiddleware } from '../middleware/auth.middleware';
import { teacherOnly } from '../middleware/role.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * GET /api/users/my-students
 * Get students assigned to the logged-in teacher (via enrollments)
 * Only accessible by teachers
 */
router.get(
  '/my-students',
  authMiddleware,
  teacherOnly,
  asyncHandler(async (req: any, res: any) => {
    const teacherId = req.user.userId;

    // Get enrollments for this teacher's groups
    const enrollments = await EnrollmentsRepository.getStudentsByTeacher(teacherId);

    // Group by student (a student may be in multiple groups)
    const studentMap = new Map();
    for (const enrollment of enrollments) {
      if (!studentMap.has(enrollment.student_id)) {
        studentMap.set(enrollment.student_id, {
          student_id: enrollment.student_id,
          first_enrolled: enrollment.enrolled_at,
          groups: []
        });
      }
      studentMap.get(enrollment.student_id).groups.push({
        group_id: enrollment.group_id,
        class_id: enrollment.class_id,
        notes: enrollment.notes
      });
    }

    // Get full student details
    const studentsWithDetails = await Promise.all(
      Array.from(studentMap.values()).map(async (data) => {
        const student = await UsersRepository.getById(data.student_id);
        if (!student) return null;
        
        return {
          student: {
            id: student.id,
            name: student.name,
            username: student.username,
            avatar_color: student.avatar_color,
            active: student.active === 1,
            last_login: student.last_login,
          },
          enrolled_at: data.first_enrolled,
          groups_count: data.groups.length,
          groups: data.groups,
        };
      })
    );

    const filteredStudents = studentsWithDetails.filter(item => item !== null);

    res.status(200).json({
      success: true,
      count: filteredStudents.length,
      students: filteredStudents,
    });
  })
);

/**
 * GET /api/users/my-teachers
 * Get teachers assigned to the logged-in student (via enrollments)
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

    // Get teacher enrollments
    const enrollments = await EnrollmentsRepository.getTeachersByStudent(studentId);

    // Group by teacher
    const teacherMap = new Map();
    for (const enrollment of enrollments) {
      if (!teacherMap.has(enrollment.teacher_id)) {
        teacherMap.set(enrollment.teacher_id, {
          teacher_id: enrollment.teacher_id,
          first_enrolled: enrollment.enrolled_at,
          classes: new Set()
        });
      }
      teacherMap.get(enrollment.teacher_id).classes.add(enrollment.class_id);
    }

    // Get full teacher details
    const teachersWithDetails = await Promise.all(
      Array.from(teacherMap.values()).map(async (data) => {
        const teacher = await UsersRepository.getById(data.teacher_id);
        if (!teacher || !teacher.active) return null;

        return {
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          teacher_avatar_color: teacher.avatar_color || '#4F46E5',
          enrolled_at: data.first_enrolled,
          classes_count: data.classes.size,
        };
      })
    );

    const filteredTeachers = teachersWithDetails.filter(item => item !== null);

    res.status(200).json({
      success: true,
      count: filteredTeachers.length,
      teachers: filteredTeachers,
    });
  })
);

export default router;

