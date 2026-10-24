import React from 'react';
import { Volume2, BookOpen, Quote } from 'lucide-react';
import type { SubtitleVocabularyItem, VocabularyType } from '../../types/subtitles';

interface SubtitleVocabularyTabProps {
  vocabulary: SubtitleVocabularyItem[];
  vocabFilter: VocabularyType | 'all';
  onFilterChange: (filter: VocabularyType | 'all') => void;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  phrasal_verb: { label: 'Phrasal Verb', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  idiom: { label: 'Modismo / Idiom', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  expression: { label: 'Expresión', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  adjective: { label: 'Adjetivo Avanzado', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  adverb: { label: 'Adverbio', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
};

export const SubtitleVocabularyTab: React.FC<SubtitleVocabularyTabProps> = ({
  vocabulary,
  vocabFilter,
  onFilterChange,
}) => {
  const speakTerm = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'all', label: 'Todos los términos' },
          { id: 'phrasal_verb', label: 'Phrasal Verbs' },
          { id: 'idiom', label: 'Modismos / Idioms' },
          { id: 'adjective', label: 'Adjetivos / Adverbios' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => onFilterChange(btn.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              vocabFilter === btn.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {btn.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          {vocabulary.length} {vocabulary.length === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>

      {/* Cards Grid */}
      {vocabulary.length === 0 ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
          <p className="text-sm">No se encontraron términos para esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
          {vocabulary.map((item) => {
            const badge = TYPE_LABELS[item.type] || { label: item.type, color: 'bg-slate-100 text-slate-800' };
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-2.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {item.term}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                      <button
                        onClick={() => speakTerm(item.term)}
                        title="Escuchar pronunciación"
                        className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Spanish explanation */}
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium">
                    {item.explanation}
                  </p>
                </div>

                {/* Context from subtitle */}
                {item.context && (
                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 italic">
                    <Quote className="w-3 h-3 shrink-0 text-slate-400 mt-0.5" />
                    <span>"{item.context}"</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
