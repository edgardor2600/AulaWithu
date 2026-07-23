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
} from 'lucide-react';
import type { useReadingGame } from '../hooks/useReadingGame';


interface ReadingGamePanelProps {
  game: ReturnType<typeof useReadingGame>;
}

export const ReadingGamePanel: React.FC<ReadingGamePanelProps> = ({ game }) => {
  if (!game.showReadingGamePanel) return null;

  const words = game.storyText.trim().split(/\s+/).filter(Boolean);

  return (
    <div className="fixed top-20 right-6 z-40 w-[420px] bg-[#1a1d24]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex flex-col max-h-[82vh] transition-all duration-300 overflow-hidden text-slate-200 text-xs">
      
      {/* Cabecera del Panel */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
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
      <div className="px-2 py-1.5 border-b border-white/10 bg-black/20 flex items-center gap-1 justify-around">
        <button
          onClick={() => game.setActiveTab('config')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 ${
            game.activeTab === 'config'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Config</span>
        </button>

        <button
          onClick={() => game.setActiveTab('playing')}
          disabled={!game.storyText}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 ${
            game.activeTab === 'playing'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 opacity-60'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Lectura</span>
        </button>

        <button
          onClick={() => game.setActiveTab('results')}
          disabled={!game.evaluation}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 ${
            game.activeTab === 'results'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 opacity-60'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Reporte</span>
        </button>

        <button
          onClick={() => game.setActiveTab('history')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 ${
            game.activeTab === 'history'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historial</span>
        </button>
      </div>

      {/* Cuerpo Dinámico de Contenido */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        
        {/* PESTAÑA 1: CONFIGURACIÓN E HISTORIA */}
        {game.activeTab === 'config' && (
          <div className="space-y-4">
            
            {/* Formulario de Parámetros */}
            <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Generador de Historia
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
                    onChange={(e) => game.setLevel(e.target.value)}
                    className="w-full bg-[#14161d] border border-white/10 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="A1">A1 - Principiante</option>
                    <option value="A2">A2 - Elemental</option>
                    <option value="B1">B1 - Intermedio</option>
                    <option value="B2">B2 - Avanzado</option>
                    <option value="C1">C1 - Experto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Velocidad (WPM):</label>
                  <input
                    type="number"
                    min={40}
                    max={300}
                    step={10}
                    value={game.wpm}
                    onChange={(e) => game.setWpm(Number(e.target.value))}
                    className="w-full bg-[#14161d] border border-white/10 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Tema / Vocabulario:</label>
                <input
                  type="text"
                  placeholder="Ej. Daily Routine, Vacation, Business"
                  value={game.topic}
                  onChange={(e) => game.setTopic(e.target.value)}
                  className="w-full bg-[#14161d] border border-white/10 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <button
                onClick={game.generateStory}
                disabled={game.isGeneratingStory}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
              >
                {game.isGeneratingStory ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generando Historia...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generar Historia con IA</span>
                  </>
                )}
              </button>
            </div>

            {/* Editor de Texto de Lectura */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                Texto para Leer (puedes editarlo manualmente):
              </label>
              <textarea
                rows={5}
                value={game.storyText}
                onChange={(e) => game.setStoryText(e.target.value)}
                placeholder="Escribe o genera una historia aquí..."
                className="w-full bg-[#14161d] border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 leading-relaxed custom-scrollbar"
              />
            </div>

            <button
              onClick={game.startGame}
              disabled={!game.storyText.trim()}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Iniciar Reto de Lectura</span>
            </button>
          </div>
        )}

        {/* PESTAÑA 2: EN JUEGO / TELEPROMPTER */}
        {game.activeTab === 'playing' && (
          <div className="space-y-4">
            {/* Visor de Teleprompter Animado */}
            <div className="bg-[#101217] border border-white/10 rounded-2xl p-4 min-h-[200px] flex flex-wrap gap-2 items-center align-content-start leading-relaxed text-sm shadow-inner">
              {words.map((word, idx) => {
                const isActive = idx === game.activeWordIndex;
                const isPassed = idx < game.activeWordIndex;

                return (
                  <span
                    key={idx}
                    className={`px-2 py-1 rounded-md transition-all duration-200 font-medium ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold scale-110 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400'
                        : isPassed
                        ? 'text-emerald-400 bg-emerald-950/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>

            {/* Controles de Grabación */}
            <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="font-mono text-red-400 font-bold text-sm">
                  00:{game.recordingSeconds < 10 ? `0${game.recordingSeconds}` : game.recordingSeconds}
                </span>
                <span className="text-[10px] text-slate-400">({game.wpm} WPM)</span>
              </div>

              <button
                onClick={game.stopAndEvaluate}
                disabled={game.isEvaluating}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-red-600/30"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Finalizar y Evaluar</span>
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: RESULTADOS Y DIAGNÓSTICO IA */}
        {game.activeTab === 'results' && game.evaluation && (
          <div className="space-y-4">
            
            {/* Puntuación Promedio */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-center">
                <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-semibold">
                  Precisión General
                </span>
                <span className="text-3xl font-extrabold text-emerald-400">
                  {game.evaluation.overall_score}%
                </span>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-center">
                <span className="text-[10px] text-indigo-300 uppercase tracking-wider block font-semibold">
                  Pronunciación
                </span>
                <span className="text-3xl font-extrabold text-indigo-400">
                  {game.evaluation.pronunciation_score}%
                </span>
              </div>
            </div>

            {/* Feedback de la IA */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Feedback del Tutor IA:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{game.evaluation.feedback}"
              </p>
            </div>

            {/* Desglose de Palabras y Entrenador */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                Diagnóstico Palabra por Palabra (Haz clic para practicar):
              </span>
              <div className="flex flex-wrap gap-1.5 bg-[#14161d] p-3 rounded-xl border border-white/5">
                {game.evaluation.evaluatedWords.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => game.speakTrainerWord(item.word)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-transform hover:scale-105 flex items-center gap-1 ${
                      item.status === 'ok'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30 font-bold'
                    }`}
                  >
                    <span>{item.word}</span>
                    {item.status === 'ok' ? (
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-2.5 h-2.5 text-red-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Burbuja Entrenador de Pronunciación Activa */}
            {game.trainerWord && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Volume2 className={`w-4 h-4 text-amber-400 ${game.isSpeakingTrainer ? 'animate-bounce' : ''}`} />
                  <div>
                    <span className="text-[10px] text-amber-300 block font-semibold">Practicando palabra:</span>
                    <span className="font-bold text-white text-sm">{game.trainerWord}</span>
                  </div>
                </div>
                <button
                  onClick={() => game.speakTrainerWord(game.trainerWord!)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs"
                >
                  Repetir Audio
                </button>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 4: HISTORIAL DE LA SESIÓN */}
        {game.activeTab === 'history' && (
          <div className="space-y-3">
            <span className="text-[10px] text-slate-400 block font-semibold">
              Intentos registrados en PostgreSQL para esta sesión:
            </span>

            {game.isLoadingHistory ? (
              <div className="py-8 text-center text-slate-400">
                <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                <span>Cargando historial...</span>
              </div>
            ) : game.history.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No hay intentos registrados aún en esta sesión.
              </div>
            ) : (
              <div className="space-y-2">
                {game.history.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-white text-xs">{item.story_title}</h4>
                      <span className="text-[10px] text-slate-400 block">
                        {item.student_name || 'Alumno'} • {item.wpm_setting} WPM
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-400 text-sm block">
                        {item.overall_score}%
                      </span>
                      <span className="text-[9px] text-slate-400">Puntaje</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
