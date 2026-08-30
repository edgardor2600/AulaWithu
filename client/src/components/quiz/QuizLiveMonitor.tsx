/**
 * QuizLiveMonitor
 * Real-time classroom monitoring dashboard for the teacher.
 *
 * Responsibilities:
 *   - Display global metrics (participation %, time left, class average)
 *   - Render dynamic live cards for every connected student
 *   - Provide live session controls (+15s, Reveal Answer, Next Question, Finalize)
 */
import React from 'react';
import {
  Users, Clock, CheckCircle2, HelpCircle,
  Plus, SkipForward, Eye, Trophy, Sparkles, XCircle
} from 'lucide-react';
import type { useQuizGame } from '../../hooks/useQuizGame';

interface QuizLiveMonitorProps {
  quiz: ReturnType<typeof useQuizGame>;
}

export const QuizLiveMonitor: React.FC<QuizLiveMonitorProps> = ({ quiz }) => {
  const activeQuiz = quiz.activeQuiz;
  if (!activeQuiz) return null;

  const currentQIndex = quiz.currentQuestionIndex;
  const currentQ = activeQuiz.questions[currentQIndex];
  const totalQ = activeQuiz.questions.length;

  const students = quiz.studentProgress;
  const totalStudents = students.length;
  const answeredCount = students.filter(s => s.hasAnswered).length;
  const participationPct = totalStudents > 0 ? Math.round((answeredCount / totalStudents) * 100) : 0;
  const avgScore = totalStudents > 0 ? Math.round(students.reduce((sum, s) => sum + s.score, 0) / totalStudents) : 0;

  const isQuestionPhase = quiz.quizPhase === 'question';
  const isRevealPhase = quiz.quizPhase === 'reveal';

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ─── Top Control Bar & Live Metrics ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Metric 1: Question Progress */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Pregunta</div>
            <div className="text-base font-bold text-white">
              {currentQIndex + 1} <span className="text-xs text-slate-400">/ {totalQ}</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Live Timer */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Tiempo</div>
              <div className={`text-base font-mono font-bold ${quiz.timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                {quiz.timeLeft}s
              </div>
            </div>
          </div>
          {/* Quick +15s Button */}
          <button
            type="button"
            onClick={() => quiz.extendTime(15)}
            className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1 transition-all"
            title="Añadir 15 segundos al temporizador"
          >
            <Plus className="w-3.5 h-3.5" /> 15s
          </button>
        </div>

        {/* Metric 3: Participation */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              <span>Respuestas</span>
              <span className="text-emerald-400">{participationPct}%</span>
            </div>
            <div className="text-sm font-bold text-white">
              {answeredCount} <span className="text-xs text-slate-400">/ {totalStudents} alumnos</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Class Average */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Promedio Clase</div>
            <div className="text-base font-bold text-indigo-300">
              {avgScore} <span className="text-xs text-slate-400">pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Teacher Action Toolbar ─── */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-violet-950/40 via-slate-900/60 to-purple-950/40 border border-violet-500/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Acciones del Profesor:</span>
          {isQuestionPhase && (
            <button
              type="button"
              onClick={quiz.revealCurrentAnswer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> Revelar Solución
            </button>
          )}

          <button
            type="button"
            onClick={quiz.skipToNextQuestion}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all"
          >
            <SkipForward className="w-3.5 h-3.5" /> Siguiente Pregunta
          </button>
        </div>

        <button
          type="button"
          onClick={quiz.stopQuiz}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition-all"
        >
          <Trophy className="w-3.5 h-3.5" /> Ver Podio Final
        </button>
      </div>

      {/* ─── Current Question Preview Banner ─── */}
      {currentQ && (
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-violet-300">P{currentQIndex + 1}: {currentQ.type}</span>
            {isRevealPhase && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Solución Revelada
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white">{currentQ.sentence || currentQ.question}</p>
        </div>
      )}

      {/* ─── Live Student Cards Grid ─── */}
      <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center text-xs font-bold text-slate-400 px-1">
          <span>Participantes en Vivo ({totalStudents})</span>
          <span>Estado de Respuesta</span>
        </div>

        {totalStudents === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/40 border border-dashed border-white/10 text-slate-400 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-500 animate-pulse" />
            <p className="text-xs font-semibold">Esperando a que los alumnos se conecten o respondan...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 overflow-y-auto max-h-[300px] custom-scrollbar p-1">
            {students.map(student => {
              let statusBadge = (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-medium animate-pulse">
                  <Clock className="w-3 h-3" /> Pensando...
                </span>
              );
              let cardBorder = 'bg-slate-900/80 border-white/10';

              if (isRevealPhase && student.hasAnswered) {
                if (student.currentIsCorrect) {
                  cardBorder = 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]';
                  statusBadge = (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Acierto {student.currentScore ? `(+${student.currentScore})` : ''}
                    </span>
                  );
                } else if (student.currentIsCorrect === false) {
                  cardBorder = 'bg-rose-950/30 border-rose-500/40';
                  statusBadge = (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                      <XCircle className="w-3 h-3" /> Falló
                    </span>
                  );
                }
              } else if (student.hasAnswered) {
                cardBorder = 'bg-emerald-950/20 border-emerald-500/30';
                statusBadge = (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Respondió
                  </span>
                );
              }

              return (
                <div
                  key={student.clientId}
                  className={`p-3 rounded-xl border transition-all ${cardBorder}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-violet-200 text-xs font-bold">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white truncate max-w-[120px]">
                          {student.name}
                        </div>
                        <div className="text-[10px] text-indigo-300 font-medium">
                          ★ {student.score} pts
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Status Badge */}
                    <div>
                      {statusBadge}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
