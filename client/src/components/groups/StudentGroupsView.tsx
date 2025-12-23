import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsService, type StudentGroup } from '../../services/groupsService';
import toast from 'react-hot-toast';
import { Users, BookOpen, Loader2, Calendar } from 'lucide-react';

export const StudentGroupsView = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const data = await groupsService.getMyGroups();
      setGroups(data);
    } catch (error) {
      toast.error('Error al cargar tus grupos');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mis Grupos</h2>
        <p className="text-sm text-gray-500 mt-1">
          Grupos en los que estás inscrito
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No estás inscrito en ningún grupo
          </h3>
          <p className="text-gray-600">
            Contacta a tu profesor para que te asigne a un grupo
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((item) => (
            item.group && item.class && (
              <div
                key={item.enrollment.id}
                onClick={() => item.class && navigate(`/classes/${item.class.id}`)}
                className="group bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden hover:shadow-2xl hover:border-blue-300 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              >
                {/* Card Header - Cambia de color en hover */}
                <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 group-hover:from-blue-100 group-hover:to-purple-100 border-b border-gray-200 transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-600 group-hover:bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-300 shadow-sm">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-700 truncate transition-colors duration-300">
                        {item.class.title}
                      </h3>
                      {item.class.description && (
                        <p className="text-sm text-gray-600 group-hover:text-gray-700 line-clamp-2 mt-1 transition-colors duration-300">
                          {item.class.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  {/* Group Info */}
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{item.group.name}</span>
                  </div>

                  {item.group.description && (
                    <p className="text-sm text-gray-600 mb-4">
                      {item.group.description}
                    </p>
                  )}

                  {/* Enrollment Info */}
                  <div className="space-y-2 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Inscrito el {formatDate(item.enrollment.enrolled_at)}</span>
                    </div>

                    {item.enrollment.status && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.enrollment.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : item.enrollment.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.enrollment.status === 'active' ? 'Activo' :
                           item.enrollment.status === 'completed' ? 'Completado' : 'Inactivo'}
                        </span>
                      </div>
                    )}

                    {item.enrollment.notes && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mt-3">
                        <span className="font-medium">Notas:</span> {item.enrollment.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Info Footer */}
      {groups.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Estás inscrito en {groups.length} grupo{groups.length !== 1 ? 's' : ''}</p>
              <p className="text-blue-700">
                Los grupos te permiten organizarte mejor con tus compañeros y acceder a contenido específico de tu clase.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
