import { useState, useEffect, useCallback, useRef } from 'react';
import * as fabric from 'fabric';
import api from '../services/api';
import toast from 'react-hot-toast';

import { uploadImage } from '../services/uploadService';

export interface DialogueLine {
  speaker: string;
  text: string;
  delayBefore: number;
  delayAfter: number;
  audioUrl?: string | null;
}

export interface SpeakerConfig {
  voice: string;
  gender: 'Male' | 'Female';
}

export interface Story {
  id: string;
  title: string;
  topics: string;
  level: string;
  dialogueText: string;
  supplementaryText: string;
  speakers: Record<string, SpeakerConfig>;
  clips: DialogueLine[];
  imageUrl?: string;
  timestamp?: number;
}

export const useConversation = (
  canvas: fabric.Canvas | null,
  saveHistory: () => void
) => {
  const [showConversationPanel, setShowConversationPanel] = useState(false);
  const [dialogueText, setDialogueText] = useState('');
  const [supplementaryText, setSupplementaryText] = useState('');
  const [title, setTitle] = useState('');
  const [topics, setTopics] = useState('');
  const [level, setLevel] = useState('A2');
  const [numChars, setNumChars] = useState(2);
  const [charNames, setCharNames] = useState('');
  const [plot, setPlot] = useState('');
  
  const [speakers, setSpeakers] = useState<Record<string, SpeakerConfig>>({});
  const [clips, setClips] = useState<DialogueLine[]>([]);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(-1);
  const [statusText, setStatusText] = useState('Listo');
  const [isLoading, setIsLoading] = useState(false);
  
  // Library stories
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Audio state
  const [audioMode, setAudioMode] = useState<'browser' | 'server'>('server');
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [edgeVoices, setEdgeVoices] = useState<any[]>([]);
  
  // Settings for analysis
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');

  // ✅ NUEVO: Estados para Generación e Integración de Imágenes
  const [imageProvider, setImageProvider] = useState<'gemini' | 'minimax' | 'pollinations'>('gemini');
  const [imageModel, setImageModel] = useState('');
  const [imageApiKey, setImageApiKey] = useState('');
  const [imageStyle, setImageStyle] = useState('photorealistic');
  const [imageUrl, setImageUrl] = useState('');

  // ✅ NUEVO: Estado para Subtítulos
  const [showSubtitles, setShowSubtitles] = useState(false);
  
  // ✅ NUEVO: Estados para Barra de Progreso del Reproductor
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const isSeekingRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTimeoutRef = useRef<any>(null);
  const isContinuousPlayRef = useRef(false);

  // Load API key and Image settings from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(`aiTutorApiKey_${aiProvider}`) || localStorage.getItem('aiTutorApiKey') || '';
    if (savedKey) setAiApiKey(savedKey);
  }, [aiProvider]);

  useEffect(() => {
    const savedProvider = localStorage.getItem('conversationImageProvider') as any;
    if (savedProvider) setImageProvider(savedProvider || 'gemini');

    const savedModel = localStorage.getItem('conversationImageModel');
    if (savedModel) setImageModel(savedModel);

    const savedStyle = localStorage.getItem('conversationImageStyle');
    if (savedStyle) setImageStyle(savedStyle || 'photorealistic');

    const savedImgKey = localStorage.getItem('conversationImageApiKey');
    if (savedImgKey) setImageApiKey(savedImgKey);
  }, []);

  // Load browser voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        setBrowserVoices(window.speechSynthesis.getVoices());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Load edge voices from server
  const loadEdgeVoices = useCallback(async () => {
    try {
      const res = await api.get('/reading/voices');
      if (res.data && Array.isArray(res.data.voices)) {
        setEdgeVoices(res.data.voices);
      } else if (res.data && Array.isArray(res.data)) {
        setEdgeVoices(res.data);
      }
    } catch (err) {
      console.warn('Error loading Edge voices for conversation:', err);
    }
  }, []);

  useEffect(() => {
    loadEdgeVoices();
  }, [loadEdgeVoices]);

  // Configure Audio element event listeners for progress tracking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audioRef.current = audio;

      const handleTimeUpdate = () => {
        if (!isSeekingRef.current) {
          setAudioProgress(audio.currentTime);
        }
      };

      const handleDurationChange = () => {
        setAudioDuration(audio.duration || 0);
      };

      const handleLoadedMetadata = () => {
        setAudioDuration(audio.duration || 0);
        setIsAudioLoading(false);
      };

      const handleLoadStart = () => {
        setIsAudioLoading(true);
      };

      const handleCanPlay = () => {
        setIsAudioLoading(false);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('durationchange', handleDurationChange);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('canplay', handleCanPlay);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('durationchange', handleDurationChange);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.pause();
      };
    }
  }, []);

  const reportAgentStatus = useCallback(async (status: string, message: string) => {
    try {
      await api.post('/conversation/agent/status', { status, message });
    } catch (e) {
      console.warn('[ConversationHook] Error reporting agent status:', e);
    }
  }, []);

  // Stop any active playing audio
  const stopAudio = useCallback((keepContinuous: boolean = false, keepPlayingState: boolean = false) => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        if (!keepContinuous) {
          audioRef.current.src = '';
        }
      } catch (e) {
        // Ignorar errores de interrupción
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    if (!keepPlayingState) {
      setIsPlaying(false);
      reportAgentStatus('idle', 'Listo');
    }
    if (!keepContinuous) {
      isContinuousPlayRef.current = false;
    }
  }, [reportAgentStatus]);

  // Parse dialogue text manually (fallback plan)
  const parseDialogueManually = (text: string) => {
    const lines = text.split('\n');
    const detectedSpeakers: Record<string, SpeakerConfig> = {};
    const parsedClips: DialogueLine[] = [];
    let pendingDelay = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Skip pedagogical/questions header if starts with # or has special keys
      if (/^(?:[#*\s-]*)(?:\d+[\s\.)]*)?(?:preguntas|questions|vocabulario|vocabulary|respuestas|answers|traducción|translation|complementario|objetivo)/i.test(trimmed)) {
        return;
      }

      // Check speaker gender meta: "Mateo (masc)" or "Lucy (fem)"
      const metaMatch = trimmed.match(/^(?:\*\s*)?([^:\(]+?)\s*\(\s*(masc|fem|male|female)\s*\)$/i);
      if (metaMatch) {
        const name = metaMatch[1].trim();
        const rawGender = metaMatch[2].toLowerCase();
        const gender = (rawGender === 'masc' || rawGender === 'male') ? 'Male' : 'Female';
        detectedSpeakers[name] = {
          voice: gender === 'Male' ? 'en-US-RogerNeural' : 'en-US-JennyNeural',
          gender
        };
        return;
      }

      // Check inline delay lines: (1.5) or [2.0s]
      const delayMatch = trimmed.match(/^[\[\(]\s*([0-9.,]+)\s*(?:sec|secs|segs|seg|second|seconds|s)?\.?\s*[\]\)]$/i);
      if (delayMatch) {
        const delayVal = parseFloat(delayMatch[1].replace(',', '.'));
        pendingDelay += isNaN(delayVal) ? 0 : delayVal;
        return;
      }

      // Check dialogue line: "Speaker: Line content"
      const speakerMatch = trimmed.match(/^([^:\s]+(?:\s+[^:\s]+)*)\s*:\s*(.+)$/);
      if (speakerMatch) {
        const name = speakerMatch[1].trim();
        const textContent = speakerMatch[2].trim();

        // Avoid matching titles
        if (!/^(?:nivel|enfoque|vocabulario|traducción|respuesta|comprensión|objetivo)/i.test(name)) {
          if (!detectedSpeakers[name]) {
            detectedSpeakers[name] = {
              voice: 'en-US-JennyNeural',
              gender: 'Female'
            };
          }
          parsedClips.push({
            speaker: name,
            text: textContent,
            delayBefore: pendingDelay,
            delayAfter: 0
          });
          pendingDelay = 0;
        }
      }
    });

    return { speakers: detectedSpeakers, clips: parsedClips };
  };

  // Helper: Extract supplementary metadata
  const extractSupplementaryText = (text: string) => {
    const lines = text.split('\n');
    let dialogueStartIndex = -1;
    let questionsStartIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      const isMetadata = /^(?:\*|\-|\u2022)?\s*([^:\(]+?)\s*\(\s*(masc|fem|male|female)\s*\)$/i.test(trimmed);
      const speakerMatch = trimmed.match(/^([^:\s]+(?:\s+[^:\s]+)*)\s*:\s*(.+)$/);
      let isValidSpeaker = false;
      if (speakerMatch) {
        const potentialSpeaker = speakerMatch[1].trim();
        const isInvalid = /^(?:[#*\s-]*)(?:\d+[\s\.)]|nivel|enfoque|vocabulario|traducción|respuesta|comprensión|objetivo|regla|nota|note|rule|attention|importante)/i.test(potentialSpeaker);
        isValidSpeaker = !isInvalid;
      }

      if (isMetadata || isValidSpeaker) {
        dialogueStartIndex = i;
        break;
      }
    }

    if (dialogueStartIndex === -1) {
      return { dialogueText: text, supplementaryText: '' };
    }

    for (let i = dialogueStartIndex + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      const isSeparator = trimmed.startsWith('===') || trimmed.startsWith('---');
      const isQuestionsHeader = /^(?:[#*\s-]*)(?:\d+[\s\.)]*)?(?:preguntas|questions|vocabulario|vocabulary|respuestas|answers|traducción|translation|complementario|objetivo)/i.test(trimmed);

      if (isSeparator || isQuestionsHeader) {
        questionsStartIndex = i;
        break;
      }
    }

    const objectivesLines = lines.slice(0, dialogueStartIndex);
    const dialogueLines = questionsStartIndex !== -1
      ? lines.slice(dialogueStartIndex, questionsStartIndex)
      : lines.slice(dialogueStartIndex);
    const supplementaryLines = questionsStartIndex !== -1
      ? lines.slice(questionsStartIndex)
      : [];

    let supplementary = '';
    const objText = objectivesLines.join('\n').trim();
    const suppText = supplementaryLines.join('\n').trim();

    if (objText) supplementary += objText + '\n\n';
    if (suppText) supplementary += suppText;

    return {
      dialogueText: dialogueLines.join('\n').trim(),
      supplementaryText: supplementary.trim()
    };
  };

  // Analyze dialogue text
  const analyzeDialogue = async () => {
    if (!dialogueText.trim()) {
      toast.error('Por favor, ingresa un diálogo primero');
      return;
    }

    stopAudio();
    setIsLoading(true);
    setStatusText('Analizando diálogo...');
    reportAgentStatus('analyzing_text', 'Analizando diálogo...');

    // Extract supplementary material first
    const { dialogueText: dialogueOnly, supplementaryText: suppOnly } = extractSupplementaryText(dialogueText);
    setDialogueText(dialogueOnly);
    setSupplementaryText(suppOnly);

    // Save key
    if (aiApiKey) {
      localStorage.setItem(`aiTutorApiKey_${aiProvider}`, aiApiKey);
    }

    const hasKey = !!aiApiKey;
    if (!hasKey) {
      // Fallback to manual parser
      const parsed = parseDialogueManually(dialogueOnly);
      setSpeakers(parsed.speakers);
      setClips(parsed.clips);
      setIsLoading(false);
      setStatusText('Listo (Analizado manualmente - Sin API Key)');
      toast.success('Diálogo analizado localmente (sin IA)');
      reportAgentStatus('idle', 'Listo');
      return;
    }

    const prompt = `Analyze the following dialogue text. Identify all the speakers (characters), classify their gender as either Male or Female, and split the text chronologically into a sequence of dialogue lines (chunks) with their speaker names.
            
IMPORTANT: Ignore any pedagogical objectives section at the top (e.g. "1. OBJETIVO PEDAGÓGICO"), and ignore any comprehension questions, translations, answers, or vocabulary list at the end (e.g. starting with "3. PREGUNTAS" or similar). Only analyze the core dialogue section.

Dialogue Text:
"""
${dialogueOnly}
"""

Respond with ONLY a JSON object of this structure:
{
  "speakers": {
    "SPEAKER_NAME_1": { "gender": "Male" or "Female", "suggested_voice": "en-US-AriaNeural" or "en-US-RogerNeural" or other appropriate voice },
    ...
  },
  "lines": [
    { "speaker": "SPEAKER_NAME_1", "text": "the dialogue line text", "delayBefore": 0.0, "delayAfter": 0.0 },
    ...
  ]
}

Use these English voices for suggested_voice:
- Female voices: "en-US-AriaNeural", "en-US-AvaNeural", "en-US-EmmaNeural", "en-US-JennyNeural", "en-GB-SoniaNeural"
- Male voices: "en-US-RogerNeural", "en-US-BrianNeural", "en-US-GuyNeural", "en-GB-RyanNeural"
- Narrator / Other: "en-US-JennyNeural"

Rules:
1. Make sure to capture the exact order of dialogue lines.
2. The speaker names in the "lines" array must match the keys in the "speakers" object exactly.
3. Clean the dialogue lines text from parenthetical expressions or markers.
4. Estimate delays (delayBefore or delayAfter) in seconds if there are explicit markers like "(0.5s)" or "[2s]" in the text.
5. Response must be a strict JSON. No markdown fences.`;

    try {
      const res = await api.post(
        '/conversation/completion',
        {
          prompt,
          api_provider: aiProvider,
          json_mode: true,
          temperature: 0.2,
          api_model: aiModel,
        },
        {
          headers: {
            'x-gemini-api-key': aiApiKey,
          },
        }
      );

      let textResult = res.data.text.trim();
      textResult = textResult.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (textResult.startsWith('```')) {
        textResult = textResult.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
      }

      const parsedResult = JSON.parse(textResult);

      if (parsedResult.speakers && Array.isArray(parsedResult.lines)) {
        const detectedSpeakers: Record<string, SpeakerConfig> = {};
        Object.entries(parsedResult.speakers).forEach(([name, details]: [string, any]) => {
          detectedSpeakers[name] = {
            voice: details.suggested_voice || 'en-US-JennyNeural',
            gender: details.gender === 'Male' ? 'Male' : 'Female'
          };
        });

        const parsedLines = parsedResult.lines.map((l: any) => ({
          speaker: l.speaker,
          text: l.text,
          delayBefore: parseFloat(l.delayBefore) || 0,
          delayAfter: parseFloat(l.delayAfter) || 0
        }));

        setSpeakers(detectedSpeakers);
        setClips(parsedLines);
        setStatusText('Listo');
        toast.success('Diálogo analizado con IA con éxito');
      } else {
        throw new Error('Formato JSON de IA incorrecto');
      }
    } catch (err: any) {
      console.warn('Error analyzing dialogue with AI:', err);
      // Fallback
      const parsed = parseDialogueManually(dialogueOnly);
      setSpeakers(parsed.speakers);
      setClips(parsed.clips);
      setStatusText('Listo (Analizado localmente debido a error de IA)');
      toast.error('Ocurrió un error con la IA. Se utilizó análisis local.');
    } finally {
      setIsLoading(false);
      reportAgentStatus('idle', 'Listo');
    }
  };

  // Generate dialogue using AI
  const generateDialogueText = async () => {
    if (!plot.trim()) {
      toast.error('Describe la trama (plot) de la conversación');
      return;
    }

    stopAudio();
    setIsLoading(true);
    setStatusText('Generando diálogo...');
    reportAgentStatus('generating_dialogue', 'Generando diálogo...');

    if (aiApiKey) {
      localStorage.setItem(`aiTutorApiKey_${aiProvider}`, aiApiKey);
    }

    const prompt = `Actúa como un profesor de inglés experto y diseñador de material educativo. Tu tarea es crear un texto en inglés en formato de diálogo/conversación natural y educativo.
    
REGLA DE IDIOMA CRÍTICA: El diálogo en sí (las líneas de los personajes) DEBE estar escrito 100% en inglés. Bajo ninguna circunstancia escribas diálogos en español. Todo el diálogo debe ser únicamente en inglés.

Parámetros:
- Nivel académico: ${level}
- Número de personajes: ${numChars}
${charNames ? `- Nombres de personajes: ${charNames}` : ''}
- Trama/Plot: ${plot}
- Temas pedagógicos deseados: ${topics || 'Gramática natural y conversación diaria'}

Formato de salida requerido:
1. En la parte superior, añade una sección corta en español para los objetivos pedagógicos de la conversación:
"1. OBJETIVO PEDAGÓGICO
- Explicación de los temas a tratar..."

2. Luego escribe la lista de personajes y géneros en este formato:
"* Name_1 (fem)
* Name_2 (masc)"

3. Escribe el diálogo en inglés. Cada línea debe comenzar con el nombre del personaje, seguido de dos puntos y el texto. Si deseas pausas, añade marcadores de tiempo como "[1.5s]" o "(0.5s)":
"Alice: Hello, welcome.
Bob: Thank you. [1.0s]"

4. Al final, añade una sección en español y otra en inglés para material complementario, preguntas de comprensión y respuestas:
"=== MATERIAL COMPLEMENTARIO ===
3. COMPREHENSION QUESTIONS (en inglés)
- ...
4. RESPUESTAS
- ..."

Por favor, genera el material educativo completo siguiendo este formato estricto.`;

    try {
      const res = await api.post(
        '/conversation/completion',
        {
          prompt,
          api_provider: aiProvider,
          json_mode: false,
          temperature: 0.7,
          api_model: aiModel,
        },
        {
          headers: {
            'x-gemini-api-key': aiApiKey,
          },
          timeout: 90000, // 90 segundos para la generación de diálogos
        }
      );

      let textResult = res.data.text.trim();
      textResult = textResult.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      setDialogueText(textResult);
      setStatusText('Listo');
      toast.success('Diálogo generado con éxito. Presiona "Analizar" para procesar personajes.');
    } catch (err: any) {
      console.error('Error generating dialogue text:', err);
      toast.error('Error al generar el diálogo con la IA: ' + err.message);
      setStatusText('Error');
    } finally {
      setIsLoading(false);
      reportAgentStatus('idle', 'Listo');
    }
  };

  // Play a single clip
  const playClip = async (idx: number): Promise<void> => {
    if (idx < 0 || idx >= clips.length) return;
    
    stopAudio(true, true); // Detener audio anterior sin apagar la bandera continua ni el estado de reproducción
    setCurrentClipIndex(idx);
    setIsPlaying(true);
    setStatusText(`Reproduciendo línea ${idx + 1}`);
    reportAgentStatus('playing_audio', `Reproduciendo línea ${idx + 1}...`);

    const clip = clips[idx];
    const speakerConf = speakers[clip.speaker];
    const voice = speakerConf?.voice || 'en-US-JennyNeural';

    if (audioMode === 'browser') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(clip.text);
        const synthVoice = browserVoices.find(v => v.voiceURI === voice);
        if (synthVoice) {
          utterance.voice = synthVoice;
        }
        utterance.onend = () => {
          if (isContinuousPlayRef.current && idx < clips.length - 1) {
            setStatusText('Listo, esperando siguiente línea...');
            reportAgentStatus('waiting', 'Esperando siguiente línea...');
            handleContinuousPlayNext(idx);
          } else {
            setIsPlaying(false);
            setStatusText('Listo');
            reportAgentStatus('idle', 'Listo');
          }
        };
        utterance.onerror = () => {
          setIsPlaying(false);
          setStatusText('Error');
          reportAgentStatus('idle', 'Error de reproducción browser');
        };
        window.speechSynthesis.speak(utterance);
      }
    } else {
      try {
        // Build server TTS parameters
        const params = new URLSearchParams({
          text: clip.text,
          voice: voice,
          rate: '1',
          pitch: '1'
        });

        // Request Audio
        const targetUrl = `/conversation/tts?${params.toString()}`;
        const audioUrl = api.defaults.baseURL ? `${api.defaults.baseURL}${targetUrl}` : targetUrl;
        
        // Cache token auth on audio request
        let token = '';
        try {
          const authStr = localStorage.getItem('auth-storage');
          if (authStr) {
            const parsed = JSON.parse(authStr);
            token = parsed.token || '';
          }
        } catch (e) {
          console.error('Error parsing auth-storage token:', e);
        }
        
        const finalUrl = token ? `${audioUrl}&token=${encodeURIComponent(token)}` : audioUrl;

        // Reutilizar el mismo elemento Audio para evitar bloqueos del navegador en flujos secuenciales
        let audio = audioRef.current;
        if (!audio) {
          audio = new Audio();
          audioRef.current = audio;
        }
        
        // Desconectar handlers antiguos para evitar fugas y dobles disparadores
        audio.onended = null;
        audio.onerror = null;
        
        audio.src = finalUrl;
        
        audio.onended = () => {
          if (isContinuousPlayRef.current && idx < clips.length - 1) {
            setStatusText('Listo, esperando siguiente línea...');
            reportAgentStatus('waiting', 'Esperando siguiente línea...');
            handleContinuousPlayNext(idx);
          } else {
            setIsPlaying(false);
            setStatusText('Listo');
            reportAgentStatus('idle', 'Listo');
          }
        };

        audio.onerror = () => {
          setIsPlaying(false);
          setStatusText('Error al cargar audio del servidor');
          toast.error('Error al reproducir el audio del servidor');
          reportAgentStatus('idle', 'Error de carga de audio');
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            // Ignorar AbortError provocado por pause() al saltar o pausar rápido
            if (error.name !== 'AbortError') {
              console.error('Playback failed:', error);
            }
          });
        }
      } catch (err: any) {
        console.error('Error in Server TTS Play:', err);
        setIsPlaying(false);
        setStatusText('Error');
        reportAgentStatus('idle', 'Error de reproducción servidor');
      }
    }
  };

  // Logic to handle playing next segment sequentially
  const handleContinuousPlayNext = (idx: number) => {
    const nextIdx = idx + 1;
    if (nextIdx >= clips.length) {
      isContinuousPlayRef.current = false;
      setIsPlaying(false);
      setCurrentClipIndex(-1);
      setStatusText('Diálogo completo finalizado');
      reportAgentStatus('idle', 'Listo');
      return;
    }

    const currentClip = clips[idx];
    const delayAfter = currentClip.delayAfter || 0;
    const nextClip = clips[nextIdx];
    const delayBefore = nextClip.delayBefore || 0;
    const totalDelay = (delayAfter + delayBefore) * 1000; // to ms

    setStatusText(`Pausa de ${(totalDelay / 1000).toFixed(1)}s...`);
    reportAgentStatus('waiting', `Pausa de ${(totalDelay / 1000).toFixed(1)}s...`);
    
    playTimeoutRef.current = setTimeout(() => {
      playClip(nextIdx);
    }, Math.max(100, totalDelay));
  };

  // Start continuous play
  const startContinuousPlay = () => {
    if (clips.length === 0) return;
    isContinuousPlayRef.current = true;
    playClip(0);
  };

  // Toggle speaker voice settings
  const updateSpeakerVoice = (name: string, voiceURI: string) => {
    setSpeakers(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        voice: voiceURI
      }
    }));
  };

  // Insert text elements into Fabric Canvas
  const insertTextToCanvas = (content: string) => {
    if (!canvas || !content.trim()) return;

    const center = canvas.getVpCenter();
    const textElement = new fabric.IText(content.trim(), {
      fontSize: 20,
      fill: '#1e293b',
      fontFamily: 'Inter, sans-serif',
      left: center.x - 200,
      top: center.y - 100,
      width: 450,
      editable: true,
      selectable: true,
      evented: true,
    });
    
    (textElement as any).isLocalOwned = true;
    canvas.add(textElement);
    canvas.renderAll();
    saveHistory();
    toast.success('Contenido insertado en la pizarra');
  };

  // Insert dialogue lines directly to the board
  const insertDialogueToBoard = () => {
    if (clips.length === 0) {
      toast.error('No hay líneas analizadas para insertar');
      return;
    }

    if (!canvas) return;
    
    const center = canvas.getVpCenter();
    let startY = center.y - (clips.length * 30);
    const startX = center.x - 250;

    clips.forEach((clip) => {
      const blockText = `${clip.speaker}: ${clip.text}`;
      
      const lineStyles: Record<number, any> = {};
      const speakerLen = clip.speaker.length + 1; // "Alice:"
      
      // Style speaker name differently
      for (let i = 0; i < speakerLen; i++) {
        lineStyles[i] = {
          fontWeight: 'bold',
          fill: '#4f46e5', // indigo-600
        };
      }

      const textNode = new fabric.IText(blockText, {
        fontSize: 20,
        fill: '#1e293b',
        fontFamily: 'Inter, sans-serif',
        left: startX,
        top: startY,
        editable: true,
        selectable: true,
        evented: true,
        styles: {
          0: lineStyles
        }
      });
      (textNode as any).isLocalOwned = true;
      
      canvas.add(textNode);
      startY += 55;
    });

    canvas.renderAll();
    saveHistory();
    toast.success('Diálogo insertado en la pizarra');
  };

  // Stories library: Load stories
  const loadStoriesFromLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await api.get('/conversation/stories');
      if (res.data && Array.isArray(res.data.stories)) {
        setStories(res.data.stories);
      }
    } catch (err: any) {
      console.warn('Error fetching conversation stories:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  // Stories library: Save story
  const saveStoryToLibrary = async () => {
    if (!dialogueText.trim()) {
      toast.error('El diálogo está vacío, no se puede guardar');
      return;
    }

    const newStoryTitle = title.trim() || `Diálogo - ${new Date().toLocaleDateString()}`;
    const payload: Omit<Story, 'id'> & { id?: string } = {
      title: newStoryTitle,
      topics: topics.trim() || 'General',
      level,
      dialogueText,
      supplementaryText,
      speakers,
      clips,
      imageUrl,
      timestamp: Date.now()
    };

    if (currentStoryId) {
      payload.id = currentStoryId;
    } else {
      payload.id = Math.random().toString(36).substring(2, 11);
    }

    try {
      const res = await api.post('/conversation/stories', payload);
      if (res.data && res.data.ok) {
        toast.success(currentStoryId ? 'Historia actualizada' : 'Historia guardada en biblioteca');
        if (!currentStoryId && res.data.story?.id) {
          setCurrentStoryId(res.data.story.id);
        }
        loadStoriesFromLibrary();
      }
    } catch (err: any) {
      console.error('Error saving story to database:', err);
      toast.error('Error al guardar la historia: ' + err.message);
    }
  };

  // Stories library: Load single story
  const loadStory = (story: Story) => {
    setCurrentStoryId(story.id);
    setTitle(story.title);
    setTopics(story.topics);
    setLevel(story.level);
    setDialogueText(story.dialogueText);
    setSupplementaryText(story.supplementaryText);
    setSpeakers(story.speakers || {});
    setClips(story.clips || []);
    setImageUrl(story.imageUrl || '');
    toast.success(`Diálogo "${story.title}" cargado`);
  };

  // Stories library: Delete single story
  const deleteStory = async (storyId: string) => {
    try {
      const res = await api.delete(`/conversation/stories/${storyId}`);
      if (res.data && res.data.ok) {
        toast.success('Historia eliminada');
        if (currentStoryId === storyId) {
          setCurrentStoryId(null);
        }
        loadStoriesFromLibrary();
      }
    } catch (err: any) {
      toast.error('Error al eliminar la historia');
    }
  };

  // ✅ NUEVO: Add image to canvas from URL
  const addImageToBoard = async (imgUrl: string) => {
    if (!canvas) return;
    try {
      const img = await fabric.FabricImage.fromURL(imgUrl, {
        crossOrigin: 'anonymous',
      });

      const maxWidth = canvas.width! * 0.5; // 50% of canvas width
      const maxHeight = canvas.height! * 0.5; // 50% of canvas height
      
      const scaleX = maxWidth / (img.width || 1);
      const scaleY = maxHeight / (img.height || 1);
      const scale = Math.min(scaleX, scaleY, 1); // Don't upscale

      img.set({
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
      });

      (img as any).isLocalOwned = true;
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();

      setTimeout(() => saveHistory(), 100);
      toast.success('Imagen insertada en la pizarra');
    } catch (error) {
      console.error('Error adding image to canvas:', error);
      toast.error('Error al insertar la imagen en la pizarra');
    }
  };

  // ✅ NUEVO: Generador de Imágenes de la Conversación
  const generateConversationImage = async () => {
    if (!dialogueText.trim()) {
      toast.error('Escribe o genera un diálogo antes de crear la imagen');
      return;
    }

    setIsLoading(true);
    setStatusText('Generando imagen...');
    toast.loading('Generando imagen con IA...', { id: 'gen-image-toast' });
    reportAgentStatus('generating_image', 'Generando imagen...');

    try {
      const speakersList = Object.keys(speakers).join(', ');
      const storyContext = clips.map(c => `${c.speaker}: ${c.text}`).join(' ');

      let stylePrefix = 'A highly realistic, detailed, and visually stunning photograph.';
      let styleInstructions = 'Depict the characters in the middle of this action in a realistic, natural way with believable lighting, rich details, and realistic depth.';
      let styleNegative = 'Strictly avoid drawing, painting, vector clipart, cartoon, sketch, or SVG styles. It must be a realistic photo.';

      if (imageStyle === 'cartoon') {
        stylePrefix = 'A beautiful and vibrant cartoon illustration, style of modern animated films.';
        styleInstructions = 'Depict the characters in a fun, expressive cartoon style with clean lines, rich colors, and dynamic poses.';
        styleNegative = 'Do not make it a realistic photo or a 3D render. Strictly avoid realistic textures.';
      } else if (imageStyle === 'anime') {
        stylePrefix = 'A gorgeous anime and manga style illustration, detailed background, rich lighting.';
        styleInstructions = 'Depict the characters in high-quality anime style with expressive eyes, beautiful cell shading, and dramatic anime atmosphere.';
        styleNegative = 'Do not make it a realistic photo. Avoid western cartoon style.';
      } else if (imageStyle === 'watercolor') {
        stylePrefix = 'A beautiful watercolor painting, elegant and soft textures, flowing colors.';
        styleInstructions = 'Depict the scene with watercolor splatters, soft hand-painted edges, and a clean artistic feel.';
        styleNegative = 'Do not make it a photo, 3D render, or digital vector graphic. Avoid solid digital fills.';
      } else if (imageStyle === 'oil-painting') {
        stylePrefix = 'A classic, detailed oil painting on canvas, thick visible brushstrokes, rich lighting.';
        styleInstructions = 'Depict the characters with fine art textures, dramatic chiaroscuro lighting, and classical composition.';
        styleNegative = 'Do not make it a photograph, 3D render, or vector clipart.';
      } else if (imageStyle === '3d-render') {
        stylePrefix = 'A stunning 3D digital render, Pixar / Disney animated movie style, detailed characters.';
        styleInstructions = 'Depict the characters with smooth stylized surfaces, beautiful subsurface scattering skin shaders, and cinematic warm lighting.';
        styleNegative = 'Do not make it a realistic photo, hand-drawn sketch, or 2D painting.';
      } else if (imageStyle === 'sketch') {
        stylePrefix = 'A detailed pencil sketch drawing on textured paper, fine cross-hatching, artistic shading.';
        styleInstructions = 'Depict the characters and scene in a hand-drawn pencil style with rich values of grey, graphite textures, and beautiful draftsmanship.';
        styleNegative = 'Do not write text. Strictly avoid color. Do not make it a photo or digital painting.';
      } else if (imageStyle === 'comic') {
        stylePrefix = 'A vintage comic book panel illustration, retro halftone dots, bold ink outlines.';
        styleInstructions = 'Depict the scene in a classic comic book style with dynamic action lines and hand-inked details.';
        styleNegative = 'Do not write text, speech bubbles, sound effects (like BAM, POW), or captions. Do not make it a photo.';
      } else if (imageStyle === 'cyberpunk') {
        stylePrefix = 'A futuristic cyberpunk digital artwork, glowing neon lights, rain-slicked streets, high-tech atmosphere.';
        styleInstructions = 'Depict the characters in a futuristic setting with vibrant cyan and magenta neon lighting, reflections, and high-tech details.';
        styleNegative = 'Do not make it a simple cartoon. Avoid plain backgrounds.';
      } else if (imageStyle === 'fantasy') {
        stylePrefix = 'A magical fantasy illustration, ethereal atmosphere, glowing particles, whimsical details.';
        styleInstructions = 'Depict the characters in a magical, legendary style with soft light, sparkling dust, and deep atmospheric colors.';
        styleNegative = 'Do not make it a realistic photo or modern setting.';
      }

      const imagePrompt = `${stylePrefix}
Scene: The characters (${speakersList}) are in a setting matching this dialogue context: "${storyContext.substring(0, 500)}".
${styleInstructions}
CRITICAL DIRECTIONS FOR THE IMAGE GENERATOR:
- DO NOT write any text, words, letters, labels, speech bubbles, quotes, or captions in the image.
- The image must be 100% purely visual.
- ${styleNegative}`;

      let apiKey = imageApiKey;
      if (!apiKey) {
        apiKey = localStorage.getItem(`${imageProvider}_api_key`) ||
                 localStorage.getItem('aiTutorApiKey') ||
                 aiApiKey || '';
      }

      let imageDataUrl = '';

      if (imageProvider === 'pollinations') {
        const cleanPrompt = imagePrompt
          .replace(/[\r\n]+/g, ' ')
          .replace(/\//g, ' ')
          .replace(/"/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        const encoded = encodeURIComponent(cleanPrompt);
        const seed = Math.floor(Math.random() * 9999);
        
        let url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=768&seed=${seed}&nologo=true&model=turbo`;
        let res;
        try {
          res = await fetch(url);
        } catch (e) {
          console.warn('[ConversationHook] Pollinations turbo failed, trying default model...', e);
        }

        if (!res || !res.ok) {
          url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=768&seed=${seed}&nologo=true`;
          res = await fetch(url);
        }

        if (!res.ok) {
          throw new Error(`Pollinations.ai retornó HTTP ${res.status}`);
        }
        
        const blob = await res.blob();
        imageDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('No se pudo leer imagen de Pollinations'));
          reader.readAsDataURL(blob);
        });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) {
          headers['x-gemini-api-key'] = apiKey;
        }

        const payload: Record<string, any> = {
          prompt: imagePrompt,
          api_provider: imageProvider,
          image_style: imageStyle,
        };
        if (imageModel) payload.api_model = imageModel;
        if (apiKey) payload.api_key = apiKey;

        const res = await api.post('/conversation/generate-drawing-image', payload, {
          headers,
          timeout: 120000, // 2 minutos para la generación de imágenes con IA
        });
        if (!res.data || !res.data.ok) {
          throw new Error(res.data?.detail || res.data?.error || `HTTP ${res.status}`);
        }
        if (!res.data.image_data_url) {
          throw new Error('El servidor no devolvió la URL de la imagen.');
        }
        imageDataUrl = res.data.image_data_url;
      }

      setImageUrl(imageDataUrl);
      toast.dismiss('gen-image-toast');
      toast.success('Imagen generada con éxito');
      setStatusText('Imagen generada');
      
      // Auto-insert image to board
      await addImageToBoard(imageDataUrl);
    } catch (error: any) {
      console.error('Error generating conversation image:', error);
      toast.dismiss('gen-image-toast');
      toast.error(`Error al generar imagen: ${error.message || error}`);
      setStatusText('Error al generar imagen');
    } finally {
      setIsLoading(false);
      reportAgentStatus('idle', 'Listo');
    }
  };

  // ✅ NUEVO: Subir Imagen Local
  const uploadConversationImage = async (file: File) => {
    try {
      setIsLoading(true);
      setStatusText('Subiendo imagen...');
      const uploadRes = await uploadImage(file);
      setImageUrl(uploadRes.url);
      
      // Add to board
      await addImageToBoard(uploadRes.url);
      toast.success('Imagen subida e insertada');
      setStatusText('Listo');
    } catch (error: any) {
      console.error('Error uploading conversation image:', error);
      toast.error(error.message || 'Error al subir la imagen');
      setStatusText('Error al subir imagen');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ NUEVO: Eliminar Imagen
  const removeConversationImage = () => {
    setImageUrl('');
    toast.success('Imagen quitada del panel');
  };

  // ✅ NUEVO: Obtener Material de Apoyo Organizado por Secciones
  const getSupplementaryGroups = useCallback(() => {
    if (!supplementaryText.trim()) return [];
    
    const lines = supplementaryText.split('\n');
    const groups: { key: string; label: string; lines: string[] }[] = [];
    let currentGroup: { key: string; label: string; lines: string[] } | null = null;

    const headers = [
      { key: 'objectives', regex: /^\s*(?:#+|\d+\.)\s*(?:\d+[\.\s]*)?(?:objetivo|objective)/i, label: 'Objetivo Pedagógico' },
      { key: 'questions_en', regex: /^\s*(?:#+|\d+\.)\s*(?:\d+[\.\s]*)?(?:preguntas.*Ingl|compreh|questions?\s+in\s+english)/i, label: 'Preguntas (Inglés)' },
      { key: 'questions_es', regex: /^\s*(?:#+|\d+\.)\s*(?:\d+[\.\s]*)?(?:traduc.*preg|questions?\s+translation|questions?\s+in\s+spanish)/i, label: 'Preguntas (Español)' },
      { key: 'answers_en', regex: /^\s*(?:#+|\d+\.)\s*(?:\d+[\.\s]*)?(?:respuestas.*Ingl|answers?\s+in\s+english)/i, label: 'Respuestas (Inglés)' },
      { key: 'answers_es', regex: /^\s*(?:#+|\d+\.)\s*(?:\d+[\.\s]*)?(?:traduc.*resp|answers?\s+translation|answers?\s+in\s+spanish)/i, label: 'Respuestas (Español)' },
      { key: 'vocabulary', regex: /^\s*(?:#+|\d+\.)\s*(?:\d+[\.\s]*)?(?:vocabulario|vocabulary)/i, label: 'Vocabulario' }
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith('===') || trimmed.startsWith('---')) {
        continue;
      }

      let matchedHeader = null;
      for (const h of headers) {
        if (h.regex.test(trimmed)) {
          matchedHeader = h;
          break;
        }
      }

      if (matchedHeader) {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          key: matchedHeader.key,
          label: matchedHeader.label,
          lines: []
        };
      } else if (currentGroup) {
        currentGroup.lines.push(line);
      }
    }

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups.map(g => ({
      key: g.key,
      label: g.label,
      content: g.lines.join('\n').trim()
    })).filter(g => g.content.length > 0);
  }, [supplementaryText]);

  const clearAll = () => {
    stopAudio();
    setDialogueText('');
    setSupplementaryText('');
    setSpeakers({});
    setClips([]);
    setCurrentStoryId(null);
    setTitle('');
    setTopics('');
    setPlot('');
    setCharNames('');
    setImageUrl('');
    toast.success('Datos limpiados');
  };

  const seekAudio = (time: number) => {
    if (audioRef.current) {
      isSeekingRef.current = true;
      audioRef.current.currentTime = time;
      setAudioProgress(time);
      isSeekingRef.current = false;
    }
  };

  const togglePlayPause = () => {
    if (clips.length === 0) return;
    
    // Si no hay ningún clip seleccionado, seleccionamos el primero
    const idx = currentClipIndex === -1 ? 0 : currentClipIndex;
    
    if (audioMode === 'browser') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.speaking) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setIsPlaying(true);
          } else {
            window.speechSynthesis.pause();
            setIsPlaying(false);
          }
        } else {
          playClip(idx);
        }
      }
    } else {
      const audio = audioRef.current;
      if (audio && audio.src) {
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
        } else {
          audio.play().then(() => {
            setIsPlaying(true);
          }).catch(err => {
            console.error('Failed to resume playback:', err);
          });
        }
      } else {
        playClip(idx);
      }
    }
  };

  const isExecutingRef = useRef(false);

  const executeAgentCommand = useCallback(async (cmd: { command: string; value?: any }) => {
    const action = cmd.command;
    const value = cmd.value;

    console.log('[ConversationHook] Executing remote agent command:', action, value);

    switch (action) {
      case 'open_panel':
        setShowConversationPanel(true);
        break;
      case 'close_panel':
        setShowConversationPanel(false);
        break;
      case 'set_prompt':
        if (value !== undefined) setPlot(value);
        break;
      case 'generate_dialogue':
        generateDialogueText();
        break;
      case 'analyze_text':
        analyzeDialogue();
        break;
      case 'generate_audio':
        // Edge TTS audios are generated on the fly, but we report ready
        reportAgentStatus('idle', 'Listo');
        break;
      case 'generate_image':
        generateConversationImage();
        break;
      case 'clear':
        clearAll();
        break;
      default:
        console.warn('[ConversationHook] Unknown remote command:', action);
    }
  }, [generateDialogueText, analyzeDialogue, generateConversationImage, clearAll, reportAgentStatus]);

  const pollAgentCommands = useCallback(async () => {
    if (isExecutingRef.current) return;
    try {
      const res = await api.get('/conversation/agent/commands');
      if (res.data && res.data.ok && Array.isArray(res.data.commands) && res.data.commands.length > 0) {
        isExecutingRef.current = true;
        try {
          for (const cmd of res.data.commands) {
            await executeAgentCommand(cmd);
          }
        } finally {
          isExecutingRef.current = false;
        }
      }
    } catch (e) {
      // Ignore network errors during HMR or when backend is sleeping
    }
  }, [executeAgentCommand]);

  useEffect(() => {
    const interval = setInterval(() => {
      pollAgentCommands();
    }, 1500);
    return () => clearInterval(interval);
  }, [pollAgentCommands]);

  return {
    showConversationPanel,
    setShowConversationPanel,
    dialogueText,
    setDialogueText,
    supplementaryText,
    setSupplementaryText,
    title,
    setTitle,
    topics,
    setTopics,
    level,
    setLevel,
    numChars,
    setNumChars,
    charNames,
    setCharNames,
    plot,
    setPlot,
    speakers,
    clips,
    currentStoryId,
    isPlaying,
    currentClipIndex,
    statusText,
    isLoading,
    stories,
    isLoadingLibrary,
    audioMode,
    setAudioMode,
    browserVoices,
    edgeVoices,
    aiProvider,
    setAiProvider,
    aiApiKey,
    setAiApiKey,
    aiModel,
    setAiModel,

    // ✅ NUEVO: Estados y setters de imágenes y subtítulos
    imageProvider,
    setImageProvider,
    imageModel,
    setImageModel,
    imageApiKey,
    setImageApiKey,
    imageStyle,
    setImageStyle,
    imageUrl,
    setImageUrl,
    showSubtitles,
    setShowSubtitles,
    
    // ✅ NUEVO: Progreso y Carga de Audio
    audioProgress,
    audioDuration,
    isAudioLoading,

    // Actions
    analyzeDialogue,
    generateDialogueText,
    playClip,
    startContinuousPlay,
    stopAudio,
    updateSpeakerVoice,
    insertTextToCanvas,
    insertDialogueToBoard,
    loadStoriesFromLibrary,
    saveStoryToLibrary,
    loadStory,
    deleteStory,
    clearAll,
    seekAudio,
    togglePlayPause,

    // ✅ NUEVO: Nuevas acciones expuestas
    generateConversationImage,
    uploadConversationImage,
    removeConversationImage,
    getSupplementaryGroups,
    addImageToBoard
  };
};

export type UseConversationReturn = ReturnType<typeof useConversation>;
