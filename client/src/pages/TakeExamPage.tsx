import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  examsService,
  type Exam, type ExamQuestion, type ExamAttempt, type ExamAnswer,
} from '../services/examsService';
import toast from 'react-hot-toast';
import {
  Clock, ChevronLeft, ChevronRight, Send, Loader2,
  CheckCircle2, XCircle, BookOpen, AlertTriangle, Eye, ArrowRight, WifiOff,
} from 'lucide-react';

/**
 * Parse a DB timestamp (may or may not have TZ suffix) as Colombia wall-clock time.
 * The pg driver returns bare strings like "2026-07-10T10:00:00" without a TZ.
 * JS Date treats those as UTC, which is wrong. We force -05:00.
 */
const parseDbDate = (raw: string): Date => {
  if (raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw)) return new Date(raw);
  return new Date(raw.replace(' ', 'T') + '-05:00');
};

// ── Timer ─────────────────────────────────────────────────────────────────────
const useTimer = (totalSeconds: number, onExpire: () => void) => {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expired = useRef(false);

  useEffect(() => {
    if (totalSeconds <= 0) return;
    setRemaining(totalSeconds);
    expired.current = false;
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

  const hh = Math.floor(remaining / 3600);
  const mm = Math.floor((remaining % 3600) / 60);
  const ss = remaining % 60;
  const display = hh > 0
    ? `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return { display, isLow: remaining < 120 && remaining > 0, remaining };
};

// ── Safe number helper (score comes as string from DB type-parser) ─────────────
const num = (v: unknown): number => (v == null ? 0 : Number(v));

// ── Confirmation Screen ────────────────────────────────────────────────────────
interface ConfirmScreenProps {
  exam: Exam;
  questions: ExamQuestion[];
  answers: Record<string, string>;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
}
const ConfirmScreen = ({ exam, questions, answers, onConfirm, onBack, submitting }: ConfirmScreenProps) => {
  const answered = questions.filter(q => answers[q.id] !== undefined);
  const unanswered = questions.filter(q => answers[q.id] === undefined);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mx-auto">
            <Eye className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Confirmar Envío</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{exam.title}</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{answered.length}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Respondidas</p>
          </div>
          <div className={`rounded-2xl border p-4 text-center ${unanswered.length > 0 ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
            <p className={`text-2xl font-black ${unanswered.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>{unanswered.length}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Sin responder</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center">
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{questions.length}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Total</p>
          </div>
        </div>

        {/* Warning if unanswered */}
        {unanswered.length > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-none mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Preguntas sin responder</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                Las preguntas {unanswered.map(q => q.question_number).join(', ')} quedarán en blanco y no sumarán puntos.
              </p>
            </div>
          </div>
        )}

        {/* Answer review */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resumen de respuestas</p>
          </div>
          {questions.map((q, i) => {
            const raw = answers[q.id];
            let displayAnswer: string;
            if (raw === undefined) {
              displayAnswer = '— Sin responder';
            } else if (q.type === 'multiple_choice' && q.options) {
              const idx = parseInt(raw);
              displayAnswer = `(${String.fromCharCode(65 + idx)}) ${q.options[idx] ?? raw}`;
            } else {
              displayAnswer = raw.length > 120 ? raw.slice(0, 120) + '…' : raw;
            }
            const isEmpty = raw === undefined;
            return (
              <div key={q.id} className="px-5 py-3 flex items-start gap-3">
                <span className={`flex-none w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center mt-0.5 ${isEmpty ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-500' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{q.text}</p>
                  <p className={`text-xs mt-0.5 ${isEmpty ? 'text-rose-400 italic' : 'text-slate-500 dark:text-slate-400'}`}>
                    {displayAnswer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onBack} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" /> Revisar
          </button>
          <button onClick={onConfirm} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition disabled:opacity-50 shadow-md shadow-emerald-200 dark:shadow-emerald-900/40">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Enviando...' : 'Confirmar Envío'}
          </button>
        </div>
      </div>
    </Layout>
  );
};

// ── Result Screen ─────────────────────────────────────────────────────────────
interface ResultScreenProps {
  exam: Exam;
  attempt: ExamAttempt;
  onBack: () => void;
}
const ResultScreen = ({ exam, attempt, onBack }: ResultScreenProps) => {
  const scaleMax = exam.scale_max ?? 5;
  const passingNote = scaleMax * ((exam.passing_score ?? 60) / 100);
  const score = num(attempt.score);
  const earnedPoints = num(attempt.earned_points);
  const totalPoints = num(attempt.total_points);
  const scoreKnown = attempt.score !== null;
  const passed = scoreKnown && score >= passingNote;
  const pct = totalPoints > 0 ? Math.min((earnedPoints / totalPoints) * 100, 100) : 0;

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
        {/* Icon & title */}
        <div className="text-center space-y-3">
          <div className={`w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl ${passed ? 'bg-emerald-500 shadow-emerald-200 dark:shadow-emerald-900/50' : scoreKnown ? 'bg-rose-500 shadow-rose-200 dark:shadow-rose-900/50' : 'bg-indigo-500 shadow-indigo-200 dark:shadow-indigo-900/50'}`}>
            {passed
              ? <CheckCircle2 className="w-12 h-12 text-white" />
              : scoreKnown
                ? <XCircle className="w-12 h-12 text-white" />
                : <BookOpen className="w-12 h-12 text-white" />}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              {passed ? '¡Aprobado! 🎉' : scoreKnown ? 'No aprobado' : '¡Examen enviado!'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{exam.title}</p>
          </div>
        </div>

        {/* Score card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          {scoreKnown ? (
            <>
              <div className="text-center">
                <span className="text-6xl font-black text-indigo-600 dark:text-indigo-400">{score.toFixed(2)}</span>
                <span className="text-2xl text-slate-400 ml-2">/ {scaleMax}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-1000 ${passed ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-rose-400 to-rose-600'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{earnedPoints.toFixed(2)} / {totalPoints.toFixed(2)} puntos</span>
                <span>Mín. para aprobar: {passingNote.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-2">
              La nota aún no ha sido calculada
            </p>
          )}

          {/* Status badge */}
          <div className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${
            attempt.status === 'graded'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
          }`}>
            {attempt.status === 'graded'
              ? <><CheckCircle2 className="w-4 h-4" /> Calificado por el profesor</>
              : <><Clock className="w-4 h-4" /> ⏳ Tu profesor revisará y calificará tus respuestas</>}
          </div>

          {attempt.teacher_feedback && (
            <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl px-4 py-3 border border-indigo-100 dark:border-indigo-500/20">
              <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mb-1 uppercase tracking-wider">Retroalimentación del profesor</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{attempt.teacher_feedback}</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 text-sm text-slate-500 dark:text-slate-400 space-y-1">
          <p>✅ Tus respuestas han sido guardadas y enviadas al profesor.</p>
          <p>📋 Este examen ya no puede ser modificado.</p>
        </div>

        <button onClick={onBack}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition shadow-md shadow-indigo-200 dark:shadow-none">
          Volver a Exámenes <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </Layout>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
type Phase = 'loading' | 'taking' | 'confirming' | 'submitted';

export const TakeExamPage = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  // Track questions whose last save attempt failed (network error)
  const [failedSaves, setFailedSaves] = useState<Set<string>>(new Set());

  useEffect(() => { init(); }, [examId]);

  const init = async () => {
    if (!examId) return;
    setPhase('loading');
    try {
      const { exam: e, questions: qs } = await examsService.getExam(examId);
      setExam(e);
      setQuestions(qs);

      // Start or resume attempt
      const att = await examsService.startAttempt(examId);
      setAttempt(att);

      if (att.status !== 'in_progress') {
        // Already submitted/graded — go straight to result
        setPhase('submitted');
        return;
      }

      // Load saved answers if resuming
      const saved = await examsService.getMyAttempt(examId);
      if (saved?.answers) {
        const map: Record<string, string> = {};
        saved.answers.forEach((a: ExamAnswer) => { if (a.answer_text) map[a.question_id] = a.answer_text; });
        setAnswers(map);
      }
      setPhase('taking');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Error al cargar el examen');
      navigate(-1);
    }
  };

  const handleExpire = useCallback(async () => {
    if (!attempt || phase !== 'taking') return;
    toast.error('⏰ Tiempo agotado — enviando automáticamente...');
    await doSubmit();
  }, [attempt, phase]);

  // Bug A fix: parse started_at using Colombia offset (-05:00) to avoid
  // timezone drift on devices set to a different local timezone.
  const elapsedSeconds = attempt
    ? Math.floor((Date.now() - parseDbDate(attempt.started_at).getTime()) / 1000)
    : 0;
  const totalSeconds = (exam?.duration_minutes ?? 0) * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const timer = useTimer(phase === 'taking' ? remainingSeconds : 0, handleExpire);

  const saveAnswer = async (questionId: string, value: string) => {
    if (!attempt || phase !== 'taking') return;
    // Optimistic update: show the answer immediately in the UI
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    // Clear any previous failure flag for this question
    setFailedSaves(prev => { const next = new Set(prev); next.delete(questionId); return next; });
    setSavingId(questionId);
    try {
      await examsService.saveAnswer(attempt.id, questionId, value);
    } catch {
      // Bug B fix: mark this question as failed so the student can see it
      setFailedSaves(prev => new Set(prev).add(questionId));
      toast.error('⚠️ No se pudo guardar la respuesta. Verifica tu conexión e inténtalo de nuevo.', {
        id: `save-fail-${questionId}`,
        duration: 5000,
      });
    } finally { setSavingId(null); }
  };

  const doSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      const result = await examsService.submitAttempt(attempt.id);
      setAttempt(result);
      setPhase('submitted');
      toast.success('✅ Examen enviado correctamente');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Error al enviar');
      setPhase('taking'); // allow retry
    } finally { setSubmitting(false); }
  };

  const handleRequestConfirm = () => setPhase('confirming');
  const handleBackFromConfirm = () => setPhase('taking');

  const currentQ = questions[currentIdx];
  const answered = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    </Layout>
  );

  // ── Already submitted / graded ────────────────────────────────────────────────
  if (phase === 'submitted' && exam && attempt) {
    return <ResultScreen exam={exam} attempt={attempt} onBack={() => navigate(-1)} />;
  }

  // ── Confirmation screen ───────────────────────────────────────────────────────
  if (phase === 'confirming' && exam) {
    return (
      <ConfirmScreen
        exam={exam}
        questions={questions}
        answers={answers}
        onConfirm={doSubmit}
        onBack={handleBackFromConfirm}
        submitting={submitting}
      />
    );
  }

  // ── Exam taking UI ────────────────────────────────────────────────────────────
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
              <p className="text-xs text-slate-500 dark:text-slate-400">{answered}/{questions.length} respondidas</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-black text-lg transition-colors ${
            timer.isLow
              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
          }`}>
            <Clock className="w-4 h-4" />
            {timer.display}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
          <div className="h-2 rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Question navigator */}
        <div className="flex flex-wrap gap-2">
          {questions.map((q, i) => {
            const hasFailed = failedSaves.has(q.id);
            return (
              <button key={q.id} onClick={() => setCurrentIdx(i)}
                title={hasFailed ? 'Respuesta NO guardada – revisa tu conexión' : undefined}
                className={`w-9 h-9 rounded-xl text-sm font-bold transition-all relative ${
                  i === currentIdx
                    ? 'bg-indigo-600 text-white shadow-md'
                    : hasFailed
                      ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-2 border-rose-400 dark:border-rose-500'
                      : answers[q.id]
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}>
                {i + 1}
                {hasFailed && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border border-white dark:border-slate-900" />
                )}
              </button>
            );
          })}
        </div>

        {/* Unsaved warning banner */}
        {failedSaves.size > 0 && (
          <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-2xl px-4 py-3">
            <WifiOff className="w-5 h-5 text-rose-500 flex-none" />
            <div>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                {failedSaves.size} respuesta{failedSaves.size > 1 ? 's' : ''} no sincronizada{failedSaves.size > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/70 mt-0.5">
                Haz clic en las preguntas marcadas en rojo y vuelve a seleccionar tu respuesta para reintentarlo.
              </p>
            </div>
          </div>
        )}

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
            {savingId === currentQ.id
              ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400 flex-none mt-1" />
              : failedSaves.has(currentQ.id)
                ? <WifiOff className="w-4 h-4 text-rose-500 flex-none mt-1" title="No guardado" />
                : null}
          </div>

          {/* Multiple choice */}
          {currentQ.type === 'multiple_choice' && currentQ.options && (
            <div className="space-y-3">
              {currentQ.options.map((opt, oi) => {
                const val = String(oi);
                const selected = answers[currentQ.id] === val;
                return (
                  <button key={oi} onClick={() => saveAnswer(currentQ.id, val)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left font-medium text-sm transition-all ${
                      selected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 shadow-md'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                    }`}>
                    <span className={`flex-none w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                      selected ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600'
                    }`}>
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
              rows={4}
              placeholder="Escribe tu respuesta aquí..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:border-indigo-500 outline-none resize-none text-sm"
            />
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
            <button onClick={handleRequestConfirm}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-md shadow-emerald-200 dark:shadow-emerald-900/40">
              <Eye className="w-4 h-4" /> Revisar y Entregar
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};
