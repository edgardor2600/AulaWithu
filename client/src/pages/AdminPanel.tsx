import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adminService, type User, type SystemStats } from '../services/adminService';
import toast from 'react-hot-toast';
import {
  Users,
  GraduationCap,
  UserPlus,
  BarChart3,
  LogOut,
  Loader2,
  Shield,
  BookOpen,
} from 'lucide-react';
import { CreateUserModal } from '../components/admin/CreateUserModal';
import { UsersTable } from '../components/admin/UsersTable';
import { ThemeToggle } from '../components/ThemeToggle';

type TabType = 'stats' | 'users';

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createUserType, setCreateUserType] = useState<'teacher' | 'student'>('student');

  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Verificar que el usuario sea admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error('Acceso denegado. Se requieren permisos de administrador.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // No renderizar nada si no es admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'stats' || activeTab === 'users') {
        const [statsData, usersData] = await Promise.all([
          adminService.getStats(),
          adminService.getUsers(),
        ]);
        setStats(statsData);
        setUsers(usersData);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = (type: 'teacher' | 'student') => {
    setCreateUserType(type);
    setShowCreateModal(true);
  };

  const handleUserCreated = () => {
    setShowCreateModal(false);
    loadData();
    toast.success('Usuario creado exitosamente');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    // Agregamos overflow-x-hidden para prevenir cualquier scroll horizontal global
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-16 overflow-x-hidden transition-colors duration-300">
      
      {/* === HEADER INMERSIVO E INTERACTIVO (PREMIUM SAAS) === */}
      {/* Aumentamos el padding bottom (pb-12) para que el header baje lo suficiente y no colisione con las pills */}
      <header className="bg-slate-900 border-b border-slate-800 relative z-10 shadow-lg pb-12">
        {/* Abstract Dark Layer */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none mix-blend-screen overflow-hidden"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Cambiamos el flex layout para asegurar que el contenido se distribuya "between" sin romperse */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-6 gap-6">
            
            {/* Logo / Título */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-[0_4px_20px_0_rgb(99,102,241,0.4)] border border-white/20 shrink-0">
                <Shield className="w-7 h-7 text-white drop-shadow-sm" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 mb-1">
                   <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 text-[10px] font-black tracking-widest uppercase border border-white/10 backdrop-blur-sm">
                      ROOT ACCESS
                   </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Centro de Control</h1>
              </div>
            </div>

            {/* User Meta / Logout / Theme - Aseguramos que se alinee a la derecha */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              {/* Theme Toggle Button */}
              <div className="bg-slate-800/80 p-1.5 rounded-[1.25rem] border border-slate-700/60 backdrop-blur-sm shadow-sm hidden sm:block">
                <ThemeToggle />
              </div>

              {/* User Box */}
              <div className="flex items-center gap-3 sm:gap-5 flex-1 sm:flex-none shrink-0 bg-slate-800/80 p-2 pr-4 rounded-[1.25rem] border border-slate-700/60 backdrop-blur-sm overflow-hidden shadow-sm">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-black text-white shadow-inner shrink-0">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left flex-1 sm:flex-none min-w-0 pr-2">
                <p className="text-[13px] font-bold text-white leading-tight truncate">{user?.name}</p>
                <p className="text-[11px] font-medium text-slate-400">Super Admin</p>
              </div>
              <div className="h-6 w-px bg-slate-700 hidden sm:block shrink-0"></div>
              <button
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all shrink-0 ml-auto sm:ml-0"
                title="Cerrar sesión segura"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

      {/* === NAVEGACIÓN TIPO "PILL" FLOTANTE ====== */}
      {/* Centrado absoluto perfecto para que no rompa izquierda/derecha y siempre flote al medio */}
      <div className="relative z-20 -mt-8 flex justify-center mb-10 w-full px-4">
        <nav className="inline-flex bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 tracking-tight shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-1.5 rounded-2xl gap-1 transition-colors">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2.5 ${
              activeTab === 'stats'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-md'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${activeTab === 'stats' ? 'text-indigo-400' : ''}`} />
            Panel Estadístico
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2.5 ${
              activeTab === 'users'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-md'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'users' ? 'text-emerald-400 dark:text-emerald-100' : ''}`} />
            Gestión de Usuarios
          </button>
        </nav>
      </div>

      {/* === CONTENIDO PRINCIPAL === */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="w-12 h-12 border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 dark:border-t-indigo-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-bold">Analizando registros de base de datos...</p>
          </div>
        ) : (
          <>
            {/* === PESTAÑA: ESTADÍSTICAS === */}
            {activeTab === 'stats' && stats && (
              <div className="space-y-8">
                
                {/* 1. MÉTTRICAS PRINCIPALES (GRID IMPACTANTE) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  
                  {/* Total Usuarios */}
                  <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl dark:shadow-black/20 transition-all duration-300 border-2 border-indigo-100 dark:border-indigo-500/20 flex flex-col hover:-translate-y-1 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-[1rem] flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shadow-inner transition-colors">
                        <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-black tracking-widest uppercase rounded-full">
                        Métrica Base
                      </span>
                    </div>
                    <div>
                      <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-2 transition-colors">{stats.totalUsers}</p>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Volumen Total de Entidades</p>
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Suma de todas las matrículas del sistema</p>
                    </div>
                  </div>

                  {/* Profesores */}
                  <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl dark:shadow-black/20 transition-all duration-300 border-2 border-emerald-100 dark:border-emerald-500/20 flex flex-col hover:-translate-y-1 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-[1rem] flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 shadow-inner transition-colors">
                        <GraduationCap className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black tracking-widest uppercase rounded-full">
                        Cuerpo Docente
                      </span>
                    </div>
                    <div>
                      <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-2 transition-colors">{stats.teachers}</p>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Educadores Registrados</p>
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Con permisos de creación y gestión de clases</p>
                    </div>
                  </div>

                  {/* Estudiantes */}
                  <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl dark:shadow-black/20 transition-all duration-300 border-2 border-cyan-100 dark:border-cyan-500/20 flex flex-col hover:-translate-y-1 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-cyan-50 dark:bg-cyan-500/10 rounded-[1rem] flex items-center justify-center border border-cyan-100 dark:border-cyan-500/20 shadow-inner transition-colors">
                        <Users className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px] font-black tracking-widest uppercase rounded-full">
                        Alumnado
                      </span>
                    </div>
                    <div>
                      <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-2 transition-colors">{stats.students}</p>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Estudiantes Activos</p>
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Cuentas con acceso a consumo de recursos</p>
                    </div>
                  </div>

                  {/* Asignaciones (Enrollments) */}
                  <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl dark:shadow-black/20 transition-all duration-300 border-2 border-amber-100 dark:border-amber-500/20 flex flex-col hover:-translate-y-1 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-amber-50 dark:bg-amber-500/10 rounded-[1rem] flex items-center justify-center border border-amber-100 dark:border-amber-500/20 shadow-inner transition-colors">
                        <BookOpen className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black tracking-widest uppercase rounded-full">
                        Datos Híbridos
                      </span>
                    </div>
                    <div>
                      <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-2 transition-colors">{stats.enrollments}</p>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Vínculos de Asignación</p>
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Conexiones directas Profesor ↔ Estudiante</p>
                    </div>
                  </div>

                  {/* Administradores */}
                  <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl dark:shadow-black/20 transition-all duration-300 border-2 border-rose-100 dark:border-rose-500/20 flex flex-col hover:-translate-y-1 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 rounded-[1rem] flex items-center justify-center border border-rose-100 dark:border-rose-500/20 shadow-inner transition-colors">
                        <Shield className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                      </div>
                      <span className="px-3 py-1 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-black tracking-widest uppercase rounded-full">
                        Staff Crítico
                      </span>
                    </div>
                    <div>
                      <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-2 transition-colors">{stats.admins}</p>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Gestores Globales</p>
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Cuentas con jerarquía de super administrador</p>
                    </div>
                  </div>

                </div>

                {/* 2. OPERACIONES / ACTIONS CARDS */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 p-8 overflow-hidden relative transition-colors">
                   {/* Fondo Abstracto para Action Cards */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 dark:bg-slate-800/30 rounded-bl-full pointer-events-none -z-0"></div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Caja de Herramientas Administrativa</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Generar Profesor */}
                      <button
                        onClick={() => handleCreateUser('teacher')}
                        className="group flex flex-col text-left p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-violet-400 hover:bg-violet-50/50 dark:hover:border-violet-500/50 dark:hover:bg-violet-500/10 hover:shadow-md dark:hover:shadow-black/20 transition-all duration-300 hover:-translate-y-1 focus:outline-none"
                      >
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20 group-hover:scale-110 transition-all">
                          <UserPlus className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                        </div>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-violet-900 dark:group-hover:text-violet-300 transition-colors">Alta Docente</p>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed transition-colors">Otorga accesos y credenciales estructuradas para que un nuevo profesor pueda crear de inmediato contenido para el aula.</p>
                      </button>

                      {/* Generar Estudiante */}
                      <button
                        onClick={() => handleCreateUser('student')}
                        className="group flex flex-col text-left p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10 hover:shadow-md dark:hover:shadow-black/20 transition-all duration-300 hover:-translate-y-1 focus:outline-none"
                      >
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all">
                          <UserPlus className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-emerald-900 dark:group-hover:text-emerald-300 transition-colors">Alta Estudiante</p>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed transition-colors">Inscribe una nueva entidad estudiantil para ser asignada posteriormente a grupos y profesores que requieran instruirlo.</p>
                      </button>

                      {/* Gestión Grupal */}
                      <button
                        onClick={() => navigate('/admin/groups')}
                        className="group flex flex-col text-left p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/10 hover:shadow-md dark:hover:shadow-black/20 transition-all duration-300 hover:-translate-y-1 focus:outline-none"
                      >
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
                          <Users className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        </div>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-blue-900 dark:group-hover:text-blue-300 transition-colors">Módulo de Grupos</p>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed transition-colors">Centraliza, administra y reasigna los grupos de trabajo donde conviven varios estudiantes bajo métricas de clases conjuntas.</p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === PESTAÑA: USUARIOS (TABLA) === */}
            {activeTab === 'users' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300 transition-colors">
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                     <div>
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Directorio del Sistema</h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Maneja, filtra y actualiza todas las entidades de usuarios registradas.</p>
                     </div>
                  </div>
                <UsersTable 
                  users={users} 
                  onRefresh={loadData}
                  onCreateUser={handleCreateUser}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL DE CREACIÓN DE USUARIO (REDIRECCIONA ESTADO) */}
      {showCreateModal && (
        <CreateUserModal
          type={createUserType}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleUserCreated}
        />
      )}
    </div>
  );
};
