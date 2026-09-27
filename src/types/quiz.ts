export type QuestionType = 'single' | 'multi';

export interface BaseOption {
  id: string;
  label: string;
  iconName?: string;
  image?: string;
  trendType?: 'gradual' | 'sudden' | 'fluctuating' | 'stable' | 'unsure';
  level?: number;
}

export interface QuizQuestionData {
  id: string;
  qNumber: number;
  label: string;
  title: string;
  subtitle: string;
  hint: string;
  type: QuestionType;
  options: BaseOption[];
}

export type QuizState = {
  answers: Record<string, string[]>;
};

export interface AssessmentResult {
  id: string;
  date: string;
  follicularScore: number;
  conditionName: string;
  patternType: string;
  affectedZones: string[];
  sheddingIntensity: string;
  familyHistorySummary: string;
  recentTriggersSummary: string;
  scalpHealthSummary: string;
  treatmentHistorySummary: string;
  recommendations: string[];
  probabilities: {
    androgenetic: number;
    telogen: number;
    scalpFactor: number;
    tractionOrOther: number;
  };
}
