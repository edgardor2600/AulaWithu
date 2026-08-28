import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { MiniMaxService } from '../services/minimax.service';
import { TutorRepository } from '../db/repositories/tutor-repository';
import { safeParseJson, parseJsonWithLLMRepair } from '../utils/json-repair';

const router = Router();

// ─── Lesson Protocol Templates (migrated from tablero/*.txt legacy files) ─────

const ENGLISH_PROTOCOL = `You are an expert English tutor and curriculum designer.

Create a single lesson script as STRICT JSON only (no markdown, no comments) for:
- Topic: {{topic}}
- Level: {{level}}
- Real-world context: {{context}}

Output schema (exact keys, all required):
{
  "schema": "ai_tutor.lesson.v1",
  "topic": "...",
  "level": "...",
  "context": "...",
  "subject": "English",
  "phases": [
    {
      "phase": 0,
      "name": "Diagnosis",
      "objective": "One-sentence learning goal for this phase.",
      "tutor_says": "Full spoken explanation in SPANISH (180-220 words). Include: what the grammar/vocabulary concept is, when and why it is used in real English, how it is formed, and 2 concrete situational examples showing it in context. End with an activating question to engage the student.",
      "explanation_points": [
        "Concise key point #1 in Spanish (max 15 words)",
        "Concise key point #2",
        "Concise key point #3",
        "Concise key point #4",
        "Concise key point #5 (optional)",
        "Concise key point #6 (optional)"
      ],
      "examples": [
        { "english": "Full example sentence in English", "spanish_translation": "Traducción natural al español", "context_note": "Brief note on when/why this is used" },
        { "english": "Second example sentence", "spanish_translation": "Traducción", "context_note": "Context" },
        { "english": "Third example (optional)", "spanish_translation": "Traducción", "context_note": "Context" }
      ],
      "student_task": "Clear task instruction in SPANISH with specific instructions for what the student must do.",
      "key_structure": "STRUCTURE NAME:\n[+] Affirmative: Subject + verb_form + complement\n[-] Negative: Subject + aux + NOT + verb + complement\n[?] Question: Aux + Subject + verb + complement?\n\nKey notes or formula here",
      "expected_answer": "...",
      "evaluation_focus": ["grammar accuracy", "vocabulary", "fluency"],
      "board_actions": [
        {"action": "draw_text", "content": "..."},
        {"action": "draw_sketch", "template": "timeline|prepositions_box|comparison_bars|modal_spectrum|formula_box"}
      ],
      "image_prompt": "...",
      "exercises": []
    }
  ]
}

Rules:
- Must include exactly 6 phases in this fixed order:
  0 Diagnosis
  1 Engagement
  2 Grammar Explanation
  3 Error Handling
  4 Progressive Practice
  5 Memory Reinforcement
- tutor_says MUST be 180-220 words per phase. Write in SPANISH; keep English examples in English.
- explanation_points: 4-6 bullet points summarizing key concepts. Write in Spanish.
- examples: 2-3 real, natural English examples with Spanish translation and context note.
- MANDATORY for Phase 2 (Grammar Explanation): key_structure MUST show Affirmative, Negative, and Interrogative forms with full formula on separate lines. tutor_says must cover all three forms thoroughly.
- MANDATORY for Phase 4 (Progressive Practice): EXACTLY 6 exercises of progressive difficulty. Each exercise must have: "tutor_says", "student_task", "expected_answer", "example_answer" (DIFFERENT words than expected_answer), "answer_explanation", "image_prompt". Leave top-level "tutor_says", "student_task", "expected_answer" as empty strings for phase 4.
- Phase 3 (Error Handling): focus on the most common student mistake for this topic + correction strategy + correct vs incorrect examples.
- Phase 5 (Memory Reinforcement): include a memorable mnemonic or trick in tutor_says + final retention question.
- CRITICAL AUDIO RULE: tutor_says is READ ALOUD by TTS. NEVER say "look at the image", "mira la imagen", "observe el diagrama", "en el cuadro".
- Return valid JSON object only. No markdown, no comments, no code blocks.`;


