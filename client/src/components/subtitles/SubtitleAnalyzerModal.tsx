import React from 'react';
import { X, Film, UploadCloud, BookOpen, HelpCircle, RotateCcw } from 'lucide-react';
import { useSubtitleAnalyzer } from './hooks/useSubtitleAnalyzer';
import { SubtitleUploadTab } from './SubtitleUploadTab';
import { SubtitleVocabularyTab } from './SubtitleVocabularyTab';
import { SubtitleQuizTab } from './SubtitleQuizTab';

interface SubtitleAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizExported?: (quizData: any) => void;
}

export const SubtitleAnalyzerModal: React.FC<SubtitleAnalyzerModalProps> = ({
  isOpen,
  onClose,
  onQuizExported,
}) => {
  const {
    file,
    rawText,
    setRawText,
    handleFileSelect,
    isAnalyzing,
    isExporting,
    result,
    activeTab,
    setActiveTab,
    vocabFilter,
    setVocabFilter,
    filteredVocabulary,
    handleAnalyze,
    handleExportQuiz,
    handleReset,
    handleLoadSample,
  } = useSubtitleAnalyzer(onQuizExported);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Estudio Analizador de Subtítulos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Extracción pedagógica de modismos, phrasal verbs y quizzes a partir de películas y series
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {result && (
              <button
                onClick={handleReset}
                title="Cargar otro archivo"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-6 gap-2 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Subir Archivo</span>
          </button>

          <button
            onClick={() => result && setActiveTab('vocabulary')}
            disabled={!result}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'vocabulary'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Vocabulario</span>
            {result && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                {result.vocabulary.length}
              </span>
            )}
          </button>

          <button
            onClick={() => result && setActiveTab('quiz')}
            disabled={!result}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'quiz'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Preguntas de Quiz</span>
            {result && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold">
                {result.questions.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'upload' && (
            <SubtitleUploadTab
              file={file}
              rawText={rawText}
              onFileSelect={handleFileSelect}
              onTextChange={setRawText}
              onLoadSample={handleLoadSample}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />
          )}

          {activeTab === 'vocabulary' && result && (
            <SubtitleVocabularyTab
              vocabulary={filteredVocabulary}
              vocabFilter={vocabFilter}
              onFilterChange={setVocabFilter}
            />
          )}

          {activeTab === 'quiz' && result && (
            <SubtitleQuizTab
              questions={result.questions}
              onExportQuiz={handleExportQuiz}
              isExporting={isExporting}
            />
          )}
        </div>
      </div>
    </div>
  );
};
