import { ENV } from "../../_core/env";

import type { NotificationProvider } from "./types";

export const manusNotificationProvider: NotificationProvider = {
  id: "manus",
  async send(payload) {
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) return false;
    const baseUrl = ENV.forgeApiUrl.endsWith("/")
      ? ENV.forgeApiUrl
      : `${ENV.forgeApiUrl}/`;
    const endpoint = new URL(
      "webdevtoken.v1.WebDevService/SendNotification",
      baseUrl
    ).toString();
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
          "content-type": "application/json",
          "connect-protocol-version": "1",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
