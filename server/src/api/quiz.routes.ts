import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { MiniMaxService } from '../services/minimax.service';
import { QuizRepository } from '../db/repositories/quiz-repository';
import { parseJsonWithLLMRepair } from '../utils/json-repair';

const router = Router();

// ─── Quiz Protocol Template (migrated from tablero/quiz_generator.py) ─────────

const QUIZ_PROTOCOL_TEMPLATE = `You are an expert tutor and assessment designer for the subject: {{subject}}.

Create a QUIZ with exactly {{count}} questions about the topic: "{{topic}}" at level "{{level}}".

Generate the quiz as STRICT JSON matching the following schema. Return ONLY the JSON object, with no markdown codeblocks, no trailing text, and no explanation.

JSON Schema format:
{
  "activity_name": "Short, concise, professional title for the activity in SPANISH (3 to 7 words)",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "A instruction/question for the student",
      "sentence": "The main sentence or prompt text",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "correct": 0,
      "explanation": "A short encouraging explanation in SPANISH",
      "image_prompt": "Short prompt for an educational diagram or NONE"
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "A true/false statement",
      "sentence": "Sentence to evaluate",
      "options": ["True", "False"],
      "correct": 0,
      "explanation": "Explanation in SPANISH",
      "image_prompt": "NONE"
    },
    {
      "id": 3,
      "type": "fill_blank",
      "question": "Fill in the blank question",
      "sentence": "Sentence with EXACTLY ONE blank as '___'. If testing a verb include base verb in parentheses: 'She ___ (go) yesterday.'",
      "options": [],
      "correct": "went",
      "explanation": "Explanation in SPANISH",
      "image_prompt": "NONE"
    },
    {
      "id": 4,
      "type": "listening",
      "question": "Instruction in SPANISH (e.g. 'Escucha el audio y escribe lo que oyes:')",
      "sentence": "The exact full sentence to be read aloud as audio",
      "options": [],
      "correct": "The exact sentence string for dictation",
      "explanation": "Explanation in SPANISH",
      "image_prompt": "NONE"
    },
    {
      "id": 5,
      "type": "speaking",
      "question": "Instruction in SPANISH (e.g. 'Lee la siguiente oración en voz alta:')",
      "sentence": "The sentence the student must speak/read aloud",
      "options": [],
      "correct": "The exact sentence string",
      "explanation": "Explanation in SPANISH",
      "image_prompt": "NONE"
    }
  ]
}

CRITICAL RULES:
1. Generate EXACTLY {{count}} questions (ID 1 to {{count}}). Do NOT stop early.
2. Supported question types: {{allowed_types}}.
3. Difficulty progresses from easy (Q1) to challenging (last Q).
4. All 'explanation' and 'question' fields MUST be in SPANISH.
5. If subject is 'English', the exercise content ('sentence', 'options', 'correct' text) MUST be in ENGLISH.
6. The 'correct' field rules:
   - multiple_choice: 0-based integer index in 'options'
   - true_false: 0 (True) or 1 (False)
   - fill_blank: EXACT correct string (no parentheses, no base verbs)
   - listening (dictation, options empty): EXACT full correct sentence string
   - speaking: EXACT sentence string to read aloud
7. 'image_prompt' must state "NO TEXT, no words, no letters" or be exactly the string "NONE".
8. MANDATORY: Only generate types from the allowed list: {{allowed_types}}.
9. 'activity_name': 3-7 word professional title in SPANISH summarizing the topic.

Begin generation for:
- Subject: {{subject}}
- Topic: {{topic}}
- Level: {{level}}
- Count: {{count}}`;

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildQuizPrompt(
  subject: string,
  topic: string,
  level: string,
  count: number,
  questionTypes: string[]
): string {
  const allowedTypes = questionTypes.join(', ');
  return QUIZ_PROTOCOL_TEMPLATE
    .replace(/\{\{subject\}\}/g, subject)
    .replace(/\{\{topic\}\}/g, topic)
    .replace(/\{\{level\}\}/g, level)
    .replace(/\{\{count\}\}/g, String(count))
    .replace(/\{\{allowed_types\}\}/g, allowedTypes);
}



const VALID_QUESTION_TYPES = ['multiple_choice', 'true_false', 'fill_blank', 'listening', 'speaking', 'listening_extenso'];

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/quiz/generate
 * Generate quiz questions with MiniMax AI
 */
