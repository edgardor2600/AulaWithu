/**
 * QuizAppBarButton
 * Decoupled AppBar button for the Quiz Interactivo feature.
 *
 * Responsibilities:
 *   - Render Gamepad2 icon in the toolbar (avoiding collision with other tools)
 *   - Show an animated pulsing live badge / pill when a quiz is running
 *   - Show answered-student count for teacher view
 *   - Open QuizCreatorModal (teacher) or restore QuizPlayerWidget (student) on click
 */
import React from 'react';
import { Gamepad2 } from 'lucide-react';
import type { useQuizGame } from '../../hooks/useQuizGame';

interface QuizAppBarButtonProps {
  quiz: ReturnType<typeof useQuizGame>;
  isTeacher: boolean;
  className?: string;
}

export const QuizAppBarButton: React.FC<QuizAppBarButtonProps> = ({
  quiz,
  isTeacher,
  className = '',
}) => {
  const isLive = quiz.isQuizActive;
  const answeredCount = isTeacher
    ? quiz.studentProgress.filter(p => p.hasAnswered).length
    : 0;
  const totalStudents = quiz.studentProgress.length;
  const currentQ = quiz.currentQuestionIndex + 1;
  const totalQ = quiz.activeQuiz?.questions?.length || 0;

  const handleClick = () => {
    if (isTeacher) {
      quiz.setShowQuizCreator(true);
    } else {
      // Si el alumno minimizó o cerró el widget, lo restaura
      quiz.setIsWidgetMinimized?.(false);
    }
  };

  // Si no es profesor y no hay quiz activo, no mostramos nada para no saturar
  if (!isTeacher && !isLive) {
    return null;
  }

  return (
    <button
      id="quiz-appbar-btn"
      onClick={handleClick}
      title={
        isLive
          ? isTeacher
            ? `🎮 Quiz en vivo (P ${currentQ}/${totalQ}) — Clic para abrir monitor`
            : `🎮 Quiz activo (P ${currentQ}/${totalQ}) — Clic para ver pregunta`
          : '🎮 Quiz Interactivo (crear y lanzar en vivo)'
      }
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
        isLive
          ? 'bg-gradient-to-r from-violet-600/30 to-purple-600/30 text-violet-200 hover:from-violet-600/40 hover:to-purple-600/40 ring-1 ring-violet-400/50 shadow-[0_0_12px_rgba(139,92,246,0.25)]'
          : 'hover:bg-gray-100 text-gray-700'
      } ${className}`}
    >
      <Gamepad2 className={`w-4 h-4 ${isLive ? 'text-violet-300' : 'text-slate-600'}`} />

      {isLive && (
        <span className="hidden sm:inline-flex items-center gap-1">
          <span className="font-bold text-white">Quiz</span>
          <span className="text-[11px] text-violet-200">
            {currentQ}/{totalQ}
          </span>
          {isTeacher && totalStudents > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/80 text-white text-[10px] font-bold">
              {answeredCount}/{totalStudents}
            </span>
          )}
        </span>
      )}

      {/* Pulsing live-status dot */}
      {isLive && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
        </span>
      )}
    </button>
  );
};