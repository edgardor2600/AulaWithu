import React, { useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  Loader2,
  Lightbulb,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SubtitleUploadTabProps {
  file: File | null;
  rawText: string;
  onFileSelect: (file: File | null) => void;
  onTextChange: (text: string) => void;
  onLoadSample: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export const SubtitleUploadTab: React.FC<SubtitleUploadTabProps> = ({
  file,
  rawText,
  onFileSelect,
  onTextChange,
  onLoadSample,
  onAnalyze,
  isAnalyzing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith('.srt') || dropped.name.endsWith('.vtt') || dropped.name.endsWith('.txt'))) {
      onFileSelect(dropped);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      onFileSelect(selected);
    }
  };

  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).filter(Boolean).length : 0;
  const isSrtFormat = /-->/.test(rawText);
  const isTooShort = !file && rawText.trim().length > 0 && wordCount < 10;

  return (
    <div className="space-y-5">
      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${
          file
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".srt,.vtt,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-13 h-13 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
            {file ? <FileText className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
          </div>
          {file ? (
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {(file.size / 1024).toFixed(1)} KB • Clic para cambiar archivo
              </p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">
                Arrastra tu archivo <span className="text-indigo-600 dark:text-indigo-400 font-semibold">.srt</span> o <span className="text-indigo-600 dark:text-indigo-400 font-semibold">.vtt</span> aquí
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                o haz clic para explorar en tu computadora
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Or Paste Raw Text */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            O pega el diálogo o subtítulo directamente:
          </label>
          <button
            type="button"
            onClick={onLoadSample}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
            title="Carga un diálogo de película de muestra para probar"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Pegar diálogo de ejemplo</span>
          </button>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Pega un diálogo con tiempos (.srt) o simplemente texto libre de una conversación..."
          rows={4}
          disabled={!!file}
          className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />

        {/* Real-time Format & Word Count Detection */}
        {rawText.trim() && !file && (
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2">
              {isSrtFormat ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <Clock className="w-3 h-3" />
                  <span>Subtítulo con tiempos (.SRT)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                  <FileText className="w-3 h-3" />
                  <span>Diálogo continuo / Texto libre</span>
                </span>
              )}
            </div>

            <div className="text-[11px] font-medium">
              {isTooShort ? (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>{wordCount} / 10 palabras mínimas</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{wordCount} palabras</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Friendly Warning when text is too brief */}
        {isTooShort && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p>
              El texto es muy breve para extraer vocabulario pedagógico. Agrega al menos 10 palabras o haz clic en{' '}
              <button
                type="button"
                onClick={onLoadSample}
                className="font-bold underline hover:text-amber-950 dark:hover:text-amber-100"
              >
                Pegar diálogo de ejemplo
              </button>.
            </p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="flex justify-end pt-1">
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || (!file && !rawText.trim()) || isTooShort}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analizando subtítulos...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Analizar Vocabulario y Preguntas</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
