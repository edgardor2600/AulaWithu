import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicsService, type Topic } from '../services/topicsService';
import { slideService, type Slide } from '../services/slideService';
import { Layout } from '../components/Layout';
import { SlideThumbnail } from '../components/SlideThumbnail';
import { ArrowLeft, Plus, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export const TopicDetailPage = () => {
  const { classId, topicId } = useParams<{ classId: string; topicId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [topic, setTopic] = useState<Topic | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (topicId) {
      loadTopicAndSlides();
    }
  }, [topicId]);

  const loadTopicAndSlides = async () => {
    if (!topicId) return;
    
    setIsLoading(true);
    try {
      const topicData = await topicsService.getTopic(topicId);
      setTopic(topicData);

      // Load slides for this topic
      const topicSlides = await topicsService.getTopicSlides(topicId);
      setSlides(topicSlides);
    } catch (error) {
      console.error('Error loading topic:', error);
      toast.error('Error al cargar el tema');
      navigate(`/classes/${classId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSlide = async () => {
    if (!topicId || !classId || !topic) return;

    try {
      const newSlide = await slideService.create(classId, {
        title: `Slide ${topic.slides_count ? topic.slides_count + 1 : 1}`,
        topic_id: topicId,
      });
      
      toast.success('Slide creado');
      // Navigate to editor with topicId to filter slides
      navigate(`/classes/${classId}/edit?topicId=${topicId}&slideId=${newSlide.id}`);
    } catch (error: any) {
      console.error('Error creating slide:', error);
      toast.error(error.response?.data?.message || 'Error al crear slide');
    }
  };

  const handleSlideClick = (slideId: string) => {
    if (isStudent) {
      navigate(`/classes/${classId}/view?topicId=${topicId}&slideId=${slideId}`);
    } else {
      navigate(`/classes/${classId}/edit?topicId=${topicId}&slideId=${slideId}`);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Cargando tema...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!topic) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/classes/${classId}`)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver a Temas</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">
                    {topic.topic_number}
                  </span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {topic.title}
                  </h1>
                  {topic.description && (
                    <p className="text-gray-600 mt-1">{topic.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {slides.length} slide{slides.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {!isStudent && (
              <button
                onClick={handleCreateSlide}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Slide</span>
              </button>
            )}
          </div>
        </div>

        {/* Slides Grid */}
        {slides.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay slides en este tema
            </h3>
            <p className="text-gray-600 mb-4">
              {isStudent
                ? 'El profesor aún no ha agregado contenido'
                : 'Crea el primer slide para este tema'}
            </p>
            {!isStudent && (
              <button
                onClick={handleCreateSlide}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primer Slide</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                onClick={() => handleSlideClick(slide.id)}
                className="border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-blue-300 transition cursor-pointer"
              >
                <SlideThumbnail 
                  canvasData={slide.canvas_data || ''}
                  slideNumber={slide.slide_number || index + 1}
                />
                <div className="p-4 bg-white border-t border-gray-200">
                  <h3 className="font-medium text-gray-900">
                    {slide.title || `Slide ${slide.slide_number || index + 1}`}
                  </h3>
                  {isStudent && (
                    <p className="text-xs text-gray-500 mt-1">
                      Click para ver contenido
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