const MATH_PROTOCOL = `You are an expert Mathematics tutor and curriculum designer.

Create a single lesson script as STRICT JSON only (no markdown, no comments) for:
- Topic: {{topic}}
- Level: {{level}}
- Real-world context: {{context}}

Output schema (exact keys, all required):
{
  "schema": "ai_tutor.lesson.v1",
  "topic": "...",
  "level": "...",
  "context": "...",
  "subject": "Mathematics",
  "phases": [
    {
      "phase": 0,
      "name": "Problem Context",
      "objective": "One-sentence learning goal for this phase.",
      "tutor_says": "Full explanation in SPANISH (180-220 words). Include: what the concept is, its real-world application, the intuition behind it, worked examples with step-by-step reasoning.",
      "explanation_points": [
        "Clave conceptual #1 (max 15 words)",
        "Clave conceptual #2",
        "Clave conceptual #3",
        "Clave conceptual #4"
      ],
      "examples": [
        { "english": "Example problem: ...", "spanish_translation": "Resolución paso a paso: ...", "context_note": "Nota: por qué este método" },
        { "english": "Second example", "spanish_translation": "Resolución", "context_note": "Nota" }
      ],
      "student_task": "Clear task in SPANISH with specific instructions.",
      "key_structure": "FORMULA / MÉTODO:\n[Formula here]\n\nPasos:\n1. ...\n2. ...\n3. ...",
      "expected_answer": "...",
      "evaluation_focus": ["procedimiento", "resultado", "justificación"],
      "board_actions": [
        {"action": "draw_text", "content": "..."},
        {"action": "draw_sketch", "template": "formula_box|graph|coordinate_system|diagram"}
      ],
      "image_prompt": "...",
      "exercises": []
    }
  ]
}

Rules:
- Must include exactly 5 phases:
  0. Problem Context
  1. Concept Exploration
  2. Formula & Method
  3. Common Pitfalls
  4. Mastery Practice
- tutor_says: 180-220 words in SPANISH; formulas stay in mathematical notation.
- explanation_points: 4-5 concise conceptual keys. In Spanish.
- examples: 2 worked examples with step-by-step solution in spanish_translation.
- Level: "beginner", "intermediate", or "advanced".
- MANDATORY for Phase 4 (Mastery Practice): EXACTLY 6 exercises. Each exercise must have "tutor_says", "student_task", "expected_answer", "example_answer", "answer_explanation" (COMPLETE step-by-step mathematical resolution), "image_prompt".
- CRITICAL AUDIO RULE: tutor_says is READ ALOUD by TTS. NEVER reference visuals directly.
- Return valid JSON object only. No markdown, no comments, no code blocks.`;

const GENERIC_PROTOCOL = `You are an expert tutor and curriculum designer for the subject: {{subject}}

Create a single lesson script as STRICT JSON only (no markdown, no comments) for:
- Topic: {{topic}}
- Level: {{level}}
- Real-world context: {{context}}
- Subject area: {{subject}}

Output schema (exact keys, all required):
{
  "schema": "ai_tutor.lesson.v1",
  "topic": "...",
  "level": "...",
  "context": "...",
  "subject": "{{subject}}",
  "phases": [
    {
      "phase": 0,
      "name": "Introduction",
      "objective": "One-sentence learning goal for this phase.",
      "tutor_says": "Full explanation in SPANISH (180-220 words). Include: what the concept is, its context/importance, how it works, and 2 concrete examples showing it applied.",
      "explanation_points": [
        "Punto clave #1 en español (max 15 palabras)",
        "Punto clave #2",
        "Punto clave #3",
        "Punto clave #4"
      ],
      "examples": [
        { "english": "Example or case study", "spanish_translation": "Explicación del ejemplo en español", "context_note": "Por qué este ejemplo es relevante" },
        { "english": "Second example", "spanish_translation": "Explicación", "context_note": "Contexto" }
      ],
      "student_task": "Clear task in SPANISH with specific instructions for what the student must produce.",
      "key_structure": "CONCEPTO CENTRAL:\n[Definición o fórmula]\n\nElementos clave:\n• ...",
      "expected_answer": "...",
      "evaluation_focus": ["comprensión", "aplicación", "análisis"],
      "board_actions": [
        {"action": "draw_text", "content": "..."},
        {"action": "draw_sketch", "template": "timeline|comparison_bars|formula_box|concept_map|flowchart"}
      ],
      "image_prompt": "...",
      "exercises": []
    }
  ]
}

Rules:
- Must include exactly 6 phases: 0 Introduction, 1 Engagement, 2 Core Concept, 3 Error Analysis, 4 Progressive Practice, 5 Review.
- tutor_says: 180-220 words in SPANISH. Include full explanations, context, and examples.
- explanation_points: 4-5 concise key points per phase. In Spanish.
- examples: 2-3 concrete examples with Spanish explanation and context note.
- MANDATORY for Phase 4 (Progressive Practice): EXACTLY 6 exercises with "tutor_says", "student_task", "expected_answer", "example_answer", "answer_explanation", "image_prompt".
- CRITICAL AUDIO RULE: tutor_says is READ ALOUD by TTS. NEVER reference visuals directly.
- Return valid JSON object only. No markdown, no comments, no code blocks.`;


