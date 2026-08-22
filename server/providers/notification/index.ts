import { ENV } from "../../_core/env";

import { emailNotificationProvider } from "./email";
import { manusNotificationProvider } from "./manus";
import { noopNotificationProvider } from "./noop";
import type { NotificationProvider } from "./types";
import { webhookNotificationProvider } from "./webhook";

export * from "./types";

export function getNotificationProvider(): NotificationProvider {
  switch (ENV.notificationProvider) {
    case "webhook":
      return webhookNotificationProvider;
    case "email":
      return emailNotificationProvider;
    case "noop":
      return noopNotificationProvider;
    default:
      return manusNotificationProvider;
  }
}
