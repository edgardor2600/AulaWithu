import React from 'react';
import {
  HelpCircle, Volume2, Mic, MicOff, CheckCircle2, XCircle,
  ChevronRight, ChevronLeft, Clock, VolumeX,
} from 'lucide-react';
import type { useQuizGame } from '../hooks/useQuizGame';

interface QuizPlayerWidgetProps {
  quiz: ReturnType<typeof useQuizGame>;
  clientId: string;
  userName: string;
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Opción Múltiple',
  true_false:      'Verdadero / Falso',
  fill_blank:      'Completar',
  listening:       'Escuchar',
  speaking:        'Speaking',
  listening_extenso: 'Historia',
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const QuizPlayerWidget: React.FC<QuizPlayerWidgetProps> = ({ quiz, clientId, userName }) => {
  const [fillText, setFillText] = React.useState('');
  const [storyParaIdx, setStoryParaIdx] = React.useState(0);
  const [extensoAnswers, setExtensoAnswers] = React.useState<Record<number, number>>({});

  if (!quiz.isQuizActive || !quiz.activeQuiz) return null;

  // Podium / end screen
  if (quiz.quizPhase === 'podium') {
    return (
      <div
        id="quiz-player-widget"
        className="fixed bottom-6 right-6 z-50 w-[360px] bg-[#0d1117]/97 backdrop-blur-2xl border border-violet-500/30 rounded-2xl shadow-[0_16px_60px_rgba(139,92,246,0.25)] overflow-hidden animate-fade-in"
      >
        <div className="px-4 py-6 text-center space-y-3">
          <div className="text-4xl">🎉</div>
          <p className="text-white font-bold text-base">¡Quiz finalizado!</p>
          <p className="text-2xl font-black text-violet-300">{quiz.myScore} pts</p>
          <p className="text-[11px] text-slate-400">Racha máxima: {quiz.streak} 🔥</p>
        </div>
      </div>
    );
  }

  const question = quiz.activeQuiz.questions[quiz.currentQuestionIndex];
  if (!question) return null;

  const hasAnswered = quiz.hasAnsweredCurrent;
  const feedback = quiz.lastAnswerFeedback;

  const handleSubmit = (answer: string | number) => {
    quiz.submitAnswer(question.id, answer, clientId, userName);
    setFillText('');
    setSpokenText_noop();
  };

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const setSpokenText_noop = () => {};

  const timerPct = quiz.questionTimeLimit > 0 ? (quiz.timeLeft / quiz.questionTimeLimit) * 100 : 0;
  const timerColor = timerPct > 50 ? 'bg-emerald-500' : timerPct > 25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div
      id="quiz-player-widget"
      className="fixed bottom-6 right-6 z-50 w-[360px] bg-[#0d1117]/97 backdrop-blur-2xl border border-violet-500/30 rounded-2xl shadow-[0_16px_60px_rgba(139,92,246,0.25)] overflow-hidden animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-violet-900/20 border-b border-white/8">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-bold text-white">{quiz.activeQuiz.activity_name || 'Quiz en Vivo'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">
            P {quiz.currentQuestionIndex + 1}/{quiz.activeQuiz.questions.length}
          </span>
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg px-2 py-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className={`text-[11px] font-mono font-bold ${quiz.timeLeft <= 5 ? 'text-red-400' : 'text-amber-400'}`}>
              {quiz.timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1 bg-white/5">
        <div
          className={`h-full ${timerColor} transition-all duration-500`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Score */}
      <div className="px-3.5 pt-2 flex items-center justify-between">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
          TYPE_LABEL[question.type] ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' : 'bg-slate-800/40 border-white/8 text-slate-400'
        }`}>
          {TYPE_LABEL[question.type] || question.type}
        </span>
        <span className="text-[11px] text-indigo-300 font-bold">
          ★ {quiz.myScore} pts
        </span>
      </div>

      {/* Question body */}
      <div className="px-3.5 py-3 space-y-3">
        {/* Instruction */}
        {question.question && (
          <p className="text-[11px] text-slate-400">{question.question}</p>
        )}

        {/* Sentence / prompt */}
        {question.sentence && (
          <p className="text-sm text-white font-semibold leading-snug">{question.sentence}</p>
        )}

        {/* ─── multiple_choice ─── */}
        {(question.type === 'multiple_choice') && question.options && (
          <div className="space-y-1.5">
            {question.options.map((opt, i) => {
              const myAnswer = quiz.myAnswers[question.id]?.answer;
              const isSelected = quiz.hasAnsweredCurrent && myAnswer === i;
              // After reveal: highlight using revealedAnswer
              const isCorrect = quiz.revealedAnswer?.questionId === question.id
                ? i === Number(quiz.revealedAnswer.correct)
                : false;
              return (
                <button
                  key={i}
                  onClick={() => !hasAnswered && handleSubmit(i)}
                  disabled={hasAnswered}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                    hasAnswered
                      ? isCorrect
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : isSelected
                          ? 'bg-red-500/20 border-red-500/40 text-red-300'
                          : 'bg-slate-800/30 border-white/5 text-slate-500'
                      : 'bg-slate-800/40 border-white/10 text-slate-200 hover:bg-violet-600/20 hover:border-violet-500/40'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-white/8 flex items-center justify-center text-[11px] font-bold shrink-0">
                    {OPTION_LETTERS[i]}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── true_false ─── */}
        {question.type === 'true_false' && (
          <div className="grid grid-cols-2 gap-2">
            {['Verdadero', 'Falso'].map((label, i) => {
              const myAnswer = quiz.myAnswers[question.id]?.answer;
              const isSelected = quiz.hasAnsweredCurrent && myAnswer === i;
              const isCorrect = quiz.revealedAnswer?.questionId === question.id
                ? i === Number(quiz.revealedAnswer.correct)
                : false;
              return (
                <button
                  key={i}
                  onClick={() => !hasAnswered && handleSubmit(i)}
                  disabled={hasAnswered}
                  className={`py-3 rounded-xl border font-semibold text-sm transition-all ${
                    hasAnswered
                      ? isCorrect
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : isSelected
                          ? 'bg-red-500/20 border-red-500/40 text-red-300'
                          : 'bg-slate-800/30 border-white/5 text-slate-500'
                      : i === 0
                        ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/40'
                        : 'bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/40'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── fill_blank ─── */}
        {question.type === 'fill_blank' && (
          <div className="flex gap-2">
            <input
              value={fillText}
              onChange={e => setFillText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !hasAnswered) handleSubmit(fillText); }}
              disabled={hasAnswered}
              placeholder="Escribe tu respuesta..."
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              spellCheck={false}
              className="flex-1 bg-slate-800/60 border border-white/10 text-slate-200 text-sm rounded-lg px-3 py-2 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
            />
            <button
              onClick={() => !hasAnswered && handleSubmit(fillText)}
              disabled={hasAnswered || !fillText.trim()}
              className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            >
              OK
            </button>
          </div>
        )}

        {/* ─── listening ─── */}
        {question.type === 'listening' && (
          <div className="space-y-2">
            <button
              onClick={() => quiz.speakQuestion(question.sentence || '')}
              disabled={quiz.isSpeaking}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              {quiz.isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {quiz.isSpeaking ? 'Reproduciendo...' : 'Escuchar audio'}
            </button>
            {/* If no options → dictation input */}
            {(!question.options || question.options.length === 0) ? (
              <div className="flex gap-2">
                <input
                  value={fillText}
                  onChange={e => setFillText(e.target.value)}
                  disabled={hasAnswered}
                  placeholder="Escribe lo que escuchaste..."
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
                  spellCheck={false}
                  className="flex-1 bg-slate-800/60 border border-white/10 text-slate-200 text-sm rounded-lg px-3 py-2 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
                />
                <button
                  onClick={() => !hasAnswered && handleSubmit(fillText)}
                  disabled={hasAnswered || !fillText.trim()}
                  className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            ) : (
              /* options → multiple choice after listening */
              <div className="space-y-1.5">
                {question.options.map((opt, i) => {
                  const isCorrect = hasAnswered && i === Number(question.correct);
                  const isSelected = hasAnswered && quiz.myAnswers[question.id]?.answer === i;
                  return (
                    <button
                      key={i}
                      onClick={() => !hasAnswered && handleSubmit(i)}
                      disabled={hasAnswered}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                        hasAnswered
                          ? isCorrect ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : isSelected ? 'bg-red-500/20 border-red-500/40 text-red-300'
                              : 'bg-slate-800/20 border-white/5 text-slate-500'
                          : 'bg-slate-800/40 border-white/10 text-slate-200 hover:bg-violet-600/20 hover:border-violet-500/30'
                      }`}
                    >
                      {OPTION_LETTERS[i]}. {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── speaking ─── */}
        {question.type === 'speaking' && (
          <div className="space-y-2">
            <button
              onClick={quiz.isListening ? quiz.stopListening : quiz.startListening}
              disabled={hasAnswered}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all ${
                quiz.isListening
                  ? 'bg-red-500 border-red-500 text-white animate-pulse'
                  : 'bg-violet-600/20 border-violet-500/30 text-violet-300 hover:bg-violet-600/40'
              } disabled:opacity-50`}
            >
              {quiz.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {quiz.isListening ? 'Grabando... (toca para parar)' : '🎙️ Hablar'}
            </button>
            {quiz.spokenText && (
              <div className="bg-slate-800/40 rounded-lg px-3 py-2 text-xs text-slate-300">
                <span className="text-slate-500">Escuché: </span>"{quiz.spokenText}"
              </div>
            )}
            {quiz.spokenText && !hasAnswered && (
              <button
                onClick={() => handleSubmit(quiz.spokenText)}
                className="w-full py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm font-medium hover:bg-emerald-600/40 transition-all"
              >
                Confirmar respuesta
              </button>
            )}
          </div>
        )}

        {/* ─── listening_extenso ─── */}
        {question.type === 'listening_extenso' && question.story && (
          <div className="space-y-3">
            {/* Story title */}
            <p className="text-xs font-bold text-violet-300">{question.story.title}</p>
            {/* Paragraph navigator */}
            <div className="bg-slate-800/40 border border-white/8 rounded-xl p-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                {question.story.paragraphs[storyParaIdx]?.text}
              </p>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => quiz.speakQuestion(question.story!.paragraphs[storyParaIdx]?.text || '')}
                  className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300"
                >
                  <Volume2 className="w-3 h-3" />
                  Escuchar
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => setStoryParaIdx(Math.max(0, storyParaIdx - 1))} disabled={storyParaIdx === 0} className="p-1 rounded text-slate-400 disabled:opacity-30">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-slate-400">{storyParaIdx + 1}/{question.story.paragraphs.length}</span>
                  <button onClick={() => setStoryParaIdx(Math.min(question.story!.paragraphs.length - 1, storyParaIdx + 1))} disabled={storyParaIdx >= question.story.paragraphs.length - 1} className="p-1 rounded text-slate-400 disabled:opacity-30">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            {/* Comprehension questions */}
            {question.questions && question.questions.map((subQ, si) => (
              <div key={si} className="space-y-1">
                <p className="text-xs text-slate-400">{subQ.question}</p>
                {subQ.options && (
                  <div className="space-y-1">
                    {subQ.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => {
                          setExtensoAnswers(prev => ({ ...prev, [si]: oi }));
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg border text-xs transition-all ${
                          extensoAnswers[si] === oi
                            ? 'bg-violet-600/30 border-violet-500/40 text-violet-200'
                            : 'bg-slate-800/30 border-white/8 text-slate-300 hover:border-violet-500/20'
                        }`}
                      >
                        {OPTION_LETTERS[oi]}. {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!hasAnswered && (
              <button
                onClick={() => {
                  const answersStr = JSON.stringify(extensoAnswers);
                  handleSubmit(answersStr);
                }}
                className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all"
              >
                Enviar respuestas
              </button>
            )}
          </div>
        )}

        {/* ─── Feedback ─── */}
        {/* Waiting for reveal */}
        {hasAnswered && !feedback && quiz.quizPhase === 'question' && (
          <div className="rounded-xl p-3 border bg-slate-700/20 border-white/8 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500 animate-pulse shrink-0" />
            <span className="text-xs text-slate-400">Respuesta enviada — esperando reveal del profe...</span>
          </div>
        )}
        {/* Reveal feedback */}
        {hasAnswered && feedback && (
          <div className={`rounded-xl p-3 border ${
            feedback.isCorrect
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {feedback.isCorrect
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                : <XCircle className="w-4 h-4 text-red-400" />}
              <span className={`text-xs font-bold ${feedback.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                {feedback.isCorrect
                  ? `¡Correcto! +${feedback.score ?? 0} pts${quiz.streak > 1 ? ` 🔥×${quiz.streak}` : ''}`
                  : 'Incorrecto'}
              </span>
            </div>
            {feedback.explanation && (
              <p className="text-xs text-slate-400 leading-relaxed">{feedback.explanation}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
