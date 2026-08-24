export type AiFeature =
  | "job_summary"
  | "quote_draft"
  | "evidence_caption"
  | "marketing_draft"
  | "operations_assistant";

export type AiDraftInput = {
  feature: AiFeature;
  sourceText: string;
};

export type AiDraft = {
  status: "ready" | "disabled" | "unavailable" | "budget_exhausted";
  text: string | null;
  reviewRequired: true;
  provider: string;
  model: string | null;
  inputTokens?: number;
  outputTokens?: number;
  requestId?: string | null;
};

export interface AiProvider {
  readonly id: "anthropic" | "noop";
  draft(input: AiDraftInput): Promise<AiDraft>;
}