router.post(
  '/generate',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const {
      topic,
      subject = 'English',
      level = 'A2',
      count = 5,
      question_types,
    } = req.body;

    if (!topic) {
      return res.status(400).json({ ok: false, message: 'topic is required' });
    }

    // Validate and sanitize question types
    const allowedTypes: string[] = Array.isArray(question_types) && question_types.length > 0
      ? question_types.filter((t: string) => VALID_QUESTION_TYPES.includes(t))
      : ['multiple_choice', 'true_false', 'fill_blank'];

    if (allowedTypes.length === 0) {
      return res.status(400).json({ ok: false, message: 'No valid question types provided' });
    }

    const safeCount = Math.max(1, Math.min(30, Number(count)));

    try {
      const prompt = buildQuizPrompt(subject, topic, level, safeCount, allowedTypes);
      const { text, provider } = await MiniMaxService.generateCompletion(prompt, { temperature: 0.4, maxTokens: 4096 });
      const parsed = await parseJsonWithLLMRepair<any>(text, p => MiniMaxService.generateCompletion(p, { temperature: 0.1 }));

      logger.info(`[quiz] Generated ${parsed.questions?.length || 0} questions via ${provider} for topic="${topic}"`);

      res.status(200).json({
        ok: true,
        quiz: {
          activity_name: parsed.activity_name || `Quiz: ${topic}`,
          questions: parsed.questions || [],
        },
        provider,
      });
    } catch (err: any) {
      logger.error(`[quiz] Error in POST /generate: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * GET /api/quiz/materials
 * List all saved quizzes (summary — no questions_json)
 */
router.get(
  '/materials',
  authMiddleware,
  asyncHandler(async (_req: any, res: any) => {
    try {
      const quizzes = await QuizRepository.getAllQuizzes();
      res.status(200).json({ ok: true, quizzes });
    } catch (err: any) {
      logger.error(`[quiz] Error in GET /materials: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * POST /api/quiz/materials
 * Save a quiz to the library
 */
router.post(
  '/materials',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const { title, subject, level, topic, questions_json } = req.body;
    if (!title || !topic || !questions_json) {
      return res.status(400).json({ ok: false, message: 'title, topic and questions_json are required' });
    }
    try {
      const quiz = await QuizRepository.saveQuiz({
        title,
        subject: subject || 'English',
        level: level || 'A2',
        topic,
        questions_json,
        created_by: req.user?.email || req.user?.id || undefined,
      });
      if (!quiz) throw new Error('Failed to save quiz');
      res.status(201).json({ ok: true, quiz });
    } catch (err: any) {
      logger.error(`[quiz] Error in POST /materials: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * GET /api/quiz/materials/:id
 * Get a specific quiz with full questions_json
 */
router.get(
  '/materials/:id',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ ok: false, message: 'Invalid quiz id' });
      const quiz = await QuizRepository.getQuizById(id);
      if (!quiz) return res.status(404).json({ ok: false, message: 'Quiz not found' });
      res.status(200).json({ ok: true, quiz });
    } catch (err: any) {
      logger.error(`[quiz] Error in GET /materials/:id: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * DELETE /api/quiz/materials/:id
 * Delete a quiz from the library
 */
router.delete(
  '/materials/:id',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ ok: false, message: 'Invalid quiz id' });
      const deleted = await QuizRepository.deleteQuiz(id);
      res.status(200).json({ ok: true, deleted });
    } catch (err: any) {
      logger.error(`[quiz] Error in DELETE /materials/:id: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * POST /api/quiz/submit-result
 * Save a student's quiz result
 */
router.post(
  '/submit-result',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const { quiz_id, session_id, student_id, student_name, score, total_questions, answers_json } = req.body;
    if (!session_id || quiz_id == null) {
      return res.status(400).json({ ok: false, message: 'session_id and quiz_id are required' });
    }
    try {
      await QuizRepository.saveStudentResult({
        quiz_id: Number(quiz_id),
        session_id,
        student_id,
        student_name,
        score: score ?? 0,
        total_questions: total_questions ?? 0,
        answers_json: answers_json || [],
      });
      res.status(201).json({ ok: true });
    } catch (err: any) {
      logger.error(`[quiz] Error in POST /submit-result: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

/**
 * GET /api/quiz/results/:quizId/session/:sessionId
 * Get all student results for a quiz in a session
 */
router.get(
  '/results/:quizId/session/:sessionId',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const quizId = parseInt(req.params.quizId, 10);
      const { sessionId } = req.params;
      if (isNaN(quizId)) return res.status(400).json({ ok: false, message: 'Invalid quiz id' });
      const results = await QuizRepository.getResultsBySession(quizId, sessionId);
      res.status(200).json({ ok: true, results });
    } catch (err: any) {
      logger.error(`[quiz] Error in GET /results: ${err.message}`);
      res.status(500).json({ ok: false, message: err.message });
    }
  })
);

export default router;
