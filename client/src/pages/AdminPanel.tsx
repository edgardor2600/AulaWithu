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
import { AssignmentsPanel } from '../components/admin/AssignmentsPanel';

type TabType = 'stats' | 'users' | 'assignments';

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
                <p className="text-sm text-gray-500">Aula Colaborativa</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">Administrador</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 border-b-2 font-medium text-sm transition flex items-center gap-2 ${
                activeTab === 'stats'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Estadísticas
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 border-b-2 font-medium text-sm transition flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-5 h-5" />
              Usuarios
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`py-4 border-b-2 font-medium text-sm transition flex items-center gap-2 ${
                activeTab === 'assignments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Asignaciones
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Stats Tab */}
            {activeTab === 'stats' && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Total Users */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
                        <p className="text-sm text-gray-500 mt-1">{stats.activeUsers} activos</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Teachers */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Profesores</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.teachers}</p>
                        <p className="text-sm text-gray-500 mt-1">Registrados</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  {/* Students */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Estudiantes</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.students}</p>
                        <p className="text-sm text-gray-500 mt-1">Registrados</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  {/* Assignments */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Asignaciones</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.assignments}</p>
                        <p className="text-sm text-gray-500 mt-1">Profesor-Estudiante</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </div>

                  {/* Admins */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Administradores</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.admins}</p>
                        <p className="text-sm text-gray-500 mt-1">Con acceso completo</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleCreateUser('teacher')}
                      className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition group"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
                        <UserPlus className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Crear Profesor</p>
                        <p className="text-sm text-gray-500">Agregar nuevo profesor al sistema</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleCreateUser('student')}
                      className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition group"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition">
                        <UserPlus className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Crear Estudiante</p>
                        <p className="text-sm text-gray-500">Agregar nuevo estudiante al sistema</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <UsersTable 
                users={users} 
                onRefresh={loadData}
                onCreateUser={handleCreateUser}
              />
            )}

            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
              <AssignmentsPanel />
            )}
          </>
        )}
      </main>

      {/* Create User Modal */}
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
