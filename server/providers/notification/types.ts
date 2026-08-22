export type NotificationPayload = {
  title: string;
  content: string;
};

export interface NotificationProvider {
  readonly id: "manus" | "webhook" | "email" | "noop";
  send(payload: NotificationPayload): Promise<boolean>;
}
