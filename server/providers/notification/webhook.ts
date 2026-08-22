import { ENV } from "../../_core/env";

import type { NotificationProvider } from "./types";

export const webhookNotificationProvider: NotificationProvider = {
  id: "webhook",
  async send(payload) {
    if (!ENV.notificationWebhookUrl) return false;
    try {
      const response = await fetch(ENV.notificationWebhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          event: "elegex.operational_notification",
        }),
        signal: AbortSignal.timeout(8_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
