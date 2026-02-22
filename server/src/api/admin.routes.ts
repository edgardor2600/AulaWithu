import { Router } from 'express';
import { body } from 'express-validator';
import { AdminService } from '../services/admin.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { UsersRepository } from '../db/repositories/users-repository';
import { logger } from '../utils/logger';

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
    body('groupId').optional().isString(),
    body('levelId').optional().isString(),
    body('enrollmentNotes').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { name, username, password, groupId, levelId, enrollmentNotes } = req.body;
    const adminId = req.user.userId;

    const student = await AdminService.createStudent(
      { name, username, password, groupId, levelId, enrollmentNotes }, 
      adminId
    );

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
 * Get users with pagination support.
 *
 * Query params:
 *   ?page=1          — Page number (1-based, default: 1)
 *   ?limit=20        — Results per page (max: 100, default: 20)
 *   ?role=teacher    — Filter by role (admin | teacher | student)
 */
router.get(
  '/users',
  asyncHandler(async (req: any, res: any) => {
    const role   = req.query.role  as 'admin' | 'teacher' | 'student' | undefined;
    const page   = req.query.page  ? parseInt(req.query.page,  10) : 1;
    const limit  = req.query.limit ? parseInt(req.query.limit, 10) : 20;

    const result = await UsersRepository.getPaginated({ page, limit, role });

    res.status(200).json({
      success: true,
      // Pagination metadata
      pagination: {
        total:      result.total,
        page:       result.page,
        limit:      result.limit,
        totalPages: result.totalPages,
      },
      count: result.users.length,
      users: result.users.map((u: any) => ({
        id:         u.id,
        name:       u.name,
        username:   u.username,
        role:       u.role,
        avatar_color: u.avatar_color,
        active:     u.active === 1,
        created_at: u.created_at,
        last_login: u.last_login,
        level_id:   u.level_id || null,
        level:      u.level    || null,
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

    const user = await AdminService.deactivateUser(id, adminId);

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

    const user = await AdminService.activateUser(id, adminId);

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

    const deleted = await AdminService.deleteUser(id, adminId);

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

/**
 * PATCH /api/admin/users/:id/level
 * Update user's academic level (students only)
 */
router.patch(
  '/users/:id/level',
  [
    body('levelId').optional().isString().withMessage('Level ID must be a string'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { levelId } = req.body;

    console.log('📝 [UPDATE LEVEL] Request:', { userId: id, levelId, body: req.body });

    // Get user to verify it's a student
    const user = await UsersRepository.getById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    logger.debug('[ADMIN] Current user found', { name: user.name, level_id: user.level_id });

    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Only students can have academic levels',
          code: 'INVALID_USER_ROLE',
        },
      });
    }

    // Update level
    const valueToSave = levelId || null;
    logger.debug('[ADMIN] Saving level_id', { valueToSave });
    const updatedUser = await UsersRepository.update(id, { level_id: valueToSave });
    logger.debug('[ADMIN] After update', { level_id: updatedUser?.level_id });

    // Get updated user with level info (includes JOIN for level name)
    const allUsers = await UsersRepository.getAll();
    const userWithLevel = allUsers.find((u: any) => u.id === id);
    logger.debug('[ADMIN] Final user with level', { level_id: userWithLevel?.level_id });

    res.status(200).json({
      success: true,
      message: 'Level updated successfully',
      user: userWithLevel,
    });
  })
);

// ============================================
// UNIFIED ENROLLMENT ENDPOINT
// ============================================


/**
 * POST /api/admin/enrollments/unified
 * Enroll student in a group and automatically assign to teacher
 */
router.post(
  '/enrollments/unified',
  [
    body('groupId').notEmpty().withMessage('Group ID is required'),
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('notes').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { groupId, studentId, notes } = req.body;
    const adminId = req.user.userId;

    const result = await AdminService.enrollStudentToGroupUnified(
      { groupId, studentId, notes },
      adminId
    );

    res.status(201).json({
      success: true,
      data: result,
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
    const stats = await AdminService.getStats();

    res.status(200).json({
      success: true,
      stats,
    });
  })
);

export default router;
