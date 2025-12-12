import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  avatar_color: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

// Helper to load from localStorage
const loadAuthFromStorage = (): Pick<AuthState, 'user' | 'token' | 'isAuthenticated'> => {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        user: parsed.user || null,
        token: parsed.token || null,
        isAuthenticated: !!parsed.token,
      };
    }
  } catch (error) {
    console.error('Error loading auth from storage:', error);
  }
  return {
    user: null,
    token: null,
    isAuthenticated: false,
  };
};

// Helper to save to localStorage
const saveAuthToStorage = (state: AuthState) => {
  try {
    localStorage.setItem('auth-storage', JSON.stringify({
      user: state.user,
      token: state.token,
    }));
  } catch (error) {
    console.error('Error saving auth to storage:', error);
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  ...loadAuthFromStorage(),

  setAuth: (user, token) => {
    const newState = {
      user,
      token,
      isAuthenticated: true,
    };
    set(newState);
    saveAuthToStorage(newState as AuthState);
  },

  logout: () => {
    const newState = {
      user: null,
      token: null,
      isAuthenticated: false,
    };
    set(newState);
    localStorage.removeItem('auth-storage');
  },

  updateUser: (userData) =>
    set((state) => {
      const newState = {
        ...state,
        user: state.user ? { ...state.user, ...userData } : null,
      };
      saveAuthToStorage(newState);
      return newState;
    }),
}));
