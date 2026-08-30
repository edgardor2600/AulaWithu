/**
 * QuizQuestionTypes
 * Specialized renderers for the 6 interactive quiz question types:
 *   1. multiple_choice
 *   2. true_false
 *   3. fill_blank (with advanced normalization)
 *   4. listening (with TTS audio player)
 *   5. speaking (with speech recognition & text fallback)
 *   6. listening_extenso (story player with paragraphs and sub-questions)
 */
import React, { useState, useEffect } from 'react';
import {
  Volume2, Mic, MicOff, Check, X,
  Play, ChevronRight, ChevronLeft
} from 'lucide-react';
import type { QuizQuestion, RevealedAnswer } from '../../hooks/useQuizGame';

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Opción Múltiple',
  true_false: 'Verdadero / Falso',
  fill_blank: 'Completar Espacio',
  listening: 'Escuchar y Escribir',
  speaking: 'Speaking (Hablar)',
  listening_extenso: 'Historia Interactiva',
};

// ─── Normalizer Helper ────────────────────────────────────────────────────────
export function normalizeAnswerText(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '') // remove punctuation
    .replace(/\s+/g, ' '); // collapse spaces
}

interface QuestionPropsBase {
  question: QuizQuestion;
  hasAnswered: boolean;
  userAnswer?: string | number;
  revealedAnswer?: RevealedAnswer | null;
  onSubmit: (answer: string | number) => void;
  disabled?: boolean;
}

// ─── 1. Multiple Choice ───────────────────────────────────────────────────────
export const MultipleChoiceRenderer: React.FC<QuestionPropsBase> = ({
  question,
  hasAnswered,
  userAnswer,
  revealedAnswer,
  onSubmit,
  disabled,
}) => {
  const options = question.options || [];

  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((opt, i) => {
        const isSelected = hasAnswered && userAnswer === i;
        const isCorrectOption = revealedAnswer && Number(revealedAnswer.correct) === i;
        const isWrongSelected = revealedAnswer && isSelected && !isCorrectOption;

        let btnStyle = 'bg-slate-800/80 hover:bg-violet-900/30 border-white/10 hover:border-violet-500/40 text-slate-200';
        if (hasAnswered && !revealedAnswer) {
          btnStyle = isSelected
            ? 'bg-violet-600/40 border-violet-400 text-white ring-1 ring-violet-400'
            : 'bg-slate-800/40 border-white/5 text-slate-400 opacity-60';
        } else if (revealedAnswer) {
          if (isCorrectOption) {
            btnStyle = 'bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400 font-bold';
          } else if (isWrongSelected) {
            btnStyle = 'bg-rose-500/25 border-rose-400 text-rose-200 ring-1 ring-rose-400 opacity-80';
          } else {
            btnStyle = 'bg-slate-800/20 border-white/5 text-slate-400 opacity-40';
          }
        }

        return (
          <button
            key={i}
            disabled={disabled || hasAnswered}
            onClick={() => onSubmit(i)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all duration-150 ${btnStyle} ${
              !hasAnswered && !disabled ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''
            }`}
          >
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                isCorrectOption
                  ? 'bg-emerald-500 text-slate-900'
                  : isWrongSelected
                  ? 'bg-rose-500 text-white'
                  : isSelected
                  ? 'bg-violet-500 text-white'
                  : 'bg-slate-700/80 text-slate-300'
              }`}
            >
              {revealedAnswer ? (
                isCorrectOption ? <Check className="w-3.5 h-3.5" /> : isWrongSelected ? <X className="w-3.5 h-3.5" /> : OPTION_LETTERS[i]
              ) : (
                OPTION_LETTERS[i]
              )}
            </span>
            <span className="flex-1 font-medium">{opt}</span>
          </button>
        );
      })}
    </div>
  );
};

