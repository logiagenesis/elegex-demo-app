export type ForemanMutationType =
  | "consent"
  | "checkIn"
  | "material"
  | "evidence"
  | "quote"
  | "complete";

export type QueueStatus =
  | "queued"
  | "syncing"
  | "retrying"
  | "succeeded"
  | "failed";

export type SyncPayload = Record<string, unknown>;

export interface SyncMutation {
  /** Client-generated UUID; passed to the server as the idempotency key. */
  id: string;
  type: ForemanMutationType;
  payload: SyncPayload;
  /** A mutation cannot run until every dependency has succeeded. */
  dependencies: string[];
  status: QueueStatus;
  createdAt: number;
  updatedAt: number;
  attemptCount: number;
  nextAttemptAt: number;
  lastError?: string;
}

export type SyncTransport = (mutation: Readonly<SyncMutation>) => Promise<void>;

export interface SyncQueueOptions {
  databaseName?: string;
  maxAttempts?: number;
  baseRetryDelayMs?: number;
  transport: SyncTransport;
  now?: () => number;
}

const STORE_NAME = "mutations";
const DATABASE_VERSION = 1;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_RETRY_DELAY_MS = 1_000;

/**
 * Browser-only, write-ahead queue for foreman mutations.
 *
 * Queue rows are stored before any network attempt. Payloads are structured-cloned
 * by IndexedDB, which preserves Blob values for future photo/signature uploads.
 */
