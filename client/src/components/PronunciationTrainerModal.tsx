import React from 'react';
import {
  Mic,
  Volume2,
  SkipForward,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { useReadingGame } from '../hooks/useReadingGame';

interface PronunciationTrainerModalProps {
  game: ReturnType<typeof useReadingGame>;
}

export const PronunciationTrainerModal: React.FC<PronunciationTrainerModalProps> = ({ game }) => {
  if (!game.showTrainer) return null;

  const currentItem   = game.trainerWords[game.trainerCurrentIdx];
  const totalWords    = game.trainerWords.length;
  const isLastWord    = game.trainerCurrentIdx >= totalWords;
  const cleanWord     = (currentItem?.word ?? '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '').trim();

  if (isLastWord) {
    // All done screen
    return (
      <div 
        className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        onClick={(e) => { if (e.target === e.currentTarget) game.closeTrainer(); }}
      >
        <div className="w-full max-w-[360px] bg-[#0d1117]/98 backdrop-blur-2xl border border-emerald-500/40 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-white text-xl">¡Buen trabajo! 🎉</h3>
              <p className="text-sm text-slate-400">Has practicado todas las palabras con pronunciación incorrecta.</p>
            </div>
            <button
              onClick={game.closeTrainer}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/30"
            >
              Cerrar Entrenador
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) game.closeTrainer(); }}
    >
      <div className="w-full max-w-[380px] bg-[#0d1117]/98 backdrop-blur-2xl border border-amber-500/40 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-amber-500/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Entrenador de Pronunciación</h3>
              <span className="text-[10px] text-amber-300/80 font-medium">
                Palabra {game.trainerCurrentIdx + 1} de {totalWords}
              </span>
            </div>
          </div>
          <button
            onClick={game.closeTrainer}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Cerrar entrenador"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      {/* Progress Bar */}
      <div className="h-1 bg-white/5">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${((game.trainerCurrentIdx) / totalWords) * 100}%` }}
        />
      </div>

      {/* Word Display */}
      <div className="px-5 pt-5 pb-3 text-center space-y-2">
        <div className="text-3xl font-extrabold text-white tracking-wide">
          {cleanWord}
        </div>
        <div className="text-sm text-slate-500 font-mono tracking-widest min-h-[20px]">
          {/* IPA placeholder – populated from backend if available */}
        </div>
      </div>

      {/* Audio Player: Escuchar la palabra */}
      <div className="px-5 pb-3">
        <button
          onClick={() => game.speakTargetWord(cleanWord)}
          disabled={game.isSpeakingTrainer || game.trainerIsListening}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
            game.trainerIsListening || game.isSpeakingTrainer
              ? 'opacity-40 cursor-not-allowed bg-indigo-950/20 border-indigo-900/30 text-indigo-400'
              : 'bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300'
          }`}
        >
          {game.isSpeakingTrainer ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Reproduciendo...</span>
              <span className="flex gap-0.5 ml-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <span
                    key={i}
                    className="w-0.5 bg-indigo-400 rounded-full animate-bounce"
                    style={{ height: `${8 + (i % 3) * 5}px`, animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              <span>{game.trainerIsListening ? 'Desactivado mientras hablas' : 'Escuchar Pronunciación Correcta'}</span>
            </>
          )}
        </button>
      </div>

      {/* Microphone Section */}
      <div className="px-5 pb-4 space-y-3">
        <p className="text-[11px] text-slate-400 text-center">
          {game.isSpeakingTrainer
            ? '🔊 Escucha la pronunciación...'
            : game.trainerIsListening
            ? '🎙️ Escuchando... ¡Habla ahora!'
            : 'Haz clic en el micrófono y pronuncia la palabra'}
        </p>

        <button
          onClick={game.trainerIsListening ? game.stopTrainerListening : game.startTrainerListening}
          disabled={game.isSpeakingTrainer}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
            game.isSpeakingTrainer
              ? 'opacity-40 cursor-not-allowed bg-slate-800/40 border border-slate-700/30 text-slate-500'
              : game.trainerIsListening
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse'
              : 'bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-300 hover:text-white'
          }`}
        >
          {game.trainerIsListening ? (
            <>
              <span className="flex gap-0.5">
                {[1, 2, 3, 4].map(i => (
                  <span
                    key={i}
                    className="w-1 bg-white rounded-full animate-bounce"
                    style={{ height: `${10 + (i % 2) * 8}px`, animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </span>
              <span>Escuchando... (Toca para detener)</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Pronunciar Palabra</span>
            </>
          )}
        </button>

        {/* Heard text feedback */}
        {game.trainerHeardText && (
          <div
            className={`rounded-xl p-3 border text-center transition-all ${
              game.trainerFeedback === 'correct'
                ? 'bg-emerald-500/15 border-emerald-500/40'
                : 'bg-red-500/15 border-red-500/40'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {game.trainerFeedback === 'correct' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span
                className={`text-xs font-bold ${
                  game.trainerFeedback === 'correct' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {game.trainerFeedback === 'correct' ? '¡Excelente pronunciación! 🎉' : 'Intenta de nuevo'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Se escuchó: "<span className="text-white font-semibold">{game.trainerHeardText}</span>"
            </p>
          </div>
        )}
      </div>

      {/* Footer: Skip button */}
      <div className="px-5 pb-4">
        <button
          onClick={game.trainerNext}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-xl text-xs transition-all"
        >
          <SkipForward className="w-3.5 h-3.5" />
          <span>Omitir esta palabra</span>
        </button>
      </div>
    </div>
  </div>
  );
};
