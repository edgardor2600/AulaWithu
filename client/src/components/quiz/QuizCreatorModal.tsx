/**
 * QuizCreatorModal
 * Comprehensive modal for quiz generation with AI, library management,
 * and live session monitoring.
 */
import React, { useState } from 'react';
import {
  X, Gamepad2, Sparkles, Library, Play, Trash2, Save, Loader2,
  ChevronRight, ChevronLeft, Users, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { useQuizGame, Quiz } from '../../hooks/useQuizGame';
import { QuizLiveMonitor } from './QuizLiveMonitor';

interface QuizCreatorModalProps {
  quiz: ReturnType<typeof useQuizGame>;
  isTeacher: boolean;
}

const SUBJECT_OPTIONS = ['English', 'Mathematics', 'Science', 'History', 'Geography', 'Generic'];
const LEVEL_OPTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'beginner', 'intermediate', 'advanced'];
const QUESTION_TYPES = [
  { id: 'multiple_choice', label: 'Opción Múltiple' },
  { id: 'true_false', label: 'Verdadero / Falso' },
  { id: 'fill_blank', label: 'Completar Espacio' },
  { id: 'listening', label: 'Escuchar (Audio)' },
  { id: 'speaking', label: 'Hablar (Speaking)' },
];

const TYPE_BADGE_COLOR: Record<string, string> = {
  multiple_choice: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  true_false: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  fill_blank: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  listening: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  speaking: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

export const QuizCreatorModal: React.FC<QuizCreatorModalProps> = ({ quiz, isTeacher }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'library' | 'monitor'>(
    quiz.isQuizActive ? 'monitor' : 'create'
  );
  const [previewQuestionIdx, setPreviewQuestionIdx] = useState(0);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedLibraryQuiz, setSelectedLibraryQuiz] = useState<Quiz | null>(null);

  if (!quiz.showQuizCreator) return null;

  const handleToggleType = (typeId: string) => {
    quiz.setQuestionTypes(prev =>
      prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
    );
  };

  const activePreviewQuiz = selectedLibraryQuiz || quiz.generatedQuiz;
  const q = activePreviewQuiz?.questions?.[previewQuestionIdx];

  const filteredLibrary = quiz.savedQuizzes.filter(item => {
    const term = librarySearch.toLowerCase().trim();
    if (!term) return true;
    return (
      item.title?.toLowerCase().includes(term) ||
      item.topic?.toLowerCase().includes(term) ||
      item.subject?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-2xl mx-auto flex flex-col bg-[#0d1117] border border-violet-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-slate-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center shadow-md">
              <Gamepad2 className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Quiz Interactivo</h2>
              <p className="text-[10px] text-violet-300/70">Generación IA, biblioteca y control en vivo</p>
            </div>
          </div>
          <button
            onClick={() => quiz.setShowQuizCreator(false)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 shrink-0 bg-slate-900/60">
          {[
            { id: 'create', icon: Sparkles, label: 'Crear con IA' },
            { id: 'library', icon: Library, label: 'Biblioteca' },
            ...(isTeacher && quiz.isQuizActive ? [{ id: 'monitor', icon: Users, label: 'Monitor en Vivo 🟢' }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-violet-300 border-violet-400 bg-violet-500/10'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {/* ─── TAB 1: CREAR CON IA ─── */}
          {activeTab === 'create' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Tema o Concepto a Evaluar
                  </label>
                  <input
                    type="text"
                    value={quiz.topic}
                    onChange={e => quiz.setTopic(e.target.value)}
                    placeholder="Ej. Past Simple vs Continuous, Photosynthesis, Fractions..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Materia</label>
                    <select
                      value={quiz.subject}
                      onChange={e => quiz.setSubject(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
                    >
                      {SUBJECT_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nivel</label>
                    <select
                      value={quiz.level}
                      onChange={e => quiz.setLevel(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
                    >
                      {LEVEL_OPTIONS.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Preguntas</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={quiz.count}
                      onChange={e => quiz.setCount(parseInt(e.target.value, 10) || 5)}
                      className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500 text-center"
                    />
                  </div>
                </div>

                {/* Question Type Checkboxes */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Tipos de Pregunta Permitidos:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUESTION_TYPES.map(t => {
                      const selected = quiz.questionTypes.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleToggleType(t.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            selected
                              ? 'bg-violet-600/30 border-violet-500 text-violet-200'
                              : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {selected && '✓ '}
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                disabled={quiz.isGenerating || !quiz.topic.trim()}
                onClick={quiz.generateQuiz}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {quiz.isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generando preguntas con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generar Quiz con IA
                  </>
                )}
              </button>

              {/* Quiz Preview Card */}
              {activePreviewQuiz && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {activePreviewQuiz.activity_name || activePreviewQuiz.title || 'Quiz Generado'}
                      </h3>
                      <span className="text-[11px] text-violet-300 font-medium">
                        {activePreviewQuiz.questions?.length || 0} preguntas listadas
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => quiz.saveToLibrary(activePreviewQuiz)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all"
                      >
                        <Save className="w-3.5 h-3.5" /> Guardar
                      </button>

                      {isTeacher && (
                        <button
                          type="button"
                          onClick={() => {
                            quiz.launchQuiz(activePreviewQuiz);
                            setActiveTab('monitor');
                          }}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Lanzar en Vivo 🚀
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Navigator */}
                  {q && (
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-violet-500/20 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${TYPE_BADGE_COLOR[q.type] || 'bg-slate-800 text-slate-300'}`}>
                          {q.type}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={previewQuestionIdx === 0}
                            onClick={() => setPreviewQuestionIdx(p => Math.max(0, p - 1))}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-slate-300"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-[11px] text-slate-400 font-bold">
                            {previewQuestionIdx + 1} / {activePreviewQuiz.questions.length}
                          </span>
                          <button
                            type="button"
                            disabled={previewQuestionIdx === activePreviewQuiz.questions.length - 1}
                            onClick={() => setPreviewQuestionIdx(p => Math.min(activePreviewQuiz.questions.length - 1, p + 1))}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-slate-300"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {q.question && <p className="text-xs text-slate-400">{q.question}</p>}
                      {q.sentence && <p className="text-sm font-semibold text-white">{q.sentence}</p>}

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt, i) => (
                            <div
                              key={i}
                              className={`p-2 rounded-lg text-xs border ${
                                Number(q.correct) === i
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 font-semibold'
                                  : 'bg-slate-800/60 border-white/5 text-slate-300'
                              }`}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.explanation && (
                        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-white/5">
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 2: BIBLIOTECA ─── */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={e => setLibrarySearch(e.target.value)}
                  placeholder="Buscar en la biblioteca por tema, materia o nivel..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500"
                />
              </div>

              {quiz.isLoadingLibrary ? (
                <div className="flex items-center justify-center p-8 text-slate-400 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando biblioteca...
                </div>
              ) : filteredLibrary.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-xs">
                  No se encontraron quizzes guardados.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLibrary.map(item => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-violet-500/40 transition-all flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-violet-300">
                            {item.subject}
                          </span>
                          <span>Nivel: {item.level}</span>
                          <span>•</span>
                          <span>Tema: {item.topic}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const full = await quiz.loadQuizById(item.id);
                            if (full) {
                              setSelectedLibraryQuiz(full);
                              setPreviewQuestionIdx(0);
                              setActiveTab('create');
                              toast.success('Quiz cargado para edición/lanzamiento');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 text-xs font-bold transition-all"
                        >
                          Cargar
                        </button>

                        {isTeacher && (
                          <button
                            type="button"
                            onClick={async () => {
                              const full = await quiz.loadQuizById(item.id);
                              if (full) {
                                quiz.launchQuiz(full);
                                setActiveTab('monitor');
                              }
                            }}
                            className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-bold transition-all"
                            title="Lanzar en vivo directamente"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('¿Seguro que deseas eliminar este quiz de la biblioteca?')) {
                              quiz.deleteQuiz(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 3: MONITOR EN VIVO ─── */}
          {activeTab === 'monitor' && (
            <QuizLiveMonitor quiz={quiz} />
          )}
        </div>
      </div>
    </div>
  );
};
