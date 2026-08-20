import { logger } from '../utils/logger';

export interface MiniMaxCompletionOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface MiniMaxTTSOptions {
  apiKey?: string;
  voice?: string;
  model?: string;
  speed?: number;
  pitch?: number;
  sampleRate?: number;
}

export class MiniMaxService {
  private static getApiKey(overrideKey?: string): string {
    const key = (overrideKey || '').trim() || (process.env.MINIMAX_API_KEY || '').trim();
    if (!key) {
      throw new Error('Falta la API Key de MiniMax. Configúrala en server/.env como MINIMAX_API_KEY');
    }
    return key;
  }

  /**
   * Text Completion / Story & Dialogue Generator
   */
  static async generateCompletion(prompt: string, options: MiniMaxCompletionOptions = {}): Promise<{ text: string; provider: string }> {
    const apiKey = this.getApiKey(options.apiKey);
    const model = options.model || 'MiniMax-Text-01';
    const temperature = options.temperature ?? 0.3;

    logger.info(`[MiniMaxService] 🚀 Iniciando generación con MINIMAX (modelo: ${model})...`);

    try {
      const url = 'https://api.minimax.io/v1/chat/completions';
      const body: any = {
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        max_tokens: options.maxTokens || 8192,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data: any = await res.json();
        if (data.choices && data.choices.length > 0) {
          const choice = data.choices[0];
          let reply = choice.message?.content || choice.text || '';
          reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          if (reply) {
            logger.info(`[MiniMaxService] ✅ Texto generado exitosamente con MINIMAX (${model})`);
            return { text: reply, provider: 'minimax' };
          }
        }
      } else {
        const errText = await res.text();
        logger.warn(`[MiniMaxService] MiniMax respondió status ${res.status}: ${errText}`);
      }
    } catch (minimaxErr: any) {
      logger.warn(`[MiniMaxService] Error conectando a MiniMax: ${minimaxErr.message}`);
    }

    // Fallback: Groq LLM
    const groqKey = process.env.GROQ_API_KEY || '';
    if (groqKey) {
      try {
        logger.warn('[MiniMaxService] ⚠️ Activando respaldo automático con GROQ (Llama 3.3)...');
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          }),
        });
        if (groqRes.ok) {
          const groqData: any = await groqRes.json();
          const groqReply = groqData.choices?.[0]?.message?.content || '';
          if (groqReply) {
            logger.info('[MiniMaxService] ✅ Texto generado con éxito mediante el respaldo de GROQ (Llama 3.3)');
            return { text: groqReply.trim(), provider: 'groq' };
          }
        }
      } catch (groqErr: any) {
        logger.warn(`[MiniMaxService] Error en respaldo Groq: ${groqErr.message}`);
      }
    }

    throw new Error('No se pudo generar el texto con MiniMax ni con el respaldo.');
  }

  /**
   * Text-to-Speech (T2A) Audio Synthesis
   */
  static async synthesizeSpeech(text: string, options: MiniMaxTTSOptions = {}): Promise<Buffer> {
    const apiKey = this.getApiKey(options.apiKey);

    let voiceId = 'female-shaonv';
    let model = options.model || 'speech-02-hd';

    if (options.voice) {
      const rawVoice = options.voice.trim();
      if (rawVoice.startsWith('minimax/')) {
        const parts = rawVoice.split('/');
        voiceId = parts[1] || 'female-shaonv';
        if (parts[2]) model = parts[2];
      } else if (rawVoice.includes('female') || rawVoice.includes('Jenny') || rawVoice.includes('Dalia') || rawVoice.includes('Aria') || rawVoice.includes('shaonv') || rawVoice.includes('tianmei')) {
        voiceId = 'female-shaonv';
      } else if (rawVoice.includes('male') || rawVoice.includes('Guy') || rawVoice.includes('Roger') || rawVoice.includes('Brian') || rawVoice.includes('chengshu') || rawVoice.includes('magnetic')) {
        voiceId = 'English_magnetic_man';
      } else {
        voiceId = rawVoice;
      }
    }

    logger.info(`[MiniMaxService] Synthesizing speech with voice ${voiceId}, model ${model}...`);

    const sanitizedText = text.replace(/_{2,}/g, 'blank').replace(/\*/g, '').trim();
    const url = 'https://api.minimax.io/v1/t2a_v2';

    const sendTTSRequest = async (targetVoice: string) => {
      const payload = {
        model,
        text: sanitizedText,
        voice_setting: {
          voice_id: targetVoice,
          speed: options.speed || 1.0,
          pitch: options.pitch || 0,
        },
        audio_setting: {
          sample_rate: options.sampleRate || 32000,
          format: 'mp3',
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`MiniMax TTS Error (${res.status}): ${errText}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json: any = await res.json();
        if (json.base_resp && json.base_resp.status_code !== 0) {
          throw new Error(`MiniMax TTS (${json.base_resp.status_code}): ${json.base_resp.status_msg}`);
        }

        const audioHexOrBase64 = json.data?.audio || json.audio;
        if (audioHexOrBase64) {
          try {
            return Buffer.from(audioHexOrBase64, 'hex');
          } catch {
            return Buffer.from(audioHexOrBase64, 'base64');
          }
        }
        throw new Error('MiniMax TTS JSON did not contain audio payload');
      }

      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    };

    try {
      return await sendTTSRequest(voiceId);
    } catch (firstErr: any) {
      if (voiceId !== 'female-shaonv') {
        logger.warn(`[MiniMaxService] TTS con voz ${voiceId} falló (${firstErr.message}). Reintentando con voz default female-shaonv...`);
        return await sendTTSRequest('female-shaonv');
      }
      throw firstErr;
    }
  }

  /**
   * AI Image Generation
   */
  static async generateImage(prompt: string, options: { apiKey?: string; model?: string; width?: number; height?: number } = {}): Promise<string> {
    const apiKey = this.getApiKey(options.apiKey);
    const model = options.model || 'image-01';

    logger.info(`[MiniMaxService] Generating image with prompt "${prompt.slice(0, 40)}..."`);

    const url = 'https://api.minimax.io/v1/image_generation';
    const payload = {
      model,
      prompt,
      aspect_ratio: '16:9',
      response_format: 'url',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MiniMax Image API Error (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`MiniMax Image Error (${data.base_resp.status_code}): ${data.base_resp.status_msg}`);
    }

    const imageUrl = data.data?.image_url || data.image_url || (data.data?.images && data.data.images[0]?.url) || '';
    if (!imageUrl) {
      throw new Error('MiniMax no devolvió una URL de imagen válida');
    }

    return imageUrl;
  }

  /**
   * Phonetic IPA Generator using LLM
   */
  static async generateIPA(words: string[], options: { apiKey?: string } = {}): Promise<Record<string, string>> {
    const uniqueWords = Array.from(new Set(words.map(w => w.trim()).filter(Boolean)));
    if (uniqueWords.length === 0) return {};

    const prompt =
      `Provide the standard International Phonetic Alphabet (IPA) transcription in American English for the following list of words.\n` +
      `Words: ${JSON.stringify(uniqueWords)}\n\n` +
      `Respond STRICTLY with valid JSON where the keys are the original lowercase words and values are the IPA strings formatted with slashes, e.g.: {"apple": "/ˈæp.əl/", "read": "/riːd/"}.\n` +
      `Do not output any introductory or conclusion text, only the JSON object.`;

    try {
      const { text: rawJson } = await this.generateCompletion(prompt, { apiKey: options.apiKey, temperature: 0.1 });
      const clean = rawJson.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(clean);
      return parsed;
    } catch (err: any) {
      logger.warn(`[MiniMaxService] IPA generation failed: ${err.message}. Returning fallback empty IPA map.`);
      return {};
    }
  }
}
