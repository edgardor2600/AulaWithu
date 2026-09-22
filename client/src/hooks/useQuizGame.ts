import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import api from '../services/api';
import toast from 'react-hot-toast';
import { quizAudio } from '../services/quizAudioEngine';

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
  currentIsCorrect?: boolean;
  currentScore?: number;
}

export interface AnswerRecord {
  questionId: number;
  answer: string | number;
  isCorrect: boolean;
  score: number;
  submittedAt?: number;
  correct?: string | number;
  explanation?: string;
}

export interface RevealedAnswer {
  questionId: number;
  correct: string | number;
  explanation: string;
}

const QUESTION_TIME_LIMIT = 30;

// ─── Q-02: Anti-Cheat Helper ──────────────────────────────────────────────────

/**
 * Normalise a quiz object that came from the PostgreSQL API.
 *
 * The DB column is named `questions_json` (snake_case, matches the schema),
 * but every frontend consumer expects the field to be called `questions`.
 * This function converts one to the other safely so that no other code
 * needs to be aware of the DB field name.
 */
function normalizeQuizFromApi(raw: any): Quiz {
  if (!raw) return raw;
  const questions: QuizQuestion[] =
    Array.isArray(raw.questions) && raw.questions.length > 0
      ? raw.questions
      : Array.isArray(raw.questions_json)
      ? raw.questions_json as QuizQuestion[]
      : [];
  return { ...raw, questions };
}

function sanitizeQuizForBroadcast(quiz: Quiz): Quiz {
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  return {
    ...quiz,
    questions: questions.map(({ correct: _c, explanation: _e, ...rest }) => rest as QuizQuestion),
  };
}

// ─── Q-03: Temporal-Decay Scoring Engine ──────────────────────────────────────

