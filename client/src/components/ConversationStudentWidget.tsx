import React, { useState } from 'react';
import type { UseConversationReturn } from '../hooks/useConversation';

interface ConversationStudentWidgetProps {
  conversation: UseConversationReturn;
}

/**
 * ConversationStudentWidget
 *
 * Compact floating widget shown to students during a live conversation session.
 * State is driven by Yjs (synced from teacher via useConversation hook).
 * Students cannot control playback — this is a display-only spectator view.
 */
export const ConversationStudentWidget: React.FC<ConversationStudentWidgetProps> = ({
  conversation,
}) => {
  const {
    clips,
    speakers,
    currentClipIndex,
    isPlaying,
    showSubtitles,
  } = conversation;

  const [collapsed, setCollapsed] = useState(false);

  const hasContent = clips.length > 0;
  const activeClip =
    currentClipIndex >= 0 && currentClipIndex < clips.length
      ? clips[currentClipIndex]
      : null;

  // Nothing to show if no story has been loaded by the teacher yet
  if (!hasContent) return null;

  const speakerName = activeClip?.speaker ?? '—';
  const clipText    = activeClip?.text ?? '';
  const progress    = currentClipIndex >= 0 ? currentClipIndex + 1 : 0;
  const total       = clips.length;

  // Assign a unique color to each speaker from a warm palette
  const palette = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
  ];
  const speakerColors: Record<string, string> = {};
  Object.keys(speakers).forEach((name, i) => {
    speakerColors[name] = palette[i % palette.length];
  });
  const speakerColor = speakerColors[speakerName] ?? '#6366f1';

  return (
    <>
      {/* ─── Main floating widget ─────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9800,
          width: collapsed ? 56 : 340,
          background: 'rgba(15, 15, 30, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(.4,0,.2,1)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Header / toggle bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: collapsed ? '14px 12px' : '10px 14px',
            background: 'rgba(99,102,241,0.18)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setCollapsed(c => !c)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Mic icon with live pulse */}
            <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" width={28} height={28}>
                <rect x="9" y="2" width="6" height="12" rx="3" fill={isPlaying ? '#6366f1' : '#6b7280'} />
                <path d="M5 10a7 7 0 0014 0"
                  stroke={isPlaying ? '#a5b4fc' : '#6b7280'}
                  strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="17" x2="12" y2="21"
                  stroke={isPlaying ? '#a5b4fc' : '#6b7280'} strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="21" x2="15" y2="21"
                  stroke={isPlaying ? '#a5b4fc' : '#6b7280'} strokeWidth="2" strokeLinecap="round" />
              </svg>
              {isPlaying && (
                <span style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 9, height: 9, borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 0 2px rgba(15,15,30,0.92)',
                  animation: 'convPulse 1.4s ease-in-out infinite',
                }} />
              )}
            </div>
            {!collapsed && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#c7d2fe', letterSpacing: '0.04em' }}>
                CONVERSACIÓN EN VIVO
              </span>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={e => { e.stopPropagation(); setCollapsed(true); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6b7280', fontSize: 20, lineHeight: 1, padding: '2px 4px',
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        {!collapsed && (
          <div style={{ padding: '14px 16px 16px' }}>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
                {progress > 0 ? `Línea ${progress} / ${total}` : `${total} líneas cargadas`}
              </span>
              {isPlaying && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#22c55e',
                  background: 'rgba(34,197,94,0.15)', padding: '2px 8px',
                  borderRadius: 20, letterSpacing: '0.06em',
                }}>
                  ● EN VIVO
                </span>
              )}
            </div>
            <div style={{
              height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2,
              marginBottom: 14, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${total > 0 ? (progress / total) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: 2, transition: 'width 0.4s ease',
              }} />
            </div>

            {/* Active clip card */}
            {activeClip ? (
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${speakerColor}44`,
                borderLeft: `3px solid ${speakerColor}`,
                borderRadius: 10, padding: '12px 14px',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, marginBottom: 6,
                  color: speakerColor, letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  {speakerName}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#e5e7eb', fontWeight: 400 }}>
                  {clipText}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#4b5563', fontSize: 13 }}>
                Esperando al profesor...
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Subtitle overlay ─────────────────────────────────────── */}
      {showSubtitles && activeClip && (
        <div style={{
          position: 'fixed', bottom: '10%', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9850, maxWidth: 700, width: '85vw',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(0,0,0,0.82)',
            color: '#fff', fontSize: 22, fontWeight: 600,
            lineHeight: 1.45, padding: '12px 28px', borderRadius: 10,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}>
            <span style={{ color: speakerColor, marginRight: 8 }}>{speakerName}:</span>
            {clipText}
          </div>
        </div>
      )}

      {/* Pulse keyframe */}
      <style>{`
        @keyframes convPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </>
  );
};

export default ConversationStudentWidget;
