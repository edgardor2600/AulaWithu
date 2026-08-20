import { useState, useRef, useCallback, useEffect } from 'react';
import * as fabric from 'fabric';
import api from '../services/api';
import toast from 'react-hot-toast';
import { slideService } from '../services/slideService';

// ─── Helper: Wrap long text into lines ───────────────────────────────────────

function wrapText(text: string, charsPerLine: number): string {
  if (!text) return '';
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if (current && (current + ' ' + w).length > charsPerLine) {
      lines.push(current);
      current = w;
    } else {
      current = current ? current + ' ' + w : w;
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

// ─── Helper: Build Rich Fabric JSON for Phase Slides ─────────────────────────

function buildPhaseFabricJson(phase: LessonPhase, subject: string, level: string): string {
  const objects: any[] = [];
  const LEFT = 40;
  const CONTENT_W = 880;
  const GAP = 14;
  let y = 36;

  // Phase-specific color palettes
  const PALETTES = [
    { headerBg: '#1e3a5f', headerText: '#93c5fd', accent: '#3b82f6', accentDim: '#dbeafe', accentText: '#1d4ed8', taskBg: '#eff6ff' },
    { headerBg: '#2d1b69', headerText: '#c4b5fd', accent: '#7c3aed', accentDim: '#ede9fe', accentText: '#6d28d9', taskBg: '#f5f3ff' },
    { headerBg: '#0c4a6e', headerText: '#7dd3fc', accent: '#0284c7', accentDim: '#e0f2fe', accentText: '#0369a1', taskBg: '#f0f9ff' },
    { headerBg: '#450a0a', headerText: '#fca5a5', accent: '#dc2626', accentDim: '#fee2e2', accentText: '#b91c1c', taskBg: '#fff1f2' },
    { headerBg: '#052e16', headerText: '#86efac', accent: '#16a34a', accentDim: '#dcfce7', accentText: '#15803d', taskBg: '#f0fdf4' },
    { headerBg: '#451a03', headerText: '#fcd34d', accent: '#d97706', accentDim: '#fef3c7', accentText: '#b45309', taskBg: '#fffbeb' },
  ];
  const pal = PALETTES[phase.phase % PALETTES.length];

  // ── 1. Header ───────────────────────────────────────────────────────────────
  const headerH = 72;
  objects.push({ type: 'Rect', version: '6.0.0', left: LEFT, top: y, width: CONTENT_W, height: headerH, fill: pal.headerBg, rx: 12, ry: 12 });
  objects.push({
    type: 'IText', version: '6.0.0',
    left: LEFT + 20, top: y + 12,
    text: `Fase ${phase.phase + 1}: ${phase.name}`,
    fontSize: 24, fontWeight: 'bold', fill: pal.headerText, fontFamily: 'Inter, Arial, sans-serif',
  });
  objects.push({
    type: 'IText', version: '6.0.0',
    left: LEFT + 20, top: y + 44,
    text: `${subject} · Nivel ${level}`,
    fontSize: 13, fill: '#94a3b8', fontFamily: 'Inter, Arial, sans-serif',
  });
  // Objective badge (right side)
  if (phase.objective) {
    const objShort = phase.objective.length > 80 ? phase.objective.substring(0, 77) + '...' : phase.objective;
    objects.push({
      type: 'IText', version: '6.0.0',
      left: LEFT + CONTENT_W - 420, top: y + 22,
      text: `🎯 ${objShort}`,
      fontSize: 11, fill: '#cbd5e1', fontFamily: 'Inter, Arial, sans-serif', fontStyle: 'italic',
    });
  }
  y += headerH + GAP;

  // ── 2. Key Structure (most prominent) ─────────────────────────────────────
  if (phase.key_structure && phase.key_structure.trim()) {
    const structLines = phase.key_structure.trim().split('\n');
    const structH = Math.max(90, structLines.length * 26 + 52);
    objects.push({ type: 'Rect', version: '6.0.0', left: LEFT, top: y, width: CONTENT_W, height: structH, fill: '#fffbeb', stroke: pal.accent, strokeWidth: 2.5, rx: 10, ry: 10 });
    objects.push({
      type: 'IText', version: '6.0.0', left: LEFT + 18, top: y + 10,
      text: '⚡ ESTRUCTURA / FÓRMULA CLAVE',
      fontSize: 11, fontWeight: 'bold', fill: pal.accentText, fontFamily: 'Inter, Arial, sans-serif',
    });
    objects.push({
      type: 'IText', version: '6.0.0', left: LEFT + 18, top: y + 30,
      text: phase.key_structure.trim(),
      fontSize: 17, fontWeight: 'bold', fill: '#1c1917', fontFamily: 'Courier New, monospace',
    });
    y += structH + GAP;
  }

  // ── 3. Tutor Explanation ───────────────────────────────────────────────────
  if (phase.tutor_says && phase.tutor_says.trim()) {
    objects.push({
      type: 'IText', version: '6.0.0', left: LEFT, top: y,
      text: '🤖  Explicación del tutor',
      fontSize: 13, fontWeight: 'bold', fill: pal.accentText, fontFamily: 'Inter, Arial, sans-serif',
    });
    y += 22;
    const wrapped = wrapText(phase.tutor_says.trim(), 110);
    const tutorLines = wrapped.split('\n').length;
    const tutorH = Math.max(60, tutorLines * 21 + 24);
    objects.push({ type: 'Rect', version: '6.0.0', left: LEFT, top: y, width: CONTENT_W, height: tutorH, fill: '#f8fafc', stroke: '#e2e8f0', strokeWidth: 1, rx: 8, ry: 8 });
    objects.push({
      type: 'IText', version: '6.0.0', left: LEFT + 16, top: y + 12,
      text: wrapped,
      fontSize: 14, fill: '#1e293b', fontFamily: 'Inter, Arial, sans-serif', lineHeight: 1.55,
    });
    y += tutorH + GAP;
  }

  // ── 4. Explanation Points (bullets) ────────────────────────────────────────
  if ((phase as any).explanation_points && (phase as any).explanation_points.length > 0) {
    const points: string[] = (phase as any).explanation_points;
    objects.push({
      type: 'IText', version: '6.0.0', left: LEFT, top: y,
      text: '📋  Puntos clave',
      fontSize: 13, fontWeight: 'bold', fill: pal.accentText, fontFamily: 'Inter, Arial, sans-serif',
    });
    y += 22;
    const pointsText = points.map(p => `  •  ${p}`).join('\n');
    const pointLines = points.length;
    const pointsH = Math.max(44, pointLines * 22 + 20);
    objects.push({ type: 'Rect', version: '6.0.0', left: LEFT, top: y, width: CONTENT_W, height: pointsH, fill: pal.accentDim, rx: 8, ry: 8 });
    objects.push({
      type: 'IText', version: '6.0.0', left: LEFT + 14, top: y + 10,
      text: pointsText,
      fontSize: 14, fill: pal.accentText, fontFamily: 'Inter, Arial, sans-serif', lineHeight: 1.5,
    });
    y += pointsH + GAP;
  }

  // ── 5. Examples ─────────────────────────────────────────────────────────────
  if ((phase as any).examples && (phase as any).examples.length > 0) {
    const examples: any[] = (phase as any).examples;
    objects.push({
      type: 'IText', version: '6.0.0', left: LEFT, top: y,
      text: '💡  Ejemplos',
      fontSize: 13, fontWeight: 'bold', fill: pal.accentText, fontFamily: 'Inter, Arial, sans-serif',
    });
    y += 22;
    for (const ex of examples) {
      const hasNote = ex.context_note && ex.context_note.trim();
      const hasTrans = ex.spanish_translation && ex.spanish_translation.trim();
      const exH = hasNote ? 74 : hasTrans ? 58 : 40;
      objects.push({ type: 'Rect', version: '6.0.0', left: LEFT, top: y, width: CONTENT_W, height: exH, fill: '#f0f9ff', stroke: '#bae6fd', strokeWidth: 1, rx: 6, ry: 6 });
      const mainText = ex.english || ex.text || '';
      if (mainText) {
        objects.push({
          type: 'IText', version: '6.0.0', left: LEFT + 14, top: y + 8,
          text: mainText,
          fontSize: 15, fontWeight: 'bold', fill: '#0369a1', fontFamily: 'Inter, Arial, sans-serif',
        });
      }
      if (hasTrans) {
        objects.push({
          type: 'IText', version: '6.0.0', left: LEFT + 14, top: y + 30,
          text: `→ ${ex.spanish_translation}`,
          fontSize: 12, fill: '#475569', fontFamily: 'Inter, Arial, sans-serif', fontStyle: 'italic',
        });
      }
      if (hasNote) {
        objects.push({
          type: 'IText', version: '6.0.0', left: LEFT + 14, top: y + 52,
          text: `📌 ${ex.context_note}`,
          fontSize: 11, fill: '#64748b', fontFamily: 'Inter, Arial, sans-serif',
        });
      }
      y += exH + 8;
    }
    y += GAP - 8;
  }

  // ── 6. Student Task ─────────────────────────────────────────────────────────
  if (phase.student_task && phase.student_task.trim()) {
    const taskWrapped = wrapText(`📝  Tarea: ${phase.student_task.trim()}`, 105);
    const taskLines = taskWrapped.split('\n').length;
    const taskH = Math.max(54, taskLines * 22 + 20);
    objects.push({ type: 'Rect', version: '6.0.0', left: LEFT, top: y, width: CONTENT_W, height: taskH, fill: '#f0fdf4', stroke: '#86efac', strokeWidth: 2, rx: 10, ry: 10 });
    objects.push({
      type: 'IText', version: '6.0.0', left: LEFT + 16, top: y + 14,
      text: taskWrapped,
      fontSize: 16, fontWeight: 'bold', fill: '#166534', fontFamily: 'Inter, Arial, sans-serif',
    });
    y += taskH + GAP;
  }

  // ── 7. Exercises list (Phase 4 practice) ────────────────────────────────────
  if (phase.exercises && phase.exercises.length > 0) {
    objects.push({
      type: 'IText', version: '6.0.0', left: LEFT, top: y,
      text: `⚡  ${phase.exercises.length} Ejercicios de práctica progresiva`,
      fontSize: 13, fontWeight: 'bold', fill: pal.accentText, fontFamily: 'Inter, Arial, sans-serif',
    });
    y += 24;
    const exLines = phase.exercises.map((ex, i) => `${i + 1}. ${ex.student_task || ex.tutor_says || ''}`).join('\n');
    const wrapped = wrapText(exLines, 105);
    const lc = wrapped.split('\n').length;
    const exH = Math.max(80, lc * 20 + 20);
    objects.push({ type: 'Rect', version: '6.0.0', left: LEFT, top: y, width: CONTENT_W, height: exH, fill: pal.accentDim, rx: 8, ry: 8 });
    objects.push({
      type: 'IText', version: '6.0.0', left: LEFT + 14, top: y + 10,
      text: wrapped,
      fontSize: 14, fill: '#1e293b', fontFamily: 'Inter, Arial, sans-serif', lineHeight: 1.5,
    });
  }

  return JSON.stringify({ version: '6.0.0', objects });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BoardAction {
  action: 'draw_text' | 'draw_sketch' | 'insert_image' | 'highlight';
  content?: string;
  template?: string;
  color?: string;
}

export interface LessonPhase {
  phase: number;
  name: string;
  objective: string;
  tutor_says: string;
  student_task: string;
  key_structure?: string;
  expected_answer: string;
  evaluation_focus?: string[];
  board_actions?: BoardAction[];
  image_prompt?: string;
  exercises?: PracticeExercise[];
  // ✅ Nuevos campos del prompt enriquecido
  explanation_points?: string[];
  examples?: Array<{ english?: string; text?: string; spanish_translation?: string; context_note?: string }>;
  common_error?: string;
}

export interface PracticeExercise {
  id?: number;
  tutor_says: string;
  student_task: string;
  expected_answer: string;
  example_answer?: string;
  answer_explanation?: string;
  image_prompt?: string;
}

export interface LessonScript {
  schema: string;
  topic: string;
  level: string;
  context: string;
  subject: string;
  phases: LessonPhase[];
}

export interface TutorMaterialSummary {
  id: number;
  content_id: string;
  title: string;
  topic: string;
  subject: string;
  level: string;
  mode: string;
  context: string;
  created_at: string;
  updated_at: string;
}

// ─── Module-level Persistent State (survives CanvasEditor slide remounts) ─────

interface PersistentTutorState {
  script: LessonScript | null;
  showAITutorPanel: boolean;
  activeTab: 'generator' | 'library' | 'runtime';
  subject: string;
  topic: string;
  level: string;
  mode: 'guided' | 'practice';
  context: string;
}

const tutorStateCache: Record<string, PersistentTutorState> = {};

export interface UseAITutorOptions {
  canvasOrGetter?: fabric.Canvas | null | (() => fabric.Canvas | null);
  saveHistory?: () => void;
  classId?: string | null;
  topicId?: string | null;
  currentSlideIndex?: number;
  onSlideChange?: (index: number) => void;
  onReloadSlides?: () => Promise<void>;
  totalSlides?: number;
}

export function useAITutor(
  canvasOrGetterOrOptions: fabric.Canvas | null | (() => fabric.Canvas | null) | UseAITutorOptions,
  legacySaveHistory?: () => void
) {
  let canvasOrGetter: fabric.Canvas | null | (() => fabric.Canvas | null) = null;
  let saveHistory: () => void = () => {};
  let classId: string | null = null;
  let topicId: string | null = null;
  let currentSlideIndex: number | undefined = undefined;
  let onSlideChange: ((index: number) => void) | undefined = undefined;
  let onReloadSlides: (() => Promise<void>) | undefined = undefined;
  let totalSlides: number | undefined = undefined; // ✅ NUEVO: para navegación correcta

  if (canvasOrGetterOrOptions && typeof canvasOrGetterOrOptions === 'object' && !('renderAll' in canvasOrGetterOrOptions)) {
    const opts = canvasOrGetterOrOptions as UseAITutorOptions;
    canvasOrGetter = opts.canvasOrGetter ?? null;
    saveHistory = opts.saveHistory ?? (() => {});
    classId = opts.classId ?? null;
    topicId = opts.topicId ?? null;
    currentSlideIndex = opts.currentSlideIndex;
    onSlideChange = opts.onSlideChange;
    onReloadSlides = opts.onReloadSlides;
    totalSlides = opts.totalSlides; // ✅ NUEVO
  } else {
    canvasOrGetter = canvasOrGetterOrOptions as any;
    saveHistory = legacySaveHistory ?? (() => {});
  }

  const cacheKey = classId || 'default_tutor_session';
  const initialCache = tutorStateCache[cacheKey];

  // Panel visibility
  const [showAITutorPanel, setShowAITutorPanelRaw] = useState<boolean>(initialCache?.showAITutorPanel ?? false);
  const [activeTab, setActiveTabRaw] = useState<'generator' | 'library' | 'runtime'>(initialCache?.activeTab ?? 'generator');

  // Config
  const [subject, setSubjectRaw] = useState<string>(initialCache?.subject ?? 'English');
  const [topic, setTopicRaw] = useState<string>(initialCache?.topic ?? '');
  const [level, setLevelRaw] = useState<string>(initialCache?.level ?? 'B1');
  const [context, setContextRaw] = useState<string>(initialCache?.context ?? '');
  const [mode, setModeRaw] = useState<'guided' | 'practice'>(initialCache?.mode ?? 'guided');

  // Lesson state
  const [script, setScriptRaw] = useState<LessonScript | null>(initialCache?.script ?? null);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(currentSlideIndex !== undefined ? currentSlideIndex : 0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConvertingSlides, setIsConvertingSlides] = useState(false);
  const [lessonSlidesCreated, setLessonSlidesCreated] = useState(false); // ✅ Oculta botón tras creación

  // Helper to persist state updates in module cache
  const updateCache = useCallback((updater: Partial<PersistentTutorState>) => {
    tutorStateCache[cacheKey] = {
      script: tutorStateCache[cacheKey]?.script ?? null,
      showAITutorPanel: tutorStateCache[cacheKey]?.showAITutorPanel ?? false,
      activeTab: tutorStateCache[cacheKey]?.activeTab ?? 'generator',
      subject: tutorStateCache[cacheKey]?.subject ?? 'English',
      topic: tutorStateCache[cacheKey]?.topic ?? '',
      level: tutorStateCache[cacheKey]?.level ?? 'B1',
      mode: tutorStateCache[cacheKey]?.mode ?? 'guided',
      context: tutorStateCache[cacheKey]?.context ?? '',
      ...updater,
    };
  }, [cacheKey]);

  const setShowAITutorPanel = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setShowAITutorPanelRaw(prev => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      updateCache({ showAITutorPanel: nextVal });
      return nextVal;
    });
  }, [updateCache]);

  const setActiveTab = useCallback((val: 'generator' | 'library' | 'runtime') => {
    setActiveTabRaw(val);
    updateCache({ activeTab: val });
  }, [updateCache]);

  const setSubject = useCallback((val: string) => {
    setSubjectRaw(val);
    updateCache({ subject: val });
  }, [updateCache]);

  const setTopic = useCallback((val: string) => {
    setTopicRaw(val);
    updateCache({ topic: val });
  }, [updateCache]);

  const setLevel = useCallback((val: string) => {
    setLevelRaw(val);
    updateCache({ level: val });
  }, [updateCache]);

  const setContext = useCallback((val: string) => {
    setContextRaw(val);
    updateCache({ context: val });
  }, [updateCache]);

  const setMode = useCallback((val: 'guided' | 'practice') => {
    setModeRaw(val);
    updateCache({ mode: val });
  }, [updateCache]);

  const setScript = useCallback((val: LessonScript | null | ((prev: LessonScript | null) => LessonScript | null)) => {
    setScriptRaw(prev => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      updateCache({ script: nextVal });
      return nextVal;
    });
  }, [updateCache]);

  // TTS
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Listening (student mic PTT)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [studentInput, setStudentInput] = useState('');

  // Evaluation
  const [lastFeedback, setLastFeedback] = useState('');
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Library
  const [savedMaterials, setSavedMaterials] = useState<TutorMaterialSummary[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Helper to dynamically get the live canvas instance
  const getCanvas = useCallback((): fabric.Canvas | null => {
    if (typeof canvasOrGetter === 'function') {
      return canvasOrGetter();
    }
    return canvasOrGetter;
  }, [canvasOrGetter]);

  // ─── Synchronize Phase with Slide selection in presentation ────────────────

  useEffect(() => {
    if (currentSlideIndex !== undefined && currentSlideIndex >= 0) {
      if (script && currentSlideIndex < script.phases.length) {
        setCurrentPhaseIndex(currentSlideIndex);
      }
    }
  }, [currentSlideIndex, script]);

  // ─── TTS — Reutiliza /api/conversation/tts ──────────────────────────────────

  const stopSpeech = useCallback(() => {
    try {
      audioSourceRef.current?.stop();
    } catch (_) {}
    audioSourceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(async (text: string, voice?: string) => {
    if (!text?.trim()) return;
    stopSpeech();
    setIsSpeaking(true);
    try {
      const response = await api.get('/conversation/tts', {
        params: {
          text: text.trim(),
          voice: voice || (subject.toLowerCase().includes('english') ? 'English_magnetic_man' : 'female-shaonv'),
          speed: 1.0,
        },
        responseType: 'arraybuffer',
      });

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      const decoded = await ctx.decodeAudioData(response.data as ArrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      audioSourceRef.current = source;
      source.start();
    } catch (err: any) {
      console.error('[useAITutor] TTS error:', err);
      toast.error('Error al reproducir audio del tutor');
      setIsSpeaking(false);
    }
  }, [stopSpeech, subject]);

  const speakCurrentPhase = useCallback(async () => {
    const phase = script?.phases[currentPhaseIndex];
    if (phase?.tutor_says) {
      await speakText(phase.tutor_says);
    } else {
      toast('No hay diálogo para esta diapositiva');
    }
  }, [script, currentPhaseIndex, speakText]);

  // ─── Microphone (Web Speech API — PTT for student) ────────────────────────

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Tu navegador no soporta reconocimiento de voz'); return; }

    const rec = new SR();
    rec.lang = subject.toLowerCase().includes('english') ? 'en-US' : 'es-ES';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      setStudentInput(prev => (prev ? `${prev} ${transcript}` : transcript).trim());
    };
    rec.onerror = (e: any) => {
      console.warn('[useAITutor] Speech recognition error:', e.error);
      setIsListening(false);
    };
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [subject]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ─── Board Actions — Inject into Fabric.js canvas ─────────────────────────

  const SKETCH_COLORS: Record<string, string> = {
    text:   '#1e293b',
    header: '#4f46e5',
    line:   '#94a3b8',
    box:    '#e2e8f0',
  };

  const executeBoardActions = useCallback((actions: BoardAction[], customX?: number, customY?: number) => {
    const cv = getCanvas();
    if (!cv || !actions?.length) return;

    let offsetY = customY ?? 80;
    const baseX = customX ?? 80;

    actions.forEach(action => {
      if (action.action === 'draw_text' && action.content) {
        const lines = action.content.split('\n');
        lines.forEach((line, i) => {
          const isHeader = i === 0 && lines.length > 1;
          const textObj = new fabric.IText(line || ' ', {
            left: baseX,
            top: offsetY,
            fontSize: isHeader ? 22 : 16,
            fontWeight: isHeader ? 'bold' : 'normal',
            fill: isHeader ? SKETCH_COLORS.header : SKETCH_COLORS.text,
            fontFamily: 'Inter, sans-serif',
            editable: true,
          });
          (textObj as any).isLocalOwned = true;
          (textObj as any).isAITutorPhase = true;
          cv.add(textObj);
          offsetY += isHeader ? 32 : 24;
        });
        offsetY += 12;
      } else if (action.action === 'draw_sketch') {
        const template = action.template || '';
        if (template.includes('formula_box')) {
          const rect = new fabric.Rect({
            left: baseX,
            top: offsetY,
            width: 440,
            height: 64,
            fill: '#eff6ff',
            stroke: '#3b82f6',
            strokeWidth: 2,
            rx: 8,
            ry: 8,
          });
          (rect as any).isLocalOwned = true;
          (rect as any).isAITutorPhase = true;
          cv.add(rect);
          offsetY += 80;
        } else if (template.includes('timeline')) {
          const line = new fabric.Line([baseX, offsetY + 20, baseX + 400, offsetY + 20], {
            stroke: '#3b82f6',
            strokeWidth: 3,
          });
          (line as any).isLocalOwned = true;
          (line as any).isAITutorPhase = true;
          cv.add(line);
          offsetY += 50;
        } else if (template.includes('comparison_bars')) {
          [0, 1].forEach(i => {
            const box = new fabric.Rect({
              left: baseX + i * 210,
              top: offsetY,
              width: 190,
              height: 80,
              fill: i === 0 ? '#eff6ff' : '#f0fdf4',
              stroke: i === 0 ? '#3b82f6' : '#22c55e',
              strokeWidth: 2,
              rx: 6,
              ry: 6,
            });
            (box as any).isLocalOwned = true;
            (box as any).isAITutorPhase = true;
            cv.add(box);
          });
          offsetY += 100;
        }
      }
    });

    cv.renderAll();
    saveHistory();
  }, [getCanvas, saveHistory]);

  /**
   * Clears only the AI Tutor phase layer from the whiteboard canvas
   */
  const clearBoardPhase = useCallback(() => {
    const cv = getCanvas();
    if (!cv) return;
    const oldObjects = cv.getObjects().filter((o: any) => o.isAITutorPhase);
    oldObjects.forEach(o => cv.remove(o));
    cv.renderAll();
    saveHistory();
  }, [getCanvas, saveHistory]);

  /**
   * ✅ NUEVO: Clears ALL objects from the current slide canvas (full wipe)
   * Used by the "Limpiar" button in AITutorPanel
   */
  const clearCurrentSlide = useCallback(() => {
    const cv = getCanvas();
    if (!cv) {
      toast.error('Pizarra no disponible');
      return;
    }
    cv.getObjects().slice().forEach(o => cv.remove(o));
    cv.renderAll();
    saveHistory();
    toast.success('Diapositiva limpiada');
  }, [getCanvas, saveHistory]);

  /**
   * Draws the specified phase content onto the whiteboard canvas cleanly
   */
  const drawCurrentPhaseToBoard = useCallback((targetPhaseIndex?: number) => {
    const cv = getCanvas();
    if (!cv) {
      toast.error('Pizarra no disponible');
      return;
    }

    const idx = targetPhaseIndex !== undefined ? targetPhaseIndex : currentPhaseIndex;
    const currentPhase = script?.phases[idx];
    if (!currentPhase) {
      toast.error('No hay lección activa');
      return;
    }

    // Clean previous AI Tutor layer to avoid overlapping
    const oldObjects = cv.getObjects().filter((o: any) => o.isAITutorPhase);
    oldObjects.forEach(o => cv.remove(o));

    const center = cv.getCenter();
    const centerY = (center as any).top ?? (center as any).y ?? 300;
    const centerX = (center as any).left ?? (center as any).x ?? 400;
    let offsetY = Math.max(50, centerY - 200);
    const baseX = Math.max(50, centerX - 260);

    // 1. Phase Header
    const headerTitle = `📌 Fase ${currentPhase.phase + 1}: ${currentPhase.name}`;
    const headerText = new fabric.IText(headerTitle, {
      left: baseX,
      top: offsetY,
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#4f46e5',
      fontFamily: 'Inter, sans-serif',
      editable: true,
    });
    (headerText as any).isLocalOwned = true;
    (headerText as any).isAITutorPhase = true;
    cv.add(headerText);
    offsetY += 34;

    // 2. Key Structure / Formula Card
    if (currentPhase.key_structure && currentPhase.key_structure.trim()) {
      const structText = currentPhase.key_structure.trim();
      const lines = structText.split('\n');
      const cardHeight = Math.max(64, lines.length * 24 + 32);
      const cardWidth = Math.max(480, Math.min(760, structText.length * 8 + 60));

      const cardBg = new fabric.Rect({
        left: baseX,
        top: offsetY,
        width: cardWidth,
        height: cardHeight,
        fill: '#f8fafc',
        stroke: '#f59e0b',
        strokeWidth: 2,
        rx: 10,
        ry: 10,
      });
      (cardBg as any).isLocalOwned = true;
      (cardBg as any).isAITutorPhase = true;
      cv.add(cardBg);

      const cardTitle = new fabric.IText('ESTRUCTURA CLAVE', {
        left: baseX + 14,
        top: offsetY + 8,
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#d97706',
        fontFamily: 'Inter, sans-serif',
        editable: false,
      });
      (cardTitle as any).isLocalOwned = true;
      (cardTitle as any).isAITutorPhase = true;
      cv.add(cardTitle);

      const textContent = new fabric.IText(structText, {
        left: baseX + 14,
        top: offsetY + 26,
        fontSize: 16,
        fontWeight: 'bold',
        fill: '#0f172a',
        fontFamily: 'monospace, Inter, sans-serif',
        editable: true,
      });
      (textContent as any).isLocalOwned = true;
      (textContent as any).isAITutorPhase = true;
      cv.add(textContent);

      offsetY += cardHeight + 16;
    }

    // 3. Student Task
    if (currentPhase.student_task && currentPhase.student_task.trim()) {
      const taskText = `📝 Tarea: ${currentPhase.student_task.trim()}`;
      const taskObj = new fabric.IText(taskText, {
        left: baseX,
        top: offsetY,
        fontSize: 15,
        fontWeight: 'bold',
        fill: '#059669',
        fontFamily: 'Inter, sans-serif',
        editable: true,
      });
      (taskObj as any).isLocalOwned = true;
      (taskObj as any).isAITutorPhase = true;
      cv.add(taskObj);
      offsetY += 30;
    }

    // 4. Custom Board Actions if provided
    if (currentPhase.board_actions && currentPhase.board_actions.length > 0) {
      executeBoardActions(currentPhase.board_actions, baseX, offsetY);
    }

    cv.renderAll();
    saveHistory();
    toast.success(`Fase ${currentPhase.phase + 1} actualizada en pizarra`);
  }, [getCanvas, script, currentPhaseIndex, executeBoardActions, saveHistory]);

  // ─── Convert Lesson To Individual Slides ───────────────────────────────────

  const convertLessonToSlides = useCallback(async (targetClassId?: string, targetTopicId?: string, reloadCb?: () => Promise<void>) => {
    const cId = targetClassId || classId;
    const tId = targetTopicId || topicId;
    const reload = reloadCb || onReloadSlides;

    if (!script || !script.phases?.length) {
      toast.error('No hay lección activa para crear diapositivas');
      return;
    }
    if (!cId) {
      toast.error('Se requiere una clase activa para crear diapositivas');
      return;
    }

    setIsConvertingSlides(true);
    try {
      toast('Creando diapositivas de la lección...');
      for (const p of script.phases) {
        const newSlide = await slideService.create(cId, {
          title: `Fase ${p.phase + 1}: ${p.name}`,
          topic_id: tId || undefined,
        });

        const canvasData = buildPhaseFabricJson(p, subject, level);
        await slideService.updateCanvas(newSlide.id, canvasData);
      }

      // ✅ CLAVE: Fijar panel visible en cache ANTES del reload silencioso
      updateCache({ showAITutorPanel: true, activeTab: 'runtime' });
      setShowAITutorPanel(true);
      setActiveTab('runtime');
      setCurrentPhaseIndex(0);
      setLessonSlidesCreated(true); // ✅ Ocultar botón "Crear Diapositivas"

      // Calcular índice de la PRIMERA slide nueva (no la vacía inicial)
      const firstNewSlideIndex = typeof totalSlides === 'number' ? totalSlides : 0;

      if (reload) {
        await reload();
      }
      if (onSlideChange) {
        onSlideChange(firstNewSlideIndex);
      }

      toast.success(`¡${script.phases.length} diapositivas de la lección creadas con éxito!`);
    } catch (err: any) {
      console.error('[useAITutor] convertLessonToSlides error:', err);
      toast.error('Error al crear diapositivas: ' + (err.message || err));
    } finally {
      setIsConvertingSlides(false);
    }
  }, [script, subject, level, classId, topicId, onReloadSlides, onSlideChange, updateCache, setShowAITutorPanel, setActiveTab, totalSlides]);

  // ─── Generate Lesson ──────────────────────────────────────────────────────

  const generateLesson = useCallback(async () => {
    if (!topic.trim()) { toast.error('Ingresa el tema de la lección'); return; }
    setIsGenerating(true);
    setScript(null);
    setLastFeedback('');
    setLastScore(null);
    try {
      const res = await api.post('/tutor/generate-lesson', {
        topic: topic.trim(),
        level,
        subject,
        context: context.trim(),
        mode,
      }, { timeout: 180000 });
      if (res.data?.ok && res.data?.script) {
        const genScript: LessonScript = res.data.script;
        setScript(genScript);
        setCurrentPhaseIndex(0);
        setActiveTab('runtime');
        toast.success(`Lección generada (${res.data.provider})`);

        // Automatically create individual slides for each phase in the presentation!
        if (classId && genScript.phases?.length > 0) {
          try {
            toast('Creando diapositivas de la lección...');
            for (const p of genScript.phases) {
              const newSlide = await slideService.create(classId, {
                title: `Fase ${p.phase + 1}: ${p.name}`,
                topic_id: topicId || undefined,
              });
              const canvasData = buildPhaseFabricJson(p, subject, level);
              await slideService.updateCanvas(newSlide.id, canvasData);
            }

            // ✅ CLAVE: Fijar panel visible en cache ANTES del reload silencioso
            updateCache({ showAITutorPanel: true, activeTab: 'runtime' });
            setShowAITutorPanel(true);
            setActiveTab('runtime');
            setCurrentPhaseIndex(0);
            setLessonSlidesCreated(true); // ✅ Ocultar botón "Crear Diapositivas"

            // Navegar a la PRIMERA slide nueva (no al índice 0 que puede ser la slide vacía)
            const firstNewIndex = typeof totalSlides === 'number' ? totalSlides : 0;

            if (onReloadSlides) {
              await onReloadSlides();
            }
            if (onSlideChange) {
              onSlideChange(firstNewIndex);
            }
            toast.success(`¡${genScript.phases.length} diapositivas creadas en tu presentación!`);
          } catch (slideErr: any) {
            console.error('[useAITutor] Error creating automatic slides:', slideErr);
          }
        }
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (err: any) {
      console.error('[useAITutor] generateLesson error:', err);
      toast.error('Error al generar la lección: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsGenerating(false);
    }
  }, [topic, level, subject, context, mode, classId, topicId, onReloadSlides, onSlideChange, totalSlides, updateCache, setShowAITutorPanel, setActiveTab]);

  // ─── Generate Practice ────────────────────────────────────────────────────

  const generatePractice = useCallback(async () => {
    if (!topic.trim()) { toast.error('Ingresa el tema'); return; }
    setIsGenerating(true);
    try {
      const res = await api.post('/tutor/generate-practice', {
        topic: topic.trim(),
        level,
        subject,
        count: 6,
      }, { timeout: 180000 });
      if (res.data?.ok) {
        const practiceScript: LessonScript = {
          schema: 'ai_tutor.practice.v1',
          topic: topic.trim(),
          level,
          context: '',
          subject,
          phases: [{
            phase: 0,
            name: 'Práctica Libre',
            objective: `Práctica de ${topic}`,
            tutor_says: `Vamos a practicar ${topic} nivel ${level}. Responde cada ejercicio y recibirás retroalimentación inmediata.`,
            student_task: '',
            expected_answer: '',
            exercises: res.data.exercises,
          }],
        };
        setScript(practiceScript);
        setCurrentPhaseIndex(0);
        setActiveTab('runtime');
        toast.success('Ejercicios de práctica generados');

        if (classId) {
          try {
            const newSlide = await slideService.create(classId, {
              title: `Práctica: ${topic}`,
              topic_id: topicId || undefined,
            });
            const canvasData = buildPhaseFabricJson(practiceScript.phases[0], subject, level);
            await slideService.updateCanvas(newSlide.id, canvasData);
            if (onReloadSlides) await onReloadSlides();
          } catch (slideErr: any) {
            console.error('[useAITutor] Error creating practice slide:', slideErr);
          }
        }
      }
    } catch (err: any) {
      toast.error('Error al generar práctica: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsGenerating(false);
    }
  }, [topic, level, subject, classId, topicId, onReloadSlides]);

  // ─── Slide & Phase Navigation ("Siguiente" / "Anterior") ───────────────────

  const nextPhase = useCallback(() => {
    if (!script) return;
    const maxIdx = script.phases.length - 1;
    if (currentPhaseIndex >= maxIdx) return;
    const next = currentPhaseIndex + 1;
    setCurrentPhaseIndex(next);
    setStudentInput('');
    setLastFeedback('');
    setLastScore(null);
    stopSpeech();

    // If presentation slide navigation is available, navigate to that slide!
    if (onSlideChange) {
      onSlideChange(next);
    } else {
      drawCurrentPhaseToBoard(next);
    }
  }, [script, currentPhaseIndex, stopSpeech, onSlideChange, drawCurrentPhaseToBoard]);

  const prevPhase = useCallback(() => {
    if (currentPhaseIndex <= 0) return;
    const prev = currentPhaseIndex - 1;
    setCurrentPhaseIndex(prev);
    setStudentInput('');
    setLastFeedback('');
    setLastScore(null);
    stopSpeech();

    // If presentation slide navigation is available, navigate to that slide!
    if (onSlideChange) {
      onSlideChange(prev);
    } else {
      drawCurrentPhaseToBoard(prev);
    }
  }, [currentPhaseIndex, stopSpeech, onSlideChange, drawCurrentPhaseToBoard]);

  // ─── Evaluate Answer ──────────────────────────────────────────────────────

  const evaluateAnswer = useCallback(async (answer: string) => {
    if (!answer.trim()) { toast.error('Escribe o graba tu respuesta primero'); return; }
    const phase = script?.phases[currentPhaseIndex];
    setIsEvaluating(true);
    try {
      const res = await api.post('/tutor/evaluate-answer', {
        question: phase?.student_task || phase?.objective || '',
        expected_answer: phase?.expected_answer || '',
        student_answer: answer.trim(),
        subject,
        level,
      });
      if (res.data?.ok) {
        setLastScore(res.data.score);
        setLastFeedback(res.data.feedback);
        toast.success(`Puntuación: ${res.data.score}/100`);
      }
    } catch (err: any) {
      toast.error('Error al evaluar la respuesta');
    } finally {
      setIsEvaluating(false);
    }
  }, [script, currentPhaseIndex, subject, level]);

  // ─── Evaluate Board (Canvas Screenshot) ──────────────────────────────────

  const captureAndEvaluateBoard = useCallback(async () => {
    const cv = getCanvas();
    if (!cv) { toast.error('Canvas no disponible'); return; }
    const phase = script?.phases[currentPhaseIndex];
    setIsEvaluating(true);
    try {
      // Export canvas as PNG base64 at reduced quality to keep payload small
      const dataUrl = cv.toDataURL({ format: 'png', quality: 0.5, multiplier: 0.6 });
      const base64 = dataUrl.split(',')[1];

      const res = await api.post('/tutor/evaluate-board', {
        phase_description: `${phase?.name || 'Ejercicio'}: ${phase?.objective || ''}`,
        board_image_base64: base64,
      }, { timeout: 180000 });
      if (res.data?.ok) {
        setLastScore(res.data.score);
        setLastFeedback(res.data.feedback);
        toast.success(`Pizarra evaluada: ${res.data.score}/100`);
      }
    } catch (err: any) {
      toast.error('Error al evaluar la pizarra');
    } finally {
      setIsEvaluating(false);
    }
  }, [script, currentPhaseIndex]);

  // ─── Library ──────────────────────────────────────────────────────────────

  const loadLibrary = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await api.get('/tutor/materials');
      if (res.data?.ok) setSavedMaterials(res.data.materials || []);
    } catch (err: any) {
      toast.error('Error al cargar la biblioteca');
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  const saveToLibrary = useCallback(async () => {
    if (!script) { toast.error('No hay lección activa para guardar'); return; }
    try {
      const contentId = `tutor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const res = await api.post('/tutor/materials', {
        content_id: contentId,
        title: `${mode === 'practice' ? 'Práctica' : 'Clase'}: ${script.topic} (${subject})`,
        topic: script.topic,
        subject,
        level,
        mode,
        context,
        script_json: script,
      });
      if (res.data?.ok) {
        toast.success('Lección guardada en biblioteca');
        loadLibrary();
      }
    } catch (err: any) {
      toast.error('Error al guardar la lección');
    }
  }, [script, mode, subject, level, context, loadLibrary]);

  const loadFromLibrary = useCallback(async (contentId: string) => {
    try {
      const res = await api.get(`/tutor/materials/${contentId}`);
      if (res.data?.ok && res.data?.material?.script_json) {
        const mat = res.data.material;
        setScript(mat.script_json);
        setSubject(mat.subject);
        setLevel(mat.level);
        setTopic(mat.topic);
        setContext(mat.context || '');
        setMode(mat.mode || 'guided');
        setCurrentPhaseIndex(0);
        setStudentInput('');
        setLastFeedback('');
        setLastScore(null);
        setActiveTab('runtime');
        toast.success(`Lección cargada: ${mat.title}`);
      }
    } catch (err: any) {
      toast.error('Error al cargar la lección');
    }
  }, []);

  const deleteMaterial = useCallback(async (contentId: string) => {
    try {
      await api.delete(`/tutor/materials/${contentId}`);
      setSavedMaterials(prev => prev.filter(m => m.content_id !== contentId));
      toast.success('Material eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar el material');
    }
  }, []);

  // Load library when panel opens on library tab
  useEffect(() => {
    if (showAITutorPanel && activeTab === 'library') {
      loadLibrary();
    }
  }, [showAITutorPanel, activeTab, loadLibrary]);

  return {
    // Panel state
    showAITutorPanel,
    setShowAITutorPanel,
    activeTab,
    setActiveTab,

    // Config
    subject, setSubject,
    topic, setTopic,
    level, setLevel,
    context, setContext,
    mode, setMode,

    // Lesson state
    script,
    currentPhaseIndex,
    isGenerating,

    // TTS
    isSpeaking,
    speakText,
    speakCurrentPhase,
    stopSpeech,

    // Student input
    isListening,
    studentInput,
    setStudentInput,
    startListening,
    stopListening,

    // Evaluation
    lastFeedback,
    lastScore,
    isEvaluating,
    evaluateAnswer,
    captureAndEvaluateBoard,

    // Board actions
    executeBoardActions,
    drawCurrentPhaseToBoard,
    clearBoardPhase,
    clearCurrentSlide,       // ✅ NUEVO: limpia todo el canvas de la slide activa

    // Slide conversion
    convertLessonToSlides,
    isConvertingSlides,
    lessonSlidesCreated,     // ✅ NUEVO: oculta botón tras primera creación

    // Navigation
    nextPhase,
    prevPhase,

    // Library
    savedMaterials,
    isLoadingLibrary,
    loadLibrary,
    saveToLibrary,
    loadFromLibrary,
    deleteMaterial,

    // Actions
    generateLesson,
    generatePractice,
  };
}
