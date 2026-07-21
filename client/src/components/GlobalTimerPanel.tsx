import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, GripHorizontal, Clock } from 'lucide-react';

interface GlobalTimerPanelProps {
  isOpen: boolean;
  durationMinutes: number;
  remainingMs: number;
  isRunning: boolean;
  hasStarted: boolean;
  isTeacher: boolean;
  setOpen: (open: boolean) => void;
  setDuration: (min: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setRemainingFromDisplayInput: (ms: number) => void;
}

export const GlobalTimerPanel: React.FC<GlobalTimerPanelProps> = ({
  isOpen,
  durationMinutes,
  remainingMs,
  isRunning,
  hasStarted,
  isTeacher,
  setOpen,
  setDuration,
  startTimer,
  pauseTimer,
  resetTimer,
  setRemainingFromDisplayInput,
}) => {
  // Local state for dragging the control panel
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Local state for the editable time input display (MM:SS)
  const [displayInput, setDisplayInput] = useState('');
  const [isEditingDisplay, setIsEditingDisplay] = useState(false);

  // Helper: Format milliseconds to MM:SS
  const formatTimer = (ms: number) => {
    const safeMs = Math.max(0, ms);
    const totalSeconds = Math.ceil(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Sync displayInput with remainingMs from parent when not active editing
  useEffect(() => {
    if (!isEditingDisplay) {
      setDisplayInput(formatTimer(remainingMs));
    }
  }, [remainingMs, isEditingDisplay]);

  // Load panel position from localstorage
  useEffect(() => {
    try {
      const savedPos = localStorage.getItem('appaula_timer_panel_pos');
      if (savedPos) {
        setPanelPos(JSON.parse(savedPos));
      }
    } catch (e) {
      console.warn('Failed to load timer position:', e);
    }
  }, []);

  // Handle Drag Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Left click only
    const header = e.currentTarget;
    const panel = panelRef.current;
    if (!panel) return;

    // Prevent dragging on button/input click
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    const rect = panel.getBoundingClientRect();
    dragStartOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);
    header.setPointerCapture(e.pointerId);
  };

  // Handle Drag Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !panelRef.current) return;
    const x = e.clientX - dragStartOffset.current.x;
    const y = e.clientY - dragStartOffset.current.y;
    
    // Bounds clamping
    const clampedX = Math.max(10, Math.min(window.innerWidth - 300, x));
    const clampedY = Math.max(10, Math.min(window.innerHeight - 250, y));

    const newPos = { x: clampedX, y: clampedY };
    setPanelPos(newPos);
  };

  // Handle Drag Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (panelPos) {
      try {
        localStorage.setItem('appaula_timer_panel_pos', JSON.stringify(panelPos));
      } catch (err) {
        console.warn('Failed to save timer panel position:', err);
      }
    }
  };

  // Format keystrokes as MM:SS
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      setDisplayInput('00:00');
      return;
    }
    const seconds = digits.slice(-2).padStart(2, '0');
    const rawMinutes = digits.slice(0, -2);
    const minutes = String(parseInt(rawMinutes || '0', 10)).padStart(2, '0');
    setDisplayInput(`${minutes}:${seconds}`);
  };

  const applyDisplayInput = () => {
    setIsEditingDisplay(false);
    const [minutesPart, secondsPart] = displayInput.split(':');
    const totalSeconds = (parseInt(minutesPart, 10) * 60) + parseInt(secondsPart, 10);
    
    if (Number.isFinite(totalSeconds) && totalSeconds > 0) {
      setRemainingFromDisplayInput(totalSeconds * 1000);
    } else {
      setDisplayInput(formatTimer(remainingMs));
    }
  };

  // Key handlers for display input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Helpers for UI
  const expired = hasStarted && remainingMs <= 0;
  const timerLabel = expired ? "¡Tiempo agotado!" : formatTimer(remainingMs);

  // Default positioning style (centered top if not custom positioned)
  const panelStyle: React.CSSProperties = panelPos
    ? { left: `${panelPos.x}px`, top: `${panelPos.y}px`, position: 'fixed' }
    : { left: '50%', top: '90px', transform: 'translateX(-50%)', position: 'fixed' };

  return (
    <>
      {/* 1. Control Panel: Only for Teachers when open */}
      {isTeacher && isOpen && (
        <div
          ref={panelRef}
          style={panelStyle}
          className={`w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700/60 shadow-2xl rounded-2xl z-[1050] select-none transition-shadow ${
            isDragging ? 'shadow-blue-500/10 border-blue-500/40' : ''
          }`}
        >
          {/* Header (Draggable handle) */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="flex items-center justify-between px-4 py-3 border-b border-slate-800 cursor-grab active:cursor-grabbing text-slate-400"
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Cronómetro</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-slate-800 rounded transition text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 flex flex-col gap-4">
            {/* Input Display (Editable if not running) */}
            <div className="relative">
              <input
                type="text"
                disabled={isRunning}
                value={displayInput}
                onChange={handleInputChange}
                onFocus={() => setIsEditingDisplay(true)}
                onBlur={applyDisplayInput}
                onKeyDown={handleKeyDown}
                className={`w-full text-center text-4xl font-extrabold tracking-widest font-mono py-2 rounded-xl border focus:outline-none transition-all ${
                  expired
                    ? 'bg-red-950/40 border-red-500/40 text-red-400 animate-pulse'
                    : isRunning
                    ? 'bg-slate-950 border-slate-800 text-blue-400'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-600 pointer-events-none">
                MIN:SEG
              </span>
            </div>

            {/* Quick presets (Only if not running) */}
            {!isRunning && (
              <div className="flex justify-between gap-1.5">
                {[1, 2, 5, 10].map((min) => (
                  <button
                    key={min}
                    onClick={() => setDuration(min)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all ${
                      durationMinutes === min
                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/20'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {min} min
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {isRunning ? (
                <button
                  onClick={pauseTimer}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-amber-900/30"
                >
                  <Pause className="w-4 h-4 fill-white" />
                  Pausar
                </button>
              ) : (
                <button
                  onClick={startTimer}
                  disabled={expired}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-900/30"
                >
                  <Play className="w-4 h-4 fill-white translate-x-0.5" />
                  {hasStarted ? 'Reanudar' : 'Iniciar'}
                </button>
              )}

              <button
                onClick={resetTimer}
                disabled={!hasStarted}
                className="px-3 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-300 rounded-xl transition"
                title="Reiniciar"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating display: Visible to all (students and teachers) when the timer has started */}
      {hasStarted && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[1040] flex items-center gap-2 px-4 py-2 rounded-full border shadow-xl select-none animate-fade-in ${
            expired
              ? 'bg-red-950/90 border-red-500/40 text-red-200 animate-bounce'
              : 'bg-slate-900/90 border-amber-500/35 text-amber-200'
          }`}
        >
          <Clock className={`w-4 h-4 ${expired ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
          <span className="font-mono text-base font-bold tracking-wider leading-none">
            {timerLabel}
          </span>
          {isTeacher && (
            <button
              onClick={() => setOpen(true)}
              className="ml-1.5 p-0.5 hover:bg-white/10 rounded transition text-slate-400 hover:text-white"
              title="Abrir panel"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </>
  );
};
