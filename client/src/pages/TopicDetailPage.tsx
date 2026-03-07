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
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-100 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-400 mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 font-bold">Cargando tema...</p>
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
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8 p-6 lg:p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300 relative overflow-hidden">
            {/* Fondo con decoración sutil */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <button
              onClick={() => navigate(`/classes/${classId}`)}
              className="relative flex items-center space-x-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition font-bold group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Volver a Temas</span>
            </button>

            <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div>
                <div className="flex items-start space-x-5 mb-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-200/50 dark:border-indigo-500/20 shadow-inner flex-shrink-0">
                    <span className="text-indigo-600 dark:text-indigo-400 font-black text-2xl">
                      {topic.topic_number}
                    </span>
                  </div>
                  <div className="pt-1">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                      {topic.title}
                    </h1>
                    {topic.description && (
                      <p className="text-slate-600 dark:text-slate-400 mt-3 leading-relaxed font-medium max-w-3xl text-sm md:text-base">{topic.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                        <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        {slides.length} slide{slides.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {!isStudent && (
                <button
                  onClick={handleCreateSlide}
                  className="flex shrink-0 items-center justify-center space-x-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 font-bold"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nuevo Slide</span>
                </button>
              )}
            </div>
          </div>

          {/* Slides Grid */}
          {slides.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 shadow-sm transition-colors">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-100 dark:border-slate-700">
                <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                No hay slides en este tema
              </h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-8 max-w-sm mx-auto">
                {isStudent
                  ? 'El profesor aún no ha agregado contenido en esta sección. Regresa más tarde.'
                  : 'Crea el primer slide interactivo para organizar el contenido de tu clase.'}
              </p>
              {!isStudent && (
                <button
                  onClick={handleCreateSlide}
                  className="inline-flex items-center space-x-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg hover:-translate-y-0.5 font-bold"
                >
                  <Plus className="w-5 h-5" />
                  <span>Crear Primer Slide</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  onClick={() => handleSlideClick(slide.id)}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col hover:-translate-y-1.5"
                >
                  <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
                    <SlideThumbnail 
                      canvasData={slide.canvas_data || ''}
                      slideNumber={slide.slide_number || index + 1}
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 dark:group-hover:bg-indigo-400/10 transition-colors duration-300 flex items-center justify-center">
                       <span className="opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-5 py-2.5 rounded-xl font-bold shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2">
                         <BookOpen className="w-4 h-4 text-indigo-500" />
                         {isStudent ? 'Ver Slide' : 'Editar Slide'}
                       </span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between relative bg-white dark:bg-slate-900 transition-colors">
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {slide.title || `Slide ${slide.slide_number || index + 1}`}
                    </h3>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4">
                       <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Diapositiva
                       </span>
                       <span className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-xs font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                          {slide.slide_number || index + 1}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
