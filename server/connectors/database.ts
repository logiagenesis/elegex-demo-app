import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { ENV } from "../_core/env";

function createDatabaseClient(pool: mysql.Pool) {
  return drizzle(pool, { mode: "default" });
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;
export type TransactionClient = Parameters<
  Parameters<DatabaseClient["transaction"]>[0]
>[0];

export const DATABASE_POOL_POLICY = {
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60_000,
  queueLimit: 25,
  connectTimeout: 10_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  resetOnRelease: true,
} as const;

let databaseClient: DatabaseClient | undefined;
let connectionPool: mysql.Pool | undefined;
let closingPool: Promise<void> | undefined;

/**
 * Creates one lazily shared MySQL/TiDB client per server process. All persistence
 * adapters resolve their connection through this module so connection lifecycle,
 * health checks, and transactions remain consistent across domains.
 */
export async function getDatabase(): Promise<DatabaseClient> {
  if (!ENV.databaseUrl)
    throw new Error("DATABASE_URL is required for database access");

  if (!databaseClient) {
    connectionPool = mysql.createPool({
      uri: ENV.databaseUrl,
      ...DATABASE_POOL_POLICY,
      waitForConnections: true,
    });

    databaseClient = createDatabaseClient(connectionPool);
  }
  return databaseClient as DatabaseClient;
}

export async function closeDatabase(): Promise<void> {
  if (closingPool) {
    await closingPool;
    return;
  }

  const poolToClose = connectionPool;
  connectionPool = undefined;
  databaseClient = undefined;
  if (!poolToClose) return;

  closingPool = poolToClose.end().finally(() => {
    closingPool = undefined;
  });
  await closingPool;
}

/** Executes a business workflow atomically and rolls it back if any operation fails. */
export async function withTransaction<T>(
  work: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  const database = await getDatabase();
  return database.transaction(async tx => work(tx));
}

/** Lightweight, deployment-safe database readiness probe used by operational tooling. */
export async function checkDatabaseHealth() {
  const database = await getDatabase();
  await database.execute(sql`SELECT 1 AS healthy, DATABASE() AS databaseName`);
  return {
    healthy: true as const,
    dialect: "mysql" as const,
    checkedAt: new Date().toISOString(),
    connectionLimit: DATABASE_POOL_POLICY.connectionLimit,
    queueLimit: DATABASE_POOL_POLICY.queueLimit,
  };
}

const fieldServiceSchemaColumns = [
  ["jobs", "clientId"],
  ["jobs", "siteId"],
  ["jobs", "callOutTypeId"],
  ["appSettings", "locale"],
  ["appSettings", "currency"],
  ["appSettings", "timezone"],
  ["documents", "documentType"],
  ["documents", "retentionYears"],
  ["documents", "classificationLevel"],
] as const;

/**
 * Fails startup deterministically if field-service code is deployed before its
 * additive migrations. This prevents the dashboard from presenting an endless
 * loading state while a query fails on a missing selected column.
 */
export async function assertFieldServiceSchema(
  database?: Pick<DatabaseClient, "execute">
) {
  const activeDatabase = database ?? (await getDatabase());
  const result = await activeDatabase.execute(sql`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND ((TABLE_NAME = 'jobs' AND COLUMN_NAME IN ('clientId', 'siteId', 'callOutTypeId'))
        OR (TABLE_NAME = 'appSettings' AND COLUMN_NAME IN ('locale', 'currency', 'timezone'))
        OR (TABLE_NAME = 'documents' AND COLUMN_NAME IN ('documentType', 'retentionYears', 'classificationLevel')))
  `);
  const rows = (
    Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result
  ) as Array<{ TABLE_NAME: string; COLUMN_NAME: string }>;
  const present = new Set(
    rows.map(row => `${row.TABLE_NAME}.${row.COLUMN_NAME}`)
  );
  const missing = fieldServiceSchemaColumns
    .map(([table, column]) => `${table}.${column}`)
    .filter(column => !present.has(column));
  if (missing.length) {
    throw new Error(
      `Database schema is behind the field-service application code. Apply migrations 0008–0011; missing: ${missing.join(", ")}`
    );
  }
  return { verifiedColumns: fieldServiceSchemaColumns.length };
}

export async function resetDatabaseClientForTests() {
  await closeDatabase();
}
