import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Layout } from '../components/Layout';
import {
  Users, Clock, CheckCircle, BookOpen, MessageCircle,
  GraduationCap, Calendar, Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { MessageModal } from '../components/messages/MessageModal';
import { messagesService } from '../services/messagesService';

interface StudentInfo {
  assignment_id: string;
  student: {
    id: string;
    name: string;
    username: string;
    avatar_color: string;
    active: boolean;
    last_login: string | null;
    level?: { id: string; name: string; description: string | null };
  };
  assigned_at: string;
  notes: string | null;
}

interface TeacherInfo {
  teacher_id: string;
  teacher_name: string;
  teacher_avatar_color: string;
  assigned_at: string;
  classes_count: number;
}

export const ClassesPage = () => {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    loadData();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [isTeacher, isStudent]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      isTeacher ? loadStudents() : Promise.resolve(),
      isStudent ? loadTeachers() : Promise.resolve(),
      loadConversations(),
    ]);
    setIsLoading(false);
  };

  const loadConversations = async () => {
    try {
      const conversations = await messagesService.getConversations();
      const map: Record<string, number> = {};
      conversations.forEach(c => { if (c.unread_count > 0) map[c.user_id] = c.unread_count; });
      setUnreadMap(map);
    } catch (e) { console.error(e); }
  };

  const loadStudents = async () => {
    try {
      const res = await api.get<{ success: boolean; students: StudentInfo[]; count: number }>('/users/my-students');
      setStudents(res.data.students);
    } catch { toast.error('Error al cargar estudiantes'); }
  };

  const loadTeachers = async () => {
    try {
      const res = await api.get<{ success: boolean; teachers: any[]; count: number }>('/users/my-teachers');
      setTeachers(res.data.teachers);
    } catch { toast.error('Error al cargar profesores'); }
  };

  const getLastLoginText = (lastLogin: string | null) => {
    if (!lastLogin) return 'Nunca';
    const date = new Date(lastLogin);
    if (isNaN(date.getTime())) return 'Nunca';
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days} días`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const getValidDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Sin fecha definida';
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleOpenChat = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setUnreadMap(prev => ({ ...prev, [userId]: 0 }));
  };

  // ── Admin view ─────────────────────────────────────────────────
  if (!isTeacher && !isStudent) {
    return (
      <Layout>
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-sm w-full border border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso restringido</h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Esta sección está disponible exclusivamente para profesores y estudiantes.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Loading ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#f1f5f9] dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/60 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 dark:border-t-indigo-400 rounded-full animate-spin" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Cargando directorio...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#f1f5f9] dark:bg-slate-950 transition-colors duration-300">

        {/* ═══ PAGE HEADER ═══════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800/60 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner border transition-colors ${
                isTeacher ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400'
              }`}>
                {isTeacher
                  ? <GraduationCap className="w-6 h-6" />
                  : <BookOpen className="w-6 h-6" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md transition-colors ${
                    isTeacher ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                  }`}>
                    {isTeacher ? 'Docente' : 'Estudiante'}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {isTeacher ? 'Mis Estudiantes' : 'Directorio de Profesores'}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                  {isTeacher
                    ? 'Supervisa la actividad de tus alumnos y comunícate con ellos'
                    : 'Contacta a tus tutores y revisa tus asignaciones'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CONTENT ══════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-6">

          {/* ══ TEACHER VIEW ══════════════════════════════════════ */}
          {isTeacher && (
            <>
              {students.length === 0 ? (
                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border-2 border-slate-200 dark:border-slate-800 border-dashed p-10 flex flex-col items-center text-center shadow-sm transition-colors">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700/50 shadow-inner">
                    <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Aún no hay estudiantes asignados</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-md">
                    Una vez que un administrador te asigne alumnos a tus clases, emergerán en esta pantalla.
                  </p>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {[
                      { 
                        label: 'Total Matriculados', value: students.length, suffix: 'Alumnos', 
                        icon: <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />, 
                        colorClass: 'text-indigo-900 dark:text-indigo-300', bgClass: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20'
                      },
                      { 
                        label: 'Usuarios Activos', value: students.filter(s => s.student.active).length, suffix: 'En línea', 
                        icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />, 
                        colorClass: 'text-emerald-900 dark:text-emerald-300', bgClass: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                      },
                      { 
                        label: 'Interacción Reciente', value: students.filter(s => s.student.last_login).length, suffix: 'Accesos', 
                        icon: <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />, 
                        colorClass: 'text-amber-900 dark:text-amber-300', bgClass: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                      },
                    ].map((s, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/60 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${s.bgClass} shadow-inner`}>
                          {s.icon}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide mb-0.5">{s.label}</p>
                          <div className="flex items-baseline gap-1.5">
                            <span className={`text-2xl font-extrabold ${s.colorClass}`}>{s.value}</span>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{s.suffix}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Students Grid/List Container */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tus Estudiantes</h2>
                      <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full text-xs font-bold text-slate-600 dark:text-slate-400 shadow-sm transition-colors">
                        {students.length} Registros
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm overflow-hidden transition-colors">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {students.map((item) => {
                          const unread = unreadMap[item.student.id] || 0;
                          return (
                            <div key={item.assignment_id} className="p-4 md:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center gap-4">
                              {/* Left: Avatar */}
                              <div className="relative shrink-0">
                                <div
                                  className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-base shadow-sm border border-white/20 dark:border-white/10"
                                  style={{ backgroundColor: item.student.avatar_color }}
                                >
                                  {item.student.name.charAt(0).toUpperCase()}
                                </div>
                                {unread > 0 && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 dark:bg-rose-500 border-2 border-white dark:border-slate-900 text-white text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center shadow-sm">
                                    {unread > 9 ? '9+' : unread}
                                  </span>
                                )}
                              </div>

                              {/* Middle: User info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate mb-1 flex items-center gap-2 transition-colors">
                                  {item.student.name}
                                  {unread > 0 && (
                                    <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md animate-pulse shrink-0 transition-colors">
                                      {unread} nuevos
                                    </span>
                                  )}
                                </h3>
                                <div className="flex items-center gap-3 flex-wrap text-xs">
                                  <span className="font-semibold text-slate-500 dark:text-slate-400">@{item.student.username}</span>
                                  <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                  <span className={`inline-flex items-center gap-1 font-bold ${item.student.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${item.student.active ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500'}`} />
                                    {item.student.active ? 'Estudiante Activo' : 'Cuenta Inactiva'}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Meta & Action */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                                <div className="flex flex-col justify-center">
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Último inicio
                                  </span>
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {getLastLoginText(item.student.last_login)}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleOpenChat(item.student.id, item.student.name)}
                                  className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 w-full sm:w-auto shadow-sm ${
                                    unread > 0
                                      ? 'bg-rose-500 dark:bg-rose-600 text-white hover:bg-rose-600 dark:hover:bg-rose-500 hover:-translate-y-px shadow-[0_2px_10px_0_rgb(225,29,72,0.3)]'
                                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:-translate-y-px'
                                  }`}
                                >
                                  {unread > 0 ? (
                                    <>
                                      <MessageCircle className="w-4 h-4 fill-white" />
                                      Responder
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3.5 h-3.5" />
                                      Contactar
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ══ STUDENT VIEW ══════════════════════════════════════ */}
          {isStudent && (
            <>
              {teachers.length === 0 ? (
                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border-2 border-slate-200 dark:border-slate-800 border-dashed p-10 flex flex-col items-center text-center shadow-sm transition-colors">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700/50 shadow-inner">
                    <GraduationCap className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Aún no tienes profesores asignados</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-sm">
                    Tu plantilla de docentes aparecerá aquí cuando estés oficialmente inscrito a una de sus clases.
                  </p>
                </div>
              ) : (
                <>
                  {/* Stats row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[
                      {
                        label: 'Plantilla de Tutores', value: teachers.length,
                        icon: <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
                        bgClass: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
                      },
                      {
                        label: 'Clases Asociadas', value: teachers.reduce((sum, t) => sum + t.classes_count, 0),
                        icon: <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
                        bgClass: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                      },
                    ].map((s, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/60 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${s.bgClass} shadow-inner`}>
                          {s.icon}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{s.label}</p>
                          <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{s.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Teacher cards */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tus Profesores</h2>
                      <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full text-xs font-bold text-slate-600 dark:text-slate-400 shadow-sm transition-colors">
                        {teachers.length} Asignados
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {teachers.map((teacher) => {
                        const unread = unreadMap[teacher.teacher_id] || 0;
                        const hasMessages = unread > 0;

                        return (
                          <div
                            key={teacher.teacher_id}
                            onClick={() => handleOpenChat(teacher.teacher_id, teacher.teacher_name)}
                            className={`group relative bg-white dark:bg-slate-900/80 rounded-xl border p-5 cursor-pointer flex flex-col transition-all duration-300 transform hover:-translate-y-1 ${
                              hasMessages
                                ? 'border-rose-300 dark:border-rose-500/50 shadow-[0_4px_20px_rgb(225,29,72,0.1)] dark:shadow-[0_4px_20px_rgb(225,29,72,0.2)] hover:shadow-[0_8px_30px_rgb(225,29,72,0.15)]'
                                : 'border-slate-200 dark:border-slate-800/60 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/50'
                            }`}
                          >
                            {/* Card Body Header */}
                            <div className="flex items-start gap-4 mb-5">
                              <div className="relative shrink-0">
                                <div
                                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm border border-white/20 dark:border-white/10 group-hover:scale-105 transition-transform"
                                  style={{ backgroundColor: teacher.teacher_avatar_color }}
                                >
                                  {teacher.teacher_name.charAt(0).toUpperCase()}
                                </div>
                                {hasMessages && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 dark:bg-rose-500 border-2 border-white dark:border-slate-900 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                    {unread}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {teacher.teacher_name}
                                </h3>
                                <div className="inline-flex mt-1 items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors">
                                  <CheckCircle className="w-3 h-3" /> Titular
                                </div>
                              </div>
                            </div>

                            {/* Info Blocks */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3 flex flex-col justify-center transition-colors">
                                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-0.5 flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" /> Módulos
                                </span>
                                <span className="text-base font-bold text-slate-800 dark:text-slate-200">{teacher.classes_count} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">clases</span></span>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3 flex flex-col justify-center transition-colors">
                                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Desde
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight">
                                  {getValidDate(teacher.assigned_at)}
                                </span>
                              </div>
                            </div>

                            {/* CTA */}
                            <button
                              className={`w-full py-2.5 mt-auto rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 transition-all duration-300 shadow-sm ${
                                hasMessages
                                  ? 'bg-rose-500 font-white text-white hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500 shadow-rose-200 dark:shadow-none'
                                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 group-hover:border-blue-500 dark:group-hover:border-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                              }`}
                            >
                              {hasMessages ? (
                                <>
                                  <MessageCircle className="w-4 h-4 fill-white" />
                                  ¡Tienes mensajes!
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  Abrir Mensajes
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {selectedUserId && (
        <MessageModal
          recipientId={selectedUserId}
          recipientName={selectedUserName}
          onClose={() => {
            setSelectedUserId(null);
            loadConversations();
          }}
        />
      )}
    </Layout>
  );
};
