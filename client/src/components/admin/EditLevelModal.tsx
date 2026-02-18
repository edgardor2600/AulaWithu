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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Layers className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900">Editar Nivel Académico</h2>
                <p className="text-xs text-gray-600">{user.name}</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Current Level Info */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Nivel actual:</p>
              <p className="font-semibold text-gray-900">
                {user.level ? `📚 ${user.level.name}` : '❌ Sin nivel asignado'}
              </p>
            </div>

            {/* Level Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuevo Nivel de Inglés *
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition appearance-none bg-white"
                  disabled={isLoading || isLoadingLevels}
                  required
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
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
