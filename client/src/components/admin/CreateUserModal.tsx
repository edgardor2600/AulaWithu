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
  const color = type === 'teacher' ? 'purple' : 'green';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-4 border-b border-gray-200 bg-${color}-50 flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center`}>
                <GraduationCap className={`w-6 h-6 text-${color}-600`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold text-${color}-900`}>{title}</h2>
                <p className="text-xs text-gray-600">Completa los datos requeridos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Form Body - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nombre Completo *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="Ej: Juan Pérez García"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Usuario *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="Ej: juanperez"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo 3 caracteres, sin espacios</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="Mínimo 6 caracteres"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
            </div>

            {/* Level Selection - Only for students */}
            {type === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nivel de Inglés *
                </label>
                <div className="relative">
                  <Layers className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.levelId}
                    onChange={(e) => setFormData({ ...formData, levelId: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition appearance-none bg-white"
                    disabled={isLoading || isLoadingLevels}
                  >
                    <option value="">Selecciona un nivel</option>
                    {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name} - {level.description}
                      </option>
                    ))}
                  </select>
                  {isLoadingLevels && (
                    <div className="absolute right-3 top-3.5">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Podrás asignar al estudiante a un grupo desde la sección "Gestión de Grupos"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-2.5 p-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={() => handleSubmit()}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition flex items-center justify-center gap-2 ${
              type === 'teacher' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <GraduationCap className="w-5 h-5" />
                {type === 'teacher' ? 'Crear Profesor' : 'Crear Estudiante'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
