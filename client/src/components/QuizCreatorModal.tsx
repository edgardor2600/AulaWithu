import React, { useState } from 'react';
import {
  X, HelpCircle, Sparkles, Library, Play, Trash2, Save, Loader2,
  ChevronRight, ChevronLeft, Users, CheckCircle2,
  SkipForward, Eye, Trophy, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { useQuizGame } from '../hooks/useQuizGame';

interface QuizCreatorModalProps {
  quiz: ReturnType<typeof useQuizGame>;
  isTeacher: boolean;
}

const SUBJECT_OPTIONS = ['English', 'Mathematics', 'Science', 'History', 'Geography', 'Generic'];
const LEVEL_OPTIONS   = ['A1', 'A2', 'B1', 'B2', 'C1', 'beginner', 'intermediate', 'advanced'];
const QUESTION_TYPES  = [
  { id: 'multiple_choice', label: 'Opción Múltiple' },
  { id: 'true_false',      label: 'Verdadero / Falso' },
  { id: 'fill_blank',      label: 'Completar Espacio' },
  { id: 'listening',       label: 'Escuchar (Audio)' },
  { id: 'speaking',        label: 'Hablar (Speaking)' },
];

const TYPE_BADGE_COLOR: Record<string, string> = {
  multiple_choice: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  true_false:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  fill_blank:      'bg-amber-500/20 text-amber-300 border-amber-500/30',
  listening:       'bg-violet-500/20 text-violet-300 border-violet-500/30',
  speaking:        'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Opción M.',
  true_false:      'V / F',
  fill_blank:      'Completar',
  listening:       'Escuchar',
  speaking:        'Hablar',
  listening_extenso: 'Historia',
};

export const QuizCreatorModal: React.FC<QuizCreatorModalProps> = ({ quiz, isTeacher }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'library' | 'monitor'>('create');
  const [previewQuestionIdx, setPreviewQuestionIdx] = useState(0);

  if (!quiz.showQuizCreator) return null;

  const handleToggleType = (typeId: string) => {
    quiz.setQuestionTypes(prev =>
      prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
    );
  };

  const q = quiz.generatedQuiz?.questions?.[previewQuestionIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-auto flex flex-col bg-[#0d1117] border border-violet-500/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-violet-900/15 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Quiz Interactivo</h2>
              <p className="text-[10px] text-violet-300/60">Crear y lanzar quizzes en vivo</p>
            </div>
          </div>
          <button
            onClick={() => quiz.setShowQuizCreator(false)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8 shrink-0">
          {[
            { id: 'create',  icon: Sparkles, label: 'Crear' },
            { id: 'library', icon: Library,  label: 'Biblioteca' },
            ...(isTeacher && quiz.isQuizActive ? [{ id: 'monitor', icon: Users, label: 'Monitoreo' }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-violet-400 border-violet-400'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* ═══ CREATE ═══ */}
          {activeTab === 'create' && (
            <div className="p-5 space-y-4">
              {/* Config row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1.5 block">Asignatura</label>
                  <select
                    value={quiz.subject}
                    onChange={e => quiz.setSubject(e.target.value)}
                    className="w-full bg-slate-800/60 border border-white/10 text-slate-200 text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-violet-500/50"
                  >
                    {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1.5 block">Nivel</label>
                  <select
                    value={quiz.level}
                    onChange={e => quiz.setLevel(e.target.value)}
                    className="w-full bg-slate-800/60 border border-white/10 text-slate-200 text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-violet-500/50"
                  >
                    {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1.5 block">Preguntas</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={quiz.count}
                    onChange={e => quiz.setCount(Number(e.target.value))}
                    className="w-full bg-slate-800/60 border border-white/10 text-slate-200 text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1.5 block">Tema</label>
                <input
                  value={quiz.topic}
                  onChange={e => quiz.setTopic(e.target.value)}
                  placeholder="e.g. Present Perfect, Fracciones, Segunda Guerra Mundial..."
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
                  spellCheck={false}
                  className="w-full bg-slate-800/60 border border-white/10 text-slate-200 text-sm rounded-lg px-3 py-2.5 placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {/* Question types */}
              <div>
                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-2 block">Tipos de pregunta</label>
                <div className="flex flex-wrap gap-2">
                  {QUESTION_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleToggleType(t.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        quiz.questionTypes.includes(t.id)
                          ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                          : 'bg-slate-800/60 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={quiz.generateQuiz}
                disabled={quiz.isGenerating || !quiz.topic.trim() || quiz.questionTypes.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-violet-900/40"
              >
                {quiz.isGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando con IA...</>
                  : <><Sparkles className="w-4 h-4" /> Generar Quiz con IA</>}
              </button>

              {/* Preview generated quiz */}
              {quiz.generatedQuiz && (
                <div className="space-y-3 border-t border-white/8 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">{quiz.generatedQuiz.activity_name}</p>
                    <span className="text-[11px] text-slate-400">{quiz.generatedQuiz.questions?.length} preguntas</span>
                  </div>

                  {/* Question navigator */}
                  {q && (
                    <div className="bg-slate-800/40 border border-white/8 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium ${TYPE_BADGE_COLOR[q.type] || 'bg-slate-700/40 text-slate-300 border-white/10'}`}>
                          {TYPE_LABEL[q.type] || q.type}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setPreviewQuestionIdx(Math.max(0, previewQuestionIdx - 1))} disabled={previewQuestionIdx === 0} className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] text-slate-400">{previewQuestionIdx + 1}/{quiz.generatedQuiz.questions.length}</span>
                          <button onClick={() => setPreviewQuestionIdx(Math.min(quiz.generatedQuiz!.questions.length - 1, previewQuestionIdx + 1))} disabled={previewQuestionIdx >= quiz.generatedQuiz.questions.length - 1} className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{q.question}</p>
                      <p className="text-sm text-white font-medium">{q.sentence}</p>
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {q.options.map((opt, i) => (
                            <div
                              key={i}
                              className={`px-3 py-1.5 rounded-lg text-xs ${
                                i === Number(q.correct)
                                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                                  : 'bg-slate-700/30 text-slate-400'
                              }`}
                            >
                              {String.fromCharCode(65 + i)}. {opt}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => quiz.saveToLibrary()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-700/40 hover:bg-slate-700 border border-white/10 text-slate-300 rounded-xl text-sm font-medium transition-all"
                    >
                      <Save className="w-4 h-4" />
                      Guardar
                    </button>
                    {isTeacher && (
                      <button
                        onClick={() => {
                          quiz.launchQuiz(quiz.generatedQuiz!);
                          quiz.setShowQuizCreator(false);
                          setActiveTab('monitor');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-900/40"
                      >
                        <Play className="w-4 h-4" />
                        Lanzar en Vivo
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ LIBRARY ═══ */}
          {activeTab === 'library' && (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Quizzes Guardados</p>
                <button onClick={quiz.loadLibrary} disabled={quiz.isLoadingLibrary} className="text-[11px] text-violet-400 hover:text-violet-300">
                  {quiz.isLoadingLibrary ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>
              {quiz.isLoadingLibrary ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
              ) : quiz.savedQuizzes.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">No hay quizzes guardados</p>
              ) : (
                quiz.savedQuizzes.map(q => (
                  <div key={q.id} className="bg-slate-800/40 border border-white/8 rounded-xl p-3 space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{q.title}</p>
                      <p className="text-[11px] text-slate-400">{q.subject} · {q.level} · {new Date(q.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const full = await quiz.loadQuizById(q.id);
                          if (full) {
                            quiz.setGeneratedQuiz({ ...full, activity_name: q.title });
                            setActiveTab('create');
                            toast.success(`Quiz cargado: ${q.title}`);
                          }
                        }}
                        className="flex-1 py-1.5 text-xs bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-lg transition-all"
                      >
                        Cargar
                      </button>
                      {isTeacher && (
                        <button
                          onClick={async () => {
                            const full = await quiz.loadQuizById(q.id);
                            if (full) {
                              quiz.launchQuiz({ ...full, activity_name: q.title });
                              quiz.setShowQuizCreator(false);
                            }
                          }}
                          className="flex-1 py-1.5 text-xs bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-lg transition-all"
                        >
                          Lanzar
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm(`¿Eliminar "${q.title}"?`)) quiz.deleteQuiz(q.id); }}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ═══ MONITOR (Teacher only) ═══ */}
          {activeTab === 'monitor' && quiz.isQuizActive && quiz.activeQuiz && (
            <div className="p-5 space-y-4">
              {/* Phase indicator */}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  quiz.quizPhase === 'question'    ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' :
                  quiz.quizPhase === 'reveal'      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' :
                  quiz.quizPhase === 'leaderboard' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' :
                  quiz.quizPhase === 'podium'      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' :
                  'bg-slate-700/40 border-white/10 text-slate-400'
                }`}>
                  {quiz.quizPhase === 'question' ? '⏱ Respondiendo' :
                   quiz.quizPhase === 'reveal'   ? '✅ Revelado' :
                   quiz.quizPhase === 'leaderboard' ? '🏆 Leaderboard' :
                   quiz.quizPhase === 'podium'   ? '🎉 Podio' : quiz.quizPhase}
                </span>
                <span className="text-[11px] text-slate-400">
                  P {quiz.currentQuestionIndex + 1} / {quiz.activeQuiz.questions.length}
                </span>
              </div>

              {/* Current question info */}
              <div className="bg-slate-800/40 border border-white/8 rounded-xl p-4">
                <p className="text-sm text-white font-medium">
                  {quiz.activeQuiz.questions[quiz.currentQuestionIndex]?.sentence}
                </p>
                {quiz.quizPhase === 'question' && (
                  <>
                    <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${(quiz.timeLeft / quiz.questionTimeLimit) * 100}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 text-right">{quiz.timeLeft}s</p>
                  </>
                )}
              </div>

              {/* Student progress */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                    Respondieron: {quiz.studentProgress.filter(p => p.hasAnswered).length}
                  </p>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {quiz.studentProgress.length === 0 ? (
                    <p className="text-xs text-slate-500">Esperando respuestas...</p>
                  ) : (
                    quiz.studentProgress
                      .sort((a, b) => b.score - a.score)
                      .map((p, i) => (
                        <div key={p.clientId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/40">
                          <span className="text-[10px] text-slate-500 w-4 text-center">{i + 1}</span>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${p.hasAnswered ? 'text-emerald-400' : 'text-slate-600'}`} />
                          <span className="text-xs text-slate-300 flex-1 truncate">{p.name}</span>
                          {p.hasAnswered && <span className="text-[11px] text-emerald-400 font-bold">{p.score}pts</span>}
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Teacher FSM Controls */}
              <div className="space-y-2">
                {/* Reveal — only in question phase */}
                {quiz.quizPhase === 'question' && (
                  <button
                    onClick={quiz.revealCurrentAnswer}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm font-semibold transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    Revelar Respuesta
                  </button>
                )}

                {/* Next question / Podium — from reveal phase */}
                {(quiz.quizPhase === 'reveal' || quiz.quizPhase === 'question') && (
                  <div className="flex gap-2">
                    <button
                      onClick={quiz.skipToNextQuestion}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-xl text-sm font-medium transition-all"
                    >
                      <SkipForward className="w-4 h-4" />
                      {quiz.currentQuestionIndex + 1 >= quiz.activeQuiz.questions.length ? 'Ver Podio' : 'Siguiente'}
                    </button>
                    <button
                      onClick={quiz.stopQuiz}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-medium transition-all"
                    >
                      <Trophy className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Force close */}
                <button
                  onClick={quiz.forceStopQuiz}
                  className="w-full flex items-center justify-center gap-2 py-2 text-[11px] text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Terminar y Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

