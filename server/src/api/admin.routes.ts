import { Router } from 'express';
import { body } from 'express-validator';
import { AdminService } from '../services/admin.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// All admin routes require authentication + admin role
// We apply both middlewares to the router
router.use(authMiddleware);
router.use(adminMiddleware);

// ============================================
// USER MANAGEMENT ENDPOINTS
// ============================================

/**
 * POST /api/admin/users/teacher
 * Create a new teacher account
 */
router.post(
  '/users/teacher',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { name, username, password } = req.body;
    const adminId = req.user.userId;

    const teacher = await AdminService.createTeacher({ name, username, password }, adminId);

    res.status(201).json({
      success: true,
      user: {
        id: teacher.id,
        name: teacher.name,
        username: teacher.username,
        role: teacher.role,
        avatar_color: teacher.avatar_color,
        active: teacher.active === 1,
        created_at: teacher.created_at,
      },
    });
  })
);

/**
 * POST /api/admin/users/student
 * Create a new student account
 */
router.post(
  '/users/student',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { name, username, password } = req.body;
    const adminId = req.user.userId;

    const student = await AdminService.createStudent({ name, username, password }, adminId);

    res.status(201).json({
      success: true,
      user: {
        id: student.id,
        name: student.name,
        username: student.username,
        role: student.role,
        avatar_color: student.avatar_color,
        active: student.active === 1,
        created_at: student.created_at,
      },
    });
  })
);

/**
 * GET /api/admin/users
 * Get all users (with optional role filter)
 */
router.get(
  '/users',
  asyncHandler(async (req: any, res: any) => {
    const role = req.query.role as 'admin' | 'teacher' | 'student' | undefined;

    const users = AdminService.getAllUsers(role);

    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        avatar_color: u.avatar_color,
        active: u.active === 1,
        created_at: u.created_at,
        last_login: u.last_login,
      })),
    });
  })
);

/**
 * PATCH /api/admin/users/:id/deactivate
 * Deactivate a user
 */
router.patch(
  '/users/:id/deactivate',
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const adminId = req.user.userId;

    const user = AdminService.deactivateUser(id, adminId);

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      user: {
        id: user!.id,
        name: user!.name,
        username: user!.username,
        active: user!.active === 1,
      },
    });
  })
);

/**
 * PATCH /api/admin/users/:id/activate
 * Activate a user
 */
router.patch(
  '/users/:id/activate',
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const adminId = req.user.userId;

    const user = AdminService.activateUser(id, adminId);

    res.status(200).json({
      success: true,
      message: 'User activated successfully',
      user: {
        id: user!.id,
        name: user!.name,
        username: user!.username,
        active: user!.active === 1,
      },
    });
  })
);

/**
 * DELETE /api/admin/users/:id
 * Delete a user permanently
 */
router.delete(
  '/users/:id',
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const adminId = req.user.userId;

    const deleted = AdminService.deleteUser(id, adminId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  })
);

// ============================================
// TEACHER-STUDENT ASSIGNMENT ENDPOINTS
// ============================================

/**
 * POST /api/admin/assignments
 * Assign a student to a teacher
 */
router.post(
  '/assignments',
  [
    body('teacherId').notEmpty().withMessage('Teacher ID is required'),
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('notes').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { teacherId, studentId, notes } = req.body;
    const adminId = req.user.userId;

    const assignment = AdminService.assignStudentToTeacher(
      { teacherId, studentId, notes },
      adminId
    );

    res.status(201).json({
      success: true,
      assignment: {
        id: assignment.id,
        teacher_id: assignment.teacher_id,
        student_id: assignment.student_id,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
        notes: assignment.notes,
        active: assignment.active === 1,
      },
    });
  })
);

/**
 * DELETE /api/admin/assignments
 * Unassign a student from a teacher
 */
router.delete(
  '/assignments',
  [
    body('teacherId').notEmpty().withMessage('Teacher ID is required'),
    body('studentId').notEmpty().withMessage('Student ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { teacherId, studentId } = req.body;
    const adminId = req.user.userId;

    const unassigned = AdminService.unassignStudentFromTeacher(teacherId, studentId, adminId);

    if (!unassigned) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assignment not found',
          code: 'ASSIGNMENT_NOT_FOUND',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student unassigned from teacher successfully',
    });
  })
);

/**
 * GET /api/admin/assignments
 * Get all assignments
 */
router.get(
  '/assignments',
  asyncHandler(async (req: any, res: any) => {
    const activeOnly = req.query.activeOnly !== 'false'; // Default: true

    const assignments = AdminService.getAllAssignments(activeOnly);

    res.status(200).json({
      success: true,
      count: assignments.length,
      assignments: assignments.map(a => ({
        id: a.id,
        teacher_id: a.teacher_id,
        student_id: a.student_id,
        assigned_at: a.assigned_at,
        assigned_by: a.assigned_by,
        notes: a.notes,
        active: a.active === 1,
      })),
    });
  })
);

/**
 * GET /api/admin/teachers/:teacherId/students
 * Get students assigned to a specific teacher
 */
router.get(
  '/teachers/:teacherId/students',
  asyncHandler(async (req: any, res: any) => {
    const { teacherId } = req.params;

    const studentsWithDetails = await AdminService.getTeacherStudentsWithDetails(teacherId);

    res.status(200).json({
      success: true,
      count: studentsWithDetails.length,
      students: studentsWithDetails.map(item => ({
        assignment_id: item.assignment.id,
        student: {
          id: item.student.id,
          name: item.student.name,
          username: item.student.username,
          avatar_color: item.student.avatar_color,
          active: item.student.active === 1,
        },
        assigned_at: item.assignment.assigned_at,
        notes: item.assignment.notes,
      })),
    });
  })
);

/**
 * GET /api/admin/students/:studentId/teachers
 * Get teachers assigned to a specific student
 */
router.get(
  '/students/:studentId/teachers',
  asyncHandler(async (req: any, res: any) => {
    const { studentId } = req.params;

    const assignments = AdminService.getTeachersByStudent(studentId);

    res.status(200).json({
      success: true,
      count: assignments.length,
      assignments: assignments.map(a => ({
        id: a.id,
        teacher_id: a.teacher_id,
        assigned_at: a.assigned_at,
        assigned_by: a.assigned_by,
        notes: a.notes,
        active: a.active === 1,
      })),
    });
  })
);

// ============================================
// STATISTICS ENDPOINT
// ============================================

/**
 * GET /api/admin/stats
 * Get system statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req: any, res: any) => {
    const stats = AdminService.getStats();

    res.status(200).json({
      success: true,
      stats,
    });
  })
);

export default router;
