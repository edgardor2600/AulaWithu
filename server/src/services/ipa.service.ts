import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { logger } from '../utils/logger';

export interface IpaItemRequest {
  id: string;
  text: string;
}

export interface IpaItemResult {
  id: string;
  text: string;
  ipa: string;
  resolved_lang?: string;
}

export interface IpaTranscribeOptions {
  accent?: 'us' | 'uk';
  preferred_lang?: 'en' | 'es' | 'auto';
  engine?: string;
}

// Palabras clave frecuentes para detección automática de idioma
const ENGLISH_HINTS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'can', 'do', 'for', 'from', 'have',
  'he', 'her', 'here', 'how', 'i', 'in', 'is', 'it', 'my', 'not', 'of', 'on', 'or',
  'she', 'that', 'the', 'their', 'there', 'they', 'this', 'to', 'was', 'we', 'what',
  'when', 'where', 'who', 'why', 'will', 'with', 'would', 'you', 'your'
]);

const SPANISH_HINTS = new Set([
  'a', 'al', 'como', 'con', 'de', 'del', 'donde', 'el', 'ella', 'en', 'es', 'esta',
  'este', 'hola', 'la', 'las', 'lo', 'los', 'me', 'mi', 'no', 'para', 'pero', 'por',
  'que', 'se', 'si', 'su', 'te', 'tu', 'un', 'una', 'uno', 'y', 'yo'
]);

export class IpaService {
  private static usMap: Map<string, string> = new Map();
  private static ukMap: Map<string, string> = new Map();
  private static isInitialized = false;
  private static initPromise: Promise<void> | null = null;

