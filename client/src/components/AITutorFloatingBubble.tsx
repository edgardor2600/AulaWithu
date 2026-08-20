import React from 'react';
import { Bot, VolumeX, ChevronRight } from 'lucide-react';
import type { useAITutor } from '../hooks/useAITutor';

interface AITutorFloatingBubbleProps {
  script: ReturnType<typeof useAITutor>['script'];
  currentPhaseIndex: ReturnType<typeof useAITutor>['currentPhaseIndex'];
  isSpeaking: ReturnType<typeof useAITutor>['isSpeaking'];
  onOpen: () => void;
  onStopSpeech: () => void;
}

export const AITutorFloatingBubble: React.FC<AITutorFloatingBubbleProps> = ({
  script,
  currentPhaseIndex,
  isSpeaking,
  onOpen,
  onStopSpeech,
}) => {
  if (!script) return null;

  const phase = script.phases[currentPhaseIndex];
  const totalPhases = script.phases.length;

  return (
    <div
      className="fixed bottom-28 left-6 z-40 flex items-center gap-2 animate-fade-in"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Main bubble */}
      <div className="flex items-center gap-3 bg-[#0d1117]/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl px-3 py-2.5 shadow-[0_8px_32px_rgba(99,102,241,0.25)] max-w-[240px]">
        {/* Animated bot icon */}
        <div className={`relative shrink-0 w-8 h-8 rounded-xl bg-indigo-500/15 border flex items-center justify-center ${
          isSpeaking ? 'border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'border-indigo-500/30'
        }`}>
          <Bot className={`w-4 h-4 text-indigo-400 ${isSpeaking ? 'animate-pulse' : ''}`} />
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d1117] animate-pulse" />
          )}
        </div>

        {/* Phase info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-indigo-400/70 uppercase tracking-wider font-medium">
            Fase {currentPhaseIndex + 1}/{totalPhases}
          </p>
          <p className="text-xs text-slate-300 font-semibold truncate">{phase?.name}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {isSpeaking && (
            <button
              onClick={e => { e.stopPropagation(); onStopSpeech(); }}
              className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/40 transition-colors"
              title="Silenciar"
            >
              <VolumeX className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={onOpen}
            className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/40 transition-colors"
            title="Abrir panel"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