const PRACTICE_PROTOCOL = `You are an expert tutor. Generate a set of {{count}} practice exercises as STRICT JSON for:
- Subject: {{subject}}
- Topic: {{topic}}
- Level: {{level}}

Output schema:
{
  "schema": "ai_tutor.practice.v1",
  "topic": "...",
  "subject": "...",
  "level": "...",
  "exercises": [
    {
      "id": 1,
      "tutor_says": "Brief instruction in SPANISH",
      "student_task": "The exact exercise the student must solve",
      "expected_answer": "The exact correct answer",
      "example_answer": "A similar solved example (different values/words)",
      "answer_explanation": "Short explanation in SPANISH of why the answer is correct"
    }
  ]
}

Rules:
- Generate EXACTLY {{count}} exercises. Progress from easy to hard.
- Write tutor_says and answer_explanation in SPANISH.
- If subject is English: student_task and expected_answer must be in ENGLISH.
- Return valid JSON object only.`;

// ─── Helper: Pick protocol and fill variables ─────────────────────────────────

function buildLessonPrompt(subject: string, topic: string, level: string, context: string): string {
  let template: string;
  const s = subject.toLowerCase();
  if (s.includes('english') || s.includes('inglés')) {
    template = ENGLISH_PROTOCOL;
  } else if (s.includes('math') || s.includes('matemát')) {
    template = MATH_PROTOCOL;
  } else {
    template = GENERIC_PROTOCOL;
  }
  return template
    .replace(/\{\{topic\}\}/g, topic)
    .replace(/\{\{level\}\}/g, level)
    .replace(/\{\{context\}\}/g, context || 'General classroom')
    .replace(/\{\{subject\}\}/g, subject);
}

function buildPracticePrompt(subject: string, topic: string, level: string, count: number): string {
  return PRACTICE_PROTOCOL
    .replace(/\{\{subject\}\}/g, subject)
    .replace(/\{\{topic\}\}/g, topic)
    .replace(/\{\{level\}\}/g, level)
    .replace(/\{\{count\}\}/g, String(count));
}



// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/tutor/generate-lesson
 * Generate a structured lesson script with MiniMax
 */
