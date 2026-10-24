import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseSubtitles } from '../utils/subtitle-parser';
import { SubtitleAnalyzerService } from '../services/subtitle-analyzer.service';
import { QuizRepository } from '../db/repositories/quiz-repository';
import { logger } from '../utils/logger';

const router = Router();

// In-memory upload storage for subtitle files (up to 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * Helper to extract subtitle text from either a file upload or raw text in request body
 */
function extractSubtitleContent(req: Request): string {
  if (req.file && req.file.buffer) {
    return req.file.buffer.toString('utf-8');
  }
  if (req.body && typeof req.body.text === 'string') {
    return req.body.text;
  }
  return '';
}

/**
 * POST /api/subtitles/parse
 * Fast, local parsing of .srt or .vtt file to return cues, fullText, and stats.
 */
router.post('/parse', upload.single('file'), (req: Request, res: Response) => {
  try {
    const raw = extractSubtitleContent(req);
    if (!raw.trim()) {
      return res.status(400).json({ error: 'Debes proporcionar un archivo .srt/.vtt o enviar texto en el cuerpo.' });
    }

    const parsed = parseSubtitles(raw);
    return res.status(200).json(parsed);
  } catch (err: any) {
    logger.error(`[subtitles/parse] Error parsing subtitles: ${err.message}`);
    return res.status(500).json({ error: 'Error al procesar el archivo de subtítulos.' });
  }
});

/**
 * POST /api/subtitles/analyze
 * Parses subtitles and performs LLM extraction of vocabulary and quiz questions.
 */
router.post('/analyze', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const raw = extractSubtitleContent(req);
    if (!raw.trim()) {
      return res.status(400).json({ error: 'Debes proporcionar un archivo .srt/.vtt o enviar texto en el cuerpo.' });
    }

    const parsed = parseSubtitles(raw);
    if (parsed.cues.length === 0 && !parsed.fullText.trim()) {
      return res.status(400).json({ error: 'No se detectaron diálogos válidos en los subtítulos o texto proporcionado.' });
    }

    if (parsed.stats.totalWords < 10) {
      return res.status(400).json({
        error: 'El texto es muy breve (mínimo 10 palabras). Por favor agrega un diálogo o párrafo más completo para que la IA pueda extraer vocabulario y preguntas pedagógicas.',
      });
    }

    const textToAnalyze = parsed.fullText || raw;
    const analysis = await SubtitleAnalyzerService.analyze(textToAnalyze);

    return res.status(200).json({
      title: req.file?.originalname?.replace(/\.[^/.]+$/, '') || 'Subtitles Analysis',
      stats: parsed.stats,
      summary: analysis.summary || '',
      vocabulary: analysis.vocabulary,
      questions: analysis.questions,
    });
  } catch (err: any) {
    logger.error(`[subtitles/analyze] Error analyzing subtitles: ${err.message}`);
    return res.status(500).json({ error: err.message || 'Error al analizar los subtítulos con IA.' });
  }
});

/**
 * POST /api/subtitles/export-quiz
 * Saves analyzed questions as a permanent Quiz in the LMS database.
 */
router.post('/export-quiz', async (req: Request, res: Response) => {
  try {
    const { title, questions, level, topic } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Se requiere una lista de preguntas válida para exportar el quiz.' });
    }

    // Format questions into Quiz format
    const formattedQuestions = questions.map((q: any, idx: number) => ({
      id: q.id || idx + 1,
      type: 'multiple_choice',
      prompt: q.question,
      options: q.options,
      answer: q.correct_option_index,
      explanation: q.explanation || '',
      points: 10,
    }));

    const quiz = await QuizRepository.saveQuiz({
      title: title || 'Quiz de Subtítulos',
      subject: 'Inglés',
      level: level || 'Intermedio',
      topic: topic || 'Comprensión y Vocabulario de Subtítulos',
      questions_json: formattedQuestions,
    });

    return res.status(201).json({
      message: 'Quiz exportado con éxito a la biblioteca',
      quiz,
    });
  } catch (err: any) {
    logger.error(`[subtitles/export-quiz] Error exporting quiz: ${err.message}`);
    return res.status(500).json({ error: 'Error al guardar el quiz en la biblioteca.' });
  }
});

export default router;
