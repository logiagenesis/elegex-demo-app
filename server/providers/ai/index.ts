import { ENV } from "../../_core/env";
import * as db from "../../db";

import { anthropicAiProvider } from "./anthropic";
import { noopAiProvider } from "./noop";
import type { AiDraft, AiDraftInput, AiProvider } from "./types";

export * from "./types";

function getAiProvider(): AiProvider {
  return ENV.aiProvider === "anthropic" ? anthropicAiProvider : noopAiProvider;
}

function estimateCostMicros(inputTokens: number, outputTokens: number) {
  return Math.round(
    (inputTokens * ENV.aiInputCostMicrosPerMillion +
      outputTokens * ENV.aiOutputCostMicrosPerMillion) /
      1_000_000
  );
}

export async function generateReviewedDraft(input: {
  organizationId: number;
  userId: number;
  feature: AiDraftInput["feature"];
  sourceText: string;
}): Promise<AiDraft> {
  const settings = await db.getOrganizationSettings(input.organizationId);
  if (!settings.settings?.aiOptIn) {
    return {
      status: "disabled",
      text: null,
      reviewRequired: true,
      provider: getAiProvider().id,
      model: null,
    };
  }
  const provider = getAiProvider();
  if (provider.id === "noop") return provider.draft(input);

  const usedTokens = await db.getAiTokenUsageLast24Hours(input.organizationId);
  if (usedTokens >= ENV.aiDailyTokenBudget) {
    return {
      status: "budget_exhausted",
      text: null,
      reviewRequired: true,
      provider: provider.id,
      model: ENV.anthropicModel,
    };
  }
  const draft = await provider.draft(input);
  if (draft.status === "ready") {
    await db.recordAiUsage({
      organizationId: input.organizationId,
      userId: input.userId,
      feature: input.feature,
      provider: draft.provider,
      model: draft.model ?? "unknown",
      inputTokens: draft.inputTokens ?? 0,
      outputTokens: draft.outputTokens ?? 0,
      estimatedCostMicros: estimateCostMicros(
        draft.inputTokens ?? 0,
        draft.outputTokens ?? 0
      ),
      requestId: draft.requestId,
    });
  }
  return draft;
}
