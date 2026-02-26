import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { classService, type Class } from '../services/classService';
import { Layout } from '../components/Layout';
import { ClassModal } from '../components/ClassModal';
import { StudentGroupsView } from '../components/groups/StudentGroupsView';
import { Plus, BookOpen, Edit, Trash2, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [searchQuery, setSearchQuery] = useState('');

  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setIsLoading(true);
      const data = await classService.getAll();
      
      const filteredClasses = isTeacher
        ? data.filter((c) => c.teacher_id === user?.id)
        : data;
      
      setClasses(filteredClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClasses = classes.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(query) || 
      (c.description && c.description.toLowerCase().includes(query))
    );
  });

  const handleCreateClass = () => {
    setModalMode('create');
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleEditClass = (classItem: Class) => {
    setModalMode('edit');
    setEditingClass(classItem);
    setIsModalOpen(true);
  };

  const handleSubmitClass = async (data: { title: string; description: string; levelId?: string }) => {
    try {
      if (modalMode === 'create') {
        await classService.create(data);
        toast.success('Clase creada con éxito!');
      } else if (editingClass) {
        await classService.update(editingClass.id, data);
        toast.success('Clase actualizada con éxito!');
      }
      await loadClasses();
    } catch (error) {
      console.error('Error submitting class:', error);
    }
  };

  const handleDeleteClass = async (classItem: Class) => {
    if (!confirm(`¿Estás seguro de eliminar "${classItem.title}"? Esto borrará todas las diapositivas también.`)) {
      return;
    }

    try {
      await classService.delete(classItem.id);
      toast.success('Clase eliminada');
      await loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const handleViewClass = (classItem: Class) => {
    navigate(`/classes/${classItem.id}`);
  };

  const handleJoinSession = () => {
    navigate('/join');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#f1f5f9] font-sans p-6 md:p-10">
        
        {/* === ENCABEZADO MINIMALISTA (SaaS Style) === */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-200/60">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              {isTeacher ? (
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold tracking-wider uppercase border border-blue-100">
                  Panel Docente
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold tracking-wider uppercase border border-emerald-100">
                  Portal Estudiantil
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
              {isTeacher ? 'Tus Clases' : 'Tu Academia'}
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {isTeacher
                ? 'Gestiona y supervisa todo tu material educativo.'
                : 'Tu espacio personal de aprendizaje continuo.'}
            </p>
          </div>

          {/* Botones de Acción Primaria */}
          <div className="flex shrink-0">
            {!isTeacher && (
              <button
                onClick={handleJoinSession}
                className="group flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all font-semibold shadow-sm hover:shadow-md border border-emerald-500"
              >
                <div className="relative flex h-2.5 w-2.5 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </div>
                <span>Unirse a Sesión en Vivo</span>
              </button>
            )}

            {isTeacher && (
              <button
                onClick={handleCreateClass}
                className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-semibold shadow-sm hover:shadow-md"
              >
                <Plus className="w-5 h-5 text-slate-300" />
                <span>Crear Nueva Clase</span>
              </button>
            )}
          </div>
        </div>

        {/* === CONTENIDO PRINCIPAL === */}
        <div className="max-w-7xl mx-auto">
          
          {/* Barra de búsqueda (Solo Profesor) */}
          {isTeacher && (
            <div className="mb-8 w-full md:max-w-md relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-[3px] focus:ring-blue-100 focus:border-blue-500 font-medium text-[15px] shadow-sm transition-all"
                placeholder="Buscar clases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-700 transition"
                >
                  LIMPIAR
                </button>
              )}
            </div>
          )}

          {/* ESTUDIANTE: Vista de Grupos */}
          {!isTeacher && (
            <StudentGroupsView />
          )}

          {/* PROFESOR: Grid de Clases */}
          {isTeacher && (
            <div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-blue-600 mb-4"></div>
                  <p className="text-slate-500 font-medium tracking-wide">Cargando tus clases...</p>
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {searchQuery ? 'No se encontraron resultados' : 'No tienes clases creadas'}
                  </h3>
                  <p className="text-slate-500 max-w-sm mb-6">
                    {searchQuery 
                      ? 'No hay ninguna clase que coincida con tu búsqueda.' 
                      : 'Empieza a estructurar tu contenido educativo creando tu primera clase.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={handleCreateClass}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Crear Primera Clase</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredClasses.map((classItem, index) => {
                    const patterns = [
                      'from-blue-500 to-cyan-400',
                      'from-indigo-500 to-purple-500',
                      'from-emerald-400 to-teal-500',
                      'from-rose-400 to-orange-400',
                      'from-violet-500 to-fuchsia-500',
                    ];
                    const gradient = patterns[index % patterns.length];
                    
                    return (
                      <div
                        key={classItem.id}
                        className="group bg-white rounded-[1.25rem] p-3 shadow-[0_4px_20px_rgb(0,0,0,0.05)] hover:shadow-[0_10px_40px_rgb(0,0,0,0.1)] transition-all duration-300 border border-slate-200/80 flex flex-col h-full"
                      >
                        {/* Pequeño cover header en lugar del masivo anterior */}
                        <div className={`relative h-28 w-full rounded-xl bg-gradient-to-tr ${gradient} overflow-hidden mb-4 shrink-0 flex items-center justify-center`}>
                           <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                           <BookOpen className="w-8 h-8 text-white/90 relative z-10" />
                           
                           {/* Botón flotante para editar encima del cover */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditClass(classItem); }}
                            className="absolute top-3 right-3 w-8 h-8 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                            title="Editar clase"
                          >
                            <Edit className="w-4 h-4 text-white" />
                          </button>
                        </div>

                        {/* Contenido */}
                        <div className="px-2 pb-2 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-[1.1rem] text-slate-800 leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {classItem.title}
                            </h3>
                            {classItem.description && (
                              <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">
                                {classItem.description}
                              </p>
                            )}
                          </div>

                          {/* Acciones base */}
                          <div className="flex gap-2 pt-3 border-t border-slate-100 mt-auto">
                            <button
                              onClick={() => handleViewClass(classItem)}
                              className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg transition-colors text-sm font-semibold border border-slate-100"
                            >
                              <Eye className="w-4 h-4" />
                              Ver Detalle
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteClass(classItem); }}
                              className="w-[42px] flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-slate-100"
                              title="Eliminar clase"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitClass}
        initialData={editingClass}
        mode={modalMode}
      />
    </Layout>
  );
};
