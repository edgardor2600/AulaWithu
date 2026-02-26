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
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-950">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <p className="mt-4 text-gray-600 dark:text-slate-400 font-medium">Cargando clase...</p>
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
      <div className="p-4 md:p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 mb-6 transition font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver al Dashboard</span>
        </button>

        {/* Class Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800/60 p-6 md:p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {classData.title}
                </h1>
                {classData.description && (
                  <p className="text-gray-600 dark:text-slate-400 mb-4">{classData.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                  {classData.teacher_name && (
                    <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700/50">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: classData.teacher_color }}
                      >
                        {classData.teacher_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{classData.teacher_name}</span>
                    </div>
                  )}
                  <div className="hidden sm:block text-slate-300 dark:text-slate-600">•</div>
                  <span className="font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-500/20">
                    {classData.slides_count || 0} slides
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Tabs (Only for teachers/admins) */}
        {isTeacher && isOwner && (
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl shadow-sm border border-b-0 border-gray-200 dark:border-slate-800/60 overflow-hidden">
            <div className="flex border-b border-gray-200 dark:border-slate-800/60 flex-wrap">
              <button
                onClick={() => setActiveTab('topics')}
                className={`flex-1 sm:flex-none flex justify-center sm:justify-start items-center gap-2 px-6 py-4 font-bold transition ${
                  activeTab === 'topics'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-500/5'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                Temas
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`flex-1 sm:flex-none flex justify-center sm:justify-start items-center gap-2 px-6 py-4 font-bold transition ${
                  activeTab === 'groups'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-500/5'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-5 h-5" />
                Grupos
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className={`bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-800/60 min-h-[400px] p-6 md:p-8 ${
          (isTeacher && isOwner) ? 'rounded-b-2xl border-t-0' : 'rounded-2xl'
        }`}>
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
