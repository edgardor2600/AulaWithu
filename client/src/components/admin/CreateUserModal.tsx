import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';
import { X, User, Lock, Loader2, GraduationCap, Layers } from 'lucide-react';
import { type AcademicLevel } from '../../services/adminService';

interface CreateUserModalProps {
  type: 'teacher' | 'student';
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateUserModal = ({ type, onClose, onSuccess }: CreateUserModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    levelId: '', // Solo para estudiantes
  });
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load levels for students
  useEffect(() => {
    if (type === 'student') {
      loadLevels();
    }
  }, [type]);

  const loadLevels = async () => {
    setIsLoadingLevels(true);
    try {
      const data = await adminService.getLevels();
      setLevels(data);
    } catch (error) {
      toast.error('Error al cargar niveles de inglés');
    } finally {
      setIsLoadingLevels(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validaciones
    if (!formData.name.trim()) return toast.error('El nombre completo es requerido');
    if (!formData.username.trim() || formData.username.length < 3) return toast.error('El usuario debe tener al menos 3 caracteres');
    if (!formData.password || formData.password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres');
    
    if (type === 'student' && !formData.levelId) {
      return toast.error('Debes seleccionar el nivel de inglés del estudiante');
    }

    setIsLoading(true);

    try {
      if (type === 'teacher') {
        await adminService.createTeacher(formData);
        toast.success('✅ Profesor creado exitosamente');
      } else {
        await adminService.createStudent({
          name: formData.name,
          username: formData.username,
          password: formData.password,
          levelId: formData.levelId || undefined,
        });
        
        toast.success(
          `✅ Estudiante creado exitosamente`,
          { duration: 4000 }
        );
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Error al crear usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const title = type === 'teacher' ? 'Crear Profesor' : 'Crear Estudiante';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] max-w-md w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header Visual */}
        <div className={`relative p-6 ${type === 'teacher' ? 'bg-violet-600' : 'bg-emerald-600'} flex-shrink-0 overflow-hidden`}>
          {/* Abstract background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-full blur-xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/30">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
                <p className="text-sm text-white/80 font-medium">Configuración inicial del perfil</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 disabled:opacity-50 group hover:rotate-90"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form Body - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Nombre Completo *
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm font-medium text-slate-800 placeholder-slate-400 hover:border-slate-300"
                  placeholder="Ej: Juan Pérez García"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Usuario *
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm font-medium text-slate-800 placeholder-slate-400 hover:border-slate-300"
                  placeholder="Ej: juanperez"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1.5 flex items-center gap-1">
                 <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                 Mínimo 3 caracteres, sin espacios
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Contraseña de acceso *
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm font-medium text-slate-800 placeholder-slate-400 hover:border-slate-300"
                  placeholder="Genera una clave"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1.5 flex items-center gap-1">
                 <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                 Mínimo 6 caracteres
              </p>
            </div>

            {/* Level Selection - Only for students */}
            {type === 'student' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nivel Académico Inicial *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Layers className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                  </div>
                  <select
                    value={formData.levelId}
                    onChange={(e) => setFormData({ ...formData, levelId: e.target.value })}
                    className="w-full pl-11 pr-10 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none transition-all duration-200 shadow-sm font-medium text-slate-800 appearance-none hover:border-slate-300"
                    disabled={isLoading || isLoadingLevels}
                  >
                    <option value="" disabled className="text-slate-400">Selecciona el nivel de inglés base</option>
                    {levels.map((level) => (
                      <option key={level.id} value={level.id} className="font-medium text-slate-800">
                        {level.name} - {level.description}
                      </option>
                    ))}
                  </select>
                  {isLoadingLevels ? (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <span className="text-xs font-black text-slate-400">▼</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs font-medium text-blue-800 leading-relaxed">
                      Este nivel define el plan de estudios del estudiante. Más adelante deberás asignarlo a un grupo desde la "Gestión de Grupos".
                    </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-5 bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-1/3 px-4 py-3.5 rounded-xl font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={() => handleSubmit()}
            disabled={isLoading}
            className={`w-full sm:w-2/3 px-4 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              type === 'teacher' 
                ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-200 focus:ring-violet-500' 
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 focus:ring-emerald-500'
            } disabled:opacity-50 disabled:hover:translate-y-0`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Registrando cuenta...</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-5 h-5" />
                <span>{type === 'teacher' ? 'Registrar Profesor' : 'Registrar Estudiante'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
