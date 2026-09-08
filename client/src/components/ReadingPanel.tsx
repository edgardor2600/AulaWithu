import React from 'react';
import {
  Volume2,
  Activity,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Languages,
  Sliders,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { UseReadingReturn } from '../hooks/useReading';

interface ReadingPanelProps {
  reading: UseReadingReturn;
  isOpen: boolean;
  onClose: () => void;
}

export const ReadingPanel: React.FC<ReadingPanelProps> = ({
  reading,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-20 right-6 z-40 w-84 max-w-[calc(100vw-3rem)] bg-[#141824]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex flex-col max-h-[80vh] transition-all duration-300 animate-in fade-in slide-in-from-top-2">
      {/* Cabecera */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.03] rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white text-xs block leading-tight">Lectura y TTS / IPA</span>
            <span className="text-[10px] text-slate-400">Herramienta de fonética y voz</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          title="Cerrar panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs text-slate-300">
        {/* Texto de entrada */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Texto a fraccionar y leer:</span>
            </label>
            {reading.readingText.trim() && (
              <span className="text-[10px] text-slate-400 font-mono">
                {reading.readingText.trim().split(/\s+/).length} palabras
              </span>
            )}
          </div>
          <textarea
            className="w-full h-22 p-2.5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none text-xs text-slate-100 bg-black/30 placeholder-slate-500 transition-all outline-none"
            value={reading.readingText}
            onChange={(e) => reading.setReadingText(e.target.value)}
            placeholder="Escribe o pega aquí el texto para pronunciar y fragmentar..."
          />
        </div>

        {/* Botón de Fraccionar + IPA */}
        <button
          onClick={reading.handleSplitAndIpa}
          disabled={!reading.readingText.trim() || reading.readingStatus.includes('Generando')}
          className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white rounded-xl font-bold shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-2"
        >
          <Activity className={`w-3.5 h-3.5 ${reading.readingStatus.includes('Generando') ? 'animate-spin' : ''}`} />
          <span>{reading.readingStatus.includes('Generando') ? 'Generando IPA...' : 'Fraccionar + IPA (Pizarra)'}</span>
        </button>

        {/* Configuración de Audio (Speech) */}
        <div className="border-t border-white/10 pt-3 space-y-3">
          <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-[11px]">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Configuración de Voz</span>
          </div>

          {/* Selector de Modo */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => reading.setAudioMode('browser')}
              className={`py-1.5 rounded-lg border text-center transition font-semibold text-xs ${
                reading.audioMode === 'browser'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                  : 'border-white/10 hover:bg-white/5 text-slate-400'
              }`}
            >
              Navegador (Local)
            </button>
            <button
              onClick={() => reading.setAudioMode('server')}
              className={`py-1.5 rounded-lg border text-center transition font-semibold text-xs ${
                reading.audioMode === 'server'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                  : 'border-white/10 hover:bg-white/5 text-slate-400'
              }`}
            >
              Servidor (Edge TTS)
            </button>
          </div>

          {/* Selector de Voz */}
          <div>
            <label className="block text-slate-400 text-[10px] mb-1">
              {reading.audioMode === 'browser' ? 'Voz del Navegador:' : 'Voz Neural (Edge):'}
            </label>
            {reading.audioMode === 'browser' ? (
              <select
                className="w-full p-2 border border-white/10 rounded-lg text-slate-200 text-xs bg-black/40 focus:ring-1 focus:ring-indigo-500 outline-none"
                value={reading.voiceURI}
                onChange={(e) => reading.setVoiceURI(e.target.value)}
              >
                {reading.browserVoices.map((v, idx) => (
                  <option key={`${v.voiceURI}-${idx}`} value={v.voiceURI} className="bg-slate-900 text-slate-200">
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="w-full p-2 border border-white/10 rounded-lg text-slate-200 text-xs bg-black/40 focus:ring-1 focus:ring-indigo-500 outline-none"
                value={reading.edgeVoice}
                onChange={(e) => reading.setEdgeVoice(e.target.value)}
              >
                {reading.edgeVoices.map((v, idx) => (
                  <option key={`${v.shortName || idx}`} value={v.shortName} className="bg-slate-900 text-slate-200">
                    {v.name || v.friendlyName || v.shortName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Controles de velocidad (Rate / Pitch) */}
          <div className="grid grid-cols-2 gap-2.5 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Velocidad</span>
                <span className="font-mono text-indigo-300 font-bold">{reading.rate}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={reading.rate}
                onChange={(e) => reading.setRate(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Tono</span>
                <span className="font-mono text-indigo-300 font-bold">{reading.pitch}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={reading.pitch}
                onChange={(e) => reading.setPitch(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Configuración de Fonética (IPA) */}
        <div className="border-t border-white/10 pt-3 space-y-2.5">
          <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-[11px]">
            <Languages className="w-3.5 h-3.5 text-sky-400" />
            <span>Configuración Fonética (IPA)</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 text-[10px] mb-1">Idioma:</label>
              <select
                className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-black/40 focus:ring-1 focus:ring-indigo-500 outline-none"
                value={reading.ipaLang}
                onChange={(e) => reading.setIpaLang(e.target.value as any)}
              >
                <option value="auto" className="bg-slate-900">Auto</option>
                <option value="en" className="bg-slate-900">Inglés</option>
                <option value="es" className="bg-slate-900">Español</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] mb-1">Acento:</label>
              <select
                className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-black/40 focus:ring-1 focus:ring-indigo-500 outline-none"
                value={reading.ipaAccent}
                onChange={(e) => reading.setIpaAccent(e.target.value as any)}
              >
                <option value="us" className="bg-slate-900">Americano (US)</option>
                <option value="uk" className="bg-slate-900">Británico (UK)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] mb-1">Motor Fonético:</label>
            <select
              className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-black/40 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={reading.ipaEngine}
              onChange={(e) => reading.setIpaEngine(e.target.value as any)}
            >
              <option value="local" className="bg-slate-900">Diccionario Local O(1) [Ultra-rápido]</option>
              <option value="ai" className="bg-slate-900">IA Generativa (Gemini)</option>
            </select>
          </div>

          {reading.ipaEngine === 'ai' && (
            <div className="space-y-2 bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-500/20">
              <div className="flex items-center gap-1 text-[10px] text-indigo-300 font-semibold">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Proveedor de IA</span>
              </div>
              <div>
                <input
                  type="password"
                  className="w-full p-1.5 border border-white/10 rounded-lg text-xs text-slate-200 bg-black/40 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="API Key de Gemini..."
                  value={reading.ipaApiKey}
                  onChange={(e) => reading.setIpaApiKey(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Barra de Estado */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-2 text-center text-[10px] text-slate-400 font-mono flex items-center justify-center gap-2">
          {reading.isPlaying && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
          <span>{reading.readingStatus}</span>
        </div>

        {/* Segmentos generados con IPA */}
        {reading.readingSegments.length > 0 && (
          <div className="border-t border-white/10 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-[11px]">Frases generadas</span>
              <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                {reading.readingSegments.length} fragmento(s)
              </span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
              {reading.readingSegments.map((seg, idx) => (
                <div
                  key={seg.id || idx}
                  onClick={() => reading.playSegment(idx)}
                  className={`cursor-pointer rounded-xl p-2.5 border transition-all select-none ${
                    idx === reading.currentSegmentIndex
                      ? 'bg-indigo-600/25 border-indigo-500/60 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                      : 'bg-white/[0.02] border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.05]'
                  }`}
                >
                  <p className={`text-[11px] font-semibold leading-snug ${
                    idx === reading.currentSegmentIndex ? 'text-indigo-200' : 'text-slate-200'
                  }`}>
                    {seg.text}
                  </p>
                  {seg.ipa && (
                    <p className={`text-[10px] mt-1 font-mono leading-snug tracking-wide ${
                      idx === reading.currentSegmentIndex ? 'text-sky-300' : 'text-slate-400'
                    }`}>
                      /{seg.ipa}/
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Panel de control de reproducción fijo al pie */}
      {reading.readingSegments.length > 0 && (
        <div className="p-3 border-t border-white/10 bg-black/40 rounded-b-2xl space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Segmento {reading.currentSegmentIndex + 1} de {reading.readingSegments.length}</span>
            {reading.isPlaying && (
              <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[10px]">
                <Volume2 className="w-3 h-3 animate-pulse" />
                En vivo
              </span>
            )}
          </div>

          {/* Botones de reproducción */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                const prevIdx = Math.max(0, reading.currentSegmentIndex - 1);
                reading.playSegment(prevIdx);
              }}
              disabled={reading.currentSegmentIndex <= 0}
              className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Segmento anterior"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={reading.togglePlayPause}
              className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-full transition shadow-lg shadow-indigo-900/50 active:scale-95"
              title={reading.isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {reading.isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white translate-x-0.5" />
              )}
            </button>

            <button
              onClick={reading.stopReading}
              className="p-2 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 rounded-xl transition text-red-400"
              title="Detener reproducción"
            >
              <Volume2 className="w-4 h-4 text-red-400" />
            </button>

            <button
              onClick={() => {
                const nextIdx = Math.min(reading.readingSegments.length - 1, reading.currentSegmentIndex + 1);
                reading.playSegment(nextIdx);
              }}
              disabled={reading.currentSegmentIndex >= reading.readingSegments.length - 1}
              className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Siguiente segmento"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
