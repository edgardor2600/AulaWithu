import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Square,
  X,
  Award,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { useReadingGame } from '../hooks/useReadingGame';
import { PronunciationTrainerModal } from './PronunciationTrainerModal';

interface ReadingGameSpectatorPanelProps {
  game: ReturnType<typeof useReadingGame>;
}

export const ReadingGameSpectatorPanel: React.FC<ReadingGameSpectatorPanelProps> = ({ game }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const phase = game.remotePhase;
  const storyTitle = game.remoteStoryTitle || game.storyTitle;
  const storyText = game.remoteStoryText || game.storyText;
  const level = game.remoteLevel || game.level;
  const wpm = game.remoteWpm || game.wpm;
  const activeWordIndex = game.remoteActiveWordIndex;
  const countdown = game.remoteCountdown;
  const liveWords = game.remoteLiveWords;
  const lastEvaluation = game.remoteLastEvaluation || game.evaluation;

  // Reset dismissed state when a new game starts
  useEffect(() => {
    if (phase === 'waiting_student' || phase === 'countdown' || phase === 'reading') {
      setIsDismissed(false);
    }
  }, [phase]);

  // Si no hay actividad, no renderizar nada
  if (phase === 'idle') return null;

  const evaluatedWords = lastEvaluation?.evaluatedWords || (liveWords.length > 0
    ? liveWords.map(w => ({ word: w.text, status: (w.result === 'ok' ? 'ok' : 'bad') as 'ok' | 'bad' }))
    : []);

  const badWords = evaluatedWords
    .map((w, idx) => ({ word: w.word, index: idx }))
    .filter(w => evaluatedWords[w.index]?.status === 'bad');

  return (
    <>
      {/* ─── 1. MODAL PREVIO: ACTIVAR MICRÓFONO (phase === 'waiting_student') ─── */}
      {phase === 'waiting_student' && (
        <div className="fixed inset-0 z-[9900] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#0f111a] border border-indigo-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_25px_70px_rgba(99,102,241,0.25)] text-center space-y-6">
            
            {/* Header Icon */}
            <div className="relative mx-auto w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
              <Mic className="w-10 h-10 text-indigo-400 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping" />
            </div>

            {/* Titles */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> Reto de Lectura del Docente
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {storyTitle || 'Lectura en Voz Alta'}
              </h2>
              <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                <span className="bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10">Nivel {level}</span>
                <span className="bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10">{wpm} WPM</span>
              </div>
            </div>

            {/* Instruction description */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Vas a leer el texto en inglés al ritmo del teleprompter. La inteligencia artificial evaluará tu fluidez, pronunciación y precisión.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-amber-300/90 font-medium">
                <Mic className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Antes de empezar, activa tu micrófono pulsando el botón a continuación.</span>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={game.acceptAndStartReading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <Mic className="w-5 h-5 fill-white" />
              <span>Activar Micrófono y Comenzar</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 2. CUENTA REGRESIVA (phase === 'countdown') ─── */}
      {phase === 'countdown' && countdown !== null && (
        <div className="fixed inset-0 z-[9900] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-xs sm:text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4">
            ¡Prepárate para leer en voz alta!
          </div>
          <div className="text-8xl sm:text-9xl font-black text-white drop-shadow-[0_0_50px_rgba(99,102,241,0.8)] animate-bounce">
            {countdown}
          </div>
          <div className="text-sm text-slate-400 mt-6 flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
            Micrófono activo y grabando...
          </div>
        </div>
      )}

      {/* ─── 3. TELEPROMPTER EN VIVO (phase === 'reading' || 'evaluating') ─── */}
      {(phase === 'reading' || phase === 'evaluating') && (
        <div className="fixed bottom-0 left-0 right-0 z-[9800] bg-[#0a0a14]/98 backdrop-blur-2xl border-t border-indigo-500/30 shadow-[0_-15px_50px_rgba(0,0,0,0.6)] font-sans transition-all duration-300">
          {/* Bar Header */}
          <div
            className="flex items-center justify-between px-6 py-3 border-b border-white/10 cursor-pointer select-none bg-white/[0.02]"
            onClick={() => setCollapsed(c => !c)}
          >
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-indigo-300 tracking-wider uppercase">
                {phase === 'reading' ? 'Reto de Lectura en Curso' : 'Evaluando con IA'}
              </span>
              {storyTitle && (
                <span className="text-xs text-slate-400 hidden sm:inline">
                  — {storyTitle}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {phase === 'reading' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    game.finishStudentReading();
                  }}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Square className="w-3 h-3 fill-red-400" />
                  <span>Terminar Lectura</span>
                </button>
              )}
              {phase === 'evaluating' && (
                <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluando pronunciación...</span>
                </div>
              )}
              <span className="text-slate-400 hover:text-white">
                {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </div>
          </div>

          {/* Teleprompter Content */}
          {!collapsed && (
            <div className="px-6 py-6 max-h-[45vh] overflow-y-auto">
              <div className="text-lg sm:text-2xl leading-relaxed tracking-wide font-medium">
                {liveWords && liveWords.length > 0 ? (
                  liveWords.map((w, i) => {
                    const isActive = i === activeWordIndex;
                    const isOk = w.result === 'ok';
                    const isBad = w.result === 'bad';

                    let color = 'text-slate-400';
                    let bg = 'transparent';
                    if (isActive) {
                      color = 'text-white font-black';
                      bg = 'bg-indigo-600/40 rounded-lg px-2 py-0.5 shadow-lg shadow-indigo-500/20';
                    } else if (isOk) {
                      color = 'text-emerald-400 font-semibold';
                    } else if (isBad) {
                      color = 'text-red-400 line-through';
                    }

                    return (
                      <span
                        key={i}
                        className={`inline-block mr-2 my-1 transition-all duration-150 ${color} ${bg}`}
                      >
                        {w.text}
                      </span>
                    );
                  })
                ) : (
                  <p className="text-slate-500 text-sm">{storyText || 'Cargando texto...'}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 4. REPORTE COMPLETO DE RESULTADOS (phase === 'results') ─── */}
      {phase === 'results' && lastEvaluation && !isDismissed && (
        <div className="fixed inset-0 z-[9900] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-[#0e111a] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_25px_80px_rgba(0,0,0,0.7)] space-y-6 my-auto">
            
            {/* Header with Title and Close button */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xl font-extrabold text-white">Resultados de Lectura</h3>
                </div>
                <p className="text-xs text-slate-400">
                  {storyTitle} {level && `• Nivel ${level}`}
                </p>
              </div>

              <button
                onClick={() => setIsDismissed(true)}
                title="Minimizar resultados"
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Score Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 text-center">
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Precisión</span>
                <span className="text-3xl font-black text-emerald-400">{lastEvaluation.overall_score}%</span>
              </div>
              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-3 text-center">
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Pronunciación</span>
                <span className="text-3xl font-black text-indigo-400">{lastEvaluation.pronunciation_score}%</span>
              </div>
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3 text-center">
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">Gramática</span>
                <span className="text-3xl font-black text-amber-400">{lastEvaluation.grammar_score ?? lastEvaluation.overall_score}%</span>
              </div>
              <div className="bg-pink-950/30 border border-pink-500/30 rounded-2xl p-3 text-center">
                <span className="text-[10px] text-pink-300 font-bold uppercase tracking-wider block">Relevancia</span>
                <span className="text-3xl font-black text-pink-400">{lastEvaluation.relevance_score ?? lastEvaluation.overall_score}%</span>
              </div>
            </div>

            {/* Feedback del Tutor IA with Audio */}
            {lastEvaluation.feedback && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Feedback del Tutor IA:
                  </span>
                  <button
                    onClick={() => game.speakTutorFeedback(lastEvaluation.feedback)}
                    className="flex items-center gap-1 text-xs text-indigo-300 hover:text-white px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Escuchar
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                  "{lastEvaluation.feedback}"
                </p>
              </div>
            )}

            {/* Diagnóstico palabra a palabra */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Diagnóstico palabra a palabra:
                </span>
                {badWords.length > 0 && (
                  <button
                    onClick={() => game.startTrainer(badWords)}
                    className="flex items-center gap-1 text-xs text-amber-300 hover:text-white px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg font-semibold transition-all shadow-sm"
                  >
                    <Mic className="w-3.5 h-3.5" /> Practicar Errores ({badWords.length})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 bg-[#141620] p-4 rounded-2xl border border-white/5 max-h-48 overflow-y-auto">
                {evaluatedWords.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => game.speakTargetWord(item.word)}
                    onDoubleClick={() => game.startTrainer([{ word: item.word, index: idx }])}
                    title="Clic: escuchar pronunciación • Doble clic: practicar"
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105 flex items-center gap-1 ${
                      item.status === 'ok'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-300 border border-red-500/30 font-bold'
                    }`}
                  >
                    <span>{item.word}</span>
                    {item.status === 'ok' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-400" />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                💡 Clic = escuchar con TTS neuronal • Doble clic = abrir entrenador de pronunciación
              </p>
            </div>

            {/* Footer status message */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
              <span>El docente cerrará la sesión cuando continúe la clase.</span>
              <button
                onClick={() => setIsDismissed(true)}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 font-medium transition-colors"
              >
                Cerrar vista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating badge if dismissed while in results */}
      {phase === 'results' && isDismissed && (
        <button
          onClick={() => setIsDismissed(false)}
          className="fixed bottom-6 right-6 z-[9700] flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-2xl shadow-indigo-600/40 border border-indigo-400/30 transition-all hover:scale-105"
        >
          <Award className="w-4 h-4" />
          <span>Ver Resultados del Reto ({lastEvaluation?.overall_score || 0}%)</span>
        </button>
      )}

      {/* Pronunciation Trainer Modal accesible para el estudiante */}
      <PronunciationTrainerModal game={game} />
    </>
  );
};

export default ReadingGameSpectatorPanel;
