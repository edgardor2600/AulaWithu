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
   * @param teacherId - Teacher ID creating the group
   * @returns Created group
   */
  static async createGroup(
    classId: string,
    data: {
      name: string;
      description?: string;
      maxStudents?: number;
    },
    teacherId: string
  ): Promise<Group> {
    // Verify class exists and teacher owns it
<<<<<<< HEAD
    const classObj = ClassesRepository.getById(classId);
=======
    const classObj = await ClassesRepository.getById(classId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }

    if (classObj.teacher_id !== teacherId) {
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
<<<<<<< HEAD
    const existingGroups = GroupsRepository.getByClass(classId);
=======
    const existingGroups = await GroupsRepository.getByClass(classId);
>>>>>>> f404e31 (temp commit to switch branches)
    const duplicate = existingGroups.find(
      (g) => g.name.toLowerCase() === data.name.trim().toLowerCase()
    );

    if (duplicate) {
      throw new ConflictError(`Group "${data.name}" already exists in this class`);
    }

<<<<<<< HEAD
    return GroupsRepository.create({
=======
    return await GroupsRepository.create({
>>>>>>> f404e31 (temp commit to switch branches)
      classId,
      name: data.name.trim(),
      description: data.description?.trim(),
      maxStudents: data.maxStudents,
    });
  }

  /**
   * Get all groups for a class
   * @param classId - Class ID
   * @param userId - User ID requesting (for permission check)
   */
  static async getClassGroups(classId: string, userId: string): Promise<Array<Group & { student_count: number }>> {
    // Verify class exists
<<<<<<< HEAD
    const classObj = ClassesRepository.getById(classId);
=======
    const classObj = await ClassesRepository.getById(classId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }

    // Get user to check permissions
<<<<<<< HEAD
    const user = UsersRepository.getById(userId);
=======
    const user = await UsersRepository.getById(userId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Teachers can only see their own class groups
    // Students can see groups they're enrolled in
    // Admins can see all groups
    if (user.role === 'teacher' && classObj.teacher_id !== userId) {
      throw new ValidationError('You can only view groups for your own classes');
    }

<<<<<<< HEAD
    return GroupsRepository.getByClassWithCount(classId);
=======
    return await GroupsRepository.getByClassWithCount(classId);
>>>>>>> f404e31 (temp commit to switch branches)
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
    },
    teacherId: string
  ): Promise<Group> {
<<<<<<< HEAD
    const group = GroupsRepository.getById(groupId);
=======
    const group = await GroupsRepository.getById(groupId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Verify teacher owns the class
<<<<<<< HEAD
    const classObj = ClassesRepository.getById(group.class_id);
=======
    const classObj = await ClassesRepository.getById(group.class_id);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!classObj || classObj.teacher_id !== teacherId) {
      throw new ValidationError('You can only update groups for your own classes');
    }

    // Validate if changing name
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new ValidationError('Group name cannot be empty');
      }

      // Check for duplicate name
<<<<<<< HEAD
      const existingGroups = GroupsRepository.getByClass(group.class_id);
=======
      const existingGroups = await GroupsRepository.getByClass(group.class_id);
>>>>>>> f404e31 (temp commit to switch branches)
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
<<<<<<< HEAD
      const currentCount = GroupsRepository.getStudentCount(groupId);
=======
      const currentCount = await GroupsRepository.getStudentCount(groupId);
>>>>>>> f404e31 (temp commit to switch branches)
      if (data.maxStudents < currentCount) {
        throw new ValidationError(
          `Cannot set max students to ${data.maxStudents}. Group currently has ${currentCount} students enrolled.`
        );
      }
    }

<<<<<<< HEAD
    const updated = GroupsRepository.update(groupId, {
=======
    const updated = await GroupsRepository.update(groupId, {
>>>>>>> f404e31 (temp commit to switch branches)
      name: data.name?.trim(),
      description: data.description?.trim(),
      maxStudents: data.maxStudents,
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
<<<<<<< HEAD
    const group = GroupsRepository.getById(groupId);
=======
    const group = await GroupsRepository.getById(groupId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Verify teacher owns the class
<<<<<<< HEAD
    const classObj = ClassesRepository.getById(group.class_id);
=======
    const classObj = await ClassesRepository.getById(group.class_id);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!classObj || classObj.teacher_id !== teacherId) {
      throw new ValidationError('You can only delete groups for your own classes');
    }

    // Check if group has enrollments
<<<<<<< HEAD
    const studentCount = GroupsRepository.getStudentCount(groupId);
=======
    const studentCount = await GroupsRepository.getStudentCount(groupId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (studentCount > 0) {
      throw new ValidationError(
        `Cannot delete group with ${studentCount} enrolled students. Unenroll students first or deactivate the group.`
      );
    }

<<<<<<< HEAD
    return GroupsRepository.delete(groupId);
=======
    return await GroupsRepository.delete(groupId);
>>>>>>> f404e31 (temp commit to switch branches)
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
<<<<<<< HEAD
    const group = GroupsRepository.getById(groupId);
=======
    const group = await GroupsRepository.getById(groupId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    if (!group.active) {
      throw new ValidationError('Cannot enroll students in an inactive group');
    }

    // Verify student exists and has student role
<<<<<<< HEAD
    const student = UsersRepository.getById(studentId);
=======
    const student = await UsersRepository.getById(studentId);
>>>>>>> f404e31 (temp commit to switch branches)
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
<<<<<<< HEAD
    const enrollingUser = UsersRepository.getById(enrolledBy);
=======
    const enrollingUser = await UsersRepository.getById(enrolledBy);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!enrollingUser) {
      throw new NotFoundError('Enrolling user not found');
    }

<<<<<<< HEAD
    const classObj = ClassesRepository.getById(group.class_id);
=======
    const classObj = await ClassesRepository.getById(group.class_id);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }

    // Only teacher of the class or admin can enroll
    if (enrollingUser.role !== 'admin' && classObj.teacher_id !== enrolledBy) {
      throw new ValidationError('Only the class teacher or admin can enroll students');
    }

    // Check if already enrolled
<<<<<<< HEAD
    if (EnrollmentsRepository.isEnrolled(groupId, studentId)) {
=======
    if (await EnrollmentsRepository.isEnrolled(groupId, studentId)) {
>>>>>>> f404e31 (temp commit to switch branches)
      throw new ConflictError('Student is already enrolled in this group');
    }

    // Check if group is full
<<<<<<< HEAD
    if (GroupsRepository.isFull(groupId)) {
      throw new ValidationError('Group is full. Cannot enroll more students.');
    }

    return EnrollmentsRepository.enroll({
=======
    if (await GroupsRepository.isFull(groupId)) {
      throw new ValidationError('Group is full. Cannot enroll more students.');
    }

    return await EnrollmentsRepository.enroll({
>>>>>>> f404e31 (temp commit to switch branches)
      groupId,
      studentId,
      enrolledBy,
      notes,
    });
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
<<<<<<< HEAD
    const group = GroupsRepository.getById(groupId);
=======
    const group = await GroupsRepository.getById(groupId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Verify enrollment exists
<<<<<<< HEAD
    if (!EnrollmentsRepository.isEnrolled(groupId, studentId)) {
=======
    if (!await EnrollmentsRepository.isEnrolled(groupId, studentId)) {
>>>>>>> f404e31 (temp commit to switch branches)
      throw new NotFoundError('Student is not enrolled in this group');
    }

    // Verify user has permission
<<<<<<< HEAD
    const user = UsersRepository.getById(userId);
=======
    const user = await UsersRepository.getById(userId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!user) {
      throw new NotFoundError('User not found');
    }

<<<<<<< HEAD
    const classObj = ClassesRepository.getById(group.class_id);
=======
    const classObj = await ClassesRepository.getById(group.class_id);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }

    // Only teacher of the class or admin can unenroll
    if (user.role !== 'admin' && classObj.teacher_id !== userId) {
      throw new ValidationError('Only the class teacher or admin can unenroll students');
    }

<<<<<<< HEAD
    return EnrollmentsRepository.unenroll(groupId, studentId);
=======
    return await EnrollmentsRepository.unenroll(groupId, studentId);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get students enrolled in a group
   * @param groupId - Group ID
   * @param userId - User ID requesting (for permission check)
   */
  static async getGroupStudents(groupId: string, userId: string) {
    // Verify group exists
<<<<<<< HEAD
    const group = GroupsRepository.getById(groupId);
=======
    const group = await GroupsRepository.getById(groupId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Verify user has permission
<<<<<<< HEAD
    const user = UsersRepository.getById(userId);
=======
    const user = await UsersRepository.getById(userId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!user) {
      throw new NotFoundError('User not found');
    }

<<<<<<< HEAD
    const classObj = ClassesRepository.getById(group.class_id);
=======
    const classObj = await ClassesRepository.getById(group.class_id);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }

    // Teacher must own the class, admin can view all, students can view their own groups
    if (user.role === 'teacher' && classObj.teacher_id !== userId) {
      throw new ValidationError('You can only view students in your own class groups');
    }

    if (user.role === 'student') {
      // Students can only view if they're enrolled
<<<<<<< HEAD
      if (!EnrollmentsRepository.isEnrolled(groupId, userId)) {
=======
      if (!await EnrollmentsRepository.isEnrolled(groupId, userId)) {
>>>>>>> f404e31 (temp commit to switch branches)
        throw new ValidationError('You can only view groups you are enrolled in');
      }
    }

<<<<<<< HEAD
    return EnrollmentsRepository.getStudentsWithInfo(groupId);
=======
    return await EnrollmentsRepository.getStudentsWithInfo(groupId);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get all groups a student is enrolled in
   * @param studentId - Student user ID
   */
  static async getStudentGroups(studentId: string) {
    // Verify student exists
<<<<<<< HEAD
    const student = UsersRepository.getById(studentId);
=======
    const student = await UsersRepository.getById(studentId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    if (student.role !== 'student') {
      throw new ValidationError('Only students have group enrollments');
    }

    // Get enrollments with group and class info
<<<<<<< HEAD
    const enrollments = EnrollmentsRepository.getByStudent(studentId);
    
    return enrollments.map((enrollment) => {
      const group = GroupsRepository.getById(enrollment.group_id);
      const classObj = group ? ClassesRepository.getById(group.class_id) : null;
=======
    const enrollments = await EnrollmentsRepository.getByStudent(studentId);
    
    const results = await Promise.all(enrollments.map(async (enrollment) => {
      const group = await GroupsRepository.getById(enrollment.group_id);
      const classObj = group ? await ClassesRepository.getById(group.class_id) : null;
>>>>>>> f404e31 (temp commit to switch branches)

      return {
        enrollment,
        group,
        class: classObj,
      };
<<<<<<< HEAD
    }).filter((item) => item.group && item.class); // Filter out any null groups/classes
=======
    }));

    return results.filter((item) => item.group && item.class);
>>>>>>> f404e31 (temp commit to switch branches)
  }
}