// ─── 2. True / False ──────────────────────────────────────────────────────────
export const TrueFalseRenderer: React.FC<QuestionPropsBase> = ({
  hasAnswered,
  userAnswer,
  revealedAnswer,
  onSubmit,
  disabled,
}) => {
  const options = [
    { label: 'Verdadero / True', value: 0, hint: 'V / T' },
    { label: 'Falso / False', value: 1, hint: 'F' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map(opt => {
        const isSelected = hasAnswered && userAnswer === opt.value;
        const isCorrectOption = revealedAnswer && Number(revealedAnswer.correct) === opt.value;
        const isWrongSelected = revealedAnswer && isSelected && !isCorrectOption;

        let btnStyle = 'bg-slate-800/80 hover:bg-slate-700/80 border-white/10 text-white';
        if (hasAnswered && !revealedAnswer) {
          btnStyle = isSelected
            ? 'bg-violet-600/40 border-violet-400 text-white ring-1 ring-violet-400'
            : 'bg-slate-800/30 border-white/5 text-slate-400 opacity-50';
        } else if (revealedAnswer) {
          if (isCorrectOption) {
            btnStyle = 'bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400 font-bold';
          } else if (isWrongSelected) {
            btnStyle = 'bg-rose-500/25 border-rose-400 text-rose-200 ring-1 ring-rose-400 opacity-80';
          } else {
            btnStyle = 'bg-slate-800/20 border-white/5 text-slate-400 opacity-40';
          }
        }

        return (
          <button
            key={opt.value}
            disabled={disabled || hasAnswered}
            onClick={() => onSubmit(opt.value)}
            className={`p-4 rounded-xl border text-center font-bold text-sm transition-all duration-150 ${btnStyle} ${
              !hasAnswered && !disabled ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
            }`}
          >
            <div className="text-base">{opt.label}</div>
            <div className="text-[10px] text-slate-400 mt-1 opacity-70">Atajo: {opt.hint}</div>
          </button>
        );
      })}
    </div>
  );
};

// ─── 3. Fill in the Blank ─────────────────────────────────────────────────────
export const FillBlankRenderer: React.FC<QuestionPropsBase> = ({
  hasAnswered,
  userAnswer,
  revealedAnswer,
  onSubmit,
  disabled,
}) => {
  const [text, setText] = useState('');

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || hasAnswered || disabled) return;
    onSubmit(text.trim());
  };

  const isRevealed = !!revealedAnswer;
  const currentVal = userAnswer !== undefined && userAnswer !== null ? String(userAnswer) : text;
  const isCorrect = isRevealed && normalizeAnswerText(currentVal) === normalizeAnswerText(String(revealedAnswer.correct));

  return (
    <form onSubmit={handleSend} className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={hasAnswered ? currentVal : text}
          onChange={e => setText(e.target.value)}
          disabled={disabled || hasAnswered}
          placeholder="Escribe la respuesta correcta..."
          className={`w-full px-4 py-3 rounded-xl bg-slate-900/90 border text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${
            hasAnswered && !isRevealed
              ? 'border-violet-500/60 bg-violet-950/20'
              : isRevealed
              ? isCorrect
                ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200'
                : 'border-rose-500 bg-rose-950/20 text-rose-200'
              : 'border-white/10 focus:border-violet-500 focus:ring-1 focus:ring-violet-500'
          }`}
        />
      </div>

      {!hasAnswered && !disabled && (
        <button
          type="submit"
          disabled={!text.trim()}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-violet-500/25 transition-all"
        >
          Enviar Respuesta (Enter ↵)
        </button>
      )}

      {isRevealed && (
        <div className="p-2.5 rounded-lg bg-slate-800/80 border border-white/10 text-xs flex items-center justify-between">
          <span className="text-slate-400">Respuesta correcta:</span>
          <span className="font-bold text-emerald-400">{String(revealedAnswer.correct)}</span>
        </div>
      )}
    </form>
  );
};

// ─── 4. Listening Question ────────────────────────────────────────────────────
interface ListeningProps extends QuestionPropsBase {
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
}

