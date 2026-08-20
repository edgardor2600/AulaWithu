import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: number;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'listening' | 'speaking' | 'listening_extenso';
  question: string;
  sentence?: string;
  options?: string[];
  correct?: string | number;
  explanation?: string;
  image_prompt?: string;
  // listening_extenso only
  story?: {
    title: string;
    paragraphs: { id: number; text: string; image_prompt?: string }[];
  };
  questions?: QuizQuestion[]; // sub-questions in listening_extenso
}

export interface Quiz {
  id?: number;
  title?: string;
  activity_name?: string;
  subject?: string;
  level?: string;
  topic?: string;
  questions: QuizQuestion[];
  created_at?: string;
}

export interface QuizSummary {
  id: number;
  title: string;
  subject: string;
  level: string;
  topic: string;
  created_at: string;
}

export interface StudentProgress {
  clientId: string;
  name: string;
  hasAnswered: boolean;
  score: number;
}

export interface AnswerRecord {
  questionId: number;
  answer: string | number;
  isCorrect: boolean;
  score: number;
}

const QUESTION_TIME_LIMIT = 30; // seconds per question by default

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuizGame(
  ydoc: Y.Doc | null,
  isTeacher: boolean,
  sessionId: string
) {
  // Panel visibility
  const [showQuizCreator, setShowQuizCreator] = useState(false);

  // Generation config
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('English');
  const [level, setLevel] = useState('A2');
  const [count, setCount] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<string[]>(['multiple_choice', 'true_false', 'fill_blank']);

  // Generated / loaded quiz
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Library
  const [savedQuizzes, setSavedQuizzes] = useState<QuizSummary[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Runtime (Yjs-synced)
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(0);
  const [questionTimeLimit, setQuestionTimeLimit] = useState(QUESTION_TIME_LIMIT);

  // Student state
  const [myAnswers, setMyAnswers] = useState<Record<number, AnswerRecord>>({});
  const [myScore, setMyScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<string | number | null>(null);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState<{ isCorrect: boolean; explanation: string } | null>(null);

  // Teacher monitoring
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [sessionResults, setSessionResults] = useState<any[]>([]);

  // TTS
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Speech recognition (for speaking type questions)
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');

  // Yjs refs
  const yQuizRef = useRef<Y.Map<any> | null>(null);
  const yAnswersRef = useRef<Y.Map<any> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Yjs: Sync quiz state across participants ──────────────────────────────

  useEffect(() => {
    if (!ydoc) return;

    const yQuiz = ydoc.getMap('activeQuiz');
    const yAnswers = ydoc.getMap('quizAnswers');
    yQuizRef.current = yQuiz;
    yAnswersRef.current = yAnswers;

    const handleQuizUpdate = () => {
      const active = yQuiz.get('active') as boolean | undefined;
      const quiz = yQuiz.get('quiz') as Quiz | undefined;
      const qIndex = yQuiz.get('questionIndex') as number | undefined;
      const tLimit = (yQuiz.get('questionTimeLimit') as number | undefined) ?? QUESTION_TIME_LIMIT;
      const qStarted = (yQuiz.get('questionStartedAt') as number | undefined) ?? 0;

      setIsQuizActive(!!active);
      setActiveQuiz(quiz ?? null);
      if (typeof qIndex === 'number') {
        setCurrentQuestionIndex(qIndex);
        setHasAnsweredCurrent(false);
        setPendingAnswer(null);
        setLastAnswerFeedback(null);
      }
      setQuestionTimeLimit(tLimit);
      setQuestionStartedAt(qStarted);
    };

    const handleAnswersUpdate = () => {
      // Update teacher's view of student progress
      if (isTeacher) {
        const progress: StudentProgress[] = [];
        yAnswers.forEach((rawVal: unknown, key: string) => {
          const val = rawVal as Record<string, any>;
          if (key.includes('_')) {
            const [clientId] = key.split('_');
            const existing = progress.find(p => p.clientId === clientId);
            if (!existing) {
              progress.push({
                clientId,
                name: (val?.name as string) || clientId,
                hasAnswered: true,
                score: (val?.score as number) || 0,
              });
            }
          }
        });
        setStudentProgress(progress);
      }
    };

    yQuiz.observe(handleQuizUpdate);
    yAnswers.observe(handleAnswersUpdate);

    // Load current state immediately
    handleQuizUpdate();

    return () => {
      yQuiz.unobserve(handleQuizUpdate);
      yAnswers.unobserve(handleAnswersUpdate);
    };
  }, [ydoc, isTeacher]);

  // ─── Timer: Count down per question ───────────────────────────────────────

  useEffect(() => {
    if (!isQuizActive || !questionStartedAt) return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartedAt) / 1000);
      const remaining = Math.max(0, questionTimeLimit - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
    }, 500);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isQuizActive, questionStartedAt, questionTimeLimit]);

  // ─── TTS (reutilizar /api/conversation/tts — mismo patrón que useReadingGame) ─

  const stopSpeaking = useCallback(() => {
    try { audioSourceRef.current?.stop(); } catch (_) {}
    audioSourceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(async (text: string) => {
    if (!text?.trim()) return;
    stopSpeaking();
    setIsSpeaking(true);
    try {
      const response = await api.get('/conversation/tts', {
        params: { text: text.trim(), voice: 'female-yuqi', speed: 0.95 },
        responseType: 'arraybuffer',
      });
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();
      const decoded = await ctx.decodeAudioData(response.data as ArrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      audioSourceRef.current = source;
      source.start();
    } catch (err) {
      console.error('[useQuizGame] TTS error:', err);
      setIsSpeaking(false);
    }
  }, [stopSpeaking]);

  const speakQuestion = useCallback(async (text: string) => {
    await speakText(text);
  }, [speakText]);

  // ─── Speech Recognition (for speaking type questions) ─────────────────────

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Tu navegador no soporta reconocimiento de voz'); return; }

    const rec = new SR();
    rec.lang = (subject.toLowerCase().includes('english')) ? 'en-US' : 'es-ES';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      setSpokenText(transcript);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    setSpokenText('');
    rec.start();
    setIsListening(true);
  }, [subject]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ─── Evaluate answer locally ───────────────────────────────────────────────

  const checkAnswer = useCallback((question: QuizQuestion, answer: string | number): { isCorrect: boolean; score: number } => {
    if (question.correct === undefined || question.correct === null) return { isCorrect: false, score: 0 };

    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      const isCorrect = Number(answer) === Number(question.correct);
      return { isCorrect, score: isCorrect ? 100 : 0 };
    }

    if (question.type === 'fill_blank' || question.type === 'listening') {
      const expected = String(question.correct).toLowerCase().trim();
      const given = String(answer).toLowerCase().trim();
      const isCorrect = given === expected || given.includes(expected) || expected.includes(given);
      return { isCorrect, score: isCorrect ? 100 : 0 };
    }

    if (question.type === 'speaking') {
      // Fuzzy match: check if spoken text contains the key words of correct answer
      const expected = String(question.correct).toLowerCase().trim();
      const given = String(answer).toLowerCase().trim();
      const expectedWords = expected.split(/\s+/).filter(w => w.length > 2);
      const matchCount = expectedWords.filter(w => given.includes(w)).length;
      const ratio = expectedWords.length > 0 ? matchCount / expectedWords.length : 0;
      const isCorrect = ratio >= 0.7;
      return { isCorrect, score: Math.round(ratio * 100) };
    }

    return { isCorrect: false, score: 0 };
  }, []);

  // ─── Student: submit answer ───────────────────────────────────────────────

  const submitAnswer = useCallback((questionId: number, answer: string | number, clientId?: string, userName?: string) => {
    if (!activeQuiz) return;
    const question = activeQuiz.questions.find(q => q.id === questionId);
    if (!question) return;

    const { isCorrect, score } = checkAnswer(question, answer);

    const record: AnswerRecord = { questionId, answer, isCorrect, score };
    setMyAnswers(prev => ({ ...prev, [questionId]: record }));
    setHasAnsweredCurrent(true);
    setLastAnswerFeedback({ isCorrect, explanation: question.explanation || '' });

    // Update Yjs so teacher can see progress
    const yAnswers = yAnswersRef.current;
    if (yAnswers && clientId) {
      ydoc?.transact(() => {
        yAnswers.set(`${clientId}_${questionId}`, {
          answer,
          isCorrect,
          score,
          name: userName || clientId,
          clientId,
          questionId,
        });
      });
    }

    // Update local score
    if (isCorrect) {
      setMyScore(prev => prev + score);
    }
  }, [activeQuiz, checkAnswer, ydoc]);

  // ─── Teacher: launch quiz ─────────────────────────────────────────────────

  const launchQuiz = useCallback((quiz: Quiz) => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) { toast.error('No hay conexión Yjs activa'); return; }

    ydoc?.transact(() => {
      yQuiz.set('quiz', quiz);
      yQuiz.set('questionIndex', 0);
      yQuiz.set('questionTimeLimit', QUESTION_TIME_LIMIT);
      yQuiz.set('questionStartedAt', Date.now());
      yQuiz.set('active', true);
    });

    // Clear previous answers
    const yAnswers = yAnswersRef.current;
    if (yAnswers) {
      ydoc?.transact(() => {
        yAnswers.forEach((_, key) => yAnswers.delete(key));
      });
    }

    setStudentProgress([]);
    toast.success('Quiz lanzado en vivo');
  }, [ydoc]);

  const stopQuiz = useCallback(() => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;
    ydoc?.transact(() => {
      yQuiz.set('active', false);
    });
    toast('Quiz finalizado');
  }, [ydoc]);

  const skipToNextQuestion = useCallback(() => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz || !activeQuiz) return;
    const next = currentQuestionIndex + 1;
    if (next >= activeQuiz.questions.length) {
      stopQuiz();
      return;
    }
    ydoc?.transact(() => {
      yQuiz.set('questionIndex', next);
      yQuiz.set('questionStartedAt', Date.now());
    });
  }, [ydoc, activeQuiz, currentQuestionIndex, stopQuiz]);

  // ─── Generate quiz ────────────────────────────────────────────────────────

  const generateQuiz = useCallback(async () => {
    if (!topic.trim()) { toast.error('Ingresa el tema del quiz'); return; }
    setIsGenerating(true);
    setGeneratedQuiz(null);
    try {
      const res = await api.post('/quiz/generate', {
        topic: topic.trim(),
        subject,
        level,
        count: Math.max(1, Math.min(30, count)),
        question_types: questionTypes,
      }, { timeout: 180000 });
      if (res.data?.ok && res.data?.quiz) {
        setGeneratedQuiz(res.data.quiz);
        toast.success(`Quiz generado: ${res.data.quiz.questions?.length || 0} preguntas (${res.data.provider})`);
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (err: any) {
      toast.error('Error al generar el quiz: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsGenerating(false);
    }
  }, [topic, subject, level, count, questionTypes]);

  // ─── Library ──────────────────────────────────────────────────────────────

  const loadLibrary = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await api.get('/quiz/materials');
      if (res.data?.ok) setSavedQuizzes(res.data.quizzes || []);
    } catch (err: any) {
      toast.error('Error al cargar la biblioteca de quizzes');
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  const saveToLibrary = useCallback(async (quiz?: Quiz) => {
    const q = quiz || generatedQuiz;
    if (!q) { toast.error('No hay quiz para guardar'); return; }
    try {
      const res = await api.post('/quiz/materials', {
        title: q.activity_name || q.title || `Quiz: ${topic}`,
        subject,
        level,
        topic: topic || q.topic || 'General',
        questions_json: q.questions,
      });
      if (res.data?.ok) {
        toast.success('Quiz guardado en biblioteca');
        loadLibrary();
      }
    } catch (err: any) {
      toast.error('Error al guardar el quiz');
    }
  }, [generatedQuiz, subject, level, topic, loadLibrary]);

  const loadQuizById = useCallback(async (id: number): Promise<Quiz | null> => {
    try {
      const res = await api.get(`/quiz/materials/${id}`);
      if (res.data?.ok && res.data?.quiz) return res.data.quiz as Quiz;
      return null;
    } catch { return null; }
  }, []);

  const deleteQuiz = useCallback(async (id: number) => {
    try {
      await api.delete(`/quiz/materials/${id}`);
      setSavedQuizzes(prev => prev.filter(q => q.id !== id));
      toast.success('Quiz eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar el quiz');
    }
  }, []);

  // ─── Submit student results to server ─────────────────────────────────────

  const submitResults = useCallback(async (quizId: number, clientId: string, userName: string) => {
    try {
      const answers = Object.values(myAnswers);
      const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
      const avgScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;

      await api.post('/quiz/submit-result', {
        quiz_id: quizId,
        session_id: sessionId,
        student_id: clientId,
        student_name: userName,
        score: avgScore,
        total_questions: answers.length,
        answers_json: answers,
      });
      setShowResults(true);
    } catch (err: any) {
      console.error('[useQuizGame] submitResults error:', err);
    }
  }, [myAnswers, sessionId]);

  const getResults = useCallback(async (quizId: number) => {
    try {
      const res = await api.get(`/quiz/results/${quizId}/session/${sessionId}`);
      if (res.data?.ok) setSessionResults(res.data.results || []);
    } catch (err) {
      console.error('[useQuizGame] getResults error:', err);
    }
  }, [sessionId]);

  // Load library when creator opens
  useEffect(() => {
    if (showQuizCreator) loadLibrary();
  }, [showQuizCreator, loadLibrary]);

  return {
    // Panel
    showQuizCreator, setShowQuizCreator,

    // Config
    topic, setTopic,
    subject, setSubject,
    level, setLevel,
    count, setCount,
    questionTypes, setQuestionTypes,

    // Generation
    generatedQuiz, setGeneratedQuiz,
    isGenerating,
    generateQuiz,

    // Library
    savedQuizzes,
    isLoadingLibrary,
    loadLibrary,
    saveToLibrary,
    loadQuizById,
    deleteQuiz,

    // Runtime (Yjs-synced)
    activeQuiz,
    currentQuestionIndex,
    isQuizActive,
    timeLeft,
    questionTimeLimit,

    // Student
    myAnswers,
    myScore,
    showResults, setShowResults,
    pendingAnswer, setPendingAnswer,
    hasAnsweredCurrent,
    lastAnswerFeedback,
    spokenText, setSpokenText,
    submitAnswer,
    submitResults,

    // Teacher
    studentProgress,
    sessionResults,
    launchQuiz,
    stopQuiz,
    skipToNextQuestion,
    getResults,

    // TTS
    isSpeaking,
    speakQuestion,
    stopSpeaking,

    // Speech recognition
    isListening,
    startListening,
    stopListening,
  };
}
