import { Priority } from '@prisma/client';

export type IssueCategory =
  | 'missing_data'
  | 'technical_issue'
  | 'waiting_customer'
  | 'waiting_internal_team'
  | 'resource_needed'
  | 'no_issue'
  | 'other';

export const ISSUE_CATEGORIES: IssueCategory[] = [
  'missing_data',
  'technical_issue',
  'waiting_customer',
  'waiting_internal_team',
  'resource_needed',
  'no_issue',
  'other',
];

export interface AiAnalysis {
  summary: string | null;
  priority: Priority;
  has_blocker: boolean;
  issue_category: IssueCategory;
  reason: string | null;
}

export interface TranscriptionResult {
  text: string;
  modelName: string;
}

export interface AnalysisResult {
  analysis: AiAnalysis;
  modelName: string;
  raw: string | null;
  failed: boolean;
}
