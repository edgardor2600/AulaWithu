import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { classService, type ClassWithDetails } from '../services/classService';
import { slideService, type Slide } from '../services/slideService';
import { Layout } from '../components/Layout';
import { CanvasEditor } from '../components/CanvasEditor';
import { SlideThumbnail } from '../components/SlideThumbnail';
import { 
  ArrowLeft, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Trash2,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

export const EditorPage = () => {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [classData, setClassData] = useState<ClassWithDetails | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Store canvas data for each slide in memory
  const slidesDataRef = useRef<Map<string, string>>(new Map());
  const saveTimeoutRef = useRef<number | undefined>(undefined);
  const lastSavedDataRef = useRef<string>('');

  useEffect(() => {
    if (classId) {
      loadClassAndSlides(classId);
    }
  }, [classId]);

  const loadClassAndSlides = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await classService.getById(id);
      setClassData(data);
      
      if (data.slides && data.slides.length > 0) {
        setSlides(data.slides);
        // Initialize slides data in memory
        data.slides.forEach(slide => {
          if (slide.canvas_data) {
            slidesDataRef.current.set(slide.id, slide.canvas_data);
          }
        });
      } else {
        // Create first slide if none exist
        await createSlide();
      }
    } catch (error) {
      console.error('Error loading class:', error);
      toast.error('Failed to load class');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const createSlide = async () => {
    if (!classId) return;

    try {
      // Don't pass slide_number - let backend auto-calculate
      const newSlide = await slideService.create(classId, {
        title: `Slide ${slides.length + 1}`,
      });
      
      setSlides([...slides, newSlide]);
      setCurrentSlideIndex(slides.length);
      toast.success('Slide created!');
    } catch (error) {
      console.error('Error creating slide:', error);
      toast.error('Failed to create slide');
    }
  };

  const deleteSlide = async (slideId: string, index: number) => {
    if (slides.length === 1) {
      toast.error('Cannot delete the last slide');
      return;
    }

    if (!confirm('Are you sure you want to delete this slide?')) {
      return;
    }

    try {
      await slideService.delete(slideId);
      
      // Remove from local state
      const newSlides = slides.filter((_, i) => i !== index);
      slidesDataRef.current.delete(slideId);
      
      // Renumber remaining slides to maintain sequential order
      // Update slide numbers: if deleted slide 2, then slide 3 becomes 2, slide 4 becomes 3, etc.
      const slidesToRenumber = newSlides.slice(index); // All slides after the deleted one
      
      for (let i = 0; i < slidesToRenumber.length; i++) {
        const slide = slidesToRenumber[i];
        const newNumber = index + i + 1; // New sequential number
        
        if (slide.slide_number !== newNumber) {
          // Update in backend
          await slideService.update(slide.id, { slide_number: newNumber });
          // Update in local state
          slide.slide_number = newNumber;
        }
      }
      
      setSlides(newSlides);
      
      if (currentSlideIndex >= newSlides.length) {
        setCurrentSlideIndex(newSlides.length - 1);
      }
      
      toast.success('Slide deleted and renumbered');
    } catch (error) {
      console.error('Error deleting slide:', error);
      toast.error('Failed to delete slide');
    }
  };

  const duplicateSlide = async (slideId: string, index: number) => {
    if (!classId) return;

    try {
      const slideToDuplicate = slides[index];
      const canvasData = slidesDataRef.current.get(slideId) || slideToDuplicate.canvas_data || '';
      
      // Create new slide - let backend calculate next slide_number
      const newSlide = await slideService.create(classId, {
        title: `${slideToDuplicate.title || 'Slide'} (Copy)`,
        // Don't pass slide_number - let backend auto-calculate
      });
      
      // Copy canvas data if exists
      if (canvasData && canvasData !== '{}') {
        await slideService.updateCanvas(newSlide.id, canvasData);
        newSlide.canvas_data = canvasData;
        slidesDataRef.current.set(newSlide.id, canvasData);
      }
      
      setSlides([...slides, newSlide]);
      setCurrentSlideIndex(slides.length);
      toast.success('Slide duplicated!');
    } catch (error) {
      console.error('Error duplicating slide:', error);
      toast.error('Failed to duplicate slide');
    }
  };

  // Save to backend (debounced)
  const saveToBackend = useCallback(async (slideId: string, canvasData: string) => {
    // Don't save if data hasn't changed
    if (canvasData === lastSavedDataRef.current) {
      return;
    }

    try {
      setIsSaving(true);
      console.log('Saving canvas data, size:', canvasData.length, 'bytes');
      await slideService.updateCanvas(slideId, canvasData);
      lastSavedDataRef.current = canvasData;
      console.log('Save successful');
    } catch (error: any) {
      console.error('Error saving slide:', error);
      console.error('Error response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error message:', error.response?.data?.error?.message);
      toast.error('Failed to save: ' + (error.response?.data?.error?.message || error.message));
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Handle canvas data change (called frequently)
  const handleCanvasChange = useCallback((canvasData: string) => {
    const currentSlide = slides[currentSlideIndex];
    if (!currentSlide) return;

    console.log('handleCanvasChange called, size:', canvasData.length);

    // Update in-memory data immediately (no lag)
    slidesDataRef.current.set(currentSlide.id, canvasData);

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save to backend (3 seconds)
    saveTimeoutRef.current = window.setTimeout(() => {
      console.log('Auto-save triggered after debounce');
      saveToBackend(currentSlide.id, canvasData);
    }, 3000);
  }, [slides, currentSlideIndex, saveToBackend]);

  // Manual save
  const handleManualSave = async (canvasData: string) => {
    const currentSlide = slides[currentSlideIndex];
    if (!currentSlide) return;

    try {
      await saveToBackend(currentSlide.id, canvasData);
      toast.success('Slide saved!');
    } catch (error) {
      toast.error('Failed to save slide');
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const currentSlide = slides[currentSlideIndex];
  
  // Memoize currentSlideData to prevent unnecessary re-renders
  const currentSlideData = useMemo(() => {
    if (!currentSlide) return '';
    return slidesDataRef.current.get(currentSlide.id) || currentSlide.canvas_data || '';
  }, [currentSlide?.id]); // Only change when slide ID changes, not when slides array changes

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading editor...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/classes/${classId}`)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">
                {classData?.title}
              </h1>
              {isSaving && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Saving...</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Slide Navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPrevSlide}
                  disabled={currentSlideIndex === 0}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <span className="text-sm text-gray-600 min-w-[80px] text-center">
                  Slide {currentSlideIndex + 1} / {slides.length}
                </span>
                
                <button
                  onClick={goToNextSlide}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={createSlide}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>New Slide</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Slide Thumbnails */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Slides</h3>
            <div className="space-y-2">
              {slides.map((slide, index) => {
                const slideData = slidesDataRef.current.get(slide.id) || slide.canvas_data || '';
                
                return (
                  <div
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`relative group cursor-pointer rounded-lg border-2 transition ${
                      index === currentSlideIndex
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow'
                    }`}
                  >
                    <SlideThumbnail 
                      canvasData={slideData}
                      slideNumber={slide.slide_number}
                    />
                    <div className="p-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600 truncate font-medium">
                        Slide {slide.slide_number}
                      </p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSlide(slide.id, index);
                        }}
                        className="p-1.5 bg-blue-500 text-white rounded-md shadow-lg hover:bg-blue-600 transition"
                        title="Duplicate slide"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {slides.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSlide(slide.id, index);
                          }}
                          className="p-1.5 bg-red-500 text-white rounded-md shadow-lg hover:bg-red-600 transition"
                          title="Delete slide"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Canvas Editor */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentSlide && (
              <CanvasEditor
                key={currentSlide.id}
                slideId={currentSlide.id}
                initialData={currentSlideData}
                onSave={handleManualSave}
                onChange={handleCanvasChange}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
