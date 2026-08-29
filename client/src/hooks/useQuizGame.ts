import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Q-01 — Phase FSM for the quiz session (synced via Yjs).
 *   idle       → no quiz running
 *   lobby      → quiz selected, waiting for students
 *   question   → question visible, timer running, students can answer
 *   reveal     → correct answer revealed, scoring computed
 *   leaderboard→ intermediate leaderboard shown
 *   podium     → final podium / end screen
 */
export type QuizPhase = 'idle' | 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'podium';

export interface QuizQuestion {
  id: number;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'listening' | 'speaking' | 'listening_extenso';
  question: string;
  sentence?: string;
  options?: string[];
  correct?: string | number;
  explanation?: string;
  image_prompt?: string;
  story?: {
    title: string;
    paragraphs: { id: number; text: string; image_prompt?: string }[];
  };
  questions?: QuizQuestion[];
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
  submittedAt?: number;
}

export interface RevealedAnswer {
  questionId: number;
  correct: string | number;
  explanation: string;
}

const QUESTION_TIME_LIMIT = 30;

// ─── Q-02: Anti-Cheat Helper ──────────────────────────────────────────────────

function sanitizeQuizForBroadcast(quiz: Quiz): Quiz {
  return {
    ...quiz,
    questions: quiz.questions.map(({ correct: _c, explanation: _e, ...rest }) => rest as QuizQuestion),
  };
}

// ─── Q-03: Temporal-Decay Scoring Engine ──────────────────────────────────────

