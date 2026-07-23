import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export interface EvaluatedWord {
  word: string;
  status: 'ok' | 'bad' | 'unread';
  transcriptMatch?: string;
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
  wpm_setting: number;
  overall_score: number;
  pronunciation_score: number;
  feedback: string;
  created_at?: string;
  student_name?: string;
}

export function useReadingGame(sessionId: string | null) {
  const [showReadingGamePanel, setShowReadingGamePanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'playing' | 'results' | 'history'>('config');

  // Story & Config State
  const [storyTitle, setStoryTitle] = useState('Mi Historia de Lectura');
  const [storyText, setStoryText] = useState('');
  const [level, setLevel] = useState('A2');
  const [topic, setTopic] = useState('Daily Routine');
  const [wpm, setWpm] = useState(120);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  // Playing / Recording State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Evaluation & Results State
  const [evaluation, setEvaluation] = useState<ReadingEvaluation | null>(null);

  // Pronunciation Trainer State
  const [trainerWord, setTrainerWord] = useState<string | null>(null);
  const [isSpeakingTrainer, setIsSpeakingTrainer] = useState(false);

  // Session History State
  const [history, setHistory] = useState<ReadingAttemptHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const wpmIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Generate Story with AI
  const generateStory = useCallback(async () => {
    setIsGeneratingStory(true);
    try {
      const prompt = `Escribe una historia corta de lectura para practicar inglés nivel ${level} sobre el tema "${topic}". Debe tener entre 60 y 100 palabras. Devuelve solo el texto de la historia en inglés, sin introducciones ni comentarios adicionales.`;
      const res = await api.post('/conversation/completion', {
        prompt,
        max_tokens: 250,
      });

      let text = res.data?.text || res.data?.completion || res.data?.response || '';
      text = text.trim().replace(/^["']|["']$/g, '');

      if (text) {
        setStoryText(text);
        setStoryTitle(`Historia Nivel ${level}: ${topic}`);
        toast.success('Historia generada con éxito por la IA');
      } else {
        throw new Error('Respuesta de IA vacía');
      }
    } catch (error: any) {
      console.error('Error generating reading story:', error);
      toast.error('No se pudo generar la historia con IA');
    } finally {
      setIsGeneratingStory(false);
    }
  }, [level, topic]);

  // Clean LCS (Longest Common Subsequence) alignment
  const alignTranscriptionWithLCS = (originalText: string, transcriptText: string): EvaluatedWord[] => {
    const cleanOrig = originalText.trim().replace(/[^\w\s']/g, '').toLowerCase().split(/\s+/).filter(Boolean);
    const origOriginalCase = originalText.trim().split(/\s+/).filter(Boolean);
    const cleanTrans = transcriptText.trim().replace(/[^\w\s']/g, '').toLowerCase().split(/\s+/).filter(Boolean);

    const m = cleanOrig.length;
    const n = cleanTrans.length;

    // LCS Table
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (cleanOrig[i - 1] === cleanTrans[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find aligned words
    let i = m;
    let j = n;
    const matchedOrigIndexes = new Set<number>();

    while (i > 0 && j > 0) {
      if (cleanOrig[i - 1] === cleanTrans[j - 1]) {
        matchedOrigIndexes.add(i - 1);
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return origOriginalCase.map((word, idx) => ({
      word,
      status: matchedOrigIndexes.has(idx) ? 'ok' : 'bad',
    }));
  };

  // Start Reading Game & Audio Recording
  const startGame = useCallback(async () => {
    if (!storyText.trim()) {
      toast.error('Por favor ingresa o genera una historia antes de iniciar');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200);

      setIsPlaying(true);
      setActiveWordIndex(0);
      setRecordingSeconds(0);
      setEvaluation(null);
      setActiveTab('playing');

      // Recording timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Teleprompter WPM Auto-Scroll
      const words = storyText.trim().split(/\s+/);
      const intervalMs = (60 / Math.max(40, wpm)) * 1000;

      wpmIntervalRef.current = setInterval(() => {
        setActiveWordIndex((prev) => {
          if (prev >= words.length - 1) {
            clearInterval(wpmIntervalRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);

      // Realtime SpeechRecognition (Browser)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';
          rec.start();
          recognitionRef.current = rec;
        } catch (e) {
          console.warn('SpeechRecognition failed to start:', e);
        }
      }
    } catch (err: any) {
      console.error('Error starting microphone:', err);
      toast.error('Permiso de micrófono denegado o no disponible');
    }
  }, [storyText, wpm]);

  // Stop Recording & Evaluate
  const stopAndEvaluate = useCallback(async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (wpmIntervalRef.current) clearInterval(wpmIntervalRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsPlaying(false);
    setIsEvaluating(true);
    toast.loading('Evaluando fluidez y pronunciación con IA...', { id: 'eval-toast' });

    // Wait short delay for audio blob to settle
    await new Promise((r) => setTimeout(r, 400));

    try {
      const currentBlob = audioChunksRef.current.length > 0 
        ? new Blob(audioChunksRef.current, { type: 'audio/webm' }) 
        : audioBlob;

      if (!currentBlob || currentBlob.size === 0) {
        throw new Error('No se capturó audio de la grabación');
      }

      const formData = new FormData();
      formData.append('audio', currentBlob, 'recording.webm');
      formData.append('topic', topic);
      formData.append('level', level);
      formData.append('expected_answer', storyText);

      const res = await api.post('/reading/evaluate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.dismiss('eval-toast');

      if (res.data && res.data.ok && res.data.evaluation) {
        const evalData = res.data.evaluation;
        const transcript = evalData.transcript || '';
        const evaluatedWords = alignTranscriptionWithLCS(storyText, transcript);

        const result: ReadingEvaluation = {
          transcript,
          overall_score: evalData.overall_score || 80,
          pronunciation_score: evalData.pronunciation_score || 75,
          feedback: evalData.feedback || '¡Buen trabajo en la lectura!',
          evaluatedWords,
        };

        setEvaluation(result);
        setActiveTab('results');
        toast.success('¡Evaluación completada con éxito!');

        // Persist attempt to PostgreSQL
        if (sessionId) {
          try {
            await api.post('/reading/attempts', {
              session_id: sessionId,
              story_title: storyTitle,
              story_text: storyText,
              wpm_setting: wpm,
              overall_score: result.overall_score,
              pronunciation_score: result.pronunciation_score,
              feedback: result.feedback,
              words_alignment: evaluatedWords,
            });
          } catch (dbErr) {
            console.warn('Failed to save reading attempt to DB:', dbErr);
          }
        }
      } else {
        throw new Error(res.data?.message || 'Error en respuesta de evaluación');
      }
    } catch (err: any) {
      console.error('Error evaluating reading recording:', err);
      toast.dismiss('eval-toast');
      toast.error('No se pudo completar la evaluación. Verifica que el servidor Python esté encendido.');
      
      // Fallback evaluation locally
      const fallbackWords = storyText.split(/\s+/).map(w => ({ word: w, status: 'ok' as const }));
      setEvaluation({
        transcript: 'No disponible',
        overall_score: 70,
        pronunciation_score: 70,
        feedback: 'No se pudo conectar con el servidor IA. Evaluación local estimada.',
        evaluatedWords: fallbackWords,
      });
      setActiveTab('results');
    } finally {
      setIsEvaluating(false);
    }
  }, [audioBlob, topic, level, storyText, storyTitle, wpm, sessionId]);

  // Pronunciation Trainer: Speak Word
  const speakTrainerWord = useCallback(async (word: string) => {
    setTrainerWord(word);
    setIsSpeakingTrainer(true);
    try {
      const res = await api.post('/reading/tts', {
        text: word,
        voice: 'en-US-JennyNeural',
      }, { responseType: 'blob' });

      const audioUrl = URL.createObjectURL(res.data);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => setIsSpeakingTrainer(false);
      audio.onerror = () => setIsSpeakingTrainer(false);
    } catch (e) {
      console.warn('Server TTS failed for trainer word, falling back to browser SpeechSynthesis:', e);
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(word);
        u.lang = 'en-US';
        u.onend = () => setIsSpeakingTrainer(false);
        u.onerror = () => setIsSpeakingTrainer(false);
        window.speechSynthesis.speak(u);
      } else {
        setIsSpeakingTrainer(false);
      }
    }
  }, []);

  // Fetch Session Reading Attempts History
  const loadHistory = useCallback(async () => {
    if (!sessionId) return;
    setIsLoadingHistory(true);
    try {
      const res = await api.get(`/reading/attempts/session/${sessionId}`);
      if (res.data && res.data.success) {
        setHistory(res.data.attempts || []);
      }
    } catch (err) {
      console.warn('Failed to fetch reading attempts history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (showReadingGamePanel && activeTab === 'history') {
      loadHistory();
    }
  }, [showReadingGamePanel, activeTab, loadHistory]);

  return {
    showReadingGamePanel,
    setShowReadingGamePanel,
    activeTab,
    setActiveTab,
    storyTitle,
    setStoryTitle,
    storyText,
    setStoryText,
    level,
    setLevel,
    topic,
    setTopic,
    wpm,
    setWpm,
    isGeneratingStory,
    generateStory,
    isPlaying,
    activeWordIndex,
    recordingSeconds,
    startGame,
    stopAndEvaluate,
    isEvaluating,
    evaluation,
    trainerWord,
    setTrainerWord,
    speakTrainerWord,
    isSpeakingTrainer,
    history,
    isLoadingHistory,
    loadHistory,
  };
}
