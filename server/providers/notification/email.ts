import nodemailer from "nodemailer";

import { ENV } from "../../_core/env";

import type { NotificationProvider } from "./types";

export const emailNotificationProvider: NotificationProvider = {
  id: "email",
  async send(payload) {
    if (!ENV.smtpUrl || !ENV.notificationFrom) return false;
    try {
      const transport = nodemailer.createTransport(ENV.smtpUrl);
      await transport.sendMail({
        from: ENV.notificationFrom,
        to: ENV.notificationFrom,
        subject: payload.title,
        text: payload.content,
      });
      return true;
    } catch {
      return false;
    }
  },
};