export const ListeningRenderer: React.FC<ListeningProps> = ({
  question,
  hasAnswered,
  userAnswer,
  onSubmit,
  onSpeak,
  isSpeaking,
  disabled,
}) => {
  const [text, setText] = useState('');
  const currentVal = userAnswer !== undefined && userAnswer !== null ? String(userAnswer) : text;

  const handlePlayAudio = () => {
    const textToSpeak = question.sentence || question.question || String(question.correct || '');
    if (textToSpeak) onSpeak(textToSpeak);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || hasAnswered || disabled) return;
    onSubmit(text.trim());
  };

  return (
    <div className="space-y-3">
      {/* Audio Play Button */}
      <div className="flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-violet-900/30 to-purple-900/20 border border-violet-500/30">
        <button
          type="button"
          onClick={handlePlayAudio}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full font-bold text-xs transition-all ${
            isSpeaking
              ? 'bg-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse'
              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
          }`}
        >
          {isSpeaking ? <Volume2 className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          {isSpeaking ? 'Reproduciendo audio...' : 'Escuchar Oración 🔊'}
        </button>
      </div>

      {/* Dictation Input */}
      <form onSubmit={handleSend} className="space-y-2">
        <input
          type="text"
          value={hasAnswered ? currentVal : text}
          onChange={e => setText(e.target.value)}
          disabled={disabled || hasAnswered}
          placeholder="Escribe exactamente lo que escuchas..."
          className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-all"
        />

        {!hasAnswered && !disabled && (
          <button
            type="submit"
            disabled={!text.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-xs transition-all"
          >
            Enviar Dictado
          </button>
        )}
      </form>
    </div>
  );
};

// ─── 5. Speaking Question ─────────────────────────────────────────────────────
interface SpeakingProps extends QuestionPropsBase {
  isListening: boolean;
  spokenText: string;
  onStartListening: () => void;
  onStopListening: () => void;
}

export const SpeakingRenderer: React.FC<SpeakingProps> = ({
  question,
  hasAnswered,
  onSubmit,
  isListening,
  spokenText,
  onStartListening,
  onStopListening,
  disabled,
}) => {
  const [useTextInputFallback, setUseTextInputFallback] = useState(false);
  const [manualText, setManualText] = useState('');

  // When speech recognition captures text, auto-send or set it
  useEffect(() => {
    if (spokenText && !hasAnswered) {
      setManualText(spokenText);
    }
  }, [spokenText, hasAnswered]);

  const targetSentence = question.sentence || question.question || '';

  const handleSendSpoken = () => {
    const textToSend = manualText || spokenText;
    if (textToSend.trim() && !hasAnswered) {
      onSubmit(textToSend.trim());
    }
  };

  return (
    <div className="space-y-3">
      {/* Target Phrase Box */}
      <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/10 text-center">
        <p className="text-xs text-slate-400 mb-1">Lee la siguiente oración con claridad:</p>
        <p className="text-base font-bold text-white tracking-wide">{targetSentence}</p>
      </div>

      {!useTextInputFallback ? (
        <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-violet-900/20 to-slate-900/40 border border-violet-500/20">
          <button
            type="button"
            disabled={disabled || hasAnswered}
            onClick={isListening ? onStopListening : onStartListening}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-rose-600 text-white shadow-[0_0_25px_rgba(225,29,72,0.6)] animate-pulse'
                : 'bg-gradient-to-tr from-violet-600 to-indigo-600 hover:scale-105 text-white shadow-lg shadow-violet-500/30'
            } disabled:opacity-40`}
          >
            {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </button>

          <span className="text-xs font-semibold text-slate-300">
            {isListening ? '🎙️ Escuchando... Habla ahora' : 'Presiona para grabar'}
          </span>

          {(spokenText || manualText) && !hasAnswered && (
            <div className="w-full space-y-2">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-violet-500/30 text-xs text-violet-200">
                <span className="text-slate-400">Detectado: </span>
                <span className="font-bold">{manualText || spokenText}</span>
              </div>
              <button
                type="button"
                onClick={handleSendSpoken}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20"
              >
                Confirmar y Enviar Audio
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setUseTextInputFallback(true)}
            className="text-[10px] text-slate-400 hover:text-slate-200 underline mt-1"
          >
            ¿Micrófono no funciona? Escribir en texto
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            disabled={disabled || hasAnswered}
            placeholder="Escribe la pronunciación en texto..."
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUseTextInputFallback(false)}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
            >
              Volver a Micrófono
            </button>
            <button
              type="button"
              disabled={!manualText.trim() || hasAnswered}
              onClick={handleSendSpoken}
              className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 6. Listening Extenso (Story Player) ───────────────────────────────────────
export const ListeningExtensoRenderer: React.FC<QuestionPropsBase> = ({
  question,
  hasAnswered,
  userAnswer,
  revealedAnswer,
  onSubmit,
  disabled,
}) => {
  const [currentPara, setCurrentPara] = useState(0);
  const story = question.story;
  const paragraphs = story?.paragraphs || [];

  useEffect(() => {
    setCurrentPara(0);
  }, [question.id]);

  return (
    <div className="space-y-3">
      {/* Story Title & Paragraph Card */}
      {paragraphs.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-violet-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs text-violet-300 font-bold">
            <span>{story?.title || 'Historia'}</span>
            <span>Párrafo {currentPara + 1} de {paragraphs.length}</span>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed italic">
            "{paragraphs[currentPara]?.text}"
          </p>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              disabled={currentPara === 0}
              onClick={() => setCurrentPara(p => Math.max(0, p - 1))}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-slate-300 text-xs flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <button
              type="button"
              disabled={currentPara === paragraphs.length - 1}
              onClick={() => setCurrentPara(p => Math.min(paragraphs.length - 1, p + 1))}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-slate-300 text-xs flex items-center gap-1"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Multiple Choice Options for Extenso */}
      {question.options && question.options.length > 0 && (
        <MultipleChoiceRenderer
          question={question}
          hasAnswered={hasAnswered}
          userAnswer={userAnswer}
          revealedAnswer={revealedAnswer}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      )}
    </div>
  );
};
