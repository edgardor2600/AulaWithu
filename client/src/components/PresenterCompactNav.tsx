import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Target,
  FileText,
  Trash2,
  Download
} from 'lucide-react';

interface PresenterCompactNavProps {
  isActive: boolean;
  slideUrls: string[];
  currentIndex: number;
  isTeacher: boolean;
  showSlide: (index: number) => void;
  centerOnSlide: (index: number) => void;
  onRestore: () => void;
  onEnd?: () => void;
  onExport?: () => void;
}

export const PresenterCompactNav: React.FC<PresenterCompactNavProps> = ({
  isActive,
  slideUrls,
  currentIndex,
  isTeacher,
  showSlide,
  centerOnSlide,
  onRestore,
  onEnd,
  onExport
}) => {
  if (!isActive || slideUrls.length === 0 || currentIndex < 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-full py-1.5 pl-4 pr-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-white animate-fade-in">
      {/* File Info */}
      <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="text-xs font-mono font-medium text-slate-300">
          Slide {currentIndex + 1} / {slideUrls.length}
        </span>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-1">
        {isTeacher ? (
          <>
            <button
              onClick={() => showSlide(currentIndex - 1)}
              disabled={currentIndex <= 0}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Diapositiva anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => showSlide(currentIndex + 1)}
              disabled={currentIndex >= slideUrls.length - 1}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Diapositiva siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => centerOnSlide(currentIndex)}
            className="p-1.5 rounded-full hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 px-2.5"
            title="Centrar en diapositiva activa"
          >
            <Target className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Seguir</span>
          </button>
        )}

        <button
          onClick={onRestore}
          className="p-1.5 rounded-full hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 transition-colors ml-1"
          title="Ver panel completo"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {onExport && (
          <button
            onClick={onExport}
            className="p-1.5 rounded-full hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 transition-colors ml-1"
            title="Guardar como nueva diapositiva en PC (HD PNG)"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {onEnd && (
          <button
            onClick={onEnd}
            className="p-1.5 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-200 transition-colors ml-1"
            title="Eliminar presentación y volver al tablero"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};


