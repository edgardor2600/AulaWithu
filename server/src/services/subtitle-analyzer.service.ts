import { logger } from '../utils/logger';
import { MiniMaxService } from './minimax.service';

export interface VocabularyItem {
  id: string;
  term: string;
  type: 'phrasal_verb' | 'idiom' | 'expression' | 'adjective' | 'adverb';
  context: string;
  explanation: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correct_option_index: number;
  explanation: string;
}

export interface SubtitleAnalysisPayload {
  vocabulary: VocabularyItem[];
  questions: QuizQuestion[];
  summary?: string;
}

const SUBTITLE_PROMPT_TEMPLATE = `You are an expert English language teacher. Analyze the provided English subtitles text.

Your goals:
1. Extract at least 12-15 advanced vocabulary items found in the subtitles, categorized as:
   - "phrasal_verb" (Phrasal verbs)
   - "idiom" or "expression" (Idiomatic expressions)
   - "adjective" or "adverb" (C1-C2 level descriptive words)
   Provide the original sentence where it appeared as "context", and provide a clear explanation in SPANISH of its meaning in this context.

2. Generate 10 to 15 multiple-choice questions (mix of vocabulary/grammar and storyline/reading comprehension based on the text):
   - "question" in ENGLISH
   - "options" exactly 4 string options in ENGLISH
   - "correct_option_index" integer 0, 1, 2, or 3
   - "explanation" in SPANISH explaining why this answer is correct

Return a single STRICT JSON object with this exact structure:
{
  "summary": "Short 2-sentence summary in Spanish of what happened in the dialogue",
  "vocabulary": [
    {
      "id": "v1",
      "term": "look up to",
      "type": "phrasal_verb",
      "context": "I have always looked up to my older sister.",
      "explanation": "Admirar o respetar profundamente a alguien."
    }
  ],
  "questions": [
    {
      "id": 1,
      "question": "What does the speaker mean when saying they 'looked up to' their sister?",
      "options": ["They ignored her", "They admired and respected her", "They looked at her from above", "They competed with her"],
      "correct_option_index": 1,
      "explanation": "El phrasal verb 'look up to' significa admirar o respetar a una persona."
    }
  ]
}

DO NOT output markdown codeblocks, DO NOT output introductory text. Return raw JSON only.

--- SUBTITLES START ---
{SUBTITLES}
--- SUBTITLES END ---`;

export class SubtitleAnalyzerService {
  /**
   * Cleans potential markdown fencing and parses JSON safely.
   */
  private static parseJsonSafely(raw: string): SubtitleAnalysisPayload {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    // Try finding outer JSON object brackets if surrounded by commentary
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(clean);
    if (!parsed.vocabulary || !Array.isArray(parsed.vocabulary)) {
      parsed.vocabulary = [];
    }
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      parsed.questions = [];
    }
    return parsed as SubtitleAnalysisPayload;
  }

  /**
   * Main entry point to analyze subtitles text using available LLM providers (Groq primary, MiniMax fallback).
   */
  static async analyze(
    subtitlesText: string,
    options: { groqApiKey?: string; minimaxApiKey?: string } = {}
  ): Promise<SubtitleAnalysisPayload> {
    if (!subtitlesText || !subtitlesText.trim()) {
      throw new Error('El texto de los subtítulos no puede estar vacío.');
    }

    // Limit length to avoid extreme latencies (first 60,000 characters is ~12,000 words, plenty for an episode)
    const truncated = subtitlesText.length > 60000 ? subtitlesText.slice(0, 60000) : subtitlesText;
    const prompt = SUBTITLE_PROMPT_TEMPLATE.replace('{SUBTITLES}', truncated);

    const groqKey = (options.groqApiKey || process.env.GROQ_API_KEY || '').trim();

    // 1. Try Groq (ultra fast, < 2s with LLaMA 3.3 70B)
    if (groqKey) {
      try {
        logger.info('[SubtitleAnalyzer] 🚀 Analizando subtítulos con Groq (llama-3.3-70b-versatile)...');
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            response_format: { type: 'json_object' },
            max_tokens: 4096,
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content || '';
          if (content) {
            logger.info('[SubtitleAnalyzer] ✅ Análisis completado con éxito con Groq.');
            return this.parseJsonSafely(content);
          }
        } else {
          const errText = await res.text();
          logger.warn(`[SubtitleAnalyzer] Groq HTTP ${res.status}: ${errText.slice(0, 200)}`);
        }
      } catch (err: any) {
        logger.warn(`[SubtitleAnalyzer] Falló llamada a Groq: ${err.message}. Intentando fallback...`);
      }
    }

    // 2. Fallback to MiniMax
    logger.info('[SubtitleAnalyzer] 🔄 Ejecutando con MiniMax como fallback...');
    const result = await MiniMaxService.generateCompletion(prompt, {
      apiKey: options.minimaxApiKey,
      model: 'MiniMax-Text-01',
      temperature: 0.2,
      maxTokens: 4096,
    });

    return this.parseJsonSafely(result.text);
  }
}
