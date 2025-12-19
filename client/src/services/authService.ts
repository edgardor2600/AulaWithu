import api from './api';

// ============================================
// TYPES
// ============================================

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: 'admin' | 'teacher' | 'student';
    avatar_color: string;
    created_at: string;
    last_login?: string;
    active?: boolean;
  };
}

export interface CreateUserData {
  name: string;
  username: string;
  password: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

// ============================================
// AUTH SERVICE
// ============================================

export const authService = {
  /**
   * Login with username and password
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Get current authenticated user
   */
  async getMe(): Promise<AuthResponse['user']> {
    const response = await api.get<{ success: boolean; user: AuthResponse['user'] }>('/auth/me');
    return response.data.user;
  },

  /**
   * Change password for current user
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    await api.post('/auth/change-password', data);
  },

  // ============================================
  // LEGACY METHOD (kept for backward compatibility)
  // ============================================
  
  /**
   * @deprecated Use login() instead
   */
  async join(data: { name: string; role: 'teacher' | 'student' }): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/join', data);
    return response.data;
  },
};
