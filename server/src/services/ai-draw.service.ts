import { logger } from '../utils/logger';
import { MiniMaxService } from './minimax.service';

export interface AIDrawOptions {
  style?: 'whiteboard' | 'diagram' | 'scientific' | 'minimalist';
  groqApiKey?: string;
  minimaxApiKey?: string;
}

export interface AIDrawResult {
  svg: string;
  prompt: string;
  style: string;
}

const DRAW_PROMPT_TEMPLATE = `You are an expert vector illustrator and educational whiteboard diagram designer.
Your task is to generate a clean, pedagogical, and visually appealing SVG code based on the user's description.

USER REQUEST: "{PROMPT}"
STYLE PREFERENCE: "{STYLE}"

CRITICAL RULES FOR SVG GENERATION:
1. Output ONLY valid, standalone SVG code starting with <svg> and ending with </svg>.
2. Use standard viewBox="0 0 800 600" and xmlns="http://www.w3.org/2000/svg".
3. DO NOT include background rectangles (e.g. <rect width="100%" height="100%" fill="black" />); the canvas background must remain transparent.
4. Use vibrant, high-contrast, chalkboard-friendly stroke colors (e.g. #3b82f6 for blue, #10b981 for green, #f59e0b for yellow/orange, #ef4444 for red, #8b5cf6 for purple, and #ffffff or #1e293b for primary outlines).
5. Use clear vector elements: <path>, <rect>, <circle>, <line>, <polyline>, <polygon>, and <text>.
6. For text labels, use font-family="sans-serif", font-weight="600", and font-size="14" or "16".
7. NEVER include <script>, <iframe>, or external image links.
8. Return RAW SVG ONLY. DO NOT wrap with markdown code fences (no \`\`\`xml or \`\`\`svg). DO NOT add explanations.`;

export class AIDrawService {
  /**
   * Sanitizes and extracts the pure SVG element from LLM output.
   */
  private static extractAndSanitizeSVG(raw: string): string {
    let clean = raw.trim();

    // Strip markdown code fences if present
    clean = clean.replace(/^```(?:svg|xml|html)?\s*/i, '').replace(/```\s*$/, '').trim();

    // Find the opening <svg and closing </svg>
    const startIdx = clean.indexOf('<svg');
    const endIdx = clean.lastIndexOf('</svg>');

    if (startIdx === -1 || endIdx === -1) {
      throw new Error('El modelo de IA no devolvió un elemento SVG válido.');
    }

    let svg = clean.substring(startIdx, endIdx + 6);

    // Sanitize any dangerous tags or attributes
    svg = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    svg = svg.replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
    svg = svg.replace(/javascript:/gi, '');

    return svg;
  }

  /**
   * Generates vector SVG diagram from text prompt.
   */
  static async generateSVG(prompt: string, options: AIDrawOptions = {}): Promise<AIDrawResult> {
    if (!prompt || !prompt.trim()) {
      throw new Error('La descripción del dibujo no puede estar vacía.');
    }

    const style = options.style || 'whiteboard';
    const filledPrompt = DRAW_PROMPT_TEMPLATE
      .replace('{PROMPT}', prompt.trim())
      .replace('{STYLE}', style);

    const groqKey = (options.groqApiKey || process.env.GROQ_API_KEY || '').trim();

    // 1. Try Groq (high speed)
    if (groqKey) {
      try {
        logger.info(`[AIDrawService] 🎨 Generando SVG con Groq (prompt: "${prompt.slice(0, 40)}...")...`);
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: filledPrompt }],
            temperature: 0.3,
            max_tokens: 4096,
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content || '';
          if (content) {
            const svg = this.extractAndSanitizeSVG(content);
            logger.info('[AIDrawService] ✅ SVG generado con éxito con Groq.');
            return { svg, prompt, style };
          }
        } else {
          const errText = await res.text();
          logger.warn(`[AIDrawService] Groq error ${res.status}: ${errText.slice(0, 200)}`);
        }
      } catch (err: any) {
        logger.warn(`[AIDrawService] Falló llamada a Groq: ${err.message}. Probando fallback...`);
      }
    }

    // 2. Fallback to MiniMax
    logger.info('[AIDrawService] 🔄 Generando SVG con MiniMax como fallback...');
    const result = await MiniMaxService.generateCompletion(filledPrompt, {
      apiKey: options.minimaxApiKey,
      model: 'MiniMax-Text-01',
      temperature: 0.3,
      maxTokens: 4096,
    });

    const svg = this.extractAndSanitizeSVG(result.text);
    return { svg, prompt, style };
  }
}
