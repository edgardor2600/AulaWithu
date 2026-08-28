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

// ─── Helper: Build Rich Fabric JSON for Phase Slides ─────────────────

function buildPhaseFabricJson(phase: LessonPhase, subject: string, level: string): string {
  const objects: any[] = [];

  // ── Canvas geometry ───────────────────────────────────────────────────
  const LEFT   = 28;
  const TOP    = 18;
  const TOTAL_W = 904;

  // ── Dark premium palettes (one per phase) ────────────────────────────
  // Each palette defines only accent colors. Cards always use the same dark slate
  // background — only the accent bar color and labels change per phase.
  const PALETTES = [
    // Phase 1 — Cyan / Ocean
    { accent: '#22d3ee', accentDim: '#0e7490', pillBg: '#083344', pillText: '#67e8f9', headerBg: '#040d14', labelCol: '#22d3ee', exBorder: '#0e7490' },
    // Phase 2 — Violet / Indigo
    { accent: '#a78bfa', accentDim: '#6d28d9', pillBg: '#1e1040', pillText: '#c4b5fd', headerBg: '#0c0718', labelCol: '#a78bfa', exBorder: '#6d28d9' },
    // Phase 3 — Teal / Emerald
    { accent: '#34d399', accentDim: '#059669', pillBg: '#042f2a', pillText: '#6ee7b7', headerBg: '#020f0d', labelCol: '#34d399', exBorder: '#059669' },
    // Phase 4 — Rose / Pink
    { accent: '#fb7185', accentDim: '#be123c', pillBg: '#2d0a14', pillText: '#fda4af', headerBg: '#120309', labelCol: '#fb7185', exBorder: '#be123c' },
    // Phase 5 — Amber / Gold
    { accent: '#fbbf24', accentDim: '#b45309', pillBg: '#271a04', pillText: '#fde68a', headerBg: '#100a02', labelCol: '#fbbf24', exBorder: '#b45309' },
    // Phase 6 — Sky / Blue
    { accent: '#60a5fa', accentDim: '#1d4ed8', pillBg: '#0c1a3a', pillText: '#93c5fd', headerBg: '#04091a', labelCol: '#60a5fa', exBorder: '#1d4ed8' },
  ];
  const pal = PALETTES[phase.phase % PALETTES.length];

  // ── Shared token values ────────────────────────────────────────────
  const CARD_BG        = '#111827';  // gray-900
  const CARD_BORDER    = '#1f2937';  // gray-800
  const TEXT_PRIMARY   = '#f9fafb';  // white-ish
  const TEXT_SECONDARY = '#9ca3af';  // gray-400
  const TEXT_MUTED     = '#6b7280';  // gray-500
  const ACCENT_BAR_W   = 4;         // colored left stripe width

  // Lock helper — avoids repeating on every object
  const LOCK = {
    selectable: false, evented: false,
    lockMovementX: true, lockMovementY: true,
    lockRotation: true, lockScalingX: true, lockScalingY: true,
    hasControls: false,
  };

  // Card render helper: dark body + colored accent left bar
  const pushCard = (x: number, y: number, w: number, h: number, accentColor: string) => {
    objects.push({
      type: 'Rect', version: '6.0.0',
      left: x, top: y, width: w, height: h,
      fill: CARD_BG, stroke: CARD_BORDER, strokeWidth: 1.5,
      rx: 14, ry: 14, ...LOCK,
    });
    objects.push({
      type: 'Rect', version: '6.0.0',
      left: x, top: y + 14, width: ACCENT_BAR_W, height: h - 28,
      fill: accentColor, rx: 2, ry: 2, ...LOCK,
    });
  };

  // Section label helper
  const pushLabel = (x: number, y: number, icon: string, text: string, col: string) => {
    objects.push({
      type: 'IText', version: '6.0.0',
      left: x, top: y,
      text: `${icon}  ${text}`,
      fontSize: 10, fontWeight: 'bold', fill: col,
      fontFamily: 'Inter, Arial, sans-serif', ...LOCK,
    });
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 1. FULL CANVAS DARK BACKGROUND
  // ════════════════════════════════════════════════════════════════════════════
  objects.push({
    type: 'Rect', version: '6.0.0',
    left: 0, top: 0, width: 960, height: 560,
    fill: '#0a0f1a', rx: 0, ry: 0, ...LOCK,
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. HEADER BAR
  // ════════════════════════════════════════════════════════════════════════════
  const HDR_H = 72;

  // Header dark base
  objects.push({
    type: 'Rect', version: '6.0.0',
    left: LEFT, top: TOP, width: TOTAL_W, height: HDR_H,
    fill: pal.headerBg,
    stroke: pal.accent, strokeWidth: 1,
    rx: 16, ry: 16, ...LOCK,
  });
  // Accent glow line at the bottom of header
  objects.push({
    type: 'Rect', version: '6.0.0',
    left: LEFT, top: TOP + HDR_H - 3, width: TOTAL_W, height: 3,
    fill: pal.accent, rx: 0, ry: 0, opacity: 0.7, ...LOCK,
  });

  // Phase pill badge
  objects.push({
    type: 'Rect', version: '6.0.0',
    left: LEFT + 18, top: TOP + 23, width: 82, height: 26,
    fill: pal.pillBg, stroke: pal.accent, strokeWidth: 1,
    rx: 13, ry: 13, ...LOCK,
  });
  objects.push({
    type: 'IText', version: '6.0.0',
    left: LEFT + 29, top: TOP + 28,
    text: `FASE ${phase.phase + 1}`,
    fontSize: 11, fontWeight: 'bold', fill: pal.pillText,
    fontFamily: 'Inter, Arial, sans-serif', ...LOCK,
  });

  // Phase name (large white)
  objects.push({
    type: 'IText', version: '6.0.0',
    left: LEFT + 116, top: TOP + 13,
    text: phase.name.length > 44 ? phase.name.substring(0, 42) + '…' : phase.name,
    fontSize: 22, fontWeight: 'bold', fill: TEXT_PRIMARY,
    fontFamily: 'Inter, Arial, sans-serif', ...LOCK,
  });
  // Subject / level
  objects.push({
    type: 'IText', version: '6.0.0',
    left: LEFT + 116, top: TOP + 44,
    text: `${subject}  ·  Nivel ${level}`,
    fontSize: 12, fill: TEXT_SECONDARY,
    fontFamily: 'Inter, Arial, sans-serif', ...LOCK,
  });

  // Objective (right side)
  if (phase.objective) {
    const objTxt = phase.objective.length > 60
      ? phase.objective.substring(0, 58) + '…' : phase.objective;
    objects.push({
      type: 'IText', version: '6.0.0',
      left: LEFT + TOTAL_W - 330, top: TOP + 28,
      text: `🎯  ${objTxt}`,
      fontSize: 11, fill: TEXT_MUTED, fontStyle: 'italic',
      fontFamily: 'Inter, Arial, sans-serif', ...LOCK,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. 2x2 CARD GRID
  // ════════════════════════════════════════════════════════════════════════════
  const GAP   = 16;
  const COL_W = (TOTAL_W - GAP) / 2;  // ≈ 444px
  const COL1_X = LEFT;
  const COL2_X = LEFT + COL_W + GAP;
  const ROW1_Y = TOP + HDR_H + 14;
  const ROW1_H = 212;
  const ROW2_Y = ROW1_Y + ROW1_H + 12;
  const ROW2_H = 218;

  // ─── CARD 1 (top-left): Key Structure / Concept ─────────────────────
  pushCard(COL1_X, ROW1_Y, COL_W, ROW1_H, pal.accent);
  pushLabel(COL1_X + 18, ROW1_Y + 14, '⚡', 'ESTRUCTURA / CONCEPTO CLAVE', pal.labelCol);

  const structSrc = (phase.key_structure && phase.key_structure.trim())
    ? phase.key_structure.trim()
    : (phase.tutor_says ? phase.tutor_says.substring(0, 200) : 'Estructura no especificada');
  const structWrapped = wrapText(structSrc, 38).split('\n').slice(0, 8).join('\n');
  objects.push({
    type: 'IText', version: '6.0.0',
    left: COL1_X + 18, top: ROW1_Y + 36,
    text: structWrapped,
    fontSize: 13, fill: TEXT_PRIMARY,
    fontFamily: 'Inter, Arial, sans-serif', lineHeight: 1.55, ...LOCK,
  });

  // ─── CARD 2 (bottom-left): Practical Examples ─────────────────────
  pushCard(COL1_X, ROW2_Y, COL_W, ROW2_H, pal.accentDim);
  pushLabel(COL1_X + 18, ROW2_Y + 14, '💡', 'EJEMPLOS PRÁCTICOS', '#60a5fa');

  const rawExamples = (phase as any).examples || [];
  if (rawExamples.length > 0) {
    let exY = ROW2_Y + 38;
    for (let i = 0; i < Math.min(2, rawExamples.length); i++) {
      const ex = rawExamples[i];
      const hasNote = !!ex.context_note;
      const exH = hasNote ? 76 : 62;
      // Guard: stop if we'd overflow the card
      if (exY + exH > ROW2_Y + ROW2_H - 8) break;

      objects.push({
        type: 'Rect', version: '6.0.0',
        left: COL1_X + 14, top: exY,
        width: COL_W - 28, height: exH,
        fill: '#1c2433', stroke: pal.exBorder, strokeWidth: 1,
        rx: 10, ry: 10, ...LOCK,
      });
      const mainTxt = ex.english || ex.text || '';
      if (mainTxt) {
        objects.push({
          type: 'IText', version: '6.0.0',
          left: COL1_X + 24, top: exY + 8,
          text: wrapText(mainTxt, 40).split('\n').slice(0, 2).join('\n'),
          fontSize: 12, fontWeight: 'bold', fill: '#93c5fd',
          fontFamily: 'Inter, Arial, sans-serif', ...LOCK,
        });
      }
      if (ex.spanish_translation) {
        objects.push({
          type: 'IText', version: '6.0.0',
          left: COL1_X + 24, top: exY + 31,
          text: `→  ${String(ex.spanish_translation).substring(0, 52)}`,
          fontSize: 11, fill: TEXT_SECONDARY, fontStyle: 'italic',
          fontFamily: 'Inter, Arial, sans-serif', ...LOCK,
        });
      }
      if (hasNote) {
        objects.push({
          type: 'IText', version: '6.0.0',
          left: COL1_X + 24, top: exY + 51,
          text: `📌  ${String(ex.context_note).substring(0, 50)}`,
          fontSize: 10, fill: TEXT_MUTED,
          fontFamily: 'Inter, Arial, sans-serif', ...LOCK,
        });
      }
      exY += exH + 8;
    }
  } else {
    const fallback = wrapText(
      phase.tutor_says ? phase.tutor_says.substring(0, 220) : 'Escucha la explicación guiada del tutor para esta fase.',
      39
    ).split('\n').slice(0, 7).join('\n');
    objects.push({
      type: 'IText', version: '6.0.0',
      left: COL1_X + 18, top: ROW2_Y + 40,
      text: fallback,
      fontSize: 12, fill: TEXT_SECONDARY,
      fontFamily: 'Inter, Arial, sans-serif', lineHeight: 1.55, ...LOCK,
    });
  }

  // ─── CARD 3 (top-right): Key Points / Insights ─────────────────────
  pushCard(COL2_X, ROW1_Y, COL_W, ROW1_H, pal.accent);
  pushLabel(COL2_X + 18, ROW1_Y + 14, '📋', 'PUNTOS CLAVE', pal.labelCol);

  const rawPoints: string[] = (phase as any).explanation_points || [];
  if (rawPoints.length > 0) {
    let ptY = ROW1_Y + 38;
    for (let i = 0; i < Math.min(4, rawPoints.length); i++) {
      if (ptY > ROW1_Y + ROW1_H - 24) break;
      const ptLine = wrapText(rawPoints[i], 36).split('\n').slice(0, 2).join('\n');
      objects.push({
        type: 'IText', version: '6.0.0',
        left: COL2_X + 18, top: ptY,
        text: `▸  ${ptLine}`,
        fontSize: 12, fill: TEXT_PRIMARY,
        fontFamily: 'Inter, Arial, sans-serif', lineHeight: 1.45, ...LOCK,
      });
      ptY += ptLine.split('\n').length > 1 ? 40 : 26;
    }
  } else {
    const excerpt = wrapText(
      phase.tutor_says ? phase.tutor_says.substring(0, 200) : '',
      38
    ).split('\n').slice(0, 7).join('\n');
    objects.push({
      type: 'IText', version: '6.0.0',
      left: COL2_X + 18, top: ROW1_Y + 38,
      text: excerpt,
      fontSize: 12, fill: TEXT_SECONDARY,
      fontFamily: 'Inter, Arial, sans-serif', lineHeight: 1.5, ...LOCK,
    });
  }

  // ─── CARD 4 (bottom-right): Student Task ─────────────────────────
  pushCard(COL2_X, ROW2_Y, COL_W, ROW2_H, '#10b981'); // always emerald for task card
  pushLabel(COL2_X + 18, ROW2_Y + 14, '📝', 'TAREA DEL ESTUDIANTE', '#34d399');

  const taskSrc = (phase.student_task && phase.student_task.trim())
    ? phase.student_task.trim()
    : 'Responde usando el micrófono o escribe tu respuesta en el panel del AI Tutor.';
  const taskWrapped = wrapText(taskSrc, 38).split('\n').slice(0, 6).join('\n');
  objects.push({
    type: 'IText', version: '6.0.0',
    left: COL2_X + 18, top: ROW2_Y + 38,
    text: taskWrapped,
    fontSize: 13, fontWeight: 'bold', fill: '#d1fae5',
    fontFamily: 'Inter, Arial, sans-serif', lineHeight: 1.55, ...LOCK,
  });
  // Action hint at the bottom of task card
  objects.push({
    type: 'IText', version: '6.0.0',
    left: COL2_X + 18, top: ROW2_Y + ROW2_H - 28,
    text: '💬  Responde en el panel del AI Tutor →',
    fontSize: 10, fill: '#6ee7b7', fontStyle: 'italic',
    fontFamily: 'Inter, Arial, sans-serif', ...LOCK,
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. FOOTER — thin separator + instruction text
  // ════════════════════════════════════════════════════════════════════════════
  const footerY = ROW2_Y + ROW2_H + 10;
  objects.push({
    type: 'Rect', version: '6.0.0',
    left: LEFT, top: footerY, width: TOTAL_W, height: 1,
    fill: '#1f2937', ...LOCK,
  });
  objects.push({
    type: 'IText', version: '6.0.0',
    left: LEFT + 4, top: footerY + 8,
    text: '🎙️  Presiona "Escuchar" en el panel lateral para reproducir la explicación guiada por voz IA',
    fontSize: 10, fill: '#6b7280', fontStyle: 'italic',
    fontFamily: 'Inter, Arial, sans-serif', ...LOCK,
  });

  // ── aiTutorData metadata (used by the panel at runtime) ──────────────────
  const aiTutorData = {
    phase: phase.phase,
    name: phase.name,
    objective: phase.objective,
    tutor_says: phase.tutor_says,
    student_task: phase.student_task,
    key_structure: phase.key_structure,
    exercises: phase.exercises,
    explanation_points: (phase as any).explanation_points,
    examples: (phase as any).examples,
    common_error: (phase as any).common_error,
    subject,
    level,
  };

  return JSON.stringify({ version: '6.0.0', objects, aiTutorData });
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

export interface ActiveSlidePhaseData {
  phase?: number;
  name?: string;
  objective?: string;
  tutor_says?: string;
  student_task?: string;
  key_structure?: string;
  exercises?: PracticeExercise[];
  explanation_points?: string[];
  examples?: Array<{ english?: string; text?: string; spanish_translation?: string; context_note?: string }>;
  common_error?: string;
  subject?: string;
  level?: string;
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
  // P-02: Persiste entre remounts para evitar recrear slides duplicadas
  lessonSlidesCreated: boolean;
}

const tutorStateCache: Record<string, PersistentTutorState> = {};

function loadPersistedTutorState(cacheKey: string): Partial<PersistentTutorState> | null {
  try {
    const raw = localStorage.getItem(`aiTutor_state_${cacheKey}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[useAITutor] Failed to load persisted state from localStorage', e);
  }
  return null;
}

function savePersistedTutorState(cacheKey: string, state: PersistentTutorState) {
  try {
    localStorage.setItem(`aiTutor_state_${cacheKey}`, JSON.stringify(state));
  } catch (e) {
    console.warn('[useAITutor] Failed to save state to localStorage', e);
  }
}

export interface UseAITutorOptions {
  canvasOrGetter?: fabric.Canvas | null | (() => fabric.Canvas | null);
  saveHistory?: () => void;
  classId?: string | null;
  topicId?: string | null;
  currentSlideIndex?: number;
  onSlideChange?: (index: number) => void;
  onReloadSlides?: () => Promise<void>;
  totalSlides?: number;
  currentSlideInitialData?: string | null;
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
  let currentSlideInitialData: string | null | undefined = undefined;

  if (canvasOrGetterOrOptions && typeof canvasOrGetterOrOptions === 'object' && !('renderAll' in canvasOrGetterOrOptions)) {
    const opts = canvasOrGetterOrOptions as UseAITutorOptions;
    canvasOrGetter = opts.canvasOrGetter ?? null;
    saveHistory = opts.saveHistory ?? (() => {});
    classId = opts.classId ?? null;
    topicId = opts.topicId ?? null;
    currentSlideIndex = opts.currentSlideIndex;
    onSlideChange = opts.onSlideChange;
    onReloadSlides = opts.onReloadSlides;
    totalSlides = opts.totalSlides;
    currentSlideInitialData = opts.currentSlideInitialData;
  } else {
    canvasOrGetter = canvasOrGetterOrOptions as any;
    saveHistory = legacySaveHistory ?? (() => {});
  }

  const cacheKey = classId ? `class_${classId}${topicId ? `_topic_${topicId}` : ''}` : 'default_tutor_session';
  const initialCache = tutorStateCache[cacheKey] || loadPersistedTutorState(cacheKey);

  // Panel visibility
  const [showAITutorPanel, setShowAITutorPanelRaw] = useState<boolean>(initialCache?.showAITutorPanel ?? false);
  const [activeTab, setActiveTabRaw] = useState<'generator' | 'library' | 'runtime'>(initialCache?.activeTab ?? (initialCache?.script ? 'runtime' : 'generator'));

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
  // P-02: Inicializar desde cache para sobrevivir remounts de slide
  const [lessonSlidesCreated, setLessonSlidesCreatedRaw] = useState<boolean>(
    initialCache?.lessonSlidesCreated ?? false
  );

  // Active slide phase metadata from current slide (persists directly in canvas JSON)
  const [activeSlidePhaseData, setActiveSlidePhaseData] = useState<ActiveSlidePhaseData | null>(null);

  // Parse slide metadata whenever currentSlideInitialData changes
  useEffect(() => {
    if (!currentSlideInitialData || !currentSlideInitialData.trim() || currentSlideInitialData === '{}' || currentSlideInitialData === 'null') {
      setActiveSlidePhaseData(null);
      return;
    }
    try {
      const parsed = typeof currentSlideInitialData === 'string' ? JSON.parse(currentSlideInitialData) : currentSlideInitialData;
      if (parsed?.aiTutorData) {
        setActiveSlidePhaseData(parsed.aiTutorData);
        if (parsed.aiTutorData.subject) setSubjectRaw(parsed.aiTutorData.subject);
        if (parsed.aiTutorData.level) setLevelRaw(parsed.aiTutorData.level);
      } else {
        let phaseTitle = '';
        if (Array.isArray(parsed?.objects)) {
          for (const o of parsed.objects) {
            if (o.text && (o.text.startsWith('Fase ') || o.text.startsWith('Phase '))) {
              phaseTitle = o.text;
              break;
            }
          }
        }
        if (phaseTitle) {
          setActiveSlidePhaseData({ name: phaseTitle });
        } else {
          setActiveSlidePhaseData(null);
        }
      }
    } catch (_) {
      setActiveSlidePhaseData(null);
    }
  }, [currentSlideInitialData]);

  // Helper to persist state updates in module cache and localStorage
  const updateCache = useCallback((updater: Partial<PersistentTutorState>) => {
    const nextState: PersistentTutorState = {
      script: tutorStateCache[cacheKey]?.script ?? null,
      showAITutorPanel: tutorStateCache[cacheKey]?.showAITutorPanel ?? false,
      activeTab: tutorStateCache[cacheKey]?.activeTab ?? 'generator',
      subject: tutorStateCache[cacheKey]?.subject ?? 'English',
      topic: tutorStateCache[cacheKey]?.topic ?? '',
      level: tutorStateCache[cacheKey]?.level ?? 'B1',
      mode: tutorStateCache[cacheKey]?.mode ?? 'guided',
      context: tutorStateCache[cacheKey]?.context ?? '',
      // P-02: campo nuevo con default retrocompatible
      lessonSlidesCreated: tutorStateCache[cacheKey]?.lessonSlidesCreated ?? false,
      ...updater,
    };
    tutorStateCache[cacheKey] = nextState;
    savePersistedTutorState(cacheKey, nextState);
  }, [cacheKey]);

  // P-02: Setter persistente para lessonSlidesCreated (igual patrón que los otros setters)
  const setLessonSlidesCreated = useCallback((val: boolean) => {
    setLessonSlidesCreatedRaw(val);
    updateCache({ lessonSlidesCreated: val });
  }, [updateCache]);

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
  // P-13: Estado intermedio mientras el servidor procesa el TTS (antes de que empiece la reproducción)
  // Cierra la ventana silent de 3-6 segundos donde el usuario no sabe si funcionó el botón.
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  // P-04: Refs persistentes — el AudioContext se reutiliza para evitar el límite del navegador (~6 por página)
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

  // Helper to extract dialogue text from canvas objects if no metadata
  const getTutorSaysFromCanvas = useCallback((): string => {
    const cv = getCanvas();
    if (!cv) return '';
    const objects = cv.getObjects();
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i] as any;
      const text = (obj.text || '').trim();
      if (text.includes('Explicación del tutor') || text.includes('Tutor dice')) {
        for (let j = i + 1; j < objects.length; j++) {
          const nextObj = objects[j] as any;
          const nextText = (nextObj.text || '').trim();
          if (nextText && !nextText.startsWith('📋') && !nextText.startsWith('💡') && !nextText.startsWith('📝') && !nextText.startsWith('⚡')) {
            return nextText;
          }
        }
      }
    }
    return '';
  }, [getCanvas]);

  // ─── TTS — Reutiliza /api/conversation/tts ──────────────────────────────────

  const stopSpeech = useCallback(() => {
    try {
      audioSourceRef.current?.stop();
    } catch (_) {}
    // P-04: Limpiar solo la fuente — el AudioContext se reutiliza
    audioSourceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(async (text: string, voice?: string) => {
    if (!text?.trim()) return;
    stopSpeech();
    // P-13: Feedback inmediato — el botón cambia antes de que empiece la petición al servidor
    setIsLoadingAudio(true);
    try {
      const response = await api.get('/conversation/tts', {
        params: {
          text: text.trim(),
          voice: voice || (subject.toLowerCase().includes('english') ? 'English_magnetic_man' : 'female-shaonv'),
          speed: 1.0,
        },
        responseType: 'arraybuffer',
      });
      setIsLoadingAudio(false);
      setIsSpeaking(true);

      // P-04: Reutilizar el AudioContext existente en lugar de crear uno nuevo por cada llamada.
      // Chrome tiene un límite de ~6 AudioContexts por página — sin este fix se agota en sesiones largas.
      let ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new AudioContext();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === 'suspended') await ctx.resume();

      const decoded = await ctx.decodeAudioData(response.data as ArrayBuffer);
      // AudioBufferSourceNode no es reutilizable — crear uno nuevo para cada reproducción (es correcto)
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      audioSourceRef.current = source;
      source.start();
    } catch (err: any) {
      console.error('[useAITutor] TTS error:', err);
      toast.error('Error al reproducir audio del tutor');
      setIsLoadingAudio(false);
      setIsSpeaking(false);
    }
  }, [stopSpeech, subject]);

  const speakCurrentPhase = useCallback(async () => {
    const phase = script?.phases[currentPhaseIndex];
    const tutorText = phase?.tutor_says || activeSlidePhaseData?.tutor_says || getTutorSaysFromCanvas();
    if (tutorText && tutorText.trim()) {
      await speakText(tutorText);
    } else {
      toast('No hay diálogo para esta diapositiva');
    }
  }, [script, currentPhaseIndex, activeSlidePhaseData, getTutorSaysFromCanvas, speakText]);

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
   * Draws the specified phase content onto the whiteboard canvas cleanly using the professional slide design
   */
  const drawCurrentPhaseToBoard = useCallback(async (targetPhaseIndex?: number) => {
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

    try {
      const jsonStr = buildPhaseFabricJson(currentPhase, subject, level);
      const parsed = JSON.parse(jsonStr);
      if (parsed.objects && parsed.objects.length > 0) {
        const enlivened = await fabric.util.enlivenObjects(parsed.objects);
        enlivened.forEach((obj: any) => {
          (obj as any).isLocalOwned = true;
          (obj as any).isAITutorPhase = true;
          cv.add(obj);
        });
        cv.renderAll();
        saveHistory();
        toast.success(`Fase ${currentPhase.phase + 1} dibujada en la pizarra`);
      }
    } catch (err: any) {
      console.error('[useAITutor] drawCurrentPhaseToBoard error:', err);
      toast.error('Error al dibujar fase');
    }
  }, [getCanvas, script, currentPhaseIndex, subject, level, saveHistory]);

  // ─── [P-10] Shared helper: create slides from a lesson script ─────────────
  //
  // This replaces the duplicated inline block that existed in both
  // generateLesson and convertLessonToSlides. Single source of truth.
  // isGenerating remains true throughout so no double-click is possible (P-09).

  const _createSlidesForScript = useCallback(async (
    phases: LessonPhase[],
    cId: string,
    tId: string | null | undefined,
    reload: (() => Promise<void>) | undefined,
  ) => {
    toast('Creando diapositivas de la lección...');
    for (const p of phases) {
      const newSlide = await slideService.create(cId, {
        title: `Fase ${p.phase + 1}: ${p.name}`,
        topic_id: tId || undefined,
      });
      const canvasData = buildPhaseFabricJson(p, subject, level);
      await slideService.updateCanvas(newSlide.id, canvasData);
    }

    // Fijar panel en cache ANTES del reload silencioso
    updateCache({ showAITutorPanel: true, activeTab: 'runtime' });
    setShowAITutorPanel(true);
    setActiveTab('runtime');
    setCurrentPhaseIndex(0);
    setLessonSlidesCreated(true);

    // P-11: índice de la PRIMERA slide nueva = cantidad de slides ANTES de crear
    // totalSlides se pasa desde CanvasEditor y refleja el estado antes del reload
    const firstNewIndex = typeof totalSlides === 'number' ? totalSlides : 0;

    if (reload) await reload();
    if (onSlideChange) onSlideChange(firstNewIndex);

    toast.success(`¡${phases.length} diapositivas creadas con éxito!`);
  }, [subject, level, totalSlides, updateCache, setShowAITutorPanel, setActiveTab, setLessonSlidesCreated, onSlideChange]);

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
      await _createSlidesForScript(script.phases, cId, tId, reload);
    } catch (err: any) {
      console.error('[useAITutor] convertLessonToSlides error:', err);
      toast.error('Error al crear diapositivas: ' + (err.message || err));
    } finally {
      setIsConvertingSlides(false);
    }
  }, [script, classId, topicId, onReloadSlides, _createSlidesForScript]);

  // ─── Generate Lesson ──────────────────────────────────────────────────────

  const generateLesson = useCallback(async () => {
    if (!topic.trim()) { toast.error('Ingresa el tema de la lección'); return; }
    // P-09: isGenerating cubre TODA la operación (generación + creación de slides)
    // No hay ventana de doble-click entre el toast de éxito y la creación.
    setIsGenerating(true);
    setScript(null);
    setLastFeedback('');
    setLastScore(null);
    setLessonSlidesCreated(false);
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

        // P-10: Reutilizar el helper compartido en lugar del bloque duplicado
        if (classId && genScript.phases?.length > 0) {
          try {
            await _createSlidesForScript(genScript.phases, classId, topicId, onReloadSlides);
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
      // P-09: Solo liberar el bloqueo cuando TODO ha terminado
      setIsGenerating(false);
    }
  }, [topic, level, subject, context, mode, classId, topicId, onReloadSlides, setActiveTab, _createSlidesForScript]);

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

  // ─── Evaluate Answer (P-05: persiste en BD de forma fire-and-forget) ────────

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

        // P-05: Persistir en BD — fire-and-forget, no bloquea el UI
        const sessionKey = classId
          ? `class_${classId}_phase_${currentPhaseIndex}`
          : `standalone_${Date.now()}`;
        api.post('/tutor/evaluations', {
          session_id: sessionKey,
          phase_index: currentPhaseIndex,
          score: res.data.score,
          feedback: res.data.feedback,
        }).catch((err: any) => {
          // Error silencioso — el alumno ya vio su score, eso es lo importante
          console.warn('[useAITutor] Could not persist evaluation:', err?.message);
        });
      }
    } catch (err: any) {
      toast.error('Error al evaluar la respuesta');
    } finally {
      setIsEvaluating(false);
    }
  }, [script, currentPhaseIndex, subject, level, classId]);

  // ─── Evaluate Board (P-01 + P-12 fix) ───────────────────────────────────────
  // NOTA: El modelo MiniMax-Text-01 es puramente textual y no puede interpretar imágenes.
  // En lugar de enviar base64 (que el LLM ignora), extraemos el TEXTO real de los objetos
  // del canvas y lo enviamos a evaluate-answer, que sí funciona correctamente.
  // Esta solución es 100% funcional con el modelo actual y no requiere un modelo de visión.
  // Cuando se disponga de MiniMax-VL-01 (visión), se puede restaurar la lógica base64.

  const captureAndEvaluateBoard = useCallback(async () => {
    const cv = getCanvas();
    if (!cv) { toast.error('Canvas no disponible'); return; }

    // P-01: Extraer contenido textual real del canvas en lugar de imagen base64
    const canvasObjects = cv.getObjects() as any[];
    const canvasTextContent = canvasObjects
      .filter(obj => obj.text && typeof obj.text === 'string' && obj.text.trim().length > 0)
      // Excluir etiquetas estructurales del layout (los títulos de sección del template)
      .filter(obj => !['⚡ ESTRUCTURA / CONCEPTO CLAVE', '💡 EJEMPLOS PRÁCTICOS', '📋 PUNTOS CLAVE', '📝 TAREA DEL ESTUDIANTE'].includes(obj.text?.trim()))
      .map(obj => obj.text.trim())
      .join('\n');

    if (!canvasTextContent.trim()) {
      toast.error('La pizarra no tiene texto — escribe tu respuesta en la pizarra para evaluarla');
      return;
    }

    // P-12: Usar activeSlidePhaseData como fallback si no hay script activo
    const phase = script?.phases[currentPhaseIndex] ?? activeSlidePhaseData;

    setIsEvaluating(true);
    try {
      // Reutilizamos evaluate-answer que sí funciona con el modelo de texto
      const res = await api.post('/tutor/evaluate-answer', {
        question: phase?.student_task || phase?.objective || 'Ejercicio libre en pizarra',
        expected_answer: (phase as any)?.expected_answer || '',
        student_answer: canvasTextContent,
        subject,
        level,
      });
      if (res.data?.ok) {
        setLastScore(res.data.score);
        setLastFeedback(res.data.feedback);
        toast.success(`Pizarra evaluada: ${res.data.score}/100`);
      }
    } catch (err: any) {
      console.error('[useAITutor] captureAndEvaluateBoard error:', err);
      toast.error('Error al evaluar la pizarra');
    } finally {
      setIsEvaluating(false);
    }
  }, [getCanvas, script, currentPhaseIndex, activeSlidePhaseData, subject, level]);

  // ─── Library ──────────────────────────────────────────────────────────────

  // P-14: loadLibrary acepta búsqueda opcional — retro-compatible (sin argumento = listar todo)
  const loadLibrary = useCallback(async (search?: string) => {
    setIsLoadingLibrary(true);
    try {
      const res = await api.get('/tutor/materials', {
        params: search?.trim() ? { search: search.trim() } : {},
      });
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

  // P-04: Cleanup del AudioContext al desmontar el componente
  // Evita memory leaks y libera el recurso del sistema operativo
  useEffect(() => {
    return () => {
      try { audioSourceRef.current?.stop(); } catch (_) {}
      try { audioCtxRef.current?.close(); } catch (_) {}
      audioSourceRef.current = null;
      audioCtxRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al unmount — las refs no son dependencias reactivas

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
    // P-13: isLoadingAudio exportado — true durante la espera del TTS antes de que empiece el audio
    isLoadingAudio,

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
    lessonSlidesCreated,     // P-02: persiste entre remounts via PersistentTutorState

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

    // Active Slide AI Tutor Metadata (persisted across sessions)
    activeSlidePhaseData,
    hasTutorData: Boolean(script || activeSlidePhaseData),
  };
}
