import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { classService, type Class } from '../services/classService';
import { Layout } from '../components/Layout';
import { ClassModal } from '../components/ClassModal';
import { StudentGroupsView } from '../components/groups/StudentGroupsView';
import { Plus, BookOpen, Edit, Trash2, Eye, Radio, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [searchQuery, setSearchQuery] = useState(''); // ✅ NUEVO: Estado para búsqueda

  const isTeacher = user?.role === 'teacher';

  // Load classes
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setIsLoading(true);
      const data = await classService.getAll();
      
      // Filter by teacher if user is teacher
      const filteredClasses = isTeacher
        ? data.filter((c) => c.teacher_id === user?.id)
        : data;
      
      setClasses(filteredClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ NUEVO: Lógica de filtrado
  const filteredClasses = classes.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(query) || 
      (c.description && c.description.toLowerCase().includes(query))
    );
  });

  const handleCreateClass = () => {
    setModalMode('create');
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleEditClass = (classItem: Class) => {
    setModalMode('edit');
    setEditingClass(classItem);
    setIsModalOpen(true);
  };

  const handleSubmitClass = async (data: { title: string; description: string }) => {
    try {
      if (modalMode === 'create') {
        await classService.create(data);
        toast.success('Class created successfully!');
      } else if (editingClass) {
        await classService.update(editingClass.id, data);
        toast.success('Class updated successfully!');
      }
      
      await loadClasses();
    } catch (error) {
      // Error already handled by axios interceptor
      console.error('Error submitting class:', error);
    }
  };

  const handleDeleteClass = async (classItem: Class) => {
    if (!confirm(`Are you sure you want to delete "${classItem.title}"? This will also delete all slides.`)) {
      return;
    }

    try {
      await classService.delete(classItem.id);
      toast.success('Class deleted successfully');
      await loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const handleViewClass = (classItem: Class) => {
    navigate(`/classes/${classItem.id}`);
  };

  const handleJoinSession = () => {
    navigate('/join');
  };

  return (
    <Layout>
      {/* ✅ NUEVO: Background con gradiente sutil */}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {isTeacher ? 'My Classes' : 'Available Classes'}
              </h1>
              <p className="text-gray-600">
                {isTeacher
                  ? 'Manage your classes and create new lessons'
                  : 'Browse and join available classes'}
              </p>
            </div>

            {/* Join Live Session Button (Student Only) */}
            {!isTeacher && (
              <button
                onClick={handleJoinSession}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Radio className="w-5 h-5" />
                <span>Join Live Session</span>
              </button>
            )}
          </div>

          {/* ✅ Barra de búsqueda mejorada */}
          <div className="mb-6 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl leading-5 bg-white/80 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all sm:text-sm shadow-sm"
              placeholder="Search classes by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Create Button (Teacher Only) - Mejorado */}
          {isTeacher && (
            <div className="mb-6">
              <button
                onClick={handleCreateClass}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Class</span>
              </button>
            </div>
          )}

          {/* Student Groups Section (Student Only) */}
          {!isTeacher && (
            <div className="mb-8">
              <StudentGroupsView />
            </div>
          )}

          {/* Classes Grid - Only show for teachers */}
          {isTeacher && (
            <>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Loading classes...</p>
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-300 shadow-sm">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? 'No classes match your search' : (isTeacher ? 'No classes yet' : 'No classes available')}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery ? 'Try a different search term' : (isTeacher
                      ? 'Create your first class to get started'
                      : 'Check back later for new classes')}
                  </p>
                  {isTeacher && !searchQuery && (
                    <button
                      onClick={handleCreateClass}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-lg hover:shadow-xl"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create Class</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClasses.map((classItem, index) => {
                    // ✅ NUEVO: Gradientes variados para cada card
                    const gradients = [
                      'from-blue-500 to-cyan-600',
                      'from-purple-500 to-pink-600',
                      'from-orange-500 to-red-600',
                      'from-green-500 to-teal-600',
                      'from-indigo-500 to-purple-600',
                      'from-rose-500 to-pink-600',
                    ];
                    const gradient = gradients[index % gradients.length];
                    
                    return (
                      <div
                        key={classItem.id}
                        className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 overflow-hidden transform hover:-translate-y-1"
                      >
                        {/* Thumbnail con gradiente único */}
                        <div className={`h-40 bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-black/5"></div>
                          <BookOpen className="w-16 h-16 text-white opacity-90 relative z-10" />
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                            {classItem.title}
                          </h3>
                          {classItem.description && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                              {classItem.description}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewClass(classItem)}
                              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all text-sm font-semibold shadow-sm"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                            
                            {isTeacher && (
                              <>
                                <button
                                  onClick={() => handleEditClass(classItem)}
                                  className="flex items-center justify-center px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all shadow-sm"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClass(classItem)}
                                  className="flex items-center justify-center px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all shadow-sm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      <ClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitClass}
        initialData={editingClass}
        mode={modalMode}
      />
    </Layout>
  );
};
