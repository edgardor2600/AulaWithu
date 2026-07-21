import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';

export interface TimerState {
  isOpen: boolean;
  durationMinutes: number;
  remainingMs: number;
  isRunning: boolean;
  deadlineMs: number;
  hasStarted: boolean;
}

const GLOBAL_TIMER_STORAGE_KEY = 'appaula_global_timer_state';

export function useGlobalTimer(ydoc: Y.Doc | null, isTeacher: boolean) {
  const [timerState, setTimerState] = useState<TimerState>({
    isOpen: false,
    durationMinutes: 2,
    remainingMs: 2 * 60 * 1000,
    isRunning: false,
    deadlineMs: 0,
    hasStarted: false,
  });

  const yTimerRef = useRef<Y.Map<any> | null>(null);
  const isUpdatingFromYjs = useRef(false);

  // Load initial local state from localStorage as fallback
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GLOBAL_TIMER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTimerState((prev) => ({
          ...prev,
          durationMinutes: typeof parsed.durationMinutes === 'number' ? parsed.durationMinutes : prev.durationMinutes,
          remainingMs: typeof parsed.remainingMs === 'number' ? parsed.remainingMs : prev.remainingMs,
          position: parsed.position || null,
        }));
      }
    } catch (e) {
      console.warn('Failed to load local timer state:', e);
    }
  }, []);

  // Listen to Yjs shared map changes
  useEffect(() => {
    if (!ydoc) {
      yTimerRef.current = null;
      return;
    }

    const yTimer = ydoc.getMap('globalTimer');
    yTimerRef.current = yTimer;

    const handleYjsUpdate = () => {
      isUpdatingFromYjs.current = true;
      
      const isOpen = yTimer.get('isOpen');
      const durationMinutes = yTimer.get('durationMinutes');
      const remainingMs = yTimer.get('remainingMs');
      const isRunning = yTimer.get('isRunning');
      const deadlineMs = yTimer.get('deadlineMs');
      const hasStarted = yTimer.get('hasStarted');

      setTimerState((prev) => {
        const newState = { ...prev };
        if (isOpen !== undefined) newState.isOpen = isOpen;
        if (durationMinutes !== undefined) newState.durationMinutes = durationMinutes;
        if (remainingMs !== undefined) newState.remainingMs = remainingMs;
        if (isRunning !== undefined) newState.isRunning = isRunning;
        if (deadlineMs !== undefined) newState.deadlineMs = deadlineMs;
        if (hasStarted !== undefined) newState.hasStarted = hasStarted;
        
        // If it became running, adjust the local clock
        if (isRunning && deadlineMs) {
          const calculatedRemaining = Math.max(0, deadlineMs - Date.now());
          newState.remainingMs = calculatedRemaining;
        }

        return newState;
      });

      isUpdatingFromYjs.current = false;
    };

    // Load initial values from Yjs if present
    handleYjsUpdate();

    yTimer.observe(handleYjsUpdate);

    return () => {
      yTimer.unobserve(handleYjsUpdate);
    };
  }, [ydoc]);

  // Save changes to Yjs or Local State
  const updateYTimer = useCallback((updates: Partial<TimerState>) => {
    if (isUpdatingFromYjs.current) return;

    setTimerState((prev) => {
      const next = { ...prev, ...updates };

      // Persist to Yjs if active
      if (yTimerRef.current) {
        yTimerRef.current.doc?.transact(() => {
          if (updates.isOpen !== undefined) yTimerRef.current?.set('isOpen', updates.isOpen);
          if (updates.durationMinutes !== undefined) yTimerRef.current?.set('durationMinutes', updates.durationMinutes);
          if (updates.remainingMs !== undefined) yTimerRef.current?.set('remainingMs', updates.remainingMs);
          if (updates.isRunning !== undefined) yTimerRef.current?.set('isRunning', updates.isRunning);
          if (updates.deadlineMs !== undefined) yTimerRef.current?.set('deadlineMs', updates.deadlineMs);
          if (updates.hasStarted !== undefined) yTimerRef.current?.set('hasStarted', updates.hasStarted);
        });
      }

      // Persist local settings to localStorage
      try {
        localStorage.setItem(GLOBAL_TIMER_STORAGE_KEY, JSON.stringify({
          durationMinutes: next.durationMinutes,
          remainingMs: next.remainingMs,
        }));
      } catch (e) {
        console.warn('Failed to save local timer state:', e);
      }

      return next;
    });
  }, []);

  // Timer Tick Interval Loop
  useEffect(() => {
    if (!timerState.isRunning) return;

    const interval = setInterval(() => {
      const msLeft = Math.max(0, timerState.deadlineMs - Date.now());

      if (msLeft <= 0) {
        clearInterval(interval);
        // Only teacher or local manager handles stopping the timer in Yjs
        if (isTeacher || !ydoc) {
          updateYTimer({
            isRunning: false,
            remainingMs: 0,
            deadlineMs: 0,
          });
        } else {
          setTimerState((prev) => ({
            ...prev,
            isRunning: false,
            remainingMs: 0,
          }));
        }
      } else {
        setTimerState((prev) => ({
          ...prev,
          remainingMs: msLeft,
        }));
      }
    }, 200);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.deadlineMs, isTeacher, ydoc, updateYTimer]);

  // Actions
  const startTimer = useCallback(() => {
    if (timerState.isRunning) return;

    let nextRemaining = timerState.remainingMs;
    // Reset if it finished or wasn't started
    if (!timerState.hasStarted || timerState.remainingMs <= 0) {
      nextRemaining = timerState.durationMinutes * 60 * 1000;
    }

    const nextDeadline = Date.now() + nextRemaining;
    updateYTimer({
      hasStarted: true,
      isRunning: true,
      deadlineMs: nextDeadline,
      remainingMs: nextRemaining,
    });
  }, [timerState.isRunning, timerState.remainingMs, timerState.hasStarted, timerState.durationMinutes, updateYTimer]);

  const pauseTimer = useCallback(() => {
    if (!timerState.isRunning) return;

    const currentRemaining = Math.max(0, timerState.deadlineMs - Date.now());
    updateYTimer({
      isRunning: false,
      deadlineMs: 0,
      remainingMs: currentRemaining,
    });
  }, [timerState.isRunning, timerState.deadlineMs, updateYTimer]);

  const resetTimer = useCallback(() => {
    const freshMs = timerState.durationMinutes * 60 * 1000;
    updateYTimer({
      isRunning: false,
      deadlineMs: 0,
      hasStarted: false,
      remainingMs: freshMs,
    });
  }, [timerState.durationMinutes, updateYTimer]);

  const setOpen = useCallback((open: boolean) => {
    updateYTimer({ isOpen: open });
  }, [updateYTimer]);

  const setDuration = useCallback((minutes: number) => {
    const cleanMinutes = Math.max(1 / 60, minutes);
    const ms = Math.round(cleanMinutes * 60 * 1000);
    updateYTimer({
      durationMinutes: cleanMinutes,
      remainingMs: ms,
      deadlineMs: 0,
      isRunning: false,
      hasStarted: false,
    });
  }, [updateYTimer]);

  const setRemainingFromDisplayInput = useCallback((ms: number) => {
    const cleanMs = Math.max(1000, ms);
    updateYTimer({
      remainingMs: cleanMs,
      durationMinutes: cleanMs / 60000,
      deadlineMs: 0,
      isRunning: false,
      hasStarted: false,
    });
  }, [updateYTimer]);

  return {
    ...timerState,
    setOpen,
    setDuration,
    startTimer,
    pauseTimer,
    resetTimer,
    setRemainingFromDisplayInput,
  };
}
