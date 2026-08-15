import React from 'react';
import {
  Square,
  Sparkles,
  Play,
  Award,
  Volume2,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  XCircle,
  History,
  X,
  Zap,
  Mic,
  Monitor,
  ChevronRight,
  SkipForward,
  Timer,
  Trash2,
} from 'lucide-react';
import type { useReadingGame } from '../hooks/useReadingGame';
import { PronunciationTrainerModal } from './PronunciationTrainerModal';

interface ReadingGamePanelProps {
  game: ReturnType<typeof useReadingGame>;
}

const CHUNK_LABELS: Record<string, string> = {
  small:  'Frase (1 oración)',
  medium: 'Bloque (2 oraciones)',
  large:  'Párrafo',
};

export const ReadingGamePanel: React.FC<ReadingGamePanelProps> = ({ game }) => {
  if (!game.showReadingGamePanel) return null;

  return (
    <>
      {/* ── Panel Principal ── */}
      <div className="fixed top-20 right-6 z-40 w-[430px] bg-[#1a1d24]/97 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex flex-col max-h-[82vh] transition-all duration-300 overflow-hidden text-slate-200 text-xs">

        {/* Cabecera */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <h3 className="font-bold text-white text-sm leading-none">Reto de Velocidad de Lectura</h3>
              <span className="text-[10px] text-slate-400">Entrenamiento de fluidez y pronunciación IA</span>
            </div>
          </div>
          <button
            onClick={() => game.setShowReadingGamePanel(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menú de Pestañas */}
        <div className="px-2 py-1.5 border-b border-white/10 bg-black/20 flex items-center gap-1 justify-around shrink-0">
          {(
            [
              { key: 'config',  label: 'Config',   icon: BookOpen, disabled: false },
              { key: 'playing', label: 'Lectura',   icon: Play, disabled: !game.storyText },
              { key: 'results', label: 'Reporte',   icon: Award, disabled: !game.evaluation },
              { key: 'history', label: 'Historial', icon: History, disabled: false },
            ]
          ).map(({ key, label, icon: Icon, disabled }) => (
            <button
              key={key}
              onClick={() => !disabled && game.setActiveTab(key as any)}
              disabled={disabled}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 ${
                game.activeTab === key
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : disabled
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

          {/* ─── PESTAÑA: CONFIG ─── */}
          {game.activeTab === 'config' && (
            <div className="space-y-4">

              {/* Parámetros */}
              <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Generador de Historia IA
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Nivel {game.level}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Nivel Pedagógico:</label>
                    <select
                      value={game.level}
                      onChange={e => game.setLevel(e.target.value)}
                      className="w-full bg-[#14161d] border border-white/10 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                    >
                      {['A1','A2','B1','B2','C1'].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Velocidad (WPM):</label>
                    <input
                      type="number" min={40} max={350} step={10}
                      value={game.wpm}
                      onChange={e => game.setWpm(Number(e.target.value))}
                      className="w-full bg-[#14161d] border border-white/10 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* WPM Speed Cards */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1.5">Velocidad rápida:</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[80, 100, 140, 180].map(speed => (
                      <button
                        key={speed}
                        onClick={() => game.setWpm(speed)}
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          game.wpm === speed
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-amber-500/30 hover:text-amber-300'
                        }`}
                      >
                        {speed} WPM
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tema / Vocabulario:</label>
                  <input
                    type="text"
                    placeholder="Ej. Daily Routine, Vacation, Business"
                    value={game.topic}
                    onChange={e => game.setTopic(e.target.value)}
                    className="w-full bg-[#14161d] border border-white/10 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <button
                  onClick={game.generateStory}
                  disabled={game.isGeneratingStory}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {game.isGeneratingStory ? (
                    <><RotateCcw className="w-3.5 h-3.5 animate-spin" /><span>Generando...</span></>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /><span>Generar Historia con IA</span></>
                  )}
                </button>
              </div>

              {/* Opciones avanzadas */}
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opciones de Lectura</span>

                {/* Modo Frases */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs text-slate-200 font-medium">Modo por Frases</span>
                    <span className="block text-[10px] text-slate-500">Pausa entre oraciones (Espacio para avanzar)</span>
                  </div>
                  <div
                    onClick={() => game.setIsSentenceMode(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                      game.isSentenceMode ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        game.isSentenceMode ? 'translate-x-5' : ''
                      }`}
                    />
                  </div>
                </label>

                {/* Chunk size (if sentence mode on) */}
                {game.isSentenceMode && (
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Tamaño de Bloque:</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['small', 'medium', 'large'] as const).map(size => (
                        <button
                          key={size}
                          onClick={() => game.setChunkSize(size)}
                          className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                            game.chunkSize === size
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:border-amber-500/20'
                          }`}
                        >
                          {CHUNK_LABELS[size]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audio del Sistema */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="text-xs text-slate-200 font-medium">Audio del Sistema</span>
                      <span className="block text-[10px] text-slate-500">Mezcla micrófono + audio de la pantalla</span>
                    </div>
                  </div>
                  <div
                    onClick={() => game.setUseSystemAudio(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                      game.useSystemAudio ? 'bg-indigo-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        game.useSystemAudio ? 'translate-x-5' : ''
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Editor de texto */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Texto para Leer (editable):
                </label>
                <textarea
                  rows={5}
                  value={game.storyText}
                  onChange={e => game.setStoryText(e.target.value)}
                  placeholder="Escribe o genera una historia aquí..."
                  className="w-full bg-[#14161d] border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 leading-relaxed custom-scrollbar resize-none"
                />
              </div>

              <button
                onClick={game.startGame}
                disabled={!game.storyText.trim() || game.isPlaying}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Iniciar Reto de Lectura</span>
              </button>
            </div>
          )}

          {/* ─── PESTAÑA: PLAYING / TELEPROMPTER ─── */}
          {game.activeTab === 'playing' && (
            <div className="space-y-4">

              {/* Countdown overlay */}
              {game.countdown !== null && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-7xl font-black text-amber-400 tabular-nums animate-bounce">
                    {game.countdown}
                  </div>
                </div>
              )}

              {/* Teleprompter - word highlight */}
              {game.countdown === null && (
                <>
                  <div className="bg-[#101217] border border-white/10 rounded-2xl p-4 min-h-[200px] flex flex-wrap gap-x-2 gap-y-1.5 items-start leading-relaxed text-sm shadow-inner">
                    {game.liveWords.map((w, idx) => {
                      const isActive = idx === game.activeWordIndex;
                      const result   = w.result;
                      return (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded-lg transition-all duration-150 font-medium text-base ${
                            isActive
                              ? result === 'ok'
                                ? 'bg-emerald-500 text-slate-950 font-black scale-110 shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-400'
                                : 'bg-amber-500 text-slate-950 font-black scale-110 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400'
                              : result === 'ok'
                              ? 'text-emerald-400 bg-emerald-950/40 font-bold border border-emerald-500/30 shadow-sm'
                              : result === 'bad'
                              ? 'text-red-400 bg-red-950/20 line-through opacity-60'
                              : 'text-slate-300 hover:text-slate-100'
                          }`}
                        >
                          {w.text}
                        </span>
                      );
                    })}
                  </div>

                  {/* Sentence Mode: Pause card + Advance button */}
                  {game.isSentenceMode && game.isSentencePaused && (
                    <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl px-4 py-2 flex items-center justify-between animate-pulse">
                      <span className="text-xs text-amber-300 font-semibold">⏸ Pausa entre bloques</span>
                      <button
                        onClick={game.advanceChunk}
                        className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-all"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        Siguiente ({CHUNK_LABELS[game.chunkSize]})
                      </button>
                    </div>
                  )}

                  {/* Controls Row */}
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                        <span className="font-mono text-red-400 font-bold">
                          {String(Math.floor(game.recordingSeconds / 60)).padStart(2,'0')}:
                          {String(game.recordingSeconds % 60).padStart(2,'0')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Timer className="w-3 h-3" />
                        <span className="text-[10px]">{game.wpm} WPM</span>
                      </div>
                    </div>

                    <button
                      onClick={game.stopAndEvaluate}
                      disabled={game.isEvaluating}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-red-600/30 text-xs"
                    >
                      {game.isEvaluating ? (
                        <><RotateCcw className="w-3 h-3 animate-spin" /><span>Evaluando...</span></>
                      ) : (
                        <><Square className="w-3 h-3 fill-white" /><span>Finalizar y Evaluar</span></>
                      )}
                    </button>
                  </div>

                  {/* Space key hint for sentence mode */}
                  {game.isSentenceMode && (
                    <p className="text-center text-[10px] text-slate-600">
                      Presiona <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-600">Espacio</kbd> para avanzar al siguiente bloque
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── PESTAÑA: RESULTS ─── */}
          {game.activeTab === 'results' && game.evaluation && (
            <div className="space-y-4">

              {/* Score Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-semibold">Precisión General</span>
                  <span className="text-3xl font-extrabold text-emerald-400">{game.evaluation.overall_score}%</span>
                </div>
                <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-indigo-300 uppercase tracking-wider block font-semibold">Pronunciación</span>
                  <span className="text-3xl font-extrabold text-indigo-400">{game.evaluation.pronunciation_score}%</span>
                </div>
                {game.evaluation.grammar_score !== undefined && (
                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-amber-300 uppercase tracking-wider block font-semibold">Gramática</span>
                    <span className="text-3xl font-extrabold text-amber-400">{game.evaluation.grammar_score}%</span>
                  </div>
                )}
                {game.evaluation.relevance_score !== undefined && (
                  <div className="bg-pink-950/40 border border-pink-500/30 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-pink-300 uppercase tracking-wider block font-semibold">Relevancia</span>
                    <span className="text-3xl font-extrabold text-pink-400">{game.evaluation.relevance_score}%</span>
                  </div>
                )}
              </div>

              {/* AI Feedback */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Feedback del Tutor IA:
                  </span>
                  <button
                    onClick={() => game.speakTutorFeedback(game.evaluation!.feedback)}
                    className="flex items-center gap-1 text-[10px] text-indigo-300 hover:text-white px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-all"
                  >
                    <Volume2 className="w-3 h-3" /> Escuchar
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "{game.evaluation.feedback}"
                </p>
              </div>

              {/* Word Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Diagnóstico palabra a palabra:
                  </span>
                  {game.evaluation.evaluatedWords.filter(w => w.status === 'bad').length > 0 && (
                    <button
                      onClick={() => {
                        const bad = game.evaluation!.evaluatedWords
                          .map((w, i) => ({ word: w.word, index: i }))
                          .filter((_, i) => game.evaluation!.evaluatedWords[i].status === 'bad');
                        game.startTrainer(bad);
                      }}
                      className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-white px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-all border border-amber-500/20"
                    >
                      <Mic className="w-3 h-3" /> Practicar Errores
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 bg-[#14161d] p-3 rounded-xl border border-white/5">
                  {game.evaluation.evaluatedWords.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => game.speakTargetWord(item.word)}
                      onDoubleClick={() => game.startTrainer([{ word: item.word, index: idx }])}
                      title="Clic: escuchar • Doble clic: practicar"
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-all hover:scale-105 flex items-center gap-1 ${
                        item.status === 'ok'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : item.status === 'bad'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30 font-bold'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      <span>{item.word}</span>
                      {item.status === 'ok'
                        ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        : item.status === 'bad'
                        ? <XCircle className="w-2.5 h-2.5 text-red-400" />
                        : <SkipForward className="w-2.5 h-2.5 text-slate-500" />}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 text-center">
                  Clic = escuchar con TTS neuronal · Doble clic = abrir entrenador de pronunciación
                </p>
              </div>

              {/* Restart Button */}
              <button
                onClick={() => { game.setActiveTab('config'); }}
                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Nueva Lectura
              </button>
            </div>
          )}

          {/* ─── PESTAÑA: HISTORIAL ─── */}
          {game.activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">Intentos en PostgreSQL (esta sesión):</span>
                <button
                  onClick={game.loadHistory}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-1 bg-white/5 rounded-lg transition-all"
                >
                  <RotateCcw className="w-3 h-3" /> Actualizar
                </button>
              </div>

              {game.isLoadingHistory ? (
                <div className="py-8 text-center text-slate-400">
                  <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                  <span>Cargando historial...</span>
                </div>
              ) : game.history.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No hay intentos registrados en esta sesión.
                </div>
              ) : (
                <div className="space-y-2">
                  {game.history.map((item, idx) => (
                    <div
                      key={item.id ?? idx}
                      className="bg-white/5 hover:bg-white/[0.07] border border-white/10 p-3 rounded-xl transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-xs truncate">{item.story_title || 'Historia de Lectura'}</h4>
                          <span className="text-[10px] text-slate-400">
                            {item.student_name || 'Alumno'} · {item.wpm_setting} WPM
                          </span>
                          {item.created_at && (
                            <span className="text-[10px] text-slate-500 block">
                              {new Date(item.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · {new Date(item.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-emerald-400 text-lg block leading-none">
                            {item.overall_score}%
                          </span>
                          <span className="text-[9px] text-slate-400">Puntaje</span>
                        </div>
                      </div>
                      {item.feedback && (
                        <p className="text-[10px] text-slate-400 italic line-clamp-2 bg-black/20 p-1.5 rounded-lg">
                          "{item.feedback}"
                        </p>
                      )}

                      {/* Botones de acción: Reutilizar / Eliminar */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                        <button
                          onClick={() => game.reuseHistoryItem(item)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-lg text-[10px] font-semibold transition-all"
                          title="Cargar esta historia en el panel para volver a practicar"
                        >
                          <Play className="w-2.5 h-2.5 fill-indigo-300" />
                          <span>Reutilizar Lectura</span>
                        </button>

                        {item.id && (
                          <button
                            onClick={() => {
                              if (confirm('¿Eliminar este intento de lectura de Supabase?')) {
                                game.deleteHistoryItem(item.id);
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-[10px] transition-all"
                            title="Eliminar intento de la base de datos"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Pronunciation Trainer Modal (fuera del panel principal) ── */}
      <PronunciationTrainerModal game={game} />
    </>
  );
};
