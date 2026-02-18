import { GroupsRepository, EnrollmentsRepository, ClassesRepository, UsersRepository } from '../db/repositories';
import { Group, Enrollment } from '../types/database';
import { ValidationError, ConflictError, NotFoundError } from '../utils/AppError';

/**
 * Groups Service
 * Handles business logic for class groups and student enrollments
 */
export class GroupsService {
  /**
   * Create a new group for a class
   * @param classId - Class ID
   * @param data - Group data
   * @param userId - User ID creating the group (teacher or admin)
   * @param userRole - User role (teacher or admin)
   * @returns Created group
   */
  static async createGroup(
    classId: string,
    data: {
      name: string;
      description?: string;
      maxStudents?: number;
      scheduleTime?: string;
    },
    userId: string,
    userRole: string
  ): Promise<Group> {
    // Verify class exists
    const classObj = await ClassesRepository.getById(classId);
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }

    // Verify ownership: teachers can only create for their own classes, admins can create for any class
    if (userRole === 'teacher' && classObj.teacher_id !== userId) {
      throw new ValidationError('You can only create groups for your own classes');
    }

    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Group name is required');
    }

    if (data.name.trim().length > 100) {
      throw new ValidationError('Group name must be less than 100 characters');
    }

    // Validate max students
    if (data.maxStudents !== undefined) {
      if (data.maxStudents < 1 || data.maxStudents > 100) {
        throw new ValidationError('Max students must be between 1 and 100');
      }
    }

    // Check for duplicate group name in the same class
    const existingGroups = await GroupsRepository.getByClass(classId);
    const duplicate = existingGroups.find(
      (g) => g.name.toLowerCase() === data.name.trim().toLowerCase()
    );

    if (duplicate) {
      throw new ConflictError(`Group "${data.name}" already exists in this class`);
    }

    // Validate schedule time format if provided
    if (data.scheduleTime) {
      const validTimeSlots = [
        '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
        '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00',
        '18:00-19:00', '19:00-20:00', '20:00-21:00', '21:00-22:00'
      ];
      
      if (!validTimeSlots.includes(data.scheduleTime)) {
        throw new ValidationError('Invalid schedule time. Must be one of: ' + validTimeSlots.join(', '));
      }
    }

    return await GroupsRepository.create({
      classId,
      name: data.name.trim(),
      description: data.description?.trim(),
      maxStudents: data.maxStudents,
      scheduleTime: data.scheduleTime,
    });
  }

  /**
   * Get all groups for a class
   * @param classId - Class ID
   * @param userId - User ID requesting (for permission check)
   */
  static async getClassGroups(classId: string, userId: string): Promise<Array<Group & { student_count: number }>> {
    // Verify class exists
    const classObj = await ClassesRepository.getById(classId);
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }

    // Get user to check permissions
    const user = await UsersRepository.getById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Teachers can only see their own class groups
    // Students can see groups they're enrolled in
    // Admins can see all groups
    if (user.role === 'teacher' && classObj.teacher_id !== userId) {
      throw new ValidationError('You can only view groups for your own classes');
    }

    return await GroupsRepository.getByClassWithCount(classId);
  }

  /**
   * Update a group
   * @param groupId - Group ID
   * @param data - Update data
   * @param teacherId - Teacher ID updating the group
   */
  static async updateGroup(
    groupId: string,
    data: {
      name?: string;
      description?: string;
      maxStudents?: number;
      scheduleTime?: string;
    },
    teacherId: string
  ): Promise<Group> {
    const group = await GroupsRepository.getById(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Verify teacher owns the class
    const classObj = await ClassesRepository.getById(group.class_id);
    if (!classObj || classObj.teacher_id !== teacherId) {
      throw new ValidationError('You can only update groups for your own classes');
    }

    // Validate if changing name
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new ValidationError('Group name cannot be empty');
      }

      // Check for duplicate name
      const existingGroups = await GroupsRepository.getByClass(group.class_id);
      const duplicate = existingGroups.find(
        (g) => g.id !== groupId && g.name.toLowerCase() === data.name!.trim().toLowerCase()
      );

      if (duplicate) {
        throw new ConflictError(`Group "${data.name}" already exists in this class`);
      }
    }

    // Validate max students if changing
    if (data.maxStudents !== undefined) {
      if (data.maxStudents < 1 || data.maxStudents > 100) {
        throw new ValidationError('Max students must be between 1 and 100');
      }

      // Check if new max is less than current enrollment count
      const currentCount = await GroupsRepository.getStudentCount(groupId);
      if (data.maxStudents < currentCount) {
        throw new ValidationError(
          `Cannot set max students to ${data.maxStudents}. Group currently has ${currentCount} students enrolled.`
        );
      }
    }

    // Validate schedule time format if provided
    if (data.scheduleTime !== undefined) {
      const validTimeSlots = [
        '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
        '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00',
        '18:00-19:00', '19:00-20:00', '20:00-21:00', '21:00-22:00'
      ];
      
      if (data.scheduleTime && !validTimeSlots.includes(data.scheduleTime)) {
        throw new ValidationError('Invalid schedule time. Must be one of: ' + validTimeSlots.join(', '));
      }
    }

    const updated = await GroupsRepository.update(groupId, {
      name: data.name?.trim(),
      description: data.description?.trim(),
      maxStudents: data.maxStudents,
      scheduleTime: data.scheduleTime,
    });

    if (!updated) {
      throw new NotFoundError('Group not found after update');
    }

    return updated;
  }

  /**
   * Delete a group
   * @param groupId - Group ID
   * @param teacherId - Teacher ID deleting the group
   */
  static async deleteGroup(groupId: string, teacherId: string): Promise<boolean> {
    const group = await GroupsRepository.getById(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Verify teacher owns the class
    const classObj = await ClassesRepository.getById(group.class_id);
    if (!classObj || classObj.teacher_id !== teacherId) {
      throw new ValidationError('You can only delete groups for your own classes');
    }

    // Check if group has enrollments
    const studentCount = await GroupsRepository.getStudentCount(groupId);
    if (studentCount > 0) {
      throw new ValidationError(
        `Cannot delete group with ${studentCount} enrolled students. Unenroll students first or deactivate the group.`
      );
    }

    return await GroupsRepository.delete(groupId);
  }

  /**
   * Enroll a student in a group
   * @param groupId - Group ID
   * @param studentId - Student user ID
   * @param enrolledBy - User ID enrolling the student (teacher or admin)
   */
  static async enrollStudent(
    groupId: string,
    studentId: string,
    enrolledBy: string,
    notes?: string
  ): Promise<Enrollment> {
    // Verify group exists
    const group = await GroupsRepository.getById(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    if (!group.active) {
      throw new ValidationError('Cannot enroll students in an inactive group');
    }

    // Verify student exists and has student role
    const student = await UsersRepository.getById(studentId);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    if (student.role !== 'student') {
      throw new ValidationError('Only students can be enrolled in groups');
    }

    if (!student.active) {
      throw new ValidationError('Cannot enroll inactive students');
    }

    // Verify enrolling user has permission
    const enrollingUser = await UsersRepository.getById(enrolledBy);
    if (!enrollingUser) {
      throw new NotFoundError('Enrolling user not found');
    }

    const classObj = await ClassesRepository.getById(group.class_id);
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }

    // Only teacher of the class or admin can enroll
    if (enrollingUser.role !== 'admin' && classObj.teacher_id !== enrolledBy) {
      throw new ValidationError('Only the class teacher or admin can enroll students');
    }

    // Check if already enrolled
    if (await EnrollmentsRepository.isEnrolled(groupId, studentId)) {
      throw new ConflictError('Student is already enrolled in this group');
    }

    // --- NEW: Level Validation ---
    if (classObj.level_id && student.level_id) {
      if (classObj.level_id !== student.level_id) {
        console.warn(`⚠️ Student level (${student.level_id}) does not match class level (${classObj.level_id})`);
        // We allow it but could block it if requested. For now, just logging or we could pass a flag.
      }
    }

    // Check if group is full
    if (await GroupsRepository.isFull(groupId)) {
      throw new ValidationError('Group is full. Cannot enroll more students.');
    }

    const enrollment = await EnrollmentsRepository.enroll({
      groupId,
      studentId,
      enrolledBy,
      notes,
    });

    return enrollment;
  }

  /**
   * Unenroll a student from a group
   * @param groupId - Group ID
   * @param studentId - Student user ID
   * @param userId - User ID performing the action
   */
  static async unenrollStudent(
    groupId: string,
    studentId: string,
    userId: string
  ): Promise<boolean> {
    // Verify group exists
    const group = await GroupsRepository.getById(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Verify enrollment exists
    if (!await EnrollmentsRepository.isEnrolled(groupId, studentId)) {
      throw new NotFoundError('Student is not enrolled in this group');
    }

    // Verify user has permission
    const user = await UsersRepository.getById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const classObj = await ClassesRepository.getById(group.class_id);
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }

    // Only teacher of the class or admin can unenroll
    if (user.role !== 'admin' && classObj.teacher_id !== userId) {
      throw new ValidationError('Only the class teacher or admin can unenroll students');
    }

    return await EnrollmentsRepository.unenroll(groupId, studentId);
  }

  /**
   * Get students enrolled in a group
   * @param groupId - Group ID
   * @param userId - User ID requesting (for permission check)
   */
  static async getGroupStudents(groupId: string, userId: string) {
    // Verify group exists
    const group = await GroupsRepository.getById(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Verify user has permission
    const user = await UsersRepository.getById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const classObj = await ClassesRepository.getById(group.class_id);
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }

    // Teacher must own the class, admin can view all, students can view their own groups
    if (user.role === 'teacher' && classObj.teacher_id !== userId) {
      throw new ValidationError('You can only view students in your own class groups');
    }

    if (user.role === 'student') {
      // Students can only view if they're enrolled
      if (!await EnrollmentsRepository.isEnrolled(groupId, userId)) {
        throw new ValidationError('You can only view groups you are enrolled in');
      }
    }

    return await EnrollmentsRepository.getStudentsWithInfo(groupId);
  }

  /**
   * Get all groups a student is enrolled in
   * @param studentId - Student user ID
   */
  static async getStudentGroups(studentId: string) {
    // Verify student exists
    const student = await UsersRepository.getById(studentId);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    if (student.role !== 'student') {
      throw new ValidationError('Only students have group enrollments');
    }

    // Get enrollments with group and class info
    const enrollments = await EnrollmentsRepository.getByStudent(studentId);
    
    const results = await Promise.all(enrollments.map(async (enrollment) => {
      const group = await GroupsRepository.getById(enrollment.group_id);
      const classObj = group ? await ClassesRepository.getById(group.class_id) : null;

      return {
        enrollment,
        group,
        class: classObj,
      };
    }));

    return results.filter((item) => item.group && item.class);
  }
}
