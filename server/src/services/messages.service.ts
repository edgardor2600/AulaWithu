<<<<<<< HEAD
import { MessagesRepository, UsersRepository } from '../db/repositories';
import { Message } from '../types/database';
=======
import { 
  MessagesRepository, 
  UsersRepository,
  TeacherStudentsRepository 
} from '../db/repositories';
import { Message, User } from '../types/database';
>>>>>>> f404e31 (temp commit to switch branches)
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError';

/**
 * Service for managing messages between teachers and students
 */
export class MessagesService {
  /**
   * Send a message
<<<<<<< HEAD
   * Validates that sender and receiver have teacher-student relationship
=======
>>>>>>> f404e31 (temp commit to switch branches)
   */
  static async sendMessage(
    senderId: string,
    receiverId: string,
    message: string
  ): Promise<Message> {
    // Validate inputs
    if (!message || message.trim().length === 0) {
      throw new ValidationError('Message cannot be empty');
    }

    if (message.length > 5000) {
      throw new ValidationError('Message is too long (max 5000 characters)');
    }

    if (senderId === receiverId) {
      throw new ValidationError('Cannot send message to yourself');
    }

    // Check both users exist
<<<<<<< HEAD
    const sender = UsersRepository.getById(senderId);
    const receiver = UsersRepository.getById(receiverId);
=======
    const sender = await UsersRepository.getById(senderId);
    const receiver = await UsersRepository.getById(receiverId);
>>>>>>> f404e31 (temp commit to switch branches)

    if (!sender) {
      throw new NotFoundError('Sender');
    }

    if (!receiver) {
      throw new NotFoundError('Receiver');
    }

    // Check both users are active
    if (!sender.active) {
      throw new ForbiddenError('Your account is not active');
    }

    if (!receiver.active) {
      throw new ForbiddenError('Receiver account is not active');
    }

    // Validate teacher-student relationship
<<<<<<< HEAD
    const canMessage = MessagesRepository.canMessage(senderId, receiverId);
=======
    const canMessage = await MessagesRepository.canMessage(senderId, receiverId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!canMessage) {
      throw new ForbiddenError(
        'You can only message teachers/students you are assigned to'
      );
    }

    // Send message
<<<<<<< HEAD
    const newMessage = MessagesRepository.send({
=======
    const newMessage = await MessagesRepository.send({
>>>>>>> f404e31 (temp commit to switch branches)
      sender_id: senderId,
      receiver_id: receiverId,
      message: message.trim(),
    });

    return newMessage;
  }

  /**
   * Get conversation between current user and another user
   */
  static async getConversation(
    userId: string,
    otherUserId: string,
    limit: number = 100
  ): Promise<Message[]> {
    // Validate relationship
<<<<<<< HEAD
    const canMessage = MessagesRepository.canMessage(userId, otherUserId);
=======
    const canMessage = await MessagesRepository.canMessage(userId, otherUserId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!canMessage) {
      throw new ForbiddenError('You can only view conversations with assigned teachers/students');
    }

    // Get messages
<<<<<<< HEAD
    const messages = MessagesRepository.getConversation(userId, otherUserId, limit);

    // Mark as read
    MessagesRepository.markConversationAsRead(userId, otherUserId);
=======
    const messages = await MessagesRepository.getConversation(userId, otherUserId, limit);

    // Mark as read
    await MessagesRepository.markConversationAsRead(userId, otherUserId);
>>>>>>> f404e31 (temp commit to switch branches)

    return messages.reverse(); // Return oldest first for chat UI
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(userId: string): Promise<number> {
<<<<<<< HEAD
    return MessagesRepository.getUnreadCount(userId);
=======
    return await MessagesRepository.getUnreadCount(userId);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Delete message for current user
   */
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
<<<<<<< HEAD
    const message = MessagesRepository.getById(messageId);
=======
    const message = await MessagesRepository.getById(messageId);
>>>>>>> f404e31 (temp commit to switch branches)

    if (!message) {
      throw new NotFoundError('Message');
    }

    // User must be sender or receiver
    if (message.sender_id !== userId && message.receiver_id !== userId) {
      throw new ForbiddenError('You can only delete your own messages');
    }

<<<<<<< HEAD
    MessagesRepository.deleteForUser(messageId, userId);
=======
    await MessagesRepository.deleteForUser(messageId, userId);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Delete entire conversation
   */
  static async deleteConversation(userId: string, otherUserId: string): Promise<void> {
    // Validate relationship
<<<<<<< HEAD
    const canMessage = MessagesRepository.canMessage(userId, otherUserId);
=======
    const canMessage = await MessagesRepository.canMessage(userId, otherUserId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!canMessage) {
      throw new ForbiddenError('Invalid conversation');
    }

<<<<<<< HEAD
    MessagesRepository.deleteConversation(userId, otherUserId);
=======
    await MessagesRepository.deleteConversation(userId, otherUserId);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get list of conversations with other users (for inbox view)
<<<<<<< HEAD
   * Returns users that current user has exchanged messages with
=======
>>>>>>> f404e31 (temp commit to switch branches)
   */
  static async getConversationsList(userId: string): Promise<
    Array<{
      user_id: string;
      user_name: string;
      user_avatar_color: string;
      user_role: string;
      last_message: string;
      last_message_at: string;
      unread_count: number;
    }>
  > {
    // Get all users current user can message
<<<<<<< HEAD
    const user = UsersRepository.getById(userId);
=======
    const user = await UsersRepository.getById(userId);
>>>>>>> f404e31 (temp commit to switch branches)
    if (!user) {
      throw new NotFoundError('User');
    }

<<<<<<< HEAD
    let allowedUsers: Array<{ id: string; name: string; avatar_color: string | null; role: string }> = [];

    if (user.role === 'teacher') {
      // Get assigned students
      const { TeacherStudentsRepository } = require('../db/repositories');
      const assignments = TeacherStudentsRepository.getStudentsByTeacher(userId);
      allowedUsers = assignments
        .map((a: any) => UsersRepository.getById(a.student_id))
        .filter((u: any) => u && u.active);
    } else if (user.role === 'student') {
      // Get assigned teachers
      const { TeacherStudentsRepository } = require('../db/repositories');
      const assignments = TeacherStudentsRepository.getTeachersByStudent(userId);
      allowedUsers = assignments
        .map((a: any) => UsersRepository.getById(a.teacher_id))
        .filter((u: any) => u && u.active);
    }

    // For each allowed user, get last message and unread count
    const conversations = allowedUsers.map((otherUser) => {
      const messages = MessagesRepository.getConversation(userId, otherUser.id, 1);
      const lastMessage = messages[0];
      const unreadCount = MessagesRepository.getUnreadCount(userId);
=======
    let allowedUsers: User[] = [];

    if (user.role === 'teacher') {
      // Get assigned students
      const assignments = await TeacherStudentsRepository.getStudentsByTeacher(userId);
      const userResults = await Promise.all(assignments.map(a => UsersRepository.getById(a.student_id)));
      allowedUsers = userResults.filter((u: User | undefined): u is User => u !== undefined && u.active === 1);
    } else if (user.role === 'student') {
      // Get assigned teachers
      const assignments = await TeacherStudentsRepository.getTeachersByStudent(userId);
      const userResults = await Promise.all(assignments.map(a => UsersRepository.getById(a.teacher_id)));
      allowedUsers = userResults.filter((u: User | undefined): u is User => u !== undefined && u.active === 1);
    }

    // For each allowed user, get last message and unread count
    const conversations = await Promise.all(allowedUsers.map(async (otherUser) => {
      const messages = await MessagesRepository.getConversation(userId, otherUser.id, 1);
      const lastMessage = messages[0];
      const unreadCount = await MessagesRepository.getUnreadCountFromSender(userId, otherUser.id);
>>>>>>> f404e31 (temp commit to switch branches)

      return {
        user_id: otherUser.id,
        user_name: otherUser.name,
        user_avatar_color: otherUser.avatar_color || '#4F46E5',
        user_role: otherUser.role,
        last_message: lastMessage?.message || '',
<<<<<<< HEAD
        last_message_at: lastMessage?.created_at || '',
        unread_count: unreadCount,
      };
    });
=======
        last_message_at: lastMessage?.created_at?.toString() || '',
        unread_count: unreadCount,
      };
    }));
>>>>>>> f404e31 (temp commit to switch branches)

    // Sort by last message date
    return conversations.sort((a, b) => {
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
  }
}
