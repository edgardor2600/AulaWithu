import { useState, useEffect } from 'react';
import { adminService, type User, type AcademicLevel } from '../../services/adminService';
import toast from 'react-hot-toast';
import { X, Layers, Loader2 } from 'lucide-react';

interface EditLevelModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditLevelModal = ({ user, onClose, onSuccess }: EditLevelModalProps) => {
  // Usar level?.id primero (viene del JOIN), luego level_id como fallback
  const [selectedLevel, setSelectedLevel] = useState<string>(user.level?.id || user.level_id || '');
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const data = await adminService.getLevels();
      setLevels(data);
    } catch (error) {
      console.error('Error loading levels:', error);
      toast.error('Error al cargar niveles');
    } finally {
      setIsLoadingLevels(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLevel) {
      return toast.error('Debes seleccionar un nivel');
    }

    setIsLoading(true);

    try {
      await adminService.updateUserLevel(user.id, selectedLevel);
      toast.success('✅ Nivel actualizado exitosamente');
      // Cerrar modal y refrescar datos
      onClose();
      // Pequeño delay para asegurar que la BD se actualice
      setTimeout(() => {
        onSuccess();
      }, 100);
    } catch (error: any) {
      console.error('Error updating level:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar nivel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-blue-50/80 dark:bg-slate-800/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shadow-inner">
                <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">Editar Nivel Académico</h2>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{user.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            {/* Current Level Info */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 transition-colors">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Nivel actual:</p>
              <p className="font-semibold text-slate-900 dark:text-slate-200">
                {user.level ? `📚 ${user.level.name}` : '❌ Sin nivel asignado'}
              </p>
            </div>

            {/* Level Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                Nuevo Nivel de Inglés *
              </label>
              <div className="relative group">
                <Layers className="absolute left-3 top-3 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors z-10" />
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-all appearance-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
                  disabled={isLoading || isLoadingLevels}
                  required
                >
                  <option value="" disabled className="text-slate-400 dark:text-slate-500">Selecciona un nivel</option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id} className="font-medium text-slate-800 dark:text-slate-100 dark:bg-slate-800">
                      {level.name} - {level.description}
                    </option>
                  ))}
                </select>
                {isLoadingLevels ? (
                  <div className="absolute right-3 top-3.5">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 dark:text-slate-500" />
                  </div>
                ) : (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500">▼</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-slate-200 dark:border-slate-800 transition-colors">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-bold focus:outline-none"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
              disabled={isLoading || isLoadingLevels || !selectedLevel}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
