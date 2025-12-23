import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { topicsService, type Topic } from '../../services/topicsService';
import { BookOpen, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

interface TopicsPanelProps {
  classId: string;
  className: string;
}

export const TopicsPanel = ({ classId, className }: TopicsPanelProps) => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicForm, setTopicForm] = useState({
    title: '',
    description: '',
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Temas</h2>
          <p className="text-sm text-gray-500 mt-1">
            Organiza el contenido de "{className}" en temas
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Tema</span>
        </button>
      </div>

      {/* Topics List */}
      {topics.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay temas aún
          </h3>
          <p className="text-gray-600 mb-4">
            Crea el primer tema para organizar tus slides
          </p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primer Tema</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition cursor-pointer"
              onClick={() => handleTopicClick(topic.id)}
            >
              <div className="p-6">
                {/* Topic Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-bold">
                        {topic.topic_number}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {topic.title}
                      </h3>
                      {topic.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {topic.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Topic Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <BookOpen className="w-4 h-4" />
                    <span>
                      {topic.slides_count || 0} slide{topic.slides_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(topic);
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Editar tema"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(topic);
                      }}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar tema"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <form onSubmit={handleSubmit}>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingTopic ? 'Editar Tema' : 'Nuevo Tema'}
                </h3>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={topicForm.title}
                    onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Present Simple"
                    maxLength={100}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={topicForm.description}
                    onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Breve descripción del tema..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingTopic ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