function computeTimedScore(elapsedMs: number, timeLimitSec: number, currentStreak: number): number {
  const elapsed = elapsedMs / 1000;
  const remainingRatio = Math.max(0, Math.min(1, (timeLimitSec - elapsed) / Math.max(1, timeLimitSec)));
  // Speed bonus up to 500 points
  const basePlusSpeed = 1000 + Math.round(remainingRatio * 500);
  // Streak multipliers: 1x, 1.1x, 1.2x, 1.4x, 1.5x (max)
  let streakMultiplier = 1.0;
  if (currentStreak === 1) streakMultiplier = 1.1;
  else if (currentStreak === 2) streakMultiplier = 1.2;
  else if (currentStreak === 3) streakMultiplier = 1.4;
  else if (currentStreak >= 4) streakMultiplier = 1.5;

  return Math.round(basePlusSpeed * streakMultiplier);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuizGame(
  ydoc: Y.Doc | null,
  isTeacher: boolean,
  sessionId: string
) {
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);

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
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [hasSavedResult, setHasSavedResult] = useState(false);
  const hasSubmittedResultRef = useRef<boolean>(false);
  const [isSessionFinalized, setIsSessionFinalized] = useState(false);
  const [isLocalPodiumOpen, setIsLocalPodiumOpen] = useState(false);
  const [quizSolutions, setQuizSolutions] = useState<Record<string, { correct: any; explanation?: string }>>({});
  const hasFinalizedSessionRef = useRef<boolean>(false);
  const submittedSessionsRef = useRef<Set<string>>(new Set());

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

  // Q-03: Scoring timestamps & student identity
  const myClientIdRef = useRef<string | undefined>(undefined);
  const myUserNameRef = useRef<string | undefined>(undefined);
  const answerSubmittedAtRef = useRef<number>(0);

  const prevQuestionIndexRef = useRef<number>(-1);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allAnsweredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerStudentClient = useCallback((clientId: string, userName?: string) => {
    myClientIdRef.current = clientId;
    if (userName) myUserNameRef.current = userName;

    const yAnswers = yAnswersRef.current;
    const yQuiz = yQuizRef.current;
    if (yAnswers && yQuiz && clientId && !isTeacher) {
      const qIndex = (yQuiz.get('questionIndex') as number | undefined) ?? 0;
      const quizObj = yQuiz.get('quiz') as Quiz | undefined;
      const currentQuestionId = quizObj?.questions?.[qIndex]?.id;
      if (currentQuestionId && !yAnswers.has(`${clientId}_${currentQuestionId}`)) {
        ydoc?.transact(() => {
          yAnswers.set(`${clientId}_${currentQuestionId}`, {
            answer: '',
            isCorrect: false,
            score: 0,
            name: userName || clientId,
            clientId,
            questionId: currentQuestionId,
            hasAnswered: false,
          });
        });
      }
    }
  }, [ydoc, isTeacher]);

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
      const isFinalized = Boolean(yQuiz.get('isFinalized'));
      const solutions = (yQuiz.get('solutions') as Record<string, { correct: any; explanation?: string }> | undefined) ?? {};

      setQuizPhase(phase);
      setActiveQuiz(quiz ?? null);
      setQuestionTimeLimit(tLimit);
      setQuestionStartedAt(qStarted);
      setRevealedAnswer(revealed);
      setIsSessionFinalized(isFinalized);
      if (Object.keys(solutions).length > 0) {
        setQuizSolutions(solutions);
      }

      if (qIndex !== prevQuestionIndexRef.current) {
        prevQuestionIndexRef.current = qIndex;
        setCurrentQuestionIndex(qIndex);
        setHasAnsweredCurrent(false);
        setPendingAnswer(null);
        setLastAnswerFeedback(null);
        setTimeLeft(tLimit);

        // Ensure student client is immediately registered as "thinking" for this question
        if (!isTeacher && myClientIdRef.current) {
          const quizObj = yQuiz.get('quiz') as Quiz | undefined;
          const currentQuestionId = quizObj?.questions?.[qIndex]?.id;
          if (currentQuestionId && !yAnswers.has(`${myClientIdRef.current}_${currentQuestionId}`)) {
            ydoc?.transact(() => {
              yAnswers.set(`${myClientIdRef.current}_${currentQuestionId}`, {
                answer: '',
                isCorrect: false,
                score: 0,
                name: myUserNameRef.current || myClientIdRef.current,
                clientId: myClientIdRef.current,
                questionId: currentQuestionId,
                hasAnswered: false,
              });
            });
          }
        }
      }
    };

    const handleAnswersUpdate = () => {
      // Synced for BOTH teacher and students so the leaderboard and podium are populated for everyone
      const qIndex = (yQuiz.get('questionIndex') as number | undefined) ?? 0;
      const quizObj = yQuiz.get('quiz') as Quiz | undefined;
      const currentQuestionId = quizObj?.questions?.[qIndex]?.id;

      const progressMap = new Map<string, StudentProgress>();
      yAnswers.forEach((rawVal: unknown, key: string) => {
        const val = rawVal as Record<string, any>;
        if (!key.includes('_')) return;
        const clientId = String(val?.clientId ?? key.split('_')[0]);
        const score = (val?.score as number) || 0;
        const qId = val?.questionId;
        const isCurrentQ = currentQuestionId !== undefined && qId === currentQuestionId;
        const hasAnsweredCurrent = isCurrentQ ? Boolean(val?.hasAnswered && val?.answer && String(val?.answer).trim() !== '') : false;
        const isCorrect = isCurrentQ ? val?.isCorrect : undefined;
        const currentScore = isCurrentQ ? score : undefined;

        const existing = progressMap.get(clientId);
        if (!existing) {
          progressMap.set(clientId, {
            clientId,
            name: (val?.name as string) || clientId,
            hasAnswered: hasAnsweredCurrent,
            score,
            currentIsCorrect: isCorrect,
            currentScore,
          });
        } else {
          progressMap.set(clientId, {
            ...existing,
            score: existing.score + score,
            hasAnswered: existing.hasAnswered || hasAnsweredCurrent,
            currentIsCorrect: isCorrect !== undefined ? isCorrect : existing.currentIsCorrect,
            currentScore: currentScore !== undefined ? currentScore : existing.currentScore,
          });
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
  }, [ydoc]);

  // ─── Q-02/03: Evaluate at reveal ─────────────────────────────────────────────

  useEffect(() => {
    if (!revealedAnswer || isTeacher) return;
    const { questionId, correct, explanation } = revealedAnswer;

    const myRecord = myAnswers[questionId];
    const yAnswers = yAnswersRef.current;
    const clientId = myClientIdRef.current;

    if (!myRecord) {
      // Student ran out of time or did not answer
      setMyAnswers(prev => ({
        ...prev,
        [questionId]: {
          questionId,
          answer: '(Sin respuesta)',
          isCorrect: false,
          score: 0,
          correct,
          explanation: explanation || 'Se agotó el tiempo para responder esta pregunta.',
        },
      }));
      setLastAnswerFeedback({
        isCorrect: false,
        explanation: explanation || 'Se agotó el tiempo para responder esta pregunta.',
        score: 0,
      });
      setStreak(0);
      quizAudio.playIncorrect();

      if (yAnswers && clientId) {
        ydoc?.transact(() => {
          yAnswers.set(`${clientId}_${questionId}`, {
            answer: '',
            isCorrect: false,
            score: 0,
            name: yAnswers.get(`${clientId}_${questionId}`)?.name || myUserNameRef.current || clientId,
            clientId,
            questionId,
            hasAnswered: false,
          });
        });
      }
      return;
    }

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
      [questionId]: {
        ...prev[questionId],
        isCorrect,
        score,
        correct,
        explanation,
      },
    }));
    setLastAnswerFeedback({ isCorrect, explanation, score });

    if (isCorrect) {
      setMyScore(prev => prev + score);
      setStreak(prev => prev + 1);
      quizAudio.playCorrect(streak + 1);
    } else {
      setStreak(0);
      quizAudio.playIncorrect();
    }

    if (yAnswers && clientId) {
      ydoc?.transact(() => {
        yAnswers.set(`${clientId}_${questionId}`, {
          answer: myRecord.answer,
          isCorrect,
          score,
          name: yAnswers.get(`${clientId}_${questionId}`)?.name || myUserNameRef.current || clientId,
          clientId,
          questionId,
          hasAnswered: true,
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedAnswer, isTeacher]);

  // ─── Timer ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isQuizActive || !questionStartedAt || quizPhase !== 'question') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Immediate calculation so timeLeft never lags behind on phase change
    const tick = () => {
      const elapsed = Math.floor((Date.now() - questionStartedAt) / 1000);
      const remaining = Math.max(0, questionTimeLimit - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0 && timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };

    tick();
    timerIntervalRef.current = setInterval(tick, 500);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
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

  const launchQuiz = useCallback(async (quiz: Quiz) => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) { toast.error('No hay conexión Yjs activa'); return; }

    // Normalize: handle quizzes that came from the DB (questions_json) vs AI-generated (questions)
    let targetQuiz = normalizeQuizFromApi(quiz);

    // Guard: refuse to launch a quiz without questions to prevent blank student screens
    if (!targetQuiz.questions || targetQuiz.questions.length === 0) {
      toast.error('Este quiz no tiene preguntas cargadas. Ábrelo desde la Biblioteca primero.');
      return;
    }

    // If quiz doesn't have an ID (e.g. freshly generated by AI), persist it to PostgreSQL first
    if (!targetQuiz.id) {
      try {
        const res = await api.post('/quiz/materials', {
          title: targetQuiz.activity_name || targetQuiz.title || `Quiz: ${topic || 'Sin título'}`,
          subject: targetQuiz.subject || subject || 'English',
          level: targetQuiz.level || level || 'A2',
          topic: targetQuiz.topic || topic || 'General',
          questions_json: targetQuiz.questions,
        });
        if (res.data?.ok && res.data.quiz?.id) {
          targetQuiz = { ...targetQuiz, id: res.data.quiz.id };
        }
      } catch (err) {
        console.warn('[useQuizGame] Auto-save before launch warning:', err);
      }
    }

    localFullQuizRef.current = targetQuiz;
    try {
      sessionStorage.setItem(`fullQuiz_${sessionId}`, JSON.stringify(targetQuiz));
    } catch (_) {}

    const safeQuiz = sanitizeQuizForBroadcast(targetQuiz);

    ydoc?.transact(() => {
      yQuiz.set('quiz', safeQuiz);
      yQuiz.set('questionIndex', 0);
      yQuiz.set('questionTimeLimit', QUESTION_TIME_LIMIT);
      yQuiz.set('questionStartedAt', Date.now());
      yQuiz.set('phase', 'question' as QuizPhase);
      yQuiz.set('isFinalized', false);
      yQuiz.delete('revealedAnswer');
      yQuiz.delete('solutions');
    });

    const yAnswers = yAnswersRef.current;
    if (yAnswers) {
      ydoc?.transact(() => { yAnswers.forEach((_, key) => yAnswers.delete(key)); });
    }

    setStudentProgress([]);
    setMyScore(0);
    setStreak(0);
    setMyAnswers({});
    setIsSessionFinalized(false);
    setIsLocalPodiumOpen(false);
    setQuizSolutions({});
    hasFinalizedSessionRef.current = false;
    hasSubmittedResultRef.current = false;
    prevQuestionIndexRef.current = -1;
    setTimeLeft(QUESTION_TIME_LIMIT);
    toast.success('Quiz lanzado en vivo 🚀');
  }, [ydoc, sessionId, topic, subject, level]);

  const revealCurrentAnswer = useCallback(() => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;
    const qIndex = (yQuiz.get('questionIndex') as number | undefined) ?? 0;
    let fullQuiz = localFullQuizRef.current;
    if (!fullQuiz) {
      try {
        const saved = sessionStorage.getItem(`fullQuiz_${sessionId}`);
        if (saved) fullQuiz = JSON.parse(saved);
      } catch (_) {}
    }
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
  }, [ydoc, sessionId]);

  const stopQuiz = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    // If the quiz session is already finalized, open podium locally only (do NOT broadcast to students or re-persist)
    if (isSessionFinalized) {
      setIsLocalPodiumOpen(true);
      return;
    }
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;

    // Collect solutions from full local quiz to broadcast to all students for review
    const fullQuiz = localFullQuizRef.current ?? activeQuiz;
    const solutions: Record<string, { correct: any; explanation?: string }> = {};
    if (fullQuiz?.questions) {
      fullQuiz.questions.forEach(q => {
        solutions[q.id] = { correct: q.correct, explanation: q.explanation };
      });
    }

    ydoc?.transact(() => {
      if (Object.keys(solutions).length > 0) {
        yQuiz.set('solutions', solutions);
      }
      yQuiz.set('phase', 'podium' as QuizPhase);
    });
    toast('Quiz finalizado — ¡Viendo podio!');
  }, [ydoc, isSessionFinalized, activeQuiz]);

  const forceStopQuiz = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsLocalPodiumOpen(false);
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;
    ydoc?.transact(() => {
      yQuiz.set('phase', 'idle' as QuizPhase);
      yQuiz.set('isFinalized', true);
    });
    setIsSessionFinalized(true);
    hasFinalizedSessionRef.current = true;
    toast('Quiz cerrado');
  }, [ydoc]);

  const skipToNextQuestion = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (allAnsweredTimerRef.current) {
      clearTimeout(allAnsweredTimerRef.current);
      allAnsweredTimerRef.current = null;
    }
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;
    const fullQuiz = localFullQuizRef.current ?? activeQuiz;
    if (!fullQuiz) return;

    // 1. If currently in 'question' phase, evaluate and reveal solution first!
    if (quizPhase === 'question') {
      revealCurrentAnswer();
      return;
    }

    // 2. Advance to next question or podium
    const next = currentQuestionIndex + 1;
    if (next >= fullQuiz.questions.length) {
      stopQuiz();
      return;
    }

    setTimeLeft(QUESTION_TIME_LIMIT);

    ydoc?.transact(() => {
      yQuiz.set('questionIndex', next);
      yQuiz.set('questionTimeLimit', QUESTION_TIME_LIMIT);
      yQuiz.set('questionStartedAt', Date.now());
      yQuiz.set('phase', 'question' as QuizPhase);
      yQuiz.delete('revealedAnswer');
    });
  }, [ydoc, activeQuiz, currentQuestionIndex, quizPhase, revealCurrentAnswer, stopQuiz]);

  // ─── Teacher: Auto-Advance & Auto-Reveal ──────────────────────────────────────

  useEffect(() => {
    if (!isTeacher || !isQuizActive) return;

    // 1. When question timer reaches 0, teacher client automatically reveals answer
    // Timestamp Guard: physically verify that at least questionTimeLimit seconds have elapsed
    if (quizPhase === 'question' && questionStartedAt > 0) {
      const elapsedMs = Date.now() - questionStartedAt;
      const hasActuallyExpired = elapsedMs >= questionTimeLimit * 1000;

      if (timeLeft === 0 && hasActuallyExpired) {
        revealCurrentAnswer();
      }
    }

    // 1b. Auto-reveal when 100% of connected students have answered!
    if (quizPhase === 'question' && studentProgress.length > 0) {
      const allAnswered = studentProgress.every(s => s.hasAnswered);
      if (allAnswered) {
        if (!allAnsweredTimerRef.current) {
          allAnsweredTimerRef.current = setTimeout(() => {
            revealCurrentAnswer();
            allAnsweredTimerRef.current = null;
          }, 1000);
        }
      } else {
        if (allAnsweredTimerRef.current) {
          clearTimeout(allAnsweredTimerRef.current);
          allAnsweredTimerRef.current = null;
        }
      }
    } else {
      if (allAnsweredTimerRef.current) {
        clearTimeout(allAnsweredTimerRef.current);
        allAnsweredTimerRef.current = null;
      }
    }

    // 2. When in reveal phase, wait 4.5s for all students to view feedback, then auto-advance
    if (quizPhase === 'reveal') {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = setTimeout(() => {
        skipToNextQuestion();
      }, 4500);
    } else {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    }

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      if (allAnsweredTimerRef.current) {
        clearTimeout(allAnsweredTimerRef.current);
        allAnsweredTimerRef.current = null;
      }
    };
  }, [isTeacher, isQuizActive, quizPhase, timeLeft, questionStartedAt, questionTimeLimit, studentProgress, revealCurrentAnswer, skipToNextQuestion]);

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
      if (res.data?.ok && res.data?.quiz) {
        // Normalize DB field name (questions_json) → frontend field name (questions)
        return normalizeQuizFromApi(res.data.quiz);
      }
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
    const submitKey = `${sessionId}_${quizId}`;
    if (submittedSessionsRef.current.has(submitKey)) {
      console.info('[useQuizGame] Student result already submitted for session', submitKey);
      return;
    }

    try {
      const answers = Object.values(myAnswers);
      const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
      await api.post('/quiz/submit-result', {
        quiz_id: quizId,
        session_id: sessionId,
        student_id: clientId,
        student_name: userName,
        score: totalScore,
        total_questions: activeQuiz?.questions?.length || answers.length,
        answers_json: answers,
      });
      submittedSessionsRef.current.add(submitKey);
      setShowResults(true);
      setHasSavedResult(true);
    } catch (err: any) {
      console.error('[useQuizGame] submitResults error:', err);
      throw err;
    }
  }, [myAnswers, sessionId, activeQuiz]);

  // ─── Auto-submit student results upon entering podium ───────────────────────

  useEffect(() => {
    if (quizPhase !== 'podium') {
      return;
    }

    if (isTeacher) return;
    if (hasSubmittedResultRef.current) return;
    const quizId = activeQuiz?.id;
    if (!quizId) return;

    const answers = Object.values(myAnswers);
    if (answers.length === 0) return;

    hasSubmittedResultRef.current = true;
    setIsSavingResult(true);

    const clientId = myClientIdRef.current || 'anonymous';
    const userName = myUserNameRef.current || 'Estudiante';

    submitResults(quizId, clientId, userName)
      .then(() => {
        setIsSavingResult(false);
        setHasSavedResult(true);
        toast.success('Tus respuestas han sido guardadas en tu expediente ✅');
      })
      .catch((err) => {
        setIsSavingResult(false);
        console.error('[useQuizGame] Student auto-submit failed:', err);
      });
  }, [isTeacher, quizPhase, activeQuiz?.id, myAnswers, submitResults]);

  // ─── Teacher: Persist all session results in batch ───────────────────────────

  const persistAllSessionResults = useCallback(async (): Promise<boolean> => {
    if (hasFinalizedSessionRef.current) {
      console.info('[useQuizGame] Session already persisted, skipping duplicate persist');
      return true;
    }

    const quizId = activeQuiz?.id;
    if (!quizId) {
      toast.error('El quiz no tiene un ID registrado');
      return false;
    }

    if (studentProgress.length === 0) {
      toast('No hay respuestas de alumnos para guardar');
      hasFinalizedSessionRef.current = true;
      return true;
    }

    try {
      const results = studentProgress.map(s => ({
        student_id: s.clientId,
        student_name: s.name,
        score: s.score,
        total_questions: activeQuiz?.questions?.length ?? 0,
        answers_json: [],
      }));

      const res = await api.post(`/quiz/sessions/${sessionId}/finalize`, {
        quiz_id: quizId,
        results,
      });

      if (res.data?.ok) {
        hasFinalizedSessionRef.current = true;
        setIsSessionFinalized(true);
        yQuizRef.current?.set('isFinalized', true);
        toast.success(`Resultados de ${res.data.count} alumnos guardados en PostgreSQL ✅`);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[useQuizGame] persistAllSessionResults error:', err);
      toast.error('Error al guardar los resultados en la base de datos');
      return false;
    }
  }, [activeQuiz, studentProgress, sessionId]);

  const getResults = useCallback(async (quizId: number) => {
    try {
      const res = await api.get(`/quiz/results/${quizId}/session/${sessionId}`);
      if (res.data?.ok) setSessionResults(res.data.results || []);
    } catch (err) { console.error('[useQuizGame] getResults error:', err); }
  }, [sessionId]);

  useEffect(() => {
    if (showQuizCreator) loadLibrary();
  }, [showQuizCreator, loadLibrary]);

  const extendTime = useCallback((seconds = 15) => {
    const yQuiz = yQuizRef.current;
    if (!yQuiz) return;
    const currentLimit = (yQuiz.get('questionTimeLimit') as number | undefined) ?? QUESTION_TIME_LIMIT;
    const newLimit = currentLimit + seconds;
    ydoc?.transact(() => {
      yQuiz.set('questionTimeLimit', newLimit);
    });
    toast.success(`+${seconds}s añadidos al tiempo`);
  }, [ydoc]);

  // ─── Return ───────────────────────────────────────────────────────────────────

  return {
    showQuizCreator, setShowQuizCreator,
    isWidgetMinimized, setIsWidgetMinimized,
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
    registerStudentClient,
    isSavingResult, hasSavedResult,
    // Teacher
    studentProgress, sessionResults,
    launchQuiz, stopQuiz, forceStopQuiz,
    skipToNextQuestion, revealCurrentAnswer,
    showLeaderboard, showPodium, getResults,
    extendTime, persistAllSessionResults,
    // Session state & Local viewing
    isSessionFinalized, setIsSessionFinalized,
    isLocalPodiumOpen, setIsLocalPodiumOpen,
    openLocalPodium: () => setIsLocalPodiumOpen(true),
    closeLocalPodium: () => setIsLocalPodiumOpen(false),
    quizSolutions,
    // TTS
    isSpeaking, speakQuestion, stopSpeaking,
    // Speech
    isListening, startListening, stopListening,
    // Session (exposed for persistence calls in QuizPodiumModal)
    sessionId,
  };
}