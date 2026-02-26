import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { GraduationCap, Lock, User, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen w-full flex bg-slate-50 font-sans">
      
      {/* ===== Lado Izquierdo: Visual (Oculto en móviles) ===== */}
      <div className="hidden lg:flex w-[45%] bg-slate-900 relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        
        {/* Abstract Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-600/30 blur-[100px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-600/30 blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
        
        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
            <GraduationCap className="w-8 h-8 text-indigo-700" />
          </div>
          <span className="text-3xl font-black text-white tracking-tight">Aula Colaborativa</span>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 max-w-lg mt-auto mb-20 md:pr-10">
          <h2 className="text-[3.5rem] leading-[1.05] font-extrabold text-white mb-8 tracking-tighter">
            Explora, aprende <br/>y crece.
          </h2>
          <p className="text-xl text-slate-300 font-medium leading-relaxed">
            Una plataforma educativa verdaderamente inmersiva para conectar con tu comunidad mediante aprendizaje interactivo.
          </p>
        </div>

        {/* Footer / Badge */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-bold shadow-sm">
            <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </div>
            Plataforma Cloud 2026
          </div>
        </div>
      </div>

      {/* ===== Lado Derecho: Formulario ===== */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative bg-slate-50">
        
        {/* Mobile Logo Only */}
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">Aula Colaborativa</span>
        </div>

        <div className="w-full max-w-md mt-16 lg:mt-0">
          <div className="mb-10">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Bienvenido de vuelta</h1>
            <p className="text-lg text-slate-500 font-medium">
              Ingresa tus credenciales para acceder a tu panel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Usuario</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <User className="h-5 w-5" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. ana.martinez"
                  className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-slate-800 outline-none transition-all placeholder:text-slate-400 font-medium text-base shadow-sm hover:border-slate-300"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Contraseña</label>
                <a href="#" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                  ¿Olvidaste tu clave?
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-slate-800 outline-none transition-all placeholder:text-slate-400 font-medium text-base shadow-sm hover:border-slate-300"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:text-blue-600 transition-colors outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-3 py-4 mt-4 rounded-2xl text-white font-bold text-base transition-all duration-300 ${
                isLoading 
                  ? 'bg-blue-400 cursor-not-allowed opacity-90' 
                  : 'bg-indigo-600 hover:bg-slate-900 shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando acceso...
                </>
              ) : (
                <>
                  Iniciar Sesión Segura
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* ===== Demo Credentials (Grid en 2 columnas estilo premium) ===== */}
          <div className="mt-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">
                Credenciales de Prueba
              </span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Admin', user: 'admin', pass: 'admin123', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
                { label: 'Docente', user: 'prof.garcia', pass: 'password123', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
                { label: 'Estudiante', user: 'ana.martinez', pass: 'password123', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' }
              ].map((c, i) => (
                <div key={i} className={`flex flex-col p-3 rounded-xl border-2 hover:shadow-sm transition-all cursor-default ${c.bg} ${c.border}`}>
                  <span className={`text-[11px] font-black uppercase tracking-wider mb-1 ${c.text}`}>
                    {c.label}
                  </span>
                  <div className="text-[13px] font-mono font-bold text-slate-700">
                    {c.user} <span className="text-slate-400 mx-1">/</span> <span className="text-slate-500 font-normal">{c.pass}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
