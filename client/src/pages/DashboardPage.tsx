import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { classService, type Class } from '../services/classService';
import { Layout } from '../components/Layout';
import { ClassModal } from '../components/ClassModal';
import { StudentGroupsView } from '../components/groups/StudentGroupsView';
import { Plus, BookOpen, Edit, Trash2, Eye, Search, Sparkles, GraduationCap } from 'lucide-react';
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
      <div className="min-h-screen bg-[#f1f5f9] dark:bg-slate-950 font-sans pb-16 transition-colors duration-300">
        
        {/* === HERO BANNER (Inmersivo y Mejor Distribuido) === */}
        <div className="bg-slate-900 border-b border-slate-800 relative overflow-hidden">
          
          {/* Fondo Abstracto del Banner */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen translate-y-1/4"></div>

          {/* Contenedor Interior */}
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 md:py-16 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Textos del Banner */}
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 mb-4">
                {isTeacher ? (
                  <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-300 text-[11px] font-black tracking-widest uppercase border border-blue-500/20 backdrop-blur-md shadow-sm">
                    Panel Docente
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-[11px] font-black tracking-widest uppercase border border-emerald-500/20 backdrop-blur-md shadow-sm">
                    Portal Estudiantil
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3">
                {isTeacher ? 'Tus Clases' : 'Tu Academia'}
              </h1>
              <p className="text-base md:text-lg text-slate-400 font-medium">
                {isTeacher
                  ? 'Gestiona y centraliza todo tu material de enseñanza.'
                  : 'Explora y conecta con tu entorno de aprendizaje colaborativo.'}
              </p>
            </div>

            {/* Botones de Acción sobre Banner */}
            <div className="flex shrink-0 w-full md:w-auto mt-2 md:mt-0">
               {!isTeacher && (
                <button
                  onClick={handleJoinSession}
                  className="w-full md:w-auto group flex items-center justify-center space-x-3 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-2xl transition-all duration-300 font-extrabold shadow-[0_4px_20px_0_rgb(16,185,129,0.3)] hover:shadow-[0_4px_25px_0_rgb(16,185,129,0.45)] hover:-translate-y-0.5"
                >
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-100 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </div>
                  <span>Entrar a Clase en Vivo</span>
                </button>
              )}

              {isTeacher && (
                <button
                  onClick={handleCreateClass}
                  className="w-full md:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 bg-white text-slate-900 rounded-2xl hover:bg-slate-50 transition-all duration-300 font-extrabold shadow-[0_4px_20px_rgba(255,255,255,0.15)] hover:shadow-[0_4px_25px_rgba(255,255,255,0.25)] hover:-translate-y-0.5 group"
                >
                  <Plus className="w-5 h-5 text-indigo-600 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Construir Clase</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* === CONTENIDO PRINCIPAL === */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 relative z-20">
          
          {/* Barra de búsqueda con Estilo de Pastilla */}
          {isTeacher && (
            <div className="mb-10 w-full md:max-w-lg relative group shadow-sm rounded-2xl">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                className="w-full pl-14 pr-12 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200/80 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-[3px] focus:ring-indigo-100 dark:focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 font-bold text-[15px] transition-all hover:border-slate-300 dark:hover:border-slate-700"
                placeholder="Buscar entre tus clases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[10px] font-black uppercase text-slate-400 hover:text-slate-700 transition"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}

          {/* ESTUDIANTE: Componente de Grupos */}
          {!isTeacher && (
            <div className="mt-2">
               {/* Componente que renderiza los grupos asignados */}
               <StudentGroupsView />
            </div>
          )}

          {/* PROFESOR: Grid Táctil y Jugoso de Clases */}
          {isTeacher && (
            <div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-indigo-500 mb-5"></div>
                  <p className="text-slate-500 font-bold tracking-wide">Cargando material educativo...</p>
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 shadow-inner rounded-full flex items-center justify-center mb-5">
                    <GraduationCap className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                    {searchQuery ? 'Sin Resultados' : 'Tu catálogo está vacío'}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mb-6">
                    {searchQuery 
                      ? 'Revisa los términos de tu búsqueda, no hemos encontrado coincidencias.' 
                      : 'Empieza a estructurar tu contenido educativo creando tu primera clase interactiva hoy mismo.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={handleCreateClass}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-bold shadow-md hover:shadow-lg"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-200" />
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
                      'from-amber-400 to-orange-500'
                    ];
                    const gradient = patterns[index % patterns.length];
                    
                    return (
                      <div
                        key={classItem.id}
                        className="group bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex flex-col h-full transform hover:-translate-y-1 cursor-default"
                      >
                        {/* Cabecera Gráfica */}
                        <div className={`relative h-28 w-full rounded-xl bg-gradient-to-tr ${gradient} overflow-hidden mb-4 shrink-0 flex items-center justify-center shadow-inner`}>
                           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                           <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>
                           <BookOpen className="w-8 h-8 text-white/90 relative z-10 drop-shadow-sm group-hover:scale-110 transition-transform duration-500" />
                           
                           {/* Botón flotante para editar encima del cover */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditClass(classItem); }}
                            className="absolute top-3 right-3 w-8 h-8 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 shadow-sm border border-white/20 z-20"
                            title="Editar clase"
                          >
                            <Edit className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>

                        {/* Contenido (Textos) */}
                        <div className="px-1 pb-1 flex-1 flex flex-col justify-between">
                          <div className="mb-5">
                            <h3 className="font-extrabold text-[15px] text-slate-800 dark:text-slate-100 leading-snug mb-1.5 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {classItem.title}
                            </h3>
                            {classItem.description ? (
                              <p className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                                {classItem.description}
                              </p>
                            ) : (
                               <p className="text-[13px] text-slate-400 dark:text-slate-500 italic">Sin descripción.</p>
                            )}
                          </div>

                          {/* Acciones base como botones separados */}
                          <div className="grid grid-cols-[1fr_auto] gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-auto">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewClass(classItem); }}
                              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 rounded-lg transition-colors text-xs font-bold border border-slate-100 dark:border-slate-800/80 group-hover:border-indigo-100 dark:group-hover:border-indigo-500/20"
                            >
                              <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                              Entrar a Sala
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteClass(classItem); }}
                              className="w-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-100 dark:hover:border-rose-500/20 rounded-lg transition-all border border-slate-100 dark:border-slate-800/80 hover:shadow-sm"
                              title="Eliminar clase"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-2" />
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
