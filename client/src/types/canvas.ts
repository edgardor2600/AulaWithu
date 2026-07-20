// Shared types for CanvasEditor and its hooks

export type Tool =
  | 'select'
  | 'pencil'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'triangle'
  | 'arrow'
  | 'text'
  | 'eraser'
  | 'hand'
  | 'image'
  | 'reading'
  | 'conversation'
  | 'cut';

export type BoardTheme = 'white' | 'notebook' | 'green' | 'blackboard' | 'cork';

export interface BoardThemeConfig {
  label: string;
  bg: string;
  emoji: string;
}

export const BOARD_THEMES: Record<BoardTheme, BoardThemeConfig> = {
  white:      { label: 'Blanco',        bg: '#ffffff', emoji: '⬜' },
  notebook:   { label: 'Cuaderno',      bg: '#f0f4ff', emoji: '📓' },
  green:      { label: 'Verde Escolar', bg: '#1a5c1a', emoji: '🟢' },
  blackboard: { label: 'Pizarrón',      bg: '#1a1a2e', emoji: '⬛' },
  cork:       { label: 'Corcho',        bg: '#c8a46e', emoji: '🟫' },
};

export type AudioBannerType = 'active' | 'blocked' | 'no-audio' | null;
