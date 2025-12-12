import api from './api';

export interface LoginData {
  name: string;
  role: 'teacher' | 'student';
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    role: 'teacher' | 'student';
    avatar_color: string;
    created_at: string;
  };
}

export const authService = {
  // Join (login or register)
  async join(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/join', data);
    return response.data;
  },

  // Get current user
  async getMe(): Promise<AuthResponse['user']> {
    const response = await api.get<{ success: boolean; user: AuthResponse['user'] }>('/auth/me');
    return response.data.user;
  },
};
