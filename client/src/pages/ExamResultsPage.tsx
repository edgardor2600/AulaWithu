import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { examsService, type Exam, type ExamQuestion, type ExamAttempt, type ExamAnswer } from '../services/examsService';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Users, CheckCircle2, XCircle, Clock, Loader2, TrendingUp, Award,
  Eye, X, AlignLeft, Edit3, Save, Star, AlertTriangle, Music,
} from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  in_progress: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  submitted:   'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  graded:      'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
};
const STATUS_LABEL: Record<string, string> = {
  in_progress: 'En curso', submitted: 'Enviado', graded: 'Calificado',
};

const isImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].split('#')[0];
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(cleanUrl);
};

const isAudioUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].split('#')[0];
  return /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(cleanUrl);
};

export const ExamResultsPage = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate   = useNavigate();

  const [exam, setExam]           = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attempts, setAttempts]   = useState<ExamAttempt[]>([]);
  const [loading, setLoading]     = useState(true);

  // Detail modal
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [detailAnswers, setDetailAnswers]      = useState<ExamAnswer[] | null>(null);
  const [loadingDetail, setLoadingDetail]      = useState(false);
  const [gradingId, setGradingId]              = useState<string | null>(null);
  const [gradeInput, setGradeInput]            = useState<Record<string, string>>({});
  const [savingGrade, setSavingGrade]          = useState<string | null>(null);

  useEffect(() => {
    if (!examId) return;
    examsService.getExamResults(examId)
      .then(({ exam: e, questions: qs, attempts: atts }) => {
        const mappedExam = e ? {
          ...e,
          scale_max: e.scale_max !== null ? Number(e.scale_max) : 5.0,
          passing_score: e.passing_score !== null ? Number(e.passing_score) : 60,
        } : null;
        const mappedAttempts = atts.map((a: any) => ({
          ...a,
          score: a.score !== null ? Number(a.score) : null,
          total_points: a.total_points !== null ? Number(a.total_points) : null,
          earned_points: a.earned_points !== null ? Number(a.earned_points) : null,
        }));
        setExam(mappedExam);
        setQuestions(qs);
        setAttempts(mappedAttempts as any);
      })
      .catch(() => { toast.error('Error al cargar resultados'); navigate(-1); })
      .finally(() => setLoading(false));
  }, [examId]);

  const openDetail = async (att: ExamAttempt) => {
    setSelectedAttempt(att);
    setDetailAnswers(null);
    setGradingId(null);
    setLoadingDetail(true);
    try {
      const { answers } = await examsService.getAttemptDetail(att.id);
      setDetailAnswers(answers);
      const init: Record<string, string> = {};
      answers.forEach(a => { if (a.points_earned !== null) init[a.question_id] = String(a.points_earned); });
      setGradeInput(init);
    } catch { toast.error('Error al cargar respuestas'); }
    finally { setLoadingDetail(false); }
  };

  const handleSaveGrade = async (attemptId: string, questionId: string) => {
    const val = parseFloat(gradeInput[questionId] ?? '0');
    if (isNaN(val) || val < 0) { toast.error('Valor inválido'); return; }
    setSavingGrade(questionId);
    try {
      const updated = await examsService.gradeAnswer(attemptId, questionId, val);
      setAttempts(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      setSelectedAttempt(prev => prev ? { ...prev, ...updated } : prev);
      setDetailAnswers(prev => prev?.map(a =>
        a.question_id === questionId ? { ...a, points_earned: val, is_correct: val > 0 } : a
      ) || null);
      toast.success('Calificación guardada');
      setGradingId(null);
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Error al guardar');
    } finally { setSavingGrade(null); }
  };

  const exportCSV = () => {
    if (!exam || attempts.length === 0) return;
    const header = 'Estudiante,Usuario,Estado,Nota,Puntos Ganados,Puntos Totales,Enviado';
    const rows = attempts.map(a => [
      (a as any).student_name || a.student_id,
      (a as any).student_username || '',
      a.status,
      a.score?.toFixed(2) ?? '',
      a.earned_points?.toFixed(2) ?? '',
      a.total_points?.toFixed(2) ?? '',
      a.submitted_at ? new Date(a.submitted_at).toLocaleString('es-CO') : '',
    ].join(',')).join('\n');
    const blob = new Blob([`${header}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${exam.title}_resultados.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const submitted  = attempts.filter(a => a.status !== 'in_progress');
  const passed     = submitted.filter(a => a.score !== null && exam && a.score >= (exam.scale_max * (exam.passing_score / 100)));
  const avgScore   = submitted.length > 0 ? submitted.reduce((s, a) => s + (a.score ?? 0), 0) / submitted.length : 0;
  const needsGrade = submitted.filter(a => a.status === 'submitted').length;
  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  if (loading) return (
    <Layout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div></Layout>
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">{exam?.title}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Resultados y calificación del examen</p>
            </div>
          </div>
          {attempts.length > 0 && (
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition shadow-sm">
              <Star className="w-4 h-4" /> Exportar CSV
            </button>
          )}
        </div>

        {/* Needs-grading warning */}
        {needsGrade > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-none" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {needsGrade} intento{needsGrade > 1 ? 's' : ''} pendiente{needsGrade > 1 ? 's' : ''} de calificación manual — revisa las respuestas cortas de tus estudiantes.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Intentos',  value: attempts.length,                       Icon: Users,       color: 'blue' },
            { label: 'Enviados',  value: submitted.length,                      Icon: CheckCircle2, color: 'indigo' },
            { label: 'Aprobados', value: passed.length,                         Icon: Award,       color: 'emerald' },
            { label: 'Promedio',  value: `${avgScore.toFixed(2)} / ${exam?.scale_max ?? 5}`, Icon: TrendingUp, color: 'purple' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <div className={`w-9 h-9 rounded-xl bg-${s.color}-100 dark:bg-${s.color}-500/20 flex items-center justify-center mb-3`}>
                <s.Icon className={`w-5 h-5 text-${s.color}-600 dark:text-${s.color}-400`} />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Attempts table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white">Detalle por estudiante</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">{attempts.length} intento{attempts.length !== 1 ? 's' : ''}</span>
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
                    <th className="text-center px-4 py-3">Nota</th>
                    <th className="text-center px-4 py-3">Pts</th>
                    <th className="text-center px-4 py-3">Resultado</th>
                    <th className="text-left px-4 py-3">Enviado</th>
                    <th className="text-center px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attempts.map(att => {
                    const passingNote = exam ? exam.scale_max * (exam.passing_score / 100) : 3;
                    const hasPassed = att.score !== null && att.score >= passingNote;
                    const studentLabel = (att as any).student_name || att.student_id.slice(0, 8) + '…';
                    const studentUsername = (att as any).student_username || '';
                    return (
                      <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{studentLabel}</p>
                          {studentUsername && <p className="text-xs text-slate-400">@{studentUsername}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_BADGE[att.status]}`}>
                            {STATUS_LABEL[att.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {att.score !== null
                            ? <span className={`font-black text-base ${hasPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {att.score.toFixed(2)}
                              </span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-500 dark:text-slate-400 text-xs font-bold">
                          {att.earned_points !== null ? att.earned_points.toFixed(2) : '—'}/{att.total_points !== null ? att.total_points.toFixed(2) : '—'}
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
                        <td className="px-4 py-3.5 text-center">
                          {att.status !== 'in_progress' && (
                            <button onClick={() => openDetail(att)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition mx-auto">
                              <Eye className="w-3.5 h-3.5" /> Ver / Calificar
                            </button>
                          )}
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
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-slate-400">{q.points} pts · {q.type === 'multiple_choice' ? 'Opción múltiple (auto)' : 'Respuesta corta (manual)'}</p>
                    {q.type === 'short_answer' && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md">Requiere calificación</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === GRADING DETAIL MODAL === */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">

            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white">
                  Respuestas de {(selectedAttempt as any).student_name || 'Estudiante'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Estado: <span className={`font-bold ${STATUS_BADGE[selectedAttempt.status].split(' ')[2]}`}>{STATUS_LABEL[selectedAttempt.status]}</span>
                  {selectedAttempt.score !== null && <> · Nota: <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedAttempt.score.toFixed(2)} / {exam?.scale_max}</span></>}
                </p>
              </div>
              <button onClick={() => setSelectedAttempt(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : detailAnswers === null || detailAnswers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlignLeft className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Este estudiante no respondió ninguna pregunta</p>
                </div>
              ) : detailAnswers.map((ans, idx) => {
                const isManual = ans.question_type === 'short_answer';
                const isEditing = gradingId === ans.question_id;
                const maxPts = ans.points ?? 1;
                const currentPts = ans.points_earned;
                const isCorrect = ans.is_correct;

                return (
                  <div key={ans.id} className={`rounded-2xl border p-5 ${isManual ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5' : isCorrect ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-500/5' : 'border-rose-200 dark:border-rose-500/30 bg-rose-50/20 dark:bg-rose-500/5'}`}>

                    {/* Question header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <span className="flex-none w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center justify-center">{idx + 1}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">{ans.question_text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{ans.skill_category}</span>
                            {isManual
                              ? <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">Writing/Oral — Calificación manual</span>
                              : <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Opción múltiple — Auto</span>}
                          </div>
                        </div>
                      </div>

                      {/* Points badge */}
                      <div className={`flex-none text-right text-xs font-black rounded-xl px-3 py-1.5 ${isManual ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : isCorrect ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                        {currentPts !== null ? `${currentPts} / ${maxPts}` : `— / ${maxPts}`} pts
                      </div>
                    </div>

                    {/* Media widget for the question */}
                    {ans.media_url && (
                      isImageUrl(ans.media_url) ? (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-48 bg-slate-100 dark:bg-slate-900/50 max-w-md flex items-center justify-center mb-3">
                          <img src={ans.media_url} alt="Recurso de la pregunta" className="object-contain max-h-48" />
                        </div>
                      ) : (
                        <div className="bg-slate-100 dark:bg-slate-850 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3 max-w-md mb-3">
                          <Music className="w-4 h-4 text-indigo-500 flex-none" />
                          <audio src={ans.media_url} controls className="w-full h-8 scale-95" />
                        </div>
                      )
                    )}

                    {/* Student answer */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 mb-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Respuesta del estudiante</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {ans.answer_text || <span className="italic text-slate-400">Sin respuesta</span>}
                      </p>
                    </div>

                    {/* Correct answer (MC only) */}
                    {!isManual && ans.correct_answer !== null && (() => {
                      const q = questions.find(q => q.id === ans.question_id);
                      const correctIdx = parseInt(ans.correct_answer ?? '0');
                      const correctText = q?.options?.[correctIdx];
                      return (
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 border border-emerald-100 dark:border-emerald-500/20 mb-3">
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Respuesta correcta</p>
                          <p className="text-sm text-emerald-800 dark:text-emerald-300 font-semibold">
                            ({String.fromCharCode(65 + correctIdx)}) {correctText || `Opción ${String.fromCharCode(65 + correctIdx)}`}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Manual grading controls */}
                    {isManual && selectedAttempt.status !== 'in_progress' && (
                      <div className="border-t border-amber-200 dark:border-amber-500/20 pt-3 mt-1">
                        {isEditing ? (
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-slate-500">Puntos (0–{maxPts}):</label>
                            <input type="number" min="0" max={maxPts} step="0.25"
                              value={gradeInput[ans.question_id] ?? ''}
                              onChange={e => setGradeInput(prev => ({ ...prev, [ans.question_id]: e.target.value }))}
                              className="w-24 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-500" />
                            <button onClick={() => handleSaveGrade(selectedAttempt.id, ans.question_id)}
                              disabled={savingGrade === ans.question_id}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50">
                              {savingGrade === ans.question_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Guardar
                            </button>
                            <button onClick={() => setGradingId(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">Cancelar</button>
                          </div>
                        ) : (
                          <button onClick={() => { setGradingId(ans.question_id); setGradeInput(prev => ({ ...prev, [ans.question_id]: String(currentPts ?? '') })); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold hover:bg-amber-200 dark:hover:bg-amber-500/30 transition">
                            <Edit3 className="w-3.5 h-3.5" />
                            {currentPts !== null ? 'Modificar calificación' : 'Calificar esta respuesta'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end flex-shrink-0 bg-slate-50 dark:bg-slate-800/40 rounded-b-3xl">
              <button onClick={() => setSelectedAttempt(null)}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
