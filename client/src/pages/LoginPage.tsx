import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { GraduationCap, Lock, User } from 'lucide-react';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Por favor ingresa tu usuario');
      return;
    }

    if (!password) {
      toast.error('Por favor ingresa tu contraseña');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login({ username: username.trim(), password });
      
      setAuth(response.user, response.token);
      
      toast.success(`¡Bienvenido, ${response.user.name}!`);
      
      // Redirigir según el rol
      if (response.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      // El error ya se maneja en el interceptor de axios
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aula Colaborativa</h1>
          <p className="text-gray-600">Academia de Inglés</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tu.usuario"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition bg-blue-600 hover:bg-blue-700 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm text-gray-500">
              Ingresa con las credenciales proporcionadas por la academia
            </p>
            
            {/* Demo Credentials (Remove in production) */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-medium text-blue-900 mb-2">Credenciales de prueba:</p>
              <div className="space-y-1 text-xs text-blue-700">
                <p>👤 Admin: <span className="font-mono">admin</span> / <span className="font-mono">admin123</span></p>
                <p>👨‍🏫 Profesor: <span className="font-mono">prof.garcia</span> / <span className="font-mono">password123</span></p>
                <p>👨‍🎓 Estudiante: <span className="font-mono">ana.martinez</span> / <span className="font-mono">password123</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
