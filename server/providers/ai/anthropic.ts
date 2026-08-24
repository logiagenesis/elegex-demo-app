import Anthropic from "@anthropic-ai/sdk";

import { ENV } from "../../_core/env";

import type { AiDraft, AiDraftInput, AiProvider } from "./types";

const MAX_ATTEMPTS = 2;

function featureInstruction(feature: AiDraftInput["feature"]) {
  switch (feature) {
    case "quote_draft":
      return "Draft a concise internal quote scope. Do not state that a price is approved or send-ready.";
    case "evidence_caption":
      return "Draft a factual internal evidence caption. Do not invent conditions, measurements, or safety claims.";
    case "marketing_draft":
      return "Draft a concise marketing post for internal review. Do not claim outcomes, ratings, customer approval, or external publication.";
    case "operations_assistant":
      return "Draft a concise operational response or next-step checklist. Do not execute actions, invent records, send messages, or claim that an external action occurred.";
    default:
      return "Draft a concise internal job summary. Do not invent facts, commitments, or completion status.";
  }
}

function extractText(content: Anthropic.Message["content"]) {
  return content
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("\n")
    .trim();
}

export const anthropicAiProvider: AiProvider = {
  id: "anthropic",
  async draft(input): Promise<AiDraft> {
    if (!ENV.anthropicApiKey) {
      return {
        status: "unavailable",
        text: null,
        reviewRequired: true,
        provider: "anthropic",
        model: ENV.anthropicModel,
      };
    }
    const client = new Anthropic({
      apiKey: ENV.anthropicApiKey,
      timeout: 15_000,
    });
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        const message = await client.messages.create({
          model: ENV.anthropicModel,
          max_tokens: 700,
          system:
            "You assist office staff in a field-service platform. Output a draft for human review only. Never claim approval, dispatch, invoicing, or external delivery. Use only facts provided by the user.",
          messages: [
            {
              role: "user",
              content: `${featureInstruction(input.feature)}\n\nSource material:\n${input.sourceText}`,
            },
          ],
        });
        const text = extractText(message.content);
        return {
          status: text ? "ready" : "unavailable",
          text: text || null,
          reviewRequired: true,
          provider: "anthropic",
          model: message.model,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          requestId: message.id,
        };
      } catch (error) {
        lastError = error;
        if (attempt + 1 < MAX_ATTEMPTS) {
          await new Promise(resolve =>
            setTimeout(resolve, 300 * (attempt + 1))
          );
        }
      }
    }
    console.warn("[AI] Anthropic draft generation failed", {
      reason: lastError instanceof Error ? lastError.name : "unknown",
    });
    return {
      status: "unavailable",
      text: null,
      reviewRequired: true,
      provider: "anthropic",
      model: ENV.anthropicModel,
    };
  },
};
