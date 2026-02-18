import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adminService, type AcademicLevel, type User } from '../services/adminService';
import { classService, type Class, type CreateClassData } from '../services/classService';
import { groupsService, type Group, type GroupStudent } from '../services/groupsService';
import toast from 'react-hot-toast';
import {
  Users,
  Loader2,
  LogOut,
  Layers,
  BookOpen,
  Clock,
  UserPlus,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Search,
} from 'lucide-react';

interface GroupWithDetails extends Group {
  class_title?: string;
  class_description?: string | null;
  teacher_name?: string;
  students?: Array<{ id: string; name: string; username: string }>;
}

export const GroupManagementPage = () => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Create Group Modal
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [levelClasses, setLevelClasses] = useState<Class[]>([]);
  const [groupForm, setGroupForm] = useState({
    classId: '',
    name: '',
    description: '',
    maxStudents: 30,
    scheduleTime: '',
  });

  // Create Class Modal
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classForm, setClassForm] = useState({
    title: '',
    description: '',
    teacherId: '',
  });

  // Edit Group Modal
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupWithDetails | null>(null);
  const [isEditingGroup, setIsEditingGroup] = useState(false);

  // Delete Group Confirmation
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<GroupWithDetails | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // View Students Modal
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [selectedGroupForStudents, setSelectedGroupForStudents] = useState<GroupWithDetails | null>(null);
  const [groupStudents, setGroupStudents] = useState<GroupStudent[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Add Students Modal
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [enrollmentNotes, setEnrollmentNotes] = useState('');
  const [isLoadingAvailableStudents, setIsLoadingAvailableStudents] = useState(false);
  const [isEnrollingStudents, setIsEnrollingStudents] = useState(false);
  const [availableStudentSearchQuery, setAvailableStudentSearchQuery] = useState('');

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

  // Cargar niveles y profesores al montar
  useEffect(() => {
    loadLevels();
    loadTeachers();
  }, []);

  // Cargar grupos cuando se selecciona un nivel
  useEffect(() => {
    if (selectedLevelId) {
      loadGroupsByLevel(selectedLevelId);
    } else {
      setGroups([]);
    }
  }, [selectedLevelId]);

  const loadLevels = async () => {
    setIsLoadingLevels(true);
    try {
      const data = await adminService.getLevels();
      setLevels(data);
    } catch (error) {
      console.error('Error loading levels:', error);
      toast.error('Error al cargar niveles');
    } finally {
      setIsLoadingLevels(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const allUsers = await adminService.getUsers();
      const teacherUsers = allUsers.filter(u => u.role === 'teacher' && u.active);
      setTeachers(teacherUsers);
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const loadGroupsByLevel = async (levelId: string) => {
    setIsLoadingGroups(true);
    try {
      // Cargar todas las clases
      const allClasses = await classService.getAll();
      const levelClassesData = allClasses.filter(c => c.level_id === levelId);
      setLevelClasses(levelClassesData);

      if (levelClassesData.length === 0) {
        setGroups([]);
        return;
      }

      // Cargar grupos de todas las clases en paralelo
      const groupsWithDetails = await Promise.all(
        levelClassesData.map(async (classObj) => {
          try {
            const classGroups = await groupsService.getClassGroups(classObj.id);
            return classGroups.map(g => ({
              ...g,
              class_title: classObj.title,
              class_description: classObj.description,
              teacher_name: classObj.teacher_id,
            }));
          } catch (error) {
            console.error(`Error loading groups for class ${classObj.id}:`, error);
            return [];
          }
        })
      );

      setGroups(groupsWithDetails.flat());
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Error al cargar grupos');
      setGroups([]);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleOpenCreateGroupModal = () => {
    setGroupForm({
      classId: '',
      name: '',
      description: '',
      maxStudents: 30,
      scheduleTime: '',
    });
    setShowCreateGroupModal(true);
  };

  const handleOpenCreateClassModal = () => {
    setClassForm({
      title: '',
      description: '',
      teacherId: '',
    });
    setShowCreateClassModal(true);
  };

  const handleCreateClass = async () => {
    if (!classForm.title.trim()) {
      toast.error('El título de la clase es requerido');
      return;
    }
    if (!classForm.teacherId) {
      toast.error('Selecciona un profesor');
      return;
    }

    setIsCreatingClass(true);
    try {
      const createData: CreateClassData = {
        title: classForm.title,
        description: classForm.description,
        levelId: selectedLevelId,
        teacherId: classForm.teacherId,
      };
      await classService.create(createData);
      toast.success('✅ Clase creada exitosamente');
      setShowCreateClassModal(false);
      // Recargar clases y grupos
      if (selectedLevelId) {
        loadGroupsByLevel(selectedLevelId);
      }
    } catch (error: any) {
      console.error('Error creating class:', error);
      const message = error.response?.data?.error?.message || 'Error al crear clase';
      toast.error(message);
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupForm.classId) {
      toast.error('Selecciona una clase');
      return;
    }
    if (!groupForm.name.trim()) {
      toast.error('El nombre del grupo es requerido');
      return;
    }

    setIsCreatingGroup(true);
    try {
      await groupsService.createGroup(groupForm.classId, {
        name: groupForm.name,
        description: groupForm.description,
        maxStudents: groupForm.maxStudents,
        scheduleTime: groupForm.scheduleTime,
      });
      toast.success('✅ Grupo creado exitosamente');
      setShowCreateGroupModal(false);
      // Recargar grupos
      if (selectedLevelId) {
        loadGroupsByLevel(selectedLevelId);
      }
    } catch (error: any) {
      console.error('Error creating group:', error);
      const message = error.response?.data?.error?.message || 'Error al crear grupo';
      toast.error(message);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const toggleGroupExpanded = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // ============================================
  // EDIT GROUP FUNCTIONS
  // ============================================
  
  const handleOpenEditGroupModal = (group: GroupWithDetails) => {
    setEditingGroup(group);
    setGroupForm({
      classId: group.class_id,
      name: group.name,
      description: group.description || '',
      maxStudents: group.max_students,
      scheduleTime: group.schedule_time || '',
    });
    setShowEditGroupModal(true);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;
    
    if (!groupForm.name.trim()) {
      toast.error('El nombre del grupo es requerido');
      return;
    }

    // Validar que la nueva capacidad no sea menor que el número actual de estudiantes
    const currentStudentCount = editingGroup.student_count || 0;
    if (groupForm.maxStudents < currentStudentCount) {
      toast.error(`No puedes reducir la capacidad por debajo de ${currentStudentCount} (estudiantes actuales)`);
      return;
    }

    setIsEditingGroup(true);
    try {
      await groupsService.updateGroup(editingGroup.id, {
        name: groupForm.name,
        description: groupForm.description,
        maxStudents: groupForm.maxStudents,
        scheduleTime: groupForm.scheduleTime,
      });
      toast.success('✅ Grupo actualizado exitosamente');
      setShowEditGroupModal(false);
      setEditingGroup(null);
      // Recargar grupos
      if (selectedLevelId) {
        loadGroupsByLevel(selectedLevelId);
      }
    } catch (error: any) {
      console.error('Error updating group:', error);
      const message = error.response?.data?.error?.message || 'Error al actualizar grupo';
      toast.error(message);
    } finally {
      setIsEditingGroup(false);
    }
  };

  // ============================================
  // DELETE GROUP FUNCTIONS
  // ============================================
  
  const handleOpenDeleteConfirmation = (group: GroupWithDetails) => {
    setGroupToDelete(group);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    setIsDeletingGroup(true);
    try {
      await groupsService.deleteGroup(groupToDelete.id);
      toast.success('✅ Grupo eliminado exitosamente');
      setShowDeleteConfirmation(false);
      setGroupToDelete(null);
      // Recargar grupos
      if (selectedLevelId) {
        loadGroupsByLevel(selectedLevelId);
      }
    } catch (error: any) {
      console.error('Error deleting group:', error);
      const message = error.response?.data?.error?.message || 'Error al eliminar grupo';
      toast.error(message);
    } finally {
      setIsDeletingGroup(false);
    }
  };

  // ============================================
  // VIEW STUDENTS FUNCTIONS
  // ============================================
  
  const handleOpenViewStudentsModal = async (group: GroupWithDetails) => {
    setSelectedGroupForStudents(group);
    setShowViewStudentsModal(true);
    setStudentSearchQuery('');
    await loadGroupStudents(group.id);
  };

  const loadGroupStudents = async (groupId: string) => {
    setIsLoadingStudents(true);
    try {
      const students = await groupsService.getGroupStudents(groupId);
      setGroupStudents(students);
    } catch (error) {
      console.error('Error loading group students:', error);
      toast.error('Error al cargar estudiantes del grupo');
      setGroupStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!selectedGroupForStudents) return;

    const confirmed = window.confirm(
      `¿Estás seguro de remover a ${studentName} del grupo ${selectedGroupForStudents.name}?`
    );
    
    if (!confirmed) return;

    try {
      await groupsService.unenrollStudent(selectedGroupForStudents.id, studentId);
      toast.success(`✅ ${studentName} removido del grupo`);
      // Recargar estudiantes del grupo
      await loadGroupStudents(selectedGroupForStudents.id);
      // Recargar grupos para actualizar contador
      if (selectedLevelId) {
        loadGroupsByLevel(selectedLevelId);
      }
    } catch (error: any) {
      console.error('Error removing student:', error);
      const message = error.response?.data?.error?.message || 'Error al remover estudiante';
      toast.error(message);
    }
  };

  // ============================================
  // ADD STUDENTS FUNCTIONS
  // ============================================
  
  const handleOpenAddStudentsModal = async (group: GroupWithDetails) => {
    setSelectedGroupForStudents(group);
    setShowAddStudentsModal(true);
    setSelectedStudentIds(new Set());
    setEnrollmentNotes('');
    setAvailableStudentSearchQuery('');
    await loadAvailableStudents(group);
  };

  const loadAvailableStudents = async (group: GroupWithDetails) => {
    setIsLoadingAvailableStudents(true);
    try {
      // Obtener todos los usuarios
      const allUsers = await adminService.getUsers();
      
      // Filtrar solo estudiantes activos
      const students = allUsers.filter(u => u.role === 'student' && u.active);
      
      // Obtener estudiantes ya matriculados en el grupo
      const enrolledStudents = await groupsService.getGroupStudents(group.id);
      const enrolledIds = new Set(enrolledStudents.map(s => s.student.id));
      
      // Filtrar estudiantes que NO están en el grupo
      const available = students.filter(s => !enrolledIds.has(s.id));
      
      setAvailableStudents(available);
    } catch (error) {
      console.error('Error loading available students:', error);
      toast.error('Error al cargar estudiantes disponibles');
      setAvailableStudents([]);
    } finally {
      setIsLoadingAvailableStudents(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    const newSelection = new Set(selectedStudentIds);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudentIds(newSelection);
  };

  const handleEnrollSelectedStudents = async () => {
    if (!selectedGroupForStudents) return;
    if (selectedStudentIds.size === 0) {
      toast.error('Selecciona al menos un estudiante');
      return;
    }

    // Validar capacidad
    const currentCount = selectedGroupForStudents.student_count || 0;
    const maxStudents = selectedGroupForStudents.max_students;
    const availableSpots = maxStudents - currentCount;

    if (selectedStudentIds.size > availableSpots) {
      toast.error(`Solo hay ${availableSpots} plaza(s) disponible(s) en el grupo`);
      return;
    }

    setIsEnrollingStudents(true);
    try {
      // Matricular cada estudiante seleccionado
      const enrollPromises = Array.from(selectedStudentIds).map(studentId =>
        adminService.enrollStudentUnified(
          selectedGroupForStudents.id,
          studentId,
          enrollmentNotes || undefined
        )
      );

      await Promise.all(enrollPromises);
      
      const count = selectedStudentIds.size;
      toast.success(`✅ ${count} estudiante(s) añadido(s) al grupo`);
      
      setShowAddStudentsModal(false);
      setSelectedStudentIds(new Set());
      setEnrollmentNotes('');
      
      // Recargar grupos para actualizar contador
      if (selectedLevelId) {
        loadGroupsByLevel(selectedLevelId);
      }
    } catch (error: any) {
      console.error('Error enrolling students:', error);
      const message = error.response?.data?.error?.message || 'Error al añadir estudiantes';
      toast.error(message);
    } finally {
      setIsEnrollingStudents(false);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getSelectedLevelName = () => {
    const level = levels.find(l => l.id === selectedLevelId);
    return level ? level.name : '';
  };

  const getCapacityColor = (group: Group) => {
    if (!group.student_count) return 'text-green-600';
    const percentage = (group.student_count / group.max_students) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-orange-600';
    return 'text-green-600';
  };

  const getCapacityBarColor = (group: Group) => {
    if (!group.student_count) return 'bg-green-500';
    const percentage = (group.student_count / group.max_students) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackToAdmin = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Gestión de Grupos</h1>
                <p className="text-sm text-gray-500">Organiza estudiantes por grupos y horarios</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleBackToAdmin}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                ← Volver al Panel
              </button>
              <div className="text-right hidden sm:block">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Level Selector */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Selecciona un Nivel Académico
          </label>
          <div className="relative">
            <Layers className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <select
              value={selectedLevelId}
              onChange={(e) => setSelectedLevelId(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition appearance-none bg-white text-base"
              disabled={isLoadingLevels}
            >
              <option value="">Selecciona un nivel para ver sus grupos</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name} - {level.description}
                </option>
              ))}
            </select>
            {isLoadingLevels && (
              <div className="absolute right-3 top-3.5">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Groups Display */}
        {selectedLevelId && (
          <div>
            {isLoadingGroups ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                <p className="text-sm text-gray-600">Cargando grupos...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="bg-amber-50 p-8 rounded-xl border-2 border-dashed border-amber-200">
                <div className="text-center">
                  <Users className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No hay grupos para {getSelectedLevelName()}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    Aún no se han creado grupos para este nivel académico.
                  </p>
                  {levelClasses.length > 0 ? (
                    <>
                      <p className="text-xs text-gray-500 mb-4">
                        Hay {levelClasses.length} clase{levelClasses.length !== 1 ? 's' : ''} disponible{levelClasses.length !== 1 ? 's' : ''} para crear grupos
                      </p>
                      <button
                        onClick={handleOpenCreateGroupModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Crear Primer Grupo
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-4">
                        Primero necesitas crear una clase para este nivel.
                      </p>
                      <button
                        onClick={handleOpenCreateClassModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Crear Clase para {getSelectedLevelName()}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header con resumen */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-blue-900">
                        Grupos de {getSelectedLevelName()}
                      </h2>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-blue-700">
                          {groups.length} grupo{groups.length !== 1 ? 's' : ''} • {' '}
                          {groups.reduce((sum, g) => sum + (g.student_count || 0), 0)} estudiantes • {' '}
                          {groups.reduce((sum, g) => sum + g.max_students, 0)} plazas totales
                        </p>
                      </div>
                    </div>
                    
                    {/* Botón Crear Nuevo Grupo */}
                    <button
                      onClick={async () => {
                        // Cargar clases del nivel antes de abrir el modal
                        setIsLoadingGroups(true);
                        try {
                          const allClasses = await classService.getAll();
                          const classesForLevel = allClasses.filter(c => c.level_id === selectedLevelId);
                          setLevelClasses(classesForLevel);
                          
                          if (classesForLevel.length === 0) {
                            toast.error('No hay clases disponibles para este nivel. Crea una clase primero.');
                            handleOpenCreateClassModal();
                          } else {
                            // Reset form y abrir modal
                            setGroupForm({
                              classId: '',
                              name: '',
                              description: '',
                              maxStudents: 30,
                              scheduleTime: '',
                            });
                            setShowCreateGroupModal(true);
                          }
                        } catch (error) {
                          console.error('Error loading classes:', error);
                          toast.error('Error al cargar clases');
                        } finally {
                          setIsLoadingGroups(false);
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-md hover:shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      Crear Nuevo Grupo
                    </button>
                  </div>
                </div>

                {/* Lista de grupos */}
                <div className="space-y-4">
                  {groups.map((group) => {
                    const isExpanded = expandedGroups.has(group.id);
                    const capacity = group.student_count || 0;
                    const maxCapacity = group.max_students;
                    const availableSeats = maxCapacity - capacity;
                    const isFull = capacity >= maxCapacity;

                    return (
                      <div
                        key={group.id}
                        className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-blue-300 transition"
                      >
                        {/* Group Header */}
                        <div className="p-5 hover:bg-gray-50 transition">
                          <div className="flex items-start justify-between gap-4">
                            {/* Contenido principal - clickeable para expandir */}
                            <div 
                              onClick={() => toggleGroupExpanded(group.id)}
                              className="flex-1 space-y-3 cursor-pointer"
                            >
                              {/* Nombre y estado */}
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-lg font-bold text-gray-900">
                                  {group.name}
                                </h3>
                                {!group.active && (
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold rounded uppercase">
                                    Inactivo
                                  </span>
                                )}
                                {isFull && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded uppercase">
                                    Lleno
                                  </span>
                                )}
                              </div>

                              {/* Clase */}
                              {group.class_title && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                  <span className="text-xs font-semibold text-blue-700">
                                    {group.class_title}
                                  </span>
                                </div>
                              )}

                              {/* Horario y capacidad */}
                              <div className="flex items-center gap-4 flex-wrap">
                                {group.schedule_time && (
                                  <div className="flex items-center gap-1.5 text-gray-600">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium">{group.schedule_time}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold ${getCapacityColor(group)}`}>
                                    {capacity}/{maxCapacity} estudiantes
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    • {availableSeats} disponible{availableSeats !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Barra de capacidad */}
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${getCapacityBarColor(group)}`}
                                  style={{ width: `${(capacity / maxCapacity) * 100}%` }}
                                />
                              </div>
                            </div>

                            {/* Botones de acción y expandir */}
                            <div className="flex items-center gap-2">
                              {/* Botón Editar */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditGroupModal(group);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Editar grupo"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Botón Eliminar */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeleteConfirmation(group);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Eliminar grupo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              {/* Icono expandir - clickeable */}
                              <button
                                onClick={() => toggleGroupExpanded(group.id)}
                                className="p-1 hover:bg-gray-100 rounded transition"
                                title={isExpanded ? "Contraer" : "Expandir"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 bg-gray-50 p-5">
                            <div className="space-y-4">
                              {/* Información adicional */}
                              {group.class_description && (
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Descripción de la clase:</p>
                                  <p className="text-sm text-gray-600">{group.class_description}</p>
                                </div>
                              )}

                              {/* Acciones */}
                              <div className="flex gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAddStudentsModal(group);
                                  }}
                                  disabled={isFull}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Añadir Estudiantes
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenViewStudentsModal(group);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                                >
                                  <Users className="w-4 h-4" />
                                  Ver Estudiantes ({capacity})
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state cuando no hay nivel seleccionado */}
        {!selectedLevelId && !isLoadingLevels && (
          <div className="bg-white p-12 rounded-xl border-2 border-dashed border-gray-300 text-center">
            <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Selecciona un Nivel Académico
            </h3>
            <p className="text-sm text-gray-600">
              Elige un nivel en el selector de arriba para ver y gestionar sus grupos
            </p>
          </div>
        )}
      </main>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Crear Nuevo Grupo para {getSelectedLevelName()}
            </h3>
            
            <div className="space-y-4">
              {/* Clase */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Clase *
                </label>
                <select
                  value={groupForm.classId}
                  onChange={(e) => setGroupForm({ ...groupForm, classId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                  disabled={isCreatingGroup}
                >
                  <option value="">-- Seleccionar Clase --</option>
                  {levelClasses.map((classObj) => (
                    <option key={classObj.id} value={classObj.id}>
                      {classObj.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  El grupo se creará dentro de esta clase
                </p>
              </div>

              {/* Nombre del Grupo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Ej: Grupo Mañana, Grupo A, etc."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  maxLength={100}
                  disabled={isCreatingGroup}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Descripción del grupo..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  maxLength={500}
                  disabled={isCreatingGroup}
                />
              </div>

              {/* Máximo de Estudiantes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Capacidad Máxima
                </label>
                <input
                  type="number"
                  value={groupForm.maxStudents}
                  onChange={(e) => setGroupForm({ ...groupForm, maxStudents: parseInt(e.target.value) || 30 })}
                  min={1}
                  max={100}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={isCreatingGroup}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número máximo de estudiantes permitidos
                </p>
              </div>

              {/* Horario */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Horario de Clase
                </label>
                <select
                  value={groupForm.scheduleTime}
                  onChange={(e) => setGroupForm({ ...groupForm, scheduleTime: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                  disabled={isCreatingGroup}
                >
                  <option value="">-- Seleccionar Horario --</option>
                  <optgroup label="Horarios de Mañana">
                    <option value="08:00-09:00">08:00 - 09:00</option>
                    <option value="09:00-10:00">09:00 - 10:00</option>
                    <option value="10:00-11:00">10:00 - 11:00</option>
                    <option value="11:00-12:00">11:00 - 12:00</option>
                  </optgroup>
                  <optgroup label="Horarios de Tarde/Noche">
                    <option value="14:00-15:00">14:00 - 15:00 (2:00 PM - 3:00 PM)</option>
                    <option value="15:00-16:00">15:00 - 16:00 (3:00 PM - 4:00 PM)</option>
                    <option value="16:00-17:00">16:00 - 17:00 (4:00 PM - 5:00 PM)</option>
                    <option value="17:00-18:00">17:00 - 18:00 (5:00 PM - 6:00 PM)</option>
                    <option value="18:00-19:00">18:00 - 19:00 (6:00 PM - 7:00 PM)</option>
                    <option value="19:00-20:00">19:00 - 20:00 (7:00 PM - 8:00 PM)</option>
                    <option value="20:00-21:00">20:00 - 21:00 (8:00 PM - 9:00 PM)</option>
                    <option value="21:00-22:00">21:00 - 22:00 (9:00 PM - 10:00 PM)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                disabled={isCreatingGroup}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={isCreatingGroup || !groupForm.classId || !groupForm.name.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {isCreatingGroup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Crear Grupo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Crear Nueva Clase para {getSelectedLevelName()}
            </h3>
            
            <div className="space-y-4">
              {/* Título de la Clase */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Título de la Clase *
                </label>
                <input
                  type="text"
                  value={classForm.title}
                  onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                  placeholder="Ej: English A2 - Unit 1"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  maxLength={200}
                  disabled={isCreatingClass}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={classForm.description}
                  onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                  placeholder="Descripción de la clase..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                  maxLength={500}
                  disabled={isCreatingClass}
                />
              </div>

              {/* Profesor */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Profesor Asignado *
                </label>
                <select
                  value={classForm.teacherId}
                  onChange={(e) => setClassForm({ ...classForm, teacherId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none appearance-none bg-white"
                  disabled={isCreatingClass}
                >
                  <option value="">-- Seleccionar Profesor --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} (@{teacher.username})
                    </option>
                  ))}
                </select>
                {teachers.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    No hay profesores disponibles. Crea un profesor primero.
                  </p>
                )}
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-800 leading-relaxed">
                  La clase se creará para el nivel <span className="font-semibold">{getSelectedLevelName()}</span>. Después podrás crear grupos dentro de esta clase.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateClassModal(false)}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                disabled={isCreatingClass}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateClass}
                disabled={isCreatingClass || !classForm.title.trim() || !classForm.teacherId}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {isCreatingClass ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Crear Clase
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: EDITAR GRUPO */}
      {/* ============================================ */}
      {showEditGroupModal && editingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ✏️ Editar Grupo: {editingGroup.name}
            </h3>
            
            <div className="space-y-4">
              {/* Nombre del Grupo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Ej: Grupo Mañana, Grupo A, etc."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  maxLength={100}
                  disabled={isEditingGroup}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Descripción del grupo..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  maxLength={500}
                  disabled={isEditingGroup}
                />
              </div>

              {/* Capacidad Máxima */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Capacidad Máxima
                </label>
                <input
                  type="number"
                  value={groupForm.maxStudents}
                  onChange={(e) => setGroupForm({ ...groupForm, maxStudents: parseInt(e.target.value) || 30 })}
                  min={editingGroup.student_count || 1}
                  max={100}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={isEditingGroup}
                />
                {editingGroup.student_count && editingGroup.student_count > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Actualmente hay {editingGroup.student_count} estudiante(s) matriculado(s)
                  </p>
                )}
              </div>

              {/* Horario */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Horario de Clase
                </label>
                <select
                  value={groupForm.scheduleTime}
                  onChange={(e) => setGroupForm({ ...groupForm, scheduleTime: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                  disabled={isEditingGroup}
                >
                  <option value="">-- Sin horario --</option>
                  <optgroup label="Horarios de Mañana">
                    <option value="08:00-09:00">08:00 - 09:00</option>
                    <option value="09:00-10:00">09:00 - 10:00</option>
                    <option value="10:00-11:00">10:00 - 11:00</option>
                    <option value="11:00-12:00">11:00 - 12:00</option>
                  </optgroup>
                  <optgroup label="Horarios de Tarde/Noche">
                    <option value="14:00-15:00">14:00 - 15:00 (2:00 PM - 3:00 PM)</option>
                    <option value="15:00-16:00">15:00 - 16:00 (3:00 PM - 4:00 PM)</option>
                    <option value="16:00-17:00">16:00 - 17:00 (4:00 PM - 5:00 PM)</option>
                    <option value="17:00-18:00">17:00 - 18:00 (5:00 PM - 6:00 PM)</option>
                    <option value="18:00-19:00">18:00 - 19:00 (6:00 PM - 7:00 PM)</option>
                    <option value="19:00-20:00">19:00 - 20:00 (7:00 PM - 8:00 PM)</option>
                    <option value="20:00-21:00">20:00 - 21:00 (8:00 PM - 9:00 PM)</option>
                    <option value="21:00-22:00">21:00 - 22:00 (9:00 PM - 10:00 PM)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditGroupModal(false);
                  setEditingGroup(null);
                }}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                disabled={isEditingGroup}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateGroup}
                disabled={isEditingGroup || !groupForm.name.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {isEditingGroup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN */}
      {/* ============================================ */}
      {showDeleteConfirmation && groupToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ¿Eliminar Grupo?
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Estás a punto de eliminar el grupo <span className="font-semibold">{groupToDelete.name}</span>.
                </p>
                {groupToDelete.student_count && groupToDelete.student_count > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">⚠️ Advertencia:</span> Este grupo tiene{' '}
                      <span className="font-bold">{groupToDelete.student_count} estudiante(s)</span> matriculado(s).
                      Todos serán desmatriculados automáticamente.
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-3">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setGroupToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                disabled={isDeletingGroup}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={isDeletingGroup}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {isDeletingGroup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Sí, Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: VER ESTUDIANTES */}
      {/* ============================================ */}
      {showViewStudentsModal && selectedGroupForStudents && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    👥 Estudiantes de {selectedGroupForStudents.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {groupStudents.length} estudiante(s) matriculado(s)
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowViewStudentsModal(false);
                    setSelectedGroupForStudents(null);
                    setGroupStudents([]);
                    setStudentSearchQuery('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              {groupStudents.length > 0 && (
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Buscar estudiante..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingStudents ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                  <p className="text-sm text-gray-600">Cargando estudiantes...</p>
                </div>
              ) : groupStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No hay estudiantes matriculados</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Usa el botón "Añadir Estudiantes" para matricular estudiantes
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groupStudents
                    .filter(gs => {
                      if (!studentSearchQuery.trim()) return true;
                      const query = studentSearchQuery.toLowerCase();
                      return (
                        gs.student.name.toLowerCase().includes(query) ||
                        gs.student.username.toLowerCase().includes(query)
                      );
                    })
                    .map((gs) => (
                      <div
                        key={gs.student.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{gs.student.name}</p>
                          <p className="text-sm text-gray-600">@{gs.student.username}</p>
                          {gs.notes && (
                            <p className="text-xs text-gray-500 mt-1 italic">
                              Nota: {gs.notes}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveStudent(gs.student.id, gs.student.name)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowViewStudentsModal(false);
                  setSelectedGroupForStudents(null);
                  setGroupStudents([]);
                  setStudentSearchQuery('');
                }}
                className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: AÑADIR ESTUDIANTES */}
      {/* ============================================ */}
      {showAddStudentsModal && selectedGroupForStudents && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    ➕ Añadir Estudiantes a {selectedGroupForStudents.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Selecciona los estudiantes que deseas matricular
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-gray-600">
                      Capacidad: <span className="font-semibold">
                        {selectedGroupForStudents.student_count || 0}/{selectedGroupForStudents.max_students}
                      </span>
                    </span>
                    <span className="text-green-600 font-semibold">
                      {selectedGroupForStudents.max_students - (selectedGroupForStudents.student_count || 0)} plaza(s) disponible(s)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddStudentsModal(false);
                    setSelectedGroupForStudents(null);
                    setAvailableStudents([]);
                    setSelectedStudentIds(new Set());
                    setEnrollmentNotes('');
                    setAvailableStudentSearchQuery('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              {availableStudents.length > 0 && (
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={availableStudentSearchQuery}
                    onChange={(e) => setAvailableStudentSearchQuery(e.target.value)}
                    placeholder="Buscar estudiante..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingAvailableStudents ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                  <p className="text-sm text-gray-600">Cargando estudiantes disponibles...</p>
                </div>
              ) : availableStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No hay estudiantes disponibles</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Todos los estudiantes activos ya están matriculados en este grupo
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {availableStudents
                      .filter(student => {
                        if (!availableStudentSearchQuery.trim()) return true;
                        const query = availableStudentSearchQuery.toLowerCase();
                        return (
                          student.name.toLowerCase().includes(query) ||
                          student.username.toLowerCase().includes(query)
                        );
                      })
                      .map((student) => (
                        <div
                          key={student.id}
                          onClick={() => toggleStudentSelection(student.id)}
                          className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition ${
                            selectedStudentIds.has(student.id)
                              ? 'bg-blue-50 border-2 border-blue-500'
                              : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.has(student.id)}
                            onChange={() => {}} // Controlled by div onClick
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-600">@{student.username}</p>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Enrollment Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notas de Matrícula (Opcional)
                    </label>
                    <textarea
                      value={enrollmentNotes}
                      onChange={(e) => setEnrollmentNotes(e.target.value)}
                      placeholder="Ej: Estudiante transferido, requiere atención especial, etc."
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                      maxLength={500}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddStudentsModal(false);
                    setSelectedGroupForStudents(null);
                    setAvailableStudents([]);
                    setSelectedStudentIds(new Set());
                    setEnrollmentNotes('');
                    setAvailableStudentSearchQuery('');
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  disabled={isEnrollingStudents}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnrollSelectedStudents}
                  disabled={isEnrollingStudents || selectedStudentIds.size === 0}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {isEnrollingStudents ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Matriculando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Matricular {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
