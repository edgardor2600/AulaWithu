import { MessagesRepository, UsersRepository } from '../db/repositories';
import { Message } from '../types/database';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError';

/**
 * Service for managing messages between teachers and students
 */
export class MessagesService {
  /**
   * Send a message
   * Validates that sender and receiver have teacher-student relationship
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
    const sender = UsersRepository.getById(senderId);
    const receiver = UsersRepository.getById(receiverId);

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
    const canMessage = MessagesRepository.canMessage(senderId, receiverId);
    if (!canMessage) {
      throw new ForbiddenError(
        'You can only message teachers/students you are assigned to'
      );
    }

    // Send message
    const newMessage = MessagesRepository.send({
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
    const canMessage = MessagesRepository.canMessage(userId, otherUserId);
    if (!canMessage) {
      throw new ForbiddenError('You can only view conversations with assigned teachers/students');
    }

    // Get messages
    const messages = MessagesRepository.getConversation(userId, otherUserId, limit);

    // Mark as read
    MessagesRepository.markConversationAsRead(userId, otherUserId);

    return messages.reverse(); // Return oldest first for chat UI
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return MessagesRepository.getUnreadCount(userId);
  }

  /**
   * Delete message for current user
   */
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = MessagesRepository.getById(messageId);

    if (!message) {
      throw new NotFoundError('Message');
    }

    // User must be sender or receiver
    if (message.sender_id !== userId && message.receiver_id !== userId) {
      throw new ForbiddenError('You can only delete your own messages');
    }

    MessagesRepository.deleteForUser(messageId, userId);
  }

  /**
   * Delete entire conversation
   */
  static async deleteConversation(userId: string, otherUserId: string): Promise<void> {
    // Validate relationship
    const canMessage = MessagesRepository.canMessage(userId, otherUserId);
    if (!canMessage) {
      throw new ForbiddenError('Invalid conversation');
    }

    MessagesRepository.deleteConversation(userId, otherUserId);
  }

  /**
   * Get list of conversations with other users (for inbox view)
   * Returns users that current user has exchanged messages with
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
    const user = UsersRepository.getById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

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

      return {
        user_id: otherUser.id,
        user_name: otherUser.name,
        user_avatar_color: otherUser.avatar_color || '#4F46E5',
        user_role: otherUser.role,
        last_message: lastMessage?.message || '',
        last_message_at: lastMessage?.created_at || '',
        unread_count: unreadCount,
      };
    });

    // Sort by last message date
    return conversations.sort((a, b) => {
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
  }
}
