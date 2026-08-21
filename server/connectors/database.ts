import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

export type DatabaseClient = ReturnType<typeof drizzle>;
export type TransactionClient = Parameters<Parameters<DatabaseClient["transaction"]>[0]>[0];

let databaseClient: DatabaseClient | undefined;

/**
 * Creates one lazily shared MySQL/TiDB client per server process. All persistence
 * adapters resolve their connection through this module so connection lifecycle,
 * health checks, and transactions remain consistent across domains.
 */
export async function getDatabase(): Promise<DatabaseClient> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for database access");
  databaseClient ??= drizzle(process.env.DATABASE_URL);
  return databaseClient;
}

/** Executes a business workflow atomically and rolls it back if any operation fails. */
export async function withTransaction<T>(work: (tx: TransactionClient) => Promise<T>): Promise<T> {
  const database = await getDatabase();
  return database.transaction(async tx => work(tx));
}

/** Lightweight, deployment-safe database readiness probe used by operational tooling. */
export async function checkDatabaseHealth() {
  const database = await getDatabase();
  await database.execute(sql`SELECT 1 AS healthy`);
  return { healthy: true as const, dialect: "mysql" as const, checkedAt: new Date().toISOString() };
}

export function resetDatabaseClientForTests() {
  databaseClient = undefined;
}
