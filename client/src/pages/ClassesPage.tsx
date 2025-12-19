import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Layout } from '../components/Layout';
import { Users, Clock, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface StudentInfo {
  assignment_id: string;
  student: {
    id: string;
    name: string;
    username: string;
    avatar_color: string;
    active: boolean;
    last_login: string | null;
  };
  assigned_at: string;
  notes: string | null;
}

export const ClassesPage = () => {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    if (isTeacher) {
      loadStudents();
    } else {
      setIsLoading(false);
    }
  }, [isTeacher]);

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ success: boolean; students: StudentInfo[]; count: number }>(
        '/users/my-students'
      );
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Error al cargar estudiantes');
    } finally {
      setIsLoading(false);
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

  // Vista para estudiantes
  if (!isTeacher) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Vista de Clases</h2>
              <p className="text-gray-600">
                Esta sección está disponible solo para profesores.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Vista para profesores
  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mis Estudiantes</h1>
                <p className="text-gray-600">Estudiantes asignados a tus clases</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : students.length === 0 ? (
            // Empty state
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
            // Students grid
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
                  {students.map((item) => (
                    <div
                      key={item.assignment_id}
                      className="p-6 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        {/* Student Info */}
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                            style={{ backgroundColor: item.student.avatar_color }}
                          >
                            {item.student.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {item.student.name}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-sm text-gray-600">@{item.student.username}</p>
                              
                              {/* Status Badge */}
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

                        {/* Metadata */}
                        <div className="flex items-center gap-8 text-sm">
                          {/* Last Login */}
                          <div className="text-right">
                            <p className="text-gray-500">Último acceso</p>
                            <p className="font-medium text-gray-900">
                              {getLastLoginText(item.student.last_login)}
                            </p>
                          </div>

                          {/* Assigned Date */}
                          <div className="text-right">
                            <p className="text-gray-500">Asignado</p>
                            <p className="font-medium text-gray-900">
                              {new Date(item.assigned_at).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
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
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};
