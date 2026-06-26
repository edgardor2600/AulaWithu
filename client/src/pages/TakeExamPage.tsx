import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { examsService, type Exam, type ExamQuestion, type ExamAttempt, type ExamAnswer } from '../services/examsService';
import toast from 'react-hot-toast';
import { Clock, ChevronLeft, ChevronRight, Send, Loader2, CheckCircle2, XCircle, BookOpen } from 'lucide-react';

// ── Timer hook ───────────────────────────────────────────────
const useTimer = (totalSeconds: number, onExpire: () => void) => {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expired = useRef(false);

  useEffect(() => {
    if (totalSeconds <= 0) return;
    setRemaining(totalSeconds);
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!expired.current) { expired.current = true; onExpire(); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [totalSeconds]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return { display: `${mm}:${ss}`, isLow: remaining < 120, remaining };
};

// ── Main Page ────────────────────────────────────────────────
export const TakeExamPage = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> answerText
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { init(); }, [examId]);

  const init = async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const { exam: e, questions: qs } = await examsService.getExam(examId);
      setExam(e);
      setQuestions(qs);

      // Start or resume attempt
      const att = await examsService.startAttempt(examId);
      setAttempt(att);

      if (att.status !== 'in_progress') {
        setSubmitted(true);
        setLoading(false);
        return;
      }

      // Load saved answers
      const existing = await examsService.getMyAttempt(examId);
      if (existing?.answers) {
        const map: Record<string, string> = {};
        existing.answers.forEach(a => { if (a.answer_text) map[a.question_id] = a.answer_text; });
        setAnswers(map);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Error al cargar el examen');
      navigate(-1);
    } finally { setLoading(false); }
  };

  const handleExpire = useCallback(async () => {
    if (!attempt || submitted) return;
    toast.error('⏰ Tiempo agotado — enviando automáticamente...');
    await doSubmit();
  }, [attempt, submitted]);

  const elapsedSeconds = attempt
    ? Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000)
    : 0;
  const totalSeconds = (exam?.duration_minutes ?? 0) * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const timer = useTimer(submitted ? 0 : remainingSeconds, handleExpire);

  const saveAnswer = async (questionId: string, value: string) => {
    if (!attempt || submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setSavingId(questionId);
    try {
      await examsService.saveAnswer(attempt.id, questionId, value);
    } catch {
      // Silent — user can still navigate, answer is kept in local state
    } finally { setSavingId(null); }
  };

  const doSubmit = async () => {
    if (!attempt || submitting || submitted) return;
    setSubmitting(true);
    try {
      const result = await examsService.submitAttempt(attempt.id);
      setAttempt(result);
      setSubmitted(true);
      toast.success('✅ Examen enviado correctamente');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Error al enviar');
    } finally { setSubmitting(false); }
  };

  const handleSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    const unanswered = questions.length - answeredCount;
    const msg = unanswered > 0
      ? `Tienes ${unanswered} pregunta${unanswered !== 1 ? 's' : ''} sin responder. ¿Deseas enviar de todas formas?`
      : '¿Confirmas el envío del examen? No podrás modificar tus respuestas.';
    if (!confirm(msg)) return;
    doSubmit();
  };

  const currentQ = questions[currentIdx];
  const answered = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0;

  // ── Loading ──
  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    </Layout>
  );

  // ── Result screen ──
  if (submitted && attempt) {
    const passed = attempt.score !== null && exam ? attempt.score >= exam.passing_score : false;
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${passed ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-rose-100 dark:bg-rose-500/20'}`}>
            {passed
              ? <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              : <XCircle className="w-10 h-10 text-rose-500" />}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            {passed ? '¡Aprobado! 🎉' : 'No aprobado'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">{exam?.title}</p>

          {attempt.score !== null && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6 space-y-3">
              <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400">
                {Math.round(attempt.score)}%
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                <div className={`h-3 rounded-full transition-all duration-700 ${passed ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(attempt.score, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-bold">
                <span>{attempt.earned_points ?? 0} / {attempt.total_points ?? 0} puntos</span>
                <span>Mín. para aprobar: {exam?.passing_score}%</span>
              </div>
            </div>
          )}

          <button onClick={() => navigate(-1)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
            Volver al Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  if (!currentQ || !exam) return null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Header with timer */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="w-5 h-5 text-indigo-500 flex-none" />
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white truncate">{exam.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {answered}/{questions.length} respondidas
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-black text-lg transition-colors ${timer.isLow ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
            <Clock className="w-4 h-4" />
            {timer.display}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
          <div className="h-2 rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Question navigator pills */}
        <div className="flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <button key={q.id} onClick={() => setCurrentIdx(i)}
              className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${i === currentIdx ? 'bg-indigo-600 text-white shadow-md' : answers[q.id] ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex-none w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-sm font-black flex items-center justify-center">
              {currentIdx + 1}
            </span>
            <div className="flex-1">
              <p className="font-semibold text-slate-800 dark:text-white leading-relaxed">{currentQ.text}</p>
              <p className="text-xs text-slate-400 mt-1">{currentQ.points} {currentQ.points === 1 ? 'punto' : 'puntos'}</p>
            </div>
            {savingId === currentQ.id && <Loader2 className="w-4 h-4 animate-spin text-indigo-400 flex-none mt-1" />}
          </div>

          {/* Multiple choice */}
          {currentQ.type === 'multiple_choice' && currentQ.options && (
            <div className="space-y-3">
              {currentQ.options.map((opt, oi) => {
                const val = String(oi);
                const selected = answers[currentQ.id] === val;
                return (
                  <button key={oi} onClick={() => saveAnswer(currentQ.id, val)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left font-medium text-sm transition-all ${selected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5'}`}>
                    <span className={`flex-none w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${selected ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600'}`}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Short answer */}
          {currentQ.type === 'short_answer' && (
            <textarea
              value={answers[currentQ.id] ?? ''}
              onChange={e => saveAnswer(currentQ.id, e.target.value)}
              rows={4} placeholder="Escribe tu respuesta aquí..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:border-indigo-500 outline-none resize-none text-sm" />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          {currentIdx < questions.length - 1 ? (
            <button onClick={() => setCurrentIdx(i => i + 1)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition disabled:opacity-50 shadow-md shadow-emerald-200 dark:shadow-emerald-900/40">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Entregar Examen
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};
