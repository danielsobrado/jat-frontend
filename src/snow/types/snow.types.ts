// src/snow/types/snow.types.ts

export interface SnowAnalysisFeedbackItemFE {
  score: number;
  feedback: string;
}

export interface SnowAnalysisResultFE {
  validation_result: 'pass' | 'fail';
  quality_score: number;
  missing_elements: string[];
  improvement_suggestions: string[];
  feedback: Record<string, SnowAnalysisFeedbackItemFE>; // Keys like "title", "description"
  summary: string;
}

export interface SnowHistoryItemFE {
  id: string;
  ticket_subset: Record<string, string>; // Key fields sent to LLM
  llm_prompt: string;
  llm_response_raw: string;
  analysis: SnowAnalysisResultFE;
  created_at: string; // ISO date string
  // created_by_user_id?: number; // Optional
}

export interface SnowHistoryPageFE {
  items: SnowHistoryItemFE[];
  totalCount: number;
  nextCursor?: string;
}

// Request for analyzing a ticket
export type SnowAnalyzeRequestFE = Record<string, any>;

// Response for analyzing a ticket is the analysis result itself
export type SnowAnalyzeResponseFE = SnowAnalysisResultFE;

// ServiceNow validation status type (distinct from classification status)
export type SnowValidationStatus = 'pass' | 'fail';

// Request parameters for fetching SNOW history
export interface SnowHistoryRequestParamsFE {
  cursor?: string;
  limit?: number;
  startDate?: string; // ISO Date string (YYYY-MM-DD)
  endDate?: string;   // ISO Date string (YYYY-MM-DD)
  search?: string;
}

// Filter state for SNOW history UI
export interface SnowHistoryFiltersState {
  search: string;
  startDate: string | null;
  endDate: string | null;
}