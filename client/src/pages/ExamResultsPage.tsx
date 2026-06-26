import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { examsService, type Exam, type ExamQuestion, type ExamAttempt } from '../services/examsService';
import toast from 'react-hot-toast';
import { ArrowLeft, Users, CheckCircle2, XCircle, Clock, Loader2, TrendingUp, Award } from 'lucide-react';

export const ExamResultsPage = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;
    examsService.getExamResults(examId)
      .then(({ exam: e, questions: qs, attempts: atts }) => {
        setExam(e); setQuestions(qs); setAttempts(atts);
      })
      .catch(() => { toast.error('Error al cargar resultados'); navigate(-1); })
      .finally(() => setLoading(false));
  }, [examId]);

  const submitted = attempts.filter(a => a.status !== 'in_progress');
  const passed = submitted.filter(a => a.score !== null && exam && a.score >= exam.passing_score);
  const avgScore = submitted.length > 0
    ? submitted.reduce((s, a) => s + (a.score ?? 0), 0) / submitted.length : 0;

  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  if (loading) return (
    <Layout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div></Layout>
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{exam?.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Resultados del examen</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Intentos', value: attempts.length, icon: Users, color: 'blue' },
            { label: 'Enviados', value: submitted.length, icon: CheckCircle2, color: 'indigo' },
            { label: 'Aprobados', value: passed.length, icon: Award, color: 'emerald' },
            { label: 'Promedio', value: `${Math.round(avgScore)}%`, icon: TrendingUp, color: 'purple' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <div className={`w-9 h-9 rounded-xl bg-${s.color}-100 dark:bg-${s.color}-500/20 flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 text-${s.color}-600 dark:text-${s.color}-400`} />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Score distribution bar */}
        {submitted.length > 0 && exam && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <h2 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Distribución de puntajes
            </h2>
            <div className="flex items-end gap-1 h-20">
              {[0,10,20,30,40,50,60,70,80,90].map(range => {
                const count = submitted.filter(a => (a.score ?? 0) >= range && (a.score ?? 0) < range + 10).length;
                const height = submitted.length > 0 ? (count / submitted.length) * 100 : 0;
                const isPassing = range >= exam.passing_score;
                return (
                  <div key={range} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
                      <div className={`w-full rounded-t-md transition-all ${isPassing ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-rose-300 dark:bg-rose-500'}`}
                        style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">{range}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400 mr-1" />aprueba
              <span className="inline-block w-3 h-3 rounded-sm bg-rose-300 ml-3 mr-1" />no aprueba
              · nota mínima: {exam.passing_score}%
            </p>
          </div>
        )}

        {/* Attempts table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> Detalle por estudiante
            </h2>
          </div>

          {attempts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Ningún estudiante ha iniciado este examen</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Estudiante</th>
                    <th className="text-center px-4 py-3">Estado</th>
                    <th className="text-center px-4 py-3">Puntaje</th>
                    <th className="text-center px-4 py-3">Pts</th>
                    <th className="text-center px-4 py-3">Resultado</th>
                    <th className="text-left px-4 py-3">Enviado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attempts.map(att => {
                    const hasPassed = att.score !== null && exam && att.score >= exam.passing_score;
                    return (
                      <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono text-xs">
                            {att.student_id.slice(0, 8)}…
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            att.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                            att.status === 'submitted' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                            'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {att.status === 'in_progress' ? 'En curso' : att.status === 'submitted' ? 'Enviado' : 'Calificado'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {att.score !== null
                            ? <span className={`font-black text-base ${hasPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {Math.round(att.score)}%
                              </span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-500 dark:text-slate-400 text-xs font-bold">
                          {att.earned_points ?? '—'}/{att.total_points ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {att.status === 'in_progress'
                            ? <span className="text-slate-400 flex items-center justify-center gap-1"><Clock className="w-3.5 h-3.5" /> En curso</span>
                            : hasPassed
                              ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                              : <XCircle className="w-5 h-5 text-rose-500 mx-auto" />}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(att.submitted_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Questions summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <h2 className="font-bold text-slate-800 dark:text-white mb-4">Preguntas del examen</h2>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-3 py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                <span className="flex-none w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black flex items-center justify-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{q.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{q.points} pts · {q.type === 'multiple_choice' ? 'Opción múltiple' : 'Respuesta corta'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
};
