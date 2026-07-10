import { useState, useEffect, useMemo } from 'react';
import { examsService, type GradeExam, type GradeRow } from '../../services/examsService';
import toast from 'react-hot-toast';
import {
  Loader2, Award, TrendingUp, Users, ClipboardList,
  CheckCircle2, XCircle, Clock, ChevronDown, Download,
} from 'lucide-react';

interface GradesPanelProps {
  classId: string;
  isTeacher?: boolean;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const scoreColor = (score: number | null, scaleMax: number, passingScore: number) => {
  if (score === null) return '';
  const threshold = scaleMax * (passingScore / 100);
  const ratio = score / scaleMax;
  if (score < threshold) return 'text-rose-600 dark:text-rose-400';
  if (ratio >= 0.9)       return 'text-emerald-600 dark:text-emerald-400';
  return 'text-amber-600 dark:text-amber-400';
};

const scoreBg = (score: number | null, scaleMax: number, passingScore: number) => {
  if (score === null) return 'bg-slate-50 dark:bg-slate-800/30';
  const threshold = scaleMax * (passingScore / 100);
  if (score < threshold) return 'bg-rose-50 dark:bg-rose-500/5';
  return 'bg-emerald-50 dark:bg-emerald-500/5';
};

const SKILL_LABEL: Record<string, string> = {
  listening: 'Listening',
  speaking: 'Speaking',
  writing: 'Writing',
  complete: 'Completo',
  writing_listening: 'W+L',
  writing_speaking: 'W+S',
};

// ── Component ─────────────────────────────────────────────────────────────────

export const GradesPanel = ({ classId, isTeacher = false }: GradesPanelProps) => {
  const [exams, setExams]   = useState<GradeExam[]>([]);
  const [rows, setRows]     = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    examsService.getGradesByClass(classId)
      .then(d => {
        const mappedExams = d.exams.map(e => ({
          ...e,
          scale_max: e.scale_max !== null ? Number(e.scale_max) : 5.0,
          passing_score: e.passing_score !== null ? Number(e.passing_score) : 60,
        }));
        const mappedRows = d.rows.map(r => ({
          ...r,
          score: r.score !== null ? Number(r.score) : null,
        }));
        setExams(mappedExams);
        setRows(mappedRows);
      })
      .catch(() => toast.error('Error al cargar el libro de notas'))
      .finally(() => setLoading(false));
  }, [classId]);

  // Build a pivot: studentId → examId → GradeRow
  const { students, pivot } = useMemo(() => {
    const studentMap = new Map<string, { id: string; name: string; username: string }>();
    const pivot = new Map<string, Map<string, GradeRow>>();

    for (const row of rows) {
      if (!studentMap.has(row.student_id)) {
        studentMap.set(row.student_id, {
          id: row.student_id,
          name: row.student_name,
          username: row.student_username,
        });
      }
      if (!pivot.has(row.student_id)) pivot.set(row.student_id, new Map());
      pivot.get(row.student_id)!.set(row.exam_id, row);
    }

    const students = Array.from(studentMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return { students, pivot };
  }, [rows]);

  // Per-exam stats (for the footer)
  const examStats = useMemo(() => {
    return exams.map(e => {
      const scores = students
        .map(s => pivot.get(s.id)?.get(e.id)?.score ?? null)
        .filter(s => s !== null) as number[];
      const passed = scores.filter(s => s >= e.scale_max * (e.passing_score / 100)).length;
      const avg    = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return { examId: e.id, count: scores.length, passed, avg };
    });
  }, [exams, students, pivot]);

  // Per-student average
  const studentAvg = useMemo(() => {
    return students.map(s => {
      const scores = exams
        .map(e => pivot.get(s.id)?.get(e.id)?.score ?? null)
        .filter(s => s !== null) as number[];
      return { studentId: s.id, avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null };
    });
  }, [students, exams, pivot]);

  // CSV export (teacher only)
  const exportCSV = () => {
    const header = ['Estudiante', 'Usuario', ...exams.map(e => e.title), 'Promedio'].join(',');
    const dataRows = students.map(s => {
      const scores = exams.map(e => {
        const r = pivot.get(s.id)?.get(e.id);
        return r?.score != null ? r.score.toFixed(2) : '';
      });
      const avg = studentAvg.find(a => a.studentId === s.id)?.avg;
      return [s.name, s.username, ...scores, avg != null ? avg.toFixed(2) : ''].join(',');
    });
    const blob = new Blob([[header, ...dataRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `notas_clase.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  if (exams.length === 0) return (
    <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
      <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <p className="font-bold text-slate-600 dark:text-slate-300">Sin exámenes publicados aún</p>
      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
        Las notas aparecerán aquí una vez que el profesor publique y los estudiantes entreguen exámenes.
      </p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Libro de Notas</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isTeacher
              ? `${students.length} estudiante${students.length !== 1 ? 's' : ''} · ${exams.length} examen${exams.length !== 1 ? 'es' : ''}`
              : 'Tus calificaciones de cada evaluación'}
          </p>
        </div>
        {isTeacher && students.length > 0 && (
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition shadow-sm">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        )}
      </div>

      {/* Summary cards (teacher only) */}
      {isTeacher && exams.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mb-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{students.length}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Estudiantes</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mb-2">
              <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{exams.length}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Exámenes</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-2">
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {(() => {
                const allPassed = examStats.reduce((t, s) => t + s.passed, 0);
                const allCount  = examStats.reduce((t, s) => t + s.count, 0);
                return allCount > 0 ? `${Math.round(allPassed / allCount * 100)}%` : '—';
              })()}
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Aprobados</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {(() => {
                const avgs = examStats.map(s => s.avg).filter(a => a !== null) as number[];
                return avgs.length > 0 ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2) : '—';
              })()}
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Promedio Gral.</p>
          </div>
        </div>
      )}

      {/* Grade table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">

            {/* Thead */}
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60">
                {/* Student column header */}
                <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/60 text-left px-5 py-4 font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-r border-slate-200 dark:border-slate-700 min-w-[180px]">
                  {isTeacher ? 'Estudiante' : 'Mi perfil'}
                </th>
                {exams.map(e => (
                  <th key={e.id} className="px-4 py-4 border-b border-slate-200 dark:border-slate-700 min-w-[140px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 leading-tight text-center line-clamp-2">
                        {e.title}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        {e.skill_type && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-md">
                            {SKILL_LABEL[e.skill_type] ?? e.skill_type}
                          </span>
                        )}
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                          e.status === 'closed'
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {e.status === 'closed' ? 'Cerrado' : 'Activo'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Nota máx: {e.scale_max}
                      </span>
                    </div>
                  </th>
                ))}
                {/* Average column */}
                <th className="px-4 py-4 border-b border-l border-slate-200 dark:border-slate-700 min-w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">Promedio</span>
                    <span className="text-[10px] text-slate-400 font-medium">General</span>
                  </div>
                </th>
              </tr>
            </thead>

            {/* Tbody */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={exams.length + 2} className="text-center py-16 text-slate-400 dark:text-slate-500">
                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Ningún estudiante ha entregado exámenes aún</p>
                  </td>
                </tr>
              ) : students.map((student, si) => {
                const avg = studentAvg.find(a => a.studentId === student.id)?.avg ?? null;
                const isEven = si % 2 === 0;
                return (
                  <tr key={student.id} className={`transition-colors hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 ${isEven ? '' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}>
                    {/* Student cell */}
                    <td className={`sticky left-0 z-10 px-5 py-3.5 border-r border-slate-100 dark:border-slate-800 ${isEven ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-black flex-none">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{student.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">@{student.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Score cells */}
                    {exams.map(e => {
                      const cell = pivot.get(student.id)?.get(e.id);
                      return (
                        <td key={e.id} className={`px-4 py-3.5 text-center ${cell ? scoreBg(cell.score, e.scale_max, e.passing_score) : ''}`}>
                          {!cell ? (
                            <span className="text-slate-300 dark:text-slate-600 text-lg">—</span>
                          ) : cell.score === null ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pendiente</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-lg font-black ${scoreColor(cell.score, e.scale_max, e.passing_score)}`}>
                                {cell.score.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400">/{e.scale_max}</span>
                              {cell.score >= e.scale_max * (e.passing_score / 100)
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                : <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              }
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Average cell */}
                    <td className="px-4 py-3.5 text-center border-l border-slate-100 dark:border-slate-800">
                      {avg !== null ? (
                        <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                          {avg.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer stats (teacher only) */}
            {isTeacher && students.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700">
                  <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">
                    Promedio clase
                  </td>
                  {examStats.map(s => {
                    const exam = exams.find(e => e.id === s.examId)!;
                    return (
                      <td key={s.examId} className="px-4 py-3 text-center">
                        {s.avg !== null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`font-black text-base ${scoreColor(s.avg, exam.scale_max, exam.passing_score)}`}>
                              {s.avg.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {s.count} entregados · {s.passed} aprobados
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">Sin datos</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 border-l border-slate-200 dark:border-slate-700" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
