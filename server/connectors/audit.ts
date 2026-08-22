import { activityLogs } from "../../drizzle/schema";

import { getDatabase, type DatabaseClient } from "./database";

export type AuditEvent = {
  organizationId: number;
  actorId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

/** Writes immutable, organization-scoped audit evidence for a meaningful business mutation. */
export async function writeAuditEvent(
  event: AuditEvent,
  client?: DatabaseClient
) {
  const database = client ?? (await getDatabase());
  await database
    .insert(activityLogs)
    .values({ ...event, metadata: event.metadata ?? null });
}
