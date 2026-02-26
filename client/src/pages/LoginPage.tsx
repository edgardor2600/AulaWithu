import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { GraduationCap, Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
      
      if (response.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 'h-screen' e 'overflow-hidden' aseguran que NUNCA haya scroll
    <div className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#eef2f6] font-sans">
      
      {/* ===== Fondo Abstracto y Elegante (Mesh Gradient) ===== */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-400/20 blur-[100px] pointer-events-none mix-blend-multiply"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-400/20 blur-[100px] pointer-events-none mix-blend-multiply"></div>
      <div className="absolute top-[20%] right-[30%] w-[30vw] h-[30vw] rounded-full bg-purple-300/20 blur-[80px] pointer-events-none mix-blend-multiply"></div>
      
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>

      {/* ===== Tarjeta Central Flotante (Glassmorphism) ===== */}
      <div className="relative z-10 w-full max-w-[400px] mx-4 p-8 bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
        
        {/* Logo Superior */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Aula Colaborativa</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Ingresa a tu entorno de aprendizaje</p>
        </div>

        {/* Formulario Compacto */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Input Usuario */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
              <User className="h-4.5 w-4.5" />
            </div>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-slate-800 outline-none transition-all placeholder:text-slate-400 font-medium text-sm"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          {/* Input Contraseña */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
              <Lock className="h-4.5 w-4.5" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full pl-10 pr-10 py-3 bg-white/50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-slate-800 outline-none transition-all placeholder:text-slate-400 font-medium text-sm"
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:text-blue-600 transition-colors focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>

          {/* Botón Ingresar */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex items-center justify-center py-3 px-4 mt-2 rounded-xl text-white font-semibold text-sm transition-all duration-300 ${
              isLoading 
                ? 'bg-blue-400 cursor-not-allowed opacity-90' 
                : 'bg-slate-900 hover:bg-slate-800 shadow-md hover:shadow-xl hover:-translate-y-[1px]'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Ingresando...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* ===== Credenciales Demo (Diseño Ultra-Compacto) ===== */}
        <div className="mt-8 pt-5 border-t border-slate-200/60">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-3">
            Credenciales de Prueba
          </p>
          <div className="flex flex-col gap-2">
            
            <div className="flex items-center justify-between px-3 py-1.5 bg-white/60 rounded-lg border border-slate-100 hover:bg-white transition-colors cursor-default">
              <span className="text-[11px] font-semibold text-slate-600 w-16">Admin</span>
              <div className="text-[11px] font-mono text-slate-500">
                admin <span className="text-slate-300 mx-1">/</span> admin123
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 bg-white/60 rounded-lg border border-slate-100 hover:bg-white transition-colors cursor-default">
              <span className="text-[11px] font-semibold text-slate-600 w-16">Profesor</span>
              <div className="text-[11px] font-mono text-slate-500">
                prof.garcia <span className="text-slate-300 mx-1">/</span> password123
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 bg-white/60 rounded-lg border border-slate-100 hover:bg-white transition-colors cursor-default">
              <span className="text-[11px] font-semibold text-slate-600 w-16">Alumno</span>
              <div className="text-[11px] font-mono text-slate-500">
                ana.martinez <span className="text-slate-300 mx-1">/</span> password123
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
