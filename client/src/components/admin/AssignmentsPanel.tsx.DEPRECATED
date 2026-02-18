import { useState, useEffect } from 'react';
import { adminService, type User, type TeacherStudents } from '../../services/adminService';
import toast from 'react-hot-toast';
import { Link2, UserPlus, Trash2, Loader2, GraduationCap, Users as UsersIcon } from 'lucide-react';

export const AssignmentsPanel = () => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [teacherStudents, setTeacherStudents] = useState<TeacherStudents[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTeacher) {
      loadTeacherStudents();
    }
  }, [selectedTeacher]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allTeachers, allStudents] = await Promise.all([
        adminService.getUsers('teacher'),
        adminService.getUsers('student'),
      ]);
      setTeachers(allTeachers);
      setStudents(allStudents);

      if (allTeachers.length > 0 && !selectedTeacher) {
        setSelectedTeacher(allTeachers[0].id);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeacherStudents = async () => {
    if (!selectedTeacher) return;

    try {
      const assigned = await adminService.getTeacherStudents(selectedTeacher);
      setTeacherStudents(assigned);
    } catch (error) {
      toast.error('Error al cargar estudiantes asignados');
    }
  };

  const handleAssign = async () => {
    if (!selectedStudent || !selectedTeacher) {
      toast.error('Selecciona un estudiante');
      return;
    }

    setIsAssigning(true);
    try {
      await adminService.assignStudent(selectedTeacher, selectedStudent);
      toast.success('Estudiante asignado exitosamente');
      setSelectedStudent('');
      loadTeacherStudents();
    } catch (error) {
      console.error('Error assigning student:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (studentId: string, studentName: string) => {
    if (!confirm(`¿Desasignar a ${studentName}?`)) return;

    try {
      await adminService.unassignStudent(selectedTeacher, studentId);
      toast.success('Estudiante desasignado');
      loadTeacherStudents();
    } catch (error) {
      console.error('Error unassigning student:', error);
    }
  };

  // Filtrar estudiantes no asignados
  const unassignedStudents = students.filter(
    (student) => !teacherStudents.some((ts) => ts.student.id === student.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Asignaciones Profesor-Estudiante</h2>
        <p className="text-sm text-gray-500 mt-1">Gestiona qué estudiantes están asignados a cada profesor</p>
      </div>

      {teachers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
          <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay profesores registrados en el sistema</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Teacher Selection & Assign */}
          <div className="space-y-4">
            {/* Teacher Selector */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Seleccionar Profesor
              </label>
              <div className="space-y-2">
                {teachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => setSelectedTeacher(teacher.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition ${
                      selectedTeacher === teacher.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: teacher.avatar_color }}
                    >
                      {teacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${
                        selectedTeacher === teacher.id ? 'text-purple-900' : 'text-gray-900'
                      }`}>
                        {teacher.name}
                      </p>
                      <p className="text-sm text-gray-500">@{teacher.username}</p>
                    </div>
                    <div className="text-sm font-medium text-gray-600">
                      {teacherStudents.filter((ts) => ts).length || 0} estudiantes
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Assign Student */}
            {selectedTeacher && unassignedStudents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Asignar Nuevo Estudiante
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    disabled={isAssigning}
                  >
                    <option value="">Seleccionar estudiante...</option>
                    {unassignedStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} (@{student.username})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!selectedStudent || isAssigning}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAssigning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Assigned Students */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-600" />
                Estudiantes Asignados
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {teacherStudents.length} estudiante{teacherStudents.length !== 1 ? 's' : ''} asignado
                {teacherStudents.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-6">
              {teacherStudents.length === 0 ? (
                <div className="text-center py-8">
                  <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    No hay estudiantes asignados a este profesor
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teacherStudents.map((item) => (
                    <div
                      key={item.assignment_id}
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
                        onClick={() => handleUnassign(item.student.id, item.student.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Desasignar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
