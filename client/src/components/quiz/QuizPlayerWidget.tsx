/**
 * QuizPlayerWidget
 * Immersive, draggable and minimizable Quiz Player widget for students.
 *
 * Features:
 *   - Dark Glassmorphism aesthetic
 *   - Smooth 60 FPS gradient timer bar (Green -> Yellow -> Red)
 *   - Procedural Web Audio FX (ticks, correct chime, incorrect buzz, streak bonus)
 *   - Flame Streak Counter (🔥 x2, x3, x4, x5)
 *   - Minimizable to a non-intrusive bottom pill
 *   - Uses modular QuizQuestionTypes renderers
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2, Volume2, VolumeX, Minimize2, Maximize2,
  Clock, Flame, Sparkles
} from 'lucide-react';
import type { useQuizGame } from '../../hooks/useQuizGame';
import { quizAudio } from '../../services/quizAudioEngine';
import {
  TYPE_LABEL,
  MultipleChoiceRenderer,
  TrueFalseRenderer,
  FillBlankRenderer,
  ListeningRenderer,
  SpeakingRenderer,
  ListeningExtensoRenderer,
} from './QuizQuestionTypes';

interface QuizPlayerWidgetProps {
  quiz: ReturnType<typeof useQuizGame>;
  clientId: string;
  userName: string;
  isTeacher?: boolean;
}

export const QuizPlayerWidget: React.FC<QuizPlayerWidgetProps> = ({
  quiz,
  clientId,
  userName,
  isTeacher = false,
}) => {
  // ─── ALL HOOKS FIRST (React rules: no hooks after conditional returns) ────────
  const [isMuted, setIsMuted] = useState(quizAudio.isMuted());
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });
  const lastRevealedRef = useRef<number | null>(null);
  const prevTimeLeftRef = useRef<number>(quiz.timeLeft);

  // Safely derive question context — null when quiz not active (used in hooks below)
  const activeQuiz = quiz.activeQuiz;
  const question = activeQuiz?.questions[quiz.currentQuestionIndex] ?? null;
  const hasAnswered = quiz.hasAnsweredCurrent;
  const userAnswer = question ? quiz.myAnswers[question.id]?.answer : undefined;
  const revealedAnswer =
    question && quiz.revealedAnswer?.questionId === question.id
      ? quiz.revealedAnswer
      : null;

  // Sound FX: timer tick (last 5 seconds) — safe: runs even if quiz inactive, just no-ops
  useEffect(() => {
    if (
      quiz.quizPhase === 'question' &&
      !hasAnswered &&
      quiz.timeLeft <= 5 &&
      quiz.timeLeft > 0 &&
      quiz.isQuizActive
    ) {
      if (quiz.timeLeft !== prevTimeLeftRef.current) {
        quizAudio.playTick(quiz.timeLeft === 1);
      }
    }
    prevTimeLeftRef.current = quiz.timeLeft;
  }, [quiz.timeLeft, quiz.quizPhase, hasAnswered, quiz.isQuizActive]);

  // Sound FX: answer reveal — safe: no-ops when question is null
  useEffect(() => {
    if (!question) return;
    if (revealedAnswer && lastRevealedRef.current !== question.id) {
      lastRevealedRef.current = question.id;
      const myRecord = quiz.myAnswers[question.id];
      if (myRecord) {
        if (myRecord.isCorrect) {
          quizAudio.playCorrect(quiz.streak);
        } else {
          quizAudio.playIncorrect();
        }
      }
    }
  }, [revealedAnswer, question, quiz.myAnswers, quiz.streak]);

  // ─── Early returns AFTER all hooks (React-safe) ───────────────────────────────
  if (isTeacher || !quiz.isQuizActive || !activeQuiz || !question) {
    return null;
  }

  // ─── Derived handlers (after hooks, before render) ────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    setIsDragging(true);
    const widget = document.getElementById('quiz-player-widget');
    const rect = widget?.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: pos ? pos.x : rect ? rect.left : window.innerWidth - 380,
      posY: pos ? pos.y : rect ? rect.top : window.innerHeight - 450,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    const newX = Math.max(10, Math.min(window.innerWidth - 370, dragStartRef.current.posX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 300, dragStartRef.current.posY + deltaY));
    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };

  const handleToggleMute = () => {
    const nextMuted = quizAudio.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleSubmit = (answer: string | number) => {
    quiz.submitAnswer(question.id, answer, clientId, userName);
  };

  // Timer Percentage & Dynamic Color
  const timerPct = quiz.questionTimeLimit > 0 ? (quiz.timeLeft / quiz.questionTimeLimit) * 100 : 0;
  const timerColor =
    timerPct > 50 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : timerPct > 20 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-rose-600 to-red-500 animate-pulse';

  // ─── Render Minimized Mode ──────────────────────────────────────────────────
  if (quiz.isWidgetMinimized) {
    return (
      <div
        id="quiz-player-minimized"
        onClick={() => quiz.setIsWidgetMinimized(false)}
        className="fixed bottom-4 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0d1117]/95 border border-violet-500/40 shadow-[0_8px_32px_rgba(139,92,246,0.3)] backdrop-blur-xl cursor-pointer hover:scale-105 transition-all text-white animate-bounce-subtle"
      >
        <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-400/30 flex items-center justify-center">
          <Gamepad2 className="w-4 h-4 text-violet-300" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">
              P {quiz.currentQuestionIndex + 1}/{activeQuiz.questions.length}
            </span>
            <span className="text-[11px] font-mono text-amber-300 font-bold">
              ⏱️ {quiz.timeLeft}s
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
            <span>★ {quiz.myScore} pts</span>
            {quiz.streak >= 2 && (
              <span className="text-amber-400 font-bold flex items-center">
                <Flame className="w-3 h-3 text-orange-400 fill-current" /> x{quiz.streak}
              </span>
            )}
          </div>
        </div>
        <div className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300">
          <Maximize2 className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  // ─── Render Full Inmersive Widget ───────────────────────────────────────────
  return (
    <div
      id="quiz-player-widget"
      style={pos ? { left: `${pos.x}px`, top: `${pos.y}px`, bottom: 'auto', right: 'auto' } : {}}
      className={`fixed ${!pos ? 'bottom-6 right-6' : ''} z-50 w-[360px] sm:w-[380px] bg-[#0d1117]/96 backdrop-blur-2xl border border-violet-500/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_20px_rgba(139,92,246,0.25)] overflow-hidden transition-shadow select-none`}
    >
      {/* Header (Draggable Zone) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-violet-950/70 via-purple-950/50 to-slate-950/70 border-b border-white/10 cursor-move"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
            <Gamepad2 className="w-3.5 h-3.5 text-violet-300" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block leading-tight truncate max-w-[140px]">
              {activeQuiz.activity_name || 'Quiz en Vivo'}
            </span>
            <span className="text-[10px] text-violet-300/70 block">
              Pregunta {quiz.currentQuestionIndex + 1} de {activeQuiz.questions.length}
            </span>
          </div>
        </div>

        {/* Header Controls: Timer, Mute & Minimize */}
        <div className="flex items-center gap-1.5">
          {/* Live Timer Pill */}
          <div className="flex items-center gap-1 bg-slate-900/80 border border-white/10 rounded-lg px-2 py-0.5">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className={`text-xs font-mono font-bold ${quiz.timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
              {quiz.timeLeft}s
            </span>
          </div>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title={isMuted ? 'Activar sonido FX' : 'Silenciar sonido FX'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => quiz.setIsWidgetMinimized(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Minimizar widget (no tapar pizarra)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 60 FPS Gradient Timer Bar */}
      <div className="h-1.5 bg-slate-900/80 w-full overflow-hidden">
        <div
          className={`h-full ${timerColor} transition-all duration-300 ease-linear`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Gamification Status Bar (Score & Streaks) */}
      <div className="px-3.5 py-2 flex items-center justify-between bg-slate-900/40 border-b border-white/5">
        <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-slate-800/60 border border-white/5">
          {TYPE_LABEL[question.type] || question.type}
        </span>

        <div className="flex items-center gap-3">
          {/* Flame Streak Counter */}
          {quiz.streak >= 2 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-amber-300 text-[11px] font-bold animate-pulse">
              <Flame className="w-3 h-3 text-orange-400 fill-current" />
              <span>x{quiz.streak} 🔥</span>
            </div>
          )}

          {/* Current Total Score */}
          <span className="text-xs text-indigo-300 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            {quiz.myScore} pts
          </span>
        </div>
      </div>

      {/* Question Body */}
      <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
        {/* Question Prompt */}
        {question.question && (
          <p className="text-xs text-slate-400 font-medium leading-tight">{question.question}</p>
        )}

        {/* Sentence Prompt */}
        {question.sentence && question.type !== 'speaking' && (
          <p className="text-sm font-semibold text-white leading-snug">{question.sentence}</p>
        )}

        {/* Dynamic Question Renderer */}
        {question.type === 'multiple_choice' && (
          <MultipleChoiceRenderer
            question={question}
            hasAnswered={hasAnswered}
            userAnswer={userAnswer}
            revealedAnswer={revealedAnswer}
            onSubmit={handleSubmit}
          />
        )}

        {question.type === 'true_false' && (
          <TrueFalseRenderer
            question={question}
            hasAnswered={hasAnswered}
            userAnswer={userAnswer}
            revealedAnswer={revealedAnswer}
            onSubmit={handleSubmit}
          />
        )}

        {question.type === 'fill_blank' && (
          <FillBlankRenderer
            question={question}
            hasAnswered={hasAnswered}
            userAnswer={userAnswer}
            revealedAnswer={revealedAnswer}
            onSubmit={handleSubmit}
          />
        )}

        {question.type === 'listening' && (
          <ListeningRenderer
            question={question}
            hasAnswered={hasAnswered}
            userAnswer={userAnswer}
            revealedAnswer={revealedAnswer}
            onSubmit={handleSubmit}
            onSpeak={quiz.speakQuestion}
            isSpeaking={quiz.isSpeaking}
          />
        )}

        {question.type === 'speaking' && (
          <SpeakingRenderer
            question={question}
            hasAnswered={hasAnswered}
            userAnswer={userAnswer}
            revealedAnswer={revealedAnswer}
            onSubmit={handleSubmit}
            isListening={quiz.isListening}
            spokenText={quiz.spokenText}
            onStartListening={quiz.startListening}
            onStopListening={quiz.stopListening}
          />
        )}

        {question.type === 'listening_extenso' && (
          <ListeningExtensoRenderer
            question={question}
            hasAnswered={hasAnswered}
            userAnswer={userAnswer}
            revealedAnswer={revealedAnswer}
            onSubmit={handleSubmit}
          />
        )}

        {/* Feedback Area when Answer is Revealed */}
        {revealedAnswer && quiz.lastAnswerFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs space-y-1 animate-fade-in ${
              quiz.lastAnswerFeedback.isCorrect
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>{quiz.lastAnswerFeedback.isCorrect ? '✨ ¡Correcto!' : '❌ Incorrecto'}</span>
              {quiz.lastAnswerFeedback.score !== undefined && quiz.lastAnswerFeedback.score > 0 && (
                <span className="text-emerald-300 font-mono">+{quiz.lastAnswerFeedback.score} pts</span>
              )}
            </div>
            {quiz.lastAnswerFeedback.explanation && (
              <p className="text-[11px] opacity-90 leading-relaxed pt-1">
                {quiz.lastAnswerFeedback.explanation}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
