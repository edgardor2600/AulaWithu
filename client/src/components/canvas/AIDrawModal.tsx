import React, { useState } from 'react';
import { X, Sparkles, Wand2, Loader2 } from 'lucide-react';
import * as fabric from 'fabric';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface AIDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  fabricCanvasRef: React.MutableRefObject<fabric.Canvas | null>;
}

const PRESET_IDEAS = [
  { label: '💧 Ciclo del agua', prompt: 'Diagrama educativo del ciclo del agua con evaporación, condensación y precipitación' },
  { label: '🧬 Estructura del ADN', prompt: 'Diagrama esquemático de la doble hélice del ADN con pares de bases identificadas' },
  { label: '🪐 Sistema Solar', prompt: 'Esquema del sol y los planetas ordenados con sus órbitas elípticas' },
  { label: '🌿 Célula Vegetal', prompt: 'Célula vegetal esquemática con pared celular, cloroplastos y vacuola central' },
  { label: '📐 Teorema de Pitágoras', prompt: 'Triángulo rectángulo con cuadrados en los catetos y la hipotenusa demostrando a^2 + b^2 = c^2' },
];

export const AIDrawModal: React.FC<AIDrawModalProps> = ({
  isOpen,
  onClose,
  fabricCanvasRef,
}) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<'whiteboard' | 'diagram' | 'scientific'>('whiteboard');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerateAndInsert = async () => {
    if (!prompt.trim()) {
      toast.error('Ingresa una descripción para el dibujo');
      return;
    }

    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('El lienzo no está disponible');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Generando diagrama vectorial con IA...');

    try {
      const res = await api.post<{ svg: string }>('/draw/generate-svg', {
        prompt: prompt.trim(),
        style,
      });

      const svgString = res.data.svg;
      if (!svgString) {
        throw new Error('No se recibió código SVG del servidor');
      }

      // Parse and group with Fabric 6
      const { objects, options } = await fabric.loadSVGFromString(svgString);
      const validObjects = objects.filter((o): o is fabric.FabricObject => o !== null);

      if (validObjects.length === 0) {
        throw new Error('No se pudieron construir objetos vectoriales a partir del SVG generado.');
      }

      const group = fabric.util.groupSVGElements(validObjects, options);

      // Center and scale sensibly
      const center = canvas.getVpCenter();
      const zoom = canvas.getZoom() || 1;
      const targetWidth = (canvas.getWidth() / zoom) * 0.45;

      group.set({
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
      });

      if (group.width && group.width > 0) {
        const scale = targetWidth / group.width;
        group.scale(scale);
      }

      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.requestRenderAll();

      toast.success('¡Diagrama insertado en la pizarra!', { id: toastId });
      onClose();
    } catch (err: any) {
      console.error('[AIDrawModal] Error generating diagram:', err);
      const msg = err.response?.data?.error || err.message || 'Error al generar el diagrama';
      toast.error(msg, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-fuchsia-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Dibujo e Ilustración con IA
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Genera diagramas vectoriales y esquemas directo al pizarrón
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Quick presets */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Ideas rápidas:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_IDEAS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(preset.prompt)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              ¿Qué diagrama o dibujo deseas generar?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: Diagrama del átomo de Bohr con electrones en niveles de energía y etiquetas..."
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Style selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Estilo visual:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'whiteboard', label: 'Pizarra / Tiza', desc: 'Líneas limpias' },
                { id: 'diagram', label: 'Esquema / Flujo', desc: 'Nodos y flechas' },
                { id: 'scientific', label: 'Científico', desc: 'Con etiquetas' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id as any)}
                  className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                    style === s.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <p>{s.label}</p>
                  <p className="text-[10px] text-slate-400 font-normal">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handleGenerateAndInsert}
              disabled={isGenerating || !prompt.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dibujando con IA...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generar e Insertar en Pizarra</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
