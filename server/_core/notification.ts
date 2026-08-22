import { TRPCError } from "@trpc/server";

import {
  getNotificationProvider,
  type NotificationPayload,
} from "../providers/notification";

export type { NotificationPayload } from "../providers/notification";

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

function validatePayload(input: NotificationPayload): NotificationPayload {
  const title = input.title?.trim();
  const content = input.content?.trim();
  if (!title) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!content) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }
  if (title.length > TITLE_MAX_LENGTH || content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification payload exceeds the permitted length.",
    });
  }
  return { title, content };
}

/** Dispatches an operational notification through the configured provider. */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  return getNotificationProvider().send(validatePayload(payload));
}
