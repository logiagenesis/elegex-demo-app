import type { AiProvider } from "./types";

export const noopAiProvider: AiProvider = {
  id: "noop",
  async draft() {
    return {
      status: "disabled",
      text: null,
      reviewRequired: true,
      provider: "noop",
      model: null,
    };
  },
};
