import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { MiniMaxService } from '../services/minimax.service';
import { ConversationRepository } from '../db/repositories/conversation-repository';

const router = Router();

// In-memory queues for remote agent coordination
interface AgentCommand {
  id: string;
  command: string;
  payload?: any;
  timestamp: number;
}
let agentCommandsQueue: AgentCommand[] = [];
let currentAgentStatus = { status: 'idle', message: '', timestamp: Date.now() };

/**
 * POST /api/conversation/completion
 * Generación de diálogos e historias con IA (MiniMax)
 */
router.post(
  '/completion',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const { prompt, temperature, max_tokens, json_mode } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, message: 'El prompt es obligatorio' });
      }

      const result = await MiniMaxService.generateCompletion(prompt, {
        temperature: typeof temperature === 'number' ? temperature : 0.3,
        maxTokens: max_tokens,
        jsonMode: json_mode,
      });

      res.status(200).json({
        ok: true,
        text: result.text,
        completion: result.text,
        provider: result.provider,
      });
    } catch (error: any) {
      logger.error(`Error in POST /api/conversation/completion: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al generar contenido con la IA: ' + error.message,
        error: error.message,
      });
    }
  })
);

/**
 * GET /api/conversation/stories
 * Obtener todas las historias de conversación desde Supabase (PostgreSQL)
 */
router.get(
  '/stories',
  authMiddleware,
  asyncHandler(async (_req: any, res: any) => {
    try {
      const stories = await ConversationRepository.getAllStories();
      res.status(200).json({
        ok: true,
        stories,
      });
    } catch (error: any) {
      logger.error(`Error in GET /api/conversation/stories: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al obtener historias de la biblioteca.',
        error: error.message,
      });
    }
  })
);

/**
 * POST /api/conversation/stories
 * Guardar o actualizar una historia en Supabase (PostgreSQL)
 */
router.post(
  '/stories',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ success: false, message: 'Datos de historia requeridos' });
      }

      const savedStory = await ConversationRepository.upsertStory(payload);
      if (!savedStory) {
        throw new Error('No se pudo guardar la historia en PostgreSQL');
      }

      res.status(200).json({
        ok: true,
        story: savedStory,
      });
    } catch (error: any) {
      logger.error(`Error in POST /api/conversation/stories: ${error.message}`);
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
 * Eliminar una historia por ID en Supabase
 */
router.delete(
  '/stories/:id',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const deleted = await ConversationRepository.deleteStory(id);
      res.status(200).json({
        ok: true,
        success: deleted,
      });
    } catch (error: any) {
      logger.error(`Error in DELETE /api/conversation/stories/${req.params.id}: ${error.message}`);
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
 * Síntesis de voz neural con MiniMax T2A
 */
router.get(
  '/tts',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const { text, voice, speed, pitch } = req.query;
      if (!text) {
        return res.status(400).json({ success: false, message: 'El parámetro text es requerido' });
      }

      const audioBuffer = await MiniMaxService.synthesizeSpeech(String(text), {
        voice: voice ? String(voice) : 'female-shaonv',
        speed: speed ? parseFloat(String(speed)) : 1.0,
        pitch: pitch ? parseFloat(String(pitch)) : 0,
      });

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.send(audioBuffer);
    } catch (error: any) {
      logger.error(`Error in GET /api/conversation/tts: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al sintetizar voz con MiniMax: ' + error.message,
        error: error.message,
      });
    }
  })
);

/**
 * POST /api/conversation/generate-drawing-image
 * Generación de imágenes con IA mediante MiniMax
 */
router.post(
  '/generate-drawing-image',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    try {
      const { prompt, model } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, message: 'El prompt es obligatorio' });
      }

      const imageUrl = await MiniMaxService.generateImage(prompt, { model });
      res.status(200).json({
        ok: true,
        url: imageUrl,
        image_url: imageUrl,
      });
    } catch (error: any) {
      logger.error(`Error in POST /api/conversation/generate-drawing-image: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error al generar imagen con MiniMax: ' + error.message,
        error: error.message,
      });
    }
  })
);

/**
 * POST /api/conversation/agent/command
 * Enviar un comando remoto al agente
 */
router.post(
  '/agent/command',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const { command, payload } = req.body;
    agentCommandsQueue.push({
      id: Math.random().toString(36).substring(2, 9),
      command: command || 'unknown',
      payload,
      timestamp: Date.now(),
    });
    // Limit queue size to last 50 commands
    if (agentCommandsQueue.length > 50) {
      agentCommandsQueue = agentCommandsQueue.slice(-50);
    }
    res.status(200).json({ ok: true, success: true });
  })
);

/**
 * GET /api/conversation/agent/commands
 * Obtener y vaciar la cola de comandos remotos
 */
router.get(
  '/agent/commands',
  authMiddleware,
  asyncHandler(async (_req: any, res: any) => {
    const commands = [...agentCommandsQueue];
    agentCommandsQueue = [];
    res.status(200).json({ ok: true, commands });
  })
);

/**
 * POST /api/conversation/agent/status
 * Reportar estado actual del frontend al agente
 */
router.post(
  '/agent/status',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const { status, message } = req.body;
    currentAgentStatus = {
      status: status || 'idle',
      message: message || '',
      timestamp: Date.now(),
    };
    res.status(200).json({ ok: true, success: true });
  })
);

/**
 * GET /api/conversation/agent/status
 * Consultar estado actual del agente
 */
router.get(
  '/agent/status',
  authMiddleware,
  asyncHandler(async (_req: any, res: any) => {
    res.status(200).json({ ok: true, ...currentAgentStatus });
  })
);

export default router;
