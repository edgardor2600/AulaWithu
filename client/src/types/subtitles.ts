export type VocabularyType = 'phrasal_verb' | 'idiom' | 'expression' | 'adjective' | 'adverb';

export interface SubtitleVocabularyItem {
  id: string;
  term: string;
  type: VocabularyType;
  context: string;
  explanation: string;
}

export interface SubtitleQuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correct_option_index: number;
  explanation: string;
}

export interface SubtitleAnalysisResult {
  title: string;
  stats?: {
    totalCues: number;
    totalWords: number;
    estimatedDurationMinutes: number;
  };
  summary?: string;
  vocabulary: SubtitleVocabularyItem[];
  questions: SubtitleQuizQuestion[];
}
