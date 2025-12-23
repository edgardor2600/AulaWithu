import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { classService, type ClassWithDetails } from '../services/classService';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { CanvasEditor } from '../components/CanvasEditor';

export const SlideViewerPage = () => {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [classData, setClassData] = useState<ClassWithDetails | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (classId) {
      loadClass(classId);
    }
  }, [classId]);

  const loadClass = async (id: string) => {
    try {
      const data = await classService.getById(id);
      setClassData(data);
    } catch (error) {
      console.error('Error loading class:', error);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const goToNextSlide = () => {
    if (classData?.slides && currentSlideIndex < classData.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="mt-4 text-white">Cargando contenido...</p>
        </div>
      </div>
    );
  }

  const currentSlide = classData?.slides?.[currentSlideIndex];

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Top Bar - Minimal */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/classes/${classId}`)}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>

          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm">
              {classData?.title}
            </span>
            
            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPrevSlide}
                disabled={currentSlideIndex === 0}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <span className="text-white text-sm min-w-[100px] text-center font-medium">
                Slide {currentSlideIndex + 1} / {classData?.slides?.length || 0}
              </span>
              
              <button
                onClick={goToNextSlide}
                disabled={!classData?.slides || currentSlideIndex === classData.slides.length - 1}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            Modo solo lectura
          </div>
        </div>
      </div>

      {/* Slide Viewer - Full Screen */}
      <div className="flex-1 overflow-hidden bg-white">
        {currentSlide ? (
          <CanvasEditor
            key={currentSlide.id}
            slideId={currentSlide.id}
            initialData={currentSlide.canvas_data || ''}
            onSave={async () => {}} 
            onChange={() => {}}
            sessionId={null}
            onParticipantsChange={() => {}}
            isTeacher={false}
            isReadOnly={true}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No hay contenido disponible</p>
          </div>
        )}
      </div>
    </div>
  );
};
