import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { classService, type ClassWithDetails } from '../services/classService';
import { Layout } from '../components/Layout';
import { ArrowLeft, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export const ClassDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classData, setClassData] = useState<ClassWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          <div className="flex items-start space-x-4">
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

        {/* Slides Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Slides</h2>
          
          {classData.slides && classData.slides.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classData.slides.map((slide: any, index: number) => (
                <div
                  key={slide.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                >
                  <div className="aspect-video bg-gray-100 rounded mb-3 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-300">
                      {slide.slide_number || index + 1}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900">
                    {slide.title || `Slide ${slide.slide_number || index + 1}`}
                  </h3>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No slides yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Slides will appear here once created
              </p>
            </div>
          )}
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-blue-800 font-medium">
            📝 Slide editor coming in Block 4C!
          </p>
        </div>
      </div>
    </Layout>
  );
};
