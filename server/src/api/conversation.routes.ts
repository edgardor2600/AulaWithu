import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const router = Router();
const AI_TUTOR_SERVER_URL = process.env.AI_TUTOR_SERVER_URL || 'http://localhost:8080';

/**
 * POST /api/conversation/completion
 * Proxy a la API de completion de IA
 */
router.post(
  '/completion',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const targetUrl = `${AI_TUTOR_SERVER_URL}/api/completion`;
      logger.info(`Proxying POST /api/conversation/completion -> ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      logger.error(`Error in POST /api/conversation/completion proxy: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al comunicarse con la IA. Verifica que el servidor de Python esté corriendo.',
        error: error.message,
      });
    }
  })
);

/**
 * GET /api/conversation/stories
 * Obtener todas las historias guardadas en la biblioteca
 */
router.get(
  '/stories',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const targetUrl = `${AI_TUTOR_SERVER_URL}/api/conversation-stories`;
      logger.info(`Proxying GET /api/conversation/stories -> ${targetUrl}`);

      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Python server returned status ${response.status}`);
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error: any) {
      logger.error(`Error in GET /api/conversation/stories proxy: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'No se pudo conectar con la base de datos de diálogos.',
        error: error.message,
      });
    }
  })
);

/**
 * POST /api/conversation/stories
 * Crear o actualizar una historia
 */
router.post(
  '/stories',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const targetUrl = `${AI_TUTOR_SERVER_URL}/api/conversation-stories`;
      logger.info(`Proxying POST /api/conversation/stories -> ${targetUrl}`);

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

      const data = await response.json();
      res.status(200).json(data);
    } catch (error: any) {
      logger.error(`Error in POST /api/conversation/stories proxy: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al guardar la historia en la biblioteca.',
        error: error.message,
      });
    }
  })
);

/**
 * DELETE /api/conversation/stories/:id
 * Eliminar una historia por ID
 */
router.delete(
  '/stories/:id',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const targetUrl = `${AI_TUTOR_SERVER_URL}/api/conversation-stories/${req.params.id}`;
      logger.info(`Proxying DELETE /api/conversation/stories/${req.params.id} -> ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python server (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error: any) {
      logger.error(`Error in DELETE /api/conversation/stories/${req.params.id} proxy: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la historia de la biblioteca.',
        error: error.message,
      });
    }
  })
);

/**
 * GET /api/conversation/tts
 * Proxy para sintetizar voz con el backend de Python (Edge TTS)
 */
router.get(
  '/tts',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const { text, voice } = req.query;
      if (!text) {
        return res.status(400).json({ success: false, message: 'El parámetro text es requerido' });
      }

      const targetUrl = `${AI_TUTOR_SERVER_URL}/api/tts-feedback`;
      logger.info(`Proxying GET /api/conversation/tts -> POST ${targetUrl} (voice: ${voice})`);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: voice || 'en-US-JennyNeural',
          rate: '+0%',
          pitch: '+0Hz',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python TTS server (${response.status}): ${errorText}`);
      }

      // Pipe the audio stream back to client
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error: any) {
      logger.error(`Error in GET /api/conversation/tts proxy: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al generar el audio de síntesis de voz.',
        error: error.message,
      });
    }
  })
);

/**
 * POST /api/conversation/generate-drawing-image
 * Proxy para la generación de imágenes de la IA
 */
router.post(
  '/generate-drawing-image',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const targetUrl = `${AI_TUTOR_SERVER_URL}/api/generate-drawing-image`;
      logger.info(`Proxying POST /api/conversation/generate-drawing-image -> ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      logger.error(`Error in POST /api/conversation/generate-drawing-image proxy: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al comunicarse con el generador de imágenes.',
        error: error.message,
      });
    }
  })
);

export default router;
