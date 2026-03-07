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
import { ThemeToggle } from '../components/ThemeToggle';

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


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackToAdmin = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-16 overflow-x-hidden transition-colors duration-300">
      
      {/* === HEADER INMERSIVO E INTERACTIVO (PREMIUM SAAS) === */}
      <header className="bg-slate-900 border-b border-slate-800 relative z-10 shadow-lg pb-12">
        {/* Abstract Dark Layer */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[80px] pointer-events-none mix-blend-screen overflow-hidden" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-6 gap-6">
            
            {/* Logo / Título */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_4px_20px_0_rgb(59,130,246,0.4)] border border-white/20 shrink-0">
                <Users className="w-7 h-7 text-white drop-shadow-sm" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 mb-1">
                   <button
                    onClick={handleBackToAdmin}
                    className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 text-[10px] font-black tracking-widest uppercase border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-all flex items-center gap-1"
                   >
                      ← Volver al Panel
                   </button>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Gestión de Grupos</h1>
              </div>
            </div>

            {/* User Meta / Logout / ThemeToggle */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              <div className="bg-slate-800/80 p-1.5 rounded-[1.25rem] border border-slate-700/60 backdrop-blur-sm shadow-sm hidden sm:block">
                <ThemeToggle />
              </div>

              <div className="flex items-center gap-3 sm:gap-5 bg-slate-800/80 p-2 pr-4 rounded-[1.25rem] border border-slate-700/60 backdrop-blur-sm w-full sm:w-auto overflow-hidden shadow-sm">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative -mt-16 z-20">
        
        {/* Selector de Nivel Moderno */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-slate-200 dark:border-slate-800 p-6 mb-10 flex flex-col md:flex-row items-center gap-6 transition-colors duration-300">
          <div className="flex-1 w-full">
             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
               Selecciona un Eje Académico
             </label>
             <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                 <Layers className="w-5 h-5 text-indigo-400 dark:text-indigo-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
               </div>
               <select
                 value={selectedLevelId}
                 onChange={(e) => setSelectedLevelId(e.target.value)}
                 className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all duration-200 font-bold text-slate-800 dark:text-slate-100 appearance-none hover:border-slate-300 dark:hover:border-slate-600"
                 disabled={isLoadingLevels}
               >
                 <option value="" disabled className="text-slate-400 dark:text-slate-500 font-medium">-- Elige un nivel para analizar sus grupos --</option>
                 {levels.map((level) => (
                   <option key={level.id} value={level.id} className="font-bold text-slate-800 dark:text-slate-100 dark:bg-slate-800">
                     {level.name} - {level.description}
                   </option>
                 ))}
               </select>
               {isLoadingLevels ? (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  </div>
               ) : (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500">▼</span>
                  </div>
               )}
             </div>
          </div>
          
          <div className="hidden md:flex items-center justify-center w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shrink-0 transition-colors">
             <Search className="w-6 h-6 text-slate-300 dark:text-slate-600" />
          </div>
        </div>

        {/* Groups Display */}
        {selectedLevelId && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isLoadingGroups ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="w-12 h-12 border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 dark:border-t-indigo-400 rounded-full animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Localizando grupos formativos...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center shadow-sm relative overflow-hidden transition-colors">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 dark:bg-slate-800/50 rounded-bl-full pointer-events-none -z-0 transition-colors"></div>
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/80 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner transition-colors">
                     <Users className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-2 transition-colors">
                    Sin Formaciones en {getSelectedLevelName()}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto transition-colors">
                    Aún no se ha estructurado ningún grupo operativo para esta área académica.
                  </p>
                  
                  {levelClasses.length > 0 ? (
                    <div className="flex flex-col items-center gap-4">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-black tracking-widest uppercase rounded-full border border-indigo-100 dark:border-indigo-500/20 transition-colors">
                        {levelClasses.length} clase{levelClasses.length !== 1 ? 's' : ''} disponible{levelClasses.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={handleOpenCreateGroupModal}
                        className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:-translate-y-0.5"
                      >
                        <Plus className="w-5 h-5" />
                        Inaugurar Primer Grupo
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-sm font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-100 dark:border-rose-500/20 transition-colors">
                        Sección inoperativa: Requiere crear una clase madre primero.
                      </p>
                      <button
                        onClick={handleOpenCreateClassModal}
                        className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition font-bold shadow-lg shadow-slate-200 dark:shadow-slate-900/50 hover:-translate-y-0.5"
                      >
                        <Plus className="w-5 h-5 text-emerald-400" />
                        Crear Clase para {getSelectedLevelName()}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Dinámico con Resumen */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden transition-colors">
                   <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-indigo-500 to-indigo-400"></div>
                   
                   <div className="pl-4">
                     <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-1 transition-colors">
                       Panel de Control: <span className="text-indigo-600 dark:text-indigo-400">{getSelectedLevelName()}</span>
                     </h2>
                     <div className="flex flex-wrap items-center gap-3 mt-3">
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors">
                         <span className="w-2 h-2 rounded-full bg-slate-800 dark:bg-slate-400"></span> {groups.length} grupo{groups.length !== 1 ? 's' : ''}
                       </span>
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-md text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 transition-colors">
                         <Users className="w-3.5 h-3.5" /> {groups.reduce((sum, g) => sum + (g.student_count || 0), 0)} matrículas
                       </span>
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 rounded-md text-xs font-bold text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 transition-colors">
                         <BookOpen className="w-3.5 h-3.5" /> {groups.reduce((sum, g) => sum + g.max_students, 0)} plazas de capacidad
                       </span>
                     </div>
                   </div>
                   
                   <button
                     onClick={async () => {
                       setIsLoadingGroups(true);
                       try {
                         const allClasses = await classService.getAll();
                         const classesForLevel = allClasses.filter(c => c.level_id === selectedLevelId);
                         setLevelClasses(classesForLevel);
                         
                         if (classesForLevel.length === 0) {
                           toast.error('No hay clases disponibles para este nivel. Crea una clase primero.');
                           handleOpenCreateClassModal();
                         } else {
                           setGroupForm({ classId: '', name: '', description: '', maxStudents: 30, scheduleTime: '' });
                           setShowCreateGroupModal(true);
                         }
                       } catch (error) {
                         toast.error('Error al cargar clases');
                       } finally {
                         setIsLoadingGroups(false);
                       }
                     }}
                     className="shrink-0 inline-flex items-center gap-2 px-5 py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 w-full sm:w-auto justify-center"
                   >
                     <Plus className="w-5 h-5 bg-white/20 rounded-md p-0.5" />
                     Estructurar Nuevo Grupo
                   </button>
                </div>

                {/* Grid Vibrante de Grupos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {groups.map((group) => {
                    const isExpanded = expandedGroups.has(group.id);
                    const capacity = group.student_count || 0;
                    const maxCapacity = group.max_students;
                    const isFull = capacity >= maxCapacity;
                    
                    // Colores refinados para barras
                    const getRefinedBarColor = () => {
                        if (!capacity) return 'bg-emerald-400';
                        const p = (capacity / maxCapacity) * 100;
                        if (p >= 90) return 'bg-rose-500';
                        if (p >= 70) return 'bg-amber-400';
                        return 'bg-emerald-400';
                    };

                    return (
                      <div
                        key={group.id}
                        className={`bg-white dark:bg-slate-900 rounded-[1.5rem] border-2 overflow-hidden transition-all duration-300 hover:shadow-xl dark:hover:shadow-black/20 hover:-translate-y-1 ${isExpanded ? 'border-indigo-400 dark:border-indigo-500 shadow-md transform -translate-y-1' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/50'}`}
                      >
                        {/* Group Header - Clickeable */}
                        <div className="p-5 sm:p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => toggleGroupExpanded(group.id)}>
                          
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            
                            <div className="flex-1 space-y-4">
                              {/* Nombre y Badges Premium */}
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                                  {group.name}
                                </h3>
                                {!group.active && (
                                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black tracking-widest uppercase rounded-md border border-slate-200 dark:border-slate-700 transition-colors">
                                    Pausado
                                  </span>
                                )}
                                {isFull && (
                                  <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black tracking-widest uppercase rounded-md border border-rose-200 dark:border-rose-500/20 flex items-center gap-1 transition-colors">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Capacidad Máxima
                                  </span>
                                )}
                              </div>

                              {/* Clase Info Pill */}
                              {group.class_title && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg max-w-full transition-colors">
                                  <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                                    {group.class_title}
                                  </span>
                                </div>
                              )}

                              {/* Métricas e info táctica */}
                              <div className="flex items-center gap-6 flex-wrap pt-2">
                                {group.schedule_time && (
                                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md shadow-sm transition-colors">
                                    <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                    <span className="text-sm font-bold">{group.schedule_time}</span>
                                  </div>
                                )}
                                
                                <div className="flex flex-col gap-1 w-full sm:w-auto flex-1 max-w-[200px]">
                                   <div className="flex justify-between items-center w-full">
                                     <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide transition-colors">Ocupación</span>
                                     <span className="text-xs font-black text-slate-800 dark:text-slate-100 transition-colors">{capacity}/{maxCapacity}</span>
                                   </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden shadow-inner isolate transition-colors">
                                    <div
                                      className={`h-full rounded-full transition-all duration-1000 ease-out ${getRefinedBarColor()}`}
                                      style={{ width: `${(capacity / maxCapacity) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Chevron Toggle */}
                            <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 self-end sm:self-start transition-colors">
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> : <ChevronDown className="w-5 h-5" />}
                            </div>

                          </div>
                        </div>

                        {/* Panel de Opciones Expandido */}
                        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-5 sm:p-6 transition-colors">
                            <div className="space-y-4">
                              {/* Acciones Rápidas */}
                              <div className="flex items-center gap-2">
                                {/* Botón Editar */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditGroupModal(group);
                                  }}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
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
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="Eliminar grupo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Información adicional */}
                              {group.class_description && (
                                <div className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors">
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Descripción de la clase:</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">{group.class_description}</p>
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
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Añadir Estudiantes
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenViewStudentsModal(group);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-md"
                                >
                                  <Users className="w-4 h-4" />
                                  Ver Estudiantes ({capacity})
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
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
          <div className="bg-white dark:bg-slate-900 p-12 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-800 text-center shadow-sm transition-colors">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/80 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner transition-colors">
               <Layers className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight transition-colors">
              Selecciona un Eje Académico
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm mx-auto transition-colors">
              Elige un nivel en el selector superior para analizar y estructurar sus formaciones grupales.
            </p>
          </div>
        )}
      </main>
    
      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-black/60 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 transition-colors">
              Crear Nuevo Grupo para <span className="text-indigo-600 dark:text-indigo-400">{getSelectedLevelName()}</span>
            </h3>
            
            <div className="space-y-4">
              {/* Clase */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Clase *
                </label>
                <select
                  value={groupForm.classId}
                  onChange={(e) => setGroupForm({ ...groupForm, classId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none appearance-none transition-colors text-slate-800 dark:text-slate-100"
                  disabled={isCreatingGroup}
                >
                  <option value="" disabled className="text-slate-400 dark:text-slate-500">-- Seleccionar Clase --</option>
                  {levelClasses.map((classObj) => (
                    <option key={classObj.id} value={classObj.id} className="text-slate-800 dark:text-slate-100 dark:bg-slate-800">
                      {classObj.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 transition-colors">
                  El grupo se creará dentro de esta clase
                </p>
              </div>

              {/* Nombre del Grupo */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Ej: Grupo Mañana, Grupo A, etc."
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-colors text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  maxLength={100}
                  disabled={isCreatingGroup}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Descripción del grupo..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none resize-none transition-colors text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  maxLength={500}
                  disabled={isCreatingGroup}
                />
              </div>

              {/* Máximo de Estudiantes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Capacidad Máxima
                </label>
                <input
                  type="number"
                  value={groupForm.maxStudents}
                  onChange={(e) => setGroupForm({ ...groupForm, maxStudents: parseInt(e.target.value) || 30 })}
                  min={1}
                  max={100}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-colors text-slate-800 dark:text-slate-100"
                  disabled={isCreatingGroup}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 transition-colors">
                  Número máximo de estudiantes permitidos
                </p>
              </div>

              {/* Horario */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Horario de Clase
                </label>
                <select
                  value={groupForm.scheduleTime}
                  onChange={(e) => setGroupForm({ ...groupForm, scheduleTime: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none appearance-none transition-colors text-slate-800 dark:text-slate-100"
                  disabled={isCreatingGroup}
                >
                  <option value="" className="text-slate-400 dark:text-slate-500">-- Seleccionar Horario --</option>
                  <optgroup label="Horarios de Mañana" className="font-bold text-slate-800 dark:text-slate-100 dark:bg-slate-800">
                    <option value="08:00-09:00" className="font-normal text-slate-800 dark:text-slate-100">08:00 - 09:00</option>
                    <option value="09:00-10:00" className="font-normal text-slate-800 dark:text-slate-100">09:00 - 10:00</option>
                    <option value="10:00-11:00" className="font-normal text-slate-800 dark:text-slate-100">10:00 - 11:00</option>
                    <option value="11:00-12:00" className="font-normal text-slate-800 dark:text-slate-100">11:00 - 12:00</option>
                  </optgroup>
                  <optgroup label="Horarios de Tarde/Noche" className="font-bold text-slate-800 dark:text-slate-100 dark:bg-slate-800">
                    <option value="14:00-15:00" className="font-normal text-slate-800 dark:text-slate-100">14:00 - 15:00 (2:00 PM - 3:00 PM)</option>
                    <option value="15:00-16:00" className="font-normal text-slate-800 dark:text-slate-100">15:00 - 16:00 (3:00 PM - 4:00 PM)</option>
                    <option value="16:00-17:00" className="font-normal text-slate-800 dark:text-slate-100">16:00 - 17:00 (4:00 PM - 5:00 PM)</option>
                    <option value="17:00-18:00" className="font-normal text-slate-800 dark:text-slate-100">17:00 - 18:00 (5:00 PM - 6:00 PM)</option>
                    <option value="18:00-19:00" className="font-normal text-slate-800 dark:text-slate-100">18:00 - 19:00 (6:00 PM - 7:00 PM)</option>
                    <option value="19:00-20:00" className="font-normal text-slate-800 dark:text-slate-100">19:00 - 20:00 (7:00 PM - 8:00 PM)</option>
                    <option value="20:00-21:00" className="font-normal text-slate-800 dark:text-slate-100">20:00 - 21:00 (8:00 PM - 9:00 PM)</option>
                    <option value="21:00-22:00" className="font-normal text-slate-800 dark:text-slate-100">21:00 - 22:00 (9:00 PM - 10:00 PM)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-8 pt-5 border-t border-slate-200 dark:border-slate-800 transition-colors">
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold"
                disabled={isCreatingGroup}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={isCreatingGroup || !groupForm.classId || !groupForm.name.trim()}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md hover:-translate-y-0.5"
              >
                {isCreatingGroup ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-black/60 max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 transition-colors">
              Crear Nueva Clase para <span className="text-emerald-600 dark:text-emerald-400">{getSelectedLevelName()}</span>
            </h3>
            
            <div className="space-y-4">
              {/* Título de la Clase */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Título de la Clase *
                </label>
                <input
                  type="text"
                  value={classForm.title}
                  onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                  placeholder="Ej: English A2 - Unit 1"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none transition-colors text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  maxLength={200}
                  disabled={isCreatingClass}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={classForm.description}
                  onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                  placeholder="Descripción de la clase..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none resize-none transition-colors text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  maxLength={500}
                  disabled={isCreatingClass}
                />
              </div>

              {/* Profesor */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Profesor Asignado *
                </label>
                <select
                  value={classForm.teacherId}
                  onChange={(e) => setClassForm({ ...classForm, teacherId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none appearance-none transition-colors text-slate-800 dark:text-slate-100"
                  disabled={isCreatingClass}
                >
                  <option value="" disabled className="text-slate-400 dark:text-slate-500">-- Seleccionar Profesor --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id} className="text-slate-800 dark:text-slate-100 dark:bg-slate-800">
                      {teacher.name} (@{teacher.username})
                    </option>
                  ))}
                </select>
                {teachers.length === 0 && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 transition-colors">
                    No hay profesores disponibles. Crea un profesor primero.
                  </p>
                )}
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl transition-colors">
                <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0 transition-colors" />
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed transition-colors">
                  La clase se creará para el nivel <span className="font-bold">{getSelectedLevelName()}</span>. Después podrás crear grupos dentro de esta clase.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-8 pt-5 border-t border-slate-200 dark:border-slate-800 transition-colors">
              <button
                onClick={() => setShowCreateClassModal(false)}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold"
                disabled={isCreatingClass}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateClass}
                disabled={isCreatingClass || !classForm.title.trim() || !classForm.teacherId}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md hover:-translate-y-0.5"
              >
                {isCreatingClass ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-black/60 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 transition-colors">
              ✏️ Editar Grupo: <span className="text-indigo-600 dark:text-indigo-400">{editingGroup.name}</span>
            </h3>
            
            <div className="space-y-4">
              {/* Nombre del Grupo */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Ej: Grupo Mañana, Grupo A, etc."
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-colors text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  maxLength={100}
                  disabled={isEditingGroup}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Descripción del grupo..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none resize-none transition-colors text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  maxLength={500}
                  disabled={isEditingGroup}
                />
              </div>

              {/* Capacidad Máxima */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Capacidad Máxima
                </label>
                <input
                  type="number"
                  value={groupForm.maxStudents}
                  onChange={(e) => setGroupForm({ ...groupForm, maxStudents: parseInt(e.target.value) || 30 })}
                  min={editingGroup.student_count || 1}
                  max={100}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-colors text-slate-800 dark:text-slate-100"
                  disabled={isEditingGroup}
                />
                {editingGroup.student_count && editingGroup.student_count > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1.5 transition-colors">
                    ⚠️ Actualmente hay <span className="font-bold">{editingGroup.student_count}</span> estudiante(s) matriculado(s)
                  </p>
                )}
              </div>

              {/* Horario */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                  Horario de Clase
                </label>
                <select
                  value={groupForm.scheduleTime}
                  onChange={(e) => setGroupForm({ ...groupForm, scheduleTime: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none appearance-none transition-colors text-slate-800 dark:text-slate-100"
                  disabled={isEditingGroup}
                >
                  <option value="" className="text-slate-400 dark:text-slate-500">-- Sin horario --</option>
                  <optgroup label="Horarios de Mañana" className="font-bold text-slate-800 dark:text-slate-100 dark:bg-slate-800">
                    <option value="08:00-09:00" className="font-normal text-slate-800 dark:text-slate-100">08:00 - 09:00</option>
                    <option value="09:00-10:00" className="font-normal text-slate-800 dark:text-slate-100">09:00 - 10:00</option>
                    <option value="10:00-11:00" className="font-normal text-slate-800 dark:text-slate-100">10:00 - 11:00</option>
                    <option value="11:00-12:00" className="font-normal text-slate-800 dark:text-slate-100">11:00 - 12:00</option>
                  </optgroup>
                  <optgroup label="Horarios de Tarde/Noche" className="font-bold text-slate-800 dark:text-slate-100 dark:bg-slate-800">
                    <option value="14:00-15:00" className="font-normal text-slate-800 dark:text-slate-100">14:00 - 15:00 (2:00 PM - 3:00 PM)</option>
                    <option value="15:00-16:00" className="font-normal text-slate-800 dark:text-slate-100">15:00 - 16:00 (3:00 PM - 4:00 PM)</option>
                    <option value="16:00-17:00" className="font-normal text-slate-800 dark:text-slate-100">16:00 - 17:00 (4:00 PM - 5:00 PM)</option>
                    <option value="17:00-18:00" className="font-normal text-slate-800 dark:text-slate-100">17:00 - 18:00 (5:00 PM - 6:00 PM)</option>
                    <option value="18:00-19:00" className="font-normal text-slate-800 dark:text-slate-100">18:00 - 19:00 (6:00 PM - 7:00 PM)</option>
                    <option value="19:00-20:00" className="font-normal text-slate-800 dark:text-slate-100">19:00 - 20:00 (7:00 PM - 8:00 PM)</option>
                    <option value="20:00-21:00" className="font-normal text-slate-800 dark:text-slate-100">20:00 - 21:00 (8:00 PM - 9:00 PM)</option>
                    <option value="21:00-22:00" className="font-normal text-slate-800 dark:text-slate-100">21:00 - 22:00 (9:00 PM - 10:00 PM)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-8 pt-5 border-t border-slate-200 dark:border-slate-800 transition-colors">
              <button
                onClick={() => {
                  setShowEditGroupModal(false);
                  setEditingGroup(null);
                }}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold"
                disabled={isEditingGroup}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateGroup}
                disabled={isEditingGroup || !groupForm.name.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md hover:-translate-y-0.5"
              >
                {isEditingGroup ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Edit2 className="w-5 h-5" />
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-black/60 max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-full transition-colors">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 transition-colors">
                  ¿Eliminar Grupo?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 transition-colors">
                  Estás a punto de eliminar el grupo <span className="font-bold text-slate-800 dark:text-slate-200">{groupToDelete.name}</span>.
                </p>
                {groupToDelete.student_count && groupToDelete.student_count > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl transition-colors">
                    <p className="text-sm text-amber-800 dark:text-amber-400 transition-colors">
                      <span className="font-bold">⚠️ Advertencia:</span> Este grupo tiene{' '}
                      <span className="font-black">{groupToDelete.student_count} estudiante(s)</span> matriculado(s).
                      Todos serán desmatriculados automáticamente.
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-3 transition-colors">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 transition-colors">
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setGroupToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold"
                disabled={isDeletingGroup}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={isDeletingGroup}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md hover:-translate-y-0.5"
              >
                {isDeletingGroup ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-black/60 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 transition-colors">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1 transition-colors">
                    👥 Estudiantes de <span className="text-indigo-600 dark:text-indigo-400">{selectedGroupForStudents.name}</span>
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">
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
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              {groupStudents.length > 0 && (
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Buscar estudiante..."
                    className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-colors bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
              {isLoadingStudents ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Cargando estudiantes...</p>
                </div>
              ) : groupStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4 transition-colors" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium transition-colors">No hay estudiantes matriculados</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 transition-colors">
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
                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors shadow-sm"
                      >
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100 transition-colors">{gs.student.name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">@{gs.student.username}</p>
                          {gs.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1.5 italic transition-colors">
                              Nota: {gs.notes}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveStudent(gs.student.id, gs.student.name)}
                          className="px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors font-bold"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
              <button
                onClick={() => {
                  setShowViewStudentsModal(false);
                  setSelectedGroupForStudents(null);
                  setGroupStudents([]);
                  setStudentSearchQuery('');
                }}
                className="w-full px-4 py-3 bg-slate-800 dark:bg-slate-800 text-white rounded-xl hover:bg-slate-900 dark:hover:bg-slate-700 transition-colors font-bold shadow-md hover:-translate-y-0.5"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: AÑADIR ESTUDIANTES */}
      {/* ============================================ */}
      {showAddStudentsModal && selectedGroupForStudents && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-black/60 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 transition-colors">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1 transition-colors">
                    ➕ Añadir Estudiantes a <span className="text-emerald-600 dark:text-emerald-400">{selectedGroupForStudents.name}</span>
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">
                    Selecciona los estudiantes que deseas matricular
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-slate-600 dark:text-slate-400 transition-colors">
                      Capacidad: <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedGroupForStudents.student_count || 0}/{selectedGroupForStudents.max_students}
                      </span>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-500 font-bold transition-colors">
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
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              {availableStudents.length > 0 && (
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={availableStudentSearchQuery}
                    onChange={(e) => setAvailableStudentSearchQuery(e.target.value)}
                    placeholder="Buscar estudiante..."
                    className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none transition-colors bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
              {isLoadingAvailableStudents ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">Cargando estudiantes disponibles...</p>
                </div>
              ) : availableStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4 transition-colors" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium transition-colors">No hay estudiantes disponibles</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 transition-colors">
                    Todos los estudiantes activos ya están matriculados en este grupo
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-6">
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
                          className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors border shadow-sm ${
                            selectedStudentIds.has(student.id)
                              ? 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-500 dark:border-emerald-500'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 hover:border-emerald-200 dark:hover:border-emerald-500/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.has(student.id)}
                            onChange={() => {}} // Controlled by div onClick
                            className="w-5 h-5 text-emerald-600 dark:text-emerald-500 rounded border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 dark:bg-slate-700 transition"
                          />
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100 transition-colors">{student.name}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">@{student.username}</p>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Enrollment Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
                      Notas de Matrícula (Opcional)
                    </label>
                    <textarea
                      value={enrollmentNotes}
                      onChange={(e) => setEnrollmentNotes(e.target.value)}
                      placeholder="Ej: Estudiante transferido, requiere atención especial, etc."
                      rows={2}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none resize-none transition-colors text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                      maxLength={500}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
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
                  className="flex-1 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold"
                  disabled={isEnrollingStudents}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnrollSelectedStudents}
                  disabled={isEnrollingStudents || selectedStudentIds.size === 0}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md hover:-translate-y-0.5"
                >
                  {isEnrollingStudents ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Matriculando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
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
