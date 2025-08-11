export enum Severity {
  NONE = 'none',
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe'
}

export interface SymptomLog {
  _id?: string;
  userId: string;
  symptom: string;
  severity: Severity;
  tags: string[];
  occurredAt: Date;
  context: string;
  flareId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SymptomOverviewRow {
  symptom: string;
  firstLogged: Date;
  mostRecent: Date;
  count: number;
  trend: 'escalating' | 'improving' | 'stable' | 'insufficient-data';
  trendEmoji: string;
  trendText: string;
}

export interface FunctionalImpactSummary {
  _id?: string;
  userId: string;
  text: string;
  isUserEdited: boolean;
  lastUpdatedAt: Date;
  createdAt: Date;
}

export interface SymptomOverviewResponse {
  symptoms: SymptomOverviewRow[];
  functionalImpact: FunctionalImpactSummary | null;
}

export interface GenerateSummaryRequest {
  symptomData: SymptomOverviewRow[];
  userId: string;
}

export interface UpdateSummaryRequest {
  text: string;
  userId: string;
}