function computeTimedScore(elapsedMs: number, timeLimitSec: number, streak: number): number {
  const elapsed = elapsedMs / 1000;
  const timeRatio = Math.max(0.3, 1 - elapsed / Math.max(1, timeLimitSec));
  const streakMultiplier = Math.min(2.0, 1 + streak * 0.1);
  return Math.floor(1000 * timeRatio * streakMultiplier);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuizGame(
  ydoc: Y.Doc | null,
  isTeacher: boolean,
  sessionId: string
) {
  const [showQuizCreator, setShowQuizCreator] = useState(false);

  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('English');
  const [level, setLevel] = useState('A2');
  const [count, setCount] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<string[]>(['multiple_choice', 'true_false', 'fill_blank']);

  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [savedQuizzes, setSavedQuizzes] = useState<QuizSummary[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Q-01: Phase FSM
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('idle');
  const isQuizActive = quizPhase !== 'idle';

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(0);
  const [questionTimeLimit, setQuestionTimeLimit] = useState(QUESTION_TIME_LIMIT);

  // Q-02: Revealed answer
  const [revealedAnswer, setRevealedAnswer] = useState<RevealedAnswer | null>(null);

  const [myAnswers, setMyAnswers] = useState<Record<number, AnswerRecord>>({});
  const [myScore, setMyScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<string | number | null>(null);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState<{
    isCorrect: boolean;
    explanation: string;
    score?: number;
  } | null>(null);

  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [sessionResults, setSessionResults] = useState<any[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');

  const yQuizRef = useRef<Y.Map<any> | null>(null);
  const yAnswersRef = useRef<Y.Map<any> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Q-02: Teacher local full quiz (with answers)
  const localFullQuizRef = useRef<Quiz | null>(null);

  // Q-03: Scoring timestamps
  const myClientIdRef = useRef<string | undefined>(undefined);
  const answerSubmittedAtRef = useRef<number>(0);

  const prevQuestionIndexRef = useRef<number>(-1);

  // ─── Yjs Sync ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!ydoc) return;

    const yQuiz = ydoc.getMap('activeQuiz');
    const yAnswers = ydoc.getMap('quizAnswers');
    yQuizRef.current = yQuiz;
    yAnswersRef.current = yAnswers;

    const handleQuizUpdate = () => {
      const phase = (yQuiz.get('phase') as QuizPhase | undefined) ?? 'idle';
      const quiz = yQuiz.get('quiz') as Quiz | undefined;
      const qIndex = (yQuiz.get('questionIndex') as number | undefined) ?? 0;
      const tLimit = (yQuiz.get('questionTimeLimit') as number | undefined) ?? QUESTION_TIME_LIMIT;
      const qStarted = (yQuiz.get('questionStartedAt') as number | undefined) ?? 0;
      const revealed = (yQuiz.get('revealedAnswer') as RevealedAnswer | undefined) ?? null;

      setQuizPhase(phase);
      setActiveQuiz(quiz ?? null);
      setQuestionTimeLimit(tLimit);
      setQuestionStartedAt(qStarted);
      setRevealedAnswer(revealed);

      if (qIndex !== prevQuestionIndexRef.current) {
        prevQuestionIndexRef.current = qIndex;
        setCurrentQuestionIndex(qIndex);
        setHasAnsweredCurrent(false);
        setPendingAnswer(null);
        setLastAnswerFeedback(null);
      }
    };

    const handleAnswersUpdate = () => {
      if (!isTeacher) return;
      const progressMap = new Map<string, StudentProgress>();
      yAnswers.forEach((rawVal: unknown, key: string) => {
        const val = rawVal as Record<string, any>;
        if (!key.includes('_')) return;
        const clientId = String(val?.clientId ?? key.split('_')[0]);
        const score = (val?.score as number) || 0;
        const existing = progressMap.get(clientId);
        if (!existing) {
          progressMap.set(clientId, {
            clientId,
            name: (val?.name as string) || clientId,
            hasAnswered: true,
            score,
          });
        } else {
          progressMap.set(clientId, { ...existing, score: existing.score + score });
        }
      });
      setStudentProgress(Array.from(progressMap.values()));
    };

    yQuiz.observe(handleQuizUpdate);
    yAnswers.observe(handleAnswersUpdate);
    handleQuizUpdate();

    return () => {
      yQuiz.unobserve(handleQuizUpdate);
      yAnswers.unobserve(handleAnswersUpdate);
    };
  }, [ydoc, isTeacher]);

  // ─── Q-02/03: Evaluate at reveal ─────────────────────────────────────────────

  useEffect(() => {
    if (!revealedAnswer || isTeacher) return;
    const { questionId, correct, explanation } = revealedAnswer;

    const myRecord = myAnswers[questionId];
    if (!myRecord) return;

    const question = activeQuiz?.questions.find(q => q.id === questionId);
    if (!question) return;

    const questionWithAnswer: QuizQuestion = { ...question, correct };
    const { isCorrect } = checkAnswer(questionWithAnswer, myRecord.answer);

    const elapsedMs = answerSubmittedAtRef.current > 0 && questionStartedAt > 0
      ? Math.max(0, answerSubmittedAtRef.current - questionStartedAt)
      : questionTimeLimit * 1000;
    const score = isCorrect ? computeTimedScore(elapsedMs, questionTimeLimit, streak) : 0;

    setMyAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], isCorrect, score },
    }));
    setLastAnswerFeedback({ isCorrect, explanation, score });

    if (isCorrect) {
      setMyScore(prev => prev + score);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    const yAnswers = yAnswersRef.current;
    const clientId = myClientIdRef.current;
    if (yAnswers && clientId) {
      ydoc?.transact(() => {
        yAnswers.set(`${clientId}_${questionId}`, {
          answer: myRecord.answer,
          isCorrect,
          score,
          name: yAnswers.get(`${clientId}_${questionId}`)?.name || clientId,
          clientId,
          questionId,
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedAnswer]);

  // ─── Timer ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isQuizActive || !questionStartedAt || quizPhase !== 'question') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartedAt) / 1000);
      const remaining = Math.max(0, questionTimeLimit - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0 && timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }, 500);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isQuizActive, quizPhase, questionStartedAt, questionTimeLimit]);

  // ─── TTS ──────────────────────────────────────────────────────────────────────

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

  // ─── Speech Recognition ───────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Tu navegador no soporta reconocimiento de voz'); return; }

    const rec = new SR();
    rec.lang = subject.toLowerCase().includes('english') ? 'en-US' : 'es-ES';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: any) => {
      setSpokenText(event.results[0]?.[0]?.transcript || '');
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

  // ─── Answer Evaluation (needs `correct` field) ────────────────────────────────

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
      const expected = String(question.correct).toLowerCase().trim();
      const given = String(answer).toLowerCase().trim();
      const expectedWords = expected.split(/\s+/).filter(w => w.length > 2);
      const matchCount = expectedWords.filter(w => given.includes(w)).length;
      const ratio = expectedWords.length > 0 ? matchCount / expectedWords.length : 0;
      return { isCorrect: ratio >= 0.7, score: Math.round(ratio * 100) };
    }

    return { isCorrect: false, score: 0 };
  }, []);

  // ─── Student: Submit Answer (evaluation deferred to reveal) ───────────────────

  const submitAnswer = useCallback((
    questionId: number,
    answer: string | number,
    clientId?: string,
    userName?: string
  ) => {
    if (!activeQuiz) return;

    if (clientId) myClientIdRef.current = clientId;
    answerSubmittedAtRef.current = Date.now();

    setMyAnswers(prev => ({
      ...prev,
      [questionId]: { questionId, answer, isCorrect: false, score: 0, submittedAt: answerSubmittedAtRef.current },
    }));
    setHasAnsweredCurrent(true);
    setPendingAnswer(answer);

    const yAnswers = yAnswersRef.current;
    if (yAnswers && clientId) {
      ydoc?.transact(() => {
        yAnswers.set(`${clientId}_${questionId}`, {
          answer,
          isCorrect: false,
          score: 0,
          name: userName || clientId,
          clientId,
          questionId,
          hasAnswered: true,
          submittedAt: answerSubmittedAtRef.current,
        });
      });
    }
  }, [activeQuiz, ydoc]);

  // ─── Teacher: Phase FSM Transitions ──────────────────────────────────────────

  const launchQuiz = useCallback((quiz: Quiz) => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) { toast.error('No hay conexión Yjs activa'); return; }

    localFullQuizRef.current = quiz;
    const safeQuiz = sanitizeQuizForBroadcast(quiz);

    ydoc?.transact(() => {
      yQuiz.set('quiz', safeQuiz);
      yQuiz.set('questionIndex', 0);
      yQuiz.set('questionTimeLimit', QUESTION_TIME_LIMIT);
      yQuiz.set('questionStartedAt', Date.now());
      yQuiz.set('phase', 'question' as QuizPhase);
      yQuiz.delete('revealedAnswer');
    });

    const yAnswers = yAnswersRef.current;
    if (yAnswers) {
      ydoc?.transact(() => { yAnswers.forEach((_, key) => yAnswers.delete(key)); });
    }

    setStudentProgress([]);
    setMyScore(0);
    setStreak(0);
    setMyAnswers({});
    prevQuestionIndexRef.current = -1;
    toast.success('Quiz lanzado en vivo 🚀');
  }, [ydoc]);

  const revealCurrentAnswer = useCallback(() => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;
    const qIndex = (yQuiz.get('questionIndex') as number | undefined) ?? 0;
    const fullQuiz = localFullQuizRef.current;
    if (!fullQuiz) { toast.error('No hay respuestas disponibles'); return; }
    const question = fullQuiz.questions[qIndex];
    if (!question) return;

    const revealed: RevealedAnswer = {
      questionId: question.id,
      correct: question.correct ?? '',
      explanation: question.explanation || '',
    };
    ydoc?.transact(() => {
      yQuiz.set('revealedAnswer', revealed);
      yQuiz.set('phase', 'reveal' as QuizPhase);
    });
  }, [ydoc]);

  const stopQuiz = useCallback(() => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;
    ydoc?.transact(() => { yQuiz.set('phase', 'podium' as QuizPhase); });
    toast('Quiz finalizado — ¡Viendo podio!');
  }, [ydoc]);

  const forceStopQuiz = useCallback(() => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;
    ydoc?.transact(() => { yQuiz.set('phase', 'idle' as QuizPhase); });
    toast('Quiz cerrado');
  }, [ydoc]);

  const skipToNextQuestion = useCallback(() => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;
    const fullQuiz = localFullQuizRef.current ?? activeQuiz;
    if (!fullQuiz) return;

    const next = currentQuestionIndex + 1;
    if (next >= fullQuiz.questions.length) {
      ydoc?.transact(() => { yQuiz.set('phase', 'podium' as QuizPhase); });
      return;
    }
    ydoc?.transact(() => {
      yQuiz.set('questionIndex', next);
      yQuiz.set('questionStartedAt', Date.now());
      yQuiz.set('phase', 'question' as QuizPhase);
      yQuiz.delete('revealedAnswer');
    });
  }, [ydoc, activeQuiz, currentQuestionIndex]);

  const showLeaderboard = useCallback(() => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;
    ydoc?.transact(() => { yQuiz.set('phase', 'leaderboard' as QuizPhase); });
  }, [ydoc]);

  const showPodium = useCallback(() => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;
    ydoc?.transact(() => { yQuiz.set('phase', 'podium' as QuizPhase); });
  }, [ydoc]);

  // ─── Generate Quiz ────────────────────────────────────────────────────────────

  const generateQuiz = useCallback(async () => {
    if (!topic.trim()) { toast.error('Ingresa el tema del quiz'); return; }
    setIsGenerating(true);
    setGeneratedQuiz(null);
    try {
      const res = await api.post('/quiz/generate', {
        topic: topic.trim(), subject, level,
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

  // ─── Library ──────────────────────────────────────────────────────────────────

  const loadLibrary = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await api.get('/quiz/materials');
      if (res.data?.ok) setSavedQuizzes(res.data.quizzes || []);
    } catch { toast.error('Error al cargar la biblioteca de quizzes'); }
    finally { setIsLoadingLibrary(false); }
  }, []);

  const saveToLibrary = useCallback(async (quiz?: Quiz) => {
    const q = quiz || generatedQuiz;
    if (!q) { toast.error('No hay quiz para guardar'); return; }
    try {
      const res = await api.post('/quiz/materials', {
        title: q.activity_name || q.title || `Quiz: ${topic}`,
        subject, level,
        topic: topic || q.topic || 'General',
        questions_json: q.questions,
      });
      if (res.data?.ok) { toast.success('Quiz guardado en biblioteca'); loadLibrary(); }
    } catch { toast.error('Error al guardar el quiz'); }
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
    } catch { toast.error('Error al eliminar el quiz'); }
  }, []);

  // ─── Submit Results ───────────────────────────────────────────────────────────

  const submitResults = useCallback(async (quizId: number, clientId: string, userName: string) => {
    try {
      const answers = Object.values(myAnswers);
      const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
      const avgScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;
      await api.post('/quiz/submit-result', {
        quiz_id: quizId, session_id: sessionId,
        student_id: clientId, student_name: userName,
        score: avgScore, total_questions: answers.length, answers_json: answers,
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
    } catch (err) { console.error('[useQuizGame] getResults error:', err); }
  }, [sessionId]);

  useEffect(() => {
    if (showQuizCreator) loadLibrary();
  }, [showQuizCreator, loadLibrary]);

  // ─── Return ───────────────────────────────────────────────────────────────────

  return {
    showQuizCreator, setShowQuizCreator,
    topic, setTopic,
    subject, setSubject,
    level, setLevel,
    count, setCount,
    questionTypes, setQuestionTypes,
    generatedQuiz, setGeneratedQuiz,
    isGenerating, generateQuiz,
    savedQuizzes, isLoadingLibrary, loadLibrary, saveToLibrary, loadQuizById, deleteQuiz,
    // Q-01: Phase FSM
    quizPhase, revealedAnswer,
    // Runtime
    activeQuiz, currentQuestionIndex, isQuizActive, timeLeft, questionTimeLimit,
    // Student
    myAnswers, myScore, streak,
    showResults, setShowResults,
    pendingAnswer, setPendingAnswer,
    hasAnsweredCurrent, lastAnswerFeedback,
    spokenText, setSpokenText,
    submitAnswer, submitResults,
    // Teacher
    studentProgress, sessionResults,
    launchQuiz, stopQuiz, forceStopQuiz,
    skipToNextQuestion, revealCurrentAnswer,
    showLeaderboard, showPodium, getResults,
    // TTS
    isSpeaking, speakQuestion, stopSpeaking,
    // Speech
    isListening, startListening, stopListening,
  };
}