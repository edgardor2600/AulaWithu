import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { topicsService, type Topic } from '../../services/topicsService';
import { BookOpen, Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

interface TopicsPanelProps {
  classId: string;
  className: string;
}

export const TopicsPanel = ({ classId, className }: TopicsPanelProps) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicForm, setTopicForm] = useState({
    title: '',
    description: '',
  });

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    loadTopics();
  }, [classId]);

  const loadTopics = async () => {
    setIsLoading(true);
    try {
      const data = await topicsService.getClassTopics(classId);
      setTopics(data);
    } catch (error) {
      toast.error('Error al cargar temas');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTopic(null);
    setTopicForm({ title: '', description: '' });
    setShowModal(true);
  };

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setTopicForm({
      title: topic.title,
      description: topic.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topicForm.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    try {
      if (editingTopic) {
        // Update
        await topicsService.updateTopic(editingTopic.id, {
          title: topicForm.title,
          description: topicForm.description || undefined,
        });
        toast.success('Tema actualizado');
      } else {
        // Create
        await topicsService.createTopic(classId, {
          title: topicForm.title,
          description: topicForm.description || undefined,
        });
        toast.success('Tema creado');
      }
      
      setShowModal(false);
      loadTopics();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar tema');
    }
  };

  const handleDelete = async (topic: Topic) => {
    if (topic.slides_count && topic.slides_count > 0) {
      toast.error('No se puede eliminar un tema con slides. Elimina los slides primero.');
      return;
    }

    if (!confirm(`¿Eliminar el tema "${topic.title}"?`)) {
      return;
    }

    try {
      await topicsService.deleteTopic(topic.id);
      toast.success('Tema eliminado');
      loadTopics();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar tema');
    }
  };

  const handleTopicClick = (topicId: string) => {
    navigate(`/classes/${classId}/topics/${topicId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Temas</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Organiza el contenido de "{className}" en temas
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={handleCreate}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Tema</span>
          </button>
        )}
      </div>

      {/* Topics List */}
      {topics.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700/50">
          <BookOpen className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No hay temas aún
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
            Crea el primer tema para organizar tus slides y contenido.
          </p>
          {isTeacher && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Primer Tema</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800/60 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => handleTopicClick(topic.id)}
            >
              <div className="flex flex-col h-full p-6">
                {/* Topic Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-500/20 group-hover:scale-105 transition-transform">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                        {topic.topic_number}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {topic.title}
                      </h3>
                      {topic.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {topic.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1"></div>

                {/* Topic Stats */}
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center space-x-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                    <BookOpen className="w-4 h-4" />
                    <span>
                      {topic.slides_count || 0} slide{topic.slides_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Actions */}
                  {isTeacher && (
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(topic);
                        }}
                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Editar tema"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(topic);
                        }}
                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Eliminar tema"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-800">
            <form onSubmit={handleSubmit}>
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800/60">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingTopic ? 'Editar Tema' : 'Crear Nuevo Tema'}
                </h3>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Título del Tema *
                  </label>
                  <input
                    type="text"
                    value={topicForm.title}
                    onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="Ej: Presente Simple"
                    maxLength={100}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={topicForm.description}
                    onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                    placeholder="Breve descripción del tema..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 mt-2 flex items-center justify-end space-x-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-sm"
                >
                  {editingTopic ? 'Guardar Cambios' : 'Crear Tema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