  /**
   * Resuelve la ruta absoluta al directorio de assets fonéticos
   */
  private static resolvePhoneticsDir(): string {
    const candidates = [
      path.join(__dirname, '../assets/phonetics'),
      path.join(__dirname, '../../src/assets/phonetics'),
      path.join(process.cwd(), 'src/assets/phonetics'),
      path.join(process.cwd(), 'server/src/assets/phonetics'),
      path.join(process.cwd(), 'assets/phonetics'),
    ];

    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        return dir;
      }
    }

    logger.warn('[IpaService] Directores de assets fonéticos no encontrados en rutas candidatas. Usando fallback:', candidates[0]);
    return candidates[0];
  }

  /**
   * Carga un archivo de diccionario palabra\tfonética línea por línea
   */
  private static async loadDictionaryFile(filePath: string, targetMap: Map<string, string>): Promise<number> {
    if (!fs.existsSync(filePath)) {
      logger.warn(`[IpaService] Diccionario no encontrado: ${filePath}`);
      return 0;
    }

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let count = 0;
    for await (const line of rl) {
      if (!line) continue;
      const tabIndex = line.indexOf('\t');
      if (tabIndex > 0) {
        const word = line.slice(0, tabIndex).trim().toLowerCase();
        let phonetics = line.slice(tabIndex + 1).trim();
        // Limpiar barras exteriores /.../ si las tiene para normalizar
        if (phonetics.startsWith('/') && phonetics.endsWith('/')) {
          phonetics = phonetics.slice(1, -1);
        }
        if (word && phonetics) {
          targetMap.set(word, `/${phonetics}/`);
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Inicializa los diccionarios en memoria RAM (asíncrono y no bloqueante)
   */
  public static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const startTime = Date.now();
      const baseDir = this.resolvePhoneticsDir();
      const usFile = path.join(baseDir, 'ipa_en_US.txt');
      const ukFile = path.join(baseDir, 'ipa_en_UK.txt');

      try {
        const [usCount, ukCount] = await Promise.all([
          this.loadDictionaryFile(usFile, this.usMap),
          this.loadDictionaryFile(ukFile, this.ukMap),
        ]);

        const duration = Date.now() - startTime;
        this.isInitialized = true;
        logger.info(`[IpaService] ✅ Diccionarios IPA cargados en ${duration}ms (US: ${usCount.toLocaleString()} palabras, UK: ${ukCount.toLocaleString()} palabras)`);
      } catch (err: any) {
        logger.error(`[IpaService] ❌ Error cargando diccionarios IPA: ${err.message}`);
      }
    })();

    return this.initPromise;
  }

  /**
   * Determina el idioma preponderante del texto (inglés o español)
   */
  public static detectLanguage(text: string, preferredLang: string = 'auto'): 'en' | 'es' {
    const pref = (preferredLang || 'auto').trim().toLowerCase();
    if (pref === 'en' || pref === 'es') return pref;

    const raw = String(text || '').toLowerCase();
    // Presencia de tildes o caracteres exclusivos del español
    if (/[áéíóúüñ¿¡]/.test(raw)) {
      return 'es';
    }

    const words = raw.match(/[a-záéíóúüñ]+/g) || [];
    let enScore = 0;
    let esScore = 0;

    for (const w of words) {
      if (ENGLISH_HINTS.has(w)) enScore += 2;
      if (SPANISH_HINTS.has(w)) esScore += 2;
      if (w.includes('w')) enScore += 1;
      if (w.includes('ñ')) esScore += 3;
    }

    return esScore > enScore ? 'es' : 'en';
  }

  /**
   * Fonética determinística para palabras en español (alfabeto fonético internacional)
   */
  private static transcribeSpanishWord(word: string): string {
    let w = word.toLowerCase().trim();
    if (!w) return '';

    // Reemplazos fonéticos estándar para español neutro latino/internacional
    w = w
      .replace(/ch/g, 'tʃ')
      .replace(/ll/g, 'ʝ')
      .replace(/y([aeiou])/g, 'ʝ$1')
      .replace(/qu([ei])/g, 'k$1')
      .replace(/gu([ei])/g, 'ɡ$1')
      .replace(/c([ei])/g, 's$1')
      .replace(/z/g, 's')
      .replace(/c/g, 'k')
      .replace(/g([ei])/g, 'x$1')
      .replace(/j/g, 'x')
      .replace(/rr/g, 'r')
      .replace(/r/g, 'ɾ')
      .replace(/h/g, '') // h muda
      .replace(/v/g, 'b')
      .replace(/ñ/g, 'ɲ')
      .replace(/á/g, 'ˈa')
      .replace(/é/g, 'ˈe')
      .replace(/í/g, 'ˈi')
      .replace(/ó/g, 'ˈo')
      .replace(/ú/g, 'ˈu');

    return `/${w}/`;
  }

  /**
   * Busca la transcripción IPA de una palabra en inglés
   */
  public static getWordIpa(word: string, accent: 'us' | 'uk' = 'us'): string | null {
    if (!this.isInitialized) {
      return null;
    }

    const primaryMap = accent === 'uk' ? this.ukMap : this.usMap;
    const secondaryMap = accent === 'uk' ? this.usMap : this.ukMap;

    const clean = word.toLowerCase().replace(/^[^\w']+|[^\w']+$/g, '').trim();
    if (!clean) return null;

    // 1. Búsqueda exacta directa
    if (primaryMap.has(clean)) return primaryMap.get(clean)!;
    if (secondaryMap.has(clean)) return secondaryMap.get(clean)!;

    // 2. Probar sin apóstrofes o comillas
    const noApos = clean.replace(/['’]/g, '');
    if (primaryMap.has(noApos)) return primaryMap.get(noApos)!;
    if (secondaryMap.has(noApos)) return secondaryMap.get(noApos)!;

    // 3. Manejo de posesivos o plurales regulares ('s o s)
    if (clean.endsWith("'s") && clean.length > 2) {
      const base = clean.slice(0, -2);
      const baseIpa = primaryMap.get(base) || secondaryMap.get(base);
      if (baseIpa) {
        return baseIpa.replace(/\/$/, "s/");
      }
    }

    return null;
  }

  /**
   * Transcribe un texto completo preservando estructura y espacios
   */
  public static transcribeText(text: string, options: IpaTranscribeOptions = {}): string {
    const accent = options.accent === 'uk' ? 'uk' : 'us';
    const lang = this.detectLanguage(text, options.preferred_lang);

    if (lang === 'es') {
      // Para español: transcribe palabra por palabra
      return text.replace(/[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+/g, (match) => {
        return this.transcribeSpanishWord(match);
      });
    }

    // Para inglés: tokenizar palabras y no-palabras (signos de puntuación, espacios)
    return text.replace(/[a-zA-Z0-9'’]+/g, (token) => {
      const ipa = this.getWordIpa(token, accent);
      return ipa ? ipa : token;
    });
  }

  /**
   * Procesa la lista de items que envía el cliente React (useReading.ts)
   */
  public static async transcribeItems(
    items: IpaItemRequest[],
    options: IpaTranscribeOptions = {}
  ): Promise<IpaItemResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const results: IpaItemResult[] = [];
    const accent = options.accent === 'uk' ? 'uk' : 'us';

    for (const item of items) {
      const text = item.text || '';
      const resolvedLang = this.detectLanguage(text, options.preferred_lang);
      const ipa = this.transcribeText(text, { ...options, accent });

      results.push({
        id: item.id,
        text,
        ipa,
        resolved_lang: resolvedLang,
      });
    }

    return results;
  }
}