router.post(
  '/generate-lesson',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const { topic, level, subject, context, mode } = req.body;
    if (!topic || !level || !subject) {
      return res.status(400).json({ ok: false, message: 'topic, level and subject are required' });
    }
    try {
      const prompt = buildLessonPrompt(subject, topic, level, context || '');
      const { text, provider } = await MiniMaxService.generateCompletion(prompt, { temperature: 0.3, maxTokens: 12000 });

      const script = await parseJsonWithLLMRepair(text, p => MiniMaxService.generateCompletion(p, { temperature: 0.1 }));
      logger.info(`[tutor] Lesson generated via ${provider} for topic="${topic}" subject="${subject}"`);
      res.status(200).json({ ok: true, script, provider });
    } catch (err: any) {
      logger.error(`[tutor] Error in generate-lesson: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * POST /api/tutor/generate-practice
 * Generate quick practice exercises
 */
router.post(
  '/generate-practice',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const { topic, level, subject, count = 6 } = req.body;
    if (!topic || !level || !subject) {
      return res.status(400).json({ ok: false, message: 'topic, level and subject are required' });
    }
    try {
      const prompt = buildPracticePrompt(subject, topic, level, Math.max(1, Math.min(20, Number(count))));
      const { text, provider } = await MiniMaxService.generateCompletion(prompt, { temperature: 0.4, maxTokens: 4096 });
      const parsed = await parseJsonWithLLMRepair<any>(text, p => MiniMaxService.generateCompletion(p, { temperature: 0.1 }));
      logger.info(`[tutor] Practice generated via ${provider} for topic="${topic}"`);
      res.status(200).json({ ok: true, exercises: parsed.exercises || [], provider });
    } catch (err: any) {
      logger.error(`[tutor] Error in generate-practice: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * POST /api/tutor/evaluate-answer
 * Evaluate a student's text/voice answer for a phase
 */
router.post(
  '/evaluate-answer',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const { question, expected_answer, student_answer, subject, level } = req.body;
    if (!student_answer) {
      return res.status(400).json({ ok: false, message: 'student_answer is required' });
    }
    try {
      const prompt = `Eres un tutor experto en ${subject || 'inglés'} evaluando una respuesta de un estudiante nivel ${level || 'B1'}.

Pregunta/Tarea: ${question || '(sin especificar)'}
Respuesta esperada: ${expected_answer || '(flexible)'}
Respuesta del estudiante: "${student_answer}"

Evalúa la respuesta del estudiante. Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "score": 85,
  "is_correct": true,
  "feedback": "¡Muy bien! Tu respuesta es correcta. Recuerda que..."
}

- score: número entero de 0 a 100
- is_correct: true si la respuesta es correcta o casi correcta (>= 70 puntos)
- feedback: retroalimentación pedagógica breve en ESPAÑOL (máximo 60 palabras)
- Si el estudiante usa español cuando debería usar inglés, penaliza hasta 30 puntos

Devuelve solo el JSON, sin explicación extra.`;

      const { text, provider } = await MiniMaxService.generateCompletion(prompt, { temperature: 0.1, maxTokens: 1024 });
      const result = safeParseJson(text);
      logger.info(`[tutor] Answer evaluated via ${provider}, score=${result.score}`);
      res.status(200).json({ ok: true, ...result, provider });
    } catch (err: any) {
      logger.error(`[tutor] Error in evaluate-answer: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * POST /api/tutor/evaluate-board
 * Evaluate a base64 canvas screenshot for a lesson phase
 * NOTE: Screenshot is NOT stored — it's sent directly to the LLM for evaluation
 */
router.post(
  '/evaluate-board',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const { phase_description, board_image_base64 } = req.body;
    if (!board_image_base64) {
      return res.status(400).json({ ok: false, message: 'board_image_base64 is required' });
    }
    try {
      // MiniMax Text-01 accepts image data embedded in the prompt as base64
      const prompt = `Eres un tutor evaluador. La fase de la clase fue: "${phase_description || 'Ejercicio en pizarra'}".

El estudiante realizó trabajo en la pizarra. Analiza la imagen adjunta y evalúa el trabajo del estudiante.

Imagen de la pizarra (base64 PNG): data:image/png;base64,${board_image_base64}

Responde ÚNICAMENTE con un JSON válido:
{
  "score": 75,
  "feedback": "Tu trabajo muestra comprensión del concepto. Mejorar en..."
}

- score: 0-100
- feedback: retroalimentación pedagógica en ESPAÑOL (máximo 80 palabras)

Solo el JSON, sin texto adicional.`;

      const { text, provider } = await MiniMaxService.generateCompletion(prompt, { temperature: 0.1, maxTokens: 1024 });
      const result = safeParseJson(text);
      logger.info(`[tutor] Board evaluated via ${provider}, score=${result.score}`);
      res.status(200).json({ ok: true, ...result, provider });
    } catch (err: any) {
      logger.error(`[tutor] Error in evaluate-board: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * GET /api/tutor/materials
 * List all tutor materials from library
 */
router.get(
  '/materials',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const mode = req.query.mode as 'guided' | 'practice' | undefined;
      // P-14: Aceptar search, limit y offset — retro-compatible (sin parámetros = comportamiento anterior)
      const search = req.query.search as string | undefined;
      const limit = Math.min(200, parseInt(req.query.limit as string || '50', 10));
      const offset = parseInt(req.query.offset as string || '0', 10);
      const { materials, total } = await TutorRepository.getAllMaterials(mode, search, limit, offset);
      res.status(200).json({ ok: true, materials, total });
    } catch (err: any) {
      logger.error(`[tutor] Error in GET /materials: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * POST /api/tutor/materials
 * Save a lesson script to the library
 */
router.post(
  '/materials',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const data = req.body;
    if (!data || !data.script_json) {
      return res.status(400).json({ ok: false, message: 'script_json is required' });
    }
    try {
      // Attach created_by from authenticated user
      data.created_by = req.user?.email || req.user?.id || undefined;
      const material = await TutorRepository.saveMaterial(data);
      if (!material) throw new Error('Failed to save material');
      res.status(201).json({ ok: true, material });
    } catch (err: any) {
      logger.error(`[tutor] Error in POST /materials: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * GET /api/tutor/materials/:contentId
 * Get a specific material with full script_json
 */
router.get(
  '/materials/:contentId',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const material = await TutorRepository.getMaterialById(req.params.contentId);
      if (!material) return res.status(404).json({ ok: false, message: 'Material not found' });
      res.status(200).json({ ok: true, material });
    } catch (err: any) {
      logger.error(`[tutor] Error in GET /materials/:id: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * DELETE /api/tutor/materials/:contentId
 * Delete a material from the library
 */
router.delete(
  '/materials/:contentId',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const deleted = await TutorRepository.deleteMaterial(req.params.contentId);
      res.status(200).json({ ok: true, deleted });
    } catch (err: any) {
      logger.error(`[tutor] Error in DELETE /materials/:id: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * POST /api/tutor/evaluations
 * Save a student evaluation for a phase
 */
router.post(
  '/evaluations',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const { session_id, student_id, material_id, phase_index, score, feedback } = req.body;
    if (!session_id) {
      return res.status(400).json({ ok: false, message: 'session_id is required' });
    }
    try {
      await TutorRepository.saveEvaluation({
        session_id,
        student_id,
        material_id,
        phase_index: phase_index ?? 0,
        score: score ?? 0,
        feedback,
      });
      res.status(201).json({ ok: true });
    } catch (err: any) {
      logger.error(`[tutor] Error in POST /evaluations: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

export default router;
