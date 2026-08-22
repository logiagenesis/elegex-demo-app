import type { NotificationProvider } from "./types";

export const noopNotificationProvider: NotificationProvider = {
  id: "noop",
  async send() {
    return false;
  },
};
