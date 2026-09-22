/**
 * QuizPodiumModal
 * Full celebratory Podium & Final Leaderboard modal with native canvas confetti.
 *
 * Features:
 *   - 1st, 2nd, 3rd place animated podium steps
 *   - Fanfare audio sequence on mount via QuizAudioEngine
 *   - Native Canvas Confetti particle system (0 dependencies)
 *   - Full class leaderboard with rankings and accuracy
 *   - Student Answer Review tab ("Mis Respuestas") with correct answers & explanations
 *   - CSV Export & session close controls for the teacher
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Trophy, Crown, Sparkles, Download, X, Users, Loader2, CheckCircle2,
  FileText, Check, AlertCircle, Lightbulb, XCircle
} from 'lucide-react';
import type { useQuizGame } from '../../hooks/useQuizGame';
import { quizAudio } from '../../services/quizAudioEngine';
import toast from 'react-hot-toast';

interface QuizPodiumModalProps {
  quiz: ReturnType<typeof useQuizGame>;
  isTeacher: boolean;
  onClose?: () => void;
}

export const QuizPodiumModal: React.FC<QuizPodiumModalProps> = ({
  quiz,
  isTeacher,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const finalizedRef = useRef<boolean>(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState<'podium' | 'answers'>('podium');

  const isPodiumActive = quiz.quizPhase === 'podium' || quiz.isLocalPodiumOpen;

  useEffect(() => {
    if (quiz.quizPhase === 'podium') {
      setIsDismissed(false);
    }
  }, [quiz.quizPhase]);

  useEffect(() => {
    if (quiz.isLocalPodiumOpen) {
      setIsDismissed(false);
    }
  }, [quiz.isLocalPodiumOpen]);

  // ─── Auto-Finalize: persist batch results to PostgreSQL when podium mounts ───
  useEffect(() => {
    if (!isPodiumActive || !isTeacher || quiz.isLocalPodiumOpen || quiz.isSessionFinalized) return;
    if (finalizedRef.current) return;
    if (quiz.studentProgress.length === 0) return;

    finalizedRef.current = true;
    quiz.persistAllSessionResults();
  }, [isPodiumActive, isTeacher, quiz.isLocalPodiumOpen, quiz.isSessionFinalized, quiz.studentProgress.length, quiz.persistAllSessionResults]);

  // Sound fanfare & Confetti on mount
  useEffect(() => {
    if (!isPodiumActive || isDismissed) return;

    quizAudio.playPodium();

    // ─── Native Canvas Confetti System ───────────────────────────────────────
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#8b5cf6', '#ec4899', '#eab308', '#10b981', '#3b82f6', '#f97316'];
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height * 0.4) - 50,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 6,
        speedY: Math.random() * 4 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    let animationFrameId: number;
    let startTime = Date.now();

    const renderConfetti = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
        if (elapsed > 3000) {
          p.opacity = Math.max(0, 1 - (elapsed - 3000) / 2000);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (elapsed < 5000) {
        animationFrameId = requestAnimationFrame(renderConfetti);
      }
    };

    renderConfetti();

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isPodiumActive, isDismissed]);

  // For students: the modal stays open while the teacher has the quiz in 'podium' phase.
  // Students cannot close it — only the teacher can end the session.
  // For teachers: isDismissed controls local visibility (they can close/reopen via isLocalPodiumOpen).
  const shouldShowModal = !isDismissed && isPodiumActive;
  if (!shouldShowModal) return null;

  // Sort students by total score descending
  let sortedStudents = [...quiz.studentProgress].sort((a, b) => b.score - a.score);
  if (sortedStudents.length === 0 && !isTeacher) {
    sortedStudents = [
      {
        clientId: 'me',
        name: 'Tú',
        score: quiz.myScore,
        hasAnswered: true,
      },
    ];
  }
  const first = sortedStudents[0];
  const second = sortedStudents[1];
  const third = sortedStudents[2];

  // Questions and Answer Stats
  const questions = quiz.activeQuiz?.questions || [];
  const questionStats = questions.reduce(
    (acc, q) => {
      const myAns = quiz.myAnswers[q.id];
      if (!myAns || myAns.answer === '(Sin respuesta)') {
        acc.unanswered++;
      } else if (myAns.isCorrect) {
        acc.correct++;
      } else {
        acc.incorrect++;
      }
      return acc;
    },
    { correct: 0, incorrect: 0, unanswered: 0, total: questions.length }
  );

  // Export CSV Report
  const handleExportCSV = () => {
    const rows = [
      ['Posición', 'Alumno', 'Puntaje Total', 'Quiz'],
      ...sortedStudents.map((s, idx) => [
        idx + 1,
        `"${s.name.replace(/"/g, '""')}"`,
        s.score,
        `"${(quiz.activeQuiz?.activity_name || 'Quiz').replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Resultados_Quiz_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDismissed(true);

    if (quiz.isLocalPodiumOpen) {
      quiz.closeLocalPodium();
      return;
    }

    if (onClose) onClose();

    if (isTeacher) {
      if (!quiz.isSessionFinalized) {
        await quiz.persistAllSessionResults();
      }
      quiz.forceStopQuiz();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Canvas for native particle confetti */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-10 w-full h-full"
      />

      <div className="relative z-20 w-full max-w-2xl bg-[#0d1117] border border-amber-500/30 rounded-3xl shadow-[0_25px_80px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                ¡Podio de Ganadores! <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">
                {quiz.activeQuiz?.activity_name || 'Resultados de la Partida'}
              </p>
            </div>
          </div>

          {/* X button: teacher-only — students wait for teacher to end the session */}
          {isTeacher && (
            <button
              type="button"
              onClick={handleClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 pt-3 pb-2 border-b border-white/5 bg-slate-900/40 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('podium')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'podium'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Podio y Clasificación
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('answers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'answers'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> {isTeacher ? 'Preguntas y Soluciones' : 'Mis Respuestas'}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'podium' && (
            <>
              {/* ─── 3D-Style Podium Step Layout ─── */}
              <div className="flex items-end justify-center gap-3 pt-6 pb-2 min-h-[220px]">
                {/* 2nd Place (Silver) */}
                <div className="flex flex-col items-center w-28 sm:w-32 animate-fade-in" style={{ animationDelay: '200ms' }}>
                  {second ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-slate-300/20 border-2 border-slate-300 flex items-center justify-center text-slate-200 font-bold text-sm mb-2 shadow-lg">
                        {second.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-xs font-bold text-slate-200 text-center truncate max-w-full">
                        {second.name}
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 mb-2">
                        {second.score} pts
                      </div>
                      <div className="w-full h-24 rounded-t-2xl bg-gradient-to-t from-slate-800 to-slate-600 border-t-2 border-slate-300 flex flex-col items-center justify-center shadow-lg">
                        <span className="text-2xl font-black text-white">2</span>
                        <span className="text-[10px] uppercase font-bold text-slate-300">Plata</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-24 rounded-t-2xl bg-slate-900/40 border-t border-white/10 flex items-center justify-center text-slate-600 text-xs">
                      -
                    </div>
                  )}
                </div>

                {/* 1st Place (Gold) */}
                <div className="flex flex-col items-center w-32 sm:w-36 -mt-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
                  {first ? (
                    <>
                      <Crown className="w-8 h-8 text-amber-400 fill-amber-400/30 animate-bounce-subtle mb-1" />
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-bold text-base mb-2 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                        {first.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-sm font-bold text-white text-center truncate max-w-full">
                        {first.name}
                      </div>
                      <div className="text-xs font-extrabold text-amber-300 mb-2">
                        {first.score} pts
                      </div>
                      <div className="w-full h-32 rounded-t-2xl bg-gradient-to-t from-amber-800 via-amber-600 to-yellow-500 border-t-2 border-amber-200 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.3)]">
                        <span className="text-3xl font-black text-slate-900">1</span>
                        <span className="text-xs uppercase font-black text-slate-900">Oro 🏆</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-32 rounded-t-2xl bg-slate-900/40 border-t border-white/10 flex items-center justify-center text-slate-600 text-xs">
                      Sin participantes
                    </div>
                  )}
                </div>

                {/* 3rd Place (Bronze) */}
                <div className="flex flex-col items-center w-28 sm:w-32 animate-fade-in" style={{ animationDelay: '100ms' }}>
                  {third ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-amber-900/30 border-2 border-amber-700 flex items-center justify-center text-amber-600 font-bold text-sm mb-2 shadow-lg">
                        {third.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-xs font-bold text-slate-200 text-center truncate max-w-full">
                        {third.name}
                      </div>
                      <div className="text-[11px] font-bold text-amber-600 mb-2">
                        {third.score} pts
                      </div>
                      <div className="w-full h-18 rounded-t-2xl bg-gradient-to-t from-amber-950 to-amber-800 border-t-2 border-amber-600 flex flex-col items-center justify-center shadow-lg">
                        <span className="text-xl font-black text-white">3</span>
                        <span className="text-[10px] uppercase font-bold text-amber-300">Bronce</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-18 rounded-t-2xl bg-slate-900/40 border-t border-white/10 flex items-center justify-center text-slate-600 text-xs">
                      -
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Complete Leaderboard Table ─── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-violet-400" /> Clasificación General ({sortedStudents.length})
                  </span>
                  {isTeacher && (
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Exportar CSV
                    </button>
                  )}
                </div>

                <div className="divide-y divide-white/5 rounded-2xl bg-slate-900/80 border border-white/10 overflow-hidden">
                  {sortedStudents.map((student, idx) => (
                    <div
                      key={student.clientId}
                      className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-bold text-xs text-slate-400">
                          #{idx + 1}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-xs">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-white">
                          {student.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono font-bold text-sm text-amber-400">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        {student.score} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'answers' && (
            <div className="space-y-4">
              {/* Summary Stats Header */}
              {!isTeacher && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Preguntas</span>
                    <span className="text-base font-bold text-white mt-1">{questionStats.total}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Aciertos
                    </span>
                    <span className="text-base font-bold text-emerald-300 mt-1">{questionStats.correct}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Fallos
                    </span>
                    <span className="text-base font-bold text-rose-300 mt-1">{questionStats.incorrect}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Sin responder
                    </span>
                    <span className="text-base font-bold text-amber-300 mt-1">{questionStats.unanswered}</span>
                  </div>
                </div>
              )}

              {/* Questions Review List */}
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const myAns = quiz.myAnswers[q.id];
                  const hasAnswered = myAns && myAns.answer !== '(Sin respuesta)';
                  const isCorrect = myAns?.isCorrect;
                  const correctSolution = quiz.quizSolutions[q.id]?.correct ?? myAns?.correct ?? (isTeacher ? (q as any).correct : undefined);
                  const explanation = quiz.quizSolutions[q.id]?.explanation ?? myAns?.explanation ?? (isTeacher ? (q as any).explanation : undefined);

                  return (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3 transition-all"
                    >
                      {/* Question Card Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 text-[11px] font-bold">
                            Pregunta {idx + 1}
                          </span>
                          <span className="text-[11px] text-slate-400 uppercase font-medium">
                            {q.type}
                          </span>
                        </div>

                        {!isTeacher && (
                          <div>
                            {isCorrect ? (
                              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                                <Check className="w-3 h-3" /> Acertaste {myAns?.score ? `(+${myAns.score} pts)` : ''}
                              </span>
                            ) : hasAnswered ? (
                              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold">
                                <X className="w-3 h-3" /> Fallaste
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                                <AlertCircle className="w-3 h-3" /> Sin responder
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-semibold text-white">
                        {q.sentence || q.question}
                      </p>

                      {/* Options or Answer Display */}
                      {q.options && q.options.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, optIdx) => {
                            const isThisCorrect = correctSolution !== undefined && String(opt) === String(correctSolution);
                            const isThisStudentPick = !isTeacher && myAns && String(myAns.answer) === String(opt);

                            let optStyle = 'bg-slate-800/40 border-white/5 text-slate-300';
                            if (isThisCorrect) {
                              optStyle = 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 font-bold shadow-sm shadow-emerald-500/10';
                            } else if (isThisStudentPick && !isCorrect) {
                              optStyle = 'bg-rose-950/40 border-rose-500/60 text-rose-200 font-bold shadow-sm shadow-rose-500/10';
                            }

                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${optStyle}`}
                              >
                                <span className="truncate">{opt}</span>
                                {isThisCorrect && (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold shrink-0 ml-2">
                                    <Check className="w-3 h-3" /> Correcta
                                  </span>
                                )}
                                {isThisStudentPick && !isThisCorrect && (
                                  <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold shrink-0 ml-2">
                                    <X className="w-3 h-3" /> Tu elección
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-1.5 pt-1 text-xs">
                          {!isTeacher && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">Tu respuesta:</span>
                              <span className={`font-semibold ${isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {myAns?.answer || '(Sin respuesta)'}
                              </span>
                            </div>
                          )}
                          {correctSolution && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">Respuesta correcta:</span>
                              <span className="font-bold text-emerald-300">{String(correctSolution)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explanation Callout */}
                      {explanation && (
                        <div className="mt-2 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                          <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-indigo-300">Explicación didáctica: </span>
                            {explanation}
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

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div>
            {!isTeacher && quiz.isSavingResult && (
              <span className="text-xs text-amber-400 flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando resultados en tu expediente...
              </span>
            )}
            {!isTeacher && quiz.hasSavedResult && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Resultados guardados en tu expediente
              </span>
            )}
            {(isTeacher || (!quiz.isSavingResult && !quiz.hasSavedResult)) && (
              <span className="text-xs text-slate-400">
                ¡Felicitaciones a todos los participantes! 🎉
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isTeacher && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-white/10"
              >
                <Download className="w-4 h-4" /> Exportar Notas
              </button>
            )}

            {/* Teacher: close/finalize button. Students: passive indicator (session ends when teacher closes) */}
            {isTeacher ? (
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all"
              >
                {quiz.isLocalPodiumOpen
                  ? 'Cerrar'
                  : !quiz.isSessionFinalized
                  ? 'Finalizar Partida'
                  : 'Cerrar'}
              </button>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/60 border border-white/5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                Esperando al profesor para cerrar...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
