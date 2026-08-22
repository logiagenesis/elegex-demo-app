import { eq, and, lte } from "drizzle-orm";
import {
  integrationEvents,
  integrationConnections,
} from "../../drizzle/schema";
import { getDatabase } from "./database";

// In a Python ecosystem, this would be a Celery or RQ worker.
// Here we implement a simple interval-based poller that drains the outbox.
// NOTE: This worker simulates delivery. It is a scaffold to demonstrate durable outbox
// patterns, but lacks atomic claims, lease expiry, and real webhook dispatch.
// In production, this should be replaced with a real delivery service or disabled by default.

let workerInterval: ReturnType<typeof setInterval> | null = null;

export function startOutboxWorker(pollIntervalMs = 10000) {
  if (workerInterval) return;

  // Explicitly log the boundary condition on startup
  console.log(
    "[Worker] WARNING: Outbox worker is running in DEMO mode. Delivery is simulated."
  );

  console.log(
    `[Worker] Starting integration outbox worker (polling every ${pollIntervalMs}ms)`
  );

  workerInterval = setInterval(async () => {
    try {
      await processOutbox();
    } catch (err) {
      console.error("[Worker] Error processing outbox:", err);
    }
  }, pollIntervalMs);
}

export function stopOutboxWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[Worker] Stopped integration outbox worker");
  }
}

async function processOutbox() {
  const db = await getDatabase();
  if (!db) return;

  // Find active connections
  const activeConnections = await db
    .select({
      id: integrationConnections.id,
      provider: integrationConnections.provider,
    })
    .from(integrationConnections)
    .where(eq(integrationConnections.status, "active"));

  if (activeConnections.length === 0) return;

  for (const connection of activeConnections) {
    // Find pending events for this connection that are ready to run
    const pendingEvents = await db
      .select()
      .from(integrationEvents)
      .where(
        and(
          eq(integrationEvents.connectionId, connection.id),
          eq(integrationEvents.status, "pending"),
          lte(integrationEvents.availableAt, new Date())
        )
      )
      .limit(10);

    for (const event of pendingEvents) {
      try {
        // Mark as processing
        await db
          .update(integrationEvents)
          .set({ status: "processing", attempts: event.attempts + 1 })
          .where(eq(integrationEvents.id, event.id));

        // In a real app, this would dispatch to the specific provider (webhook, etc.)
        // For now, we just simulate successful delivery (This is a known limitation in the demo boundary)
        console.log(
          `[Worker] Dispatching event ${event.id} (${event.eventType}) to ${connection.provider}`
        );

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Mark as completed
        await db
          .update(integrationEvents)
          .set({ status: "delivered", processedAt: new Date() })
          .where(eq(integrationEvents.id, event.id));
      } catch (error: any) {
        console.error(`[Worker] Failed to dispatch event ${event.id}:`, error);

        // Apply backoff and retry
        const attemptCount = event.attempts + 1;
        const maxAttempts = 5;

        if (attemptCount >= maxAttempts) {
          await db
            .update(integrationEvents)
            .set({ status: "failed", lastError: error.message })
            .where(eq(integrationEvents.id, event.id));
        } else {
          // Exponential backoff
          const nextAvailableAt = new Date(
            Date.now() + Math.pow(2, attemptCount) * 1000
          );
          await db
            .update(integrationEvents)
            .set({
              status: "pending",
              lastError: error.message,
              availableAt: nextAvailableAt,
            })
            .where(eq(integrationEvents.id, event.id));
        }
      }
    }
  }
}
