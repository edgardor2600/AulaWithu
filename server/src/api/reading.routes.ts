import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { uploadSingle } from '../config/multer.config';


const router = Router();

// URL base del servidor de Python local
const AI_TUTOR_SERVER_URL = process.env.AI_TUTOR_SERVER_URL || 'http://localhost:8080';

/**
 * GET /api/reading/voices
 * Obtener la lista de voces disponibles en Edge TTS
 * Access: Authenticated users
 */
router.get(
  '/voices',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const targetUrl = `${AI_TUTOR_SERVER_URL}/api/voices`;
      logger.info(`Proxying GET /api/reading/voices -> ${targetUrl}`);

      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Python server returned status ${response.status}`);
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error: any) {
      logger.error(`Error in GET /api/reading/voices proxy: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'No se pudo conectar con el servidor de voces de Edge TTS. ¿Está encendido el backend local?',
        error: error.message,
      });
    }
  })
);

/**
 * POST /api/reading/ipa
 * Obtener la transcripción fonética IPA de un conjunto de textos
 * Access: Authenticated users
 */
router.post(
  '/ipa',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const { engine } = req.body;
      // Si el cliente solicita 'gruut' o 'local', usamos el endpoint local. Si es 'ai', usamos el basado en LLM.
      const useLocal = engine === 'gruut' || engine === 'local';
      const path = useLocal ? '/api/reading-ipa-local' : '/api/reading-ipa';
      const targetUrl = `${AI_TUTOR_SERVER_URL}${path}`;

      logger.info(`Proxying POST /api/reading/ipa -> ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Propagar el header de Gemini API Key si se envió desde el cliente
          'x-gemini-api-key': req.headers['x-gemini-api-key'] || '',
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python server (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error: any) {
      logger.error(`Error in POST /api/reading/ipa proxy: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al transcribir texto a IPA. Verifica que el servidor de Python esté corriendo.',
        error: error.message,
      });
    }
  })
);

/**
 * POST /api/reading/tts
 * Obtener streaming de audio TTS (Edge TTS)
 * Access: Authenticated users
 */
router.post(
  '/tts',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const targetUrl = `${AI_TUTOR_SERVER_URL}/api/tts-feedback`;
      logger.info(`Proxying POST /api/reading/tts -> ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python server (${response.status}): ${errorText}`);
      }

      // Configurar las cabeceras para streaming de audio MPEG
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Transfer-Encoding', 'chunked');

      // Leer la respuesta como stream y escribirla directamente en la respuesta de Express
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No se pudo obtener el lector de flujo del cuerpo de la respuesta.');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }

      res.end();
    } catch (error: any) {
      logger.error(`Error in POST /api/reading/tts proxy: ${error.message}`);
      // Si ya se enviaron los encabezados de respuesta, debemos terminar la conexión sin re-enviar status
      if (res.headersSent) {
        res.destroy();
      } else {
        res.status(500).json({
          success: false,
          message: 'Error al generar la síntesis de voz (TTS).',
          error: error.message,
        });
      }
    }
  })
);

/**
 * POST /api/reading/evaluate
 * Proxy para evaluar la pronunciación y fluidez del audio grabado contra la historia
 */
router.post(
  '/evaluate',
  authMiddleware,
  uploadSingle,
  asyncHandler(async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Audio file is required for evaluation' });
      }

      const { topic, level, question, expected_answer } = req.body;
      const targetUrl = `${AI_TUTOR_SERVER_URL}/api/evaluate`;
      logger.info(`Proxying POST /api/reading/evaluate -> ${targetUrl}`);

      // Construir FormData nativo de Node.js (v18+)
      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      const audioBlob = new Blob([fileBuffer], { type: req.file.mimetype || 'audio/webm' });

      const formData = new FormData();
      formData.append('audio', audioBlob, req.file.filename);

      if (topic) formData.append('topic', topic);
      if (level) formData.append('level', level);
      if (question) formData.append('question', question);
      if (expected_answer) formData.append('expected_answer', expected_answer);

      const pythonRes = await fetch(targetUrl, {
        method: 'POST',
        body: formData as any,
      });


      // Limpiar archivo temporal
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }

      if (!pythonRes.ok) {
        const errText = await pythonRes.text();
        throw new Error(`Python server returned ${pythonRes.status}: ${errText}`);
      }

      const data = await pythonRes.json();
      res.status(200).json(data);
    } catch (error: any) {
      logger.error(`Error in POST /api/reading/evaluate: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al evaluar la grabación de lectura',
        error: error.message,
      });
    }
  })
);

/**
 * POST /api/reading/attempts
 * Guardar intento de lectura en PostgreSQL
 */
router.post(
  '/attempts',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const { ReadingRepository } = await import('../db/repositories/reading-repository');
      const student_id = req.user?.userId || req.body.student_id;
      const attempt = await ReadingRepository.saveAttempt({
        session_id: req.body.session_id,
        student_id,
        story_title: req.body.story_title,
        story_text: req.body.story_text,
        wpm_setting: req.body.wpm_setting,
        overall_score: req.body.overall_score,
        pronunciation_score: req.body.pronunciation_score,
        feedback: req.body.feedback,
        audio_url: req.body.audio_url,
        words_alignment: req.body.words_alignment,
      });

      res.status(201).json({
        success: true,
        attempt,
        message: 'Intento de lectura guardado con éxito',
      });
    } catch (error: any) {
      logger.error(`Error saving reading attempt: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al guardar intento de lectura',
        error: error.message,
      });
    }
  })
);

/**
 * GET /api/reading/attempts/session/:sessionId
 * Obtener intentos de lectura para una sesión
 */
router.get(
  '/attempts/session/:sessionId',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const { ReadingRepository } = await import('../db/repositories/reading-repository');
      const attempts = await ReadingRepository.getAttemptsBySession(req.params.sessionId);
      res.status(200).json({
        success: true,
        attempts,
      });
    } catch (error: any) {
      logger.error(`Error fetching session reading attempts: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al recuperar intentos de la sesión',
        error: error.message,
      });
    }
  })
);

export default router;

