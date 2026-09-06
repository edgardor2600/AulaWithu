/**
 * QuizPodiumModal
 * Full celebratory Podium & Final Leaderboard modal with native canvas confetti.
 *
 * Features:
 *   - 1st, 2nd, 3rd place animated podium steps
 *   - Fanfare audio sequence on mount via QuizAudioEngine
 *   - Native Canvas Confetti particle system (0 dependencies)
 *   - Full class leaderboard with rankings and accuracy
 *   - CSV Export & session close controls for the teacher
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Trophy, Crown, Sparkles, Download, X, Users
} from 'lucide-react';
import type { useQuizGame } from '../../hooks/useQuizGame';
import { quizAudio } from '../../services/quizAudioEngine';
import api from '../../services/api';
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
  // Guard: prevent double-finalize on StrictMode double-mount or phase re-renders
  const finalizedRef = useRef<boolean>(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const isPodiumActive = quiz.quizPhase === 'podium';

  useEffect(() => {
    if (isPodiumActive) {
      setIsDismissed(false);
    }
  }, [isPodiumActive]);

  // ─── Auto-Finalize: persist batch results to PostgreSQL when podium mounts ───
  useEffect(() => {
    if (!isPodiumActive || !isTeacher) return;
    if (finalizedRef.current) return; // already finalized this session
    if (quiz.studentProgress.length === 0) return; // no data to save

    const quizId = quiz.activeQuiz?.id;
    if (!quizId) {
      // Quiz was generated but never saved to the library — skip DB persistence
      console.info('[QuizPodiumModal] Quiz has no id (unsaved), skipping batch finalize');
      return;
    }

    finalizedRef.current = true;
    const results = quiz.studentProgress.map(s => ({
      student_id: s.clientId,
      student_name: s.name,
      score: s.score,
      total_questions: quiz.activeQuiz?.questions?.length ?? 0,
      answers_json: [],
    }));

    api
      .post(`/quiz/sessions/${quiz.sessionId}/finalize`, {
        quiz_id: quizId,
        results,
      })
      .then(res => {
        if (res.data?.ok) {
          console.info(`[QuizPodiumModal] Batch finalize: saved ${res.data.count} results for session ${quiz.sessionId}`);
          toast.success(`✅ Resultados guardados (${res.data.count} alumnos)`, { duration: 4000 });
        }
      })
      .catch(err => {
        console.error('[QuizPodiumModal] Batch finalize failed:', err);
        // Non-blocking: podium UX continues even if persistence fails
      });
  }, [isPodiumActive, isTeacher, quiz.studentProgress, quiz.activeQuiz, quiz.sessionId]);

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

  if (!isPodiumActive || isDismissed) return null;

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

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDismissed(true);
    if (onClose) onClose();
    if (isTeacher) {
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

          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
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
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/60 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            ¡Felicitaciones a todos los participantes! 🎉
          </span>

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

            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all"
            >
              {isTeacher ? 'Finalizar Partida' : 'Cerrar Podio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
