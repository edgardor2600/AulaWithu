import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react';
import type { SubtitleQuizQuestion } from '../../types/subtitles';

interface SubtitleQuizTabProps {
  questions: SubtitleQuizQuestion[];
  onExportQuiz: () => void;
  isExporting: boolean;
}

export const SubtitleQuizTab: React.FC<SubtitleQuizTabProps> = ({
  questions,
  onExportQuiz,
  isExporting,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 dark:text-slate-400">
        <HelpCircle className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
        <p className="text-sm">No se generaron preguntas de quiz para este archivo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          {questions.length} Preguntas de Comprensión y Gramática
        </span>
        <button
          onClick={onExportQuiz}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Exportando...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Guardar en Biblioteca de Quizzes</span>
            </>
          )}
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const isExpanded = expandedId === q.id;
          return (
            <div
              key={q.id || idx}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3"
            >
              {/* Question title */}
              <div
                onClick={() => toggleExpand(q.id)}
                className="flex items-start justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                    {q.question}
                  </p>
                </div>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {q.options.map((opt: string, optIdx: number) => {
                  const isCorrect = optIdx === q.correct_option_index;
                  return (
                    <div
                      key={optIdx}
                      className={`text-xs px-3 py-2 rounded-lg flex items-center justify-between gap-2 border ${
                        isCorrect
                          ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 font-medium'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {isCorrect && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Collapsible explanation */}
              {isExpanded && q.explanation && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">Explicación:</span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
