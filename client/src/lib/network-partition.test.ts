import { afterEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { SyncQueue } from "./syncQueue";
import { submitQueuedForemanMutation } from "./foremanSync";

describe("Network Partition Recovery Simulation", () => {
  it("recovers a backlog of dependent mutations across intermittent connectivity drops", async () => {
    let isOnline = false;
    let transportCalls = 0;

    const dispatchedMutations: string[] = [];
    const processedKeys = new Set<string>();

    // Simulate a transport that fails when offline, and is idempotent when online
    const mockTrpcTransport = {
      consent: vi.fn().mockResolvedValue(undefined),
      checkIn: vi.fn().mockImplementation(async payload => {
        transportCalls++;
        if (!isOnline) throw new Error("Network unavailable");
        if (processedKeys.has(payload.idempotencyKey)) return;
        processedKeys.add(payload.idempotencyKey);
        dispatchedMutations.push("checkIn");
      }),
      material: vi.fn().mockImplementation(async payload => {
        transportCalls++;
        if (!isOnline) throw new Error("Network unavailable");
        if (processedKeys.has(payload.idempotencyKey)) return;
        processedKeys.add(payload.idempotencyKey);
        dispatchedMutations.push(`material:${payload.description}`);
      }),
      evidence: vi.fn().mockImplementation(async payload => {
        transportCalls++;
        if (!isOnline) throw new Error("Network unavailable");
        if (processedKeys.has(payload.idempotencyKey)) return;
        processedKeys.add(payload.idempotencyKey);
        dispatchedMutations.push(`evidence:${payload.title}`);
      }),
      quote: vi.fn().mockResolvedValue(undefined),
      complete: vi.fn().mockResolvedValue(undefined),
    };

    const queue = new SyncQueue({
      databaseName: `elegex-partition-test-${Math.random()}`,
      baseRetryDelayMs: 0,
      maxAttempts: 10,
      transport: mutation =>
        submitQueuedForemanMutation(mockTrpcTransport, mutation),
    });

    // 1. Start offline, queue a check-in
    isOnline = false;
    const checkIn = await queue.enqueue({
      type: "checkIn",
      payload: { jobId: 404 },
    });
    await queue.drain();

    let state = await queue.list();
    expect(["retrying", "failed"]).toContain(
      state.find(m => m.id === checkIn.id)?.status
    );
    expect(dispatchedMutations).toEqual([]);

    // 2. Intermittent connectivity: Network returns briefly
    isOnline = true;

    // If it failed permanently due to 0 delay, we need to explicitly retry
    state = await queue.list();
    if (state.find(m => m.id === checkIn.id)?.status === "failed") {
      await queue.retryFailed(checkIn.id);
    }

    // The browser fires the "online" event, which triggers drain() in ForemanPage
    await queue.drain();

    state = await queue.list();
    expect(state.find(m => m.id === checkIn.id)?.status).toBe("succeeded");
    expect(dispatchedMutations).toEqual(["checkIn"]);

    // 3. Network drops again, user continues working
    isOnline = false;

    const mat1 = await queue.enqueue({
      type: "material",
      payload: { jobId: 404, description: "Wire", quantity: 5, unit: "m" },
      dependencies: [checkIn.id],
    });

    const mat2 = await queue.enqueue({
      type: "material",
      payload: { jobId: 404, description: "Switch", quantity: 1, unit: "each" },
      dependencies: [checkIn.id],
    });

    const ev = await queue.enqueue({
      type: "evidence",
      payload: { jobId: 404, evidenceType: "note", title: "Finished wiring" },
      dependencies: [checkIn.id],
    });

    // Try to sync while offline
    await queue.drain();

    state = await queue.list();
    // They should all be retrying (or queued if they hit a concurrency limit, but here they should all fail the transport)
    expect(["retrying", "failed"]).toContain(
      state.find(m => m.id === mat1.id)?.status
    );
    expect(["retrying", "failed"]).toContain(
      state.find(m => m.id === mat2.id)?.status
    );
    expect(["retrying", "failed"]).toContain(
      state.find(m => m.id === ev.id)?.status
    );

    // Server state hasn't changed
    expect(dispatchedMutations).toEqual(["checkIn"]);

    // 4. Network returns permanently
    isOnline = true;

    // If any failed permanently due to the 0 delay loop exhausting attempts, retry them
    state = await queue.list();
    for (const m of state) {
      if (m.status === "failed") await queue.retryFailed(m.id);
    }

    // The "online" event fires again
    await queue.drain();

    state = await queue.list();

    // All should now be succeeded
    expect(state.find(m => m.id === mat1.id)?.status).toBe("succeeded");
    expect(state.find(m => m.id === mat2.id)?.status).toBe("succeeded");
    expect(state.find(m => m.id === ev.id)?.status).toBe("succeeded");

    // They should have been dispatched to the server
    expect(dispatchedMutations).toContain("material:Wire");
    expect(dispatchedMutations).toContain("material:Switch");
    expect(dispatchedMutations).toContain("evidence:Finished wiring");
    expect(dispatchedMutations.length).toBe(4); // checkIn + 2 materials + 1 evidence
  });
});
