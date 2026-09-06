import { useState, useRef, useCallback, useEffect } from 'react';
import * as Y from 'yjs';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WordRect {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sentenceIndex: number;
  wordIndex: number;
  pronunciationResult?: 'ok' | 'bad' | 'unread';
}

export interface SentenceRect {
  text: string;
  wordStartIndex: number;
  wordEndIndex: number;
}

export interface EvaluatedWord {
  word: string;
  status: 'ok' | 'bad' | 'unread';
}

export interface ReadingEvaluation {
  transcript: string;
  overall_score: number;
  pronunciation_score: number;
  grammar_score?: number;
  relevance_score?: number;
  feedback: string;
  evaluatedWords: EvaluatedWord[];
}

export interface ReadingAttemptHistory {
  id?: number;
  story_title: string;
  story_text?: string;
  wpm_setting: number;
  overall_score: number;
  pronunciation_score: number;
  feedback: string;
  created_at?: string;
  student_name?: string;
}

export interface TrainerWordItem {
  word: string;
  index: number;
}

export type ChunkSize = 'small' | 'medium' | 'large';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReadingGame(
  sessionId: string | null,
  ydoc?: Y.Doc | null,
  isTeacher?: boolean
) {
  // UI panel state
  const [showReadingGamePanel, setShowReadingGamePanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'playing' | 'results' | 'history'>('config');

  // Story & config
  const [storyTitle, setStoryTitle] = useState('Mi Historia de Lectura');
  const [storyText, setStoryText]   = useState('');
  const [level, setLevel]           = useState('A2');
  const [topic, setTopic]           = useState('Daily Routine');
  const [wpm, setWpm]               = useState(120);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  // Sentence / Chunk mode
  const [isSentenceMode, setIsSentenceMode] = useState(false);
  const [chunkSize, setChunkSize]           = useState<ChunkSize>('medium');
  const [isSentencePaused, setIsSentencePaused] = useState(false);

  // System audio capture
  const [useSystemAudio, setUseSystemAudio] = useState(false);

  // Playing state
  const [isPlaying, setIsPlaying]           = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob]           = useState<Blob | null>(null);
  const [isEvaluating, setIsEvaluating]     = useState(false);
  const [countdown, setCountdown]           = useState<number | null>(null);

  // Evaluation & results
  const [evaluation, setEvaluation] = useState<ReadingEvaluation | null>(null);
  const [liveWords, setLiveWords]   = useState<{ text: string; result?: 'ok' | 'bad' }[]>([]);

  // Pronunciation Trainer
  const [showTrainer, setShowTrainer]           = useState(false);
  const [trainerWords, setTrainerWords]         = useState<TrainerWordItem[]>([]);
  const [trainerCurrentIdx, setTrainerCurrentIdx] = useState(0);
  const [trainerWord, setTrainerWord]           = useState<string | null>(null);
  const [isSpeakingTrainer, setIsSpeakingTrainer] = useState(false);
  const [trainerIsListening, setTrainerIsListening] = useState(false);
  const [trainerHeardText, setTrainerHeardText] = useState('');
  const [trainerFeedback, setTrainerFeedback]   = useState<'correct' | 'wrong' | null>(null);

  // History
  const [history, setHistory]             = useState<ReadingAttemptHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Internal refs
  const mediaRecorderRef   = useRef<MediaRecorder | null>(null);
  const audioChunksRef     = useRef<Blob[]>([]);
  const timerIntervalRef   = useRef<any>(null);
  const wpmIntervalRef     = useRef<any>(null);
  const recognitionRef     = useRef<any>(null);
  const trainerRecRef      = useRef<any>(null);
  const trainerRecorderRef = useRef<MediaRecorder | null>(null);
  const trainerChunksRef   = useRef<Blob[]>([]);
  const trainerStreamRef   = useRef<MediaStream | null>(null);
  const trainerTimeoutRef  = useRef<any>(null);
  const isEvaluatingTrainerRef = useRef<boolean>(false);
  const trainerAudioRef    = useRef<HTMLAudioElement | null>(null);
  const runStartIndexRef   = useRef(0);
  const lastWordIdxRef     = useRef(0);
  const currentWordsRef    = useRef<{ text: string; result?: 'ok' | 'bad' }[]>([]);
  const countdownRef       = useRef<any>(null);
  const sharedStreamRef    = useRef<MediaStream | null>(null);
  const displayStreamRef   = useRef<MediaStream | null>(null);
  const micStreamRef       = useRef<MediaStream | null>(null);
  const audioCtxRef        = useRef<AudioContext | null>(null);

  // Yjs: debounce timer for broadcasting word-advance events
  const yjsBroadcastTimerRef = useRef<any>(null);

  // Student spectator state (populated from Yjs when isTeacher === false)
  const [remotePhase, setRemotePhase] = useState<'idle' | 'countdown' | 'reading' | 'evaluating' | 'results'>('idle');
  const [remoteStoryText, setRemoteStoryText] = useState('');
  const [remoteStoryTitle, setRemoteStoryTitle] = useState('');
  const [remoteActiveWordIndex, setRemoteActiveWordIndex] = useState(0);
  const [remoteCountdown, setRemoteCountdown] = useState<number | null>(null);
  const [remoteLiveWords, setRemoteLiveWords] = useState<{ text: string; result?: 'ok' | 'bad' }[]>([]);
  const [remoteLastEvaluation, setRemoteLastEvaluation] = useState<{
    overall_score: number;
    pronunciation_score: number;
    feedback: string;
    transcript: string;
  } | null>(null);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const numberMap: Record<string, string> = {
    '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
    '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
    '7:00': 'seven', '8:00': 'eight', '9:00': 'nine', '10:00': 'ten'
  };

  /**
   * broadcastReadingYjs — debounced helper to write game state to Yjs.
   * Batches rapid word-advance ticks (max once per 200ms) to avoid saturating
   * the WebSocket with one message per word.
   */
  const broadcastReadingYjs = useCallback((updates: Record<string, any>) => {
    if (!ydoc || !isTeacher) return;
    if (yjsBroadcastTimerRef.current) clearTimeout(yjsBroadcastTimerRef.current);
    yjsBroadcastTimerRef.current = setTimeout(() => {
      const yReading = ydoc.getMap<any>('activeReadingGame');
      ydoc.transact(() => {
        Object.entries(updates).forEach(([k, v]) => yReading.set(k, v));
      });
    }, 200);
  }, [ydoc, isTeacher]);

  const normalizeWord = (w: string) => {
    const clean = String(w || '').toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '').trim();
    return numberMap[clean] || clean;
  };

  const areWordsSimilar = (w1: string, w2: string): boolean => {
    if (!w1 || !w2) return false;
    if (w1 === w2) return true;
    // Prefix match for words >= 4 chars (e.g. "mornin" ~ "morning")
    if (w1.length >= 4 && w2.length >= 4) {
      if (w1.startsWith(w2) || w2.startsWith(w1)) return true;
    }
    // Levenshtein distance <= 1 for words >= 4 chars
    if (w1.length >= 4 && Math.abs(w1.length - w2.length) <= 1) {
      let diff = 0;
      const len = Math.min(w1.length, w2.length);
      for (let i = 0; i < len; i++) {
        if (w1[i] !== w2[i]) diff++;
        if (diff > 1) return false;
      }
      return diff <= 1;
    }
    return false;
  };

  /** Full LCS alignment returning EvaluatedWord[] */
  const alignTranscriptionLCS = (originalWords: string[], transcriptText: string): EvaluatedWord[] => {
    const origNorm  = originalWords.map(normalizeWord);
    const transNorm = transcriptText.trim().split(/\s+/).filter(Boolean).map(normalizeWord);
    const n = origNorm.length;
    const m = transNorm.length;

    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= m; j++) {
        if (areWordsSimilar(origNorm[i - 1], transNorm[j - 1]) && origNorm[i - 1] !== '')
          dp[i][j] = dp[i - 1][j - 1] + 1;
        else
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }

    let i = n, j = m;
    const matched = new Set<number>();
    while (i > 0 && j > 0) {
      if (areWordsSimilar(origNorm[i - 1], transNorm[j - 1]) && origNorm[i - 1] !== '') {
        matched.add(i - 1); i--; j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
      else j--;
    }

    return originalWords.map((word, idx) => ({
      word,
      status: matched.has(idx) ? 'ok' : 'bad',
    }));
  };

  const activeWordIndexRef = useRef(-1);
  const isSpeechActiveRef  = useRef(false);
  const accumulatedTranscriptRef = useRef('');

  /** Realtime LCS: update live word colors as student speaks */
  const alignRealtimeLCS = useCallback((transcript: string) => {
    isSpeechActiveRef.current = true;
    const words    = currentWordsRef.current;
    const startIdx = runStartIndexRef.current;
    const activeIdx = activeWordIndexRef.current;
    const slice    = words.slice(startIdx);
    const origNorm = slice.map(w => normalizeWord(w.text));
    const transNorm = transcript.trim().split(/\s+/).filter(Boolean).map(normalizeWord);
    const n = origNorm.length, m = transNorm.length;

    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= m; j++) {
        if (areWordsSimilar(origNorm[i - 1], transNorm[j - 1]) && origNorm[i - 1] !== '')
          dp[i][j] = dp[i - 1][j - 1] + 1;
        else
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }

    let ii = n, jj = m;
    const matched = new Set<number>();
    while (ii > 0 && jj > 0) {
      if (areWordsSimilar(origNorm[ii - 1], transNorm[jj - 1]) && origNorm[ii - 1] !== '') {
        matched.add(ii - 1); ii--; jj--;
      } else if (dp[ii - 1][jj] >= dp[ii][jj - 1]) ii--;
      else jj--;
    }

    const updated = currentWordsRef.current.map((w, idx) => {
      if (idx < startIdx) return w;
      const relativeIdx = idx - startIdx;
      if (matched.has(relativeIdx)) {
        return { ...w, result: 'ok' as const };
      } else if (w.result !== 'ok' && isSpeechActiveRef.current) {
        if (activeIdx !== -1 && idx < activeIdx - 2) {
          return { ...w, result: 'bad' as const };
        }
      }
      return w;
    });

    currentWordsRef.current = updated;
    setLiveWords([...updated]);
  }, []);

  // ─── Audio stream management ────────────────────────────────────────────────

  const releaseStreams = useCallback(() => {
    sharedStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
    displayStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
    micStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
    try { audioCtxRef.current?.close(); } catch (_) {}
    sharedStreamRef.current = null;
    displayStreamRef.current = null;
    micStreamRef.current = null;
    audioCtxRef.current = null;
  }, []);

  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (useSystemAudio) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const mic     = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx     = new AudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        const dest    = ctx.createMediaStreamDestination();
        if (display.getAudioTracks().length > 0)
          ctx.createMediaStreamSource(new MediaStream([display.getAudioTracks()[0]])).connect(dest);
        if (mic.getAudioTracks().length > 0)
          ctx.createMediaStreamSource(mic).connect(dest);
        displayStreamRef.current = display;
        micStreamRef.current     = mic;
        audioCtxRef.current      = ctx;
        const stream = new MediaStream(dest.stream.getAudioTracks());
        sharedStreamRef.current  = stream;
        return stream;
      } catch (err) {
        console.warn('[reading] System audio failed, falling back to mic only:', err);
        setUseSystemAudio(false);
      }
    }
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = mic;
    sharedStreamRef.current = mic;
    return mic;
  }, [useSystemAudio]);

  const pickMimeType = () => {
    for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'])
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t;
    return '';
  };

  // ─── Browser Speech Recognition (Realtime Feedback) ───────────────────────

  const initSpeechRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      let finalSegment = '';
      let interimSegment = '';
      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          finalSegment += item[0].transcript + ' ';
        } else {
          interimSegment += item[0].transcript + ' ';
        }
      }
      const combined = (accumulatedTranscriptRef.current + ' ' + finalSegment + ' ' + interimSegment).trim();
      if (combined) {
        alignRealtimeLCS(combined);
      }
    };

    rec.onerror = (event: any) => {
      console.warn('[reading-speech-recognition] error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Permiso de micrófono denegado para la transcripción en vivo.');
      }
    };

    rec.onend = () => {
      if (isPlayingRef.current) {
        try { rec.start(); } catch (_) {}
      }
    };

    return rec;
  }, [alignRealtimeLCS]);

  // ─── Chunk / Sentence helpers ───────────────────────────────────────────────

  const buildChunkEndIndices = (words: string[], size: ChunkSize): number[] => {
    const sentences: number[] = [];
    // Detect sentence boundaries by punctuation
    words.forEach((w, i) => {
      if (/[.!?]$/.test(w.trim())) sentences.push(i);
    });
    if (sentences.length === 0 || sentences[sentences.length - 1] !== words.length - 1)
      sentences.push(words.length - 1);

    if (size === 'small') return sentences;
    if (size === 'medium') {
      const out: number[] = [];
      for (let i = 1; i < sentences.length; i += 2) out.push(sentences[i]);
      if (!out.includes(sentences[sentences.length - 1])) out.push(sentences[sentences.length - 1]);
      return out;
    }
    // large = every 4 sentences
    const out: number[] = [];
    for (let i = 3; i < sentences.length; i += 4) out.push(sentences[i]);
    if (!out.includes(sentences[sentences.length - 1])) out.push(sentences[sentences.length - 1]);
    return out;
  };

  // ─── Generate Story ─────────────────────────────────────────────────────────

  const generateStory = useCallback(async () => {
    setIsGeneratingStory(true);
    try {
      const prompt =
        `Write a short, engaging reading exercise story in English about: "${topic}".\n` +
        `The vocabulary, complexity and grammar must be strictly at the CEFR ${level} level.\n` +
        `The story should be between 70 and 120 words long.\n` +
        `Do not include a title, introduction, or outro. Just output the story text itself.`;

      const res = await api.post('/conversation/completion', { prompt, max_tokens: 300, temperature: 0.3 });
      let text = res.data?.text || res.data?.completion || res.data?.response || '';
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      text = text.replace(/^```(json|text)?\s*/i, '').replace(/```$/, '').trim();

      if (text) {
        setStoryText(text);
        setStoryTitle(`Historia Nivel ${level}: ${topic}`);
        toast.success('Historia generada con éxito');
      } else {
        throw new Error('Respuesta IA vacía');
      }
    } catch (err) {
      console.error('[reading] Generate error:', err);
      toast.error('No se pudo generar la historia con IA');
    } finally {
      setIsGeneratingStory(false);
    }
  }, [level, topic]);

  // ─── Start Game ─────────────────────────────────────────────────────────────

  const startGame = useCallback(async () => {
    if (isPlaying || isEvaluating) return;
    if (!storyText.trim()) { toast.error('Ingresa o genera una historia primero.'); return; }

    const words = storyText.trim().split(/\s+/).filter(Boolean);
    const initLive = words.map(w => ({ text: w, result: undefined as 'ok' | 'bad' | undefined }));
    currentWordsRef.current = initLive;
    runStartIndexRef.current = 0;
    lastWordIdxRef.current   = words.length - 1;
    activeWordIndexRef.current = 0;
    isSpeechActiveRef.current = false;
    accumulatedTranscriptRef.current = '';
    setLiveWords(initLive);
    setEvaluation(null);
    setAudioBlob(null);
    audioChunksRef.current = [];

    // Yjs: broadcast initial state to students immediately
    if (ydoc && isTeacher) {
      const yReading = ydoc.getMap<any>('activeReadingGame');
      ydoc.transact(() => {
        yReading.set('phase', 'countdown');
        yReading.set('storyTitle', storyTitle);
        yReading.set('storyText', storyText);
        yReading.set('wpm', wpm);
        yReading.set('activeWordIndex', 0);
        yReading.set('countdown', 3);
        yReading.set('liveWords', initLive);
        yReading.set('elapsedSeconds', 0);
        yReading.set('lastEvaluation', null);
        yReading.set('targetStudentId', null);
      });
    }

    try {
      const stream    = await ensureStream();
      const mimeType  = pickMimeType();
      const recorder  = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob  = new Blob(audioChunksRef.current, { type });
        setAudioBlob(blob);
      };

      // 3-2-1 countdown
      let cd = 3;
      setCountdown(cd);
      countdownRef.current = setInterval(() => {
        cd--;
        if (cd > 0) {
          setCountdown(cd);
        } else {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
            setCountdown(null);
          }
          // Yjs: update countdown for students
          if (ydoc && isTeacher) {
            const yReading = ydoc.getMap<any>('activeReadingGame');
            yReading.set('countdown', cd > 0 ? cd : null);
          } // Start recording
          recorder.start(200);
          setIsPlaying(true);
          setActiveWordIndex(0);
          setRecordingSeconds(0);
          setIsSentencePaused(false);
          setActiveTab('playing');

          // Yjs: transition to 'reading' phase
          if (ydoc && isTeacher) {
            const yReading = ydoc.getMap<any>('activeReadingGame');
            ydoc.transact(() => {
              yReading.set('phase', 'reading');
              yReading.set('countdown', null);
              yReading.set('activeWordIndex', 0);
            });
          }

          // Timer
          timerIntervalRef.current = setInterval(() =>
            setRecordingSeconds(prev => prev + 1), 1000);

          // WPM auto-advance
          const chunkEnds = isSentenceMode ? buildChunkEndIndices(words, chunkSize) : [];
          const intervalMs = (60 / Math.max(40, wpm)) * 1000;
          let currentIdx = 0;
          activeWordIndexRef.current = 0;

          wpmIntervalRef.current = setInterval(() => {
            if (isSentencePaused) return; // paused in sentence mode

            if (currentIdx >= words.length - 1) {
              clearInterval(wpmIntervalRef.current);
              return;
            }

            const next = currentIdx + 1;
            currentIdx = next;
            lastWordIdxRef.current = next;
            activeWordIndexRef.current = next;
            setActiveWordIndex(next);

            // Mark words left 2+ positions behind the active teleprompter cursor as 'bad' (red) if speech is active and word not 'ok'
            currentWordsRef.current = currentWordsRef.current.map((w, idx) => {
              if (isSpeechActiveRef.current && idx < next - 2 && w.result !== 'ok') {
                return { ...w, result: 'bad' as const };
              }
              return w;
            });
            setLiveWords([...currentWordsRef.current]);

            // Yjs: debounced broadcast of word position and live colors to students
            broadcastReadingYjs({
              activeWordIndex: next,
              liveWords: currentWordsRef.current.map(w => ({ text: w.text, result: w.result })),
              elapsedSeconds: Math.floor((Date.now() - Date.now()) / 1000), // approximate; refreshed via timer
            });

            // Sentence mode: pause at chunk boundary
            if (isSentenceMode && chunkEnds.includes(next - 1)) {
              setIsSentencePaused(true);
            }
          }, intervalMs);

          // Local Speech Recognition (Realtime speech feedback if available)
          if (!useSystemAudio) {
            const rec = initSpeechRecognition();
            if (rec) {
              recognitionRef.current = rec;
              try { rec.start(); } catch (_) {}
            }
          }
      }, 1000);

    } catch (err: any) {
      console.error('[reading] Start error:', err);
      toast.error('Permiso de micrófono denegado o no disponible.');
      setCountdown(null);
    }
  }, [isPlaying, isEvaluating, storyText, wpm, isSentenceMode, chunkSize, useSystemAudio, ensureStream, initSpeechRecognition, ydoc, isTeacher, storyTitle, broadcastReadingYjs]);

  /** Advance past current chunk boundary (Space key or button) */
  const advanceChunk = useCallback(() => {
    if (!isSentencePaused || !isPlaying) return;
    setIsSentencePaused(false);
    setActiveWordIndex(prev => {
      const next = prev + 1;
      lastWordIdxRef.current = next;
      return next;
    });
  }, [isSentencePaused, isPlaying]);

  // Space-key listener for chunk advance
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSentencePaused && isPlaying) {
        const tag = (document.activeElement as any)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        advanceChunk();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSentencePaused, isPlaying, advanceChunk]);

  // ─── Stop and Evaluate ──────────────────────────────────────────────────────

  const isPlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    clearInterval(timerIntervalRef.current);
    clearInterval(wpmIntervalRef.current);
    clearInterval(countdownRef.current);
    timerIntervalRef.current = null;
    wpmIntervalRef.current   = null;
    countdownRef.current     = null;
    setCountdown(null);
    setIsSentencePaused(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    releaseStreams();

    // Yjs: signal idle to students
    if (ydoc && isTeacher) {
      const yReading = ydoc.getMap<any>('activeReadingGame');
      ydoc.transact(() => {
        yReading.set('phase', 'idle');
        yReading.set('countdown', null);
      });
    }
  }, [releaseStreams, ydoc, isTeacher]);

  const stopAndEvaluate = useCallback(async () => {
    if (isEvaluating) return;

    const lastWordIdx = lastWordIdxRef.current;
    stopPlayback();
    setIsEvaluating(true);

    // Yjs: signal evaluating phase to students
    if (ydoc && isTeacher) {
      const yReading = ydoc.getMap<any>('activeReadingGame');
      yReading.set('phase', 'evaluating');
    }

    const words = storyText.trim().split(/\s+/).filter(Boolean);
    const activeWordsText = words.slice(0, lastWordIdx + 1).join(' ');

    toast.loading('Evaluando fluidez y pronunciación...', { id: 'eval-toast' });

    // Wait for blob to be written
    await new Promise(r => setTimeout(r, 450));

    const blob = audioChunksRef.current.length > 0
      ? new Blob(audioChunksRef.current, { type: 'audio/webm' })
      : audioBlob;

    if (!blob || blob.size === 0) {
      toast.dismiss('eval-toast');
      toast.error('No se capturó audio. Intenta de nuevo.');
      setIsEvaluating(false);
      return;
    }

    try {
      const fd = new FormData();
      const filename = `reading.${blob.type.includes('ogg') ? 'ogg' : 'webm'}`;
      fd.append('file', blob, filename);
      fd.append('audio', blob, filename);
      fd.append('topic', 'Reading Speed Challenge');
      fd.append('level', level);
      let questionText = `Please read the following text aloud: ${activeWordsText}`;
      if (isSentenceMode) {
        questionText += `\n\n[Note: The student read using Chunk Mode (chunk size: ${chunkSize}). ` +
          `There will be long pauses between chunks. Do not penalize for the pauses.]`;
      }
      fd.append('question', questionText);
      fd.append('expected_answer', activeWordsText);
      fd.append('api_provider', 'minimax');

      const res = await api.post('/reading/evaluate', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.dismiss('eval-toast');

      if (res.data?.ok && res.data?.evaluation) {
        const e = res.data.evaluation;
        let transcript = (e.transcript || '').trim();
        if (!transcript && accumulatedTranscriptRef.current.trim()) {
          console.log('[reading] Usando transcripción en tiempo real acumulada:', accumulatedTranscriptRef.current);
          transcript = accumulatedTranscriptRef.current.trim();
        }
        const evalWords  = alignTranscriptionLCS(words.slice(0, lastWordIdx + 1), transcript);
        const okCount    = evalWords.filter(w => w.status === 'ok').length;

        const totalEvaluatedWords = words.slice(0, lastWordIdx + 1).length;
        const matchPercentage = totalEvaluatedWords > 0 ? Math.round((okCount / totalEvaluatedWords) * 100) : 0;

        const overallScore = okCount > 0 ? Math.max(matchPercentage, Math.round(Number(e.overall_score || 0))) : 0;
        const pronScore    = okCount > 0 ? Math.max(matchPercentage, Math.round(Number(e.pronunciation_score || 0))) : 0;
        const grammarScore = okCount > 0 ? Math.min(100, Math.max(matchPercentage, Math.round(Number(e.grammar_score || 0)))) : 0;
        const relevanceScore = okCount > 0 ? Math.min(100, Math.max(matchPercentage, Math.round(Number(e.relevance_score || 0)))) : 0;

        const feedbackText = okCount > 0
          ? (e.feedback || '¡Buen trabajo en tu lectura!')
          : 'No se detectó pronunciación clara durante la lectura. Intenta hablar en voz alta siguiendo la palabra señalada.';

        const result: ReadingEvaluation = {
          transcript,
          overall_score:      overallScore,
          pronunciation_score: pronScore,
          grammar_score:      grammarScore,
          relevance_score:    relevanceScore,
          feedback:           feedbackText,
          evaluatedWords:     evalWords,
        };

        setEvaluation(result);

        // Yjs: publish results so students see the final scores and word alignment
        if (ydoc && isTeacher) {
          const yReading = ydoc.getMap<any>('activeReadingGame');
          ydoc.transact(() => {
            yReading.set('phase', 'results');
            yReading.set('liveWords', evalWords.map(ew => ({ text: ew.word, result: ew.status })));
            yReading.set('lastEvaluation', {
              overall_score:      result.overall_score,
              pronunciation_score: result.pronunciation_score,
              feedback:           result.feedback,
              transcript:         result.transcript,
            });
          });
        }

        // Update live words with final alignment
        setLiveWords(prev => prev.map((w, idx) => {
          if (idx > lastWordIdx) return { ...w, result: undefined };
          return { ...w, result: evalWords[idx]?.status === 'ok' ? 'ok' : 'bad' };
        }));

        setActiveTab('results');
        toast.success('¡Evaluación completada!');

        // Auto-start Pronunciation Trainer for bad words if any was pronounced
        const badItems: TrainerWordItem[] = evalWords
          .map((ew, i) => ({ word: ew.word, index: i }))
          .filter(item => item.word && evalWords[item.index]?.status === 'bad');
        if (badItems.length > 0 && okCount > 0) {
          startTrainer(badItems);
        }

        // Speak feedback with TTS
        speakTutorFeedback(result.feedback);

        // Persist to PostgreSQL
        if (sessionId) {
          api.post('/reading/attempts', {
            session_id:        sessionId,
            story_title:       storyTitle,
            story_text:        storyText,
            wpm_setting:       wpm,
            overall_score:     result.overall_score,
            pronunciation_score: result.pronunciation_score,
            feedback:          result.feedback,
            words_alignment:   evalWords,
          }).catch(err => console.warn('[reading] DB save failed:', err));
        }
      } else {
        throw new Error(res.data?.message || 'Respuesta de evaluación inválida');
      }
    } catch (err: any) {
      toast.dismiss('eval-toast');
      console.error('[reading] Evaluation fallback:', err);

      // Local fallback based on actual real-time speech recognition
      const words2 = storyText.trim().split(/\s+/).filter(Boolean);
      const evalWords = words2.map((w, idx) => {
        const liveRes = currentWordsRef.current[idx]?.result;
        return { word: w, status: (liveRes === 'ok' ? 'ok' : 'bad') as 'ok' | 'bad' };
      });
      const okCount = evalWords.filter(w => w.status === 'ok').length;
      const scoreCalc = Math.round((okCount / words2.length) * 100);

      setEvaluation({
        transcript: okCount > 0 ? 'Transcripción en tiempo real' : 'No se detectó voz',
        overall_score: scoreCalc,
        pronunciation_score: scoreCalc,
        feedback: okCount > 0
          ? `Completado con reconocimiento en tiempo real (${okCount}/${words2.length} palabras correctas).`
          : 'No se detectó pronunciación durante la lectura. Intenta hablar en voz alta al ritmo del teleprompter.',
        evaluatedWords: evalWords,
      });
      setActiveTab('results');
    } finally {
      setIsEvaluating(false);
    }
  }, [isEvaluating, stopPlayback, audioBlob, storyText, level, isSentenceMode, chunkSize, storyTitle, wpm, sessionId, ydoc, isTeacher]);

  // ─── TTS Functions ──────────────────────────────────────────────────────────

  const stopCurrentAudio = useCallback(() => {
    if (trainerAudioRef.current) {
      try {
        trainerAudioRef.current.pause();
        trainerAudioRef.current.currentTime = 0;
      } catch (_) {}
      trainerAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    setIsSpeakingTrainer(false);
  }, []);

  const speakTutorFeedback = useCallback(async (text: string) => {
    if (!text) return;
    stopCurrentAudio();
    try {
      const res = await api.post('/reading/tts', {
        text,
        voice: 'es-MX-DaliaNeural',
        rate:  '+0%',
        pitch: '+0Hz',
      }, { responseType: 'blob' });
      const url   = URL.createObjectURL(res.data);
      const audio = new Audio(url);
      trainerAudioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); trainerAudioRef.current = null; };
      audio.onerror = () => { URL.revokeObjectURL(url); trainerAudioRef.current = null; };
      await audio.play();
    } catch {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'es-ES';
        window.speechSynthesis.speak(u);
      }
    }
  }, [stopCurrentAudio]);

  const speakTargetWord = useCallback(async (word: string): Promise<void> => {
    if (!word) return;
    // Anti-cheat: Stop any active microphone listening immediately
    if (trainerRecRef.current) {
      try { trainerRecRef.current.abort(); } catch (_) {}
      trainerRecRef.current = null;
    }
    setTrainerIsListening(false);

    stopCurrentAudio();
    setIsSpeakingTrainer(true);
    try {
      const res = await api.post('/reading/tts', {
        text:  word,
        voice: 'en-US-JennyNeural',
        rate:  '+0%',
        pitch: '+0Hz',
      }, { responseType: 'blob' });
      const url   = URL.createObjectURL(res.data);
      const audio = new Audio(url);
      trainerAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        trainerAudioRef.current = null;
        setIsSpeakingTrainer(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        trainerAudioRef.current = null;
        setIsSpeakingTrainer(false);
      };
      await audio.play();
    } catch {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(word);
        u.lang = 'en-US';
        u.onend   = () => setIsSpeakingTrainer(false);
        u.onerror = () => setIsSpeakingTrainer(false);
        window.speechSynthesis.speak(u);
      } else {
        setIsSpeakingTrainer(false);
      }
    }
  }, [stopCurrentAudio]);

  // Alias for backward compat
  const speakTrainerWord = speakTargetWord;

  // ─── Pronunciation Trainer ──────────────────────────────────────────────────

  const startTrainer = useCallback((badWords: TrainerWordItem[]) => {
    if (badWords.length === 0) return;
    setTrainerWords(badWords);
    setTrainerCurrentIdx(0);
    setTrainerWord(badWords[0]?.word ?? null);
    setTrainerHeardText('');
    setTrainerFeedback(null);
    setTrainerIsListening(false);
    setShowTrainer(true);
  }, []);

  const closeTrainer = useCallback(() => {
    stopCurrentAudio();
    if (trainerRecRef.current) {
      try { trainerRecRef.current.stop(); } catch (_) {}
      trainerRecRef.current = null;
    }
    setShowTrainer(false);
    setTrainerIsListening(false);
    setTrainerHeardText('');
    setTrainerFeedback(null);
  }, [stopCurrentAudio]);

  const trainerNext = useCallback(() => {
    setTrainerCurrentIdx(prev => {
      const next = prev + 1;
      if (next >= trainerWords.length) {
        closeTrainer();
        return prev;
      }
      setTrainerWord(trainerWords[next]?.word ?? null);
      setTrainerHeardText('');
      setTrainerFeedback(null);
      stopCurrentAudio();
      return next;
    });
  }, [trainerWords, closeTrainer, stopCurrentAudio]);

  const stopTrainerListening = useCallback(() => {
    if (trainerTimeoutRef.current) {
      clearTimeout(trainerTimeoutRef.current);
      trainerTimeoutRef.current = null;
    }
    if (trainerRecRef.current) {
      try { trainerRecRef.current.abort(); } catch (_) {}
      trainerRecRef.current = null;
    }
    if (trainerRecorderRef.current && trainerRecorderRef.current.state === 'recording') {
      try { trainerRecorderRef.current.stop(); } catch (_) {}
    }
    setTrainerIsListening(false);
  }, []);

  const startTrainerListening = useCallback(async () => {
    if (isSpeakingTrainer) return;

    stopCurrentAudio();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }
    if (trainerRecRef.current) {
      try { trainerRecRef.current.abort(); } catch (_) {}
      trainerRecRef.current = null;
    }
    if (trainerRecorderRef.current && trainerRecorderRef.current.state === 'recording') {
      try { trainerRecorderRef.current.stop(); } catch (_) {}
      trainerRecorderRef.current = null;
    }
    if (trainerStreamRef.current) {
      trainerStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
      trainerStreamRef.current = null;
    }

    setTrainerIsListening(true);
    setTrainerHeardText('');
    setTrainerFeedback(null);
    isEvaluatingTrainerRef.current = false;

    const targetWord = trainerWords[trainerCurrentIdx]?.word ?? '';
    const normTarget = normalizeWord(targetWord);
    let matched = false;

    // ── 1. Local MediaRecorder with Groq Whisper Fallback ──
    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      trainerStreamRef.current = micStream;
      trainerChunksRef.current = [];
      const mimeType = pickMimeType() || 'audio/webm';
      const recorder = new MediaRecorder(micStream, { mimeType });
      trainerRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) trainerChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        micStream?.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
        trainerStreamRef.current = null;

        if (matched || isEvaluatingTrainerRef.current) return;
        isEvaluatingTrainerRef.current = true;

        if (trainerChunksRef.current.length > 0) {
          const blob = new Blob(trainerChunksRef.current, { type: mimeType });
          try {
            const fd = new FormData();
            fd.append('audio', blob, 'trainer.webm');
            fd.append('expected_answer', targetWord);
            const res = await api.post('/reading/evaluate', fd);
            const transcript = res.data?.evaluation?.transcript || '';
            if (transcript) {
              setTrainerHeardText(transcript);
              const wordsHeard: string[] = transcript.toLowerCase().split(/\s+/).map((w: string) => normalizeWord(w)).filter(Boolean);
              const isMatch = wordsHeard.some((w: string) => w === normTarget || (w.length > 2 && normTarget.length > 2 && (w.includes(normTarget) || normTarget.includes(w))));
              if (isMatch) {
                matched = true;
                setTrainerFeedback('correct');
                setEvaluation(prev => {
                  if (!prev) return prev;
                  const updated = [...prev.evaluatedWords];
                  const idx = trainerWords[trainerCurrentIdx]?.index ?? -1;
                  if (idx >= 0 && updated[idx]) updated[idx] = { ...updated[idx], status: 'ok' };
                  return { ...prev, evaluatedWords: updated };
                });
                setTimeout(() => {
                  stopTrainerListening();
                  trainerNext();
                }, 1200);
                return;
              } else {
                setTrainerFeedback('wrong');
              }
            }
          } catch (serverErr) {
            console.warn('[trainer] Server Groq evaluation error:', serverErr);
          }
        }
        setTrainerIsListening(false);
      };

      recorder.start(100);
    } catch (micErr) {
      console.warn('[trainer] MediaRecorder getUserMedia failed:', micErr);
    }

    // ── 2. Realtime Browser Speech Recognition (Fast Path) ──
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.maxAlternatives = 3;
        trainerRecRef.current = rec;

        rec.onresult = (event: any) => {
          let heard = '';
          for (let i = 0; i < event.results.length; i++) {
            heard += event.results[i][0].transcript + ' ';
          }
          heard = heard.trim();
          setTrainerHeardText(heard);

          const wordsHeard: string[] = heard.toLowerCase().split(/\s+/).map((w: string) => normalizeWord(w)).filter(Boolean);
          const match = wordsHeard.some((w: string) => w === normTarget || (w.length > 2 && normTarget.length > 2 && (w.includes(normTarget) || normTarget.includes(w))));

          if (match && !matched) {
            matched = true;
            setTrainerFeedback('correct');
            setEvaluation(prev => {
              if (!prev) return prev;
              const updated = [...prev.evaluatedWords];
              const idx = trainerWords[trainerCurrentIdx]?.index ?? -1;
              if (idx >= 0 && updated[idx]) updated[idx] = { ...updated[idx], status: 'ok' };
              return { ...prev, evaluatedWords: updated };
            });
            setTimeout(() => {
              stopTrainerListening();
              trainerNext();
            }, 1200);
          }
        };

        rec.onerror = (e: any) => {
          // If network error in browser speech recognition, do not abort; MediaRecorder handles it!
          console.warn('[trainer] SpeechRecognition error (using MediaRecorder fallback):', e.error);
        };

        rec.onend = () => {
          if (!matched && (!trainerRecorderRef.current || trainerRecorderRef.current.state === 'inactive')) {
            setTrainerIsListening(false);
          }
        };

        rec.start();
      } catch (recErr) {
        console.warn('[trainer] SpeechRecognition start failed:', recErr);
      }
    }

    // Auto-stop after 4 seconds to evaluate audio with Groq Whisper if no immediate browser match
    trainerTimeoutRef.current = setTimeout(() => {
      if (!matched) {
        stopTrainerListening();
      }
    }, 4000);
  }, [trainerWords, trainerCurrentIdx, trainerNext, stopCurrentAudio, stopTrainerListening, isSpeakingTrainer]);

  // ─── History ────────────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    if (!sessionId) return;
    setIsLoadingHistory(true);
    try {
      const res = await api.get(`/reading/attempts/session/${sessionId}`);
      if (res.data?.success) setHistory(res.data.attempts || []);
    } catch (err) {
      console.warn('[reading] Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [sessionId]);

  const reuseHistoryItem = useCallback((item: ReadingAttemptHistory) => {
    if (item.story_title) setStoryTitle(item.story_title);
    if (item.story_text) setStoryText(item.story_text);
    if (item.wpm_setting) setWpm(item.wpm_setting);
    setActiveTab('config');
    toast.success('Lectura cargada desde el historial');
  }, []);

  const deleteHistoryItem = useCallback(async (id?: number) => {
    if (!id) return;
    try {
      const res = await api.delete(`/reading/attempts/${id}`);
      if (res.data?.success) {
        setHistory(prev => prev.filter(item => item.id !== id));
        toast.success('Intento eliminado de Supabase');
      } else {
        toast.error('No se pudo eliminar el intento');
      }
    } catch (err: any) {
      console.error('[reading] Delete attempt error:', err);
      toast.error('Error al eliminar intento: ' + err.message);
    }
  }, []);

  useEffect(() => {
    if (showReadingGamePanel && activeTab === 'history') loadHistory();
  }, [showReadingGamePanel, activeTab, loadHistory]);

  /**
   * Student observer: subscribe to Yjs activeReadingGame map and update local
   * remote* state so ReadingGameSpectatorPanel can render the live game.
   */
  useEffect(() => {
    if (!ydoc || isTeacher) return;

    const yReading = ydoc.getMap<any>('activeReadingGame');

    const handleReadingChange = () => {
      const phase    = yReading.get('phase')           as string | undefined;
      const sText    = yReading.get('storyText')       as string | undefined;
      const sTitle   = yReading.get('storyTitle')      as string | undefined;
      const wordIdx  = yReading.get('activeWordIndex') as number | undefined;
      const cd       = yReading.get('countdown')       as number | null;
      const words    = yReading.get('liveWords')       as { text: string; result?: 'ok' | 'bad' }[] | undefined;
      const evalData = yReading.get('lastEvaluation')  as any;

      if (phase !== undefined)   setRemotePhase(phase as any);
      if (sText !== undefined)   setRemoteStoryText(sText);
      if (sTitle !== undefined)  setRemoteStoryTitle(sTitle);
      if (wordIdx !== undefined) setRemoteActiveWordIndex(wordIdx);
      setRemoteCountdown(cd ?? null);
      if (words !== undefined)   setRemoteLiveWords(words);
      setRemoteLastEvaluation(evalData ?? null);
    };

    yReading.observe(handleReadingChange);
    handleReadingChange(); // sync current state on mount (student joins mid-game)

    return () => {
      yReading.unobserve(handleReadingChange);
    };
  }, [ydoc, isTeacher]);

  // ─── Return API ─────────────────────────────────────────────────────────────


  return {
    // Panel visibility
    showReadingGamePanel,
    setShowReadingGamePanel,
    activeTab,
    setActiveTab,

    // Config
    storyTitle, setStoryTitle,
    storyText,  setStoryText,
    level,      setLevel,
    topic,      setTopic,
    wpm,        setWpm,
    isSentenceMode,   setIsSentenceMode,
    chunkSize,        setChunkSize,
    useSystemAudio,   setUseSystemAudio,

    // Story generation
    isGeneratingStory,
    generateStory,

    // Playing
    isPlaying,
    activeWordIndex,
    recordingSeconds,
    liveWords,
    countdown,
    isSentencePaused,
    advanceChunk,

    // Evaluation
    isEvaluating,
    evaluation,
    startGame,
    stopAndEvaluate,

    // TTS
    speakTargetWord,
    speakTrainerWord,
    speakTutorFeedback,
    isSpeakingTrainer,

    // Pronunciation Trainer
    showTrainer,
    trainerWords,
    trainerCurrentIdx,
    trainerWord, setTrainerWord,
    trainerHeardText,
    trainerFeedback,
    trainerIsListening,
    startTrainer,
    closeTrainer,
    trainerNext,
    startTrainerListening,
    stopTrainerListening,

    // History
    history,
    isLoadingHistory,
    loadHistory,
    reuseHistoryItem,
    deleteHistoryItem,

    // Student spectator state (synced from Yjs when !isTeacher)
    remotePhase,
    remoteStoryText,
    remoteStoryTitle,
    remoteActiveWordIndex,
    remoteCountdown,
    remoteLiveWords,
    remoteLastEvaluation,
  };
}
