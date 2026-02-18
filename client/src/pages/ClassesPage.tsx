import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Layout } from '../components/Layout';
import { Users, Clock, CheckCircle, XCircle, BookOpen, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { MessageModal } from '../components/messages/MessageModal';
import { messagesService } from '../services/messagesService';

interface StudentInfo {
  assignment_id: string;
  student: {
    id: string;
    name: string;
    username: string;
    avatar_color: string;
    active: boolean;
    last_login: string | null;
    level?: {
      id: string;
      name: string;
      description: string | null;
    };
  };
  assigned_at: string;
  notes: string | null;
}

interface TeacherInfo {
  teacher_id: string;
  teacher_name: string;
  teacher_avatar_color: string;
  assigned_at: string;
  classes_count: number;
}

export const ClassesPage = () => {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    loadData();

    // Poll for unread status updates every 10 seconds
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [isTeacher, isStudent]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      isTeacher ? loadStudents() : Promise.resolve(),
      isStudent ? loadTeachers() : Promise.resolve(),
      loadConversations()
    ]);
    setIsLoading(false);
  };

  const loadConversations = async () => {
    try {
      const conversations = await messagesService.getConversations();
      const map: Record<string, number> = {};
      conversations.forEach(c => {
        if (c.unread_count > 0) {
          map[c.user_id] = c.unread_count;
        }
      });
      setUnreadMap(map);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await api.get<{ success: boolean; students: StudentInfo[]; count: number }>(
        '/users/my-students'
      );
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Error al cargar estudiantes');
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await api.get<{ success: boolean; teachers: any[]; count: number }>(
        '/users/my-teachers'
      );
      setTeachers(response.data.teachers);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.error('Error al cargar profesores');
    }
  };

  const getLastLoginText = (lastLogin: string | null) => {
    if (!lastLogin) return 'Nunca';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const handleOpenChat = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    // Optimistically clear unread count
    setUnreadMap(prev => ({ ...prev, [userId]: 0 }));
  };

  // Vista para NO profesores/estudiantes (admin)
  if (!isTeacher && !isStudent) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Vista de Clases</h2>
              <p className="text-gray-600">
                Esta sección está disponible para profesores y estudiantes.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                {isTeacher ? <Users className="w-7 h-7 text-white" /> : <BookOpen className="w-7 h-7 text-white" />}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isTeacher ? 'Mis Estudiantes' : 'Mis Profesores'}
                </h1>
                <p className="text-gray-600">
                  {isTeacher ? 'Estudiantes asignados a tus clases' : 'Profesores asignados a ti'}
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* TEACHER VIEW */}
              {isTeacher && (
                <>
                  {students.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No tienes estudiantes asignados
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Contacta al administrador para que te asignen estudiantes
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Total Estudiantes</p>
                              <p className="text-3xl font-bold text-gray-900 mt-1">{students.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Users className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Activos</p>
                              <p className="text-3xl font-bold text-gray-900 mt-1">
                                {students.filter(s => s.student.active).length}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Con Sesión Reciente</p>
                              <p className="text-3xl font-bold text-gray-900 mt-1">
                                {students.filter(s => s.student.last_login).length}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Clock className="w-6 h-6 text-purple-600" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Students List */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                          <h2 className="text-lg font-semibold text-gray-900">Lista de Estudiantes</h2>
                        </div>

                        <div className="divide-y divide-gray-200">
                          {students.map((item) => {
                            const unread = unreadMap[item.student.id] || 0;
                            
                            return (
                              <div
                                key={item.assignment_id}
                                className="p-6 hover:bg-gray-50 transition"
                              >
                                <div className="flex items-center justify-between">
                                  {/* Student Info */}
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className="relative">
                                      <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                                        style={{ backgroundColor: item.student.avatar_color }}
                                      >
                                        {item.student.name.charAt(0).toUpperCase()}
                                      </div>
                                      {unread > 0 && (
                                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                          {unread}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900 text-lg">
                                          {item.student.name}
                                        </h3>
                                        {unread > 0 && (
                                          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                                            {unread} mensajes nuevos
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4 mt-1">
                                        <p className="text-sm text-gray-600">@{item.student.username}</p>
                                        
                                        {item.student.active ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                            <CheckCircle className="w-3 h-3" />
                                            Activo
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                            <XCircle className="w-3 h-3" />
                                            Inactivo
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="text-gray-500 text-sm">Último acceso</p>
                                      <p className="font-medium text-gray-900">
                                        {getLastLoginText(item.student.last_login)}
                                      </p>
                                    </div>

                                    <button
                                      onClick={() => handleOpenChat(item.student.id, item.student.name)}
                                      className={`px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium ${
                                        unread > 0 
                                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-md' 
                                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                                      }`}
                                    >
                                      <MessageCircle className="w-4 h-4" />
                                      {unread > 0 ? `Mensajes (${unread})` : 'Mensaje'}
                                    </button>
                                  </div>
                                </div>

                                {item.notes && (
                                  <div className="mt-3 pl-16">
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                      <p className="text-sm text-blue-900">
                                        <span className="font-medium">Nota:</span> {item.notes}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* STUDENT VIEW */}
              {isStudent && (
                <>
                  {teachers.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No tienes profesores asignados
                      </h3>
                      <p className="text-gray-600">
                        Contacta al administrador para que te asignen a un profesor
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Profesores Asignados</p>
                              <p className="text-3xl font-bold text-gray-900 mt-1">{teachers.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Users className="w-6 h-6 text-purple-600" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Clases Disponibles</p>
                              <p className="text-3xl font-bold text-gray-900 mt-1">
                                {teachers.reduce((sum, t) => sum + t.classes_count, 0)}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Teachers List */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                          <h2 className="text-lg font-semibold text-gray-900">Mis Profesores</h2>
                        </div>

                        <div className="divide-y divide-gray-200">
                          {teachers.map((teacher) => {
                             const unread = unreadMap[teacher.teacher_id] || 0;

                             return (
                              <div
                                key={teacher.teacher_id}
                                className="p-6 hover:bg-gray-50 transition"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className="relative">
                                      <div
                                        className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-xl"
                                        style={{ backgroundColor: teacher.teacher_avatar_color }}
                                      >
                                        {teacher.teacher_name.charAt(0).toUpperCase()}
                                      </div>
                                      {unread > 0 && (
                                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                          {unread}
                                        </div>
                                      )}
                                    </div>

                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900 text-xl mb-1">
                                          {teacher.teacher_name}
                                        </h3>
                                        {unread > 0 && (
                                          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                                            {unread} nuevos
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                          <BookOpen className="w-4 h-4" />
                                          {teacher.classes_count} clases
                                        </span>
                                        <span>•</span>
                                        <span>
                                          Asignado{' '}
                                          {new Date(teacher.assigned_at).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleOpenChat(teacher.teacher_id, teacher.teacher_name)}
                                    className={`px-6 py-3 rounded-lg transition flex items-center gap-2 font-medium shadow-sm ${
                                      unread > 0
                                        ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                                    }`}
                                  >
                                    <MessageCircle className="w-5 h-5" />
                                    {unread > 0 ? `Mensajes (${unread})` : 'Enviar Mensaje'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {selectedUserId && (
        <MessageModal
          recipientId={selectedUserId}
          recipientName={selectedUserName}
          onClose={() => {
            setSelectedUserId(null);
            loadConversations(); // Reload counts when chat closes
          }}
        />
      )}
    </Layout>
  );
};
