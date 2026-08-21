import { and, asc, eq } from "drizzle-orm";
import { integrationConnections, integrationEvents } from "../../drizzle/schema";
import { getDatabase } from "./database";

export type ConnectorProvider = "database" | "webhook" | "analytics" | "storage";
export type ConnectorStatus = "active" | "paused" | "degraded" | "disabled";

export async function upsertIntegrationConnection(input: {
  organizationId: number;
  provider: ConnectorProvider;
  name: string;
  configuration: Record<string, unknown>;
  secretReference?: string;
  createdBy: number;
  status?: ConnectorStatus;
}) {
  const database = await getDatabase();
  await database.insert(integrationConnections).values({ ...input, status: input.status ?? "active" }).onDuplicateKeyUpdate({
    set: { configuration: input.configuration, secretReference: input.secretReference, status: input.status ?? "active", lastError: null, lastValidatedAt: new Date() },
  });
  const connection = await database.select().from(integrationConnections).where(and(eq(integrationConnections.organizationId, input.organizationId), eq(integrationConnections.provider, input.provider), eq(integrationConnections.name, input.name))).limit(1);
  return connection[0];
}

export async function listIntegrationConnections(organizationId: number) {
  const database = await getDatabase();
  return database.select().from(integrationConnections).where(eq(integrationConnections.organizationId, organizationId)).orderBy(asc(integrationConnections.name));
}

/**
 * Stores integration work using an idempotency key. A future worker or webhook
 * dispatcher can safely deliver these events without duplicating external effects.
 */
export async function enqueueIntegrationEvent(input: {
  organizationId: number;
  connectionId: number;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  availableAt?: Date;
}) {
  const database = await getDatabase();
  const result = await database.insert(integrationEvents).values({ ...input, availableAt: input.availableAt ?? new Date() }).onDuplicateKeyUpdate({ set: { availableAt: input.availableAt ?? new Date() } });
  return Number(result[0].insertId);
}

export async function listDispatchableEvents(connectionId: number, limit = 25) {
  const database = await getDatabase();
  return database.select().from(integrationEvents).where(and(eq(integrationEvents.connectionId, connectionId), eq(integrationEvents.status, "pending"))).orderBy(asc(integrationEvents.availableAt)).limit(Math.min(limit, 100));
}
