import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Minimize2, 
  FileText, 
  Loader2,
  Download
} from 'lucide-react';

interface PresenterPanelProps {
  isActive: boolean;
  fileName: string;
  slideUrls: string[];
  currentIndex: number;
  isTeacher: boolean;
  isLoading: boolean;
  loadingMessage: string;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  showSlide: (index: number) => void;
  endPresentation: () => void;
  onMinimize: () => void;
  exportCurrentSlide?: () => void;
}

export const PresenterPanel: React.FC<PresenterPanelProps> = ({
  isActive: _isActive,
  fileName,
  slideUrls,
  currentIndex,
  isTeacher,
  isLoading,
  loadingMessage,
  isOpen,
  setOpen: _setOpen,
  showSlide,
  endPresentation,
  onMinimize,
  exportCurrentSlide
}) => {

  if (!isOpen) return null;

  return (
    <div className="fixed top-20 right-6 z-40 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col max-h-[75vh] overflow-hidden text-white transition-all duration-300">
      {/* Cabecera / Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 rounded-t-2xl">
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
          <span className="font-semibold text-sm truncate text-slate-100" title={fileName}>
            {fileName || 'Presentador de Documentos'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {exportCurrentSlide && (
            <button
              onClick={exportCurrentSlide}
              className="p-1 rounded-lg text-emerald-400 hover:text-emerald-200 hover:bg-emerald-500/10 transition-colors"
              title="Guardar como nueva diapositiva en PC (HD PNG)"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={onMinimize}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Minimizar panel"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          {isTeacher && (
            <button 
              onClick={endPresentation}
              className="p-1 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 transition-colors"
              title="Finalizar presentación"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>


      {/* Cargando / Loading state */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-300 font-medium">{loadingMessage}</p>
        </div>
      ) : (
        <>
          {/* Deck de Diapositivas / Slide list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar max-h-[50vh]">
            {slideUrls.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No hay diapositivas disponibles
              </div>
            ) : (
              slideUrls.map((url, index) => {
                const isSelected = index === currentIndex;
                return (
                  <button
                    key={`${url}-${index}`}
                    onClick={() => showSlide(index)}
                    disabled={!isTeacher}
                    className={`w-full text-left rounded-xl overflow-hidden border transition-all duration-200 group relative flex flex-col ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                        : 'border-slate-800 bg-slate-950/20 hover:border-slate-700 hover:bg-slate-900/45'
                    }`}
                  >
                    <div className="aspect-video w-full bg-slate-950/60 relative overflow-hidden">
                      <img 
                        src={url} 
                        alt={`Diapositiva ${index + 1}`}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-102"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900/80 text-[10px] font-mono font-semibold text-indigo-300 border border-slate-700/50">
                        {index + 1}
                      </div>
                    </div>
                    <div className="px-3 py-1.5 flex items-center justify-between text-xs border-t border-slate-800/40">
                      <span className="text-slate-400 group-hover:text-slate-200 transition-colors">
                        Diapositiva {index + 1}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Navegación y Controles Inferiores / Footer navigation */}
          {slideUrls.length > 0 && (
            <div className="p-4 border-t border-slate-800/60 bg-slate-950/20 flex items-center justify-between gap-4">
              <button
                onClick={() => showSlide(currentIndex - 1)}
                disabled={!isTeacher || currentIndex <= 0}
                className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 disabled:opacity-40 disabled:hover:bg-slate-800/60 transition-colors border border-slate-700/30 text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Ant</span>
              </button>

              <span className="text-xs font-mono font-medium text-slate-400 min-w-[50px] text-center">
                {currentIndex + 1} / {slideUrls.length}
              </span>

              <button
                onClick={() => showSlide(currentIndex + 1)}
                disabled={!isTeacher || currentIndex >= slideUrls.length - 1}
                className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors text-sm font-medium"
              >
                <span>Sig</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
