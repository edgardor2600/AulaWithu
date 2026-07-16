import { useState, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useReading = (
  canvas: fabric.Canvas | null,
  saveHistory: () => void
) => {
  const [showReadingPanel, setShowReadingPanel] = useState(false);
  const [readingText, setReadingText] = useState('');
  const [readingSegments, setReadingSegments] = useState<{ id: string; text: string; ipa?: string }[]>([]);
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

  // Escribir fragmentos al canvas de FabricJS en grupo
  const writeReadingFragmentsToBoard = useCallback((
    chunks: string[], 
    ipaLinesByChunk: string[][]
  ) => {
    if (!canvas || chunks.length === 0) return;

    // Obtener centro del canvas
    const center = canvas.getVpCenter();
    let startY = center.y - (chunks.length * 40);
    const startX = center.x - 200;

    chunks.forEach((chunk, index) => {
      const textVal = chunk.trim();
      const ipaVal = Array.isArray(ipaLinesByChunk[index]) 
        ? ipaLinesByChunk[index].join(' ').trim() 
        : '';

      // Texto Principal
      const mainText = new fabric.IText(textVal, {
        fontSize: 22,
        fill: '#1e293b', // slate-800
        fontFamily: 'Inter, Arial, sans-serif',
        left: startX,
        top: startY,
        fontWeight: 'bold',
        editable: true,
        selectable: true,
        evented: true,
      });
      (mainText as any).isLocalOwned = true;

      // Texto IPA
      const ipaText = new fabric.IText(ipaVal || '[no ipa]', {
        fontSize: 18, // Aumentado a 18 para mayor legibilidad
        fill: '#0284c7', // sky-600
        fontFamily: 'Lucida Sans Unicode, Arial, sans-serif',
        left: startX,
        top: startY + 32, // Colocado 32px debajo de mainText
        fontStyle: 'italic',
        editable: true,
        selectable: true,
        evented: true,
      });
      (ipaText as any).isLocalOwned = true;

      canvas.add(mainText);
      canvas.add(ipaText);
      startY += 95; // espaciado ajustado para evitar encimamiento
    });

    canvas.renderAll();
    saveHistory();
  }, [canvas, saveHistory]);

  const stopReading = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
      setAudioElement(null);
    }
    setIsSpeaking(false);
    setIsPlaying(false);
    setReadingStatus('Detenido');
    setCurrentTime(0);
  }, [audioElement]);

  const speakText = useCallback(async (text: string, onEndCallback?: () => void) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    stopReading();
    setReadingStatus('Generando audio...');

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
        const blob = new Blob([res.data], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        audio.onplay = () => {
          setIsSpeaking(true);
          setIsPlaying(true);
          setReadingStatus('Reproduciendo...');
        };
        audio.onpause = () => {
          setIsPlaying(false);
          setReadingStatus('Pausado');
        };
        audio.onended = () => {
          setIsSpeaking(false);
          setIsPlaying(false);
          setReadingStatus('Listo');
          setCurrentTime(0);
          setAudioElement(null);
          URL.revokeObjectURL(url);
          if (onEndCallback) onEndCallback();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setIsPlaying(false);
          setReadingStatus('Error al reproducir');
          setCurrentTime(0);
          setAudioElement(null);
          URL.revokeObjectURL(url);
        };
        audio.onloadedmetadata = () => {
          setDuration(audio.duration || 0);
        };
        audio.ontimeupdate = () => {
          if (audio.duration && !isScrubbing) {
            setCurrentTime(audio.currentTime);
          }
        };

        setAudioElement(audio);
        try {
          await audio.play();
        } catch (playError: any) {
          if (playError.name !== 'AbortError') {
            throw playError;
          }
          console.log('Audio playback safely aborted.');
        }
      } catch (err) {
        console.warn('Error playing audio from server:', err);
        setReadingStatus('Error en servidor TTS');
        toast.error('No se pudo conectar con el servidor TTS local.');
      }
    } else {
      if (!('speechSynthesis' in window)) {
        toast.error('Tu navegador no soporta síntesis de voz.');
        return;
      }

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
        if (onEndCallback) onEndCallback();
      };
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        setIsPlaying(false);
        console.error('SpeechSynthesis error:', e);
        setReadingStatus('Error al reproducir');
      };

      window.speechSynthesis.speak(utterance);
    }
  }, [audioMode, edgeVoice, rate, pitch, voiceURI, browserVoices, stopReading, isScrubbing]);

  const playSegment = useCallback((index: number) => {
    const segment = readingSegments[index];
    if (!segment) return;
    setCurrentSegmentIndex(index);
    speakText(segment.text);
  }, [readingSegments, speakText]);

  const togglePlayPause = useCallback(() => {
    if (audioMode === 'server') {
      if (audioElement) {
        if (audioElement.paused) {
          audioElement.play().catch(console.error);
        } else {
          audioElement.pause();
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
  }, [audioMode, audioElement, currentSegmentIndex, readingSegments, readingText, playSegment, speakText]);

  const rewindAudio = useCallback(() => {
    if (audioElement) {
      audioElement.currentTime = Math.max(0, audioElement.currentTime - 5);
      setCurrentTime(audioElement.currentTime);
    }
  }, [audioElement]);

  const forwardAudio = useCallback(() => {
    if (audioElement) {
      audioElement.currentTime = Math.min(duration, audioElement.currentTime + 5);
      setCurrentTime(audioElement.currentTime);
    }
  }, [audioElement, duration]);

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

      if (ipaEngine === 'ai' || ipaEngine === 'gruut') {
        setReadingStatus(
          ipaEngine === 'ai'
            ? 'Generando IPA con IA...'
            : 'Generando IPA local...'
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
    } catch (error: any) {
      console.error('Reading split / IPA error:', error);
      setReadingStatus('Error al generar IPA');
      toast.error(`Error generando IPA: ${error.message || error}`);
    }
  };

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
    handleSplitAndIpa
  };
};
