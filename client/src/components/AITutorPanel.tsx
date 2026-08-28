import React, { useState, useEffect } from 'react';
import {
  X, Bot, Sparkles, Play, Mic, MicOff, ChevronRight,
  ChevronLeft, Volume2, VolumeX, CheckCircle2, XCircle, Camera,
  Save, Trash2, Loader2, Zap, Layers, Eraser,
} from 'lucide-react';
import type { useAITutor } from '../hooks/useAITutor';

interface AITutorPanelProps {
  tutor: ReturnType<typeof useAITutor>;
  classId?: string | null;
  topicId?: string | null;
  onReloadSlides?: () => Promise<void>;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const PANEL_BASE = 'fixed right-0 top-0 h-full z-40 flex flex-col shadow-2xl';
const PANEL_W = 'w-[400px]';
const DARK_BG = 'bg-[#0d1117]';
const BORDER = 'border-l border-indigo-500/20';
const TAB_ACTIVE = 'text-indigo-400 border-b-2 border-indigo-400';
const TAB_INACTIVE = 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent';

const SUBJECT_OPTIONS = ['English', 'Mathematics', 'Science', 'History', 'Geography', 'Generic'];
const LEVEL_OPTIONS_ENGLISH = ['A1', 'A2', 'B1', 'B2', 'C1'];
const LEVEL_OPTIONS_MATH = ['beginner', 'intermediate', 'advanced'];

export const AITutorPanel: React.FC<AITutorPanelProps> = ({ tutor, classId, topicId, onReloadSlides }) => {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  // P-06: ID del material en espera de confirmación antes de eliminar
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // P-14: Query de búsqueda en biblioteca
  const [librarySearch, setLibrarySearch] = useState('');

  // P-03: Resetear el índice de ejercicio al cambiar de fase.
  // El componente NO remonta al navegar fases — solo se re-renderiza — por lo que
  // el estado local se mantiene. Sin este efecto, un exerciseIndex de fase anterior
  // puede indexar fuera de rango en la nueva fase (acceso a exercises[N] = undefined).
  useEffect(() => {
    setExerciseIndex(0);
  }, [tutor.currentPhaseIndex]);

  // P-14: Debounce de búsqueda en biblioteca — lanza la carga 400ms después de que el usuario
  // deja de tipear para evitar request por cada tecla.
  useEffect(() => {
    if (tutor.activeTab !== 'library') return;
    const timer = setTimeout(() => {
      tutor.loadLibrary(librarySearch || undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [librarySearch, tutor.activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tutor.showAITutorPanel) return null;

  const phase = tutor.script?.phases[tutor.currentPhaseIndex] || tutor.activeSlidePhaseData;
  const totalPhases = tutor.script?.phases.length ?? (tutor.activeSlidePhaseData ? 1 : 0);
  const levelOptions = tutor.subject.toLowerCase().includes('math') ? LEVEL_OPTIONS_MATH : LEVEL_OPTIONS_ENGLISH;

  const handleToggleMic = () => {
    if (tutor.isListening) tutor.stopListening();
    else tutor.startListening();
  };

  return (
    <div className={`${PANEL_BASE} ${PANEL_W} ${DARK_BG} ${BORDER}`}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-indigo-900/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">AI Tutor</h2>
            <p className="text-[10px] text-indigo-300/70">Lecciones Estructuradas con IA</p>
          </div>
        </div>
        <button
          onClick={() => tutor.setShowAITutorPanel(false)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-white/10 shrink-0 bg-slate-900/40">
        <button
          onClick={() => tutor.setActiveTab('generator')}
          className={`flex-1 py-2.5 text-xs font-medium text-center transition-all ${
            tutor.activeTab === 'generator' ? TAB_ACTIVE : TAB_INACTIVE
          }`}
        >
          Generador
        </button>
        <button
          onClick={() => tutor.setActiveTab('library')}
          className={`flex-1 py-2.5 text-xs font-medium text-center transition-all ${
            tutor.activeTab === 'library' ? TAB_ACTIVE : TAB_INACTIVE
          }`}
        >
          Biblioteca
        </button>
        <button
          onClick={() => tutor.setActiveTab('runtime')}
          disabled={!tutor.script && !tutor.activeSlidePhaseData}
          className={`flex-1 py-2.5 text-xs font-medium text-center transition-all disabled:opacity-30 ${
            tutor.activeTab === 'runtime' ? TAB_ACTIVE : TAB_INACTIVE
          }`}
        >
          En Clase {(tutor.script || tutor.activeSlidePhaseData) ? '●' : ''}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* ═══ TAB: GENERATOR ═══ */}
        {tutor.activeTab === 'generator' && (
          <div className="p-4 space-y-4">
            {/* Subject */}
            <div>
              <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium block mb-1.5">
                Asignatura
              </label>
              <select
                value={tutor.subject}
                onChange={e => tutor.setSubject(e.target.value)}
                className="w-full bg-slate-800/80 border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500/50"
              >
                {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium block mb-1.5">
                Nivel
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {levelOptions.map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => tutor.setLevel(lvl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      tutor.level === lvl
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium block mb-1.5">
                Tema de la lección
              </label>
              <input
                type="text"
                value={tutor.topic}
                onChange={e => tutor.setTopic(e.target.value)}
                placeholder="ej. Past Simple vs Past Continuous, Teorema de Pitágoras..."
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
                spellCheck={false}
                className="w-full bg-slate-800/80 border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2.5 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Context (optional) */}
            <div>
              <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium block mb-1.5">
                Contexto / Enfoque (opcional)
              </label>
              <textarea
                value={tutor.context}
                onChange={e => tutor.setContext(e.target.value)}
                placeholder="ej. Enfocarse en verbos irregulares comunes en conversación..."
                rows={2}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
                spellCheck={false}
                className="w-full bg-slate-800/80 border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            {/* Mode selection */}
            <div>
              <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium block mb-1.5">
                Tipo de Lección
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => tutor.setMode('guided')}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    tutor.mode === 'guided'
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-slate-800/40 border-white/5 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <p className="text-xs font-semibold">Clase Guiada</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">6 fases pedagógicas estructuradas</p>
                </button>
                <button
                  onClick={() => tutor.setMode('practice')}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    tutor.mode === 'practice'
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-slate-800/40 border-white/5 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <p className="text-xs font-semibold">Práctica Libre</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Ejercicios interactivos con IA</p>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={tutor.mode === 'guided' ? tutor.generateLesson : tutor.generatePractice}
                disabled={tutor.isGenerating}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
              >
                {tutor.isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Diseñando lección estructurada con MiniMax...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{tutor.mode === 'guided' ? 'Generar Clase Guiada' : 'Generar Práctica'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══ TAB: LIBRARY ═══ */}
        {tutor.activeTab === 'library' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Materiales Guardados</span>
              <button
                onClick={() => tutor.loadLibrary()}
                className="text-[11px] text-indigo-400 hover:text-indigo-300"
              >
                Actualizar
              </button>
            </div>
            {/* P-14: Campo de búsqueda — dispara carga con debounce vía useEffect */}
            <input
              type="text"
              value={librarySearch}
              onChange={e => setLibrarySearch(e.target.value)}
              placeholder="Buscar por tema o título..."
              className="w-full bg-slate-800/80 border border-white/10 text-slate-200 text-xs rounded-lg px-3 py-2 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            {tutor.isLoadingLibrary ? (
              <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando biblioteca...
              </div>
            ) : tutor.savedMaterials.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No hay lecciones guardadas aún.
              </div>
            ) : (
              tutor.savedMaterials.map(mat => (
                <div
                  key={mat.content_id}
                  className="bg-slate-800/60 border border-white/5 rounded-xl p-3 hover:border-indigo-500/30 transition-all flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{mat.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {mat.subject} · {mat.level} · {new Date(mat.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => tutor.loadFromLibrary(mat.content_id)}
                      className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all text-xs"
                      title="Cargar en clase"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    {/* P-06: Confirmación en dos pasos — evita eliminaciones accidentales */}
                    {deletingId === mat.content_id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { tutor.deleteMaterial(mat.content_id); setDeletingId(null); }}
                          className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-500 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-700 text-slate-300 text-[10px] hover:bg-slate-600 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(mat.content_id)}
                        className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white transition-all text-xs"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ TAB: RUNTIME (Class Control) ═══ */}
        {tutor.activeTab === 'runtime' && (tutor.script || tutor.activeSlidePhaseData) && (
          <div className="p-4 space-y-4">
            {/* Top Multi-Slide Creation & Save Banner */}
            {tutor.script && (
              <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/20 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span className="text-[11px] text-slate-200 font-medium">Diapositivas de Lección</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {classId && (
                    !tutor.lessonSlidesCreated ? (
                      <button
                        onClick={() => tutor.convertLessonToSlides(classId || undefined, topicId || undefined, onReloadSlides)}
                        disabled={tutor.isConvertingSlides}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-md transition-all disabled:opacity-50"
                        title="Crea 1 diapositiva por cada fase de la lección en la barra lateral"
                      >
                        {tutor.isConvertingSlides ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layers className="w-3 h-3" />}
                        Crear Diapositivas ({totalPhases})
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        ✓ {totalPhases} diapositivas creadas
                      </span>
                    )
                  )}
                  <button
                    onClick={tutor.saveToLibrary}
                    className="px-2.5 py-1 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all"
                    title="Guardar en biblioteca"
                  >
                    <Save className="w-3 h-3" />
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {/* P-08: Pills de contexto de la lección activa */}
            {tutor.script && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                  <span className="text-[10px] text-indigo-300 font-semibold truncate max-w-[180px]" title={tutor.script.topic}>
                    {tutor.script.topic}
                  </span>
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-700/50 border border-white/10 rounded-full">
                  <span className="text-[10px] text-slate-400">
                    {tutor.script.subject} · {tutor.script.level}
                  </span>
                </span>
              </div>
            )}

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400">
                  Fase {tutor.currentPhaseIndex + 1} de {totalPhases}
                </span>
                <span className="text-[11px] text-indigo-400 font-semibold">
                  {phase?.name}
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${((tutor.currentPhaseIndex + 1) / totalPhases) * 100}%` }}
                />
              </div>
            </div>

            {/* Objective */}
            {phase?.objective && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2">
                <p className="text-[11px] text-indigo-300 font-medium">Objetivo</p>
                <p className="text-xs text-slate-300 mt-0.5">{phase.objective}</p>
              </div>
            )}

            {/* Tutor says */}
            {phase?.tutor_says && (
              <div className="bg-slate-800/40 border border-white/8 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Tutor dice</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{phase.tutor_says}</p>
              </div>
            )}

            {/* Key Structure (board content) */}
            {phase?.key_structure && (
              <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-3">
                <p className="text-[11px] text-amber-400 font-medium uppercase tracking-wider mb-1.5">Estructura clave</p>
                <pre className="text-xs text-amber-200 font-mono whitespace-pre-wrap leading-relaxed">{phase.key_structure}</pre>
              </div>
            )}

            {/* Student task */}
            {phase?.student_task && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <p className="text-[11px] text-emerald-400 font-medium uppercase tracking-wider mb-1">Tarea del alumno</p>
                <p className="text-sm text-slate-200">{phase.student_task}</p>
              </div>
            )}

            {/* P-07: Error frecuente del alumno (insight pedagógico generado por la IA) */}
            {(phase as any)?.common_error && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[11px]">⚠️</span>
                  <p className="text-[11px] text-orange-400 font-semibold uppercase tracking-wider">
                    Error frecuente
                  </p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {(phase as any).common_error}
                </p>
              </div>
            )}

            {/* TTS + Board action buttons */}
            <div className="grid grid-cols-3 gap-2">
              {/* P-13: Botón Escuchar con estado de carga intermedio */}
              <button
                onClick={tutor.isSpeaking ? tutor.stopSpeech : tutor.speakCurrentPhase}
                disabled={tutor.isLoadingAudio}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  tutor.isSpeaking
                    ? 'bg-red-600/20 border border-red-500/30 text-red-400 animate-pulse'
                    : tutor.isLoadingAudio
                    ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400/50 cursor-wait'
                    : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/40'
                }`}
              >
                {tutor.isSpeaking
                  ? <><VolumeX className="w-3.5 h-3.5" /> Silenciar</>
                  : tutor.isLoadingAudio
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...</>
                  : <><Volume2 className="w-3.5 h-3.5" /> Escuchar</>
                }
              </button>

              <button
                onClick={() => tutor.drawCurrentPhaseToBoard()}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-600/40 rounded-xl text-xs font-medium transition-all"
                title="Dibuja o actualiza la tarjeta de la fase en la pizarra"
              >
                <Zap className="w-3.5 h-3.5" />
                Dibujar
              </button>

              <button
                onClick={tutor.clearCurrentSlide}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-700/30 border border-white/10 text-slate-400 hover:text-red-300 hover:bg-red-900/20 hover:border-red-500/30 rounded-xl text-xs font-medium transition-all"
                title="Limpia TODA la diapositiva actual (borra el contenido completo)"
              >
                <Eraser className="w-3.5 h-3.5" />
                Limpiar
              </button>
            </div>

            {/* Student input area */}
            {(phase?.student_task || phase?.exercises?.length) && (
              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium block">
                  Tu respuesta
                </label>
                <textarea
                  value={tutor.studentInput}
                  onChange={e => tutor.setStudentInput(e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  rows={3}
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
                  spellCheck={false}
                  className="w-full bg-slate-800/60 border border-white/10 text-slate-200 text-sm rounded-lg px-3 py-2 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
                />
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleToggleMic}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      tutor.isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    {tutor.isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {tutor.isListening ? 'Parar' : 'Mic'}
                  </button>
                  <button
                    onClick={() => tutor.evaluateAnswer(tutor.studentInput)}
                    disabled={tutor.isEvaluating || !tutor.studentInput.trim()}
                    className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                  >
                    {tutor.isEvaluating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Evaluar
                  </button>
                  <button
                    onClick={tutor.captureAndEvaluateBoard}
                    disabled={tutor.isEvaluating}
                    className="flex items-center justify-center gap-1.5 py-2 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Pizarra
                  </button>
                </div>
              </div>
            )}

            {/* Feedback */}
            {tutor.lastFeedback && (
              <div className={`rounded-xl p-3 border transition-all ${
                (tutor.lastScore ?? 0) >= 70
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {(tutor.lastScore ?? 0) >= 70
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <XCircle className="w-4 h-4 text-red-400" />}
                  <span className={`text-xs font-bold ${(tutor.lastScore ?? 0) >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tutor.lastScore}/100
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{tutor.lastFeedback}</p>
              </div>
            )}

            {/* Practice exercises (Phase 4) */}
            {phase?.exercises && phase.exercises.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                    Ejercicio {exerciseIndex + 1} de {phase.exercises.length}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setExerciseIndex(Math.max(0, exerciseIndex - 1))}
                      disabled={exerciseIndex === 0}
                      className="p-1 rounded disabled:opacity-30 text-slate-400 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExerciseIndex(Math.min(phase.exercises!.length - 1, exerciseIndex + 1))}
                      disabled={exerciseIndex >= phase.exercises.length - 1}
                      className="p-1 rounded disabled:opacity-30 text-slate-400 hover:text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-slate-800/60 border border-white/8 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-slate-300">{phase.exercises[exerciseIndex]?.student_task}</p>
                  {phase.exercises[exerciseIndex]?.example_answer && (
                    <p className="text-[11px] text-amber-300/70 italic">
                      Ejemplo: {phase.exercises[exerciseIndex]?.example_answer}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-2 pt-2 border-t border-white/8">
              <button
                onClick={tutor.prevPhase}
                disabled={tutor.currentPhaseIndex === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-700/40 hover:bg-slate-700 border border-white/10 text-slate-300 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                onClick={tutor.nextPhase}
                disabled={tutor.currentPhaseIndex >= totalPhases - 1}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-30"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
