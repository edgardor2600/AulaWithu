import api from './api';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: number;
  deleted_by_sender: number;
  deleted_by_receiver: number;
}

export interface Conversation {
  user_id: string;
  user_name: string;
  user_avatar_color: string;
  user_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

/**
 * Messages service for client-side messaging
 */
export const messagesService = {
  /**
   * Send a message to another user
   */
  async sendMessage(receiverId: string, message: string): Promise<Message> {
    const response = await api.post<{ success: boolean; message: Message }>(
      '/messages',
      {
        receiver_id: receiverId,
        message,
      }
    );
    return response.data.message;
  },

  /**
   * Get conversation with a specific user
   */
  async getConversation(userId: string, limit: number = 100): Promise<Message[]> {
    const response = await api.get<{ success: boolean; messages: Message[]; count: number }>(
      `/messages/conversation/${userId}`,
      { params: { limit } }
    );
    return response.data.messages;
  },

  /**
   * Get list of all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get<{ success: boolean; conversations: Conversation[]; count: number }>(
      '/messages/conversations'
    );
    return response.data.conversations;
  },

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ success: boolean; unread_count: number }>(
      '/messages/unread-count'
    );
    return response.data.unread_count;
  },

  /**
   * Delete a specific message
   */
  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}`);
  },

  /**
   * Delete entire conversation with a user
   */
  async deleteConversation(userId: string): Promise<void> {
    await api.delete(`/messages/conversation/${userId}`);
  },
};
