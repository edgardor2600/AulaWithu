import {
  Pencil,
  Square,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  Type,
  Eraser,
  MousePointer,
  Minus,
  Trash2,
  Save,
  FileDown,
  Undo2,
  Redo2,
  Users,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  ArrowRight,
  ImageIcon,
  FolderOpen,
  Keyboard,
  MonitorUp,
  Scissors,
  Palette,
  Timer,
  Zap,
  Bot,
  BookOpen,
  MessageSquare,
} from 'lucide-react';
import { BOARD_THEMES, type Tool, type BoardTheme } from '../../types/canvas';
import { QuizAppBarButton } from '../quiz/QuizAppBarButton';
import { useQuizGame } from '../../hooks/useQuizGame';

// ─── Props ───────────────────────────────────────────────────────────────────

interface CanvasToolbarProps {
  currentTool: Tool;
  onToolClick: (tool: Tool) => void;
  isTeacher: boolean;
  color: string;
  onColorChange: (color: string) => void;
  brushWidth: number;
  onBrushWidthChange: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoomLevel: number;
  manualZoom: string;
  onManualZoomChange: (val: string) => void;
  onManualZoomApply: (percent: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onSave: () => void;
  isSaving: boolean;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportJSON: () => void;
  onImportJSON: () => void;
  onClearCanvas: () => void;
  onShareScreen: () => void;
  onShowShortcuts: () => void;
  boardTheme: BoardTheme;
  showThemeMenu: boolean;
  onToggleThemeMenu: () => void;
  onApplyTheme: (theme: BoardTheme) => void;
  sessionId?: string | null;
  isConnected: boolean;
  participants: number;
  quiz: ReturnType<typeof useQuizGame>;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const COLORS = [
  { value: '#000000', name: 'Black' },
  { value: '#ffffff', name: 'White' },
  { value: '#ff0000', name: 'Red' },
  { value: '#00ff00', name: 'Green' },
  { value: '#0000ff', name: 'Blue' },
  { value: '#ffff00', name: 'Yellow' },
  { value: '#ff00ff', name: 'Magenta' },
  { value: '#00ffff', name: 'Cyan' },
  { value: '#ff8800', name: 'Orange' },
  { value: '#8800ff', name: 'Purple' },
];

function buildTools(isTeacher: boolean) {
  return [
    { id: 'select' as Tool, icon: MousePointer, label: 'Select', desc: 'Select and move (V)' },
    { id: 'hand' as Tool, icon: Hand, label: 'Hand', desc: 'Pan canvas (H or Space)' },
    { id: 'pencil' as Tool, icon: Pencil, label: 'Pencil', desc: 'Draw freehand (P)' },
    { id: 'cut' as Tool, icon: Scissors, label: 'Recortar', desc: 'Recortar area del canvas (X)' },
    { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle', desc: 'Add rectangle (R)' },
    { id: 'circle' as Tool, icon: CircleIcon, label: 'Circle', desc: 'Add circle (C)' },
    { id: 'line' as Tool, icon: Minus, label: 'Line', desc: 'Add line (L)' },
    { id: 'triangle' as Tool, icon: TriangleIcon, label: 'Triangle', desc: 'Add triangle' },
    { id: 'arrow' as Tool, icon: ArrowRight, label: 'Arrow', desc: 'Add arrow (A)' },
    { id: 'text' as Tool, icon: Type, label: 'Text', desc: 'Add text (T)' },
    { id: 'image' as Tool, icon: ImageIcon, label: 'Image', desc: 'Upload image (I)' },
    { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser', desc: 'Erase (E)' },
    { id: 'reading' as Tool, icon: BookOpen, label: 'Reading/TTS', desc: 'Text to Speech and Phonetics' },
    { id: 'conversation' as Tool, icon: MessageSquare, label: 'Dialogos/Conversacion', desc: 'Practica de dialogos con voces de personajes' },
    ...(isTeacher ? [{ id: 'timer' as Tool, icon: Timer, label: 'Cronometro', desc: 'Cronometro / Temporizador' }] : []),
    ...(isTeacher ? [{ id: 'presenter' as Tool, icon: MonitorUp, label: 'Presentador', desc: 'Presentar archivos PPTX, DOCX, XLSX' }] : []),
    { id: 'reading-game' as Tool, icon: Zap, label: 'Reto de Lectura', desc: 'Reto de Velocidad de Lectura con IA (G)' },
    ...(isTeacher ? [{ id: 'ai-tutor' as Tool, icon: Bot, label: 'AI Tutor', desc: 'Asistente y Tutor de Lecciones con IA' }] : []),
  ];
}

// ─── Component ───────────────────────────────────────────────────────────────

export const CanvasToolbar = ({
  currentTool,
  onToolClick,
  isTeacher,
  color,
  onColorChange,
  brushWidth,
  onBrushWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoomLevel,
  manualZoom,
  onManualZoomChange,
  onManualZoomApply,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSave,
  isSaving,
  onExportPNG,
  onExportSVG,
  onExportJSON,
  onImportJSON,
  onClearCanvas,
  onShareScreen,
  onShowShortcuts,
  boardTheme,
  showThemeMenu,
  onToggleThemeMenu,
  onApplyTheme,
  sessionId,
  isConnected,
  participants,
  quiz,
}: CanvasToolbarProps) => {
  const tools = buildTools(isTeacher);

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm shrink-0 overflow-hidden">
      <div className="px-3 py-2 overflow-x-auto custom-scrollbar">
        {/* Primera fila: Tools + Actions principales */}
        <div className="flex items-center justify-between gap-4 mb-2 min-w-max">
          {/* Tools */}
          <div className="flex items-center gap-1">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = currentTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => onToolClick(tool.id)}
                  className={`p-2 rounded transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  title={tool.desc}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
            <QuizAppBarButton quiz={quiz} isTeacher={isTeacher} />
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 rounded transition-all hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 rounded transition-all hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
            <button
              onClick={onZoomOut}
              className="p-1 hover:bg-gray-100 rounded text-gray-600"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="relative group flex items-center bg-white rounded border border-gray-200 hover:border-blue-400">
              <input
                type="text"
                className="w-10 text-center text-xs font-bold text-gray-700 border-none bg-transparent focus:ring-0 focus:outline-none p-1"
                value={manualZoom}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  onManualZoomChange(val);
                }}
                onBlur={() => {
                  if (manualZoom) {
                    let num = parseInt(manualZoom, 10);
                    if (num < 10) num = 10;
                    if (num > 500) num = 500;
                    onManualZoomApply(num);
                  } else {
                    onManualZoomChange(Math.round(zoomLevel * 100).toString());
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
              />
              <span className="text-xs text-gray-400 pr-1 pointer-events-none">%</span>
            </div>

            <button
              onClick={onZoomIn}
              className="p-1 hover:bg-gray-100 rounded text-gray-600"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={onResetZoom}
              className="p-1.5 rounded hover:bg-white transition-all"
              title="Reset"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium"
              title="Save (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onExportPNG}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition text-sm font-medium"
              title="Exportar PNG"
            >
              <FileDown className="w-3.5 h-3.5" />
              PNG
            </button>
            <button
              onClick={onExportSVG}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition text-sm font-medium"
              title="Exportar SVG"
            >
              <FileDown className="w-3.5 h-3.5" />
              SVG
            </button>
            <button
              onClick={onExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition text-sm font-medium"
              title="Exportar JSON"
            >
              <FileDown className="w-3.5 h-3.5" />
              JSON
            </button>
            <button
              onClick={onImportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition text-sm font-medium"
              title="Cargar JSON"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Cargar
            </button>

            {/* Board Theme Selector */}
            <div className="relative">
              <button
                onClick={onToggleThemeMenu}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition text-sm font-medium border border-gray-200"
                title="Tema del Pizarron"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>{BOARD_THEMES[boardTheme].emoji}</span>
                <span className="hidden md:inline">{BOARD_THEMES[boardTheme].label}</span>
              </button>
              {showThemeMenu && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[150px]">
                  {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => onApplyTheme(key)}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-indigo-50 transition text-left ${boardTheme === key ? 'font-semibold text-indigo-700 bg-indigo-50' : 'text-gray-700'}`}
                    >
                      <span className="text-base">{BOARD_THEMES[key].emoji}</span>
                      {BOARD_THEMES[key].label}
                      {boardTheme === key && <span className="ml-auto text-indigo-500 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onShareScreen}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded transition text-sm font-medium shadow-sm"
              title="Compartir Pantalla (Meet/Video)"
            >
              <MonitorUp className="w-3.5 h-3.5" />
              Compartir
            </button>
            <button
              onClick={onShowShortcuts}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded transition"
              title="Atajos (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              onClick={onClearCanvas}
              className="p-2 text-red-600 hover:bg-red-50 rounded transition"
              title="Clear"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Live Session Indicator */}
          {sessionId && (
            <>
              <div className="h-8 w-px bg-gray-300" />
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${
                isConnected
                  ? 'bg-green-50 text-green-700'
                  : 'bg-yellow-50 text-yellow-700'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                }`} />
                <Users className="w-3.5 h-3.5" />
                {isConnected ? `Live (${participants})` : 'Connecting...'}
              </div>
            </>
          )}
        </div>

        {/* Segunda fila: Colors + Brush Width */}
        <div className="flex items-center gap-4 min-w-max pb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-600">Color:</span>
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onColorChange(c.value)}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  color === c.value
                    ? 'border-blue-500 scale-110'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded">
            <label className="text-xs font-medium text-gray-600">Width:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={brushWidth}
              onChange={(e) => onBrushWidthChange(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-xs font-semibold text-gray-700 w-7 text-center">
              {brushWidth}px
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
