import React, { useState } from 'react';

interface RemoteLiveWord {
  text: string;
  result?: 'ok' | 'bad';
}

interface RemoteEvaluation {
  overall_score: number;
  pronunciation_score: number;
  feedback: string;
  transcript: string;
}

interface ReadingGameSpectatorPanelProps {
  phase: 'idle' | 'countdown' | 'reading' | 'evaluating' | 'results';
  storyTitle: string;
  storyText: string;
  activeWordIndex: number;
  countdown: number | null;
  liveWords: RemoteLiveWord[];
  lastEvaluation: RemoteEvaluation | null;
}

/**
 * ReadingGameSpectatorPanel
 *
 * Read-only overlay shown to students while the teacher runs a Reading Game session.
 * All state comes from Yjs (via useReadingGame hook's remote* fields).
 * Students observe the teleprompter, live word coloring, countdown, and final results.
 */
export const ReadingGameSpectatorPanel: React.FC<ReadingGameSpectatorPanelProps> = ({
  phase,
  storyTitle,
  activeWordIndex,
  countdown,
  liveWords,
  lastEvaluation,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // Only show when the game is actively running or showing results
  if (phase === 'idle') return null;

  const isCountdown   = phase === 'countdown';
  const isReading     = phase === 'reading';
  const isEvaluating  = phase === 'evaluating';
  const isResults     = phase === 'results';

  const scoreColor = (s: number) =>
    s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <>
      {/* ─── Countdown overlay ─────────────────────────────────────── */}
      {isCountdown && countdown !== null && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9900,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', letterSpacing: '0.12em', marginBottom: 20 }}>
            EL PROFESOR EMPIEZA EL RETO DE LECTURA
          </div>
          <div style={{
            fontSize: 120, fontWeight: 900,
            color: '#fff',
            textShadow: '0 0 60px rgba(99,102,241,0.8)',
            animation: 'readingCountdown 1s ease-in-out infinite',
            lineHeight: 1,
          }}>
            {countdown}
          </div>
          <div style={{ fontSize: 16, color: '#9ca3af', marginTop: 24 }}>
            Observa y escucha...
          </div>
        </div>
      )}

      {/* ─── Main teleprompter panel ──────────────────────────────── */}
      {(isReading || isEvaluating) && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 9800,
          background: 'rgba(10, 10, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(99,102,241,0.3)',
          fontFamily: 'Inter, system-ui, sans-serif',
          maxHeight: collapsed ? 48 : '45vh',
          transition: 'max-height 0.35s cubic-bezier(.4,0,.2,1)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px',
            borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer', userSelect: 'none',
          }}
          onClick={() => setCollapsed(c => !c)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Teleprompter icon */}
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="14" rx="3" stroke="#6366f1" strokeWidth="2"/>
                <path d="M8 20h8M12 17v3" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
                <path d="M7 9h10M7 13h6" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#c7d2fe', letterSpacing: '0.04em' }}>
                RETO DE LECTURA
              </span>
              {storyTitle && (
                <span style={{ fontSize: 12, color: '#4b5563', marginLeft: 4 }}>
                  — {storyTitle}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isEvaluating && (
                <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, animation: 'readingBlink 1s infinite' }}>
                  ⏳ Evaluando...
                </span>
              )}
              <span style={{ color: '#4b5563', fontSize: 18 }}>{collapsed ? '▲' : '▼'}</span>
            </div>
          </div>

          {/* Teleprompter text */}
          {!collapsed && (
            <div style={{ padding: '16px 24px', overflowY: 'auto', maxHeight: 'calc(45vh - 50px)' }}>
              <div style={{ fontSize: 18, lineHeight: 1.85, letterSpacing: '0.01em' }}>
                {liveWords.length > 0 ? (
                  liveWords.map((w, i) => {
                    const isActive   = i === activeWordIndex;
                    const isOk       = w.result === 'ok';
                    const isBad      = w.result === 'bad';
                    const isPast     = i < activeWordIndex;
                    const isFuture   = i > activeWordIndex;

                    let color = '#9ca3af'; // default: gray
                    if (isActive) color = '#fff';
                    else if (isOk) color = '#22c55e';
                    else if (isBad) color = '#ef4444';
                    else if (isFuture) color = '#6b7280';
                    else if (isPast && !isOk && !isBad) color = '#6b7280';

                    return (
                      <span
                        key={i}
                        style={{
                          display: 'inline-block',
                          marginRight: '0.35em',
                          color,
                          fontWeight: isActive ? 700 : 400,
                          background: isActive ? 'rgba(99,102,241,0.25)' : 'transparent',
                          borderRadius: isActive ? 4 : 0,
                          padding: isActive ? '0 4px' : '0',
                          transform: isActive ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                          textDecoration: isBad ? 'underline' : 'none',
                          textDecorationColor: '#ef4444',
                        }}
                      >
                        {w.text}
                      </span>
                    );
                  })
                ) : (
                  <span style={{ color: '#4b5563' }}>Cargando texto...</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Results overlay ──────────────────────────────────────── */}
      {isResults && lastEvaluation && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9900,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: 20,
        }}>
          <div style={{
            background: 'rgba(15,15,30,0.96)',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: 20, padding: '36px 40px', maxWidth: 520, width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            textAlign: 'center',
          }}>
            {/* Trophy icon */}
            <div style={{ fontSize: 52, marginBottom: 16 }}>🏆</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#e5e7eb', marginBottom: 8 }}>
              Reto Completado
            </div>
            {storyTitle && (
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
                {storyTitle}
              </div>
            )}

            {/* Scores */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
              {[
                { label: 'Puntuación', value: lastEvaluation.overall_score },
                { label: 'Pronunciación', value: lastEvaluation.pronunciation_score },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  flex: 1, background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${scoreColor(value)}44`,
                  borderRadius: 12, padding: '14px 10px',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor(value), lineHeight: 1 }}>
                    {value}%
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, fontWeight: 500 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Feedback */}
            {lastEvaluation.feedback && (
              <div style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 10, padding: '12px 16px',
                fontSize: 13, color: '#c7d2fe', lineHeight: 1.6, textAlign: 'left',
              }}>
                {lastEvaluation.feedback}
              </div>
            )}

            <button
              onClick={() => setCollapsed(true)}
              style={{
                marginTop: 20, padding: '10px 28px',
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.35)',
                borderRadius: 10, color: '#c7d2fe',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes readingCountdown {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes readingBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
};

export default ReadingGameSpectatorPanel;
