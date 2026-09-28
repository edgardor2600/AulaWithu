import { Volume2 } from 'lucide-react';
import { ReadingPanel } from '../ReadingPanel';
import { ReadingStudentWidget } from '../ReadingStudentWidget';
import { ConversationPanel } from '../ConversationPanel';
import { ConversationStudentWidget } from '../ConversationStudentWidget';
import { GlobalTimerPanel } from '../GlobalTimerPanel';
import { PresenterPanel } from '../PresenterPanel';
import { PresenterCompactNav } from '../PresenterCompactNav';
import { ReadingGamePanel } from '../ReadingGamePanel';
import { ReadingGameSpectatorPanel } from '../ReadingGameSpectatorPanel';
import { AITutorPanel } from '../AITutorPanel';
import { AITutorStudentWidget } from '../AITutorStudentWidget';
import { AITutorFloatingBubble } from '../AITutorFloatingBubble';
import { QuizCreatorModal } from '../quiz/QuizCreatorModal';
import { QuizPlayerWidget } from '../quiz/QuizPlayerWidget';
import { QuizPodiumModal } from '../quiz/QuizPodiumModal';
import type { useReading } from '../../hooks/useReading';
import type { useConversation } from '../../hooks/useConversation';
import type { useGlobalTimer } from '../../hooks/useGlobalTimer';
import type { usePresenter } from '../../hooks/usePresenter';
import type { useReadingGame } from '../../hooks/useReadingGame';
import type { useAITutor } from '../../hooks/useAITutor';
import type { useQuizGame } from '../../hooks/useQuizGame';

interface CanvasOverlaysManagerProps {
  isTeacher: boolean;
  clientId: number | null | undefined;
  classId?: string | null;
  topicId?: string | null;
  onReloadSlides?: () => Promise<void>;
  participantsList: Array<{ clientId: number; name: string; color: string }>;

  // Feature hooks
  reading: ReturnType<typeof useReading>;
  conversation: ReturnType<typeof useConversation>;
  globalTimer: ReturnType<typeof useGlobalTimer>;
  presenter: ReturnType<typeof usePresenter>;
  readingGame: ReturnType<typeof useReadingGame>;
  aiTutor: ReturnType<typeof useAITutor>;
  quiz: ReturnType<typeof useQuizGame>;

  // Subtítulos flotantes
  subtitlesPos: { x: number; y: number };
  subtitlesSize: { width: number; height: number };
  onSubtitlesDragStart: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
  onSubtitlesResizeStart: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;

  // Shortcuts modal
  showShortcuts: boolean;
  onCloseShortcuts: () => void;
  shortcuts: Array<{ desc: string; key: string }>;

  // Audio banner
  audioBannerType: string | null;
  onCloseAudioBanner: () => void;
}

