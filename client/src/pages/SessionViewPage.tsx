import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionService, type Session } from '../services/sessionService';
import { slideService, type Slide } from '../services/slideService';
import { Layout } from '../components/Layout';
import { CanvasEditor } from '../components/CanvasEditor';
import { ParticipantsList } from '../components/ParticipantsList';
import { ArrowLeft, Users, Radio } from 'lucide-react';
import toast from 'react-hot-toast';

export const SessionViewPage = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<Session | null>(null);
  const [slide, setSlide] = useState<Slide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [participantsList, setParticipantsList] = useState<Array<{
    clientId: number;
    name: string;
    color: string;
  }>>([]);
  const [currentClientId, setCurrentClientId] = useState<number>();
  const [isTeacher, setIsTeacher] = useState(false);  // ✅ NUEVO: Detectar si es profesor
  const [isReadOnly, setIsReadOnly] = useState(true);  // ✅ NUEVO: Estado reactivo para permisos
  const [showParticipants, setShowParticipants] = useState(window.innerWidth > 1024); // ✅ NUEVO: Controlar sidebar

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024 && showParticipants) {
        setShowParticipants(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showParticipants]);

  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      try {
        // Get session details
        const sessionData = await sessionService.getById(sessionId);
        setSession(sessionData);

        // Check if session is active
        if (!sessionData.is_active) {
          toast.error('This session has ended');
          navigate('/join');
          return;
        }

        // ✅ NUEVO: Detectar si el usuario actual es el profesor
        const userId = localStorage.getItem('userId');
        const userIsTeacher = sessionData.teacher_id === userId;
        setIsTeacher(userIsTeacher);
        console.log('🎓 User role:', userIsTeacher ? 'TEACHER' : 'STUDENT');

        // ✅ NUEVO: Establecer isReadOnly inicial
        setIsReadOnly(sessionData.allow_student_draw === 0);

        // Get slide data
        const slideData = await slideService.getById(sessionData.slide_id);
        setSlide(slideData);
        
        toast.success(`Connected to session: ${sessionData.session_code}`);
      } catch (error) {
        console.error('Failed to load session:', error);
        toast.error('Failed to load session');
        navigate('/join');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId, navigate]);

  // ✅ NUEVO: Validar estado de sesión en tiempo real (solo para estudiantes)
  useEffect(() => {
    if (!sessionId || isTeacher) return; // Solo para estudiantes
    
    const checkSessionStatus = async () => {
      try {
        const sessionData = await sessionService.getById(sessionId);
        
        if (!sessionData.is_active) {
          console.log('⚠️ Session ended by teacher');
          toast.error('The teacher has ended this session');
          navigate('/join');
          return;
        }
        
        // ✅ NUEVO: Detectar cambio de slide
        if (session && sessionData.slide_id !== session.slide_id) {
          console.log('📍 Teacher changed slide:', sessionData.slide_id);
          toast.success('Teacher moved to a different slide');
          
          // Recargar slide nuevo
          try {
            const slideData = await slideService.getById(sessionData.slide_id);
            setSlide(slideData);
            setSession(sessionData);
          } catch (error) {
            console.error('Failed to load new slide:', error);
            toast.error('Failed to load new slide');
          }
        }
      } catch (error) {
        console.error('Failed to check session status:', error);
        // No mostrar error al usuario, puede ser temporal
      }
    };
    
    // Verificar cada 3 segundos (rápido para clases en vivo)
    const interval = setInterval(checkSessionStatus, 3000);
    
    // También verificar cuando la pestaña vuelve a estar activa
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionStatus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, isTeacher, navigate, session]);  // ✅ CRÍTICO: Agregar session para detectar cambios

  const handleSave = async (canvasData: string) => {
    // Students can't save to the main slide
    // This would be for saving personal snapshots
    console.log('Student save:', canvasData);
    toast.success('Snapshot saved!');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading session...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!session || !slide) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Session not found</p>
            <button
              onClick={() => navigate('/join')}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              ← Back to Join
            </button>
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
            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                onClick={() => navigate('/join')}
                className="flex items-center space-x-1 md:space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base hidden sm:inline">Leave</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-1 md:space-x-2">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full animate-pulse" />
                <Radio className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                <h1 className="text-sm md:text-xl font-semibold text-gray-900 truncate max-w-[100px] md:max-w-none">
                  {session.session_code}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Toggle Participants Button */}
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className={`p-2 rounded-lg transition-colors ${
                  showParticipants ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}
                title="Toggle Participants"
              >
                <Users className="w-5 h-5" />
              </button>

              {/* Participants Count - Hidden on extra small */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-600">
                  {participantsCount}
                </span>
              </div>

              {/* Permission Badge */}
              <div className={`px-2 py-1 md:px-3 md:py-2 rounded-lg ${
                isReadOnly 
                  ? 'bg-yellow-50 text-yellow-700' 
                  : 'bg-green-50 text-green-700'
              }`}>
                <span className="text-xs md:text-sm font-medium">
                  {isReadOnly ? '👁️' : '✏️'}
                  <span className="hidden sm:inline ml-1">
                    {isReadOnly ? 'View Only' : 'Can Draw'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Canvas */}
          <div className="flex-1 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 p-2 md:p-6">
            <CanvasEditor
              slideId={session.slide_id.toString()}
              initialData={slide.canvas_data || undefined}
              onSave={handleSave}
              isReadOnly={isReadOnly}
              sessionId={`${session.session_code}_slide_${session.slide_id}`}  // ✅ CRÍTICO: Sala única por slide
              onParticipantsChange={(count, list, myId) => {
                setParticipantsCount(count);
                setParticipantsList(list || []);
                setCurrentClientId(myId);
              }}
              enforceOwnership={!isTeacher}  // ✅ MODIFICADO: Solo estudiantes tienen restricciones
              isTeacher={isTeacher}          // ✅ NUEVO: Pasar rol al editor
              onPermissionsChange={(allowDraw) => {
                // ✅ NUEVO: Actualizar isReadOnly cuando cambien permisos
                setIsReadOnly(!allowDraw);
                console.log('📝 Permissions changed in SessionViewPage:', allowDraw);
              }}
            />
          </div>

          {/* Participants Sidebar */}
          <div className={`
            absolute right-0 top-0 bottom-0 z-20 w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto transform transition-transform duration-300 ease-in-out
            ${showParticipants ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}
            md:relative md:translate-x-0 md:block md:shadow-none
            ${!showParticipants && 'md:hidden'}
          `}>
            {showParticipants && (
              <ParticipantsList 
                participants={participantsList}
                currentUserId={currentClientId}
              />
            )}
          </div>
        </div>

        {/* Info Banner */}
        {isReadOnly && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-3">
            <p className="text-sm text-yellow-800 text-center">
              ℹ️ You are in view-only mode. The teacher has not enabled drawing permissions.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};
