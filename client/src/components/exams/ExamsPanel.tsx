import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsService, type Exam } from '../../services/examsService';
import toast from 'react-hot-toast';
import {
  Plus, ClipboardList, Eye, Edit2, Loader2, X, BarChart2,
  Clock, CheckCircle2, Lock, PlayCircle, Calendar, ChevronRight
} from 'lucide-react';

interface ExamsPanelProps {
  classId: string;
  isTeacher?: boolean;
}

const STATUS_CONFIG = {
  draft:  { label: 'Borrador',  cls: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' },
  active: { label: 'Disponible', cls: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' },
  closed: { label: 'Cerrado',   cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
};

export const ExamsPanel = ({ classId, isTeacher = false }: ExamsPanelProps) => {
  const navigate = useNavigate();
  const [exams, setExams]       = useState<Exam[]>([]);
  const [loading, setLoading]   = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setExams(await examsService.getExamsByClass(classId)); }
    catch { toast.error('Error al cargar exámenes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [classId]);

  const handleClose = async (exam: Exam) => {
    if (!confirm(`¿Cerrar el examen "${exam.title}"? Los estudiantes ya no podrán enviarlo.`)) return;
    setClosingId(exam.id);
    try {
      await examsService.closeExam(exam.id);
      toast.success('Examen cerrado');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Error al cerrar');
    } finally { setClosingId(null); }
  };

  const formatWindow = (exam: Exam) => {
    if (!exam.available_from && !exam.available_to) return null;
    const fmt = (d: string) => new Date(d).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    return `${exam.available_from ? fmt(exam.available_from) : 'Ahora'} → ${exam.available_to ? fmt(exam.available_to) : 'Sin cierre'}`;
  };

  const isOpen = (exam: Exam) => {
    const now = Date.now();
    if (exam.available_from && new Date(exam.available_from).getTime() > now) return false;
    if (exam.available_to && new Date(exam.available_to).getTime() < now) return false;
    return exam.status === 'active';
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
    </div>
  );

  // ── TEACHER VIEW ──────────────────────────────────────────────
  if (isTeacher) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Exámenes</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Crea y gestiona evaluaciones para esta clase</p>
          </div>
          <button onClick={() => navigate(`/classes/${classId}/exams/new`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-sm">
            <Plus className="w-4 h-4" /> Nuevo Examen
          </button>
        </div>

        {exams.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="font-bold text-slate-600 dark:text-slate-300">Sin exámenes aún</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 mb-5">Crea el primero para evaluar a tus estudiantes</p>
            <button onClick={() => navigate(`/classes/${classId}/exams/new`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition">
              <Plus className="w-4 h-4" /> Crear Examen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map(exam => {
              const cfg = STATUS_CONFIG[exam.status];
              const window = formatWindow(exam);
              return (
                <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{exam.title}</h3>
                        <span className={`flex-none text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {exam.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">{exam.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                        <span>⏱ {exam.duration_minutes} min</span>
                        <span>🎯 Min. {exam.passing_score}% ({(exam.scale_max * exam.passing_score / 100).toFixed(2)} / {exam.scale_max})</span>
                        {window && <span>🕐 {window}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-none">
                      {exam.status === 'draft' && (
                        <button onClick={() => navigate(`/exams/${exam.id}/builder`)}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition"
                          title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {exam.status === 'active' && (
                        <button onClick={() => handleClose(exam)} disabled={closingId === exam.id}
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition disabled:opacity-50"
                          title="Cerrar examen">
                          {closingId === exam.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        </button>
                      )}
                      {exam.status !== 'draft' && (
                        <button onClick={() => navigate(`/exams/${exam.id}/results`)}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition"
                          title="Ver resultados">
                          <BarChart2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── STUDENT VIEW ───────────────────────────────────────────────
  const availableExams = exams.filter(e => e.status !== 'draft');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tus Exámenes</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Evaluaciones disponibles para esta clase</p>
      </div>

      {availableExams.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-slate-600 dark:text-slate-300">No hay exámenes disponibles</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Tu profesor publicará los exámenes cuando estén listos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {availableExams.map(exam => {
            const open = isOpen(exam);
            const window = formatWindow(exam);
            const isClosed = exam.status === 'closed';

            return (
              <div key={exam.id}
                className={`rounded-2xl border-2 p-5 transition-all ${open ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500/30 shadow-md hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-400/50' : 'bg-slate-50/60 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700/50 opacity-80'}`}>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Status pill */}
                    <div className="flex items-center gap-2 mb-2">
                      {open
                        ? <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> Disponible
                          </span>
                        : isClosed
                          ? <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                              <Lock className="w-2.5 h-2.5" /> Cerrado
                            </span>
                          : <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                              <Calendar className="w-2.5 h-2.5" /> Próximamente
                            </span>}
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">{exam.title}</h3>
                    {exam.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{exam.description}</p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {exam.duration_minutes} minutos</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Aprueba con {exam.passing_score}%</span>
                      {window && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {window}</span>}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex-none">
                    {open ? (
                      <button onClick={() => navigate(`/exams/${exam.id}/take`)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 whitespace-nowrap">
                        <PlayCircle className="w-4 h-4" /> Iniciar
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 text-sm font-bold">
                        {isClosed ? <Lock className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        {isClosed ? 'Cerrado' : 'No disponible'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