export const CanvasOverlaysManager = ({
  isTeacher,
  clientId,
  classId,
  topicId,
  onReloadSlides,
  participantsList,
  reading,
  conversation,
  globalTimer,
  presenter,
  readingGame,
  aiTutor,
  quiz,
  subtitlesPos,
  subtitlesSize,
  onSubtitlesDragStart,
  onSubtitlesResizeStart,
  showShortcuts,
  onCloseShortcuts,
  shortcuts,
  audioBannerType,
  onCloseAudioBanner,
}: CanvasOverlaysManagerProps) => {
  const subtitlesFontSize = Math.max(11, Math.min(36, Math.round(subtitlesSize.width * 0.035)));

  return (
    <>
      {/* Panel de Lectura / TTS / IPA — Profesor */}
      {isTeacher && (
        <ReadingPanel
          reading={reading}
          isOpen={reading.showReadingPanel}
          onClose={() => reading.setShowReadingPanel(false)}
        />
      )}

      {/* Widget de Lectura Sincronizada — Alumno */}
      {!isTeacher && <ReadingStudentWidget reading={reading} />}

      {/* Conversation Panel — Teacher only */}
      {isTeacher && <ConversationPanel conversation={conversation} />}

      {/* Conversation Student Widget — Student only */}
      {!isTeacher && <ConversationStudentWidget conversation={conversation} />}

      {/* Subtítulos Flotantes Sincronizados */}
      {conversation.showSubtitles &&
        conversation.isPlaying &&
        conversation.currentClipIndex !== -1 &&
        conversation.currentClipIndex < conversation.clips.length && (
          <div
            id="conversation-subtitles"
            onMouseDown={onSubtitlesDragStart}
            onTouchStart={onSubtitlesDragStart}
            style={{
              position: 'fixed',
              left: `${subtitlesPos.x}px`,
              top: `${subtitlesPos.y}px`,
              width: `${subtitlesSize.width}px`,
              height: `${subtitlesSize.height}px`,
            }}
            className="z-50 bg-slate-900/90 backdrop-blur-md border border-violet-500/40 border-l-4 border-l-violet-500 rounded-xl px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center justify-center cursor-move select-none transition-all duration-75 animate-fade-in group"
          >
            <div
              id="conversation-subtitles-text"
              style={{ fontSize: `${subtitlesFontSize}px` }}
              className="text-center font-sans leading-relaxed text-slate-200 w-full overflow-y-auto max-h-full custom-scrollbar pr-1"
            >
              <strong className="text-violet-400 font-bold uppercase tracking-wider text-[0.8em] mr-2">
                {conversation.clips[conversation.currentClipIndex].speaker}:
              </strong>
              {conversation.clips[conversation.currentClipIndex].text}
            </div>

            {/* Tirador Resize */}
            <div
              id="conversation-subtitles-resize"
              onMouseDown={onSubtitlesResizeStart}
              onTouchStart={onSubtitlesResizeStart}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5"
              title="Redimensionar subtítulos"
            >
              <svg
                className="w-2.5 h-2.5 text-violet-400/50 group-hover:text-violet-400"
                viewBox="0 0 10 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 0L0 10M10 4L4 10M10 7L7 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        )}

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onCloseShortcuts}
        >
          <div
            className="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-white">Atajos de Teclado</h2>
                <p className="text-sm text-slate-400">
                  Resumen de herramientas y acciones rapidas del tablero.
                </p>
              </div>
              <button
                onClick={onCloseShortcuts}
                className="text-slate-400 hover:text-white text-2xl leading-none"
                aria-label="Cerrar panel de atajos"
              >
                ×
              </button>
            </div>
            <div className="grid gap-2 p-6 md:grid-cols-2">
              {shortcuts.map((shortcut) => (
                <div
                  key={`${shortcut.desc}-${shortcut.key}`}
                  className="flex items-center justify-between rounded-xl bg-slate-700/50 px-3 py-2"
                >
                  <span className="text-sm text-slate-200">{shortcut.desc}</span>
                  <kbd className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs font-mono text-cyan-300">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Audio Banner */}
      {audioBannerType && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center gap-3 max-w-[90vw] animate-fade-in text-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            {audioBannerType === 'active' && (
              <p>
                <strong>Compartiendo Pantalla con Audio:</strong> Para que los estudiantes escuchen el
                video, presenta <em>esta pestaña de la pizarra</em> en Google Meet y asegúrate de marcar
                la casilla <strong>"Compartir audio de la pestaña"</strong>.
              </p>
            )}
            {audioBannerType === 'blocked' && (
              <p className="text-amber-400">
                <strong>Audio bloqueado:</strong> El navegador bloqueó el autoplay del audio. Haz clic
                en cualquier lugar del pizarrón para activarlo.
              </p>
            )}
            {audioBannerType === 'no-audio' && (
              <p className="text-amber-400">
                <strong>Sin audio capturado:</strong> No se detectó audio. Al compartir, recuerda marcar
                la opción <strong>"Compartir audio de la pestaña"</strong> en el cuadro del navegador.
              </p>
            )}
          </div>
          <button
            onClick={onCloseAudioBanner}
            className="text-slate-400 hover:text-white text-base font-bold px-1.5 leading-none transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Cronómetro Global */}
      <GlobalTimerPanel
        isOpen={globalTimer.isOpen}
        durationMinutes={globalTimer.durationMinutes}
        remainingMs={globalTimer.remainingMs}
        isRunning={globalTimer.isRunning}
        hasStarted={globalTimer.hasStarted}
        isTeacher={isTeacher}
        setOpen={globalTimer.setOpen}
        setDuration={globalTimer.setDuration}
        startTimer={globalTimer.startTimer}
        pauseTimer={globalTimer.pauseTimer}
        resetTimer={globalTimer.resetTimer}
        setRemainingFromDisplayInput={globalTimer.setRemainingFromDisplayInput}
      />

      {/* Presentador de Documentos */}
      <PresenterPanel
        isActive={presenter.isActive}
        fileName={presenter.fileName}
        slideUrls={presenter.slideUrls}
        currentIndex={presenter.currentIndex}
        isTeacher={isTeacher}
        isLoading={presenter.isLoading}
        loadingMessage={presenter.loadingMessage}
        isOpen={presenter.showPresenterPanel}
        setOpen={presenter.setShowPresenterPanel}
        showSlide={presenter.showSlide}
        endPresentation={presenter.endPresentation}
        onMinimize={() => presenter.setShowPresenterPanel(false)}
        exportCurrentSlide={presenter.exportCurrentSlide}
      />

      <PresenterCompactNav
        isActive={presenter.isActive}
        slideUrls={presenter.slideUrls}
        currentIndex={presenter.currentIndex}
        isTeacher={isTeacher}
        showSlide={presenter.showSlide}
        centerOnSlide={presenter.centerOnSlide}
        onRestore={() => presenter.setShowPresenterPanel(true)}
        onEnd={presenter.endPresentation}
        onExport={presenter.exportCurrentSlide}
      />

      {/* Reto de Velocidad de Lectura */}
      {isTeacher && <ReadingGamePanel game={readingGame} />}
      {!isTeacher && <ReadingGameSpectatorPanel game={readingGame} />}

      {/* AI Tutor */}
      {isTeacher ? (
        <AITutorPanel tutor={aiTutor} classId={classId} topicId={topicId} onReloadSlides={onReloadSlides} />
      ) : (
        <AITutorStudentWidget
          tutor={aiTutor}
          studentName={participantsList?.find((p) => p.clientId === clientId)?.name || 'Alumno'}
          clientId={clientId != null ? String(clientId) : 'guest'}
        />
      )}
      <AITutorFloatingBubble
        script={aiTutor.script}
        currentPhaseIndex={aiTutor.currentPhaseIndex}
        isSpeaking={aiTutor.isSpeaking}
        activeSlidePhaseData={aiTutor.activeSlidePhaseData}
        isOpen={isTeacher ? aiTutor.showAITutorPanel : aiTutor.showStudentWidget}
        onOpen={() => {
          if (isTeacher) {
            aiTutor.setShowAITutorPanel(true);
            aiTutor.setActiveTab('runtime');
          } else {
            aiTutor.setShowStudentWidget(true);
          }
        }}
        onStopSpeech={aiTutor.stopSpeech}
        onSpeak={aiTutor.speakCurrentPhase}
        isTeacher={isTeacher}
        isAnsweringAllowed={aiTutor.isAnsweringAllowed}
      />

      {/* Quiz Interactivo */}
      <QuizCreatorModal quiz={quiz} isTeacher={isTeacher} />
      {!isTeacher && (
        <QuizPlayerWidget
          quiz={quiz}
          clientId={clientId != null ? String(clientId) : 'guest'}
          userName={participantsList?.find((p) => p.clientId === clientId)?.name || 'Alumno'}
          isTeacher={isTeacher}
        />
      )}
      <QuizPodiumModal
        quiz={quiz}
        isTeacher={isTeacher}
        onClose={() => {
          if (isTeacher) quiz.forceStopQuiz();
        }}
      />
    </>
  );
};
