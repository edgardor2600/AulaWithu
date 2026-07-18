import axios, { AxiosError } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002/api',
  timeout: 60000, // 60 segundos por defecto
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle different error status codes
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;

      // ¿Viene el error del endpoint de login? El LoginPage muestra su propio toast.
      const isLoginEndpoint = error.config?.url?.includes('/auth/login');

      switch (status) {
        case 401:
          if (isLoginEndpoint) {
            // Credenciales incorrectas — el LoginPage muestra el mensaje, no hacer nada aquí
            break;
          }
          // Sesión expirada para rutas protegidas
          toast.error('Sesión expirada. Por favor inicia sesión nuevamente.');
          useAuthStore.getState().logout();
          window.location.href = '/login';
          break;

        case 403:
          toast.error(data?.error?.message || 'Acceso denegado');
          break;

        case 404:
          toast.error(data?.error?.message || 'Recurso no encontrado');
          break;

        case 409:
          toast.error(data?.error?.message || 'Conflicto en el servidor');
          break;

        case 500:
          toast.error('Error del servidor. Intenta nuevamente.');
          break;

        default:
          // No mostrar toast si el componente (ej. LoginPage) ya maneja el error
          if (!isLoginEndpoint) {
            toast.error(data?.error?.message || 'Ocurrió un error');
          }
      }

    } else if (error.request) {
      // Request made but no response
      toast.error('Network error. Please check your connection.');
    } else {
      // Something else happened
      toast.error('An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

export default api;