export class SyncQueue {
  private readonly databaseName: string;
  private readonly maxAttempts: number;
  private readonly baseRetryDelayMs: number;
  private readonly transport: SyncTransport;
  private readonly now: () => number;
  private readonly database: Promise<IDBDatabase>;
  private draining = false;
  private drainPromise: Promise<void> | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: SyncQueueOptions) {
    this.databaseName = options.databaseName ?? "elegex-foreman-sync";
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.baseRetryDelayMs =
      options.baseRetryDelayMs ?? DEFAULT_BASE_RETRY_DELAY_MS;
    this.transport = options.transport;
    this.now = options.now ?? (() => Date.now());
    this.database = this.openDatabase();
  }

  async enqueue(input: {
    type: ForemanMutationType;
    payload: SyncPayload;
    dependencies?: string[];
  }): Promise<SyncMutation> {
    const timestamp = this.now();
    const mutation: SyncMutation = {
      id: crypto.randomUUID(),
      type: input.type,
      payload: input.payload,
      dependencies: Array.from(new Set(input.dependencies ?? [])),
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      attemptCount: 0,
      nextAttemptAt: timestamp,
    };

    if (mutation.dependencies.includes(mutation.id)) {
      throw new Error("A queued mutation cannot depend on itself.");
    }

    const knownMutations = new Set(
      (await this.getAll()).map(queued => queued.id)
    );
    const missingDependency = mutation.dependencies.find(
      dependencyId => !knownMutations.has(dependencyId)
    );
    if (missingDependency) {
      throw new Error(
        `A queued mutation cannot depend on an unknown action (${missingDependency}).`
      );
    }

    await this.put(mutation);
    void this.drain();
    return mutation;
  }

  /** Restores interrupted in-flight work after a tab crash or device reboot. */
  async recoverInterruptedWork(): Promise<void> {
    const all = await this.getAll();
    const timestamp = this.now();
    await Promise.all(
      all
        .filter(mutation => mutation.status === "syncing")
        .map(mutation =>
          this.put({
            ...mutation,
            status: "retrying",
            nextAttemptAt: timestamp,
            updatedAt: timestamp,
            lastError:
              "Interrupted before sync acknowledgement; retrying idempotently.",
          })
        )
    );
    void this.drain();
  }

  async list(): Promise<SyncMutation[]> {
    return (await this.getAll()).sort(
      (left, right) => left.createdAt - right.createdAt
    );
  }

  async retryFailed(id: string): Promise<void> {
    const mutation = await this.get(id);
    if (!mutation) throw new Error(`Queued mutation ${id} was not found.`);
    if (mutation.status !== "failed")
      throw new Error(`Queued mutation ${id} is not permanently failed.`);
    await this.put({
      ...mutation,
      status: "retrying",
      attemptCount: 0,
      nextAttemptAt: this.now(),
      updatedAt: this.now(),
      lastError: undefined,
    });
    void this.drain();
  }

  drain(): Promise<void> {
    // Concurrent callers receive the in-flight drain rather than a premature
    // return. This makes UI reconnect hooks and unit tests observe one queue run.
    if (this.drainPromise) return this.drainPromise;
    this.drainPromise = this.runDrain();
    return this.drainPromise;
  }

  private async runDrain(): Promise<void> {
    this.draining = true;
    try {
      while (true) {
        const candidate = await this.nextReadyMutation();
        if (!candidate) break;
        await this.process(candidate);
      }
    } finally {
      this.draining = false;
      await this.scheduleNextDrain();
      this.drainPromise = undefined;
    }
  }

  private async process(mutation: SyncMutation): Promise<void> {
    const syncing: SyncMutation = {
      ...mutation,
      status: "syncing",
      updatedAt: this.now(),
    };
    await this.put(syncing);

    try {
      // The transport must submit `mutation.id` as the server idempotencyKey.
      await this.transport(syncing);
      await this.put({
        ...syncing,
        status: "succeeded",
        updatedAt: this.now(),
        lastError: undefined,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const attemptCount = syncing.attemptCount + 1;
      const permanentlyFailed = attemptCount >= this.maxAttempts;
      const nextAttemptAt = permanentlyFailed
        ? Number.MAX_SAFE_INTEGER
        : this.now() + this.backoffDelay(attemptCount);

      await this.put({
        ...syncing,
        status: permanentlyFailed ? "failed" : "retrying",
        attemptCount,
        nextAttemptAt,
        updatedAt: this.now(),
        lastError: message,
      });
    }
  }

  private async nextReadyMutation(): Promise<SyncMutation | undefined> {
    const timestamp = this.now();
    const mutations = await this.list();
    const byId = new Map(mutations.map(mutation => [mutation.id, mutation]));

    // A child of a permanently failed parent can never become ready. Mark it
    // actionable instead of scheduling an immediate, CPU-spinning empty drain.
    const blocked = mutations.filter(
      mutation =>
        (mutation.status === "queued" || mutation.status === "retrying") &&
        mutation.dependencies.some(dependencyId => {
          const dependency = byId.get(dependencyId);
          return !dependency || dependency.status === "failed";
        })
    );
    await Promise.all(
      blocked.map(mutation =>
        this.put({
          ...mutation,
          status: "failed",
          updatedAt: timestamp,
          lastError:
            "A required earlier action is unavailable or failed permanently; resolve or retry the dependency first.",
        })
      )
    );

    return mutations.find(mutation => {
      if (mutation.status !== "queued" && mutation.status !== "retrying")
        return false;
      if (mutation.nextAttemptAt > timestamp) return false;
      return mutation.dependencies.every(
        dependencyId => byId.get(dependencyId)?.status === "succeeded"
      );
    });
  }

  private backoffDelay(attemptCount: number): number {
    const cappedExponent = Math.min(attemptCount - 1, 6);
    const exponentialDelay = this.baseRetryDelayMs * 2 ** cappedExponent;
    const jitter = Math.floor(Math.random() * this.baseRetryDelayMs);
    return exponentialDelay + jitter;
  }

  private async scheduleNextDrain(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    const mutations = await this.getAll();
    const byId = new Map(mutations.map(mutation => [mutation.id, mutation]));
    const retrying = mutations
      .filter(
        mutation =>
          (mutation.status === "queued" || mutation.status === "retrying") &&
          mutation.dependencies.every(dependencyId => {
            const dependency = byId.get(dependencyId);
            return dependency !== undefined && dependency.status !== "failed";
          })
      )
      .sort((left, right) => left.nextAttemptAt - right.nextAttemptAt)[0];
    if (!retrying) return;

    const delay = Math.max(0, retrying.nextAttemptAt - this.now());
    this.timer = setTimeout(() => void this.drain(), delay);
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, DATABASE_VERSION);
      request.onerror = () =>
        reject(request.error ?? new Error("Unable to open IndexedDB."));
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, {
            keyPath: "id",
          });
          store.createIndex("createdAt", "createdAt");
          store.createIndex("status", "status");
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async get(id: string): Promise<SyncMutation | undefined> {
    const database = await this.database;
    return this.withStore(database, "readonly", store =>
      requestAsPromise(store.get(id))
    ) as Promise<SyncMutation | undefined>;
  }

  private async getAll(): Promise<SyncMutation[]> {
    const database = await this.database;
    return this.withStore(database, "readonly", store =>
      requestAsPromise(store.getAll())
    ) as Promise<SyncMutation[]>;
  }

  private async put(mutation: SyncMutation): Promise<void> {
    const database = await this.database;
    await this.withStore(database, "readwrite", store =>
      requestAsPromise(store.put(mutation))
    );
  }

  private async withStore<T>(
    database: IDBDatabase,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => Promise<T>
  ): Promise<T> {
    const transaction = database.transaction(STORE_NAME, mode);
    const result = await operation(transaction.objectStore(STORE_NAME));
    await transactionAsPromise(transaction);
    return result;
  }
}

function requestAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB operation failed."));
  });
}

function transactionAsPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}
