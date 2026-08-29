/**
 * Q-04 — QuizAppBarButton
 * Decoupled AppBar button for the Quiz Interactivo feature.
 *
 * Responsibilities:
 *   - Render a clear icon button in the toolbar
 *   - Show a live-status badge (pulsing dot) when a quiz is running
 *   - Show answered-student count for teacher view
 *   - Open the QuizCreatorModal on click
 *
 * Intentionally stateless: all data comes from the useQuizGame hook return value.
 */
import React from 'react';
import { HelpCircle } from 'lucide-react';
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

  return (
    <button
      id="quiz-appbar-btn"
      onClick={() => quiz.setShowQuizCreator(true)}
      title={isLive ? 'Quiz en vivo — abrir panel' : 'Quiz Interactivo (crear y lanzar en vivo)'}
      className={`relative p-2 rounded transition-all ${
        isLive
          ? 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 ring-1 ring-violet-500/40'
          : 'hover:bg-gray-100 text-gray-700'
      } ${className}`}
    >
      <HelpCircle className="w-4 h-4" />

      {/* Pulsing live-status dot */}
      {isLive && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
        </span>
      )}

      {/* Teacher: how many students have answered */}
      {isLive && isTeacher && answeredCount > 0 && (
        <span className="absolute -bottom-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {answeredCount}
        </span>
      )}
    </button>
  );
};