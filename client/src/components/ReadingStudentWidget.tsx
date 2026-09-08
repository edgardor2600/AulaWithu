import React, { useState } from 'react';
import { Volume2, Sparkles, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import type { UseReadingReturn } from '../hooks/useReading';

interface ReadingStudentWidgetProps {
  reading: UseReadingReturn;
}

/**
 * ReadingStudentWidget
 *
 * Floating spectator widget displayed to students when the teacher uses
 * the Reading / TTS tool. Automatically synchronizes audio playback,
 * current reading segment, and phonetic (IPA) transcription via Yjs.
 */
export const ReadingStudentWidget: React.FC<ReadingStudentWidgetProps> = ({ reading }) => {
  const [collapsed, setCollapsed] = useState(false);

  // If there are no reading segments loaded by the teacher, don't show the widget
  if (!reading.readingSegments || reading.readingSegments.length === 0) {
    return null;
  }

  const activeIndex = reading.currentSegmentIndex >= 0 ? reading.currentSegmentIndex : 0;
  const activeSegment = reading.readingSegments[activeIndex];
  const total = reading.readingSegments.length;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 9800,
        width: collapsed ? 200 : 360,
        maxWidth: 'calc(100vw - 48px)',
        background: 'rgba(15, 18, 30, 0.94)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      className="animate-in fade-in slide-in-from-bottom-3"
    >
      {/* Header bar / Click to collapse */}
      <div
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-indigo-600/15 border-b border-indigo-500/20 cursor-pointer select-none hover:bg-indigo-600/25 transition-colors"
      >
        <div className="flex items-center gap-2">
          {/* Audio icon with live pulse */}
          <div className="relative w-6 h-6 flex items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400">
            {reading.isPlaying ? (
              <Volume2 className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            )}
            {reading.isPlaying && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white tracking-wide">Lectura en Vivo</span>
            <span className="text-[10px] text-indigo-300/80 font-mono">
              ({activeIndex + 1}/{total})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 hover:text-white">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-300">
            {reading.isPlaying ? 'Audio Activo' : 'Pausado'}
          </span>
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Expanded Content */}
      {!collapsed && (
        <div className="p-3.5 space-y-3">
          {/* Active Segment Display */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-1.5 transition-all">
            <p className="text-xs font-semibold text-slate-100 leading-relaxed">
              {activeSegment?.text || 'Esperando inicio de lectura...'}
            </p>
            {activeSegment?.ipa && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="text-[11px] font-mono text-sky-300 tracking-wider">
                  /{activeSegment.ipa}/
                </span>
              </div>
            )}
          </div>

          {/* Equalizer animation when playing */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              {reading.isPlaying ? (
                <div className="flex items-end gap-0.5 h-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className="w-1 bg-indigo-400 rounded-full animate-bounce"
                      style={{
                        height: `${6 + (i % 3) * 3}px`,
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-600" />
              )}
              <span className="text-slate-300">
                {reading.isPlaying ? 'Escuchando pronunciación del profesor' : 'Listo para el siguiente segmento'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
