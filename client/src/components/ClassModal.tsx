import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { classService, type Class } from '../services/classService';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; levelId?: string }) => Promise<void>;
  initialData?: Class | null;
  mode: 'create' | 'edit';
}

export const ClassModal = ({ isOpen, onClose, onSubmit, initialData, mode }: ClassModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [levelId, setLevelId] = useState('');
  const [levels, setLevels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setLevelId(initialData.level_id || '');
    } else {
      setTitle('');
      setDescription('');
      setLevelId('');
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadLevels();
    }
  }, [isOpen]);

  const loadLevels = async () => {
    setIsLoadingLevels(true);
    try {
      const data = await classService.getLevels();
      setLevels(data);
    } catch (error) {
      console.error('Error loading levels:', error);
    } finally {
      setIsLoadingLevels(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        levelId: levelId || undefined,
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-black/60 max-w-md w-full border border-slate-200 dark:border-slate-800 transition-colors">
        {/* Header no arrastable */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20 rounded-t-2xl transition-colors">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">
            {mode === 'create' ? 'Crear Nueva Clase' : 'Editar Clase'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
              Título de la Clase *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Inglés Nivel A1 - Unidad 1"
              className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors shadow-sm"
              disabled={isLoading}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción de la clase..."
              rows={4}
              className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors resize-none shadow-sm"
              disabled={isLoading}
            />
          </div>

          {/* Academic Level */}
          <div>
            <label htmlFor="level" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
              Nivel Académico (Opcional)
            </label>
            <div className="relative">
              <select
                id="level"
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-colors appearance-none shadow-sm"
                disabled={isLoading || isLoadingLevels}
              >
                <option value="" className="text-slate-500">-- Sin Nivel Asignado --</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-5 border-t border-slate-100 dark:border-slate-800/80 mt-6 transition-colors">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold shadow-sm"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:-translate-y-0.5 font-bold flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></div>
              )}
              {isLoading ? 'Guardando...' : (mode === 'create' ? 'Crear Clase' : 'Guardar Cambios')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
