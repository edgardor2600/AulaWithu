import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { GroupsService } from '../services/groups.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================
// GROUP MANAGEMENT ENDPOINTS
// ============================================

/**
 * POST /api/classes/:classId/groups
 * Create a new group for a class
 * Requires: teacher role (must own the class)
 */
router.post(
  '/:classId/groups',
  requireRole(['teacher', 'admin']),
  [
    param('classId').notEmpty().withMessage('Class ID is required'),
    body('name')
      .trim()
      .notEmpty().withMessage('Group name is required')
      .isLength({ min: 1, max: 100 }).withMessage('Group name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('maxStudents')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Max students must be between 1 and 100'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { classId } = req.params;
    const { name, description, maxStudents } = req.body;
    const teacherId = req.user!.userId;

    const group = await GroupsService.createGroup(
      classId,
      { name, description, maxStudents },
      teacherId
    );

    res.status(201).json({
      success: true,
      group: {
        id: group.id,
        class_id: group.class_id,
        name: group.name,
        description: group.description,
        max_students: group.max_students,
        active: group.active === 1,
        created_at: group.created_at,
        updated_at: group.updated_at,
      },
    });
  })
);

/**
 * GET /api/classes/:classId/groups
 * Get all groups for a class
 * Requires: authenticated user
 */
router.get(
  '/:classId/groups',
  [
    param('classId').notEmpty().withMessage('Class ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { classId } = req.params;
    const userId = req.user!.userId;

    const groups = await GroupsService.getClassGroups(classId, userId);

    res.status(200).json({
      success: true,
      groups: groups.map((group) => ({
        id: group.id,
        class_id: group.class_id,
        name: group.name,
        description: group.description,
        max_students: group.max_students,
        student_count: group.student_count,
        active: group.active === 1,
        created_at: group.created_at,
        updated_at: group.updated_at,
      })),
    });
  })
);

/**
 * PUT /api/groups/:groupId
 * Update a group
 * Requires: teacher role (must own the class)
 */
router.put(
  '/groups/:groupId',
  requireRole(['teacher', 'admin']),
  [
    param('groupId').notEmpty().withMessage('Group ID is required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('Group name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('maxStudents')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Max students must be between 1 and 100'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { groupId } = req.params;
    const { name, description, maxStudents } = req.body;
    const teacherId = req.user!.userId;

    const group = await GroupsService.updateGroup(
      groupId,
      { name, description, maxStudents },
      teacherId
    );

    res.status(200).json({
      success: true,
      group: {
        id: group.id,
        class_id: group.class_id,
        name: group.name,
        description: group.description,
        max_students: group.max_students,
        active: group.active === 1,
        created_at: group.created_at,
        updated_at: group.updated_at,
      },
    });
  })
);

/**
 * DELETE /api/groups/:groupId
 * Delete a group (only if no students enrolled)
 * Requires: teacher role (must own the class)
 */
router.delete(
  '/groups/:groupId',
  requireRole(['teacher', 'admin']),
  [
    param('groupId').notEmpty().withMessage('Group ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { groupId } = req.params;
    const teacherId = req.user!.userId;

    const deleted = await GroupsService.deleteGroup(groupId, teacherId);

    res.status(200).json({
      success: true,
      deleted,
    });
  })
);

// ============================================
// ENROLLMENT ENDPOINTS
// ============================================

/**
 * POST /api/groups/:groupId/enroll
 * Enroll a student in a group
 * Requires: teacher role (must own the class) or admin
 */
router.post(
  '/groups/:groupId/enroll',
  requireRole(['teacher', 'admin']),
  [
    param('groupId').notEmpty().withMessage('Group ID is required'),
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { groupId } = req.params;
    const { studentId, notes } = req.body;
    const enrolledBy = req.user!.userId;

    const enrollment = await GroupsService.enrollStudent(
      groupId,
      studentId,
      enrolledBy,
      notes
    );

    res.status(201).json({
      success: true,
      enrollment: {
        id: enrollment.id,
        group_id: enrollment.group_id,
        student_id: enrollment.student_id,
        enrolled_at: enrollment.enrolled_at,
        enrolled_by: enrollment.enrolled_by,
        status: enrollment.status,
        notes: enrollment.notes,
      },
    });
  })
);

/**
 * DELETE /api/groups/:groupId/students/:studentId
 * Unenroll a student from a group
 * Requires: teacher role (must own the class) or admin
 */
router.delete(
  '/groups/:groupId/students/:studentId',
  requireRole(['teacher', 'admin']),
  [
    param('groupId').notEmpty().withMessage('Group ID is required'),
    param('studentId').notEmpty().withMessage('Student ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { groupId, studentId } = req.params;
    const userId = req.user!.userId;

    const unenrolled = await GroupsService.unenrollStudent(groupId, studentId, userId);

    res.status(200).json({
      success: true,
      unenrolled,
    });
  })
);

/**
 * GET /api/groups/:groupId/students
 * Get all students enrolled in a group
 * Requires: authenticated user
 */
router.get(
  '/groups/:groupId/students',
  [
    param('groupId').notEmpty().withMessage('Group ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { groupId } = req.params;
    const userId = req.user!.userId;

    const studentsData = await GroupsService.getGroupStudents(groupId, userId);

    res.status(200).json({
      success: true,
      students: studentsData.map((item) => ({
        enrollment_id: item.enrollment.id,
        student: {
          id: item.student.id,
          name: item.student.name,
          username: item.student.username,
          avatar_color: item.student.avatar_color,
          active: item.student.active === 1,
        },
        enrolled_at: item.enrollment.enrolled_at,
        status: item.enrollment.status,
        notes: item.enrollment.notes,
      })),
    });
  })
);

/**
 * GET /api/students/my-groups
 * Get all groups the authenticated student is enrolled in
 * Requires: student role
 */
router.get(
  '/students/my-groups',
  requireRole(['student']),
  asyncHandler(async (req: any, res: any) => {
    const studentId = req.user!.userId;

    const groupsData = await GroupsService.getStudentGroups(studentId);

    res.status(200).json({
      success: true,
      groups: groupsData.map((item) => ({
        enrollment: {
          id: item.enrollment.id,
          status: item.enrollment.status,
          enrolled_at: item.enrollment.enrolled_at,
          notes: item.enrollment.notes,
        },
        group: item.group ? {
          id: item.group.id,
          name: item.group.name,
          description: item.group.description,
          max_students: item.group.max_students,
        } : null,
        class: item.class ? {
          id: item.class.id,
          title: item.class.title,
          description: item.class.description,
          thumbnail_url: item.class.thumbnail_url,
        } : null,
      })),
    });
  })
);

export default router;
