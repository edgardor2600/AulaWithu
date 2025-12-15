import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { classService, type Class } from '../services/classService';
import { Layout } from '../components/Layout';
import { ClassModal } from '../components/ClassModal';
import { Plus, BookOpen, Edit, Trash2, Eye, Radio } from 'lucide-react';
import toast from 'react-hot-toast';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

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
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
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
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-lg hover:shadow-xl"
            >
              <Radio className="w-5 h-5" />
              <span>Join Live Session</span>
            </button>
          )}
        </div>

        {/* Create Button (Teacher Only) */}
        {isTeacher && (
          <div className="mb-6">
            <button
              onClick={handleCreateClass}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Class</span>
            </button>
          </div>
        )}

        {/* Classes Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isTeacher ? 'No classes yet' : 'No classes available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {isTeacher
                ? 'Create your first class to get started'
                : 'Check back later for new classes'}
            </p>
            {isTeacher && (
              <button
                onClick={handleCreateClass}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Create Class</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => (
              <div
                key={classItem.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition border border-gray-200 overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-white opacity-80" />
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
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
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    
                    {isTeacher && (
                      <>
                        <button
                          onClick={() => handleEditClass(classItem)}
                          className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(classItem)}
                          className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
