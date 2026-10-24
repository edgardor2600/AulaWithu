import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import type { SubtitleAnalysisResult, VocabularyType } from '../../../types/subtitles';

export const SAMPLE_SUBTITLE_DIALOGUE = `1
00:00:01,000 --> 00:00:05,000
Dr. Watson: Where have you been, Holmes? We have been waiting for hours.

2
00:00:05,500 --> 00:00:10,000
Sherlock: I was investigating the mysterious footprints outside the manor. It seems someone broke in right before midnight.

3
00:00:10,500 --> 00:00:14,000
Dr. Watson: Did they manage to get away with the secret documents?

4
00:00:14,500 --> 00:00:19,000
Sherlock: Remarkably, they left them untouched. Their true target was something entirely unexpected.`;

export function useSubtitleAnalyzer(onQuizExported?: (quizData: any) => void) {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<SubtitleAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'vocabulary' | 'quiz'>('upload');
  const [vocabFilter, setVocabFilter] = useState<VocabularyType | 'all'>('all');

  const handleFileSelect = useCallback((selected: File | null) => {
    setFile(selected);
  }, []);

  const handleLoadSample = useCallback(() => {
    setFile(null);
    setRawText(SAMPLE_SUBTITLE_DIALOGUE);
    toast.success('Diálogo de ejemplo cargado. ¡Haz clic en Analizar!');
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file && !rawText.trim()) {
      toast.error('Selecciona un archivo .srt/.vtt o pega texto de subtítulos/diálogo');
      return;
    }

    if (!file && rawText.trim()) {
      const words = rawText.trim().split(/\s+/).filter(Boolean).length;
      if (words < 10) {
        toast.error('El texto es muy breve (mínimo 10 palabras). Agrega más oraciones o haz clic en "Pegar ejemplo".');
        return;
      }
    }

    setIsAnalyzing(true);
    const toastId = toast.loading('Analizando gramática y vocabulario con IA...');

    try {
      let response;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        response = await api.post<SubtitleAnalysisResult>('/subtitles/analyze', formData);
      } else {
        response = await api.post<SubtitleAnalysisResult>('/subtitles/analyze', { text: rawText });
      }

      setResult(response.data);
      setActiveTab('vocabulary');
      toast.success('¡Análisis pedagógico completado con éxito!', { id: toastId });
    } catch (err: any) {
      console.error('[useSubtitleAnalyzer] Error:', err);
      const msg = err.response?.data?.error || err.message || 'Error al analizar los subtítulos';
      toast.error(msg, { id: toastId });
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, rawText]);

  const handleExportQuiz = useCallback(async () => {
    if (!result || result.questions.length === 0) {
      toast.error('No hay preguntas disponibles para exportar');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Exportando quiz a la biblioteca de clase...');

    try {
      const res = await api.post('/subtitles/export-quiz', {
        title: `Quiz: ${result.title || 'Subtítulos'}`,
        questions: result.questions,
      });

      toast.success('¡Quiz guardado en la biblioteca con éxito!', { id: toastId });
      if (onQuizExported) {
        onQuizExported(res.data.quiz);
      }
    } catch (err: any) {
      console.error('[useSubtitleAnalyzer] Export error:', err);
      const msg = err.response?.data?.error || 'Error al exportar el quiz';
      toast.error(msg, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  }, [result, onQuizExported]);

  const filteredVocabulary = result?.vocabulary.filter((item) => {
    if (vocabFilter === 'all') return true;
    if (vocabFilter === 'idiom') return item.type === 'idiom' || item.type === 'expression';
    if (vocabFilter === 'adjective') return item.type === 'adjective' || item.type === 'adverb';
    return item.type === vocabFilter;
  }) || [];

  const handleReset = useCallback(() => {
    setFile(null);
    setRawText('');
    setResult(null);
    setActiveTab('upload');
  }, []);

  return {
    file,
    rawText,
    setRawText,
    handleFileSelect,
    isAnalyzing,
    isExporting,
    result,
    activeTab,
    setActiveTab,
    vocabFilter,
    setVocabFilter,
    filteredVocabulary,
    handleAnalyze,
    handleExportQuiz,
    handleReset,
    handleLoadSample,
  };
}
