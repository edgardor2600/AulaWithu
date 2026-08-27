import React from 'react';
import { Bot, Volume2, VolumeX, ChevronRight } from 'lucide-react';
import type { useAITutor, ActiveSlidePhaseData } from '../hooks/useAITutor';

interface AITutorFloatingBubbleProps {
  script: ReturnType<typeof useAITutor>['script'];
  currentPhaseIndex: ReturnType<typeof useAITutor>['currentPhaseIndex'];
  isSpeaking: ReturnType<typeof useAITutor>['isSpeaking'];
  activeSlidePhaseData?: ActiveSlidePhaseData | null;
  isOpen?: boolean;
  onOpen: () => void;
  onStopSpeech: () => void;
  onSpeak?: () => void;
}

export const AITutorFloatingBubble: React.FC<AITutorFloatingBubbleProps> = ({
  script,
  currentPhaseIndex,
  isSpeaking,
  activeSlidePhaseData,
  isOpen = false,
  onOpen,
  onStopSpeech,
  onSpeak,
}) => {
  // If panel is already open or neither script nor active slide metadata exists, do not show bubble
  if (isOpen || (!script && !activeSlidePhaseData)) return null;

  const phase = script?.phases[currentPhaseIndex] || activeSlidePhaseData;
  const phaseTitle = phase?.name || 'Diapositiva AI Tutor';
  const phaseLabel = script ? `Fase ${currentPhaseIndex + 1}/${script.phases.length}` : (phase?.phase !== undefined ? `Fase ${(phase.phase ?? 0) + 1}` : 'AI Tutor');

  return (
    <div
      className="fixed bottom-[185px] right-6 z-30 flex items-center gap-2 animate-fade-in"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Main bubble */}
      <div className="flex items-center gap-3 bg-[#0d1117]/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl px-3 py-2.5 shadow-[0_8px_32px_rgba(99,102,241,0.25)] max-w-[280px]">
        {/* Animated bot icon */}
        <div 
          onClick={onOpen}
          className={`relative shrink-0 w-8 h-8 rounded-xl bg-indigo-500/15 border flex items-center justify-center cursor-pointer transition-all ${
            isSpeaking ? 'border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'border-indigo-500/30 hover:bg-indigo-500/25'
          }`}
          title="Abrir panel de AI Tutor"
        >
          <Bot className={`w-4 h-4 text-indigo-400 ${isSpeaking ? 'animate-pulse' : ''}`} />
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d1117] animate-pulse" />
          )}
        </div>

        {/* Phase info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <p className="text-[10px] text-indigo-400/70 uppercase tracking-wider font-medium">
            {phaseLabel}
          </p>
          <p className="text-xs text-slate-300 font-semibold truncate">{phaseTitle}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick 1-click listen / mute button */}
          {isSpeaking ? (
            <button
              onClick={e => { e.stopPropagation(); onStopSpeech(); }}
              className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/40 transition-colors animate-pulse"
              title="Silenciar voz"
            >
              <VolumeX className="w-3.5 h-3.5" />
            </button>
          ) : (
            onSpeak && (
              <button
                onClick={e => { e.stopPropagation(); onSpeak(); }}
                className="w-7 h-7 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 flex items-center justify-center text-indigo-300 hover:text-white transition-all shadow-sm"
                title="Escuchar explicación de la diapositiva con IA"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )
          )}

          <button
            onClick={onOpen}
            className="w-6 h-6 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            title="Abrir panel completo"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
