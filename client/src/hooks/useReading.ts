import { useState, useEffect, useCallback, useRef } from 'react';
import * as fabric from 'fabric';
import api from '../services/api';
import toast from 'react-hot-toast';

export interface ReadingSegment {
  id: string;
  text: string;
  ipa?: string;
}

export const useReading = (
  canvas: fabric.Canvas | null,
  saveHistory: () => void,
  ydoc?: any,
  isTeacher: boolean = true
) => {
  const [showReadingPanel, setShowReadingPanel] = useState(false);
  const [readingText, setReadingText] = useState('');
  const [readingSegments, setReadingSegments] = useState<ReadingSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [audioMode, setAudioMode] = useState<'browser' | 'server'>('browser');
  const [voiceURI, setVoiceURI] = useState('');
  const [edgeVoice, setEdgeVoice] = useState('en-US-JennyNeural');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [ipaLang, setIpaLang] = useState<'auto' | 'en' | 'es'>('auto');
  const [ipaAccent, setIpaAccent] = useState<'us' | 'uk'>('us');
  const [ipaEngine, setIpaEngine] = useState<'local' | 'gruut' | 'ai'>('local');
  const [ipaProvider, setIpaProvider] = useState('gemini');
  const [ipaModel, setIpaModel] = useState('');
  const [ipaApiKey, setIpaApiKey] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [edgeVoices, setEdgeVoices] = useState<any[]>([]);
  const [readingStatus, setReadingStatus] = useState('Listo');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [splitSize, setSplitSize] = useState(130);

  // Referencias para manejo seguro y sin fugas de recursos de audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const lastTTSKeyRef = useRef<string>('');

  // Limpieza estricta de ciclo de vida al desmontar el hook
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
        audioBlobUrlRef.current = null;
      }
    };
  }, []);

  // Cargar voces locales del navegador
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setBrowserVoices(voices);
        if (voices.length > 0) {
          const defaultVoice = voices.find(v => v.lang.startsWith('en') || v.lang.startsWith('es')) || voices[0];
          setVoiceURI(defaultVoice.voiceURI);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Cargar voces del servidor Edge TTS
  const loadEdgeVoices = useCallback(async () => {
    try {
      setReadingStatus('Cargando voces...');
      const res = await api.get('/reading/voices');
      if (res.data && Array.isArray(res.data.voices)) {
        setEdgeVoices(res.data.voices);
      } else if (res.data && Array.isArray(res.data)) {
        setEdgeVoices(res.data);
      }
      setReadingStatus('Voces del servidor cargadas');
    } catch (err) {
      console.warn('Error loading Edge voices:', err);
      setReadingStatus('Error al cargar voces');
    }
  }, []);

  useEffect(() => {
    if (audioMode === 'server') {
      loadEdgeVoices();
    }
  }, [audioMode, loadEdgeVoices]);

  // Algoritmo de fraccionamiento
  const splitTextIntoChunks = (text: string, targetLen: number): string[] => {
    targetLen = Math.max(40, targetLen || 130);
    const raw = (text || '').trim();
    if (!raw) return [];

    const paragraphs = raw
      .split(/\n{2,}|\r\n{2,}/)
      .flatMap(block => block.split(/\n/))
      .map(p => p.trim())
      .filter(Boolean);

    const allChunks: string[] = [];

    const splitLongSentence = (sentence: string, limit: number): string[] => {
      if (sentence.length <= limit) return [sentence];
      const parts: string[] = [];
      const clauseRegex = /[^,;:]+[,;:]?/g;
      const clauses = sentence.match(clauseRegex) || [sentence];

      let current = '';
      for (const clause of clauses) {
        const c = clause.trim();
        if (!c) continue;
        if (current.length === 0) {
          current = c;
        } else if ((current + ' ' + c).length <= limit) {
          current += ' ' + c;
        } else {
          if (current) parts.push(current);
          current = c;
        }
      }
      if (current) parts.push(current);
      return parts;
    };

    for (const paragraph of paragraphs) {
      const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g;
      const sentences = paragraph.match(sentenceRegex) || [paragraph];
      const trimmedSentences = sentences.map(s => s.trim()).filter(Boolean);

      let current = '';

      for (const sentence of trimmedSentences) {
        if (current.length === 0) {
          current = sentence;
        } else if ((current + ' ' + sentence).length <= targetLen) {
          current += ' ' + sentence;
        } else {
          if (current) {
            allChunks.push(...splitLongSentence(current, targetLen));
            current = '';
          }
          current = sentence;
        }
      }
      if (current) {
        allChunks.push(...splitLongSentence(current, targetLen));
      }
    }

    return allChunks.filter(c => c.trim().length > 0);
  };

  // Escribir fragmentos al canvas de FabricJS en grupo con IDs determinísticos
  const writeReadingFragmentsToBoard = useCallback((
    chunks: string[], 
    ipaLinesByChunk: string[][]
  ) => {
    if (!canvas || chunks.length === 0) return;

    // Obtener centro del canvas
    const center = canvas.getVpCenter();
    let startY = center.y - (chunks.length * 35);
    const startX = center.x - 200;

    chunks.forEach((chunk, index) => {
      const textVal = chunk.trim();
      const ipaVal = Array.isArray(ipaLinesByChunk[index]) 
        ? ipaLinesByChunk[index].join(' ').trim() 
        : '';

      const ipaString = ipaVal ? `[${ipaVal}]` : '[no ipa]';
      const combinedContent = `${textVal}\n${ipaString}`;

      // Crear estilos específicos para la línea 1 (fonética)
      const line1Styles: Record<number, any> = {};
      for (let i = 0; i < ipaString.length; i++) {
        line1Styles[i] = {
          fontSize: 16,
          fill: '#0284c7', // sky-600
          fontStyle: 'italic',
          fontFamily: 'Lucida Sans Unicode, Arial, sans-serif',
          fontWeight: 'normal'
        };
      }

      // Crear un único objeto de texto unificado
      const unifiedText = new fabric.IText(combinedContent, {
        fontSize: 22,
        fill: '#1e293b', // slate-800
        fontFamily: 'Inter, Arial, sans-serif',
        left: startX,
        top: startY,
        fontWeight: 'bold',
        editable: true,
        selectable: true,
        evented: true,
        styles: {
          1: line1Styles
        }
      });
      (unifiedText as any).isLocalOwned = true;
      (unifiedText as any).id = `reading-frag-${index}`;
      (unifiedText as any).readingSegmentIndex = index;
      (unifiedText as any).isReadingFragment = true;

      canvas.add(unifiedText);
      startY += 75; // Espaciado elegante entre frases unificadas
    });

    canvas.renderAll();
    saveHistory();
  }, [canvas, saveHistory]);

  // Resaltado visual en el canvas del fragmento activo
  const highlightSegmentOnCanvas = useCallback((index: number) => {
    if (!canvas) return;
    const objects = canvas.getObjects();
    let hasChanged = false;

    objects.forEach((obj: any) => {
      const isTarget = (obj.isReadingFragment && obj.readingSegmentIndex === index) ||
                       (obj.id === `reading-frag-${index}`);
      if (isTarget) {
        if (!obj._isReadingHighlighted) {
          obj.set({
            backgroundColor: 'rgba(99, 102, 241, 0.22)',
            stroke: '#6366f1',
            strokeWidth: 1.5,
          });
          obj._isReadingHighlighted = true;
          hasChanged = true;
        }
      } else if (obj._isReadingHighlighted) {
        obj.set({
          backgroundColor: '',
          stroke: undefined,
          strokeWidth: 0,
        });
        obj._isReadingHighlighted = false;
        hasChanged = true;
      }
    });

    if (hasChanged) {
      canvas.requestRenderAll();
    }
  }, [canvas]);

  // Sincronizar resaltado visual cuando cambia el índice
  useEffect(() => {
    highlightSegmentOnCanvas(currentSegmentIndex);
  }, [currentSegmentIndex, highlightSegmentOnCanvas]);

  // Detener reproducción y limpiar buffers
  const stopReading = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
    }
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
    setAudioElement(null);
    setIsSpeaking(false);
    setIsPlaying(false);
    setReadingStatus('Detenido');
    setCurrentTime(0);

    // Sincronizar detención en Yjs si es profesor
    if (isTeacher && ydoc) {
      try {
        const yReading = ydoc.getMap('activeReadingTTS');
        yReading.set('isPlaying', false);
        yReading.set('status', 'Detenido');
        yReading.set('audioTtsParams', null);
        yReading.set('updatedAt', Date.now());
      } catch (err) {
        console.warn('[useReading] Error updating Yjs on stop:', err);
      }
    }
  }, [isTeacher, ydoc]);

  // Reproducir un texto dado
  const speakText = useCallback(async (
    text: string, 
    onEndCallback?: () => void,
    segmentIdx?: number
  ) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    stopReading();
    setReadingStatus('Generando audio...');

    const activeIdx = segmentIdx !== undefined ? segmentIdx : currentSegmentIndex;

    // Sincronizar reproducción a los estudiantes vía Yjs
    if (isTeacher && ydoc) {
      try {
        const yReading = ydoc.getMap('activeReadingTTS');
        yReading.set('isPlaying', true);
        yReading.set('currentSegmentIndex', activeIdx);
        yReading.set('currentText', trimmed);
        yReading.set('status', 'Reproduciendo...');
        yReading.set('audioTtsParams', {
          text: trimmed,
          mode: audioMode,
          voice: audioMode === 'server' ? edgeVoice : voiceURI,
          rate,
          pitch,
        });
        yReading.set('updatedAt', Date.now());
      } catch (err) {
        console.warn('[useReading] Error broadcasting to Yjs:', err);
      }
    }

    if (audioMode === 'server') {
      try {
        const ratePercent = rate >= 1 ? `+${Math.round((rate - 1) * 100)}%` : `-${Math.round((1 - rate) * 100)}%`;
        const pitchHz = pitch >= 1 ? `+${Math.round((pitch - 1) * 10)}Hz` : `-${Math.round((1 - pitch) * 10)}Hz`;

        const payload = {
          text: trimmed,
          voice: edgeVoice || 'en-US-JennyNeural',
          rate: ratePercent,
          pitch: pitchHz,
        };

        const res = await api.post('/reading/tts', payload, { responseType: 'blob' });
        if (audioBlobUrlRef.current) {
          URL.revokeObjectURL(audioBlobUrlRef.current);
        }
        const blob = new Blob([res.data], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        audioBlobUrlRef.current = url;
        
        let audio = audioRef.current;
        if (!audio) {
          audio = new Audio();
          audioRef.current = audio;
        }
        audio.src = url;
        setAudioElement(audio);

        audio.onplay = () => {
          setIsSpeaking(true);
          setIsPlaying(true);
          setReadingStatus('Reproduciendo...');
        };
        audio.onpause = () => {
          setIsPlaying(false);
          setReadingStatus('Pausado');
          if (isTeacher && ydoc) {
            const yReading = ydoc.getMap('activeReadingTTS');
            yReading.set('isPlaying', false);
            yReading.set('status', 'Pausado');
            yReading.set('updatedAt', Date.now());
          }
        };
        audio.onended = () => {
          setIsSpeaking(false);
          setIsPlaying(false);
          setReadingStatus('Listo');
          setCurrentTime(0);
          if (isTeacher && ydoc) {
            const yReading = ydoc.getMap('activeReadingTTS');
            yReading.set('isPlaying', false);
            yReading.set('status', 'Listo');
            yReading.set('updatedAt', Date.now());
          }
          if (onEndCallback) onEndCallback();
        };
        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          setIsSpeaking(false);
          setIsPlaying(false);
          setReadingStatus('Error al reproducir');
          if (isTeacher && ydoc) {
            const yReading = ydoc.getMap('activeReadingTTS');
            yReading.set('isPlaying', false);
            yReading.set('status', 'Error');
            yReading.set('updatedAt', Date.now());
          }
        };
        audio.ontimeupdate = () => {
          if (!isScrubbing && audio) {
            setCurrentTime(audio.currentTime);
          }
        };
        audio.onloadedmetadata = () => {
          if (audio) {
            setDuration(audio.duration || 0);
          }
        };

        try {
          await audio.play();
        } catch (playError: any) {
          if (playError.name !== 'AbortError') {
            throw playError;
          }
        }
      } catch (err) {
        console.warn('Error playing audio from server:', err);
        setReadingStatus('Error en servidor TTS');
        toast.error('No se pudo conectar con el servidor TTS.');
        setIsSpeaking(false);
        setIsPlaying(false);
      }
    } else {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        toast.error('Tu navegador no soporta síntesis de voz.');
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(trimmed);
      if (voiceURI) {
        const selected = browserVoices.find(v => v.voiceURI === voiceURI);
        if (selected) utterance.voice = selected;
      }
      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPlaying(true);
        setReadingStatus('Reproduciendo...');
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPlaying(false);
        setReadingStatus('Listo');
        if (isTeacher && ydoc) {
          const yReading = ydoc.getMap('activeReadingTTS');
          yReading.set('isPlaying', false);
          yReading.set('status', 'Listo');
          yReading.set('updatedAt', Date.now());
        }
        if (onEndCallback) onEndCallback();
      };
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        setIsPlaying(false);
        console.error('SpeechSynthesis error:', e);
        setReadingStatus('Error al reproducir');
        if (isTeacher && ydoc) {
          const yReading = ydoc.getMap('activeReadingTTS');
          yReading.set('isPlaying', false);
          yReading.set('status', 'Error');
          yReading.set('updatedAt', Date.now());
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  }, [audioMode, edgeVoice, rate, pitch, voiceURI, browserVoices, stopReading, isScrubbing, isTeacher, ydoc, currentSegmentIndex]);

  const playSegment = useCallback((index: number) => {
    const segment = readingSegments[index];
    if (!segment) return;
    setCurrentSegmentIndex(index);
    speakText(segment.text, undefined, index);
  }, [readingSegments, speakText]);

  const togglePlayPause = useCallback(() => {
    if (audioMode === 'server') {
      const audio = audioRef.current;
      if (audio && audio.src) {
        if (audio.paused) {
          audio.play().catch(console.error);
        } else {
          audio.pause();
        }
      } else {
        if (currentSegmentIndex >= 0) {
          playSegment(currentSegmentIndex);
        } else if (readingSegments.length > 0) {
          playSegment(0);
        } else if (readingText.trim()) {
          speakText(readingText);
        }
      }
    } else {
      if (window.speechSynthesis.speaking) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setIsPlaying(true);
          setReadingStatus('Reproduciendo...');
        } else {
          window.speechSynthesis.pause();
          setIsPlaying(false);
          setReadingStatus('Pausado');
        }
      } else {
        if (currentSegmentIndex >= 0) {
          playSegment(currentSegmentIndex);
        } else if (readingSegments.length > 0) {
          playSegment(0);
        } else if (readingText.trim()) {
          speakText(readingText);
        }
      }
    }
  }, [audioMode, currentSegmentIndex, readingSegments, readingText, playSegment, speakText]);

  const rewindAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const forwardAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(duration, audio.currentTime + 5);
      setCurrentTime(audio.currentTime);
    }
  }, [duration]);

  // Fraccionar texto y obtener transcripción fonética IPA
  const handleSplitAndIpa = async () => {
    if (!readingText.trim()) {
      toast.error('Escribe o pega un texto en el área de texto primero.');
      return;
    }

    setReadingStatus('Fraccionando texto...');
    try {
      const chunks = splitTextIntoChunks(readingText, splitSize);
      if (chunks.length === 0) {
        toast.error('No se pudo fraccionar el texto.');
        return;
      }

      let ipaLinesByChunk: string[][] = [];

      if (ipaEngine === 'ai' || ipaEngine === 'gruut' || ipaEngine === 'local') {
        setReadingStatus(
          ipaEngine === 'ai'
            ? 'Generando IPA con IA...'
            : 'Generando IPA local O(1)...'
        );

        const lineRequests: { id: string; text: string }[] = [];
        chunks.forEach((chunk, chunkIndex) => {
          const lines = chunk.split('. ');
          lines.forEach((line, lineIndex) => {
            if (!line.trim()) return;
            lineRequests.push({
              id: `${chunkIndex}:${lineIndex}`,
              text: line
            });
          });
        });

        const res = await api.post('/reading/ipa', {
          engine: ipaEngine,
          items: lineRequests,
          preferred_lang: ipaLang,
          accent: ipaAccent,
          api_provider: ipaProvider,
          api_model: ipaModel,
          api_key: ipaApiKey,
        }, {
          headers: {
            'x-gemini-api-key': ipaApiKey
          }
        });

        if (res.data && res.data.ok) {
          const ipaMap = new Map<string, string>(
            (res.data.items || []).map((item: any) => [
              String(item?.id ?? ''),
              String(item?.ipa || '').trim()
            ])
          );

          ipaLinesByChunk = chunks.map((chunk, chunkIndex) => {
            const lines = chunk.split('. ');
            return lines.map((_, lineIndex) => {
              return ipaMap.get(`${chunkIndex}:${lineIndex}`) || '';
            });
          });
        }
      }

      const newSegments = chunks.map((chunk, index) => ({
        id: `segment-${index}`,
        text: chunk,
        ipa: Array.isArray(ipaLinesByChunk[index]) 
          ? ipaLinesByChunk[index].join(' ').trim() 
          : ''
      }));

      setReadingSegments(newSegments);
      setCurrentSegmentIndex(0);

      writeReadingFragmentsToBoard(chunks, ipaLinesByChunk);
      setReadingStatus(`Texto dividido en ${chunks.length} fragmento(s) y escrito en la pizarra.`);

      // Sincronizar segmentos generados con estudiantes vía Yjs
      if (isTeacher && ydoc) {
        try {
          const yReading = ydoc.getMap('activeReadingTTS');
          yReading.set('readingText', readingText);
          yReading.set('readingSegments', newSegments);
          yReading.set('currentSegmentIndex', 0);
          yReading.set('isPlaying', false);
          yReading.set('status', `Texto dividido en ${chunks.length} fragmento(s)`);
          yReading.set('updatedAt', Date.now());
        } catch (err) {
          console.warn('[useReading] Error syncing segments to Yjs:', err);
        }
      }
    } catch (error: any) {
      console.error('Reading split / IPA error:', error);
      setReadingStatus('Error al generar IPA');
      toast.error(`Error generando IPA: ${error.message || error}`);
    }
  };

  // ─── Yjs: Observador de Estudiante ──────────────────────────────────────────
  // Si el usuario es estudiante, recibe los segmentos y la reproducción de audio del profesor
  useEffect(() => {
    if (!ydoc || isTeacher) return;

    const yReading = ydoc.getMap('activeReadingTTS');

    const handleReadingChange = () => {
      const remoteIsPlaying = yReading.get('isPlaying') as boolean | undefined;
      const remoteSegmentIdx = yReading.get('currentSegmentIndex') as number | undefined;
      const remoteSegments = yReading.get('readingSegments') as ReadingSegment[] | undefined;
      const remoteText = yReading.get('readingText') as string | undefined;
      const remoteStatus = yReading.get('status') as string | undefined;
      const remoteAudioParams = yReading.get('audioTtsParams') as {
        text: string;
        mode: 'browser' | 'server';
        voice?: string;
        rate?: number;
        pitch?: number;
      } | null;

      if (remoteSegments !== undefined) setReadingSegments(remoteSegments);
      if (remoteSegmentIdx !== undefined) setCurrentSegmentIndex(remoteSegmentIdx);
      if (remoteText !== undefined) setReadingText(remoteText);
      if (remoteStatus !== undefined) setReadingStatus(remoteStatus);
      if (remoteIsPlaying !== undefined) setIsPlaying(remoteIsPlaying);

      // Clave de deduplicación para evitar reproducir repetidamente el mismo segmento
      const key = (remoteAudioParams && remoteIsPlaying)
        ? `${remoteSegmentIdx}::${remoteAudioParams.text}::${remoteAudioParams.mode}`
        : '';

      if (remoteIsPlaying && remoteAudioParams && key && key !== lastTTSKeyRef.current) {
        lastTTSKeyRef.current = key;

        if (remoteAudioParams.mode === 'server') {
          const rateVal = remoteAudioParams.rate ?? 1;
          const pitchVal = remoteAudioParams.pitch ?? 1;
          const ratePercent = rateVal >= 1 ? `+${Math.round((rateVal - 1) * 100)}%` : `-${Math.round((1 - rateVal) * 100)}%`;
          const pitchHz = pitchVal >= 1 ? `+${Math.round((pitchVal - 1) * 10)}Hz` : `-${Math.round((1 - pitchVal) * 10)}Hz`;

          api.post('/reading/tts', {
            text: remoteAudioParams.text,
            voice: remoteAudioParams.voice || 'en-US-JennyNeural',
            rate: ratePercent,
            pitch: pitchHz,
          }, { responseType: 'blob' })
          .then((res) => {
            if (audioBlobUrlRef.current) {
              URL.revokeObjectURL(audioBlobUrlRef.current);
            }
            const blob = new Blob([res.data], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            audioBlobUrlRef.current = url;

            let audio = audioRef.current;
            if (!audio) {
              audio = new Audio();
              audioRef.current = audio;
            }
            audio.src = url;
            audio.play().catch((err) => {
              if (err.name !== 'AbortError') {
                console.warn('[reading-student] Autoplay prevented or failed:', err);
              }
            });
          })
          .catch((err) => {
            console.error('[reading-student] TTS fetch error:', err);
          });
        } else if (remoteAudioParams.mode === 'browser') {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(remoteAudioParams.text);
            if (remoteAudioParams.rate) utter.rate = remoteAudioParams.rate;
            if (remoteAudioParams.pitch) utter.pitch = remoteAudioParams.pitch;
            if (remoteAudioParams.voice && browserVoices.length > 0) {
              const v = browserVoices.find(bv => bv.voiceURI === remoteAudioParams.voice);
              if (v) utter.voice = v;
            }
            window.speechSynthesis.speak(utter);
          }
        }
      } else if (remoteIsPlaying === false) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        if (audioRef.current) {
          audioRef.current.pause();
        }
        lastTTSKeyRef.current = '';
      }
    };

    yReading.observe(handleReadingChange);
    handleReadingChange();

    return () => {
      yReading.unobserve(handleReadingChange);
    };
  }, [ydoc, isTeacher, browserVoices]);

  return {
    showReadingPanel,
    setShowReadingPanel,
    readingText,
    setReadingText,
    readingSegments,
    setReadingSegments,
    currentSegmentIndex,
    setCurrentSegmentIndex,
    audioMode,
    setAudioMode,
    voiceURI,
    setVoiceURI,
    edgeVoice,
    setEdgeVoice,
    rate,
    setRate,
    pitch,
    setPitch,
    ipaLang,
    setIpaLang,
    ipaAccent,
    setIpaAccent,
    ipaEngine,
    setIpaEngine,
    ipaProvider,
    setIpaProvider,
    ipaModel,
    setIpaModel,
    ipaApiKey,
    setIpaApiKey,
    isSpeaking,
    isPlaying,
    browserVoices,
    edgeVoices,
    readingStatus,
    setReadingStatus,
    currentTime,
    setCurrentTime,
    duration,
    audioElement,
    isScrubbing,
    setIsScrubbing,
    splitSize,
    setSplitSize,
    // Métodos
    stopReading,
    speakText,
    playSegment,
    togglePlayPause,
    rewindAudio,
    forwardAudio,
    handleSplitAndIpa,
    highlightSegmentOnCanvas,
  };
};

export type UseReadingReturn = ReturnType<typeof useReading>;
