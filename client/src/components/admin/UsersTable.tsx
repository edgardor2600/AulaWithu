import { useState } from 'react';
import { adminService, type User } from '../../services/adminService';
import toast from 'react-hot-toast';
import {
  UserPlus,
  Users,
  MoreVertical,
  CheckCircle,
  XCircle,
  Trash2,
  Search,
  Edit3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { EditLevelModal } from './EditLevelModal';

interface UsersTableProps {
  users: User[];
  onRefresh: () => void;
  onCreateUser: (type: 'teacher' | 'student') => void;
}

export const UsersTable = ({ users, onRefresh, onCreateUser }: UsersTableProps) => {
  const [filter, setFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 20;

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

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleFilterChange = (newFilter: 'all' | 'admin' | 'teacher' | 'student') => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Usuarios</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => onCreateUser('teacher')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl shadow-sm transition flex items-center justify-center gap-2 font-bold text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Crear Profesor
          </button>
          <button
            onClick={() => onCreateUser('student')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl shadow-sm transition flex items-center justify-center gap-2 font-bold text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Crear Estudiante
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o usuario..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner"
            />
          </div>

          {/* Role Filter */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'admin', 'teacher', 'student'] as const).map((role) => (
              <button
                key={role}
                onClick={() => handleFilterChange(role)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm border ${
                  filter === role
                    ? 'border-indigo-600 bg-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {role === 'all' ? 'Todos' : role === 'admin' ? 'Admins' : role === 'teacher' ? 'Prof.' : 'Est.'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Nivel Académico</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Último acceso</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                      <Users className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-bold text-lg">No se encontraron usuarios</p>
                      <p className="text-sm">Intenta ajustar tus filtros o buscar otra cosa</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm shadow-black/10 shrink-0"
                          style={{ backgroundColor: user.avatar_color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5 items-start">
                        {getRoleBadge(user.role)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role === 'student' ? (
                        user.level ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-200/50 dark:border-indigo-500/20">
                            📚 {user.level.name}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Sin asignar</span>
                        )
                      ) : (
                        <span className="text-xs font-medium text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-200/50 dark:border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700">
                          <XCircle className="w-3.5 h-3.5" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                      {user.last_login ? (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                          {new Date(user.last_login).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      ) : (
                        'Nunca'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {activeMenu === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg shadow-black/10 dark:shadow-black/40 border border-slate-200 dark:border-slate-800 py-1.5 z-20 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
                              {/* Edit Level - Only for students */}
                              {user.role === 'student' && (
                                <button
                                  onClick={() => {
                                    setEditingUser(user);
                                    setActiveMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2.5 font-medium transition-colors"
                                >
                                  <Edit3 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                  Editar Nivel
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleToggleActive(user)}
                                className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2.5 font-medium transition-colors"
                              >
                                {user.active ? (
                                  <>
                                    <XCircle className="w-4 h-4 text-slate-400" />
                                    <span>Desactivar cuenta</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <span>Activar cuenta</span>
                                  </>
                                )}
                              </button>
                              {user.role !== 'admin' && (
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  className="w-full px-4 py-2.5 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2.5 font-bold transition-colors border-t border-slate-100 dark:border-slate-800 mt-1 pt-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Eliminar Usuario
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Mostrando <span className="text-slate-900 dark:text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="text-slate-900 dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}</span> de <span className="text-slate-900 dark:text-white">{filteredUsers.length}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Level Modal */}
      {editingUser && (
        <EditLevelModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
