import { useState } from 'react';
import { adminService, type User } from '../../services/adminService';
import toast from 'react-hot-toast';
import {
  UserPlus,
  Shield,
  GraduationCap,
  Users,
  MoreVertical,
  CheckCircle,
  XCircle,
  Trash2,
  Search,
} from 'lucide-react';

interface UsersTableProps {
  users: User[];
  onRefresh: () => void;
  onCreateUser: (type: 'teacher' | 'student') => void;
}

export const UsersTable = ({ users, onRefresh, onCreateUser }: UsersTableProps) => {
  const [filter, setFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleToggleActive = async (user: User) => {
    try {
      if (user.active) {
        await adminService.deactivateUser(user.id);
        toast.success(`${user.name} desactivado`);
      } else {
        await adminService.activateUser(user.id);
        toast.success(`${user.name} activado`);
      }
      onRefresh();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
    setActiveMenu(null);
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`¿Estás seguro de eliminar a ${user.name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await adminService.deleteUser(user.id);
      toast.success(`${user.name} eliminado`);
      onRefresh();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
    setActiveMenu(null);
  };

  // Filtrar usuarios
  const filteredUsers = users.filter((user) => {
    const matchesRole = filter === 'all' || user.role === filter;
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-5 h-5 text-red-600" />;
      case 'teacher':
        return <GraduationCap className="w-5 h-5 text-purple-600" />;
      case 'student':
        return <Users className="w-5 h-5 text-green-600" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-red-100 text-red-700',
      teacher: 'bg-purple-100 text-purple-700',
      student: 'bg-green-100 text-green-700',
    };
    const labels = {
      admin: 'Admin',
      teacher: 'Profesor',
      student: 'Estudiante',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role as keyof typeof styles]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onCreateUser('teacher')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Crear Profesor
          </button>
          <button
            onClick={() => onCreateUser('student')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Crear Estudiante
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Role Filter */}
          <div className="flex gap-2">
            {(['all', 'admin', 'teacher', 'student'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setFilter(role)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  filter === role
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {role === 'all' ? 'Todos' : role === 'admin' ? 'Admins' : role === 'teacher' ? 'Profesores' : 'Estudiantes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último acceso
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: user.avatar_color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        {getRoleBadge(user.role)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          <XCircle className="w-3 h-3" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                          className="p-1 hover:bg-gray-100 rounded transition"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>

                        {activeMenu === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={() => handleToggleActive(user)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                {user.active ? (
                                  <>
                                    <XCircle className="w-4 h-4 text-gray-500" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Activar
                                  </>
                                )}
                              </button>
                              {user.role !== 'admin' && (
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
