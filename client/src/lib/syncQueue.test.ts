import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SyncQueue, type SyncMutation } from "./syncQueue";
import { submitQueuedForemanMutation } from "./foremanSync";

const queues: SyncQueue[] = [];

function createQueue(transport: (mutation: Readonly<SyncMutation>) => Promise<void>, now = () => Date.now()) {
  const queue = new SyncQueue({
    databaseName: `elegex-sync-test-${Math.random()}`,
    baseRetryDelayMs: 0,
    maxAttempts: 3,
    transport,
    now,
  });
  queues.push(queue);
  return queue;
}

afterEach(() => {
  vi.restoreAllMocks();
  queues.length = 0;
});

describe("SyncQueue", () => {
  it("persists every action before dispatching and sends its UUID as the idempotency key", async () => {
    const dispatched: string[] = [];
    const queue = createQueue(async mutation => { dispatched.push(mutation.id); });

    const mutation = await queue.enqueue({ type: "checkIn", payload: { jobId: 2039 } });
    await queue.drain();

    expect(mutation.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(dispatched).toEqual([mutation.id]);
    expect((await queue.list())[0]?.status).toBe("succeeded");
  });

  it("drains mutations in dependency order", async () => {
    const dispatched: string[] = [];
    const queue = createQueue(async mutation => { dispatched.push(mutation.type); });

    const checkIn = await queue.enqueue({ type: "checkIn", payload: { jobId: 2039 } });
    await queue.enqueue({
      type: "material",
      payload: { jobId: 2039, description: "Circuit breaker 20A", quantity: 1, unit: "each" },
      dependencies: [checkIn.id],
    });
    await queue.drain();

    expect(dispatched).toEqual(["checkIn", "material"]);
  });

  it("retries a transient failure with the same idempotency key", async () => {
    const keys: string[] = [];
    let attempts = 0;
    const queue = createQueue(async mutation => {
      keys.push(mutation.id);
      attempts += 1;
      if (attempts === 1) throw new Error("network unavailable");
    });

    const queued = await queue.enqueue({ type: "checkIn", payload: { jobId: 2039 } });
    await queue.drain();
    await queue.drain();

    const saved = (await queue.list())[0];
    expect(keys).toEqual([queued.id, queued.id]);
    expect(saved?.status).toBe("succeeded");
    expect(saved?.attemptCount).toBe(1);
  });

  it("does not dispatch a child when its dependency fails permanently", async () => {
    const dispatched: string[] = [];
    const queue = createQueue(async mutation => {
      dispatched.push(mutation.type);
      if (mutation.type === "checkIn") throw new Error("permanent failure");
    });

    const checkIn = await queue.enqueue({ type: "checkIn", payload: { jobId: 2039 } });
    await queue.enqueue({ type: "complete", payload: { jobId: 2039 }, dependencies: [checkIn.id] });
    await queue.drain();
    await queue.drain();
    await queue.drain();

    const rows = await queue.list();
    expect(rows.find(row => row.id === checkIn.id)?.status).toBe("failed");
    expect(dispatched).not.toContain("complete");
  });

  it("drains a queued foreman action into its matching tRPC procedure with the queue UUID", async () => {
    const transport = {
      consent: vi.fn().mockResolvedValue(undefined),
      checkIn: vi.fn().mockResolvedValue(undefined),
      material: vi.fn().mockResolvedValue(undefined),
      evidence: vi.fn().mockResolvedValue(undefined),
      quote: vi.fn().mockResolvedValue(undefined),
      complete: vi.fn().mockResolvedValue(undefined),
    };
    const queue = createQueue(mutation => submitQueuedForemanMutation(transport, mutation));

    const mutation = await queue.enqueue({ type: "material", payload: { jobId: 2039, description: "DB board breaker", quantity: 1, unit: "each" } });
    await queue.drain();

    expect(transport.material).toHaveBeenCalledWith({ jobId: 2039, description: "DB board breaker", quantity: 1, unit: "each", idempotencyKey: mutation.id });
    expect((await queue.list())[0]?.status).toBe("succeeded");
  });
});
