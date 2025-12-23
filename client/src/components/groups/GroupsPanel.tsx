import { useState, useEffect } from 'react';
import { groupsService, type Group, type GroupStudent } from '../../services/groupsService';
import { adminService, type User } from '../../services/adminService';
import { usersService } from '../../services/usersService';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  X,
  Loader2,
} from 'lucide-react';

interface GroupsPanelProps {
  classId: string;
  className: string;
}

export const GroupsPanel = ({ classId, className }: GroupsPanelProps) => {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupStudents, setGroupStudents] = useState<GroupStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  // Create/Edit Group Modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    maxStudents: 30,
  });

  // Enroll Student Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollNotes, setEnrollNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [classId]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupStudents(selectedGroup);
    }
  }, [selectedGroup]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load groups
      const groupsData = await groupsService.getClassGroups(classId);
      setGroups(groupsData);

      // Load students based on user role
      if (user?.role === 'admin') {
        // Admins can see all students
        try {
          const studentsData = await adminService.getUsers('student');
          setAvailableStudents(studentsData.filter((s) => s.active));
        } catch (error) {
          console.error('Error loading students:', error);
          setAvailableStudents([]);
        }
      } else if (user?.role === 'teacher') {
        // Teachers see only their assigned students
        try {
          const teacherStudents = await usersService.getMyStudents();
          // Convert to User format
          const students: User[] = teacherStudents
            .filter(ts => ts.student.active)
            .map(ts => ({
              id: ts.student.id,
              name: ts.student.name,
              username: ts.student.username,
              role: 'student' as const,
              avatar_color: ts.student.avatar_color,
              active: true,
              created_at: ts.assigned_at,
              password_hash: null,
              last_login: ts.student.last_login || undefined,
            }));
          setAvailableStudents(students);
        } catch (error) {
          console.error('Error loading assigned students:', error);
          setAvailableStudents([]);
        }
      } else {
        setAvailableStudents([]);
      }
      
      if (groupsData.length > 0 && !selectedGroup) {
        setSelectedGroup(groupsData[0].id);
      }
    } catch (error) {
      toast.error('Error al cargar grupos');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroupStudents = async (groupId: string) => {
    try {
      const students = await groupsService.getGroupStudents(groupId);
      setGroupStudents(students);
    } catch (error) {
      toast.error('Error al cargar estudiantes del grupo');
      console.error(error);
    }
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: '', description: '', maxStudents: 30 });
    setShowGroupModal(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description || '',
      maxStudents: group.max_students,
    });
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      toast.error('El nombre del grupo es requerido');
      return;
    }

    setIsCreating(true);
    try {
      if (editingGroup) {
        await groupsService.updateGroup(editingGroup.id, groupForm);
        toast.success('Grupo actualizado exitosamente');
      } else {
        await groupsService.createGroup(classId, groupForm);
        toast.success('Grupo creado exitosamente');
      }
      setShowGroupModal(false);
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Error al guardar grupo';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(`¿Eliminar el grupo "${group.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await groupsService.deleteGroup(group.id);
      toast.success('Grupo eliminado');
      loadData();
      if (selectedGroup === group.id) {
        setSelectedGroup(null);
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Error al eliminar grupo';
      toast.error(message);
    }
  };

  const handleEnrollStudent = async () => {
    if (!enrollStudentId) {
      toast.error('Selecciona un estudiante');
      return;
    }

    if (!selectedGroup) return;

    setIsEnrolling(true);
    try {
      await groupsService.enrollStudent(selectedGroup, enrollStudentId, enrollNotes);
      toast.success('Estudiante inscrito exitosamente');
      setShowEnrollModal(false);
      setEnrollStudentId('');
      setEnrollNotes('');
      loadGroupStudents(selectedGroup);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Error al inscribir estudiante';
      toast.error(message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleUnenrollStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`¿Desinscribir a ${studentName} del grupo?`)) return;
    if (!selectedGroup) return;

    try {
      await groupsService.unenrollStudent(selectedGroup, studentId);
      toast.success('Estudiante desinscrito');
      loadGroupStudents(selectedGroup);
    } catch (error) {
      toast.error('Error al desinscribir estudiante');
    }
  };

  const getUnassignedStudents = () => {
    const enrolledIds = new Set(groupStudents.map((gs) => gs.student.id));
    return availableStudents.filter((s) => !enrolledIds.has(s.id));
  };

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Grupos de {className}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Organiza tus estudiantes en grupos para mejor gestión
          </p>
        </div>
        <button
          onClick={handleCreateGroup}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Crear Grupo
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay grupos creados</h3>
          <p className="text-gray-600 mb-4">Crea tu primer grupo para organizar a tus estudiantes</p>
          <button
            onClick={handleCreateGroup}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Crear Primer Grupo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Groups List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Grupos ({groups.length})</h3>
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                  selectedGroup === group.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className={`font-medium ${
                      selectedGroup === group.id ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {group.name}
                    </h4>
                    {group.description && (
                      <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditGroup(group);
                      }}
                      className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded transition"
                      title="Editar grupo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group);
                      }}
                      className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-100 rounded transition"
                      title="Eliminar grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {group.student_count || 0} / {group.max_students} estudiantes
                  </span>
                  {(group.student_count || 0) >= group.max_students && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      Lleno
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right: Group Details */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
            {selectedGroupData ? (
              <>
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedGroupData.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {groupStudents.length} estudiante{groupStudents.length !== 1 ? 's' : ''} inscrito{groupStudents.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {getUnassignedStudents().length > 0 && (
                      <button
                        onClick={() => setShowEnrollModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        <UserPlus className="w-4 h-4" />
                        Inscribir Estudiante
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {groupStudents.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No hay estudiantes inscritos en este grupo</p>
                      {getUnassignedStudents().length > 0 && (
                        <button
                          onClick={() => setShowEnrollModal(true)}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <UserPlus className="w-4 h-4" />
                          Inscribir Primer Estudiante
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupStudents.map((item) => (
                        <div
                          key={item.enrollment_id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                              style={{ backgroundColor: item.student.avatar_color }}
                            >
                              {item.student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{item.student.name}</p>
                              <p className="text-sm text-gray-500">@{item.student.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnenrollStudent(item.student.id, item.student.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Desinscribir"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-gray-500">
                Selecciona un grupo para ver detalles
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {editingGroup ? 'Editar Grupo' : 'Crear Nuevo Grupo'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Ej: Grupo Mañana"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Descripción opcional del grupo"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Estudiantes
                </label>
                <input
                  type="number"
                  value={groupForm.maxStudents}
                  onChange={(e) => setGroupForm({ ...groupForm, maxStudents: parseInt(e.target.value) || 30 })}
                  min={1}
                  max={100}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGroupModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                disabled={isCreating}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingGroup ? 'Actualizar' : 'Crear Grupo'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Inscribir Estudiante a {selectedGroupData?.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Estudiante *
                </label>
                <select
                  value={enrollStudentId}
                  onChange={(e) => setEnrollStudentId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {getUnassignedStudents().map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} (@{student.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={enrollNotes}
                  onChange={(e) => setEnrollNotes(e.target.value)}
                  placeholder="Notas sobre el estudiante"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollStudentId('');
                  setEnrollNotes('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                disabled={isEnrolling}
              >
                Cancelar
              </button>
              <button
                onClick={handleEnrollStudent}
                disabled={isEnrolling || !enrollStudentId}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isEnrolling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Inscribiendo...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Inscribir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
