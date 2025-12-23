import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { classService, type ClassWithDetails } from '../services/classService';
import { useAuthStore } from '../store/authStore';
import { Layout } from '../components/Layout';
import { TopicsPanel } from '../components/topics/TopicsPanel';
import { GroupsPanel } from '../components/groups/GroupsPanel';
import { ArrowLeft, BookOpen, Users } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'topics' | 'groups';

export const ClassDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [classData, setClassData] = useState<ClassWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('topics');

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isOwner = classData?.teacher_id === user?.id || user?.role === 'admin';

  useEffect(() => {
    if (id) {
      loadClass(id);
    }
  }, [id]);

  const loadClass = async (classId: string) => {
    try {
      setIsLoading(true);
      const data = await classService.getById(classId);
      setClassData(data);
    } catch (error) {
      console.error('Error loading class:', error);
      toast.error('Failed to load class');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading class...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!classData) {
    return null;
  }

  return (
    <Layout>
      <div className="p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        {/* Class Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {classData.title}
                </h1>
                {classData.description && (
                  <p className="text-gray-600 mb-4">{classData.description}</p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {classData.teacher_name && (
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: classData.teacher_color }}
                      >
                        {classData.teacher_name.charAt(0).toUpperCase()}
                      </div>
                      <span>{classData.teacher_name}</span>
                    </div>
                  )}
                  <span>•</span>
                  <span>{classData.slides_count || 0} slides</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Tabs (Only for teachers/admins) */}
        {isTeacher && isOwner && (
          <div className="bg-white rounded-t-lg shadow-sm border border-b-0 border-gray-200">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('topics')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition ${
                  activeTab === 'topics'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                Temas
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition ${
                  activeTab === 'groups'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-5 h-5" />
                Grupos
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 p-8">
          {/* Topics Tab */}
          {activeTab === 'topics' && id && (
            <TopicsPanel classId={id} className={classData.title} />
          )}

          {/* Groups Tab (Teacher only) */}
          {activeTab === 'groups' && isTeacher && isOwner && id && (
            <GroupsPanel classId={id} className={classData.title} />
          )}
        </div>
      </div>
    </Layout>
  );
};
