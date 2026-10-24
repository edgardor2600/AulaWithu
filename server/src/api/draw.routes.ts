import { Router, Request, Response } from 'express';
import { AIDrawService } from '../services/ai-draw.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/draw/generate-svg
 * Generates clean educational vector SVG diagram from text prompt.
 */
router.post('/generate-svg', async (req: Request, res: Response) => {
  try {
    const { prompt, style } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Debes proporcionar una descripción o prompt para el dibujo.' });
    }

    const result = await AIDrawService.generateSVG(prompt, { style });
    return res.status(200).json(result);
  } catch (err: any) {
    logger.error(`[draw/generate-svg] Error generating SVG: ${err.message}`);
    return res.status(500).json({ error: err.message || 'Error al generar el dibujo vectorial con IA.' });
  }
});

export default router;
