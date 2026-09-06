import React, { useState } from 'react';
import {
  Bot, X, ChevronDown, ChevronUp, Mic, MicOff, CheckCircle2,
  XCircle, Loader2, Sparkles, Lock, Unlock, HelpCircle
} from 'lucide-react';
import type { useAITutor } from '../hooks/useAITutor';

interface AITutorStudentWidgetProps {
  tutor: ReturnType<typeof useAITutor>;
  studentName: string;
  clientId: string;
}

export const AITutorStudentWidget: React.FC<AITutorStudentWidgetProps> = ({
  tutor,
  studentName,
  clientId,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // If no script or phase data is available, do not render
  const phase = tutor.script?.phases[tutor.currentPhaseIndex] || tutor.activeSlidePhaseData;
  if (!phase && !tutor.script) return null;

  // If student closed the widget, do not render
  if (!tutor.showStudentWidget) return null;

  const totalPhases = tutor.script?.phases.length ?? 1;
  const phaseNumber = tutor.currentPhaseIndex + 1;
  const phaseName = phase?.name || 'Lección Interactiva';
  const taskText = phase?.student_task || phase?.objective || 'Responde a la pregunta planteada por el tutor.';

  const handleToggleMic = () => {
    if (tutor.isListening) {
      tutor.stopListening();
    } else {
      tutor.startListening();
    }
  };

  const handleSendAnswer = async () => {
    if (!tutor.studentInput.trim()) return;
    await tutor.submitStudentAnswer(tutor.studentInput, studentName, clientId);
  };

  return (
    <div
      className={`fixed right-4 bottom-4 z-40 w-[380px] max-w-[calc(100vw-2rem)] bg-[#0d1117]/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden transition-all duration-300 animate-fade-in ${
        isCollapsed ? 'h-auto' : 'max-h-[85vh]'
      }`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white truncate">AI Tutor</h3>
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded font-medium">
                Fase {phaseNumber}/{totalPhases}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate font-medium">{phaseName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title={isCollapsed ? 'Expandir' : 'Minimizar'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => tutor.setShowStudentWidget(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Body (Collapsible) ── */}
      {!isCollapsed && (
        <div className="p-4 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
          {/* Tutor explanation */}
          {phase?.tutor_says && (
            <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Explicación del Tutor</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{phase.tutor_says}</p>
            </div>
          )}

          {/* Student Task / Question */}
          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-500/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                Pregunta / Tarea
              </span>
            </div>
            <p className="text-xs font-medium text-white leading-relaxed">{taskText}</p>
          </div>

          {/* Participation Lock State */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Tu Respuesta
              </label>
              <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                tutor.isAnsweringAllowed
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-pulse'
                  : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
              }`}>
                {tutor.isAnsweringAllowed ? (
                  <>
                    <Unlock className="w-2.5 h-2.5" />
                    <span>Habilitado</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-2.5 h-2.5" />
                    <span>En espera</span>
                  </>
                )}
              </div>
            </div>

            {/* If answers are locked by teacher */}
            {!tutor.isAnsweringAllowed ? (
              <div className="bg-amber-950/20 border border-amber-500/25 rounded-xl p-3 text-center space-y-1">
                <Lock className="w-5 h-5 text-amber-400 mx-auto opacity-80" />
                <p className="text-xs font-semibold text-amber-200">
                  Respuestas pausadas por el profesor
                </p>
                <p className="text-[11px] text-amber-300/70 leading-relaxed">
                  Presta atención a la explicación en clase. En breve el profesor habilitará este espacio para que puedas responder.
                </p>
              </div>
            ) : (
              /* When unlocked: Answer textarea & controls */
              <div className="space-y-2">
                <textarea
                  value={tutor.studentInput}
                  onChange={e => tutor.setStudentInput(e.target.value)}
                  placeholder="Escribe tu respuesta aquí para evaluarla con el tutor..."
                  rows={3}
                  disabled={tutor.isEvaluating}
                  data-gramm="false"
                  spellCheck={false}
                  className="w-full bg-slate-900/80 border border-white/10 text-slate-100 text-xs rounded-xl p-3 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all resize-none shadow-inner"
                />

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleToggleMic}
                    type="button"
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                      tutor.isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5'
                    }`}
                    title={tutor.isListening ? 'Detener micrófono' : 'Dictar por voz'}
                  >
                    {tutor.isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{tutor.isListening ? 'Parar' : 'Dictar'}</span>
                  </button>

                  <button
                    onClick={handleSendAnswer}
                    disabled={tutor.isEvaluating || !tutor.studentInput.trim()}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/25 disabled:opacity-40"
                  >
                    {tutor.isEvaluating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluando con IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Enviar al Tutor</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Feedback & Score Card */}
          {tutor.lastFeedback && (
            <div
              className={`rounded-xl p-3 border transition-all animate-fade-in ${
                (tutor.lastScore ?? 0) >= 70
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/30 border-red-500/40 text-red-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {(tutor.lastScore ?? 0) >= 70 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {(tutor.lastScore ?? 0) >= 70 ? '¡Buen trabajo!' : 'Por mejorar'}
                  </span>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-black/40 border border-white/10">
                  {tutor.lastScore}/100
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{tutor.lastFeedback}</p>
              <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                <span>✓ Enviado a la clase</span>
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
