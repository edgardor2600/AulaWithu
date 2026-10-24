/**
 * Pure utility to parse .srt and .vtt subtitle files into structured cues and clean continuous text.
 * No external dependencies — fully unit-testable in Node.
 */

export interface SubtitleCue {
  id: number;
  startTime: string;
  endTime: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface ParsedSubtitles {
  cues: SubtitleCue[];
  fullText: string;
  stats: {
    totalCues: number;
    totalWords: number;
    estimatedDurationMinutes: number;
  };
}

/** Parses timestamp formatted as HH:MM:SS,mmm or HH:MM:SS.mmm or MM:SS.mmm into total seconds. */
export function parseTimestampToSeconds(timestamp: string): number {
  const clean = timestamp.trim().replace(',', '.');
  const parts = clean.split(':').map(Number);
  if (parts.some(isNaN)) return 0;

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }
  return 0;
}

/** Strips HTML, VTT voice tags (<v Speaker>), font tags, and timing annotations from subtitle text. */
export function cleanSubtitleLine(text: string): string {
  return text
    .replace(/<v\s+[^>]+>/gi, '') // Voice tags: <v Roger>
    .replace(/<\/v>/gi, '')
    .replace(/<[^>]+>/g, '') // Standard HTML tags like <i>, <b>, <font>
    .replace(/\{[^}]+\}/g, '') // SSA/ASS style tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

const TIMESTAMP_ARROW_REGEX = /-->/;
const TIMESTAMP_EXTRACTOR = /((?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{3})/;

/**
 * Formats total seconds into standard SRT timestamp format: HH:MM:SS,000
 */
export function formatSecondsToTimestamp(sec: number): string {
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = Math.floor(sec % 60);
  const millis = Math.floor((sec % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

/**
 * Parses plain text dialogues (without SRT/VTT timestamps) into structured cues with realistic speech timing.
 */
export function parsePlainTextAsSubtitles(rawText: string): ParsedSubtitles {
  const cleaned = cleanSubtitleLine(rawText);
  if (!cleaned) {
    return {
      cues: [],
      fullText: '',
      stats: { totalCues: 0, totalWords: 0, estimatedDurationMinutes: 0 },
    };
  }

  // Split into sentences or lines
  const rawSentences = rawText
    .split(/\r?\n+/)
    .flatMap(line => line.split(/(?<=[.?!])\s+/))
    .map(s => cleanSubtitleLine(s))
    .filter(Boolean);

  const sentences = rawSentences.length > 0 ? rawSentences : [cleaned];
  const cues: SubtitleCue[] = [];
  let currentSecond = 0;

  for (let i = 0; i < sentences.length; i++) {
    const text = sentences[i];
    const wordsInSentence = text.split(/\s+/).filter(Boolean).length;
    // Average speech rate is ~2.5 words per second, minimum duration 2s
    const duration = Math.max(2, Math.round(wordsInSentence / 2.5));
    const startSeconds = currentSecond;
    const endSeconds = currentSecond + duration;
    currentSecond = endSeconds + 1;

    cues.push({
      id: i + 1,
      startTime: formatSecondsToTimestamp(startSeconds),
      endTime: formatSecondsToTimestamp(endSeconds),
      startSeconds,
      endSeconds,
      text,
    });
  }

  const allWords = cleaned.split(/\s+/).filter(Boolean);
  const totalWords = allWords.length;
  const estimatedDurationMinutes = Math.max(0.1, Math.round((currentSecond / 60) * 10) / 10);

  return {
    cues,
    fullText: cleaned,
    stats: {
      totalCues: cues.length,
      totalWords,
      estimatedDurationMinutes,
    },
  };
}

/**
 * Parses raw SRT, WebVTT string or plain text dialogue into structured cues and normalized full text.
 */
export function parseSubtitles(rawContent: string): ParsedSubtitles {
  if (!rawContent || !rawContent.trim()) {
    return {
      cues: [],
      fullText: '',
      stats: { totalCues: 0, totalWords: 0, estimatedDurationMinutes: 0 },
    };
  }

  // Normalize line breaks
  const normalized = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n+/);

  const cues: SubtitleCue[] = [];
  let cueCounter = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Skip WEBVTT headers and NOTE blocks
    if (lines[0].startsWith('WEBVTT') || lines[0].startsWith('NOTE') || lines[0].startsWith('STYLE')) {
      continue;
    }

    // Locate the line containing the timestamp arrow "-->"
    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (TIMESTAMP_ARROW_REGEX.test(lines[i])) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const match = timeLine.match(TIMESTAMP_EXTRACTOR);
    if (!match) continue;

    const startTime = match[1];
    const endTime = match[2];
    const startSeconds = parseTimestampToSeconds(startTime);
    const endSeconds = parseTimestampToSeconds(endTime);

    const textLines = lines.slice(timeLineIndex + 1);
    const cleanedText = textLines
      .map(cleanSubtitleLine)
      .filter(Boolean)
      .join(' ');

    if (!cleanedText) continue;

    // Deduplicate identical consecutive lines (common in streaming captions)
    const prevCue = cues[cues.length - 1];
    if (prevCue && prevCue.text === cleanedText && Math.abs(prevCue.endSeconds - startSeconds) < 0.5) {
      prevCue.endTime = endTime;
      prevCue.endSeconds = endSeconds;
      continue;
    }

    cues.push({
      id: cueCounter++,
      startTime,
      endTime,
      startSeconds,
      endSeconds,
      text: cleanedText,
    });
  }

  // If no timestamp-based cues were found, gracefully parse as continuous dialogue / plain text
  if (cues.length === 0) {
    return parsePlainTextAsSubtitles(rawContent);
  }

  // Generate full dialogue text
  const fullText = cues.map(c => c.text).join(' ');
  const words = fullText.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  const firstCue = cues[0];
  const lastCue = cues[cues.length - 1];
  const durationSeconds = lastCue && firstCue ? Math.max(0, lastCue.endSeconds - firstCue.startSeconds) : 0;
  const estimatedDurationMinutes = Math.round((durationSeconds / 60) * 10) / 10;

  return {
    cues,
    fullText,
    stats: {
      totalCues: cues.length,
      totalWords,
      estimatedDurationMinutes,
    },
  };
}
